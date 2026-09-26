import type { TowerFamilyId } from '@tower-defense/content';
import type { FrameAdvanceSample, BenchmarkViewState } from './benchmark-controller.js';
import { BenchmarkController } from './benchmark-controller.js';
import { FIRST_SESSION_MISSIONS } from './first-session-missions.js';
import {
  applyMissionResult,
  parsePlayerProfile,
  type MissionResult,
  type PlayerProfile,
} from './player-profile.js';

type SpecialistFamilyId = Exclude<TowerFamilyId, 'foundation'>;

export interface ProfileWriter {
  save(profile: PlayerProfile): Promise<{ revision: number }>;
}

export interface FirstSessionNode {
  readonly id: string;
  readonly locked: boolean;
  readonly bestStars: 0 | 1 | 2 | 3;
}

export interface FirstSessionResult {
  readonly missionId: string;
  readonly outcome: MissionResult['outcome'];
  readonly stars: 0 | 1 | 2 | 3;
  readonly awardedBlueprints: readonly SpecialistFamilyId[];
}

export interface FirstSessionView {
  readonly screen: 'mission' | 'results' | 'map';
  readonly profile: PlayerProfile;
  readonly activeMissionId: string | null;
  readonly mission: BenchmarkViewState | null;
  readonly nodes: readonly FirstSessionNode[];
  readonly mapAvailable: boolean;
  readonly loanedBlueprints: readonly SpecialistFamilyId[];
  readonly result: FirstSessionResult | null;
  readonly saveStatus: 'idle' | 'saving' | 'error';
  readonly saveError: string | null;
}

export type FirstSessionListener = (state: FirstSessionView) => void;

interface SaveAttempt {
  readonly promise: Promise<boolean>;
  settled: boolean;
}

const deepFreeze = <T>(value: T): T => {
  if (value !== null && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) deepFreeze(child);
    Object.freeze(value);
  }
  return value;
};

const detached = <T>(value: T): T => deepFreeze(structuredClone(value));

const specialistIds = (ids: readonly TowerFamilyId[]): SpecialistFamilyId[] =>
  ids.filter((id): id is SpecialistFamilyId => id !== 'foundation');

export class FirstSessionController {
  readonly #writer: ProfileWriter;
  #profile: PlayerProfile;
  #screen: FirstSessionView['screen'];
  #activeIndex: number | null = null;
  #controller: BenchmarkController | null = null;
  #controllerUnsubscribe: (() => void) | null = null;
  #missionState: BenchmarkViewState | null = null;
  #listeners = new Set<FirstSessionListener>();
  #result: FirstSessionResult | null = null;
  #saveStatus: FirstSessionView['saveStatus'] = 'idle';
  #saveError: string | null = null;
  #candidate: PlayerProfile | null = null;
  #savePromise: Promise<boolean> | null = null;
  #saveAttempt: SaveAttempt | null = null;
  #run = 0;
  #handledRun: number | null = null;
  #foreground = true;
  #disposed = false;

  constructor(profile: PlayerProfile, writer: ProfileWriter) {
    this.#profile = parsePlayerProfile(profile);
    this.#writer = writer;
    const initialIndex = this.#initialMissionIndex();
    if (initialIndex === null) {
      this.#screen = 'map';
    } else {
      this.#screen = 'mission';
      this.#openMission(initialIndex);
    }
  }

  get interpolationAlpha(): number {
    return this.#controller?.interpolationAlpha ?? 0;
  }

  getState(): FirstSessionView {
    const mapAvailable = this.#mapAvailable();
    const active = this.#screen === 'map' ? undefined : this.#activeEntry();
    return detached({
      screen: this.#screen,
      profile: this.#profile,
      activeMissionId: active?.mission.id ?? null,
      mission: this.#screen === 'map' ? null : this.#missionState,
      nodes: FIRST_SESSION_MISSIONS.map((entry) => ({
        id: entry.mission.id,
        locked: !this.#isUnlocked(entry.mission.id),
        bestStars: this.#profile.completedMissions[entry.mission.id] ?? 0,
      })),
      mapAvailable,
      loanedBlueprints: active === undefined ? [] : specialistIds(active.progression.loans),
      result: this.#result,
      saveStatus: this.#saveStatus,
      saveError: this.#saveError,
    });
  }

  subscribe(listener: FirstSessionListener): () => void {
    if (this.#disposed) return () => {};
    this.#listeners.add(listener);
    listener(this.getState());
    return () => this.#listeners.delete(listener);
  }

  dispose(): void {
    if (this.#disposed) return;
    this.#disposed = true;
    this.#detachMission();
    this.#listeners.clear();
  }

  selectMission(id: string): boolean {
    const index = FIRST_SESSION_MISSIONS.findIndex((entry) => entry.mission.id === id);
    if (!this.#canNavigate() || index < 0 || !this.#isUnlocked(id)) return false;
    this.#screen = 'mission';
    this.#result = null;
    this.#openMission(index);
    this.#publish();
    return true;
  }

  showMap(): boolean {
    if (!this.#canNavigate() || !this.#mapAvailable()) return false;
    this.#detachMission();
    this.#screen = 'map';
    this.#publish();
    return true;
  }

  retryMission(restoreOpening = true): boolean {
    if (!this.#canNavigate() || this.#controller === null) return false;
    this.#screen = 'mission';
    this.#result = null;
    this.#handledRun = null;
    this.#run += 1;
    this.#controller.retry(restoreOpening);
    this.#missionState = this.#controller.getState();
    this.#publish();
    return true;
  }

  retrySave(): Promise<boolean> {
    if (this.#disposed || this.#candidate === null) return Promise.resolve(false);
    if (this.#savePromise !== null) return this.#savePromise;
    if (this.#saveStatus !== 'error') return Promise.resolve(false);
    this.#saveStatus = 'saving';
    this.#saveError = null;
    this.#publish();
    return this.#beginSave(this.#candidate);
  }

  tapCell(cell: number): void { this.#withGameplay((controller) => controller.tapCell(cell)); }
  clearSelection(): void { this.#withGameplay((controller) => controller.clearSelection()); }
  dismantleSelected(): void { this.#withGameplay((controller) => controller.dismantleSelected()); }
  installSelected(familyId: SpecialistFamilyId): void { this.#withGameplay((controller) => controller.installSelected(familyId)); }
  aimSelected(facingMilliDegrees: number): void { this.#withGameplay((controller) => controller.aimSelected(facingMilliDegrees)); }
  startWave(): void { this.#withGameplay((controller) => controller.startWave()); }
  togglePause(): void { this.#withGameplay((controller) => controller.togglePause()); }
  cycleSpeed(): void { this.#withGameplay((controller) => controller.cycleSpeed()); }

  setForeground(foreground: boolean): void {
    this.#foreground = foreground;
    this.#controller?.setForeground(foreground);
  }

  advanceFrame(elapsedMilliseconds: number): FrameAdvanceSample | null {
    if (!this.#canPlay() || this.#controller === null) return null;
    return this.#controller.advanceFrame(elapsedMilliseconds);
  }

  #initialMissionIndex(): number | null {
    const mapAvailable = this.#mapAvailable();
    if (this.#profile.destination.kind === 'mission') {
      const missionId = this.#profile.destination.missionId;
      const index = FIRST_SESSION_MISSIONS.findIndex((entry) => entry.mission.id === missionId);
      if (index >= 0 && this.#isUnlocked(missionId)) return index;
    }
    return mapAvailable ? null : 0;
  }

  #openMission(index: number): void {
    this.#detachMission();
    this.#activeIndex = index;
    this.#controller = new BenchmarkController(FIRST_SESSION_MISSIONS[index]!.mission);
    this.#controller.setForeground(this.#foreground);
    this.#missionState = this.#controller.getState();
    this.#run += 1;
    this.#handledRun = null;
    this.#controllerUnsubscribe = this.#controller.subscribe((state) => {
      if (this.#disposed || this.#controller === null) return;
      this.#missionState = state;
      this.#handleTerminal(state);
      if (this.#saveStatus !== 'saving' || this.#handledRun !== this.#run) this.#publish();
    });
  }

  #handleTerminal(state: BenchmarkViewState): void {
    if (this.#handledRun === this.#run || (state.ui.phase !== 'victory' && state.ui.phase !== 'defeat')) return;
    const entry = this.#activeEntry();
    if (entry === undefined) return;
    this.#handledRun = this.#run;
    const result: MissionResult = state.ui.phase === 'victory'
      ? { outcome: 'victory', stars: state.ui.stars as 1 | 2 | 3 }
      : { outcome: 'defeat', stars: 0 };
    const candidate = result.outcome === 'victory' ? applyMissionResult(this.#profile, entry, result) : null;
    const awardedBlueprints = candidate === null ? [] : specialistIds(entry.progression.awards)
      .filter((id) => !this.#profile.unlockedBlueprints.includes(id));
    this.#result = {
      missionId: entry.mission.id,
      outcome: result.outcome,
      stars: result.stars,
      awardedBlueprints,
    };
    if (candidate === null) {
      this.#screen = 'results';
      this.#publish();
      return;
    }
    this.#candidate = candidate;
    this.#screen = 'results';
    this.#saveStatus = 'saving';
    this.#saveError = null;
    this.#publish();
    this.#beginSave(candidate);
  }

  #beginSave(candidate: PlayerProfile): Promise<boolean> {
    let resolve!: (value: boolean) => void;
    const promise = new Promise<boolean>((resolvePromise) => { resolve = resolvePromise; });
    const attempt: SaveAttempt = { promise, settled: false };
    this.#saveAttempt = attempt;
    this.#savePromise = promise;
    const finish = (success: boolean, error?: unknown): void => {
      if (attempt.settled) return;
      attempt.settled = true;
      this.#finishSave(attempt, candidate, success, error);
      resolve(success);
    };
    try {
      Promise.resolve(this.#writer.save(candidate)).then(
        () => finish(true),
        (error: unknown) => finish(false, error),
      );
    } catch (error) {
      finish(false, error);
    }
    return promise;
  }

  #finishSave(attempt: SaveAttempt, candidate: PlayerProfile, success: boolean, error?: unknown): void {
    if (this.#saveAttempt !== attempt) return;
    this.#saveAttempt = null;
    if (this.#savePromise === attempt.promise) this.#savePromise = null;
    if (this.#disposed || this.#candidate !== candidate) return;
    if (success) {
      this.#profile = candidate;
      this.#candidate = null;
      this.#saveStatus = 'idle';
      this.#saveError = null;
    } else {
      this.#saveStatus = 'error';
      this.#saveError = error instanceof Error ? error.message : String(error);
    }
    this.#publish();
  }

  #withGameplay(action: (controller: BenchmarkController) => void): void {
    if (!this.#canPlay() || this.#controller === null) return;
    action(this.#controller);
  }

  #canPlay(): boolean {
    return !this.#disposed && this.#screen === 'mission' && this.#saveStatus === 'idle';
  }

  #canNavigate(): boolean {
    return !this.#disposed && this.#saveStatus === 'idle';
  }

  #mapAvailable(): boolean {
    return this.#profile.completedMissions[FIRST_SESSION_MISSIONS[0]!.mission.id] !== undefined;
  }

  #isUnlocked(id: string): boolean {
    const entry = FIRST_SESSION_MISSIONS.find((candidate) => candidate.mission.id === id);
    return entry !== undefined && entry.progression.requires.every((required) => this.#profile.completedMissions[required] !== undefined);
  }

  #activeEntry() {
    return this.#activeIndex === null ? undefined : FIRST_SESSION_MISSIONS[this.#activeIndex];
  }

  #detachMission(): void {
    this.#controllerUnsubscribe?.();
    this.#controllerUnsubscribe = null;
    this.#controller = null;
    this.#missionState = null;
    this.#activeIndex = null;
    this.#handledRun = null;
  }

  #publish(): void {
    if (this.#disposed) return;
    const state = this.getState();
    for (const listener of this.#listeners) listener(state);
  }
}
