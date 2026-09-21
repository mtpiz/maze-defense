import {
  TOWER_FAMILIES,
  type CreepDefinition,
  type TowerFamilyId,
} from '@tower-defense/content';
import {
  SIMULATION_TICKS_PER_SECOND,
  createMission,
  type CommandRejectionReason,
  type MissionCommand,
  type MissionDefinition,
  type MissionSession,
  type PresentationEvent,
  type RenderSnapshot,
  type UiSnapshot,
} from '@tower-defense/sim';
import { GATE_MISSION } from './gate-mission.js';

export interface FeedbackMessage {
  readonly sequence: number;
  readonly text: string;
  readonly tone: 'neutral' | 'success' | 'warning';
}

export interface BenchmarkViewState {
  readonly render: RenderSnapshot;
  readonly ui: UiSnapshot;
  readonly selectedTowerId: string | null;
  readonly specialistOptions: readonly SpecialistOption[];
  readonly recentEvents: readonly PresentationEvent[];
  readonly feedback: FeedbackMessage;
  readonly briefing: WaveBriefing;
}

export interface WaveBriefing {
  readonly title: string;
  readonly families: readonly { readonly definition: CreepDefinition; readonly count: number }[];
}

const createBriefings = (mission: MissionDefinition): readonly WaveBriefing[] => Object.freeze(mission.waves.map((wave) => {
  const counts = new Map<string, { definition: CreepDefinition; count: number }>();
  for (const group of wave.groups) {
    const definition = mission.creeps[group.creepId];
    if (definition === undefined) throw new Error(`Missing creep ${group.creepId}`);
    const entry = counts.get(group.creepId);
    counts.set(group.creepId, { definition, count: (entry?.count ?? 0) + group.count });
  }
  return Object.freeze({
    title: wave.id.split('-').map((word) => word[0]?.toUpperCase() + word.slice(1)).join(' '),
    families: Object.freeze([...counts.values()].map((entry) => Object.freeze(entry))),
  });
}));

export interface SpecialistOption {
  readonly familyId: Exclude<TowerFamilyId, 'foundation'>;
  readonly displayName: string;
  readonly fieldCreditCost: number;
}

export interface FrameAdvanceSample {
  readonly advancedTicks: number;
  readonly simulationMilliseconds: number;
}

export type BenchmarkListener = (state: BenchmarkViewState) => void;

const createSpecialistOptions = (mission: MissionDefinition): readonly SpecialistOption[] => Object.freeze(
  (['rail', 'siege', 'arc', 'gravity'] as const).filter((id) => mission.towerCatalog[id] !== undefined).map((familyId) => {
    const combat = mission.towerCatalog[familyId];
    if (combat === undefined) throw new Error(`Benchmark is missing ${familyId} combat content`);
    return Object.freeze({
      familyId,
      displayName: TOWER_FAMILIES[familyId].displayName,
      fieldCreditCost: combat.fieldCreditCost,
    });
  }),
);

const rejectionText: Readonly<Record<CommandRejectionReason, string>> = Object.freeze({
  'outside-arena': 'That cell is outside the Arena.',
  'inactive-cell': 'That cell is outside this Arena shape.',
  'reserved-cell': 'Spawn, exit, and Waypoint tiles must stay open.',
  'unbuildable-terrain': 'This terrain cannot support a tower.',
  'occupied-cell': 'A tower already occupies that tile.',
  'blocks-ground-route': 'Placement rejected: the ground route must remain open.',
  'wrong-phase': 'That action is unavailable in the current Mission phase.',
  'occupied-by-ground-creep': 'Wait for the Ground creep to clear that tile.',
  'insufficient-field-credits': 'Not enough Field Credits.',
  'tower-not-found': 'That tower is no longer present.',
  'specialist-unavailable': 'That specialist is not available in this Mission.',
  'tower-already-specialized': 'Refitting specialist families waits for a planning interval.',
  'tower-has-no-facing': 'Foundation towers do not have a mounted facing.',
  'invalid-speed': 'Only 1×, 2×, and 3× simulation speeds are supported.',
  'already-in-state': 'That setting is already active.',
  'mission-complete': 'The Mission is complete.',
});

export class BenchmarkController {
  #session: MissionSession;
  readonly #briefings: readonly WaveBriefing[];
  readonly #specialistOptions: readonly SpecialistOption[];
  #openingCommands: readonly MissionCommand[] = [];
  #listeners = new Set<BenchmarkListener>();
  #selectedTowerId: string | null = null;
  #feedbackSequence = 1;
  #feedback: FeedbackMessage = Object.freeze({
    sequence: 0,
    text: 'Opening plan ready. Rail and loaned Siege available.',
    tone: 'neutral',
  });
  #tickAccumulator = 0;
  #foreground = true;

  constructor(private readonly mission: MissionDefinition = GATE_MISSION) {
    this.#session = createMission(mission, 0x4e4d4432);
    this.#briefings = createBriefings(mission);
    this.#specialistOptions = createSpecialistOptions(mission);
  }

  subscribe(listener: BenchmarkListener): () => void {
    this.#listeners.add(listener);
    listener(this.getState());
    return () => this.#listeners.delete(listener);
  }

  getState(): BenchmarkViewState {
    return Object.freeze({
      render: this.#session.getRenderSnapshot(),
      ui: this.#session.getUiSnapshot(),
      selectedTowerId: this.#selectedTowerId,
      specialistOptions: this.#specialistOptions,
      recentEvents: Object.freeze([]),
      feedback: this.#feedback,
      briefing: this.#briefings[this.#session.getUiSnapshot().waveNumber - 1]!,
    });
  }

  tapCell(cell: number): void {
    const tower = this.#session.getRenderSnapshot().towers.find((candidate) => candidate.cell === cell);
    if (tower !== undefined) {
      this.#selectedTowerId = tower.id;
      this.#setFeedback(
        `${TOWER_FAMILIES[tower.familyId].displayName} ${tower.id.slice('tower-'.length)} selected.`,
        'neutral',
      );
      this.#publish();
      return;
    }

    const result = this.#session.dispatch({ type: 'place-foundation', cell });
    if (!result.accepted) {
      this.#setFeedback(rejectionText[result.reason], 'warning');
      this.#publish();
      return;
    }

    this.#selectedTowerId =
      this.#session.getRenderSnapshot().towers.find((candidate) => candidate.cell === cell)?.id ??
      null;
    this.#setFeedback('Foundation placed. Ground rerouted.', 'success');
    this.#publish();
  }

  clearSelection(): void {
    if (this.#selectedTowerId === null) return;
    this.#selectedTowerId = null;
    this.#publish();
  }

  dismantleSelected(): void {
    if (this.#selectedTowerId === null) return;
    const result = this.#session.dispatch({
      type: 'dismantle',
      towerId: this.#selectedTowerId,
    });
    if (!result.accepted) {
      this.#setFeedback(rejectionText[result.reason], 'warning');
    } else {
      this.#selectedTowerId = null;
      this.#setFeedback('Foundation dismantled and its route recomputed.', 'neutral');
    }
    this.#publish();
  }

  installSelected(familyId: Exclude<TowerFamilyId, 'foundation'>): void {
    if (this.#selectedTowerId === null) return;
    const result = this.#session.dispatch({
      type: 'install-specialist',
      towerId: this.#selectedTowerId,
      familyId,
    });
    if (!result.accepted) {
      this.#setFeedback(rejectionText[result.reason], 'warning');
    } else {
      this.#setFeedback(
        `${TOWER_FAMILIES[familyId].displayName} assembly started. Its maze tile is unchanged.`,
        'success',
      );
    }
    this.#publish();
  }

  startWave(): void {
    const opening = this.#session.getUiSnapshot().phase === 'opening';
    const commands = opening ? this.#session.createCheckpoint().commands
      .filter(({ accepted, command }) => accepted && (
        command.type === 'place-foundation' || command.type === 'install-specialist' ||
        command.type === 'aim-tower' || command.type === 'dismantle'
      )).map(({ command }) => command) : this.#openingCommands;
    const result = this.#session.dispatch({ type: opening ? 'start-wave' : 'early-launch' });
    if (!result.accepted) {
      this.#setFeedback(rejectionText[result.reason], 'warning');
    } else {
      this.#openingCommands = commands;
      this.#selectedTowerId = null;
      this.#setFeedback(
        `Wave ${this.#session.getUiSnapshot().waveNumber} launched.`,
        'neutral',
      );
    }
    this.#publish();
  }

  togglePause(): void {
    if (!this.#foreground) return;
    const ui = this.#session.getUiSnapshot();
    const result = this.#session.dispatch({ type: 'set-pause', paused: !ui.paused });
    if (!result.accepted) this.#setFeedback(rejectionText[result.reason], 'warning');
    else this.#setFeedback(ui.paused ? 'Mission resumed.' : 'Mission paused.', 'neutral');
    this.#publish();
  }

  aimSelected(facingMilliDegrees: number): void {
    if (this.#selectedTowerId === null) return;
    const tower = this.#session.getRenderSnapshot().towers.find(({ id }) => id === this.#selectedTowerId);
    const result = this.#session.dispatch({
      type: 'aim-tower',
      towerId: this.#selectedTowerId,
      facingMilliDegrees,
    });
    if (!result.accepted) {
      this.#setFeedback(rejectionText[result.reason], 'warning');
    } else {
      this.#setFeedback(
        `${TOWER_FAMILIES[tower?.familyId ?? 'foundation'].displayName} facing locked.`,
        'neutral',
      );
    }
    this.#publish();
  }

  setForeground(foreground: boolean): void {
    if (foreground === this.#foreground) return;
    this.#foreground = foreground;
    this.#tickAccumulator = 0;
    const ui = this.#session.getUiSnapshot();
    if (!foreground && !ui.paused && (ui.phase === 'wave' || ui.phase === 'planning')) {
      this.#session.dispatch({ type: 'set-pause', paused: true });
      this.#setFeedback('Paused while the app was inactive.', 'neutral');
      this.#publish();
    }
  }

  cycleSpeed(): void {
    const current = this.#session.getUiSnapshot().speed;
    const next = current === 1 ? 2 : current === 2 ? 3 : 1;
    const result = this.#session.dispatch({ type: 'set-speed', speed: next });
    if (!result.accepted) this.#setFeedback(rejectionText[result.reason], 'warning');
    this.#publish();
  }

  retry(restoreOpening = true): void {
    this.#session = createMission(this.mission, 0x4e4d4432);
    if (!restoreOpening) this.#openingCommands = [];
    for (const command of this.#openingCommands) this.#session.dispatch(command);
    this.#selectedTowerId = null;
    this.#tickAccumulator = 0;
    this.#setFeedback(restoreOpening ? 'Opening plan restored.' : 'New opening plan.', 'neutral');
    this.#publish();
  }

  get interpolationAlpha(): number { return this.#tickAccumulator; }

  advanceFrame(elapsedMilliseconds: number): FrameAdvanceSample | null {
    const ui = this.#session.getUiSnapshot();
    if (!this.#foreground || (ui.phase !== 'wave' && ui.phase !== 'planning') || ui.paused) {
      this.#tickAccumulator = 0;
      return null;
    }

    const boundedMilliseconds = Math.max(0, Math.min(elapsedMilliseconds, 100));
    this.#tickAccumulator +=
      (boundedMilliseconds * SIMULATION_TICKS_PER_SECOND * (ui.phase === 'planning' ? 1 : ui.speed)) / 1000;
    const wholeTicks = Math.floor(this.#tickAccumulator);
    if (wholeTicks === 0) return null;
    this.#tickAccumulator -= wholeTicks;

    const beforePhase = ui.phase;
    const simulationStartedAt = performance.now();
    const result = this.#session.advance(wholeTicks);
    const simulationMilliseconds = performance.now() - simulationStartedAt;
    if (result.advancedTicks === 0) return null;
    if (result.phase !== beforePhase) {
      this.#tickAccumulator = 0;
      this.#setFeedback(
        result.phase === 'victory'
          ? 'Mission clear.'
          : result.phase === 'defeat'
            ? 'Mission lost.'
          : result.phase === 'wave' ? `Wave ${this.#session.getUiSnapshot().waveNumber} launched.`
          : 'Wave clear. Allotment received.',
        result.phase === 'defeat' ? 'warning' : 'success',
      );
    }
    this.#publish();
    return Object.freeze({
      advancedTicks: result.advancedTicks,
      simulationMilliseconds,
    });
  }

  #setFeedback(text: string, tone: FeedbackMessage['tone']): void {
    this.#feedback = Object.freeze({
      sequence: this.#feedbackSequence,
      text,
      tone,
    });
    this.#feedbackSequence += 1;
  }

  #publish(): void {
    const events = this.#session.drainPresentationEvents();
    const leaks = events.filter(({ type }) => type === 'creep-leaked');
    const phase = this.#session.getUiSnapshot().phase;
    if (leaks.length > 0 && (phase === 'wave' || phase === 'planning')) {
      const lostLives = leaks.reduce((sum, event) => sum + Number(event.payload.lifeDamage), 0);
      const family = Object.values(this.mission.creeps).find((creep) => creep?.id === leaks[0]?.payload.creepType);
      this.#setFeedback(
        `${leaks.length === 1 ? family?.displayName ?? 'Creep' : `${leaks.length} creeps`} leaked. -${lostLives} ${lostLives === 1 ? 'Life' : 'Lives'}.`,
        'warning',
      );
    }
    const state = Object.freeze({
      ...this.getState(),
      recentEvents: events,
    });
    for (const listener of this.#listeners) listener(state);
  }
}
