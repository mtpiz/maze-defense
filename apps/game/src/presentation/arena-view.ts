import {
  Application,
  Assets,
  Container,
  Graphics,
  RendererType,
  Text,
  Texture,
  UPDATE_PRIORITY,
  type FederatedPointerEvent,
  type WebGLRenderer,
} from 'pixi.js';
import type { PresentationEvent } from '@tower-defense/sim';
import type { BenchmarkViewState } from '../application/benchmark-controller.js';
import type { FrameWorkSample } from '../platform/engine-gate-diagnostics.js';
import { CombatFeedback, DAMAGE_LABEL_LIMIT } from './combat-feedback.js';
import { CombatSprites, COMBAT_ATLAS_URL, CREEP_DIAMETER_CELLS } from './combat-sprites.js';

export interface VisualPreferences {
  readonly highContrast: boolean;
  readonly reducedMotion: boolean;
  readonly showAirRoute: boolean;
}

interface BoardLayout {
  readonly x: number;
  readonly y: number;
  readonly tileSize: number;
  readonly width: number;
  readonly height: number;
}

interface Point {
  readonly x: number;
  readonly y: number;
}

const COLORS = Object.freeze({
  void: 0x04080b,
  backdrop: 0x071116,
  tileA: 0x193033,
  tileB: 0x172a2e,
  tileEdge: 0x2d4b4d,
  tileHighlight: 0x426263,
  hard: 0x182026,
  hardEdge: 0x53606a,
  groundRoute: 0xd7f4dc,
  airRoute: 0x55dbff,
  foundation: 0x68e0ad,
  foundationCore: 0xd9fff1,
  rail: 0x63c8f2,
  railCore: 0xe1f7ff,
  siege: 0xffae58,
  siegeCore: 0xffefd5,
  impact: 0xff884f,
  selected: 0xffcf63,
  waypoint: 0xffc857,
  spawn: 0x6fe3ab,
  exit: 0xff6e7e,
  enemy: 0xff5d83,
  airborne: 0x72dcff,
});

const cellCenter = (cell: number, columns: number, layout: BoardLayout): Point => ({
  x: layout.x + (cell % columns + 0.5) * layout.tileSize,
  y: layout.y + (Math.floor(cell / columns) + 0.5) * layout.tileSize,
});

const drawDashedSegment = (
  graphics: Graphics,
  from: Point,
  to: Point,
  color: number,
  alpha: number,
  width: number,
  dashLength: number,
  gapLength: number,
): void => {
  const deltaX = to.x - from.x;
  const deltaY = to.y - from.y;
  const distance = Math.hypot(deltaX, deltaY);
  if (distance === 0) return;
  const directionX = deltaX / distance;
  const directionY = deltaY / distance;

  for (let offset = 0; offset < distance; offset += dashLength + gapLength) {
    const end = Math.min(offset + dashLength, distance);
    graphics
      .moveTo(from.x + directionX * offset, from.y + directionY * offset)
      .lineTo(from.x + directionX * end, from.y + directionY * end)
      .stroke({ color, alpha, width, cap: 'round' });
  }
};

const drawDashedPath = (
  graphics: Graphics,
  cells: readonly number[],
  columns: number,
  layout: BoardLayout,
  color: number,
  alpha: number,
  width: number,
): void => {
  for (let index = 0; index < cells.length - 1; index += 1) {
    const current = cells[index];
    const next = cells[index + 1];
    if (current === undefined || next === undefined) continue;
    drawDashedSegment(
      graphics,
      cellCenter(current, columns, layout),
      cellCenter(next, columns, layout),
      color,
      alpha,
      width,
      layout.tileSize * 0.22,
      layout.tileSize * 0.14,
    );
  }
};

export class ArenaView {
  readonly #mount: HTMLElement;
  readonly #onCellTap: (cell: number) => void;
  readonly #app = new Application();
  readonly #backdrop = new Graphics();
  readonly #tiles = new Graphics();
  readonly #routes = new Graphics();
  readonly #range = new Graphics();
  readonly #effects = new Graphics();
  readonly #towers = new Graphics();
  readonly #creeps = new Graphics({ label: 'creep-overlays' });
  readonly #interaction = new Graphics();
  readonly #labels = new Container();
  readonly #combatLabels = new Container();
  readonly #labelPool: Text[] = [];
  readonly #feedback = new CombatFeedback();
  readonly #sprites = new CombatSprites();
  #atlasState: 'loading' | 'fallback' = 'loading';
  #layout: BoardLayout | null = null;
  #latestState: BenchmarkViewState | null = null;
  #latestPreferences: VisualPreferences | null = null;
  #boardKey = '';
  #resizeObserver: ResizeObserver | null = null;
  #paintingPointerId: number | null = null;
  #paintedCells = new Set<number>();
  #combatEvents: PresentationEvent[] = [];
  #lastEventSequence = 0;
  #lastTick = 0;
  #frameRate: 30 | 60 = 60;
  #dirty = true;
  #initialized = false;
  #disposed = false;
  readonly #onVisibilityChange = (): void => {
    if (!this.#initialized || this.#disposed) return;
    if (document.visibilityState === 'visible') this.#app.start();
    else this.#app.stop();
  };
  readonly #onPageHide = (): void => { this.#app.stop(); };
  readonly #prepareTextureSlots = (): void => {
    if (this.#app.renderer.type !== RendererType.WEBGL) return;
    const renderer = this.#app.renderer as WebGLRenderer;
    // Pixi 8.17 initializes only 16 slots, but batch shaders can reference more.
    // Unbind first so restored contexts cannot reuse stale placeholder bindings.
    renderer.texture.unbind(Texture.EMPTY.source);
    for (let unit = 0; unit < renderer.limits.maxTextures; unit += 1) {
      renderer.texture.bind(Texture.EMPTY, unit);
    }
  };

  constructor(
    mount: HTMLElement,
    onCellTap: (cell: number) => void,
    private readonly onFrame: (elapsedMilliseconds: number) => void = () => undefined,
    private readonly onFrameWork: (sample: FrameWorkSample) => void = () => undefined,
  ) {
    this.#mount = mount;
    this.#onCellTap = onCellTap;
  }

  async initialize(): Promise<void> {
    await this.#app.init({
      autoStart: false,
      resizeTo: this.#mount,
      antialias: true,
      autoDensity: true,
      resolution: Math.min(window.devicePixelRatio || 1, 2),
      backgroundColor: COLORS.void,
      preference: 'webgl',
    });
    this.#initialized = true;
    if (this.#disposed) {
      this.#app.destroy({ removeView: true }, { children: true });
      return;
    }
    this.#prepareTextureSlots();
    this.#app.canvas.addEventListener('webglcontextrestored', this.#prepareTextureSlots);
    this.#app.canvas.className = 'arena-canvas';
    this.#app.canvas.setAttribute('aria-label', 'Interactive tower-defense Arena');
    this.#app.canvas.setAttribute('role', 'img');
    this.#mount.appendChild(this.#app.canvas);
    this.#app.stage.addChild(
      this.#backdrop,
      this.#tiles,
      this.#range,
      this.#routes,
      this.#effects,
      this.#towers,
      this.#sprites.towers,
      this.#sprites.creeps,
      this.#creeps,
      this.#labels,
      this.#combatLabels,
      this.#interaction,
    );
    this.#app.canvas.dataset.combatArt = 'loading';
    void Assets.load<Texture>(COMBAT_ATLAS_URL).then((atlas) => {
      if (this.#disposed) return;
      this.#sprites.setAtlas(atlas);
      this.#boardKey = '';
      this.#dirty = true;
    }).catch((error: unknown) => {
      if (this.#disposed) return;
      this.#atlasState = 'fallback';
      this.#dirty = true;
      console.warn('Combat atlas unavailable; using geometric units.', error);
    });
    for (let index = 0; index <= DAMAGE_LABEL_LIMIT; index += 1) {
      const label = new Text({ text: '', style: {
        fontFamily: 'system-ui, sans-serif', fontSize: 11, fontWeight: '700',
        fill: 0xffffff, stroke: { color: 0x020709, width: 3 }, align: 'center',
      } });
      label.anchor.set(0.5, 1);
      label.visible = false;
      this.#labelPool.push(label);
      this.#combatLabels.addChild(label);
    }
    this.#app.ticker.maxFPS = this.#frameRate;
    let updateMilliseconds = 0;
    let sceneMilliseconds = 0;
    let submissionStartedAt = 0;
    this.#app.ticker.add((ticker) => {
      const updateStartedAt = performance.now();
      this.onFrame(ticker.elapsedMS);
      const sceneStartedAt = performance.now();
      updateMilliseconds = sceneStartedAt - updateStartedAt;
      if (this.#dirty) {
        this.#dirty = false;
        this.#drawLatest();
      }
      this.#drawCombatLabels();
      sceneMilliseconds = performance.now() - sceneStartedAt;
    }, undefined, UPDATE_PRIORITY.HIGH);
    // Pixi submits at LOW priority. Bracket CPU submission, not asynchronous GPU execution.
    this.#app.ticker.add(() => { submissionStartedAt = performance.now(); }, undefined, UPDATE_PRIORITY.LOW + 1);
    this.#app.ticker.add(() => this.onFrameWork({
      updateMilliseconds,
      sceneMilliseconds,
      renderSubmissionMilliseconds: performance.now() - submissionStartedAt,
    }), undefined, UPDATE_PRIORITY.LOW - 1);
    this.#interaction.eventMode = 'static';
    this.#interaction.cursor = 'pointer';
    this.#interaction.on('pointerdown', (event: FederatedPointerEvent) =>
      this.#beginPaint(event),
    );
    this.#interaction.on('pointermove', (event: FederatedPointerEvent) =>
      this.#continuePaint(event),
    );
    this.#interaction.on('pointerup', (event: FederatedPointerEvent) => this.#endPaint(event));
    this.#interaction.on('pointerupoutside', (event: FederatedPointerEvent) =>
      this.#endPaint(event),
    );

    this.#resizeObserver = new ResizeObserver(() => {
      this.#boardKey = '';
      this.#dirty = true;
    });
    this.#resizeObserver.observe(this.#mount);
    document.addEventListener('visibilitychange', this.#onVisibilityChange);
    window.addEventListener('pagehide', this.#onPageHide);
    window.addEventListener('pageshow', this.#onVisibilityChange);
    this.#onVisibilityChange();
  }

  setFrameRate(frameRate: 30 | 60): void {
    this.#frameRate = frameRate;
    if (this.#initialized && !this.#disposed) this.#app.ticker.maxFPS = frameRate;
  }

  render(state: BenchmarkViewState, preferences: VisualPreferences): void {
    this.#feedback.consume(state.recentEvents, state.render.tick, performance.now());
    if (state.render.tick < this.#lastTick) {
      this.#combatEvents = [];
      this.#lastEventSequence = 0;
    }
    this.#lastTick = state.render.tick;
    for (const event of state.recentEvents) {
      if (event.sequence <= this.#lastEventSequence) continue;
      this.#lastEventSequence = event.sequence;
      if (event.type === 'tower-fired' || event.type === 'weapon-impact' || event.type === 'creep-died') {
        this.#combatEvents.push(event);
      }
    }
    this.#combatEvents = this.#combatEvents.filter((event) => state.render.tick - event.tick < 10).slice(-48);
    this.#latestState = state;
    this.#latestPreferences = preferences;
    this.#dirty = true;
  }

  destroy(): void {
    if (this.#disposed) return;
    this.#disposed = true;
    document.removeEventListener('visibilitychange', this.#onVisibilityChange);
    window.removeEventListener('pagehide', this.#onPageHide);
    window.removeEventListener('pageshow', this.#onVisibilityChange);
    this.#resizeObserver?.disconnect();
    this.#resizeObserver = null;
    this.#sprites.destroy();
    if (this.#initialized) {
      this.#app.canvas.removeEventListener('webglcontextrestored', this.#prepareTextureSlots);
      this.#app.destroy({ removeView: true }, { children: true });
    }
  }

  #drawLatest(): void {
    const state = this.#latestState;
    const preferences = this.#latestPreferences;
    if (state === null || preferences === null || this.#app.renderer === undefined) return;

    const screenWidth = this.#app.screen.width;
    const screenHeight = this.#app.screen.height;
    if (screenWidth <= 0 || screenHeight <= 0) return;

    const tileSize = Math.max(
      16,
      Math.floor(
        Math.min(
          (screenWidth - 20) / state.render.arenaWidth,
          (screenHeight - 20) / state.render.arenaHeight,
        ),
      ),
    );
    const width = tileSize * state.render.arenaWidth;
    const height = tileSize * state.render.arenaHeight;
    this.#layout = Object.freeze({
      x: Math.floor((screenWidth - width) / 2),
      y: Math.floor((screenHeight - height) / 2),
      tileSize,
      width,
      height,
    });
    this.#sprites.sync(state.render, this.#layout, preferences, this.#combatEvents);
    this.#app.canvas.dataset.combatArt = preferences.highContrast ? 'high-contrast'
      : this.#sprites.ready ? 'proxy-v1' : this.#atlasState;

    const boardKey = [
      screenWidth,
      screenHeight,
      state.render.routeVersion,
      state.render.towers.map(({ id, familyId, operationalAtTick }) =>
        `${id}-${familyId}-${state.render.tick >= operationalAtTick}`).join(','),
      state.selectedTowerId ?? 'none',
      state.ui.phase,
      preferences.highContrast,
      preferences.showAirRoute,
    ].join(':');
    if (boardKey !== this.#boardKey) {
      this.#boardKey = boardKey;
      this.#drawBoard(state, preferences);
    }
    this.#drawEffects(state, preferences);
    this.#drawCreeps(state, preferences);
  }

  #drawBoard(state: BenchmarkViewState, preferences: VisualPreferences): void {
    const layout = this.#layout;
    if (layout === null) return;
    const { arenaWidth: columns, arenaHeight: rows } = state.render;
    const inactiveCells = new Set(state.render.inactiveCells);
    const terrainByCell = new Map(
      state.render.terrainCells.map((terrainCell) => [terrainCell.cell, terrainCell]),
    );
    const selectedTower = state.render.towers.find(({ id }) => id === state.selectedTowerId);

    this.#backdrop.clear().rect(0, 0, this.#app.screen.width, this.#app.screen.height).fill({
      color: preferences.highContrast ? 0x000000 : COLORS.backdrop,
    });
    for (let index = 0; index < 34; index += 1) {
      const x = ((index * 83 + 29) % 997) / 997;
      const y = ((index * 47 + 11) % 991) / 991;
      this.#backdrop
        .circle(x * this.#app.screen.width, y * this.#app.screen.height, index % 3 === 0 ? 1.2 : 0.7)
        .fill({ color: 0x83b6b8, alpha: preferences.highContrast ? 0.35 : 0.15 });
    }

    this.#tiles.clear();
    for (let row = 0; row < rows; row += 1) {
      for (let column = 0; column < columns; column += 1) {
        const cell = row * columns + column;
        if (inactiveCells.has(cell)) continue;
        const x = layout.x + column * layout.tileSize;
        const y = layout.y + row * layout.tileSize;
        const inset = Math.max(1.5, layout.tileSize * 0.045);
        const radius = Math.max(2, layout.tileSize * 0.1);

        this.#tiles
          .roundRect(
            x + inset + layout.tileSize * 0.035,
            y + inset + layout.tileSize * 0.11,
            layout.tileSize - inset * 2,
            layout.tileSize - inset * 2,
            radius,
          )
          .fill({ color: 0x010304, alpha: 0.82 });

        const terrain = terrainByCell.get(cell);
        if (terrain !== undefined && !terrain.buildable) {
          this.#tiles
            .roundRect(
              x + inset,
              y + inset,
              layout.tileSize - inset * 2,
              layout.tileSize - inset * 2 - layout.tileSize * 0.08,
              radius,
            )
            .fill({ color: preferences.highContrast ? 0x303030 : COLORS.hard })
            .stroke({
              color: preferences.highContrast ? 0xffffff : COLORS.hardEdge,
              width: Math.max(1, layout.tileSize * 0.035),
              alpha: 0.7,
            });
          this.#tiles
            .moveTo(x + layout.tileSize * 0.23, y + layout.tileSize * 0.28)
            .lineTo(x + layout.tileSize * 0.72, y + layout.tileSize * 0.71)
            .moveTo(x + layout.tileSize * 0.43, y + layout.tileSize * 0.2)
            .lineTo(x + layout.tileSize * 0.8, y + layout.tileSize * 0.52)
            .stroke({ color: COLORS.hardEdge, width: 1, alpha: 0.3 });
        } else {
          const surfaceColor =
            preferences.highContrast
              ? (row + column) % 2 === 0
                ? 0x18282a
                : 0x101c1e
              : (row + column) % 2 === 0
                ? COLORS.tileA
                : COLORS.tileB;
          this.#tiles
            .roundRect(
              x + inset,
              y + inset,
              layout.tileSize - inset * 2,
              layout.tileSize - inset * 2 - layout.tileSize * 0.08,
              radius,
            )
            .fill({ color: surfaceColor })
            .stroke({
              color: preferences.highContrast ? 0x7ca9a8 : COLORS.tileEdge,
              width: Math.max(1, layout.tileSize * 0.025),
              alpha: 0.76,
            });
          this.#tiles
            .moveTo(x + layout.tileSize * 0.18, y + layout.tileSize * 0.2)
            .lineTo(x + layout.tileSize * 0.72, y + layout.tileSize * 0.2)
            .stroke({ color: COLORS.tileHighlight, width: 1, alpha: 0.28 });
        }
      }
    }

    this.#routes.clear();
    const routeIsProminent = state.ui.phase === 'opening' || state.ui.phase === 'planning';
    const routeAlpha = routeIsProminent ? 0.48 : 0.13;
    drawDashedPath(
      this.#routes,
      state.render.groundRoute,
      columns,
      layout,
      preferences.highContrast ? 0xffffff : COLORS.groundRoute,
      routeAlpha,
      Math.max(1.5, layout.tileSize * 0.065),
    );
    const routesDiverge =
      state.render.groundRoute.length !== state.render.airRoute.length ||
      state.render.groundRoute.some((cell, index) => state.render.airRoute[index] !== cell);
    if (preferences.showAirRoute && routesDiverge) {
      drawDashedPath(
        this.#routes,
        state.render.airRoute,
        columns,
        layout,
        COLORS.airRoute,
        routeIsProminent ? 0.72 : 0.22,
        Math.max(1.5, layout.tileSize * 0.055),
      );
    }

    this.#range.clear();
    if (selectedTower !== undefined && state.ui.phase !== 'victory' && state.ui.phase !== 'defeat') {
      const center = cellCenter(selectedTower.cell, columns, layout);
      const radius = selectedTower.weapon.rangeMilliCells / 1_000 * layout.tileSize;
      this.#range.circle(center.x, center.y, radius)
        .fill({ color: COLORS.selected, alpha: preferences.highContrast ? 0.07 : 0.045 })
        .stroke({ color: preferences.highContrast ? 0xffffff : COLORS.selected, width: 2, alpha: 0.8 });
    }
    this.#drawAnchors(state, layout);
    this.#towers.clear();
    for (const tower of state.render.towers) {
      const center = cellCenter(tower.cell, columns, layout);
      const radius = layout.tileSize * 0.25;
      const isSelected = selectedTower?.id === tower.id;
      if (isSelected) {
        this.#towers
          .circle(center.x, center.y, layout.tileSize * 0.4)
          .stroke({ color: COLORS.selected, width: Math.max(2, layout.tileSize * 0.07), alpha: 0.9 });
      }
      this.#towers
        .circle(center.x, center.y + layout.tileSize * 0.07, radius * 1.08)
        .fill({ color: 0x010504, alpha: 0.8 });
      const operationalAlpha = state.render.tick < tower.operationalAtTick ? 0.45 : 1;
      if (this.#sprites.ready && !preferences.highContrast) continue;
      if (tower.familyId === 'rail') {
        this.#towers
          .poly(
            [
              center.x,
              center.y - radius,
              center.x + radius * 0.8,
              center.y + radius * 0.65,
              center.x - radius * 0.8,
              center.y + radius * 0.65,
            ],
            true,
          )
          .fill({ color: 0x153746, alpha: operationalAlpha })
          .stroke({ color: COLORS.rail, width: Math.max(1.5, layout.tileSize * 0.055) });
        this.#towers
          .rect(
            center.x - radius * 0.16,
            center.y - radius * 1.08,
            radius * 0.32,
            radius * 1.35,
          )
          .fill({ color: COLORS.railCore, alpha: operationalAlpha });
      } else if (tower.familyId === 'siege') {
        this.#towers
          .poly(
            [
              center.x - radius * 0.85,
              center.y - radius * 0.5,
              center.x,
              center.y - radius,
              center.x + radius * 0.85,
              center.y - radius * 0.5,
              center.x + radius * 0.85,
              center.y + radius * 0.5,
              center.x,
              center.y + radius,
              center.x - radius * 0.85,
              center.y + radius * 0.5,
            ],
            true,
          )
          .fill({ color: 0x49311d, alpha: operationalAlpha })
          .stroke({ color: COLORS.siege, width: Math.max(1.5, layout.tileSize * 0.055) });
        this.#towers
          .circle(center.x, center.y, radius * 0.42)
          .fill({ color: COLORS.siegeCore, alpha: operationalAlpha });
      } else {
        this.#towers
          .poly(
            [
              center.x,
              center.y - radius,
              center.x + radius,
              center.y,
              center.x,
              center.y + radius,
              center.x - radius,
              center.y,
            ],
            true,
          )
          .fill({ color: 0x143d33, alpha: operationalAlpha })
          .stroke({ color: COLORS.foundation, width: Math.max(1.5, layout.tileSize * 0.055) });
        this.#towers
          .circle(center.x, center.y, radius * 0.35)
          .fill({ color: COLORS.foundationCore, alpha: operationalAlpha })
          .stroke({ color: COLORS.foundation, width: radius * 0.18, alpha: 0.75 });
      }
    }

    this.#interaction
      .clear()
      .rect(layout.x, layout.y, layout.width, layout.height)
      .fill({ color: 0xffffff, alpha: 0.001 });
  }

  #drawAnchors(state: BenchmarkViewState, layout: BoardLayout): void {
    const columns = state.render.arenaWidth;
    for (const child of this.#labels.removeChildren()) child.destroy();

    const spawn = cellCenter(state.render.spawnCell, columns, layout);
    this.#routes
      .circle(spawn.x, spawn.y, layout.tileSize * 0.29)
      .fill({ color: COLORS.spawn, alpha: 0.13 })
      .stroke({ color: COLORS.spawn, width: Math.max(1.5, layout.tileSize * 0.06), alpha: 0.9 });
    this.#routes
      .poly(
        [
          spawn.x - layout.tileSize * 0.1,
          spawn.y - layout.tileSize * 0.14,
          spawn.x + layout.tileSize * 0.16,
          spawn.y,
          spawn.x - layout.tileSize * 0.1,
          spawn.y + layout.tileSize * 0.14,
        ],
        true,
      )
      .fill({ color: COLORS.spawn });

    const exit = cellCenter(state.render.exitCell, columns, layout);
    this.#routes
      .circle(exit.x, exit.y, layout.tileSize * 0.29)
      .fill({ color: COLORS.exit, alpha: 0.13 })
      .stroke({ color: COLORS.exit, width: Math.max(1.5, layout.tileSize * 0.06), alpha: 0.9 });
    this.#routes
      .circle(exit.x, exit.y, layout.tileSize * 0.105)
      .fill({ color: COLORS.exit, alpha: 0.9 });

    let searchFrom = 0;
    state.render.waypointCells.forEach((cell, index) => {
      const center = cellCenter(cell, columns, layout);
      const activeVisit = state.render.groundRoute.indexOf(cell, searchFrom);
      if (activeVisit >= 0) searchFrom = activeVisit + 1;
      const nextCell = activeVisit >= 0 ? state.render.groundRoute[activeVisit + 1] : undefined;
      const next = nextCell === undefined ? null : cellCenter(nextCell, columns, layout);
      const angle = next === null ? 0 : Math.atan2(next.y - center.y, next.x - center.x);
      const arrowRadius = layout.tileSize * 0.19;

      this.#routes
        .circle(center.x, center.y, layout.tileSize * 0.31)
        .fill({ color: COLORS.waypoint, alpha: 0.14 })
        .stroke({ color: COLORS.waypoint, width: Math.max(1.5, layout.tileSize * 0.055), alpha: 0.95 });
      this.#routes
        .poly(
          [
            center.x + Math.cos(angle) * arrowRadius,
            center.y + Math.sin(angle) * arrowRadius,
            center.x + Math.cos(angle + 2.45) * arrowRadius * 0.7,
            center.y + Math.sin(angle + 2.45) * arrowRadius * 0.7,
            center.x + Math.cos(angle - 2.45) * arrowRadius * 0.7,
            center.y + Math.sin(angle - 2.45) * arrowRadius * 0.7,
          ],
          true,
        )
        .fill({ color: COLORS.waypoint });

      const label = new Text({
        text: String(index + 1),
        style: {
          fontFamily: 'system-ui, sans-serif',
          fontSize: Math.max(9, layout.tileSize * 0.24),
          fontWeight: '800',
          fill: 0x1a1205,
        },
      });
      label.anchor.set(0.5);
      label.position.set(center.x, center.y);
      this.#labels.addChild(label);
    });
  }

  #drawCreeps(state: BenchmarkViewState, preferences: VisualPreferences): void {
    this.#creeps.clear();
    const layout = this.#layout;
    if (layout === null) return;
    const columns = state.render.arenaWidth;
    const baseSize = layout.tileSize * 0.13;
    const useSprites = this.#sprites.ready && !preferences.highContrast;

    for (const creep of state.render.creeps) {
      const from = cellCenter(0, columns, layout);
      const point = {
        x: from.x + creep.xMilli / 1_000 * layout.tileSize,
        y: from.y + creep.yMilli / 1_000 * layout.tileSize,
      };
      const size = useSprites ? layout.tileSize * CREEP_DIAMETER_CELLS[creep.creepId] / 2
        : creep.creepId === 'carapace'
          ? baseSize * 1.35
          : creep.creepId === 'broodling'
            ? baseSize * 0.72
            : baseSize;

      if (!useSprites) this.#creeps
        .circle(point.x + 1, point.y + 2, baseSize * 0.92)
        .fill({ color: 0x000000, alpha: 0.55 });
      if (!useSprites && creep.layer === 'air') {
        this.#creeps
          .poly(
            [
              point.x - size * 1.2,
              point.y - size * 0.7,
              point.x,
              point.y + size,
              point.x + size * 1.2,
              point.y - size * 0.7,
              point.x,
              point.y,
            ],
            true,
          )
          .fill({ color: COLORS.airborne, alpha: 0.9 })
          .stroke({ color: 0xd6f7ff, width: 1, alpha: 0.82 });
      } else if (!useSprites) {
        this.#creeps
          .poly(
            [
              point.x,
              point.y - size,
              point.x + size,
              point.y,
              point.x,
              point.y + size,
              point.x - size,
              point.y,
            ],
            true,
          )
          .fill({ color: preferences.highContrast ? 0xffffff : COLORS.enemy, alpha: 0.94 })
          .stroke({ color: 0xffc0cf, width: 1, alpha: 0.75 });
      }
      if (creep.armor > 0) {
        this.#creeps.roundRect(point.x - size * 1.25, point.y - size * 1.25, size * 2.5, size * 2.5, 2)
          .stroke({ color: 0xffdfac, width: 1.5 });
      }
      if (creep.health < creep.maxHealth) {
        const barWidth = Math.max(8, size * 3);
        this.#creeps.rect(point.x - barWidth / 2, point.y - size - 5, barWidth, 2)
          .fill({ color: 0x091411 });
        this.#creeps.rect(point.x - barWidth / 2, point.y - size - 5, barWidth * creep.health / creep.maxHealth, 2)
          .fill({ color: preferences.highContrast ? 0xffffff : 0xa2f0b3 });
      }
    }
  }

  #drawEffects(state: BenchmarkViewState, preferences: VisualPreferences): void {
    this.#effects.clear();
    const layout = this.#layout;
    if (layout === null) return;
    const pointAt = (x: number, y: number): Point => ({
      x: layout.x + (x / 1_000 + 0.5) * layout.tileSize,
      y: layout.y + (y / 1_000 + 0.5) * layout.tileSize,
    });
    for (const event of this.#combatEvents) {
      const { xMilli, yMilli, fromXMilli, fromYMilli, radiusMilliCells, mechanicId } = event.payload;
      if (typeof xMilli !== 'number' || typeof yMilli !== 'number') continue;
      const point = pointAt(xMilli, yMilli);
      const age = (state.render.tick - event.tick) / 10;
      const alpha = preferences.reducedMotion ? 0.5 : (1 - age) * 0.8;
      if (event.type === 'tower-fired' && typeof fromXMilli === 'number' && typeof fromYMilli === 'number') {
        const from = pointAt(fromXMilli, fromYMilli);
        const color = mechanicId === 'rail-line' ? COLORS.rail
          : mechanicId === 'siege-blast' ? COLORS.siege : COLORS.foundation;
        this.#effects.moveTo(from.x, from.y).lineTo(point.x, point.y)
          .stroke({ color: preferences.highContrast ? 0xffffff : color, width: mechanicId === 'rail-line' ? 2 : 1, alpha });
      } else {
        const radius = event.type === 'weapon-impact' && typeof radiusMilliCells === 'number'
          ? radiusMilliCells / 1_000 * layout.tileSize : layout.tileSize * 0.23;
        this.#effects.circle(point.x, point.y, radius * (preferences.reducedMotion ? 1 : 0.7 + age * 0.3))
          .stroke({ color: event.type === 'creep-died' ? COLORS.enemy : COLORS.impact, width: 2, alpha });
      }
    }
    for (const impact of state.render.impacts) {
      const center = {
        x: layout.x + (impact.xMilli / 1_000 + 0.5) * layout.tileSize,
        y: layout.y + (impact.yMilli / 1_000 + 0.5) * layout.tileSize,
      };
      const radius = (impact.radiusMilliCells / 1_000) * layout.tileSize;
      const remainingTicks = Math.max(0, impact.impactTick - state.render.tick);
      const pulse = preferences.reducedMotion ? 0 : (remainingTicks % 10) / 10;
      this.#effects
        .circle(center.x, center.y, radius)
        .fill({ color: COLORS.impact, alpha: 0.07 + pulse * 0.04 })
        .stroke({
          color: preferences.highContrast ? 0xffffff : COLORS.impact,
          width: Math.max(1.5, layout.tileSize * 0.05),
          alpha: 0.62,
        });
      this.#effects
        .moveTo(center.x - radius * 0.3, center.y)
        .lineTo(center.x + radius * 0.3, center.y)
        .moveTo(center.x, center.y - radius * 0.3)
        .lineTo(center.x, center.y + radius * 0.3)
        .stroke({ color: COLORS.impact, width: 1.5, alpha: 0.8 });
    }
  }

  #drawCombatLabels(): void {
    const layout = this.#layout;
    if (layout === null) return;
    const labels = this.#feedback.snapshot(performance.now());
    this.#labelPool.forEach((text, index) => {
      const label = labels[index];
      text.visible = label !== undefined;
      if (label === undefined) return;
      text.text = label.text;
      text.style.fill = label.tone === 'leak' ? 0xffa6b6 : label.tone === 'armor' ? 0xffd890 : 0xffffff;
      text.alpha = this.#latestPreferences?.reducedMotion ? 1 : Math.min(1, (1 - label.progress) * 3);
      const rise = this.#latestPreferences?.reducedMotion ? 0 : label.progress * 10;
      const x = layout.x + (label.xMilli / 1_000 + 0.5) * layout.tileSize;
      const y = layout.y + (label.yMilli / 1_000 + 0.5) * layout.tileSize - 9 - rise;
      text.position.set(
        Math.max(text.width / 2 + 3, Math.min(this.#app.screen.width - text.width / 2 - 3, x)),
        Math.max(text.height + 3, Math.min(this.#app.screen.height - 3, y)),
      );
    });
  }

  #cellAt(event: FederatedPointerEvent): number | null {
    const layout = this.#layout;
    const state = this.#latestState;
    if (layout === null || state === null) return null;
    const column = Math.floor((event.global.x - layout.x) / layout.tileSize);
    const row = Math.floor((event.global.y - layout.y) / layout.tileSize);
    if (
      column < 0 ||
      column >= state.render.arenaWidth ||
      row < 0 ||
      row >= state.render.arenaHeight
    ) {
      return null;
    }
    const cell = row * state.render.arenaWidth + column;
    return state.render.inactiveCells.includes(cell) ? null : cell;
  }

  #beginPaint(event: FederatedPointerEvent): void {
    this.#paintingPointerId = event.pointerId;
    this.#paintedCells.clear();
    this.#paintCell(event);
  }

  #continuePaint(event: FederatedPointerEvent): void {
    if (this.#paintingPointerId !== event.pointerId) return;
    this.#paintCell(event);
  }

  #endPaint(event: FederatedPointerEvent): void {
    if (this.#paintingPointerId !== event.pointerId) return;
    this.#paintingPointerId = null;
    this.#paintedCells.clear();
  }

  #paintCell(event: FederatedPointerEvent): void {
    const cell = this.#cellAt(event);
    if (cell === null || this.#paintedCells.has(cell)) return;
    this.#paintedCells.add(cell);
    this.#onCellTap(cell);
  }
}
