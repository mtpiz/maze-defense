export const HOLD_MS = 220;
export const PREVIEW_MS = 350;
export const SLOT_POINTS = [
  { x: 0, y: -78 }, { x: 68, y: 39 }, { x: -68, y: 39 },
] as const;

export const radialCenter = (x: number, y: number, width: number, height: number) => ({
  x: Math.max(116, Math.min(width - 116, x)),
  y: Math.max(116, Math.min(height - 116, y)),
});

export const radialSlot = (x: number, y: number): number | null => {
  const index = SLOT_POINTS.findIndex((p) => Math.hypot(x - p.x, y - p.y) <= 34);
  return index < 0 ? null : index;
};

interface GestureActions {
  tap(cell: number): void;
  hold(cell: number, x: number, y: number): void;
  pan(dx: number, dy: number): void;
  release(x: number, y: number): void;
}

export class BuildGesture {
  #press: { cell: number; x: number; y: number; start: number; lastX: number; lastY: number } | null = null;
  #mode: 'press' | 'pan' | 'radial' = 'press';
  constructor(private readonly actions: GestureActions) {}
  down(cell: number, x: number, y: number, now: number): void {
    this.#press = { cell, x, y, start: now, lastX: x, lastY: y };
    this.#mode = 'press';
  }
  move(x: number, y: number): void {
    const p = this.#press;
    if (!p) return;
    if (this.#mode === 'press' && Math.hypot(x - p.x, y - p.y) > 10) this.#mode = 'pan';
    if (this.#mode === 'pan') this.actions.pan(x - p.lastX, y - p.lastY);
    p.lastX = x;
    p.lastY = y;
  }
  update(now: number): void {
    const p = this.#press;
    if (p && this.#mode === 'press' && now - p.start >= HOLD_MS) {
      this.#mode = 'radial';
      this.actions.hold(p.cell, p.x, p.y);
    }
  }
  up(x: number, y: number): void {
    const p = this.#press;
    if (!p) return;
    this.#press = null;
    if (this.#mode === 'press') this.actions.tap(p.cell);
    else if (this.#mode === 'radial') this.actions.release(x, y);
  }
  cancel(): void { this.#press = null; }
}
