import { Application, Container, Graphics, Text, Texture, RendererType, type WebGLRenderer } from 'pixi.js';
import type { BenchmarkViewState } from '../application/benchmark-controller.js';
import type { CreepSnapshot, PresentationEvent } from '@tower-defense/sim';
import type { TowerFamilyId } from '@tower-defense/content';
import { CREEP_COLORS, TOWER_COLORS, primitive, railMuzzle, siegeMuzzle, towerArt } from './neon-art.js';
import { siegeShellPose, siegeShellRadius } from './siege-shell.js';
import { drawRailSlug } from './rail-slug.js';
import { kickBarrel, barrelOffset } from './rail-recoil.js';
import { eventPoint } from './neon-coordinates.js';
import { fittedBoard } from './hud-layout.js';
import { siegeFlightProgress, burstProgress, burstLifetime } from './combat-timing.js';
import { projectileColors } from './neon-palette.js';
import { coveragePolygon } from './coverage-shape.js';
import { aimHandleDistanceCells, isAimHandleHit as hitAimHandle, isRangeArcHit } from './tower-aim.js';
import { movingRouteDashes, routeEndpointAngles, routeSegments } from './route-motion.js';
import { smoothHeading, swarmMotion } from './swarm-motion.js';

interface Point { x: number; y: number }
interface Shot { event: PresentationEvent; born: number; barrel: number; family: TowerFamilyId; chain?: readonly Point[] }
interface Burst { x: number; y: number; kind: string; born: number; seed: number }
interface Aim { angle: number; left: number; right: number; shots: number }
interface CreepHeading { angle: number; target: number; updatedAt: number; x: number; y: number }

// Discs stacked to shade the Siege shell as a sphere.
const SHELL_SHADE_STEPS = 8;

const endpointArrow = (g: Graphics, x: number, y: number, angle: number, color: number): void => {
  const transform = (forward: number, side: number): Point => ({
    x: x + Math.cos(angle) * forward - Math.sin(angle) * side,
    y: y + Math.sin(angle) * forward + Math.cos(angle) * side,
  });
  const tail = transform(-.2, 0), tip = transform(.22, 0);
  const left = transform(.04, -.16), right = transform(.04, .16);
  g.moveTo(tail.x, tail.y).lineTo(tip.x, tip.y).stroke({ color, width: .055, cap: 'round' });
  g.moveTo(left.x, left.y).lineTo(tip.x, tip.y).lineTo(right.x, right.y)
    .stroke({ color, width: .055, cap: 'round' });
};

const brighten = (color: number): number => {
  const channel = (value: number) => Math.round(value + (255 - value) * .38);
  return channel(color >> 16 & 0xff) << 16
    | channel(color >> 8 & 0xff) << 8
    | channel(color & 0xff);
};

export class NeonArena {
  readonly app = new Application();
  readonly root = new Container();
  readonly board = new Graphics();
  readonly route = new Graphics();
  readonly units = new Graphics();
  readonly effects = new Graphics();
  readonly labels = new Container();
  #state: BenchmarkViewState | null = null;
  #ready = false;
  #disposed = false;
  #observer: ResizeObserver | null = null;
  #size = { width: 0, height: 0, tile: 1, x: 0, y: 0 };
  #zoom = 1;
  #pan = { x: 0, y: 0 };
  #time = 0;
  #lastSequence = 0;
  #lastTick = 0;
  #shots: Shot[] = [];
  #bursts: Burst[] = [];
  #aim = new Map<string, Aim>();
  #creepHeadings = new Map<string, CreepHeading>();
  #previousCreeps = new Map<string, CreepSnapshot>();
  #snapshotTickSpan = 1;
  #boardKey = '';
  reducedMotion = false;
  interpolationAlpha = 1;
  preview: { cell: number; family: TowerFamilyId; range: number } | null = null;
  aimPreview: number | null = null;

  constructor(readonly mount: HTMLElement, readonly onFrame: (delta: number, now: number) => void) {}

  async initialize(): Promise<void> {
    await this.app.init({ resizeTo: this.mount, backgroundAlpha: 0, antialias: true,
      autoDensity: true, resolution: Math.min(devicePixelRatio || 1, 2), preference: 'webgl', autoStart: false });
    if (this.#disposed) { this.app.destroy(true, { children: true }); return; }
    if (this.app.renderer.type === RendererType.WEBGL) {
      const renderer = this.app.renderer as WebGLRenderer;
      for (let i = 0; i < renderer.limits.maxTextures; i++) renderer.texture.bind(Texture.EMPTY, i);
    }
    this.mount.append(this.app.canvas);
    this.app.canvas.setAttribute('aria-hidden', 'true');
    this.app.canvas.className = 'neon-canvas';
    this.root.addChild(this.board, this.route, this.labels, this.units, this.effects);
    this.app.stage.addChild(this.root);
    this.#ready = true;
    this.app.ticker.maxFPS = 60;
    this.#observer = new ResizeObserver(() => this.layout());
    this.#observer.observe(this.mount);
    this.layout();
    this.app.ticker.add((ticker) => {
      const delta = Math.min(ticker.elapsedMS, 100);
      this.onFrame(delta, performance.now());
      if (!this.#state?.ui.paused) this.#time += delta;
      this.paint();
    });
    this.app.start();
  }

  setVisible(visible: boolean): void { if (this.#ready) visible ? this.app.start() : this.app.stop(); }
  destroy(): void {
    this.#disposed = true;
    this.#observer?.disconnect();
    if (this.#ready) this.app.destroy(true, { children: true });
  }
  update(state: BenchmarkViewState): void {
    if (state.render.tick < this.#lastTick || (state.ui.phase === 'opening' && this.#state?.ui.phase !== 'opening')) {
      this.#shots = []; this.#bursts = []; this.#aim.clear(); this.#creepHeadings.clear(); this.#lastSequence = 0;
      this.#previousCreeps.clear();
      this.#snapshotTickSpan = 1;
    } else if (this.#state && state.render.tick > this.#lastTick) {
      this.#previousCreeps = new Map(this.#state.render.creeps.map(c => [c.id, c]));
      this.#snapshotTickSpan = state.render.tick - this.#lastTick;
    }
    if (state.ui.paused || this.#state?.ui.paused) this.#previousCreeps.clear();
    this.#state = state;
    this.#lastTick = state.render.tick;
    for (const event of state.recentEvents) {
      if (event.sequence <= this.#lastSequence) continue;
      this.#lastSequence = event.sequence;
      const p = event.payload;
      if (event.type === 'tower-fired') {
        const id = String(p.towerId);
        const aim = this.#aim.get(id) ?? { angle: -Math.PI / 2, left: -1000, right: -1000, shots: 0 };
        aim.angle = Math.atan2(Number(p.yMilli) - Number(p.fromYMilli), Number(p.xMilli) - Number(p.fromXMilli));
        const barrel = aim.shots % 2;
        Object.assign(aim, kickBarrel(aim, this.#time));
        this.#aim.set(id, aim);
        const chain: Point[] = p.mechanicId === 'arc-chain'
          ? (JSON.parse(String(p.targetPositions)) as [number, number][]).map(([x, y]) => eventPoint(x, y)) : [];
        const family = state.render.towers.find(tower => tower.id === id)?.familyId ?? 'foundation';
        this.#shots.push({ event, born: this.#time, barrel, chain, family });
      }
      if (event.type === 'weapon-impact') {
        const flight = this.#shots.find(shot => shot.event.type === 'tower-fired' && shot.event.payload.impactId === p.impactId);
        const family = flight?.family ?? state.render.towers.find(tower => tower.id === p.towerId)?.familyId ?? 'siege';
        this.#shots.push({ event, born: this.#time, barrel: 0, family });
      }
      if (event.type === 'creep-died') this.#bursts.push({ ...eventPoint(Number(p.xMilli), Number(p.yMilli)),
        kind: String(p.creepType), born: this.#time, seed: event.sequence });
    }
    this.#shots = this.#shots.slice(-160);
    this.#bursts = this.#bursts.slice(-70);
  }

  layout(): void {
    const width = this.mount.clientWidth, height = this.mount.clientHeight;
    const { tile, x, y } = fittedBoard(width, height);
    this.#size = { width, height, tile, x, y };
    this.applyCamera();
  }
  fit(): void { this.#zoom = 1; this.#pan = { x: 0, y: 0 }; this.applyCamera(); }
  pan(dx: number, dy: number): void { this.#pan.x += dx; this.#pan.y += dy; this.applyCamera(); }
  zoomBy(factor: number, anchor?: Point): void {
    const { width, height, tile, x, y } = this.#size;
    const p = anchor ?? { x: width / 2, y: height / 2 };
    const before = this.#zoom;
    this.#zoom = Math.max(1, Math.min(2.6, before * factor));
    const ratio = this.#zoom / before;
    this.#pan.x = p.x - x - (p.x - x - this.#pan.x) * ratio;
    this.#pan.y = p.y - y - (p.y - y - this.#pan.y) * ratio;
    if (!tile) return;
    this.applyCamera();
  }
  private applyCamera(): void {
    const { width, height, tile, x, y } = this.#size;
    const w = tile * this.#zoom * 9, h = tile * this.#zoom * 14;
    this.#pan.x = w <= width ? (width - w) / 2 - x : Math.max(width - w - x - 12, Math.min(12 - x, this.#pan.x));
    this.#pan.y = h <= height ? (height - h) / 2 - y : Math.max(height - h - y - 12, Math.min(12 - y, this.#pan.y));
    this.root.position.set(x + this.#pan.x, y + this.#pan.y);
    this.root.scale.set(tile * this.#zoom);
  }
  cellAt(x: number, y: number): number | null {
    const scale = this.#size.tile * this.#zoom;
    const col = Math.floor((x - this.root.x) / scale), row = Math.floor((y - this.root.y) / scale);
    return col >= 0 && col < 9 && row >= 0 && row < 14 ? row * 9 + col : null;
  }
  cellPoint(cell: number): Point {
    return { x: this.root.x + (cell % 9 + .5) * this.root.scale.x,
      y: this.root.y + (Math.floor(cell / 9) + .5) * this.root.scale.y };
  }
  aimHandlePoint(): Point | null {
    const state = this.#state;
    const selected = state?.render.towers.find((tower) => tower.id === state.selectedTowerId);
    if (!selected || selected.familyId === 'foundation' || state?.ui.phase === 'victory' || state?.ui.phase === 'defeat') return null;
    const origin = this.cellPoint(selected.cell);
    const angle = (this.aimPreview ?? selected.facingMilliDegrees) * Math.PI / 180_000;
    const distance = aimHandleDistanceCells(selected.weapon.rangeMilliCells) * this.root.scale.x;
    return { x: origin.x + Math.cos(angle) * distance, y: origin.y + Math.sin(angle) * distance };
  }
  isAimHandleHit(x: number, y: number): boolean {
    const handle = this.aimHandlePoint();
    const state = this.#state;
    const selected = state?.render.towers.find((tower) => tower.id === state.selectedTowerId);
    if (handle === null || !selected) return false;
    const origin = this.cellPoint(selected.cell);
    const facing = this.aimPreview ?? selected.facingMilliDegrees;
    const radius = aimHandleDistanceCells(selected.weapon.rangeMilliCells) * this.root.scale.x;
    return hitAimHandle({ x, y }, handle)
      || isRangeArcHit({ x, y }, origin, radius, facing, selected.weapon.coverageArcMilliDegrees ?? 360_000);
  }
  private creepPoint(c: CreepSnapshot): Point {
    const previous = this.#previousCreeps.get(c.id) ?? c;
    const fraction = this.#state?.ui.paused || this.#state?.ui.phase !== 'wave'
      ? 1 : Math.max(0, Math.min(1, this.interpolationAlpha));
    // At 2x/3x a frame can advance several ticks; retain just one tick of visual latency.
    const alpha = (this.#snapshotTickSpan - 1 + fraction) / this.#snapshotTickSpan;
    return eventPoint(previous.xMilli + (c.xMilli - previous.xMilli) * alpha,
      previous.yMilli + (c.yMilli - previous.yMilli) * alpha);
  }
  private creepPose(c: CreepSnapshot): Point & { angle: number; scale: number } {
    const center = this.creepPoint(c);
    const previous = this.#creepHeadings.get(c.id);
    const moved = previous && Math.hypot(center.x - previous.x, center.y - previous.y) > .001;
    const target = moved ? Math.atan2(center.y - previous.y, center.x - previous.x)
      : previous?.target ?? Math.atan2(Math.floor(c.toCell / 9) - Math.floor(c.fromCell / 9), c.toCell % 9 - c.fromCell % 9);
    const angle = this.reducedMotion || !previous
      ? target
      : smoothHeading(previous.angle, target, this.#time - previous.updatedAt);
    this.#creepHeadings.set(c.id, { angle, target, updatedAt: this.#time, x: center.x, y: center.y });
    const motion = swarmMotion(c.id, c.creepId, this.#time, this.reducedMotion);
    return {
      x: center.x + (c.layer === 'air' ? Math.cos(angle) * motion.longitudinal - Math.sin(angle) * motion.lateral : 0),
      y: center.y + (c.layer === 'air' ? Math.sin(angle) * motion.longitudinal + Math.cos(angle) * motion.lateral : 0),
      angle: angle + Math.PI / 2 + motion.rotation,
      scale: c.layer === 'air' ? motion.scale : 1,
    };
  }
  private stroke(from: Point, to: Point, color: number, alpha: number, width: number, core = color): void {
    this.effects.moveTo(from.x, from.y).lineTo(to.x, to.y).stroke({ color, width: width * 4, alpha: alpha * .12 });
    this.effects.moveTo(from.x, from.y).lineTo(to.x, to.y).stroke({ color, width, alpha });
    this.effects.moveTo(from.x, from.y).lineTo(to.x, to.y).stroke({ color: core, width: width * .26, alpha });
  }
  private paintBoard(state: BenchmarkViewState): void {
    const key = `${state.render.arenaId}:${state.render.routeVersion}`;
    if (key === this.#boardKey) return;
    this.#boardKey = key;
    const g = this.board;
    for (const label of this.labels.removeChildren()) label.destroy();
    g.clear().rect(0, 0, 9, 14).fill(0x1b333d);
    for (let y = 0; y < 14; y++) for (let x = 0; x < 9; x++) {
      g.rect(x + .01, y + .01, .98, .98).fill(0x080d14);
      g.rect(x - .018, y - .018, .036, .036).fill(0x35535c);
    }
    g.rect(.02, .02, 8.96, 13.96).stroke({ color: 0x00d9d2, width: .14, alpha: .1 });
    g.rect(.02, .02, 8.96, 13.96).stroke({ color: 0x00d9d2, width: .035, alpha: .78 });
    for (const [cx, cy, dx, dy] of [[0, 0, 1, 1], [9, 0, -1, 1], [0, 14, 1, -1], [9, 14, -1, -1]] as const) {
      const x = cx - dx * .07, y = cy - dy * .07;
      g.moveTo(x + dx * .7, y).lineTo(x + dx * .16, y).lineTo(x, y + dy * .16).lineTo(x, y + dy * .7)
        .stroke({ color: 0x36e2f5, width: .08, alpha: 1, join: 'miter' });
    }
    for (const cell of state.render.unbuildableCells) {
      if (cell === state.render.spawnCell || cell === state.render.exitCell || state.render.waypointCells.includes(cell)) continue;
      const x = cell % 9, y = Math.floor(cell / 9);
      g.poly([x+.14,y+.24,x+.72,y+.24,x+.86,y+.38,x+.86,y+.87,x+.14,y+.87]).fill(0x08090d);
      g.poly([x+.14,y+.14,x+.7,y+.14,x+.84,y+.28,x+.84,y+.73,x+.14,y+.73]).fill(0x202630);
      g.moveTo(x+.14,y+.73).lineTo(x+.14,y+.14).lineTo(x+.7,y+.14).stroke({ color: 0x3b4450, width: .025 });
      g.rect(x+.26,y+.26,.12,.055).fill(0x56616c);
    }
    const markers = [state.render.spawnCell, ...state.render.waypointCells, state.render.exitCell];
    const endpointAngles = routeEndpointAngles(state.render.groundRoute);
    for (const [i, cell] of markers.entries()) {
      const x = cell % 9 + .5, y = Math.floor(cell / 9) + .5;
      const endpoint = i === 0 || i === markers.length - 1;
      const color = i === 0 ? 0xff42cb : endpoint ? 0x00f5e9 : 0xffdf42;
      for (const side of [-1, 1]) {
        g.moveTo(x + side*.22, y-.38).lineTo(x + side*.39,y-.38)
          .lineTo(x + side*.39,y+.38).lineTo(x + side*.22,y+.38)
          .stroke({ color, width: endpoint ? .07 : .04, alpha: endpoint ? 1 : .8 });
      }
      if (endpoint) {
        g.rect(x-.3,y-.3,.6,.6).fill({ color, alpha: .07 });
        endpointArrow(g, x, y, i === 0 ? endpointAngles.start : endpointAngles.end, color);
        continue;
      }
      const text = new Text({ text: `0${i}`,
        style: { fontFamily: 'monospace', fontSize: 32, fill: color, fontWeight: '600' } });
      text.anchor.set(.5); text.scale.set(.0075); text.position.set(x, y);
      this.labels.addChild(text);
    }
  }
  private paint(): void {
    const s = this.#state;
    if (!s || !this.#ready) return;
    this.paintBoard(s);
    const g = this.units, fx = this.effects;
    g.clear(); fx.clear(); this.route.clear();
    if (s.ui.phase === 'opening' || s.ui.phase === 'planning') {
      const segments = routeSegments(s.render.groundRoute);
      const phase = this.reducedMotion ? 0 : this.#time * .00045;
      for (const dash of movingRouteDashes(segments, phase))
        this.route.moveTo(dash.from.x, dash.from.y).lineTo(dash.to.x, dash.to.y)
          .stroke({ color: 0xffdf42, width: .05, alpha: .34, cap: 'round' });
    }
    const selected = s.render.towers.find((t) => t.id === s.selectedTowerId);
    const p = this.preview ?? (selected ? { cell: selected.cell, family: selected.familyId,
      range: selected.weapon.rangeMilliCells / 1000 } : null);
    if (p) {
      const x = p.cell % 9 + .5, y = Math.floor(p.cell / 9) + .5, color = TOWER_COLORS[p.family];
      if (this.preview || !selected) {
        this.route.circle(x, y, p.range).fill({ color, alpha: .025 }).stroke({ color, width: .025, alpha: .32 });
      } else {
        const facing = this.aimPreview ?? selected.facingMilliDegrees;
        const arc = selected.weapon.coverageArcMilliDegrees ?? 360_000;
        const minimum = (selected.weapon.minimumRangeMilliCells ?? 0) / 1000;
        if (arc >= 360_000 && minimum === 0) {
          this.route.circle(x, y, p.range).fill({ color, alpha: .025 }).stroke({ color, width: .025, alpha: .32 });
        } else {
          this.route.poly(coveragePolygon(x, y, minimum, p.range, facing, arc))
            .fill({ color, alpha: .055 }).stroke({ color, width: .026, alpha: .54 });
        }
      }
      this.route.roundRect(x - .48, y - .48, .96, .96, .1).stroke({ color, width: .045 });
      if (selected && selected.familyId !== 'foundation' && s.ui.phase !== 'victory' && s.ui.phase !== 'defeat') {
        const angle = (this.aimPreview ?? selected.facingMilliDegrees) * Math.PI / 180_000;
        const hx = x + Math.cos(angle) * p.range;
        const hy = y + Math.sin(angle) * p.range;
        this.route.circle(hx, hy, .17).fill({ color: 0x05080d, alpha: .96 })
          .stroke({ color, width: .025, alpha: .92 });
        this.route.moveTo(hx - .075, hy - .055).lineTo(hx + .025, hy - .055)
          .lineTo(hx + .07, hy - .012).stroke({ color, width: .028, alpha: .95, cap: 'round' });
        this.route.moveTo(hx + .075, hy + .055).lineTo(hx - .025, hy + .055)
          .lineTo(hx - .07, hy + .012).stroke({ color, width: .028, alpha: .95, cap: 'round' });
      }
    }
    for (const tower of s.render.towers) {
      const x = tower.cell % 9 + .5, y = Math.floor(tower.cell / 9) + .5;
      const aim = this.#aim.get(tower.id);
      const recoil = (time: number) => this.reducedMotion ? 0 : barrelOffset(time, this.#time);
      const mountedFacing = ((selected?.id === tower.id ? this.aimPreview : null) ?? tower.facingMilliDegrees)
        * Math.PI / 180_000;
      const latestShot = aim ? Math.max(aim.left, aim.right) : Number.NEGATIVE_INFINITY;
      const artFacing = aim && this.#time - latestShot < 500 ? aim.angle : mountedFacing;
      towerArt(g, tower.familyId, x, y, artFacing,
        recoil(aim?.left ?? -1000), recoil(aim?.right ?? -1000));
      if (s.ui.phase !== 'opening' && tower.operationalAtTick > s.render.tick)
        g.circle(x, y, .4).stroke({ color: 0xffffff, width: .018, alpha: .4 });
    }
    if (this.preview) towerArt(g, this.preview.family, this.preview.cell % 9 + .5,
      Math.floor(this.preview.cell / 9) + .5, -Math.PI / 2, 0, 0, .9);
    const activeCreepIds = new Set<string>();
    for (const c of s.render.creeps) {
      activeCreepIds.add(c.id);
      const p = this.creepPose(c), color = CREEP_COLORS[c.creepId] ?? 0xffffff;
      const core = brighten(color);
      const baseRadius = c.layer === 'ground' ? c.radiusMilliCells / 1000 - .01 : .09;
      const radius = baseRadius * p.scale;
      if (!this.reducedMotion) {
        const travelAngle = p.angle - Math.PI / 2;
        const tail = radius * (c.creepId === 'broodling' ? 2.2 : 1.55);
        g.moveTo(p.x - Math.cos(travelAngle) * tail, p.y - Math.sin(travelAngle) * tail)
          .lineTo(p.x - Math.cos(travelAngle) * radius * .65, p.y - Math.sin(travelAngle) * radius * .65)
          .stroke({ color, width: .012, alpha: .12, cap: 'round' });
      }
      primitive(g, c.creepId, p.x + .012, p.y + .018, radius, p.angle).fill({ color: 0x000000, alpha: .7 });
      primitive(g, c.creepId, p.x, p.y, radius + .025, p.angle).fill({ color, alpha: .1 });
      primitive(g, c.creepId, p.x, p.y, radius, p.angle).fill({ color, alpha: .18 })
        .stroke({ color, width: .016, alpha: .98 });
      primitive(g, c.creepId, p.x, p.y + .005, radius * .5, p.angle).fill({ color: 0x0a1016, alpha: .82 })
        .stroke({ color: core, width: .008, alpha: .62 });
      primitive(g, c.creepId, p.x, p.y - .005, radius * .15, p.angle).fill({ color: core, alpha: .9 });
      if (c.armor > 0) primitive(g, c.creepId, p.x, p.y, radius + .015, p.angle)
        .stroke({ color: 0xffdfba, width: .008, alpha: .7 });
      if (c.health < c.maxHealth) {
        g.rect(p.x - radius, p.y - radius - .04, radius * 2, .015).fill(0x34333b);
        g.rect(p.x - radius, p.y - radius - .04, radius * 2 * c.health / c.maxHealth, .015).fill(color);
      }
    }
    for (const id of this.#creepHeadings.keys()) if (!activeCreepIds.has(id)) this.#creepHeadings.delete(id);
    for (const impact of s.render.impacts) {
      const { x, y } = eventPoint(impact.xMilli, impact.yMilli);
      const until = Math.max(0, (impact.impactTick - s.render.tick) / 30);
      const flight = this.#shots.find(shot => shot.event.payload.impactId === impact.id);
      const { color, core } = projectileColors(flight?.family ?? 'siege');
      fx.circle(x, y, impact.radiusMilliCells / 1000).stroke({ color, width: .018, alpha: .3 });
      fx.circle(x, y, .12 + until * .35).stroke({ color: core, width: .025, alpha: .7 });
    }
    this.#shots = this.#shots.filter((shot) => shot.event.type === 'tower-fired' && shot.event.payload.mechanicId === 'siege-blast'
      ? s.render.impacts.some(impact => impact.id === shot.event.payload.impactId)
      : this.#time - shot.born < 650);
    for (const { event, born, barrel, chain, family } of this.#shots) {
      const p = event.payload, age = this.#time - born;
      const { color, core } = projectileColors(family);
      const end = eventPoint(Number(p.xMilli), Number(p.yMilli));
      if (event.type === 'weapon-impact') {
        const t = age / 650;
        const radius = Number(p.radiusMilliCells) / 1000;
        const expansion = this.reducedMotion ? .65 : 1 - (1 - t) ** 4;
        fx.circle(end.x, end.y, radius * expansion).fill({ color, alpha: (1-t) ** 3 * .12 })
          .stroke({ color, width: .12 * (1-t) + .015, alpha: (1-t) * .9 });
        if (age < 130 && !this.reducedMotion) {
          primitive(fx, 'broodling', end.x, end.y, .38 * (1-age/130), Math.PI/4).fill(core);
        }
        for (let i = 0; i < (this.reducedMotion ? 0 : 8); i++) {
          const a = i * Math.PI / 4 + event.sequence;
          const d = radius * expansion * (.7 + i % 2 * .25);
          const tip = { x: end.x + Math.cos(a)*d, y: end.y + Math.sin(a)*d };
          this.stroke({ x: tip.x-Math.cos(a)*.15*(1-t), y: tip.y-Math.sin(a)*.15*(1-t) }, tip, color, (1-t)**2, .04, core);
        }
        continue;
      }
      const from = eventPoint(Number(p.fromXMilli), Number(p.fromYMilli));
      if (p.mechanicId === 'siege-blast') {
        const impact = s.render.impacts.find(impact => impact.id === p.impactId);
        if (!impact) continue;
        // The shell leaves the muzzle and arcs over a faint glow that tracks the ground beneath it.
        // Effects stay in the family color and core so shots remain identifiable.
        const a = Math.atan2(end.y - from.y, end.x - from.x), forward = siegeMuzzle(1, 0);
        const muzzle = { x: from.x + Math.cos(a) * forward, y: from.y + Math.sin(a) * forward };
        const t = siegeFlightProgress(event.tick, impact.impactTick, s.render.tick);
        const shell = siegeShellPose(muzzle, end, t);
        if (!this.reducedMotion && age < 450) {
          const k = age / 450;
          fx.circle(muzzle.x + Math.cos(a) * .12 * k, muzzle.y + Math.sin(a) * .12 * k, .06 + .12 * k)
            .fill({ color, alpha: .18 * (1 - k) });
        }
        if (age < 120) fx.circle(muzzle.x, muzzle.y, .03 + .09 * (1 - age / 120)).fill({ color: core, alpha: .8 * (1 - age / 120) });
        fx.circle(shell.ground.x, shell.ground.y, .09 * (1 - .35 * shell.height))
          .fill({ color, alpha: .22 * (1 - .5 * shell.height) });
        if (!this.reducedMotion) for (let k = 3; k >= 1; k--) {
          const trail = siegeShellPose(muzzle, end, t - k * .045);
          fx.circle(trail.x, trail.y, .05).fill({ color, alpha: .12 * (4 - k) });
        }
        // Sphere shading within the family palette: over the dark board, stacked discs that grow more
        // opaque as they shrink toward the top-left light read as a lit face turning into shadow.
        // Towers have no Levels in the simulation yet, so every shell is fired at Level 1.
        const radius = siegeShellRadius(1, shell.height);
        for (let i = 0; i < SHELL_SHADE_STEPS; i++) {
          const k = i / SHELL_SHADE_STEPS, drift = radius * .38 * k;
          fx.circle(shell.x - drift * .51, shell.y - drift * .86, radius * (1 - .72 * k)).fill({ color, alpha: .3 + .7 * k });
        }
        fx.circle(shell.x - radius * .34, shell.y - radius * .42, radius * .3).fill({ color: core, alpha: .45 });
        fx.circle(shell.x - radius * .38, shell.y - radius * .46, radius * .14).fill({ color: core, alpha: .95 });
      } else if (p.mechanicId === 'rail-line') {
        const a = Math.atan2(end.y - from.y, end.x - from.x);
        const { forward, side } = railMuzzle(1, barrel, this.reducedMotion ? 0 : barrelOffset(born, this.#time));
        const muzzle = { x: from.x + Math.cos(a) * forward - Math.sin(a) * side,
          y: from.y + Math.sin(a) * forward + Math.cos(a) * side };
        // Towers have no Levels in the simulation yet, so every Rail fires its Level 1 slug.
        // The piercing mechanic remains hitscan; the slug is presentation only.
        drawRailSlug(fx, muzzle, end, age, 1, color, core, this.reducedMotion);
      } else if (p.mechanicId === 'arc-chain' && age < 180) {
        let previous = from;
        for (const [index, target] of (chain ?? [end]).entries()) {
          const dx = target.x - previous.x, dy = target.y - previous.y;
          const length = Math.max(.01, Math.hypot(dx, dy));
          const jitter = this.reducedMotion ? 0 : .18;
          const mid = { x: (previous.x + target.x) / 2 - dy / length * jitter * (index % 2 ? -1 : 1),
            y: (previous.y + target.y) / 2 + dx / length * jitter * (index % 2 ? -1 : 1) };
          this.stroke(previous, mid, color, 1 - age / 180, .07, core);
          this.stroke(mid, target, color, 1 - age / 180, .07, core);
          primitive(fx, 'broodling', target.x, target.y, .16 * (1 - age / 180)).fill({ color: core, alpha: .8 });
          previous = target;
        }
      } else if (p.mechanicId === 'direct' && age < 120) {
        this.stroke(from, end, color, 1 - age / 120, .04, core);
      }
    }
    this.#bursts = this.#bursts.filter((b) => this.#time - b.born < burstLifetime(this.reducedMotion));
    for (const b of this.#bursts) {
      const t = burstProgress(this.#time - b.born, this.reducedMotion), color = CREEP_COLORS[b.kind] ?? 0xffffff;
      const count = this.reducedMotion ? 3 : 12;
      for (let i = 0; i < count; i++) {
        const a = i * Math.PI * 2 / count + b.seed * .7;
        const d = this.reducedMotion ? .12 : (.34 + (i % 3) * .23) * (1 - (1 - t) ** 3);
        primitive(fx, b.kind, b.x + Math.cos(a) * d, b.y + Math.sin(a) * d,
          .075 * (1 - t) + .01, a).fill({ color, alpha: 1 - t });
      }
    }
    this.app.canvas.dataset.railShots = String([...this.#aim.entries()].filter(([id]) => s.render.towers.some(t => t.id === id && t.familyId === 'rail')).reduce((n, [, a]) => n + a.shots, 0));
    this.app.canvas.dataset.particles = String(this.#bursts.length);
  }
}
