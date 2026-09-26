import sources from '@tower-defense/world-01/first-session/missions.json';
import { compileCampaignMission, type CampaignMissionSource, type CompiledCampaignMission } from '@tower-defense/content';
import { createMission } from '@tower-defense/sim';

const REQUIRED_IDS = ['world-01-mission-01', 'world-01-mission-02', 'world-01-rail-trial'] as const;

const failCatalog = (message: string): never => { throw new Error(`Invalid first-session catalog: ${message}`); };
const sameIds = (actual: readonly string[], expected: readonly string[]): boolean =>
  actual.length === expected.length && actual.every((id, index) => id === expected[index]);

export const compileFirstSessionCatalog = (sources: readonly unknown[]): readonly CompiledCampaignMission[] => {
  if (sources.length !== REQUIRED_IDS.length) failCatalog('must contain exactly three missions');
  const compiled = sources.map((source) => compileCampaignMission(source));
  const ids = compiled.map((entry) => entry.mission.id);
  if (!sameIds(ids, REQUIRED_IDS) || new Set(ids).size !== ids.length) failCatalog('must use the required connected mission path');
  compiled.forEach((entry, index) => {
    const expectedRequires = index === 0 ? [] : [REQUIRED_IDS[index - 1]!];
    if (!sameIds(entry.progression.requires, expectedRequires)) failCatalog(`mission ${entry.mission.id} has disconnected prerequisites`);
    if (index < 2 && (entry.progression.loans.length !== 0 || entry.progression.awards.length !== 0)) failCatalog(`mission ${entry.mission.id} cannot grant an opening trial`);
    const snapshot = createMission(entry.mission).getRenderSnapshot();
    if (snapshot.groundRoute.length < 2 || snapshot.airRoute.length < 2) failCatalog(`mission ${entry.mission.id} has an impossible initial route`);
  });
  const trial = compiled[2]!;
  if (!sameIds(trial.progression.loans, ['rail']) || !sameIds(trial.progression.awards, ['rail'])) failCatalog('Rail trial must loan and award Rail');
  return Object.freeze(compiled);
};

export const FIRST_SESSION_SOURCES: readonly CampaignMissionSource[] = Object.freeze(sources as CampaignMissionSource[]);
export const FIRST_SESSION_MISSIONS = compileFirstSessionCatalog(FIRST_SESSION_SOURCES);

export const getWaveForecasts = (entry: CompiledCampaignMission): readonly { waveId: string; total: number; counts: Record<string, number> }[] => Object.freeze(entry.mission.waves.map((wave) => {
  const counts: Record<string, number> = {};
  for (const group of wave.groups) counts[group.creepId] = (counts[group.creepId] ?? 0) + group.count;
  return Object.freeze({ waveId: wave.id, total: Object.values(counts).reduce((total, count) => total + count, 0), counts: Object.freeze(counts) });
}));
