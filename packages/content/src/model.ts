export const ARENA_SCHEMA_VERSION = 2 as const;

export type MovementLayer = 'ground' | 'air';

export interface GridPoint {
  readonly x: number;
  readonly y: number;
}

export interface ArenaTerrainRegionSource {
  readonly id: string;
  readonly cells: readonly GridPoint[];
  readonly buildable: boolean;
  readonly traversable: Readonly<Record<MovementLayer, boolean>>;
}

export interface ArenaSource {
  readonly schemaVersion: number;
  readonly id: string;
  readonly name: string;
  readonly width: number;
  readonly height: number;
  readonly spawn: GridPoint;
  readonly exit: GridPoint;
  readonly waypoints: readonly GridPoint[];
  readonly inactive: readonly GridPoint[];
  readonly terrain: readonly ArenaTerrainRegionSource[];
}

export interface CompiledTerrainCell {
  readonly cell: number;
  readonly terrainId: string;
  readonly buildable: boolean;
  readonly traversable: Readonly<Record<MovementLayer, boolean>>;
}

export interface CompiledArena extends ArenaSource {
  readonly schemaVersion: typeof ARENA_SCHEMA_VERSION;
  readonly spawnCell: number;
  readonly exitCell: number;
  readonly waypointCells: readonly number[];
  readonly inactiveCells: readonly number[];
  readonly terrainCells: readonly CompiledTerrainCell[];
  readonly unbuildableCells: readonly number[];
  readonly groundBlockedTerrainCells: readonly number[];
  readonly airBlockedTerrainCells: readonly number[];
  readonly contentHash: string;
}

export type TowerFamilyId = 'foundation' | 'rail' | 'arc' | 'siege' | 'gravity';

export interface TowerFamilyDefinition {
  readonly id: TowerFamilyId;
  readonly displayName: string;
  readonly targets: Readonly<Record<MovementLayer, boolean>>;
  readonly mechanicId: string;
}

export interface WeaponDefinitionBase {
  readonly damage: number;
  readonly armorPiercing: number;
  readonly rangeMilliCells: number;
  readonly minimumRangeMilliCells?: number;
  readonly coverageArcMilliDegrees?: number;
  readonly cooldownTicks: number;
  readonly targets: Readonly<Record<MovementLayer, boolean>>;
  readonly targeting: 'first';
}

export interface DirectWeaponDefinition extends WeaponDefinitionBase {
  readonly mechanicId: 'direct';
}

export interface RailWeaponDefinition extends WeaponDefinitionBase {
  readonly mechanicId: 'rail-line';
  readonly beamHalfWidthMilliCells: number;
  readonly maxTargets: number;
}

export interface ArcChainWeaponDefinition extends WeaponDefinitionBase {
  readonly mechanicId: 'arc-chain';
  readonly jumpRangeMilliCells: number;
  readonly maxTargets: number;
}

export interface SiegeWeaponDefinition extends WeaponDefinitionBase {
  readonly mechanicId: 'siege-blast';
  readonly impactDelayTicks: number;
  readonly blastRadiusMilliCells: number;
}

export type WeaponDefinition =
  | DirectWeaponDefinition
  | RailWeaponDefinition
  | ArcChainWeaponDefinition
  | SiegeWeaponDefinition;

export interface TowerCombatDefinition {
  readonly familyId: TowerFamilyId;
  readonly fieldCreditCost: number;
  readonly constructionDelayTicks: number;
  readonly weapon: WeaponDefinition;
}

export const TOWER_FAMILIES: Readonly<Record<TowerFamilyId, TowerFamilyDefinition>> =
  Object.freeze({
    foundation: Object.freeze({
      id: 'foundation',
      displayName: 'Foundation',
      targets: Object.freeze({ ground: true, air: false }),
      mechanicId: 'foundation-pulse',
    }),
    rail: Object.freeze({
      id: 'rail',
      displayName: 'Rail',
      targets: Object.freeze({ ground: true, air: true }),
      mechanicId: 'rail-penetration',
    }),
    arc: Object.freeze({
      id: 'arc',
      displayName: 'Arc',
      targets: Object.freeze({ ground: true, air: true }),
      mechanicId: 'arc-chain',
    }),
    siege: Object.freeze({
      id: 'siege',
      displayName: 'Siege',
      targets: Object.freeze({ ground: true, air: false }),
      mechanicId: 'siege-secondary-impact',
    }),
    gravity: Object.freeze({
      id: 'gravity',
      displayName: 'Gravity',
      targets: Object.freeze({ ground: true, air: true }),
      mechanicId: 'gravity-collapse',
    }),
  });

export const BENCHMARK_TOWERS: Readonly<
  Partial<Record<TowerFamilyId, TowerCombatDefinition>>
> = Object.freeze({
  foundation: Object.freeze({
    familyId: 'foundation',
    fieldCreditCost: 10,
    constructionDelayTicks: 15,
    weapon: Object.freeze({
      mechanicId: 'direct',
      damage: 4,
      armorPiercing: 0,
      rangeMilliCells: 1_300,
      minimumRangeMilliCells: 0,
      coverageArcMilliDegrees: 360_000,
      cooldownTicks: 30,
      targets: Object.freeze({ ground: true, air: false }),
      targeting: 'first',
    }),
  }),
  rail: Object.freeze({
    familyId: 'rail',
    fieldCreditCost: 35,
    constructionDelayTicks: 30,
    weapon: Object.freeze({
      mechanicId: 'rail-line',
      damage: 26,
      armorPiercing: 3,
      rangeMilliCells: 5_500,
      cooldownTicks: 75,
      targets: Object.freeze({ ground: true, air: true }),
      targeting: 'first',
      beamHalfWidthMilliCells: 350,
      maxTargets: 3,
    }),
  }),
  siege: Object.freeze({
    familyId: 'siege',
    fieldCreditCost: 50,
    constructionDelayTicks: 45,
    weapon: Object.freeze({
      mechanicId: 'siege-blast',
      damage: 18,
      armorPiercing: 1,
      rangeMilliCells: 4_500,
      cooldownTicks: 90,
      targets: Object.freeze({ ground: true, air: false }),
      targeting: 'first',
      impactDelayTicks: 30,
      blastRadiusMilliCells: 900,
    }),
  }),
});

export type BenchmarkCreepId = 'drone' | 'carapace' | 'glider' | 'broodling';

export interface CreepMovementProfile {
  readonly radiusMilliCells: number;
  readonly pushResistance: number;
  readonly pattern: 'swarm' | 'runner' | 'heavy';
}

export interface CreepDefinition {
  readonly id: BenchmarkCreepId;
  readonly displayName: string;
  readonly layer: MovementLayer;
  readonly mass: number;
  readonly movement?: CreepMovementProfile;
  readonly mechanicId: string;
  readonly maxHealth: number;
  readonly armor: number;
  readonly speedMilliCellsPerSecond: number;
  readonly lifeDamage: number;
  readonly fieldCreditBounty: number;
}

export const BENCHMARK_CREEPS: Readonly<Record<BenchmarkCreepId, CreepDefinition>> =
  Object.freeze({
    drone: Object.freeze({
      id: 'drone',
      displayName: 'Drone',
      layer: 'ground',
      mass: 1,
      mechanicId: 'baseline-runner',
      movement: Object.freeze({ radiusMilliCells: 115, pushResistance: 3, pattern: 'runner' }),
      maxHealth: 24,
      armor: 0,
      speedMilliCellsPerSecond: 1_700,
      lifeDamage: 1,
      fieldCreditBounty: 1,
    }),
    carapace: Object.freeze({
      id: 'carapace',
      displayName: 'Carapace',
      layer: 'ground',
      mass: 3,
      mechanicId: 'armored-shell',
      movement: Object.freeze({ radiusMilliCells: 260, pushResistance: 6, pattern: 'heavy' }),
      maxHealth: 90,
      armor: 4,
      speedMilliCellsPerSecond: 900,
      lifeDamage: 2,
      fieldCreditBounty: 3,
    }),
    glider: Object.freeze({
      id: 'glider',
      displayName: 'Glider',
      layer: 'air',
      mass: 1,
      mechanicId: 'air-route',
      maxHealth: 30,
      armor: 0,
      speedMilliCellsPerSecond: 2_200,
      lifeDamage: 1,
      fieldCreditBounty: 2,
    }),
    broodling: Object.freeze({
      id: 'broodling',
      displayName: 'Broodling',
      layer: 'ground',
      mass: 1,
      mechanicId: 'cluster-rush',
      movement: Object.freeze({ radiusMilliCells: 80, pushResistance: 1, pattern: 'swarm' }),
      maxHealth: 12,
      armor: 0,
      speedMilliCellsPerSecond: 2_600,
      lifeDamage: 1,
      fieldCreditBounty: 1,
    }),
  });
