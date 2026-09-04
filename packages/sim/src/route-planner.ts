import {
  type CompiledArena,
  type MovementLayer,
  type TowerFamilyId,
} from '@tower-defense/content';

export interface PlacedTower {
  readonly cell: number;
  readonly familyId: TowerFamilyId;
}

export interface RouteSegment {
  readonly from: number;
  readonly to: number;
  readonly cells: readonly number[];
}

export interface RoutePlan {
  readonly layer: MovementLayer;
  readonly cells: readonly number[];
  readonly segments: readonly RouteSegment[];
}

export interface LayerRoutes {
  readonly ground: RoutePlan;
  readonly air: RoutePlan;
}

const planRouteThroughAnchors = (
  arena: CompiledArena,
  layer: MovementLayer,
  towers: readonly PlacedTower[],
  anchors: readonly number[],
): RoutePlan | null => {
  const blocked = blockedCellsFor(arena, layer, towers);
  const segments: RouteSegment[] = [];
  const cells: number[] = [];

  for (let index = 0; index < anchors.length - 1; index += 1) {
    const from = anchors[index];
    const to = anchors[index + 1];
    if (from === undefined || to === undefined) return null;

    const segmentCells = shortestSegment(arena, from, to, blocked);
    if (segmentCells === null) return null;

    const segment = Object.freeze({ from, to, cells: segmentCells });
    segments.push(segment);
    cells.push(...(index === 0 ? segmentCells : segmentCells.slice(1)));
  }

  return Object.freeze({
    layer,
    cells: Object.freeze(cells),
    segments: Object.freeze(segments),
  });
};

export type PlacementRejectionReason =
  | 'outside-arena'
  | 'inactive-cell'
  | 'reserved-cell'
  | 'unbuildable-terrain'
  | 'occupied-cell'
  | 'blocks-ground-route';

export type PlacementDecision =
  | {
      readonly accepted: true;
      readonly towers: readonly PlacedTower[];
      readonly routes: LayerRoutes;
    }
  | {
      readonly accepted: false;
      readonly reason: PlacementRejectionReason;
    };

const neighborCells = (cell: number, width: number, height: number): readonly number[] => {
  const x = cell % width;
  const y = Math.floor(cell / width);
  const neighbors: number[] = [];

  // Stable order is part of deterministic simulation behavior.
  if (x + 1 < width) neighbors.push(cell + 1);
  if (y + 1 < height) neighbors.push(cell + width);
  if (x > 0) neighbors.push(cell - 1);
  if (y > 0) neighbors.push(cell - width);

  return neighbors;
};

const shortestSegment = (
  arena: CompiledArena,
  from: number,
  to: number,
  blocked: ReadonlySet<number>,
): readonly number[] | null => {
  const cellCount = arena.width * arena.height;
  const visited = new Uint8Array(cellCount);
  const previous = new Int32Array(cellCount);
  const queue = new Int32Array(cellCount);
  previous.fill(-1);

  let head = 0;
  let tail = 0;
  queue[tail] = from;
  tail += 1;
  visited[from] = 1;

  while (head < tail && visited[to] === 0) {
    const current = queue[head];
    head += 1;
    if (current === undefined) break;

    for (const neighbor of neighborCells(current, arena.width, arena.height)) {
      if (visited[neighbor] === 1 || (blocked.has(neighbor) && neighbor !== to)) continue;
      visited[neighbor] = 1;
      previous[neighbor] = current;
      queue[tail] = neighbor;
      tail += 1;
      if (neighbor === to) break;
    }
  }

  if (visited[to] === 0) return null;

  const reversed: number[] = [to];
  let cursor = to;
  while (cursor !== from) {
    cursor = previous[cursor] ?? -1;
    if (cursor < 0) return null;
    reversed.push(cursor);
  }

  return Object.freeze(reversed.reverse());
};

const blockedCellsFor = (
  arena: CompiledArena,
  layer: MovementLayer,
  towers: readonly PlacedTower[],
): ReadonlySet<number> => {
  const blocked = new Set(arena.inactiveCells);
  const terrainBlockers =
    layer === 'ground'
      ? arena.groundBlockedTerrainCells
      : arena.airBlockedTerrainCells;
  for (const cell of terrainBlockers) blocked.add(cell);
  if (layer === 'ground') {
    for (const tower of towers) blocked.add(tower.cell);
  }
  return blocked;
};

export const planRoute = (
  arena: CompiledArena,
  layer: MovementLayer,
  towers: readonly PlacedTower[],
): RoutePlan | null => {
  const anchors = [arena.spawnCell, ...arena.waypointCells, arena.exitCell];
  return planRouteThroughAnchors(arena, layer, towers, anchors);
};

export const planRouteFromCell = (
  arena: CompiledArena,
  layer: MovementLayer,
  towers: readonly PlacedTower[],
  fromCell: number,
  nextWaypointIndex: number,
): RoutePlan | null => {
  const cellCount = arena.width * arena.height;
  if (
    !Number.isInteger(fromCell) ||
    fromCell < 0 ||
    fromCell >= cellCount ||
    arena.inactiveCells.includes(fromCell) ||
    !Number.isInteger(nextWaypointIndex) ||
    nextWaypointIndex < 0 ||
    nextWaypointIndex > arena.waypointCells.length
  ) {
    return null;
  }
  const anchors = [
    fromCell,
    ...arena.waypointCells.slice(nextWaypointIndex),
    arena.exitCell,
  ];
  return planRouteThroughAnchors(arena, layer, towers, anchors);
};

export const planLayerRoutes = (
  arena: CompiledArena,
  towers: readonly PlacedTower[],
): LayerRoutes | null => {
  const ground = planRoute(arena, 'ground', towers);
  if (ground === null) return null;
  const air = planRoute(arena, 'air', towers);
  if (air === null) return null;
  return Object.freeze({ ground, air });
};

const isReservedCell = (arena: CompiledArena, cell: number): boolean =>
  cell === arena.spawnCell || cell === arena.exitCell || arena.waypointCells.includes(cell);

export const inspectPlacement = (
  arena: CompiledArena,
  towers: readonly PlacedTower[],
  candidate: PlacedTower,
): PlacementDecision => {
  const cellCount = arena.width * arena.height;
  if (!Number.isInteger(candidate.cell) || candidate.cell < 0 || candidate.cell >= cellCount) {
    return Object.freeze({ accepted: false, reason: 'outside-arena' });
  }
  if (arena.inactiveCells.includes(candidate.cell)) {
    return Object.freeze({ accepted: false, reason: 'inactive-cell' });
  }
  if (isReservedCell(arena, candidate.cell)) {
    return Object.freeze({ accepted: false, reason: 'reserved-cell' });
  }
  if (arena.unbuildableCells.includes(candidate.cell)) {
    return Object.freeze({ accepted: false, reason: 'unbuildable-terrain' });
  }
  if (towers.some(({ cell }) => cell === candidate.cell)) {
    return Object.freeze({ accepted: false, reason: 'occupied-cell' });
  }

  const nextTowers = Object.freeze([...towers, Object.freeze({ ...candidate })]);
  const ground = planRoute(arena, 'ground', nextTowers);
  if (ground === null) {
    return Object.freeze({ accepted: false, reason: 'blocks-ground-route' });
  }
  // Player towers never affect Airborne traversal. A missing route here is an
  // invalid Arena contract, not a consequence of this placement.
  const air = planRoute(arena, 'air', []);
  if (air === null) {
    throw new Error('Arena has no valid Airborne Route before placement');
  }

  return Object.freeze({
    accepted: true,
    towers: nextTowers,
    routes: Object.freeze({ ground, air }),
  });
};
