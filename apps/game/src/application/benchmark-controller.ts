import benchmarkArenaSource from '@tower-defense/world-01/benchmark.arena.json';
import {
  BENCHMARK_CREEPS,
  BENCHMARK_TOWERS,
  TOWER_FAMILIES,
  compileArena,
  type TowerFamilyId,
} from '@tower-defense/content';
import {
  SIMULATION_TICKS_PER_SECOND,
  createMission,
  type CommandRejectionReason,
  type MissionDefinition,
  type MissionSession,
  type PresentationEvent,
  type RenderSnapshot,
  type UiSnapshot,
} from '@tower-defense/sim';

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
}

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

const arena = compileArena(benchmarkArenaSource);

const SPECIALIST_OPTIONS: readonly SpecialistOption[] = Object.freeze(
  (['rail', 'siege'] as const).map((familyId) => {
    const combat = BENCHMARK_TOWERS[familyId];
    if (combat === undefined) throw new Error(`Benchmark is missing ${familyId} combat content`);
    return Object.freeze({
      familyId,
      displayName: TOWER_FAMILIES[familyId].displayName,
      fieldCreditCost: combat.fieldCreditCost,
    });
  }),
);

const BENCHMARK_MISSION: MissionDefinition = Object.freeze({
  id: 'routing-benchmark',
  arena,
  startingLives: 20,
  openingFieldCredits: 180,
  constructionPolicy: 'live-foundation',
  towerCatalog: BENCHMARK_TOWERS,
  creeps: BENCHMARK_CREEPS,
  waves: Object.freeze([
    Object.freeze({
      id: 'baseline-route',
      tacticalPurpose: 'Establish Ground movement through the authored Waypoint Chain.',
      groups: Object.freeze([
        Object.freeze({ creepId: 'drone', count: 2, firstSpawnTick: 0, intervalTicks: 30 }),
      ]),
    }),
    Object.freeze({
      id: 'compressed-route',
      tacticalPurpose: 'Show a compact Broodling group on the same route.',
      groups: Object.freeze([
        Object.freeze({ creepId: 'broodling', count: 3, firstSpawnTick: 0, intervalTicks: 12 }),
      ]),
    }),
    Object.freeze({
      id: 'armored-route',
      tacticalPurpose: 'Introduce slower Carapaces with higher leak pressure.',
      groups: Object.freeze([
        Object.freeze({ creepId: 'carapace', count: 2, firstSpawnTick: 0, intervalTicks: 45 }),
      ]),
    }),
    Object.freeze({
      id: 'airborne-route',
      tacticalPurpose: 'Contrast Airborne movement with the player-built Ground Route.',
      groups: Object.freeze([
        Object.freeze({ creepId: 'glider', count: 2, firstSpawnTick: 0, intervalTicks: 24 }),
      ]),
    }),
    Object.freeze({
      id: 'mixed-pressure',
      tacticalPurpose: 'Make Ground speed and durability compete for attention.',
      groups: Object.freeze([
        Object.freeze({ creepId: 'drone', count: 2, firstSpawnTick: 0, intervalTicks: 24 }),
        Object.freeze({ creepId: 'carapace', count: 1, firstSpawnTick: 18, intervalTicks: 1 }),
      ]),
    }),
    Object.freeze({
      id: 'layer-check',
      tacticalPurpose: 'Close with simultaneous Ground density and Airborne coverage pressure.',
      groups: Object.freeze([
        Object.freeze({ creepId: 'drone', count: 1, firstSpawnTick: 0, intervalTicks: 1 }),
        Object.freeze({ creepId: 'broodling', count: 1, firstSpawnTick: 12, intervalTicks: 1 }),
        Object.freeze({ creepId: 'glider', count: 1, firstSpawnTick: 24, intervalTicks: 1 }),
      ]),
    }),
  ]),
});

const rejectionText: Readonly<Record<CommandRejectionReason, string>> = Object.freeze({
  'outside-arena': 'That cell is outside the Arena.',
  'inactive-cell': 'That cell is outside this Arena shape.',
  'reserved-cell': 'Spawn, exit, and Waypoint tiles must stay open.',
  'unbuildable-terrain': 'This terrain cannot support a tower.',
  'occupied-cell': 'A tower already occupies that tile.',
  'blocks-ground-route': 'Placement rejected: the ground route must remain open.',
  'wrong-phase': 'That action is unavailable in the current Mission phase.',
  'occupied-by-ground-creep': 'Wait for the Ground creep to clear that tile.',
  'insufficient-field-credits': 'Not enough Field Credits for that Foundation.',
  'tower-not-found': 'That tower is no longer present.',
  'specialist-unavailable': 'That specialist is not available in this Mission.',
  'tower-already-specialized': 'Refitting specialist families waits for a planning interval.',
  'invalid-speed': 'Only 1×, 2×, and 3× simulation speeds are supported.',
  'already-in-state': 'That setting is already active.',
  'mission-complete': 'The routing benchmark is complete.',
});

export class BenchmarkController {
  #session: MissionSession = createMission(BENCHMARK_MISSION, 0x4e4d4432);
  #listeners = new Set<BenchmarkListener>();
  #selectedTowerId: string | null = null;
  #feedbackSequence = 1;
  #feedback: FeedbackMessage = Object.freeze({
    sequence: 0,
    text: 'Tap open tiles to construct Foundations. Keep the Ground Route connected.',
    tone: 'neutral',
  });
  #tickAccumulator = 0;

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
      specialistOptions: SPECIALIST_OPTIONS,
      recentEvents: Object.freeze([]),
      feedback: this.#feedback,
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
    this.#setFeedback('Foundation online. Ground rerouted; Airborne ignores towers.', 'success');
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
    const result = this.#session.dispatch({ type: 'start-wave' });
    if (!result.accepted) {
      this.#setFeedback(rejectionText[result.reason], 'warning');
    } else {
      this.#selectedTowerId = null;
      this.#setFeedback(
        'Wave launched. Live Foundation construction remains available; dismantling waits.',
        'neutral',
      );
    }
    this.#publish();
  }

  togglePause(): void {
    const ui = this.#session.getUiSnapshot();
    const result = this.#session.dispatch({ type: 'set-pause', paused: !ui.paused });
    if (!result.accepted) this.#setFeedback(rejectionText[result.reason], 'warning');
    this.#publish();
  }

  cycleSpeed(): void {
    const current = this.#session.getUiSnapshot().speed;
    const next = current === 1 ? 2 : current === 2 ? 3 : 1;
    const result = this.#session.dispatch({ type: 'set-speed', speed: next });
    if (!result.accepted) this.#setFeedback(rejectionText[result.reason], 'warning');
    this.#publish();
  }

  retry(): void {
    this.#session = createMission(BENCHMARK_MISSION, 0x4e4d4432);
    this.#selectedTowerId = null;
    this.#tickAccumulator = 0;
    this.#setFeedback('Benchmark reset to the same deterministic seed.', 'neutral');
    this.#publish();
  }

  advanceFrame(elapsedMilliseconds: number): FrameAdvanceSample | null {
    const ui = this.#session.getUiSnapshot();
    if (ui.phase !== 'wave' || ui.paused) {
      this.#tickAccumulator = 0;
      return null;
    }

    const boundedMilliseconds = Math.max(0, Math.min(elapsedMilliseconds, 100));
    this.#tickAccumulator +=
      (boundedMilliseconds * SIMULATION_TICKS_PER_SECOND * ui.speed) / 1000;
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
          ? 'Routing benchmark complete. The deterministic run is ready for review.'
          : result.phase === 'defeat'
            ? 'Core integrity lost. Review the route and retry.'
          : 'Wave clear. Dismantling and restructuring are available.',
        'success',
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
    const state = Object.freeze({
      render: this.#session.getRenderSnapshot(),
      ui: this.#session.getUiSnapshot(),
      selectedTowerId: this.#selectedTowerId,
      specialistOptions: SPECIALIST_OPTIONS,
      recentEvents: this.#session.drainPresentationEvents(),
      feedback: this.#feedback,
    });
    for (const listener of this.#listeners) listener(state);
  }
}
