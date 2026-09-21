import { compileArena, ContentValidationError, type ContentIssue } from './compile-arena.js';
import type {
  BenchmarkCreepId,
  ArenaSource,
  CompiledArena,
  CreepDefinition,
  MovementLayer,
  TowerCombatDefinition,
  TowerFamilyId,
  WeaponDefinition,
} from './model.js';

export const CAMPAIGN_MISSION_SCHEMA_VERSION = 1 as const;

export interface CampaignMissionSource {
  readonly schemaVersion: typeof CAMPAIGN_MISSION_SCHEMA_VERSION;
  readonly contentVersion: number;
  readonly mission: CampaignMissionSourceDefinition;
  readonly progression: CampaignProgression;
}

export interface CampaignMissionSourceDefinition {
  readonly id: string;
  readonly arena: ArenaSource;
  readonly startingLives: number;
  readonly openingFieldCredits: number;
  readonly constructionPolicy: 'planning-only' | 'live-foundation';
  readonly planningDurationTicks?: number;
  readonly earlyLaunchMaxCredits?: number;
  readonly twoStarLives?: number;
  readonly towerCatalog: Readonly<Partial<Record<TowerFamilyId, TowerCombatDefinition>>>;
  readonly creeps: Readonly<Partial<Record<BenchmarkCreepId, CreepDefinition>>>;
  readonly waves: readonly CampaignWaveSource[];
}

export interface CampaignWaveSource {
  readonly id: string;
  readonly tacticalPurpose: string;
  readonly fieldCreditAllotment?: number;
  readonly groups: readonly CampaignWaveGroupSource[];
}

export interface CampaignWaveGroupSource {
  readonly creepId: BenchmarkCreepId;
  readonly count: number;
  readonly firstSpawnTick: number;
  readonly intervalTicks: number;
  readonly burstSize?: number;
}

export interface CompiledWaveGroupDefinition {
  readonly creepId: BenchmarkCreepId;
  readonly count: number;
  readonly firstSpawnTick: number;
  readonly intervalTicks: number;
  readonly burstSize: number;
}

export interface CompiledWaveDefinition {
  readonly id: string;
  readonly tacticalPurpose: string;
  readonly fieldCreditAllotment: number;
  readonly groups: readonly CompiledWaveGroupDefinition[];
}

export interface CompiledMissionDefinition {
  readonly id: string;
  readonly arena: CompiledArena;
  readonly startingLives: number;
  readonly openingFieldCredits: number;
  readonly constructionPolicy: 'planning-only' | 'live-foundation';
  readonly planningDurationTicks: number;
  readonly earlyLaunchMaxCredits: number;
  readonly twoStarLives?: number;
  readonly towerCatalog: Readonly<Partial<Record<TowerFamilyId, TowerCombatDefinition>>>;
  readonly creeps: Readonly<Partial<Record<BenchmarkCreepId, CreepDefinition>>>;
  readonly waves: readonly CompiledWaveDefinition[];
}

export interface CampaignProgression {
  readonly requires: readonly string[];
  readonly loans: readonly TowerFamilyId[];
  readonly awards: readonly TowerFamilyId[];
}

export interface CompiledCampaignMission {
  readonly schemaVersion: typeof CAMPAIGN_MISSION_SCHEMA_VERSION;
  readonly contentVersion: number;
  readonly contentHash: string;
  readonly mission: CompiledMissionDefinition;
  readonly progression: CampaignProgression;
}

const FAMILY_IDS = ['foundation', 'rail', 'arc', 'siege', 'gravity'] as const;
const CREEP_IDS = ['drone', 'carapace', 'glider', 'broodling'] as const;
const KEBAB_CASE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isFamilyId = (value: unknown): value is TowerFamilyId =>
  typeof value === 'string' && (FAMILY_IDS as readonly string[]).includes(value);

const isCreepId = (value: unknown): value is BenchmarkCreepId =>
  typeof value === 'string' && (CREEP_IDS as readonly string[]).includes(value);

const fnv1a = (value: string): string => {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
};

const canonicalize = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!isRecord(value)) return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]));
};

const deepFreeze = <Value>(value: Value): Value => {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) deepFreeze(child);
    Object.freeze(value);
  }
  return value;
};

const addIssue = (issues: ContentIssue[], path: string, message: string): void => {
  issues.push({ path, message });
};

const readString = (value: unknown, path: string, issues: ContentIssue[], nonBlank = false): string => {
  if (typeof value !== 'string') {
    addIssue(issues, path, 'must be a string');
    return '';
  }
  const result = value.trim();
  if (nonBlank && result.length === 0) addIssue(issues, path, 'must not be blank');
  return result;
};

const readInteger = (value: unknown, path: string, issues: ContentIssue[], minimum: number): number => {
  if (!Number.isSafeInteger(value) || (value as number) < minimum) {
    addIssue(issues, path, `must be an integer greater than or equal to ${minimum}`);
    return minimum;
  }
  return value as number;
};

const readBoolean = (value: unknown, path: string, issues: ContentIssue[]): boolean => {
  if (typeof value !== 'boolean') {
    addIssue(issues, path, 'must be a boolean');
    return false;
  }
  return value;
};

const readTargets = (value: unknown, path: string, issues: ContentIssue[]): Readonly<Record<MovementLayer, boolean>> => {
  const source = isRecord(value) ? value : {};
  if (!isRecord(value)) addIssue(issues, path, 'must define ground and air booleans');
  const result = { ground: readBoolean(source.ground, `${path}.ground`, issues), air: readBoolean(source.air, `${path}.air`, issues) };
  if (!result.ground && !result.air) addIssue(issues, path, 'must target ground or air');
  return result;
};

const readWeapon = (value: unknown, path: string, issues: ContentIssue[]): WeaponDefinition => {
  const source = isRecord(value) ? value : {};
  if (!isRecord(value)) addIssue(issues, path, 'must be a weapon definition');
  const mechanicId = source.mechanicId;
  if (!['direct', 'rail-line', 'arc-chain', 'siege-blast'].includes(mechanicId as string)) {
    addIssue(issues, `${path}.mechanicId`, 'must be a known weapon mechanic');
  }
  const common = {
    damage: readInteger(source.damage, `${path}.damage`, issues, 1),
    armorPiercing: readInteger(source.armorPiercing, `${path}.armorPiercing`, issues, 0),
    rangeMilliCells: readInteger(source.rangeMilliCells, `${path}.rangeMilliCells`, issues, 1),
    cooldownTicks: readInteger(source.cooldownTicks, `${path}.cooldownTicks`, issues, 1),
    targets: readTargets(source.targets, `${path}.targets`, issues),
    targeting: source.targeting === 'first' ? 'first' as const : (addIssue(issues, `${path}.targeting`, 'must equal first'), 'first' as const),
    minimumRangeMilliCells: source.minimumRangeMilliCells === undefined ? 0 : readInteger(source.minimumRangeMilliCells, `${path}.minimumRangeMilliCells`, issues, 0),
    coverageArcMilliDegrees: source.coverageArcMilliDegrees === undefined ? 360_000 : readInteger(source.coverageArcMilliDegrees, `${path}.coverageArcMilliDegrees`, issues, 1),
  };
  if (common.minimumRangeMilliCells >= common.rangeMilliCells) addIssue(issues, `${path}.minimumRangeMilliCells`, 'must be less than rangeMilliCells');
  if (common.coverageArcMilliDegrees > 360_000) addIssue(issues, `${path}.coverageArcMilliDegrees`, 'must not exceed 360000');
  switch (mechanicId) {
    case 'rail-line':
      return { ...common, mechanicId, beamHalfWidthMilliCells: readInteger(source.beamHalfWidthMilliCells, `${path}.beamHalfWidthMilliCells`, issues, 1), maxTargets: readInteger(source.maxTargets, `${path}.maxTargets`, issues, 1) };
    case 'arc-chain':
      return { ...common, mechanicId, jumpRangeMilliCells: readInteger(source.jumpRangeMilliCells, `${path}.jumpRangeMilliCells`, issues, 1), maxTargets: readInteger(source.maxTargets, `${path}.maxTargets`, issues, 1) };
    case 'siege-blast':
      if (!common.targets.ground || common.targets.air) addIssue(issues, `${path}.targets`, 'Siege must target ground only');
      return { ...common, mechanicId, impactDelayTicks: readInteger(source.impactDelayTicks, `${path}.impactDelayTicks`, issues, 1), blastRadiusMilliCells: readInteger(source.blastRadiusMilliCells, `${path}.blastRadiusMilliCells`, issues, 1) };
    case 'direct': return { ...common, mechanicId };
    default: return { ...common, mechanicId: 'direct' };
  }
};

const readTowerCatalog = (value: unknown, path: string, issues: ContentIssue[]): CompiledMissionDefinition['towerCatalog'] => {
  const source = isRecord(value) ? value : {};
  if (!isRecord(value)) addIssue(issues, path, 'must be a tower catalog object');
  const catalog: Partial<Record<TowerFamilyId, TowerCombatDefinition>> = {};
  for (const [key, rawTower] of Object.entries(source)) {
    const towerPath = `${path}.${key}`;
    if (!isFamilyId(key)) {
      addIssue(issues, towerPath, 'has an unknown tower family');
      continue;
    }
    const tower = isRecord(rawTower) ? rawTower : {};
    if (!isRecord(rawTower)) addIssue(issues, towerPath, 'must be a tower definition');
    if (tower.familyId !== key) addIssue(issues, `${towerPath}.familyId`, `must equal ${key}`);
    catalog[key] = { familyId: key, fieldCreditCost: readInteger(tower.fieldCreditCost, `${towerPath}.fieldCreditCost`, issues, 1), constructionDelayTicks: readInteger(tower.constructionDelayTicks, `${towerPath}.constructionDelayTicks`, issues, 0), weapon: readWeapon(tower.weapon, `${towerPath}.weapon`, issues) };
  }
  if (catalog.foundation === undefined) addIssue(issues, `${path}.foundation`, 'is required');
  return catalog;
};

const readCreepCatalog = (value: unknown, path: string, issues: ContentIssue[]): CompiledMissionDefinition['creeps'] => {
  const source = isRecord(value) ? value : {};
  if (!isRecord(value)) addIssue(issues, path, 'must be a creep catalog object');
  const catalog: Partial<Record<BenchmarkCreepId, CreepDefinition>> = {};
  for (const [key, rawCreep] of Object.entries(source)) {
    const creepPath = `${path}.${key}`;
    if (!isCreepId(key)) {
      addIssue(issues, creepPath, 'has an unknown creep id');
      continue;
    }
    const creep = isRecord(rawCreep) ? rawCreep : {};
    if (!isRecord(rawCreep)) addIssue(issues, creepPath, 'must be a creep definition');
    if (creep.id !== key) addIssue(issues, `${creepPath}.id`, `must equal ${key}`);
    const layer = creep.layer === 'ground' || creep.layer === 'air' ? creep.layer : (addIssue(issues, `${creepPath}.layer`, 'must be ground or air'), 'ground' as const);
    let movement: CreepDefinition['movement'];
    if (creep.movement !== undefined) {
      const sourceMovement = isRecord(creep.movement) ? creep.movement : {};
      if (!isRecord(creep.movement)) addIssue(issues, `${creepPath}.movement`, 'must be a movement profile');
      const pattern = sourceMovement.pattern;
      if (!['swarm', 'runner', 'heavy'].includes(pattern as string)) addIssue(issues, `${creepPath}.movement.pattern`, 'must be swarm, runner, or heavy');
      movement = {
        radiusMilliCells: readInteger(sourceMovement.radiusMilliCells, `${creepPath}.movement.radiusMilliCells`, issues, 20),
        pushResistance: typeof sourceMovement.pushResistance === 'number' && Number.isFinite(sourceMovement.pushResistance) && sourceMovement.pushResistance > 0 ? sourceMovement.pushResistance : (addIssue(issues, `${creepPath}.movement.pushResistance`, 'must be a positive finite number'), 1),
        pattern: ['swarm', 'runner', 'heavy'].includes(pattern as string) ? pattern as 'swarm' | 'runner' | 'heavy' : 'runner',
      };
      if (movement.radiusMilliCells > 450) addIssue(issues, `${creepPath}.movement.radiusMilliCells`, 'must not exceed 450');
    }
    catalog[key] = {
      id: key, displayName: readString(creep.displayName, `${creepPath}.displayName`, issues, true), layer,
      mass: typeof creep.mass === 'number' && Number.isFinite(creep.mass) && creep.mass > 0 ? creep.mass : (addIssue(issues, `${creepPath}.mass`, 'must be a positive finite number'), 1),
      ...(movement === undefined ? {} : { movement }), mechanicId: readString(creep.mechanicId, `${creepPath}.mechanicId`, issues, true),
      maxHealth: readInteger(creep.maxHealth, `${creepPath}.maxHealth`, issues, 1), armor: readInteger(creep.armor, `${creepPath}.armor`, issues, 0),
      speedMilliCellsPerSecond: readInteger(creep.speedMilliCellsPerSecond, `${creepPath}.speedMilliCellsPerSecond`, issues, 1), lifeDamage: readInteger(creep.lifeDamage, `${creepPath}.lifeDamage`, issues, 1), fieldCreditBounty: readInteger(creep.fieldCreditBounty, `${creepPath}.fieldCreditBounty`, issues, 0),
    };
  }
  if (Object.keys(catalog).length === 0) addIssue(issues, path, 'must contain at least one creep definition');
  return catalog;
};

const readWaves = (value: unknown, path: string, creeps: CompiledMissionDefinition['creeps'], issues: ContentIssue[]): readonly CompiledWaveDefinition[] => {
  if (!Array.isArray(value)) {
    addIssue(issues, path, 'must be an array');
    return [];
  }
  if (value.length === 0) addIssue(issues, path, 'must contain at least one wave');
  const ids = new Set<string>();
  return value.map((rawWave, waveIndex) => {
    const wavePath = `${path}[${waveIndex}]`;
    const wave = isRecord(rawWave) ? rawWave : {};
    if (!isRecord(rawWave)) addIssue(issues, wavePath, 'must be a wave definition');
    const id = readString(wave.id, `${wavePath}.id`, issues, true);
    if (!KEBAB_CASE.test(id)) addIssue(issues, `${wavePath}.id`, 'must be a stable kebab-case identifier');
    if (ids.has(id)) addIssue(issues, `${wavePath}.id`, 'must be unique');
    ids.add(id);
    const groups = Array.isArray(wave.groups) ? wave.groups : (addIssue(issues, `${wavePath}.groups`, 'must be an array'), []);
    if (groups.length === 0) addIssue(issues, `${wavePath}.groups`, 'must contain at least one group');
    return {
      id, tacticalPurpose: readString(wave.tacticalPurpose, `${wavePath}.tacticalPurpose`, issues, true),
      fieldCreditAllotment: wave.fieldCreditAllotment === undefined ? 0 : readInteger(wave.fieldCreditAllotment, `${wavePath}.fieldCreditAllotment`, issues, 0),
      groups: groups.map((rawGroup, groupIndex) => {
        const groupPath = `${wavePath}.groups[${groupIndex}]`;
        const group = isRecord(rawGroup) ? rawGroup : {};
        if (!isRecord(rawGroup)) addIssue(issues, groupPath, 'must be a wave group');
        const creepId = isCreepId(group.creepId) ? group.creepId : (addIssue(issues, `${groupPath}.creepId`, 'must be a known creep id'), 'drone' as const);
        if (creeps[creepId] === undefined) addIssue(issues, `${groupPath}.creepId`, `references missing creep ${creepId}`);
        return { creepId, count: readInteger(group.count, `${groupPath}.count`, issues, 1), firstSpawnTick: readInteger(group.firstSpawnTick, `${groupPath}.firstSpawnTick`, issues, 0), intervalTicks: readInteger(group.intervalTicks, `${groupPath}.intervalTicks`, issues, 1), burstSize: group.burstSize === undefined ? 1 : readInteger(group.burstSize, `${groupPath}.burstSize`, issues, 1) };
      }),
    };
  });
};

const readFamilies = (value: unknown, path: string, issues: ContentIssue[]): readonly TowerFamilyId[] => {
  if (!Array.isArray(value)) {
    addIssue(issues, path, 'must be an array');
    return [];
  }
  const families: TowerFamilyId[] = [];
  const seen = new Set<TowerFamilyId>();
  value.forEach((family, index) => {
    const familyPath = `${path}[${index}]`;
    if (!isFamilyId(family)) addIssue(issues, familyPath, 'must be a known tower family');
    else if (seen.has(family)) addIssue(issues, familyPath, 'must not contain duplicates');
    else { seen.add(family); families.push(family); }
  });
  return families;
};

export const compileCampaignMission = (value: unknown): CompiledCampaignMission => {
  const issues: ContentIssue[] = [];
  const source = isRecord(value) ? value : {};
  if (!isRecord(value)) addIssue(issues, '$', 'must be an object');
  if (source.schemaVersion !== CAMPAIGN_MISSION_SCHEMA_VERSION) addIssue(issues, 'schemaVersion', `must equal ${CAMPAIGN_MISSION_SCHEMA_VERSION}`);
  const contentVersion = readInteger(source.contentVersion, 'contentVersion', issues, 1);
  const rawMission = isRecord(source.mission) ? source.mission : {};
  if (!isRecord(source.mission)) addIssue(issues, 'mission', 'must be an object');
  const id = readString(rawMission.id, 'mission.id', issues, true);
  if (!KEBAB_CASE.test(id)) addIssue(issues, 'mission.id', 'must be a stable kebab-case identifier');
  let arena: CompiledArena | undefined;
  try { arena = compileArena(rawMission.arena); }
  catch (error) {
    if (error instanceof ContentValidationError) for (const arenaIssue of error.issues) addIssue(issues, `mission.arena.${arenaIssue.path}`, arenaIssue.message);
    else addIssue(issues, 'mission.arena', 'must be a valid Arena');
  }
  const startingLives = readInteger(rawMission.startingLives, 'mission.startingLives', issues, 1);
  const openingFieldCredits = readInteger(rawMission.openingFieldCredits, 'mission.openingFieldCredits', issues, 0);
  const constructionPolicy = rawMission.constructionPolicy === 'planning-only' || rawMission.constructionPolicy === 'live-foundation' ? rawMission.constructionPolicy : (addIssue(issues, 'mission.constructionPolicy', 'must be planning-only or live-foundation'), 'planning-only' as const);
  const planningDurationTicks = rawMission.planningDurationTicks === undefined ? 0 : readInteger(rawMission.planningDurationTicks, 'mission.planningDurationTicks', issues, 0);
  const earlyLaunchMaxCredits = rawMission.earlyLaunchMaxCredits === undefined ? 0 : readInteger(rawMission.earlyLaunchMaxCredits, 'mission.earlyLaunchMaxCredits', issues, 0);
  const twoStarLives = rawMission.twoStarLives === undefined ? undefined : readInteger(rawMission.twoStarLives, 'mission.twoStarLives', issues, 1);
  if (twoStarLives !== undefined && twoStarLives > startingLives) addIssue(issues, 'mission.twoStarLives', 'must not exceed startingLives');
  const towerCatalog = readTowerCatalog(rawMission.towerCatalog, 'mission.towerCatalog', issues);
  const creeps = readCreepCatalog(rawMission.creeps, 'mission.creeps', issues);
  const waves = readWaves(rawMission.waves, 'mission.waves', creeps, issues);
  const rawProgression = isRecord(source.progression) ? source.progression : {};
  if (!isRecord(source.progression)) addIssue(issues, 'progression', 'must be an object');
  const rawRequires = Array.isArray(rawProgression.requires) ? rawProgression.requires : (addIssue(issues, 'progression.requires', 'must be an array'), []);
  const requirements = new Set<string>();
  const requires = rawRequires.map((requirement, index) => {
    const path = `progression.requires[${index}]`;
    const requirementId = readString(requirement, path, issues, true);
    if (!KEBAB_CASE.test(requirementId)) addIssue(issues, path, 'must be a stable kebab-case identifier');
    if (requirements.has(requirementId)) addIssue(issues, path, 'must not contain duplicates');
    requirements.add(requirementId);
    return requirementId;
  });
  const progression = { requires, loans: readFamilies(rawProgression.loans, 'progression.loans', issues), awards: readFamilies(rawProgression.awards, 'progression.awards', issues) };
  progression.loans.forEach((familyId, index) => {
    if (towerCatalog[familyId] === undefined) {
      addIssue(issues, `progression.loans[${index}]`, `requires mission.towerCatalog.${familyId}`);
    }
  });
  if (issues.length > 0 || arena === undefined) throw new ContentValidationError(issues);
  const mission: CompiledMissionDefinition = {
    id, arena, startingLives, openingFieldCredits, constructionPolicy, planningDurationTicks,
    earlyLaunchMaxCredits, ...(twoStarLives === undefined ? {} : { twoStarLives }), towerCatalog, creeps, waves,
  };
  const hashInput = { schemaVersion: CAMPAIGN_MISSION_SCHEMA_VERSION, contentVersion, mission, progression };
  return deepFreeze({ ...hashInput, contentHash: fnv1a(JSON.stringify(canonicalize(hashInput))) });
};
