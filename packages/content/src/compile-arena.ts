import {
  ARENA_SCHEMA_VERSION,
  type ArenaSource,
  type ArenaTerrainRegionSource,
  type CompiledArena,
  type CompiledTerrainCell,
  type GridPoint,
  type MovementLayer,
} from './model.js';

export interface ContentIssue {
  readonly path: string;
  readonly message: string;
}

export class ContentValidationError extends Error {
  readonly issues: readonly ContentIssue[];

  constructor(issues: readonly ContentIssue[]) {
    super(issues.map(({ path, message }) => `${path}: ${message}`).join('\n'));
    this.name = 'ContentValidationError';
    this.issues = Object.freeze([...issues]);
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const freezePoint = ({ x, y }: GridPoint): GridPoint => Object.freeze({ x, y });

const freezeTraversal = (
  traversal: Readonly<Record<MovementLayer, boolean>>,
): Readonly<Record<MovementLayer, boolean>> =>
  Object.freeze({ ground: traversal.ground, air: traversal.air });

export const cellIndex = (point: GridPoint, width: number): number => point.y * width + point.x;

export const cellPoint = (cell: number, width: number): GridPoint =>
  Object.freeze({ x: cell % width, y: Math.floor(cell / width) });

const fnv1a = (value: string): string => {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
};

export const compileArena = (value: unknown): CompiledArena => {
  const issues: ContentIssue[] = [];
  const source = isRecord(value) ? value : {};

  if (!isRecord(value)) issues.push({ path: '$', message: 'must be an object' });

  if (source.schemaVersion !== ARENA_SCHEMA_VERSION) {
    issues.push({ path: 'schemaVersion', message: `must equal ${ARENA_SCHEMA_VERSION}` });
  }

  const id = typeof source.id === 'string' ? source.id : '';
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)) {
    issues.push({ path: 'id', message: 'must be a stable kebab-case identifier' });
  }

  const name = typeof source.name === 'string' ? source.name.trim() : '';
  if (name.length === 0) issues.push({ path: 'name', message: 'must not be blank' });

  const readDimension = (key: 'width' | 'height'): number => {
    const dimension = source[key];
    if (!Number.isInteger(dimension) || (dimension as number) < 2 || (dimension as number) > 64) {
      issues.push({ path: key, message: 'must be an integer from 2 through 64' });
      return 0;
    }
    return dimension as number;
  };

  const width = readDimension('width');
  const height = readDimension('height');

  const readPoint = (pointValue: unknown, path: string): GridPoint => {
    if (!isRecord(pointValue)) {
      issues.push({ path, message: 'must be a grid point' });
      return { x: 0, y: 0 };
    }

    const x = pointValue.x;
    const y = pointValue.y;
    if (!Number.isInteger(x) || !Number.isInteger(y)) {
      issues.push({ path, message: 'x and y must be integers' });
      return { x: 0, y: 0 };
    }

    const point = { x: x as number, y: y as number };
    if (
      width > 0 &&
      height > 0 &&
      (point.x < 0 || point.x >= width || point.y < 0 || point.y >= height)
    ) {
      issues.push({ path, message: `must be inside the ${width}x${height} Arena` });
    }
    return point;
  };

  const readPointArray = (arrayValue: unknown, path: string): GridPoint[] => {
    if (!Array.isArray(arrayValue)) {
      issues.push({ path, message: 'must be an array' });
      return [];
    }
    return arrayValue.map((point, index) => readPoint(point, `${path}[${index}]`));
  };

  const readBoolean = (booleanValue: unknown, path: string): boolean => {
    if (typeof booleanValue !== 'boolean') {
      issues.push({ path, message: 'must be a boolean' });
      return false;
    }
    return booleanValue;
  };

  const readTraversal = (
    traversalValue: unknown,
    path: string,
  ): Readonly<Record<MovementLayer, boolean>> => {
    if (!isRecord(traversalValue)) {
      issues.push({ path, message: 'must define ground and air booleans' });
      return { ground: false, air: false };
    }
    return {
      ground: readBoolean(traversalValue.ground, `${path}.ground`),
      air: readBoolean(traversalValue.air, `${path}.air`),
    };
  };

  const spawn = readPoint(source.spawn, 'spawn');
  const exit = readPoint(source.exit, 'exit');
  const waypoints = readPointArray(source.waypoints, 'waypoints');
  const inactive = readPointArray(source.inactive, 'inactive');
  const terrain: ArenaTerrainRegionSource[] = [];

  if (!Array.isArray(source.terrain)) {
    issues.push({ path: 'terrain', message: 'must be an array' });
  } else {
    source.terrain.forEach((regionValue, regionIndex) => {
      const path = `terrain[${regionIndex}]`;
      if (!isRecord(regionValue)) {
        issues.push({ path, message: 'must be a terrain region' });
        return;
      }
      const terrainId = typeof regionValue.id === 'string' ? regionValue.id : '';
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(terrainId)) {
        issues.push({ path: `${path}.id`, message: 'must be a stable kebab-case identifier' });
      }
      const cells = readPointArray(regionValue.cells, `${path}.cells`);
      if (cells.length === 0) {
        issues.push({ path: `${path}.cells`, message: 'must contain at least one cell' });
      }
      const buildable = readBoolean(regionValue.buildable, `${path}.buildable`);
      const traversable = readTraversal(regionValue.traversable, `${path}.traversable`);
      if (buildable && (!traversable.ground || !traversable.air)) {
        issues.push({
          path: `${path}.buildable`,
          message: 'requires both traversal layers to be traversable',
        });
      }
      terrain.push({ id: terrainId, cells, buildable, traversable });
    });
  }

  if (waypoints.length > 4) {
    issues.push({ path: 'waypoints', message: 'supports at most four ordered Waypoints' });
  }

  if (width > 0 && height > 0) {
    const occupied = new Map<number, string>();
    const reserve = (point: GridPoint, path: string): void => {
      const cell = cellIndex(point, width);
      const previousPath = occupied.get(cell);
      if (previousPath !== undefined) {
        issues.push({ path, message: `overlaps ${previousPath}` });
      } else {
        occupied.set(cell, path);
      }
    };

    reserve(spawn, 'spawn');
    reserve(exit, 'exit');
    waypoints.forEach((point, index) => reserve(point, `waypoints[${index}]`));
    inactive.forEach((point, index) => reserve(point, `inactive[${index}]`));
    terrain.forEach((region, regionIndex) =>
      region.cells.forEach((point, cellIndexInRegion) =>
        reserve(point, `terrain[${regionIndex}].cells[${cellIndexInRegion}]`),
      ),
    );

    const terrainIds = new Map<string, string>();
    terrain.forEach((region, index) => {
      const previousPath = terrainIds.get(region.id);
      if (previousPath !== undefined) {
        issues.push({ path: `terrain[${index}].id`, message: `duplicates ${previousPath}` });
      } else {
        terrainIds.set(region.id, `terrain[${index}].id`);
      }
    });
  }

  if (issues.length > 0) throw new ContentValidationError(issues);

  const frozenSpawn = freezePoint(spawn);
  const frozenExit = freezePoint(exit);
  const frozenWaypoints = Object.freeze(waypoints.map(freezePoint));
  const frozenInactive = Object.freeze(
    [...inactive]
      .sort((left, right) => cellIndex(left, width) - cellIndex(right, width))
      .map(freezePoint),
  );
  const frozenTerrain = Object.freeze(
    [...terrain]
      .sort((left, right) => left.id.localeCompare(right.id))
      .map((region) =>
        Object.freeze({
          id: region.id,
          cells: Object.freeze(
            [...region.cells]
              .sort((left, right) => cellIndex(left, width) - cellIndex(right, width))
              .map(freezePoint),
          ),
          buildable: region.buildable,
          traversable: freezeTraversal(region.traversable),
        }),
      ),
  );
  const waypointCells = Object.freeze(frozenWaypoints.map((point) => cellIndex(point, width)));
  const inactiveCells = Object.freeze(frozenInactive.map((point) => cellIndex(point, width)));
  const terrainCells: readonly CompiledTerrainCell[] = Object.freeze(
    frozenTerrain
      .flatMap((region) =>
        region.cells.map((point) =>
          Object.freeze({
            cell: cellIndex(point, width),
            terrainId: region.id,
            buildable: region.buildable,
            traversable: region.traversable,
          }),
        ),
      )
      .sort((left, right) => left.cell - right.cell),
  );
  const cellsMatching = (predicate: (terrainCell: CompiledTerrainCell) => boolean) =>
    Object.freeze(terrainCells.filter(predicate).map(({ cell }) => cell));

  const canonical: ArenaSource = Object.freeze({
    schemaVersion: ARENA_SCHEMA_VERSION,
    id,
    name,
    width,
    height,
    spawn: frozenSpawn,
    exit: frozenExit,
    waypoints: frozenWaypoints,
    inactive: frozenInactive,
    terrain: frozenTerrain,
  });

  return Object.freeze({
    ...canonical,
    schemaVersion: ARENA_SCHEMA_VERSION,
    spawnCell: cellIndex(frozenSpawn, width),
    exitCell: cellIndex(frozenExit, width),
    waypointCells,
    inactiveCells,
    terrainCells,
    unbuildableCells: cellsMatching(({ buildable }) => !buildable),
    groundBlockedTerrainCells: cellsMatching(({ traversable }) => !traversable.ground),
    airBlockedTerrainCells: cellsMatching(({ traversable }) => !traversable.air),
    contentHash: fnv1a(JSON.stringify(canonical)),
  });
};
