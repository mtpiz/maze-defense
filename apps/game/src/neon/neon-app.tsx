import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { Crosshair, Heart, Hexagon, Skull, Pause, Play, Settings2, X, Minus, Plus, RotateCcw,
  ArrowUpRight, Trash2, Ellipsis } from 'lucide-preact';
import type { TowerFamilyId } from '@tower-defense/content';
import { BenchmarkController } from '../application/benchmark-controller.js';
import { AudioDirector } from '../audio/audio-director.js';
import { GameAudio } from '../audio/game-audio.js';
import { BuildGesture, PREVIEW_MS, SLOT_POINTS, radialCenter, radialSlot } from './build-gesture.js';
import { NeonArena } from './neon-arena.js';
import { NEON_MISSION } from './neon-mission.js';
import { TOWER_COLORS } from './neon-palette.js';
import { CreepGlyph, HudDefs, LaunchChevrons, KillBars, MiniRoute, PlateChrome, RailFrame } from './hud-chrome.js';
import { KillHistory, bandMode, fittedBoard, mazeStats } from './hud-layout.js';
import { pointerFacingMilliDegrees, shouldBeginTowerAim } from './tower-aim.js';

type Specialist = 'rail' | 'siege' | 'arc';
const SPECIALISTS: readonly Specialist[] = ['rail', 'siege', 'arc'];
const ROLES = { foundation: 'Maze / close defense', rail: 'Precision / ground + air',
  siege: 'Area damage / ground', arc: 'Chain lightning / ground + air', gravity: 'Control' };
interface Menu { cell: number; x: number; y: number; hover: number | null; since: number; preview: boolean }
interface AimGesture {
  pointerId: number;
  start: { x: number; y: number };
  origin: { x: number; y: number };
  angle: number;
  active: boolean;
}

export const TowerIcon = ({ family }: { family: TowerFamilyId }) => (
  <svg class={`tower-icon ${family}`} style={{ color: `#${TOWER_COLORS[family].toString(16).padStart(6, '0')}` }} viewBox="0 0 48 48" aria-hidden="true">
    {family === 'rail' ? <>
      <path d="M6 30 15 14.4H33L42 30 33 45.6H15z" fill="#1a5f80" opacity=".8" />
      <path d="M12 30 18 19.6H30L36 30 30 40.4H18z" fill="#0b2a3a" />
      <path d="M24 22.3 30.7 26.1V33.9L24 37.7 17.3 33.9V26.1z" fill="#16323d" stroke="currentColor" stroke-width="1.5" />
      <path d="M20.2 2.5h7.6v29.2h-7.6z" fill="#05080d" stroke="currentColor" stroke-width="1.5" />
      <path d="M22.1 2.5h3.8v6.9h-3.8zM24 26.6 27 28.3V31.7L24 33.4 21 31.7V28.3z" fill="#eaffff" />
    </> : family === 'siege' ? <>
      <path d="m7 13 17-6 17 6v26H7z" fill="currentColor" opacity=".5" />
      <path d="M5 25h8v16H5zM35 25h8v16h-8zM16 7h16v29H16z" fill="currentColor" />
      <path d="M19 6h10v10H19z" fill="#171318" /><path d="M21 6h6v3h-6zM19 20h10v10H19z" fill="#fff0c8" />
    </> : family === 'arc' ? <>
      {[0,120,240].map(rotation => <g transform={`rotate(${rotation} 24 24)`}>
        <path d="m19 22-3-11 5-8 8 10-1 9z" fill="currentColor" opacity=".6" />
        <path d="m16 11 5-8 8 10-6 3z" fill="currentColor" />
        <path d="m18 9 3-6 4 5z" fill="#fff0ff" />
      </g>)}
      <path d="m24 18 6 6-6 6-6-6z" fill="#f7dcff" />
    </> : <><rect x="11" y="11" width="26" height="26" rx="4" fill="currentColor" fill-opacity=".14" stroke="currentColor" stroke-width="2" /><rect x="20" y="20" width="8" height="8" fill="currentColor" /></>}
  </svg>
);

export function NeonApp() {
  const controller = useMemo(() => new BenchmarkController(NEON_MISSION), []);
  const [state, setState] = useState(() => controller.getState());
  const [menu, setMenuState] = useState<Menu | null>(null);
  const menuRef = useRef<Menu | null>(null);
  const [reduced, setReduced] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [settings, setSettings] = useState(false);
  const [soundEffects, setSoundEffects] = useState(true);
  const [ambience, setAmbience] = useState(true);
  const audio = useMemo(() => new GameAudio({ effectsEnabled: true, musicEnabled: true }), []);
  const director = useMemo(() => new AudioDirector(NEON_MISSION.arena.width), []);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  const mountRef = useRef<HTMLDivElement>(null);
  const view = useRef<NeonArena | null>(null);
  const gesture = useRef<BuildGesture | null>(null);
  const points = useRef(new Map<number, { x: number; y: number }>());
  const aimGesture = useRef<AimGesture | null>(null);
  const pinching = useRef(false);
  const pinchDistance = useRef(0);
  const keyboardCell = useRef(10);
  const menuButtons = useRef<(HTMLButtonElement | null)[]>([]);
  const settingsButton = useRef<HTMLButtonElement>(null);
  const closeSettings = useRef<HTMLButtonElement>(null);
  const resultButton = useRef<HTMLButtonElement>(null);
  const kills = useRef(new KillHistory());
  const openRouteLength = useRef(0);
  const [surface, setSurface] = useState({ w: 0, h: 0 });
  const selected = state.render.towers.find((t) => t.id === state.selectedTowerId);
  const over = state.ui.phase === 'victory' || state.ui.phase === 'defeat';

  function setMenu(next: Menu | null): void {
    menuRef.current = next;
    setMenuState(next);
    if (!next && view.current) view.current.preview = null;
  }
  function clearAim(): void {
    aimGesture.current = null;
    if (view.current) view.current.aimPreview = null;
  }
  function cancel(): void {
    gesture.current?.cancel();
    clearAim();
    if (document.activeElement?.closest('.radial-layer')) mountRef.current?.focus({ preventScroll: true });
    setMenu(null);
  }
  function openMenu(cell: number, x: number, y: number, keyboard = false): void {
    const current = controller.getState();
    if (!current.ui.canDevelopTower) return;
    controller.tapCell(cell);
    const next = controller.getState();
    const tower = next.render.towers.find(t => t.cell === cell);
    if (!tower || tower.familyId !== 'foundation') return;
    const mount = mountRef.current;
    if (!mount) return;
    const center = radialCenter(x, y, mount.clientWidth, mount.clientHeight);
    setMenu({ cell, ...center, hover: null, since: 0, preview: false });
    if (keyboard) requestAnimationFrame(() => menuButtons.current[0]?.focus());
  }
  function choose(index: number | null): void {
    const m = menuRef.current;
    if (!m || index === null) { setMenu(null); return; }
    const family = SPECIALISTS[index];
    const current = controller.getState();
    const tower = current.render.towers.find(t => t.cell === m.cell);
    const option = current.specialistOptions.find(o => o.familyId === family);
    if (tower?.familyId === 'foundation' && family && option && current.ui.canDevelopTower && current.ui.fieldCredits >= option.fieldCreditCost) {
      controller.tapCell(m.cell);
      controller.installSelected(family);
    }
    cancel();
  }
  function hover(index: number | null): void {
    const m = menuRef.current;
    if (!m || m.hover === index) return;
    if (view.current) view.current.preview = null;
    setMenu({ ...m, hover: index, since: performance.now(), preview: false });
  }

  useEffect(() => controller.subscribe((next) => setState(next)), [controller]);
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount || typeof ResizeObserver === 'undefined') return;
    const read = () => setSurface(prev => prev.w === mount.clientWidth && prev.h === mount.clientHeight ? prev : { w: mount.clientWidth, h: mount.clientHeight });
    const observer = new ResizeObserver(read);
    observer.observe(mount); read();
    return () => observer.disconnect();
  }, []);
  function setSpeed(step: 1 | 2 | 3): void {
    for (let i = 0; i < 2 && controller.getState().ui.speed !== step; i++) controller.cycleSpeed();
  }
  useEffect(() => {
    if (state.feedback.tone !== 'warning') return;
    audio.play('ui-deny');
    setNotice(state.feedback.text);
    const timer = setTimeout(() => setNotice(''), 2600);
    return () => clearTimeout(timer);
  }, [state.feedback.sequence]);
  useEffect(() => { if (view.current) view.current.reducedMotion = reduced; }, [reduced]);
  useEffect(() => audio.setPreferences({ effectsEnabled: soundEffects, musicEnabled: ambience }), [soundEffects, ambience]);
  useEffect(() => {
    // Browsers only start audio inside a user gesture; the first tap or key press unlocks it.
    const unlock = () => audio.unlock();
    window.addEventListener('pointerdown', unlock, true);
    window.addEventListener('keydown', unlock, true);
    return () => {
      window.removeEventListener('pointerdown', unlock, true);
      window.removeEventListener('keydown', unlock, true);
      audio.dispose();
    };
  }, [audio]);
  useEffect(() => {
    if (settings) closeSettings.current?.focus();
  }, [settings]);
  useEffect(() => { if (over) { cancel(); resultButton.current?.focus(); } }, [over]);

  useEffect(() => {
    const mount = mountRef.current!;
    const arena = new NeonArena(mount, (delta, now) => {
      gesture.current?.update(now);
      const m = menuRef.current;
      if (m && m.hover !== null && !m.preview && now - m.since >= PREVIEW_MS) {
        const family = SPECIALISTS[m.hover]!;
        arena.preview = { cell: m.cell, family, range: NEON_MISSION.towerCatalog[family]!.weapon.rangeMilliCells / 1000 };
        setMenu({ ...m, preview: true });
      }
      controller.advanceFrame(delta);
      arena.interpolationAlpha = controller.interpolationAlpha;
    });
    view.current = arena;
    arena.reducedMotion = reduced;
    const unsubscribe = controller.subscribe((next) => {
      arena.update(next);
      audio.playAll(director.consume(next.recentEvents, next.render.tick, performance.now()));
      audio.setIntensity(next.ui.phase === 'wave' && !next.ui.paused ? 1 : 0.2);
    });
    gesture.current = new BuildGesture({
      tap: (cell) => { setMenu(null); controller.tapCell(cell); },
      hold: (cell, x, y) => openMenu(cell, x, y),
      pan: (dx, dy) => arena.pan(dx, dy),
      release: (x, y) => { const m = menuRef.current; choose(m ? radialSlot(x - m.x, y - m.y) : null); },
    });
    let disposed = false;
    void arena.initialize().then(() => arena.setVisible(document.visibilityState === 'visible')).catch((e: unknown) => {
      if (!disposed) setError(e instanceof Error ? e.message : 'The arena could not start.');
    });
    const resetPointers = () => {
      cancel(); points.current.clear(); pinching.current = false;
      pinchDistance.current = 0;
    };
    const suspend = () => {
      resetPointers();
      controller.setForeground(false); arena.setVisible(false); audio.setVisible(false);
    };
    const visibility = () => {
      if (document.visibilityState !== 'visible') suspend();
      else { controller.setForeground(true); arena.setVisible(true); audio.setVisible(true); }
    };
    const blur = () => { resetPointers(); controller.setForeground(false); };
    const focus = () => { if (document.visibilityState === 'visible') controller.setForeground(true); };
    const resize = () => resetPointers();
    document.addEventListener('visibilitychange', visibility);
    window.addEventListener('pagehide', suspend);
    window.addEventListener('pageshow', visibility);
    window.addEventListener('blur', blur);
    window.addEventListener('focus', focus);
    window.addEventListener('resize', resize);
    return () => {
      disposed = true; cancel(); unsubscribe(); arena.destroy(); view.current = null;
      document.removeEventListener('visibilitychange', visibility);
      window.removeEventListener('pagehide', suspend); window.removeEventListener('pageshow', visibility);
      window.removeEventListener('blur', blur); window.removeEventListener('focus', focus);
      window.removeEventListener('resize', resize);
    };
  }, [controller]);

  function local(e: PointerEvent): { x: number; y: number } {
    const bounds = mountRef.current!.getBoundingClientRect();
    return { x: e.clientX - bounds.left, y: e.clientY - bounds.top };
  }
  function down(e: PointerEvent): void {
    if (e.button !== 0 || over || settings) return;
    const p = local(e);
    points.current.set(e.pointerId, p);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    if (points.current.size > 1) {
      cancel(); pinching.current = true;
      const [a, b] = [...points.current.values()];
      pinchDistance.current = Math.hypot(a!.x - b!.x, a!.y - b!.y);
      return;
    }
    if (menuRef.current) { cancel(); return; }
    const current = controller.getState();
    const selectedTower = current.render.towers.find(candidate => candidate.id === current.selectedTowerId);
    if (selectedTower && selectedTower.familyId !== 'foundation' && view.current?.isAimHandleHit(p.x, p.y)) {
      const origin = view.current.cellPoint(selectedTower.cell);
      aimGesture.current = {
        pointerId: e.pointerId, start: p, origin,
        angle: selectedTower.facingMilliDegrees, active: false,
      };
      return;
    }
    const cell = view.current?.cellAt(p.x, p.y);
    if (cell !== null && cell !== undefined) {
      keyboardCell.current = cell;
      gesture.current?.down(cell, p.x, p.y, performance.now());
    }
  }
  function move(e: PointerEvent): void {
    const p = local(e);
    if (points.current.has(e.pointerId)) points.current.set(e.pointerId, p);
    if (pinching.current && points.current.size > 1) {
      const [a, b] = [...points.current.values()];
      const distance = Math.hypot(a!.x - b!.x, a!.y - b!.y);
      if (pinchDistance.current > 0) view.current?.zoomBy(distance / pinchDistance.current, { x: (a!.x + b!.x) / 2, y: (a!.y + b!.y) / 2 });
      pinchDistance.current = distance;
      return;
    }
    if (pinching.current) return;
    const aiming = aimGesture.current;
    if (aiming?.pointerId === e.pointerId) {
      if (!aiming.active && shouldBeginTowerAim(aiming.start, p)) aiming.active = true;
      if (aiming.active) {
        aiming.angle = pointerFacingMilliDegrees(aiming.origin, p);
        if (view.current) view.current.aimPreview = aiming.angle;
      }
      return;
    }
    gesture.current?.move(p.x, p.y);
    const m = menuRef.current;
    if (m) hover(radialSlot(p.x - m.x, p.y - m.y));
  }
  function up(e: PointerEvent): void {
    const p = local(e);
    points.current.delete(e.pointerId);
    const aiming = aimGesture.current;
    if (!pinching.current && aiming?.pointerId === e.pointerId) {
      if (aiming.active) controller.aimSelected(aiming.angle);
      clearAim();
    } else if (!pinching.current) {
      gesture.current?.up(p.x, p.y);
    }
    if (!points.current.size) pinching.current = false;
  }
  function key(e: KeyboardEvent): void {
    if (e.key === 'Escape') { cancel(); return; }
    if ((e.target as HTMLElement).closest('button,input,a')) return;
    const cell = keyboardCell.current;
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
      e.preventDefault();
      const d = e.key === 'ArrowLeft' ? -1 : e.key === 'ArrowRight' ? 1 : e.key === 'ArrowUp' ? -9 : 9;
      keyboardCell.current = Math.max(0, Math.min(125, cell + d));
      const family = controller.getState().render.towers.find(t => t.cell === keyboardCell.current)?.familyId ?? 'foundation';
      if (view.current) view.current.preview = { cell: keyboardCell.current, family, range: 0 };
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault(); controller.tapCell(cell);
    } else if (e.key === 'ContextMenu' || (e.key === 'F10' && e.shiftKey)) {
      e.preventDefault(); const p = view.current?.cellPoint(cell); if (p) openMenu(cell, p.x, p.y, true);
    }
  }
  const previewFamily = menu?.preview && menu.hover !== null ? SPECIALISTS[menu.hover] : null;
  const infoFamily = previewFamily ?? selected?.familyId;
  const infoWeapon = infoFamily ? NEON_MISSION.towerCatalog[infoFamily]?.weapon : null;
  const completed = state.ui.spawnedCreeps - state.ui.activeCreeps;
  const progress = completed / Math.max(1, state.ui.waveCreepCount);

  const menuAnchor = menu ? view.current?.cellPoint(menu.cell) : null;
  const waveOpen = state.ui.phase === 'opening' || state.ui.phase === 'planning';
  const status = state.ui.phase === 'opening' ? 'Ready' : state.ui.phase === 'planning' ? `Next ${Math.ceil(state.ui.planningTicksRemaining / 30)}s`
    : over ? 'Complete' : state.ui.paused ? 'Paused' : `${state.ui.activeCreeps} active`;
  if (state.render.towers.length === 0) openRouteLength.current = state.render.groundRoute.length;
  const maze = mazeStats(state.render.groundRoute, openRouteLength.current);
  const killRate = useMemo(() => kills.current.record(state.ui.tick, state.ui.defeatedCreeps), [state.ui.tick, state.ui.defeatedCreeps]);
  const board = fittedBoard(surface.w, surface.h);
  const bands = surface.w ? bandMode(board.y) : 'hidden';
  return <main class="neon-shell" onKeyDown={key} onPointerDownCapture={(e) => {
    if (e.pointerType === 'touch' && !e.isPrimary && menuRef.current) cancel();
  }}>
    <HudDefs />
    <header class="neon-hud" aria-label="Mission status">
      <div class={`hud-module life${state.ui.lives <= state.ui.startingLives / 4 ? ' is-critical' : ''}`} aria-label={`${state.ui.lives} lives`}>
        <PlateChrome corners={{ tl: 10, br: 10 }} tone="pink" tick tab />
        <Heart class="hud-icon" size={20} />
        <div class="hud-stat"><span class="hud-value"><strong>{state.ui.lives}</strong><em>/ {state.ui.startingLives}</em></span><span class="hud-label">Lives</span></div>
      </div>
      <div class="hud-module wave" aria-label={`Wave ${state.ui.waveNumber} of ${state.ui.waveCount}`}>
        <PlateChrome corners={{ tl: 10, br: 10 }} hatch />
        <Skull class="hud-icon" size={19} />
        <div class="hud-stat"><span class="hud-value"><strong>{String(state.ui.waveNumber).padStart(2, '0')}</strong><em>/ {String(state.ui.waveCount).padStart(2, '0')}</em></span>
          <span class="hud-label-row"><span class="hud-label">Wave</span><span class="wave-pips" aria-hidden="true">{Array.from({ length: state.ui.waveCount }, (_, index) =>
            <i class={index < state.ui.completedWaves ? 'is-done' : index === state.ui.waveNumber - 1 ? 'is-current' : ''} />)}</span></span></div>
      </div>
      <div class="hud-module credits" aria-label={`${state.ui.fieldCredits} credits`}>
        <PlateChrome corners={{ tl: 10, br: 10 }} tick tab />
        <Hexagon class="hud-icon" size={20} />
        <div class="hud-stat"><span class="hud-value"><strong>{state.ui.fieldCredits}</strong></span><span class="hud-label">Credits</span></div>
      </div>
      <div class="hud-module hud-controls">
        <PlateChrome corners={{ tl: 10, br: 10 }} />
        <div class="ctrl-row">
          <button class="ctrl-button" title={state.ui.paused ? 'Resume' : 'Pause'} aria-label={state.ui.paused ? 'Resume' : 'Pause'} disabled={state.ui.phase === 'opening' || over}
            onClick={() => { cancel(); controller.togglePause(); }}>{state.ui.paused ? <Play size={15} /> : <Pause size={15} />}</button>
          <i class="ctrl-divider" />
          <button ref={settingsButton} class="ctrl-button" title="Settings" aria-label="Settings" onClick={() => {
            cancel(); if (!controller.getState().ui.paused && state.ui.phase !== 'opening' && !over) controller.togglePause(); setSettings(true);
          }}><Settings2 size={15} /></button>
        </div>
        <div class="speed-seg" role="group" aria-label="Simulation speed">
          {([1, 2, 3] as const).map(step => <button class={step === state.ui.speed ? 'is-active' : ''} aria-pressed={step === state.ui.speed}
            aria-label={`Speed ${step}x`} disabled={over} onClick={() => setSpeed(step)}>{step}<small>x</small></button>)}
        </div>
      </div>
    </header>
    <section class="neon-arena-region" aria-label="Neon combat arena">
      <div class="neon-surface" ref={mountRef} tabIndex={0} role="application" aria-label="Arena. Arrow keys choose a cell, Enter builds Foundation, Shift F10 opens upgrades."
        onPointerDown={down} onPointerMove={move} onPointerUp={up}
        onPointerCancel={(e) => { points.current.delete(e.pointerId); cancel(); if (!points.current.size) pinching.current = false; }}
        onLostPointerCapture={(e) => { if (points.current.has(e.pointerId)) { points.current.delete(e.pointerId); cancel(); } }}
        onContextMenu={(e) => e.preventDefault()}
        onWheel={(e) => { e.preventDefault(); cancel(); view.current?.zoomBy(e.deltaY < 0 ? 1.1 : .91); }} />
      <div class="rail-wrap" aria-hidden="true"><RailFrame /></div>
      {bands !== 'hidden' && <div class={`hud-band top is-${bands}`} style={{ left: `${board.x}px`, width: `${board.width}px`, height: `${board.y}px` }} aria-hidden="true">
        <div class="band-widget maze">
          <PlateChrome corners={{ tl: 7, br: 7 }} inner={false} />
          {bands === 'full' && <MiniRoute route={state.render.groundRoute} spawn={state.render.spawnCell} exit={state.render.exitCell} />}
          <div class="bw-text"><span class="hud-label">Maze length</span>
            <span class="bw-value"><strong>{maze.length}</strong><em>cells</em>{maze.gain !== 0 && <b class={maze.gain > 0 ? 'is-up' : 'is-down'}>{maze.gain > 0 ? '+' : ''}{maze.gain}</b>}</span></div>
        </div>
        <span class="band-tag">Sector 01 <b>//</b> {state.briefing.title}</span>
      </div>}
      {bands !== 'hidden' && <div class={`hud-band bottom is-${bands}`} style={{ left: `${board.x}px`, width: `${board.width}px`, height: `${board.y}px` }} aria-hidden="true">
        <span class="band-tag">Defend the exit <b>///</b></span>
        <div class="band-widget kills">
          <PlateChrome corners={{ tl: 7, br: 7 }} inner={false} />
          <div class="bw-text"><span class="hud-label">Kills</span>
            <span class="bw-value"><strong>{state.ui.defeatedCreeps}</strong>{state.ui.leakedCreeps > 0 && <em class="is-leak">{state.ui.leakedCreeps} leaked</em>}</span></div>
          {bands === 'full' && <KillBars values={killRate} />}
        </div>
      </div>}
      {menu && menuAnchor && <svg class="radial-connector" aria-hidden="true">
        <line x1={menuAnchor.x} y1={menuAnchor.y} x2={menu.x} y2={menu.y} />
        <circle cx={menuAnchor.x} cy={menuAnchor.y} r="5" />
      </svg>}
      {menu && <div class="radial-layer" style={{ left: menu.x, top: menu.y }} aria-label="Foundation upgrades" role="group"
        onKeyDown={(e) => {
          if (['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp'].includes(e.key)) {
            e.preventDefault(); e.stopPropagation();
            const delta = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : -1;
            const index = (menuButtons.current.indexOf(document.activeElement as HTMLButtonElement) + delta + 3) % 3;
            menuButtons.current[index]?.focus();
          }
        }}>
        <div class="radial-orbit" />
        <button class="radial-cancel" title="Cancel upgrade" aria-label="Cancel upgrade" onClick={cancel}><X size={18} /></button>
        {SPECIALISTS.map((family, index) => {
          const cost = NEON_MISSION.towerCatalog[family]!.fieldCreditCost;
          const enabled = state.ui.canDevelopTower && state.ui.fieldCredits >= cost;
          const slot = SLOT_POINTS[index]!;
          const fromX = (menuAnchor?.x ?? menu.x) - menu.x - slot.x;
          const fromY = (menuAnchor?.y ?? menu.y) - menu.y - slot.y;
          return <button key={family} ref={(el) => { menuButtons.current[index] = el; }}
            class={`radial-option ${family}${menu.hover === index ? ' is-hovered' : ''}`}
            style={{ left: slot.x, top: slot.y, color: `#${TOWER_COLORS[family].toString(16).padStart(6, '0')}`,
              '--radial-from-x': `${fromX}px`, '--radial-from-y': `${fromY}px`, '--radial-delay': '0ms' }}
            aria-label={`Upgrade to ${family}, ${cost} credits`} aria-disabled={!enabled} title={enabled ? ROLES[family] : 'Not enough credits'}
            onPointerEnter={() => hover(index)} onFocus={() => hover(index)} onClick={() => choose(index)}>
            <TowerIcon family={family} /><span>{family}</span><small>{cost}</small>
          </button>;
        })}
      </div>}
      {notice && <div class="neon-notice" role="status">{notice}</div>}
      {error && <div class="neon-error" role="alert"><strong>Arena unavailable</strong><p>{error}</p></div>}
      {state.ui.paused && !settings && !over && <button class="pause-overlay" onClick={() => controller.togglePause()}><Play size={22} />Resume</button>}
    </section>
    <footer class={`neon-footer${infoFamily ? ' has-selection' : ''}`}>
      <div class="neon-progress" role="progressbar" aria-label="Wave progress" aria-valuenow={Math.round(progress * 100)} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${progress * 100}%` }} /></div>
      <button class="fit-tab" title="Fit arena" aria-label="Fit arena" onClick={() => { cancel(); view.current?.fit(); }}>
        <PlateChrome corners={{ tl: 8, bl: 8 }} accents={false} inner={false} /><Crosshair size={16} /></button>
      <div class="console-panel context-line">
        <PlateChrome corners={{ tl: 12, br: 12 }} hatch progress={state.ui.phase === 'wave' ? progress : undefined} />
        {infoFamily && infoWeapon ? <>
          <div class="console-head">
            <TowerIcon family={infoFamily} />
            <div class="tower-readout" title={ROLES[infoFamily]}><strong>{infoFamily}{previewFamily && <small>Preview</small>}</strong></div>
            {!menu && selected && <div class="selection-tools">
              {selected.familyId === 'foundation' && <button class="icon-control" title="Upgrade Foundation" aria-label="Upgrade Foundation" onClick={() => {
                const p = view.current?.cellPoint(selected.cell); if (p) openMenu(selected.cell, p.x, p.y, true);
              }}><Ellipsis size={18} /></button>}
              <button class="icon-control" title="Dismantle tower" aria-label="Dismantle tower" disabled={!state.ui.canDismantle} onClick={() => controller.dismantleSelected()}><Trash2 size={15} /></button>
              <button class="icon-control" title="Clear selection" aria-label="Clear selection" onClick={() => { cancel(); controller.clearSelection(); }}><X size={16} /></button>
            </div>}
          </div>
          <div class="console-columns tower-stats">
            <span><b>{infoWeapon.damage}</b><small>Damage</small></span>
            <span><b>{infoWeapon.rangeMilliCells / 1000}</b><small>Range</small></span>
            <span><b>{(30 / infoWeapon.cooldownTicks).toFixed(1)}<i>/s</i></b><small>Rate</small></span>
          </div>
        </> : <>
          <div class="console-head wave-readout" title={state.briefing.title}>
            <span class="hud-label">{waveOpen ? 'Next wave' : 'Wave'} <b>{String(state.ui.waveNumber).padStart(2, '0')}</b></span>
            <strong class="console-status">{status}</strong>
          </div>
          <div class="console-columns threat-icons" aria-label="Wave threats">{state.briefing.families.map(({ definition, count }) =>
            <span title={`${count} ${definition.displayName}`}><CreepGlyph kind={definition.id} /><b>×{count}</b><small>{definition.displayName}</small></span>)}</div>
        </>}
      </div>
      {waveOpen ? <button class="launch-control" disabled={state.ui.paused}
        aria-label={state.ui.phase === 'opening' ? 'Launch wave' : 'Launch early'} title={state.ui.phase === 'opening' ? 'Launch wave' : 'Launch early'}
        onClick={() => { cancel(); controller.startWave(); }}>
        <PlateChrome corners={{ tl: 12, tr: 12, br: 12, bl: 12 }} tone="gold" hatch />
        <LaunchChevrons /><span>Launch<em> wave</em></span>
        {state.ui.phase === 'planning' && state.ui.earlyLaunchCredits > 0 && <small>Early +{state.ui.earlyLaunchCredits}</small>}
      </button> : <div class="inbound-block">
        <PlateChrome corners={{ tl: 12, tr: 12, br: 12, bl: 12 }} tone={state.ui.paused ? 'dim' : 'pink'} />
        <span class="hud-label">{over ? 'Result' : state.ui.paused ? 'Paused' : 'Inbound'}</span>
        <strong>{state.ui.activeCreeps + Math.max(0, state.ui.waveCreepCount - state.ui.spawnedCreeps)}</strong>
        <small>Hostiles</small>
      </div>}
    </footer>
    <span class="sr-only" aria-live="polite">{state.feedback.text}</span>
    {settings && <div class="neon-modal-backdrop" onClick={() => { setSettings(false); settingsButton.current?.focus(); }}>
      <section class="neon-modal" role="dialog" aria-modal="true" aria-label="Settings" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => {
        if (e.key === 'Escape') { setSettings(false); settingsButton.current?.focus(); }
        if (e.key === 'Tab') {
          const all = [...e.currentTarget.querySelectorAll<HTMLElement>('button,input,a')];
          if (e.shiftKey && document.activeElement === all[0]) { e.preventDefault(); all.at(-1)?.focus(); }
          else if (!e.shiftKey && document.activeElement === all.at(-1)) { e.preventDefault(); all[0]?.focus(); }
        }
      }}>
        <header><h2>Settings</h2><button ref={closeSettings} class="icon-control" aria-label="Close settings" onClick={() => { setSettings(false); settingsButton.current?.focus(); }}><X size={19} /></button></header>
        <label class="setting-toggle">Sound effects<input type="checkbox" checked={soundEffects} onChange={(e) => setSoundEffects(e.currentTarget.checked)} /></label>
        <label class="setting-toggle">Space ambience<input type="checkbox" checked={ambience} onChange={(e) => setAmbience(e.currentTarget.checked)} /></label>
        <label class="setting-toggle">Reduced motion<input type="checkbox" checked={reduced} onChange={(e) => setReduced(e.currentTarget.checked)} /></label>
        <div class="setting-toggle"><span>Camera</span><div class="camera-tools">
          <button title="Zoom out" aria-label="Zoom out" onClick={() => view.current?.zoomBy(.8)}><Minus size={18} /></button>
          <button title="Zoom in" aria-label="Zoom in" onClick={() => view.current?.zoomBy(1.25)}><Plus size={18} /></button>
        </div></div>
        <button class="setting-action" onClick={() => { cancel(); controller.retry(false); view.current?.fit(); setSettings(false); }}><RotateCcw size={18} />Reset encounter</button>
        <a class="setting-action" href="./index.html"><ArrowUpRight size={18} />Original benchmark</a>
      </section>
    </div>}
    {over && <div class="neon-modal-backdrop"><section class="neon-modal result-modal" role="dialog" aria-modal="true" aria-label="Mission result">
      <span class="result-symbol">{state.ui.phase === 'victory' ? <Crosshair size={34} /> : <Heart size={34} />}</span>
      <h2>{state.ui.phase === 'victory' ? 'Sector secured' : 'Signal lost'}</h2>
      <p>Wave {state.ui.waveNumber} / {state.ui.waveCount}</p>
      <div class="result-numbers"><span><strong>{state.ui.defeatedCreeps}</strong>Defeated</span><span><strong>{state.ui.lives}</strong>Lives</span></div>
      <button ref={resultButton} class="launch-control" onClick={() => { cancel(); controller.retry(); view.current?.fit(); }}><RotateCcw size={18} />Retry opening</button>
    </section></div>}
  </main>;
}
