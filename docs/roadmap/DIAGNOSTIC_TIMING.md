# Diagnostic timing contract

Updated: 2026-09-09. Export schema: 3. Simulation and stress fixture versions are unchanged.

The existing frame-interval collector measures delivery cadence, including foreground hitches. Its
20 ms / 40 ms long-frame thresholds follow the selected 60 / 30 FPS mode. Background/resume intervals
are handled separately. These intervals are not CPU render durations.

## CPU work

| Report field | Measurement boundary | Exclusions / overlap |
|---|---|---|
| `cpuWork.frameUpdate` | The Arena's application update callback, before scene drawing | Includes fixed-step simulation, synchronous subscribers, event consumption, and diagnostic bookkeeping. The separate simulation measurement is a subset, not additional work. |
| `cpuWork.scene` | Pixi scene updates and combat-label layout after the application callback | Includes sprite transforms and Graphics command generation. Does not include GPU submission. |
| `cpuWork.renderSubmission` | Immediately before and after Pixi's LOW-priority render listener | CPU-side render traversal and command submission, including any synchronous driver blocking. Not asynchronous GPU execution. |
| `cpuWork.uiCommit` | BenchmarkApp or GateStressApp root function entry through its layout effect | Root render/reconciliation/DOM-commit elapsed time. Excludes browser paint/compositing and child-only updates that do not render the root. It is not a per-frame sample or a pure CPU profiler. |

All summaries retain at most 3,600 observations by default. They report sample count, average, p50,
p95, p99, and maximum milliseconds. Zero is a valid result with a coarse performance clock; missing
work is identified by zero sample count, not by an invented duration. Invalid or hidden-state work
samples are excluded. Actual foreground work on the first resumed frame is retained even when that
frame's inter-frame interval includes an excluded suspend gap.

Reset sample and frame-rate changes clear all buckets. Work timings do not advance the simulation,
introduce another animation clock, or synchronize with the GPU. Do not add percentile values across
buckets or add the simulation subset to frameUpdate. `gpuTiming` is explicitly `not-measured`.

The September 9 Android regression records supported timer/disjoint extensions separately from
timing data. The dedicated API 36 emulator's WebView exposes none. Extension availability does not
itself measure GPU execution, and lack of support must not become an invented zero-duration sample.

## Comparable captures

Use the same build, device, GPU mode, fixture version, load, speed, and FPS target. Keep other stress
scenes closed. The Android capture script requires 120 creeps and 40 towers at both ends of a
45-second sample, with no hidden lifecycle event or discarded suspend interval. Schema 3 captures
must include every per-frame CPU bucket and at least one UI commit.

Reports also identify the active combat renderer. `proxy-v1` denotes the temporary imported atlas;
`high-contrast`, `loading`, and `fallback` must not be reported as a successful atlas stress run.
The current script requires `proxy-v1` at sample start and end. Update the expected artwork identity
explicitly when a replacement kit is integrated. Never lower the fixture load to accommodate art.

ADB compositor captures are the visual evidence on Android; WebView CDP screenshots omit its GPU
canvas. Host-GPU emulator results cannot establish phone thermal behavior, battery impact, actual
GPU time, or low/mid/high device suitability. Those Gate tracks remain open.

`android:iterate` and `android:verify` collect scripted Mission and lifecycle regression evidence.
They deliberately pause/background the app, export several UI snapshots, and read back canvas pixels.
Their frame distributions are not controlled stress benchmarks and must not be compared with the
uninterrupted 45-second samples above.
