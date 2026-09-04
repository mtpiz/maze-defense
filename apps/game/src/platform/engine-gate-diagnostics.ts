import type { PresentationEvent } from '@tower-defense/sim';

const DEFAULT_SAMPLE_CAPACITY = 3_600;
const LONG_FRAME_MILLISECONDS = 20;
const SUSPEND_GAP_MILLISECONDS = 250;

export interface SimulationFrameSample {
  readonly advancedTicks: number;
  readonly simulationMilliseconds: number;
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
    readonly estimatedFramesPerSecond: number;
    readonly longFrameCount: number;
    readonly longFramePercent: number;
    readonly discardedSuspendGaps: number;
  };
  readonly simulation: DiagnosticsSampleSummary & {
    readonly advancedTicks: number;
  };
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
  #startedAt: number;
  #discardedSuspendGaps = 0;
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
    this.#startedAt = this.#now();
  }

  recordFrame(
    frameIntervalMilliseconds: number,
    simulation: SimulationFrameSample | null,
  ): void {
    if (!isMeasurement(frameIntervalMilliseconds)) return;
    if (frameIntervalMilliseconds > SUSPEND_GAP_MILLISECONDS) {
      this.#discardedSuspendGaps += 1;
      return;
    }

    this.#frames.push(frameIntervalMilliseconds);

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
    const longFrames = frameValues.filter(
      (milliseconds) => milliseconds >= LONG_FRAME_MILLISECONDS,
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
      schemaVersion: 1,
      context,
      diagnostics: snapshot,
    },
    null,
    2,
  );
