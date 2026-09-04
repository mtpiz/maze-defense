import type {
  BenchmarkCreepId,
  CompiledArena,
  CompiledTerrainCell,
  CreepDefinition,
  MovementLayer,
  TowerCombatDefinition,
  TowerFamilyId,
} from '@tower-defense/content';
import { stableHash } from './determinism.js';
import {
  inspectPlacement,
  planLayerRoutes,
  planRouteFromCell,
  type LayerRoutes,
  type PlacementRejectionReason,
} from './route-planner.js';

export const SIMULATION_VERSION = 5 as const;
export const SIMULATION_TICKS_PER_SECOND = 30 as const;
const MILLI_CELLS_PER_CELL = 1_000;
const MOVEMENT_UNITS_PER_CELL = MILLI_CELLS_PER_CELL * SIMULATION_TICKS_PER_SECOND;

export type MissionPhase = 'opening' | 'planning' | 'wave' | 'victory' | 'defeat';
export type SimulationSpeed = 1 | 2 | 3;
export type ConstructionPolicy = 'planning-only' | 'live-foundation';

export interface WaveGroupDefinition {
  readonly creepId: BenchmarkCreepId;
  readonly count: number;
  readonly firstSpawnTick: number;
  readonly intervalTicks: number;
}

export interface WaveDefinition {
  readonly id: string;
  readonly tacticalPurpose: string;
  readonly groups: readonly WaveGroupDefinition[];
}

export interface MissionDefinition {
  readonly id: string;
  readonly arena: CompiledArena;
  readonly startingLives: number;
  readonly openingFieldCredits: number;
  readonly constructionPolicy: ConstructionPolicy;
  readonly towerCatalog: Readonly<Partial<Record<TowerFamilyId, TowerCombatDefinition>>>;
  readonly creeps: Readonly<Partial<Record<BenchmarkCreepId, CreepDefinition>>>;
  readonly waves: readonly WaveDefinition[];
}

export type MissionCommand =
  | { readonly type: 'place-foundation'; readonly cell: number }
  | {
      readonly type: 'install-specialist';
      readonly towerId: string;
      readonly familyId: Exclude<TowerFamilyId, 'foundation'>;
    }
  | { readonly type: 'dismantle'; readonly towerId: string }
  | { readonly type: 'start-wave' }
  | { readonly type: 'set-speed'; readonly speed: SimulationSpeed }
  | { readonly type: 'set-pause'; readonly paused: boolean };

export type CommandRejectionReason =
  | PlacementRejectionReason
  | 'wrong-phase'
  | 'occupied-by-ground-creep'
  | 'insufficient-field-credits'
  | 'tower-not-found'
  | 'specialist-unavailable'
  | 'tower-already-specialized'
  | 'invalid-speed'
  | 'already-in-state'
  | 'mission-complete';

export type CommandResult =
  | { readonly accepted: true; readonly tick: number }
  | { readonly accepted: false; readonly tick: number; readonly reason: CommandRejectionReason };

export interface AdvanceResult {
  readonly advancedTicks: number;
  readonly tick: number;
  readonly phase: MissionPhase;
}

export interface TowerSnapshot {
  readonly id: string;
  readonly cell: number;
  readonly familyId: TowerFamilyId;
  readonly fieldCreditInvestment: number;
  readonly operationalAtTick: number;
  readonly nextAttackTick: number;
}

export interface CreepSnapshot {
  readonly id: string;
  readonly creepId: BenchmarkCreepId;
  readonly layer: MovementLayer;
  readonly health: number;
  readonly maxHealth: number;
  readonly fromCell: number;
  readonly toCell: number;
  readonly progressPermille: number;
}

export interface ImpactSnapshot {
  readonly id: string;
  readonly towerId: string;
  readonly mechanicId: 'siege-blast';
  readonly impactTick: number;
  readonly xMilli: number;
  readonly yMilli: number;
  readonly radiusMilliCells: number;
}

export interface RenderSnapshot {
  readonly simulationVersion: typeof SIMULATION_VERSION;
  readonly tick: number;
  readonly arenaId: string;
  readonly arenaWidth: number;
  readonly arenaHeight: number;
  readonly spawnCell: number;
  readonly exitCell: number;
  readonly waypointCells: readonly number[];
  readonly inactiveCells: readonly number[];
  readonly terrainCells: readonly CompiledTerrainCell[];
  readonly unbuildableCells: readonly number[];
  readonly towers: readonly TowerSnapshot[];
  readonly creeps: readonly CreepSnapshot[];
  readonly impacts: readonly ImpactSnapshot[];
  readonly routeVersion: number;
  readonly groundRoute: readonly number[];
  readonly airRoute: readonly number[];
}

export interface UiSnapshot {
  readonly tick: number;
  readonly phase: MissionPhase;
  readonly paused: boolean;
  readonly speed: SimulationSpeed;
  readonly lives: number;
  readonly fieldCredits: number;
  readonly completedWaves: number;
  readonly waveNumber: number;
  readonly waveCount: number;
  readonly waveElapsedTicks: number;
  readonly waveCreepCount: number;
  readonly spawnedCreeps: number;
  readonly activeCreeps: number;
  readonly canPlaceFoundation: boolean;
  readonly canDismantle: boolean;
  readonly canDevelopTower: boolean;
}

export type PresentationEventType =
  | 'construction'
  | 'specialist-installed'
  | 'dismantle'
  | 'route-changed'
  | 'wave-started'
  | 'creep-spawned'
  | 'tower-fired'
  | 'impact-anticipated'
  | 'weapon-impact'
  | 'creep-damaged'
  | 'creep-died'
  | 'creep-leaked'
  | 'wave-completed'
  | 'mission-completed'
  | 'mission-defeated'
  | 'pause-changed'
  | 'speed-changed';

export interface PresentationEvent {
  readonly id: string;
  readonly sequence: number;
  readonly tick: number;
  readonly type: PresentationEventType;
  readonly payload: Readonly<Record<string, string | number | boolean>>;
}

export interface CommandRecord {
  readonly sequence: number;
  readonly tick: number;
  readonly command: MissionCommand;
  readonly accepted: boolean;
  readonly reason: CommandRejectionReason | null;
}

export interface MissionCheckpoint {
  readonly simulationVersion: typeof SIMULATION_VERSION;
  readonly missionId: string;
  readonly arenaContentHash: string;
  readonly seed: number;
  readonly determinismHash: string;
  readonly tick: number;
  readonly phase: MissionPhase;
  readonly paused: boolean;
  readonly speed: SimulationSpeed;
  readonly lives: number;
  readonly fieldCredits: number;
  readonly completedWaves: number;
  readonly activeWaveIndex: number | null;
  readonly waveElapsedTicks: number;
  readonly nextSpawnIndex: number;
  readonly routeVersion: number;
  readonly towers: readonly TowerSnapshot[];
  readonly creeps: readonly CreepCheckpoint[];
  readonly impacts: readonly PendingImpactCheckpoint[];
  readonly commands: readonly CommandRecord[];
}

export interface CreepCheckpoint extends CreepSnapshot {
  readonly routeCells: readonly number[];
  readonly routeCellIndex: number;
  readonly movementUnits: number;
  readonly nextWaypointIndex: number;
}

export interface PendingImpactCheckpoint extends ImpactSnapshot {
  readonly damage: number;
  readonly armorPiercing: number;
  readonly targets: Readonly<Record<MovementLayer, boolean>>;
}

export interface MissionSession {
  dispatch(command: MissionCommand): CommandResult;
  advance(tickCount: number): AdvanceResult;
  getRenderSnapshot(): RenderSnapshot;
  getUiSnapshot(): UiSnapshot;
  drainPresentationEvents(): readonly PresentationEvent[];
  createCheckpoint(): MissionCheckpoint;
  getDeterminismHash(): string;
}

interface TowerState {
  readonly id: string;
  readonly cell: number;
  familyId: TowerFamilyId;
  fieldCreditInvestment: number;
  operationalAtTick: number;
  nextAttackTick: number;
}

interface ScheduledSpawn {
  readonly tick: number;
  readonly groupIndex: number;
  readonly memberIndex: number;
  readonly creepId: BenchmarkCreepId;
}

interface CreepState {
  readonly id: string;
  readonly definition: CreepDefinition;
  routeCells: readonly number[];
  health: number;
  routeCellIndex: number;
  movementUnits: number;
  nextWaypointIndex: number;
}

interface PendingImpactState extends PendingImpactCheckpoint {}

const freezeArray = <T>(values: readonly T[]): readonly T[] => Object.freeze([...values]);

const cloneCommand = (command: MissionCommand): MissionCommand => Object.freeze({ ...command });

const compileWaveSchedule = (wave: WaveDefinition): readonly ScheduledSpawn[] =>
  Object.freeze(
    wave.groups
      .flatMap((group, groupIndex) =>
        Array.from({ length: group.count }, (_, memberIndex) =>
          Object.freeze({
            tick: group.firstSpawnTick + memberIndex * group.intervalTicks,
            groupIndex,
            memberIndex,
            creepId: group.creepId,
          }),
        ),
      )
      .sort(
        (left, right) =>
          left.tick - right.tick ||
          left.groupIndex - right.groupIndex ||
          left.memberIndex - right.memberIndex,
      ),
  );

const validateDefinition = (definition: MissionDefinition, seed: number): void => {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(definition.id)) {
    throw new Error('Mission id must be a stable kebab-case identifier');
  }
  if (!Number.isInteger(definition.openingFieldCredits) || definition.openingFieldCredits < 0) {
    throw new Error('Opening Field Credits must be a non-negative integer');
  }
  if (!Number.isInteger(definition.startingLives) || definition.startingLives <= 0) {
    throw new Error('Starting Lives must be a positive integer');
  }
  if (
    definition.constructionPolicy !== 'planning-only' &&
    definition.constructionPolicy !== 'live-foundation'
  ) {
    throw new Error('Construction policy must be planning-only or live-foundation');
  }
  if (definition.towerCatalog.foundation === undefined) {
    throw new Error('Every Mission needs a Foundation combat definition');
  }
  for (const [familyId, tower] of Object.entries(definition.towerCatalog)) {
    if (tower === undefined || tower.familyId !== familyId) {
      throw new Error(`Tower catalog key ${familyId} must match its definition familyId`);
    }
    if (!Number.isInteger(tower.fieldCreditCost) || tower.fieldCreditCost <= 0) {
      throw new Error(`Tower ${familyId} Field Credit cost must be a positive integer`);
    }
    if (!Number.isInteger(tower.constructionDelayTicks) || tower.constructionDelayTicks < 0) {
      throw new Error(`Tower ${familyId} construction delay must be a non-negative integer`);
    }
    const weapon = tower.weapon;
    if (
      weapon.mechanicId !== 'direct' &&
      weapon.mechanicId !== 'rail-line' &&
      weapon.mechanicId !== 'siege-blast'
    ) {
      throw new Error(`Tower ${familyId} has an unknown weapon mechanic`);
    }
    if (
      !Number.isInteger(weapon.damage) ||
      weapon.damage <= 0 ||
      !Number.isInteger(weapon.armorPiercing) ||
      weapon.armorPiercing < 0 ||
      !Number.isInteger(weapon.rangeMilliCells) ||
      weapon.rangeMilliCells <= 0 ||
      !Number.isInteger(weapon.cooldownTicks) ||
      weapon.cooldownTicks <= 0 ||
      (!weapon.targets.ground && !weapon.targets.air)
    ) {
      throw new Error(`Tower ${familyId} has an invalid weapon definition`);
    }
    if (
      weapon.mechanicId === 'rail-line' &&
      (!Number.isInteger(weapon.beamHalfWidthMilliCells) ||
        weapon.beamHalfWidthMilliCells <= 0 ||
        !Number.isInteger(weapon.maxTargets) ||
        weapon.maxTargets <= 0)
    ) {
      throw new Error(`Tower ${familyId} has invalid Rail penetration values`);
    }
    if (
      weapon.mechanicId === 'siege-blast' &&
      (!Number.isInteger(weapon.impactDelayTicks) ||
        weapon.impactDelayTicks <= 0 ||
        !Number.isInteger(weapon.blastRadiusMilliCells) ||
        weapon.blastRadiusMilliCells <= 0 ||
        !weapon.targets.ground ||
        weapon.targets.air)
    ) {
      throw new Error(`Tower ${familyId} has invalid Siege impact values`);
    }
  }
  const creepEntries = Object.entries(definition.creeps);
  if (creepEntries.length === 0) throw new Error('Every Mission needs at least one creep definition');
  for (const [creepId, creep] of creepEntries) {
    if (creep === undefined || creep.id !== creepId) {
      throw new Error(`Creep catalog key ${creepId} must match its definition id`);
    }
    if (!Number.isInteger(creep.maxHealth) || creep.maxHealth <= 0) {
      throw new Error(`Creep ${creepId} maxHealth must be a positive integer`);
    }
    if (!Number.isInteger(creep.armor) || creep.armor < 0) {
      throw new Error(`Creep ${creepId} armor must be a non-negative integer`);
    }
    if (
      !Number.isInteger(creep.speedMilliCellsPerSecond) ||
      creep.speedMilliCellsPerSecond <= 0
    ) {
      throw new Error(`Creep ${creepId} speed must be a positive integer`);
    }
    if (!Number.isInteger(creep.lifeDamage) || creep.lifeDamage <= 0) {
      throw new Error(`Creep ${creepId} lifeDamage must be a positive integer`);
    }
    if (!Number.isInteger(creep.fieldCreditBounty) || creep.fieldCreditBounty < 0) {
      throw new Error(`Creep ${creepId} bounty must be a non-negative integer`);
    }
  }
  if (definition.waves.length === 0) {
    throw new Error('Every Mission needs at least one authored wave');
  }
  const waveIds = new Set<string>();
  for (const wave of definition.waves) {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(wave.id) || waveIds.has(wave.id)) {
      throw new Error(`Wave id ${wave.id} must be unique stable kebab-case`);
    }
    waveIds.add(wave.id);
    if (wave.tacticalPurpose.trim().length === 0) {
      throw new Error(`Wave ${wave.id} needs a written tactical purpose`);
    }
    if (wave.groups.length === 0) throw new Error(`Wave ${wave.id} needs at least one group`);
    for (const group of wave.groups) {
      if (definition.creeps[group.creepId] === undefined) {
        throw new Error(`Wave ${wave.id} references missing creep ${group.creepId}`);
      }
      if (!Number.isInteger(group.count) || group.count <= 0) {
        throw new Error(`Wave ${wave.id} group count must be a positive integer`);
      }
      if (!Number.isInteger(group.firstSpawnTick) || group.firstSpawnTick < 0) {
        throw new Error(`Wave ${wave.id} firstSpawnTick must be a non-negative integer`);
      }
      if (!Number.isInteger(group.intervalTicks) || group.intervalTicks <= 0) {
        throw new Error(`Wave ${wave.id} intervalTicks must be a positive integer`);
      }
    }
  }
  if (!Number.isInteger(seed) || seed < 0 || seed > 0xffffffff) {
    throw new Error('Seed must be an unsigned 32-bit integer');
  }
}

class DeterministicMissionSession implements MissionSession {
  readonly #definition: MissionDefinition;
  readonly #seed: number;
  #tick = 0;
  #phase: MissionPhase = 'opening';
  #paused = false;
  #speed: SimulationSpeed = 1;
  #lives: number;
  #fieldCredits: number;
  #completedWaves = 0;
  #activeWaveIndex: number | null = null;
  #waveElapsedTicks = 0;
  #routeVersion = 1;
  #routes: LayerRoutes;
  #towers: TowerState[] = [];
  #creeps: CreepState[] = [];
  #activeWaveSchedule: readonly ScheduledSpawn[] = Object.freeze([]);
  #nextSpawnIndex = 0;
  #pendingImpacts: PendingImpactState[] = [];
  #nextTowerSequence = 1;
  #nextCreepSequence = 1;
  #nextImpactSequence = 1;
  #nextEventSequence = 1;
  #nextCommandSequence = 1;
  #events: PresentationEvent[] = [];
  #commandLog: CommandRecord[] = [];

  constructor(definition: MissionDefinition, seed: number) {
    validateDefinition(definition, seed);
    const routes = planLayerRoutes(definition.arena, []);
    if (routes === null) throw new Error('Mission Arena has no valid initial ground and air routes');

    this.#definition = definition;
    this.#seed = seed;
    this.#lives = definition.startingLives;
    this.#fieldCredits = definition.openingFieldCredits;
    this.#routes = routes;
  }

  dispatch(command: MissionCommand): CommandResult {
    const frozenCommand = cloneCommand(command);
    const result = this.#applyCommand(frozenCommand);
    this.#commandLog.push(
      Object.freeze({
        sequence: this.#nextCommandSequence,
        tick: this.#tick,
        command: frozenCommand,
        accepted: result.accepted,
        reason: result.accepted ? null : result.reason,
      }),
    );
    this.#nextCommandSequence += 1;
    return result;
  }

  advance(tickCount: number): AdvanceResult {
    if (!Number.isInteger(tickCount) || tickCount < 0) {
      throw new Error('advance(tickCount) requires a non-negative integer');
    }
    if (this.#phase !== 'wave' || this.#paused || tickCount === 0) {
      return Object.freeze({ advancedTicks: 0, tick: this.#tick, phase: this.#phase });
    }

    let advancedTicks = 0;
    while (advancedTicks < tickCount && this.#phase === 'wave' && !this.#paused) {
      this.#advanceWaveTick();
      advancedTicks += 1;
    }
    return Object.freeze({ advancedTicks, tick: this.#tick, phase: this.#phase });
  }

  getRenderSnapshot(): RenderSnapshot {
    return Object.freeze({
      simulationVersion: SIMULATION_VERSION,
      tick: this.#tick,
      arenaId: this.#definition.arena.id,
      arenaWidth: this.#definition.arena.width,
      arenaHeight: this.#definition.arena.height,
      spawnCell: this.#definition.arena.spawnCell,
      exitCell: this.#definition.arena.exitCell,
      waypointCells: freezeArray(this.#definition.arena.waypointCells),
      inactiveCells: freezeArray(this.#definition.arena.inactiveCells),
      terrainCells: freezeArray(this.#definition.arena.terrainCells),
      unbuildableCells: freezeArray(this.#definition.arena.unbuildableCells),
      towers: this.#towerSnapshots(),
      creeps: this.#creepSnapshots(),
      impacts: this.#impactSnapshots(),
      routeVersion: this.#routeVersion,
      groundRoute: freezeArray(this.#routes.ground.cells),
      airRoute: freezeArray(this.#routes.air.cells),
    });
  }

  getUiSnapshot(): UiSnapshot {
    const waveCount = this.#definition.waves.length;
    const visibleWaveIndex = Math.min(this.#activeWaveIndex ?? this.#completedWaves, waveCount - 1);
    const visibleWave = this.#definition.waves[visibleWaveIndex];
    const waveCreepCount =
      this.#activeWaveIndex === null
        ? visibleWave === undefined
          ? 0
          : compileWaveSchedule(visibleWave).length
        : this.#activeWaveSchedule.length;
    return Object.freeze({
      tick: this.#tick,
      phase: this.#phase,
      paused: this.#paused,
      speed: this.#speed,
      lives: this.#lives,
      fieldCredits: this.#fieldCredits,
      completedWaves: this.#completedWaves,
      waveNumber: Math.min(this.#completedWaves + 1, waveCount),
      waveCount,
      waveElapsedTicks: this.#waveElapsedTicks,
      waveCreepCount,
      spawnedCreeps: this.#activeWaveIndex === null ? 0 : this.#nextSpawnIndex,
      activeCreeps: this.#creeps.length,
      canPlaceFoundation: this.#canPlaceFoundation(),
      canDismantle: this.#canDismantle(),
      canDevelopTower: this.#canDevelopTower(),
    });
  }

  drainPresentationEvents(): readonly PresentationEvent[] {
    const drained = freezeArray(this.#events);
    this.#events = [];
    return drained;
  }

  createCheckpoint(): MissionCheckpoint {
    return Object.freeze({
      simulationVersion: SIMULATION_VERSION,
      missionId: this.#definition.id,
      arenaContentHash: this.#definition.arena.contentHash,
      seed: this.#seed,
      determinismHash: this.getDeterminismHash(),
      tick: this.#tick,
      phase: this.#phase,
      paused: this.#paused,
      speed: this.#speed,
      lives: this.#lives,
      fieldCredits: this.#fieldCredits,
      completedWaves: this.#completedWaves,
      activeWaveIndex: this.#activeWaveIndex,
      waveElapsedTicks: this.#waveElapsedTicks,
      nextSpawnIndex: this.#nextSpawnIndex,
      routeVersion: this.#routeVersion,
      towers: this.#towerSnapshots(),
      creeps: this.#creepCheckpoints(),
      impacts: this.#impactCheckpoints(),
      commands: freezeArray(this.#commandLog),
    });
  }

  getDeterminismHash(): string {
    return stableHash({
      simulationVersion: SIMULATION_VERSION,
      missionId: this.#definition.id,
      arenaContentHash: this.#definition.arena.contentHash,
      seed: this.#seed,
      tick: this.#tick,
      phase: this.#phase,
      paused: this.#paused,
      speed: this.#speed,
      lives: this.#lives,
      fieldCredits: this.#fieldCredits,
      completedWaves: this.#completedWaves,
      activeWaveIndex: this.#activeWaveIndex,
      waveElapsedTicks: this.#waveElapsedTicks,
      nextSpawnIndex: this.#nextSpawnIndex,
      routeVersion: this.#routeVersion,
      routes: {
        ground: this.#routes.ground.cells,
        air: this.#routes.air.cells,
      },
      towers: this.#towerSnapshots(),
      creeps: this.#creepCheckpoints(),
      impacts: this.#impactCheckpoints(),
      nextTowerSequence: this.#nextTowerSequence,
      nextCreepSequence: this.#nextCreepSequence,
      nextImpactSequence: this.#nextImpactSequence,
      nextEventSequence: this.#nextEventSequence,
    });
  }

  #applyCommand(command: MissionCommand): CommandResult {
    switch (command.type) {
      case 'place-foundation':
        return this.#placeFoundation(command.cell);
      case 'install-specialist':
        return this.#installSpecialist(command.towerId, command.familyId);
      case 'dismantle':
        return this.#dismantle(command.towerId);
      case 'start-wave':
        return this.#startWave();
      case 'set-speed':
        return this.#setSpeed(command.speed);
      case 'set-pause':
        return this.#setPause(command.paused);
    }
  }

  #placeFoundation(cell: number): CommandResult {
    if (!this.#canPlaceFoundation()) return this.#reject('wrong-phase');
    const foundationDefinition = this.#definition.towerCatalog.foundation;
    if (foundationDefinition === undefined) {
      throw new Error('Validated Mission is missing its Foundation combat definition');
    }
    if (
      this.#creeps.some(
        (creep) =>
          creep.definition.layer === 'ground' && creep.routeCells[creep.routeCellIndex] === cell,
      )
    ) {
      return this.#reject('occupied-by-ground-creep');
    }
    if (this.#fieldCredits < foundationDefinition.fieldCreditCost) {
      return this.#reject('insufficient-field-credits');
    }

    const placedTowers = this.#towers.map(({ cell: towerCell, familyId }) => ({
      cell: towerCell,
      familyId,
    }));
    const decision = inspectPlacement(this.#definition.arena, placedTowers, {
      cell,
      familyId: 'foundation',
    });
    if (!decision.accepted) return this.#reject(decision.reason);

    const reroutedGroundCreeps = new Map<string, readonly number[]>();
    for (const creep of this.#creeps) {
      if (creep.definition.layer !== 'ground') continue;
      const currentCell = creep.routeCells[creep.routeCellIndex];
      if (currentCell === undefined) throw new Error('Active creep has no current route cell');
      const route = planRouteFromCell(
        this.#definition.arena,
        'ground',
        decision.towers,
        currentCell,
        creep.nextWaypointIndex,
      );
      if (route === null) return this.#reject('blocks-ground-route');
      reroutedGroundCreeps.set(creep.id, route.cells);
    }

    const tower: TowerState = {
      id: `tower-${this.#nextTowerSequence}`,
      cell,
      familyId: 'foundation',
      fieldCreditInvestment: foundationDefinition.fieldCreditCost,
      operationalAtTick: this.#tick + foundationDefinition.constructionDelayTicks,
      nextAttackTick: this.#tick + foundationDefinition.constructionDelayTicks,
    };
    this.#nextTowerSequence += 1;
    this.#towers.push(tower);
    this.#fieldCredits -= foundationDefinition.fieldCreditCost;
    this.#routes = decision.routes;
    for (const creep of this.#creeps) {
      const routeCells = reroutedGroundCreeps.get(creep.id);
      if (routeCells === undefined) continue;
      creep.routeCells = routeCells;
      creep.routeCellIndex = 0;
    }
    this.#routeVersion += 1;
    this.#emit('construction', { towerId: tower.id, cell, familyId: tower.familyId });
    this.#emit('route-changed', { routeVersion: this.#routeVersion });
    return this.#accept();
  }

  #dismantle(towerId: string): CommandResult {
    if (!this.#canDismantle()) return this.#reject('wrong-phase');
    const index = this.#towers.findIndex(({ id }) => id === towerId);
    if (index < 0) return this.#reject('tower-not-found');
    const tower = this.#towers[index];
    if (tower === undefined) return this.#reject('tower-not-found');

    const nextTowers = this.#towers.filter(({ id }) => id !== towerId);
    const routes = planLayerRoutes(this.#definition.arena, nextTowers);
    if (routes === null) throw new Error('Dismantling unexpectedly removed a required route');

    const refundRate = this.#phase === 'opening' ? 100 : 80;
    const refund = Math.floor((tower.fieldCreditInvestment * refundRate) / 100);
    this.#towers = nextTowers;
    this.#fieldCredits += refund;
    this.#routes = routes;
    this.#routeVersion += 1;
    this.#emit('dismantle', { towerId, cell: tower.cell, refund });
    this.#emit('route-changed', { routeVersion: this.#routeVersion });
    return this.#accept();
  }

  #installSpecialist(
    towerId: string,
    familyId: Exclude<TowerFamilyId, 'foundation'>,
  ): CommandResult {
    if (!this.#canDevelopTower()) return this.#reject('wrong-phase');
    const tower = this.#towers.find(({ id }) => id === towerId);
    if (tower === undefined) return this.#reject('tower-not-found');
    if (tower.familyId !== 'foundation') return this.#reject('tower-already-specialized');
    const specialist = this.#definition.towerCatalog[familyId];
    if (specialist === undefined) return this.#reject('specialist-unavailable');
    if (this.#fieldCredits < specialist.fieldCreditCost) {
      return this.#reject('insufficient-field-credits');
    }

    this.#fieldCredits -= specialist.fieldCreditCost;
    tower.familyId = familyId;
    tower.fieldCreditInvestment += specialist.fieldCreditCost;
    tower.operationalAtTick = this.#tick + specialist.constructionDelayTicks;
    tower.nextAttackTick = tower.operationalAtTick;
    this.#emit('specialist-installed', {
      towerId,
      familyId,
      operationalAtTick: tower.operationalAtTick,
    });
    return this.#accept();
  }

  #startWave(): CommandResult {
    if (this.#phase === 'victory' || this.#phase === 'defeat') {
      return this.#reject('mission-complete');
    }
    if (!this.#canDismantle()) return this.#reject('wrong-phase');

    const wave = this.#definition.waves[this.#completedWaves];
    if (wave === undefined) throw new Error('Mission has no authored wave at the current index');
    this.#phase = 'wave';
    this.#paused = false;
    this.#activeWaveIndex = this.#completedWaves;
    this.#activeWaveSchedule = compileWaveSchedule(wave);
    this.#nextSpawnIndex = 0;
    this.#waveElapsedTicks = 0;
    this.#emit('wave-started', { waveNumber: this.#completedWaves + 1 });
    return this.#accept();
  }

  #setSpeed(speed: SimulationSpeed): CommandResult {
    if (speed !== 1 && speed !== 2 && speed !== 3) return this.#reject('invalid-speed');
    if (this.#speed === speed) return this.#reject('already-in-state');
    this.#speed = speed;
    this.#emit('speed-changed', { speed });
    return this.#accept();
  }

  #setPause(paused: boolean): CommandResult {
    if (this.#phase === 'victory' || this.#phase === 'defeat') {
      return this.#reject('mission-complete');
    }
    if (this.#paused === paused) return this.#reject('already-in-state');
    this.#paused = paused;
    this.#emit('pause-changed', { paused });
    return this.#accept();
  }

  #advanceWaveTick(): void {
    if (this.#activeWaveIndex === null) {
      throw new Error('Wave phase is missing its active wave index');
    }
    this.#tick += 1;
    this.#waveElapsedTicks += 1;

    while (this.#nextSpawnIndex < this.#activeWaveSchedule.length) {
      const scheduled = this.#activeWaveSchedule[this.#nextSpawnIndex];
      if (scheduled === undefined || scheduled.tick >= this.#waveElapsedTicks) break;
      this.#spawnCreep(scheduled.creepId);
      this.#nextSpawnIndex += 1;
    }

    this.#moveCreeps();
    if (this.#phase === 'wave') this.#resolveImpacts();
    if (this.#phase === 'wave') this.#fireTowers();
    if (
      this.#phase === 'wave' &&
      this.#nextSpawnIndex === this.#activeWaveSchedule.length &&
      this.#creeps.length === 0 &&
      this.#pendingImpacts.length === 0
    ) {
      this.#completeWave();
    }
  }

  #spawnCreep(creepId: BenchmarkCreepId): void {
    const definition = this.#definition.creeps[creepId];
    if (definition === undefined) throw new Error(`Missing compiled creep definition ${creepId}`);
    const route = definition.layer === 'ground' ? this.#routes.ground : this.#routes.air;
    const creep: CreepState = {
      id: `creep-${this.#nextCreepSequence}`,
      definition,
      routeCells: route.cells,
      health: definition.maxHealth,
      routeCellIndex: 0,
      movementUnits: 0,
      nextWaypointIndex: 0,
    };
    this.#nextCreepSequence += 1;
    this.#creeps.push(creep);
    this.#emit('creep-spawned', {
      creepId: creep.id,
      creepType: definition.id,
      layer: definition.layer,
    });
  }

  #moveCreeps(): void {
    const survivors: CreepState[] = [];
    for (const creep of this.#creeps) {
      creep.movementUnits += creep.definition.speedMilliCellsPerSecond;
      let leaked = false;

      while (creep.movementUnits >= MOVEMENT_UNITS_PER_CELL) {
        creep.movementUnits -= MOVEMENT_UNITS_PER_CELL;
        creep.routeCellIndex += 1;
        const enteredCell = creep.routeCells[creep.routeCellIndex];
        if (enteredCell === undefined) throw new Error('Creep advanced beyond its compiled route');

        const requiredWaypoint = this.#definition.arena.waypointCells[creep.nextWaypointIndex];
        if (requiredWaypoint !== undefined && enteredCell === requiredWaypoint) {
          creep.nextWaypointIndex += 1;
        }

        if (creep.routeCellIndex === creep.routeCells.length - 1) {
          this.#leakCreep(creep);
          leaked = true;
          break;
        }
      }

      if (this.#phase === 'defeat') {
        this.#creeps = [];
        return;
      }
      if (!leaked) survivors.push(creep);
    }
    this.#creeps = survivors;
  }

  #fireTowers(): void {
    for (const tower of this.#towers) {
      if (this.#tick < tower.operationalAtTick || this.#tick < tower.nextAttackTick) continue;
      const towerDefinition = this.#definition.towerCatalog[tower.familyId];
      if (towerDefinition === undefined) {
        throw new Error(`Placed tower ${tower.id} has no combat definition`);
      }
      const weapon = towerDefinition.weapon;
      const target = this.#findFirstTarget(tower, weapon);
      if (target === null) continue;
      if (weapon.mechanicId === 'siege-blast') {
        tower.nextAttackTick = this.#tick + weapon.cooldownTicks;
        this.#scheduleSiegeImpact(tower, target, weapon);
        continue;
      }
      const hits =
        weapon.mechanicId === 'rail-line'
          ? this.#railTargets(tower, target, weapon)
          : [target];
      tower.nextAttackTick = this.#tick + weapon.cooldownTicks;
      this.#emit('tower-fired', {
        towerId: tower.id,
        targetId: target.id,
        mechanicId: weapon.mechanicId,
        hitCount: hits.length,
      });
      for (const hit of hits) this.#damageCreep(tower, hit, weapon);
    }
  }

  #scheduleSiegeImpact(
    tower: TowerState,
    target: CreepState,
    weapon: Extract<TowerCombatDefinition['weapon'], { readonly mechanicId: 'siege-blast' }>,
  ): void {
    const targetPoint = this.#creepPosition(target);
    const impact: PendingImpactState = {
      id: `impact-${this.#nextImpactSequence}`,
      towerId: tower.id,
      mechanicId: weapon.mechanicId,
      impactTick: this.#tick + weapon.impactDelayTicks,
      xMilli: targetPoint.x,
      yMilli: targetPoint.y,
      radiusMilliCells: weapon.blastRadiusMilliCells,
      damage: weapon.damage,
      armorPiercing: weapon.armorPiercing,
      targets: Object.freeze({ ...weapon.targets }),
    };
    this.#nextImpactSequence += 1;
    this.#pendingImpacts.push(impact);
    this.#emit('tower-fired', {
      towerId: tower.id,
      targetId: target.id,
      mechanicId: weapon.mechanicId,
      impactId: impact.id,
    });
    this.#emit('impact-anticipated', {
      impactId: impact.id,
      towerId: tower.id,
      mechanicId: weapon.mechanicId,
      impactTick: impact.impactTick,
      xMilli: impact.xMilli,
      yMilli: impact.yMilli,
      radiusMilliCells: impact.radiusMilliCells,
    });
  }

  #resolveImpacts(): void {
    const due = this.#pendingImpacts.filter(({ impactTick }) => impactTick <= this.#tick);
    if (due.length === 0) return;
    this.#pendingImpacts = this.#pendingImpacts.filter(({ impactTick }) => impactTick > this.#tick);

    for (const impact of due) {
      const tower = this.#towers.find(({ id }) => id === impact.towerId);
      if (tower === undefined) throw new Error(`Pending impact ${impact.id} lost its source tower`);
      const radiusSquared = impact.radiusMilliCells * impact.radiusMilliCells;
      const hits = this.#creeps.filter((creep) => {
        if (!impact.targets[creep.definition.layer]) return false;
        const point = this.#creepPosition(creep);
        const deltaX = point.x - impact.xMilli;
        const deltaY = point.y - impact.yMilli;
        return deltaX * deltaX + deltaY * deltaY <= radiusSquared;
      });
      this.#emit('weapon-impact', {
        impactId: impact.id,
        towerId: tower.id,
        mechanicId: impact.mechanicId,
        hitCount: hits.length,
        xMilli: impact.xMilli,
        yMilli: impact.yMilli,
      });
      for (const creep of hits) this.#damageCreep(tower, creep, impact);
    }
  }

  #findFirstTarget(
    tower: TowerState,
    weapon: TowerCombatDefinition['weapon'],
  ): CreepState | null {
    let target: CreepState | null = null;
    let targetRemainingMovement = Number.POSITIVE_INFINITY;
    for (const creep of this.#creeps) {
      if (
        !weapon.targets[creep.definition.layer] ||
        !this.#isCreepInRange(tower, creep, weapon.rangeMilliCells)
      ) {
        continue;
      }
      const remainingMovement =
        (creep.routeCells.length - 1 - creep.routeCellIndex) * MOVEMENT_UNITS_PER_CELL -
        creep.movementUnits;
      if (remainingMovement < targetRemainingMovement) {
        target = creep;
        targetRemainingMovement = remainingMovement;
      }
    }
    return target;
  }

  #railTargets(
    tower: TowerState,
    primary: CreepState,
    weapon: Extract<TowerCombatDefinition['weapon'], { readonly mechanicId: 'rail-line' }>,
  ): readonly CreepState[] {
    const towerPoint = this.#towerPosition(tower);
    const primaryPoint = this.#creepPosition(primary);
    const beamX = primaryPoint.x - towerPoint.x;
    const beamY = primaryPoint.y - towerPoint.y;
    const beamLengthSquared = beamX * beamX + beamY * beamY;
    if (beamLengthSquared === 0) return [primary];

    return this.#creeps
      .flatMap((creep) => {
        if (!weapon.targets[creep.definition.layer]) return [];
        const point = this.#creepPosition(creep);
        const relativeX = point.x - towerPoint.x;
        const relativeY = point.y - towerPoint.y;
        const projection = relativeX * beamX + relativeY * beamY;
        if (
          projection < 0 ||
          projection * projection >
            weapon.rangeMilliCells * weapon.rangeMilliCells * beamLengthSquared
        ) {
          return [];
        }
        const cross = relativeX * beamY - relativeY * beamX;
        if (
          cross * cross >
          weapon.beamHalfWidthMilliCells *
            weapon.beamHalfWidthMilliCells *
            beamLengthSquared
        ) {
          return [];
        }
        return [{ creep, projection }];
      })
      .sort((left, right) => left.projection - right.projection)
      .slice(0, weapon.maxTargets)
      .map(({ creep }) => creep);
  }

  #damageCreep(
    tower: TowerState,
    target: CreepState,
    weapon: { readonly damage: number; readonly armorPiercing: number },
  ): void {
    const armorAfterPiercing = Math.max(0, target.definition.armor - weapon.armorPiercing);
    const damage = Math.min(target.health, Math.max(1, weapon.damage - armorAfterPiercing));
    target.health -= damage;
    this.#emit('creep-damaged', {
      creepId: target.id,
      towerId: tower.id,
      damage,
      remainingHealth: target.health,
    });
    if (target.health > 0) return;

    this.#fieldCredits += target.definition.fieldCreditBounty;
    this.#emit('creep-died', {
      creepId: target.id,
      creepType: target.definition.id,
      towerId: tower.id,
      bounty: target.definition.fieldCreditBounty,
    });
    this.#creeps = this.#creeps.filter(({ id }) => id !== target.id);
  }

  #isCreepInRange(tower: TowerState, creep: CreepState, rangeMilliCells: number): boolean {
    const creepPoint = this.#creepPosition(creep);
    const towerPoint = this.#towerPosition(tower);
    const deltaX = creepPoint.x - towerPoint.x;
    const deltaY = creepPoint.y - towerPoint.y;
    return deltaX * deltaX + deltaY * deltaY <= rangeMilliCells * rangeMilliCells;
  }

  #creepPosition(creep: CreepState): { readonly x: number; readonly y: number } {
    const fromCell = creep.routeCells[creep.routeCellIndex];
    const toCell = creep.routeCells[creep.routeCellIndex + 1];
    if (fromCell === undefined || toCell === undefined) {
      throw new Error('Active creep is missing a position segment');
    }
    const width = this.#definition.arena.width;
    const fromX = fromCell % width;
    const fromY = Math.floor(fromCell / width);
    const toX = toCell % width;
    const toY = Math.floor(toCell / width);
    const progressX = Math.trunc(
      ((toX - fromX) * creep.movementUnits * MILLI_CELLS_PER_CELL) /
        MOVEMENT_UNITS_PER_CELL,
    );
    const progressY = Math.trunc(
      ((toY - fromY) * creep.movementUnits * MILLI_CELLS_PER_CELL) /
        MOVEMENT_UNITS_PER_CELL,
    );
    return {
      x: fromX * MILLI_CELLS_PER_CELL + progressX,
      y: fromY * MILLI_CELLS_PER_CELL + progressY,
    };
  }

  #towerPosition(tower: TowerState): { readonly x: number; readonly y: number } {
    const width = this.#definition.arena.width;
    return {
      x: (tower.cell % width) * MILLI_CELLS_PER_CELL,
      y: Math.floor(tower.cell / width) * MILLI_CELLS_PER_CELL,
    };
  }

  #leakCreep(creep: CreepState): void {
    this.#lives = Math.max(0, this.#lives - creep.definition.lifeDamage);
    this.#emit('creep-leaked', {
      creepId: creep.id,
      creepType: creep.definition.id,
      lifeDamage: creep.definition.lifeDamage,
      remainingLives: this.#lives,
    });
    if (this.#lives > 0) return;

    this.#phase = 'defeat';
    this.#paused = false;
    this.#pendingImpacts = [];
    this.#emit('mission-defeated', {
      waveNumber: this.#completedWaves + 1,
      completedWaves: this.#completedWaves,
    });
  }

  #completeWave(): void {
    const waveNumber = this.#completedWaves + 1;
    this.#completedWaves += 1;
    this.#activeWaveIndex = null;
    this.#activeWaveSchedule = Object.freeze([]);
    this.#nextSpawnIndex = 0;
    this.#pendingImpacts = [];
    this.#waveElapsedTicks = 0;
    this.#emit('wave-completed', { waveNumber });

    if (this.#completedWaves === this.#definition.waves.length) {
      this.#phase = 'victory';
      this.#paused = false;
      this.#emit('mission-completed', { completedWaves: this.#completedWaves });
    } else {
      this.#phase = 'planning';
    }
  }

  #towerSnapshots(): readonly TowerSnapshot[] {
    return Object.freeze(
      this.#towers.map((tower) =>
        Object.freeze({
          id: tower.id,
          cell: tower.cell,
          familyId: tower.familyId,
          fieldCreditInvestment: tower.fieldCreditInvestment,
          operationalAtTick: tower.operationalAtTick,
          nextAttackTick: tower.nextAttackTick,
        }),
      ),
    );
  }

  #creepSnapshots(): readonly CreepSnapshot[] {
    return Object.freeze(
      this.#creeps.map((creep) => {
        const fromCell = creep.routeCells[creep.routeCellIndex];
        const toCell = creep.routeCells[creep.routeCellIndex + 1];
        if (fromCell === undefined || toCell === undefined) {
          throw new Error('Active creep is missing a renderable route segment');
        }
        return Object.freeze({
          id: creep.id,
          creepId: creep.definition.id,
          layer: creep.definition.layer,
          health: creep.health,
          maxHealth: creep.definition.maxHealth,
          fromCell,
          toCell,
          progressPermille: Math.floor(
            (creep.movementUnits * MILLI_CELLS_PER_CELL) / MOVEMENT_UNITS_PER_CELL,
          ),
        });
      }),
    );
  }

  #creepCheckpoints(): readonly CreepCheckpoint[] {
    const snapshots = new Map(this.#creepSnapshots().map((snapshot) => [snapshot.id, snapshot]));
    return Object.freeze(
      this.#creeps.map((creep) => {
        const snapshot = snapshots.get(creep.id);
        if (snapshot === undefined) throw new Error('Creep snapshot disappeared during checkpointing');
        return Object.freeze({
          ...snapshot,
          routeCells: freezeArray(creep.routeCells),
          routeCellIndex: creep.routeCellIndex,
          movementUnits: creep.movementUnits,
          nextWaypointIndex: creep.nextWaypointIndex,
        });
      }),
    );
  }

  #impactSnapshots(): readonly ImpactSnapshot[] {
    return Object.freeze(
      this.#pendingImpacts.map((impact) =>
        Object.freeze({
          id: impact.id,
          towerId: impact.towerId,
          mechanicId: impact.mechanicId,
          impactTick: impact.impactTick,
          xMilli: impact.xMilli,
          yMilli: impact.yMilli,
          radiusMilliCells: impact.radiusMilliCells,
        }),
      ),
    );
  }

  #impactCheckpoints(): readonly PendingImpactCheckpoint[] {
    return Object.freeze(
      this.#pendingImpacts.map((impact) =>
        Object.freeze({
          ...impact,
          targets: Object.freeze({ ...impact.targets }),
        }),
      ),
    );
  }

  #canPlaceFoundation(): boolean {
    if (this.#phase === 'opening' || this.#phase === 'planning') return true;
    return (
      this.#phase === 'wave' &&
      !this.#paused &&
      this.#definition.constructionPolicy === 'live-foundation'
    );
  }

  #canDismantle(): boolean {
    return this.#phase === 'opening' || this.#phase === 'planning';
  }

  #canDevelopTower(): boolean {
    return (
      this.#phase === 'opening' ||
      this.#phase === 'planning' ||
      (this.#phase === 'wave' && !this.#paused)
    );
  }

  #emit(
    type: PresentationEventType,
    payload: Record<string, string | number | boolean>,
  ): void {
    const sequence = this.#nextEventSequence;
    this.#nextEventSequence += 1;
    this.#events.push(
      Object.freeze({
        id: `${this.#definition.id}:${sequence}`,
        sequence,
        tick: this.#tick,
        type,
        payload: Object.freeze({ ...payload }),
      }),
    );
  }

  #accept(): CommandResult {
    return Object.freeze({ accepted: true, tick: this.#tick });
  }

  #reject(reason: CommandRejectionReason): CommandResult {
    return Object.freeze({ accepted: false, tick: this.#tick, reason });
  }
}

export const createMission = (definition: MissionDefinition, seed = 0): MissionSession =>
  new DeterministicMissionSession(definition, seed);
