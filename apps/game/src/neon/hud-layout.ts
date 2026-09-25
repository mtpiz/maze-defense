export const BOARD_COLUMNS = 9;
export const BOARD_ROWS = 14;
const BOARD_GUTTER = 8;

export interface BoardRect { tile: number; x: number; y: number; width: number; height: number }

/** Fitted (zoom 1) board rectangle inside an arena surface. Shared by the renderer and HUD overlays. */
export function fittedBoard(width: number, height: number): BoardRect {
  const tile = Math.max(0, Math.min((width - BOARD_GUTTER) / BOARD_COLUMNS, (height - BOARD_GUTTER) / BOARD_ROWS));
  const boardWidth = tile * BOARD_COLUMNS, boardHeight = tile * BOARD_ROWS;
  return { tile, x: (width - boardWidth) / 2, y: (height - boardHeight) / 2, width: boardWidth, height: boardHeight };
}

export type BandMode = 'full' | 'compact' | 'hidden';
/** How much HUD fits in the empty band above or below the fitted board. */
export function bandMode(band: number): BandMode {
  return band >= 54 ? 'full' : band >= 22 ? 'compact' : 'hidden';
}

export const KILL_BUCKET_TICKS = 60;
export const KILL_BUCKETS = 12;

/** Rolling kills-per-bucket history built from the cumulative defeated counter. */
export class KillHistory {
  #buckets: number[] = [];
  #bucket = -1;
  #lastDefeated = 0;
  #lastTick = -1;

  record(tick: number, defeated: number): readonly number[] {
    if (tick < this.#lastTick || defeated < this.#lastDefeated) this.reset();
    const bucket = Math.floor(tick / KILL_BUCKET_TICKS);
    if (this.#bucket < 0) this.#bucket = bucket;
    while (this.#bucket < bucket) { this.#buckets.push(0); this.#bucket++; }
    if (!this.#buckets.length) this.#buckets.push(0);
    this.#buckets[this.#buckets.length - 1]! += defeated - this.#lastDefeated;
    this.#buckets = this.#buckets.slice(-KILL_BUCKETS);
    this.#lastDefeated = defeated;
    this.#lastTick = tick;
    return this.values();
  }
  values(): readonly number[] {
    return [...Array(Math.max(0, KILL_BUCKETS - this.#buckets.length)).fill(0), ...this.#buckets];
  }
  reset(): void { this.#buckets = []; this.#bucket = -1; this.#lastDefeated = 0; this.#lastTick = -1; }
}

/** Maze length in route cells, plus growth against the open (tower-free) route. */
export function mazeStats(route: readonly number[], openLength: number): { length: number; gain: number } {
  const length = route.length;
  return { length, gain: openLength > 0 ? length - openLength : 0 };
}
