import type { PresentationEvent } from '@tower-defense/sim';

const DEFAULT_SAMPLE_CAPACITY = 3_600;

export interface SimulationFrameSample {
  readonly advancedTicks: number;
  readonly simulationMilliseconds: number;
}

export interface FrameWorkSample {
  readonly updateMilliseconds: number;
  readonly sceneMilliseconds: number;
  readonly renderSubmissionMilliseconds: number;
}

export interface JsHeapSample {
  readonly usedBytes: number;
  readonly totalBytes: number;
  readonly limitBytes: number;
}

export interface DiagnosticsLifecycleEvent {
  readonly type: string;
  readonly elapsedMilliseconds: number;
}

export interface DiagnosticsSampleSummary {
  readonly sampleCount: number;
  readonly averageMilliseconds: number;
  readonly p50Milliseconds: number;
  readonly p95Milliseconds: number;
  readonly p99Milliseconds: number;
  readonly maxMilliseconds: number;
}

export interface EngineGateDiagnosticsSnapshot {
  readonly sampleDurationMilliseconds: number;
  readonly frames: DiagnosticsSampleSummary & {
    readonly targetFramesPerSecond: 30 | 60;
    readonly longFrameThresholdMilliseconds: number;
    readonly estimatedFramesPerSecond: number;
    readonly longFrameCount: number;
    readonly longFramePercent: number;
    readonly discardedSuspendGaps: number;
  };
  readonly simulation: DiagnosticsSampleSummary & {
    readonly advancedTicks: number;
  };
  readonly cpuWork: {
    readonly frameUpdate: DiagnosticsSampleSummary;
    readonly scene: DiagnosticsSampleSummary;
    readonly renderSubmission: DiagnosticsSampleSummary;
    readonly uiCommit: DiagnosticsSampleSummary;
  };
  readonly gpuTiming: 'not-measured';
  readonly presentationEvents: {
    readonly total: number;
    readonly byType: Readonly<Record<string, number>>;
  };
  readonly jsHeap: {
    readonly current: JsHeapSample | null;
    readonly peakUsedBytes: number | null;
  };
  readonly lifecycle: readonly DiagnosticsLifecycleEvent[];
}

export interface DiagnosticsReportContext {
  readonly [key: string]: string | number | boolean | null;
}

interface DiagnosticsOptions {
  readonly sampleCapacity?: number;
  readonly now?: () => number;
}

class RollingNumbers {
  readonly #capacity: number;
  #values: number[] = [];
  #cursor = 0;

  constructor(capacity: number) {
    this.#capacity = capacity;
  }

  push(value: number): void {
    if (this.#values.length < this.#capacity) {
      this.#values.push(value);
      return;
    }

    this.#values[this.#cursor] = value;
    this.#cursor = (this.#cursor + 1) % this.#capacity;
  }

  values(): readonly number[] {
    if (this.#values.length < this.#capacity || this.#cursor === 0) {
      return [...this.#values];
    }
    return [...this.#values.slice(this.#cursor), ...this.#values.slice(0, this.#cursor)];
  }

  clear(): void {
    this.#values = [];
    this.#cursor = 0;
  }
}

const isMeasurement = (value: number): boolean => Number.isFinite(value) && value >= 0;

const percentile = (sorted: readonly number[], fraction: number): number => {
  if (sorted.length === 0) return 0;
  const index = Math.max(0, Math.ceil(sorted.length * fraction) - 1);
  return sorted[index] ?? 0;
};

const summarize = (values: readonly number[]): DiagnosticsSampleSummary => {
  if (values.length === 0) {
    return Object.freeze({
      sampleCount: 0,
      averageMilliseconds: 0,
      p50Milliseconds: 0,
      p95Milliseconds: 0,
      p99Milliseconds: 0,
      maxMilliseconds: 0,
    });
  }

  const sorted = [...values].sort((left, right) => left - right);
  const total = values.reduce((sum, value) => sum + value, 0);
  return Object.freeze({
    sampleCount: values.length,
    averageMilliseconds: total / values.length,
    p50Milliseconds: percentile(sorted, 0.5),
    p95Milliseconds: percentile(sorted, 0.95),
    p99Milliseconds: percentile(sorted, 0.99),
    maxMilliseconds: sorted.at(-1) ?? 0,
  });
};

const freezeHeapSample = (sample: JsHeapSample): JsHeapSample =>
  Object.freeze({
    usedBytes: sample.usedBytes,
    totalBytes: sample.totalBytes,
    limitBytes: sample.limitBytes,
  });

export class EngineGateDiagnostics {
  readonly #now: () => number;
  readonly #frames: RollingNumbers;
  readonly #simulation: RollingNumbers;
  readonly #frameUpdate: RollingNumbers;
  readonly #scene: RollingNumbers;
  readonly #renderSubmission: RollingNumbers;
  readonly #uiCommit: RollingNumbers;
  #startedAt: number;
  #visible = true;
  #discardNextFrame = false;
  #discardedSuspendGaps = 0;
  #frameRate: 30 | 60 = 60;
  #advancedTicks = 0;
  #presentationEventCount = 0;
  #presentationEventsByType = new Map<string, number>();
  #currentHeap: JsHeapSample | null = null;
  #peakUsedHeapBytes: number | null = null;
  #lifecycle: DiagnosticsLifecycleEvent[] = [];

  constructor(options: DiagnosticsOptions = {}) {
    const capacity = options.sampleCapacity ?? DEFAULT_SAMPLE_CAPACITY;
    if (!Number.isInteger(capacity) || capacity <= 0) {
      throw new Error('Diagnostics sample capacity must be a positive integer');
    }

    this.#now = options.now ?? (() => performance.now());
    this.#frames = new RollingNumbers(capacity);
    this.#simulation = new RollingNumbers(capacity);
    this.#frameUpdate = new RollingNumbers(capacity);
    this.#scene = new RollingNumbers(capacity);
    this.#renderSubmission = new RollingNumbers(capacity);
    this.#uiCommit = new RollingNumbers(capacity);
    this.#startedAt = this.#now();
  }

  recordFrame(
    frameIntervalMilliseconds: number,
    simulation: SimulationFrameSample | null,
  ): void {
    if (!isMeasurement(frameIntervalMilliseconds)) return;
    if (!this.#visible || this.#discardNextFrame) {
      this.#discardedSuspendGaps += 1;
    } else {
      this.#frames.push(frameIntervalMilliseconds);
    }
    this.#discardNextFrame = !this.#visible;

    if (
      simulation === null ||
      !Number.isInteger(simulation.advancedTicks) ||
      simulation.advancedTicks <= 0 ||
      !isMeasurement(simulation.simulationMilliseconds)
    ) {
      return;
    }

    this.#simulation.push(simulation.simulationMilliseconds);
    this.#advancedTicks += simulation.advancedTicks;
  }

  recordPresentationEvents(events: readonly PresentationEvent[]): void {
    for (const event of events) {
      this.#presentationEventCount += 1;
      this.#presentationEventsByType.set(
        event.type,
        (this.#presentationEventsByType.get(event.type) ?? 0) + 1,
      );
    }
  }

  recordMemory(sample: JsHeapSample | null): void {
    if (
      sample === null ||
      !isMeasurement(sample.usedBytes) ||
      !isMeasurement(sample.totalBytes) ||
      !isMeasurement(sample.limitBytes)
    ) {
      return;
    }

    this.#currentHeap = freezeHeapSample(sample);
    this.#peakUsedHeapBytes = Math.max(this.#peakUsedHeapBytes ?? 0, sample.usedBytes);
  }

  recordVisibility(visible: boolean): void {
    this.#visible = visible;
    // The first resumed interval still includes time spent in the background.
    if (!visible) this.#discardNextFrame = true;
    this.recordLifecycle(`visibility:${visible ? 'visible' : 'hidden'}`);
  }

  recordFrameWork(sample: FrameWorkSample): void {
    if (!this.#visible || !isMeasurement(sample.updateMilliseconds) || !isMeasurement(sample.sceneMilliseconds)
      || !isMeasurement(sample.renderSubmissionMilliseconds)) return;
    this.#frameUpdate.push(sample.updateMilliseconds);
    this.#scene.push(sample.sceneMilliseconds);
    this.#renderSubmission.push(sample.renderSubmissionMilliseconds);
  }

  recordUiCommit(milliseconds: number): void {
    if (this.#visible && isMeasurement(milliseconds)) this.#uiCommit.push(milliseconds);
  }

  setFrameRate(frameRate: 30 | 60): void {
    if (frameRate === this.#frameRate) return;
    this.#frameRate = frameRate;
    this.reset();
    this.recordLifecycle(`frame-rate:${frameRate}`);
  }

  recordLifecycle(type: string): void {
    this.#lifecycle.push(
      Object.freeze({
        type,
        elapsedMilliseconds: Math.max(0, this.#now() - this.#startedAt),
      }),
    );
    if (this.#lifecycle.length > 64) this.#lifecycle.shift();
  }

  snapshot(): EngineGateDiagnosticsSnapshot {
    const frameValues = this.#frames.values();
    const frameSummary = summarize(frameValues);
    const simulationSummary = summarize(this.#simulation.values());
    const longFrameThresholdMilliseconds = 1_200 / this.#frameRate;
    const longFrames = frameValues.filter(
      (milliseconds) => milliseconds >= longFrameThresholdMilliseconds,
    ).length;
    const framesPerSecond =
      frameSummary.averageMilliseconds === 0
        ? 0
        : 1000 / frameSummary.averageMilliseconds;
    const byType = Object.fromEntries(
      [...this.#presentationEventsByType.entries()].sort(([left], [right]) =>
        left.localeCompare(right),
      ),
    );

    return Object.freeze({
      sampleDurationMilliseconds: Math.max(0, this.#now() - this.#startedAt),
      frames: Object.freeze({
        ...frameSummary,
        targetFramesPerSecond: this.#frameRate,
        longFrameThresholdMilliseconds,
        estimatedFramesPerSecond: framesPerSecond,
        longFrameCount: longFrames,
        longFramePercent:
          frameSummary.sampleCount === 0
            ? 0
            : (longFrames / frameSummary.sampleCount) * 100,
        discardedSuspendGaps: this.#discardedSuspendGaps,
      }),
      simulation: Object.freeze({
        ...simulationSummary,
        advancedTicks: this.#advancedTicks,
      }),
      cpuWork: Object.freeze({
        frameUpdate: summarize(this.#frameUpdate.values()),
        scene: summarize(this.#scene.values()),
        renderSubmission: summarize(this.#renderSubmission.values()),
        uiCommit: summarize(this.#uiCommit.values()),
      }),
      gpuTiming: 'not-measured',
      presentationEvents: Object.freeze({
        total: this.#presentationEventCount,
        byType: Object.freeze(byType),
      }),
      jsHeap: Object.freeze({
        current: this.#currentHeap,
        peakUsedBytes: this.#peakUsedHeapBytes,
      }),
      lifecycle: Object.freeze([...this.#lifecycle]),
    });
  }

  reset(): void {
    this.#frames.clear();
    this.#simulation.clear();
    this.#frameUpdate.clear();
    this.#scene.clear();
    this.#renderSubmission.clear();
    this.#uiCommit.clear();
    this.#startedAt = this.#now();
    this.#discardedSuspendGaps = 0;
    this.#advancedTicks = 0;
    this.#presentationEventCount = 0;
    this.#presentationEventsByType.clear();
    this.#currentHeap = null;
    this.#peakUsedHeapBytes = null;
    this.#lifecycle = [];
  }
}

interface MemoryPerformance extends Performance {
  readonly memory?: {
    readonly usedJSHeapSize: number;
    readonly totalJSHeapSize: number;
    readonly jsHeapSizeLimit: number;
  };
}

export const readJsHeapSample = (): JsHeapSample | null => {
  const memory = (performance as MemoryPerformance).memory;
  if (memory === undefined) return null;
  return freezeHeapSample({
    usedBytes: memory.usedJSHeapSize,
    totalBytes: memory.totalJSHeapSize,
    limitBytes: memory.jsHeapSizeLimit,
  });
};

export const serializeDiagnosticsReport = (
  snapshot: EngineGateDiagnosticsSnapshot,
  context: DiagnosticsReportContext,
): string =>
  JSON.stringify(
    {
      schemaVersion: 3,
      context,
      diagnostics: snapshot,
    },
    null,
    2,
  );
