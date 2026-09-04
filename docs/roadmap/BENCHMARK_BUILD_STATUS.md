# Core Combat Gate status

Status: Certified redesign recorded; representative combat implementation next  
Updated: 2026-09-03  
Engine candidate: PixiJS 8 + Preact + Capacitor 8

This is the live evidence log for the revised [Core Combat Gate](SIX_MONTH_PLAN.md#phase-1--core-combat-gate-weeks-14).
Compilation, emulator launch, or attractive proxy imagery cannot pass the Gate. Gameplay, physical-device
interaction, performance, and presentation-pipeline feasibility receive independent verdicts.

## Current conclusion

The existing baseline justifies continuing the bounded Pixi candidate. It does not justify a final
engine commitment:

- deterministic routing, Commands, rendering, touch construction, diagnostics, and Android packaging exist.
- emulator layout and preliminary performance are viable.
- representative combat, real creeps, Rail, Siege, purposeful waves, and results do not exist.
- no physical Android device evidence exists.
- the current procedural visuals do not prove the required presentation workflow.

The old benchmark rules are not product authority. Certified design changes are now implementation work.

## Known code-to-design differences

| Current baseline | Certified target |
|---|---|
| Active waves lock Foundation placement. | Legal Foundation placement remains available during waves. |
| Ground and Airborne use distinct tower-blocker masks. | All player towers block ground; no player tower blocks Airborne movement. |
| Moving shapes are route probes. | Deterministic creeps have health, targeting, damage, death, leaks, and results. |
| The 9×14 fixture is the only exercised shape. | 9×14 remains primary; a larger or irregular synthetic Arena proves content-defined geometry. |
| The benchmark has no representative weapons. | Gate slice uses Foundation, Rail, and loaned Siege. |
| There is no authored encounter. | Gate slice contains six to eight purposeful waves and predictable Field Credits. |

These differences should be corrected through tests at the existing Simulation Kernel and content
interfaces rather than patched into presentation code.

## Next implementation sequence

1. Write failing kernel and route tests for live Foundation placement, Airborne tower passability,
   ordered-Waypoint progress, and active-cell Arena shapes.
2. Implement deterministic creep spawn, movement, health, death, leak, Lives, and Mission results.
3. Add the shared targeting and weapon contracts; prove Rail lanes and Siege area damage end to end.
4. Compile a noncanonical six-to-eight-wave Gate Mission with Drones, Carapaces, Broodlings, and Gliders,
   guaranteed wave income, planning countdown, and Early Launch.
5. Render anticipation, shot, impact, damage, Armor, death, leak, route, and result feedback with one
   coherent provisional futuristic-player-versus-Brood kit.
6. Add semantic audio, haptics, accessibility budgets, the alternate-Arena fixture, and the
   100-creep/40-tower/3× stress fixture.
7. Install and measure on physical Android hardware, run available uncoached playtests, and record all
   four independent verdicts.

Do not build World Maps, Research, Schematics, cloud behavior, monetization, or production art during
this sequence.

## Implemented baseline

- Standalone successor npm workspace with no runtime import from the frozen prototype.
- Deep content, Simulation Kernel, application-controller, Pixi-presentation, Preact-UI, and native seams.
- Versioned validated Arena source with deterministic content hashing.
- Portrait 9×14 fixture with two ordered Waypoints and unbuildable terrain.
- Deterministic four-direction routing with repeated cells and edges and stable tie-breaking.
- Speculative placement rejection for reserved, terrain, occupied, bounds, and route-sealing failures.
- Fixed 30 Hz Mission Session with Commands, immutable snapshots, presentation-event IDs,
  checkpoints, and replay hashes.
- Foundation tap placement, drag painting, selection, phase handling, refunds, pause, and speed controls.
- Phone-first HUD, contextual sheet, dashed route, direction markers, faux-depth tiles, high contrast,
  reduced motion, and semantic build grid.
- Bounded diagnostics for frame cadence, fixed-step work, event volume, JavaScript heap, lifecycle gaps,
  and JSON report export.
- Portrait-locked Capacitor Android project.

Some implemented behavior reflects the superseded benchmark rules listed above and must change before
it counts as Gate evidence.

## Automated baseline evidence

| Check | Recorded result |
|---|---|
| Strict TypeScript project build | Pass |
| Content, route, Mission Session, and diagnostics suites | 18 tests passed before redesign |
| Generated-route invariant exercise | 40 seeds × 80 placement attempts |
| Production web bundle | Pass |
| JavaScript bundle | 335.49 kB raw / 106.66 kB gzip |
| Browser console warnings or errors in inspected run | 0 |
| Android `assembleDebug` | Pass on JDK 21 / API 36 |
| Android unit tests and lint | Pass |
| Debug APK | 4,331,956 bytes; SHA-256 `516ebc8979397cb37e7116927da78dc3db9c0f5dd6cf948a563b1ea48054e4d9` |
| npm audit | 0 critical, 0 high, 3 development-tool findings |

The audit findings are transitive Capacitor CLI development dependencies and were absent from the
shipped game bundle at the recorded baseline. Recheck rather than assuming this remains current.

## Browser and emulator evidence

The previous client was exercised at 390×844 and 320×568 CSS viewports without document overflow.
Tap and drag construction, placement rejection, pause, contrast, reduced motion, and the semantic grid
worked under the old phase-locking rules.

The debug APK installed and cold-launched on a Pixel 7 API 36 ARM64 emulator. The 9×14 Arena, HUD,
command sheet, system bars, and safe areas fit in portrait. One clean `gfxinfo` sample recorded 812
frames, 1.72% janky frames under Android's metric, no missed Vsyncs, and a 20 ms 99th percentile. The
in-app collector recorded 60.0 estimated FPS, a 16.8 ms frame p95, 0.0% 20+ ms frames, and 0.1 ms
maximum fixed-step work in that probe scene.

These values describe route probes, not representative combat. They cannot pass the performance track.

Background and resume retained the running WebView and Mission state in the emulator. Process memory
after the recorded run was 103,238 KB PSS and 234,236 KB RSS; sampled JavaScript heap was 9.5 MB. No
fatal exception, ANR, or crash appeared. Emulator Chromium warnings and high-input-latency samples
remain physical-device comparison items.

No physical Android device was attached. Thermal behavior, battery impact, real touch latency,
hardware lifecycle, low/mid/high device behavior, and TalkBack remain open.

## Gate verdicts

| Track | State | Evidence still required |
|---|---|---|
| Gameplay | Not tested | Complete representative Mission and uncoached observation |
| Device interaction | Emulator only | Physical touch, safe area, lifecycle, camera, and accessibility evidence |
| Performance | Probe baseline only | Representative and stress profiles, memory, heat, battery, and hitch analysis |
| Presentation pipeline | Not tested | Coherent asset import, animation, effects, audio, density, and production-cost assessment |

## Engine decision rule

Pixi remains the active candidate only through this bounded Gate. Each failed track names its cause:

- boring or convergent play causes gameplay iteration.
- poor touch or comprehension causes interaction and presentation repair.
- a specific technical failure may receive one written, time-boxed repair.
- persistent performance or presentation-pipeline failure causes one switch to Godot.

Final art direction is not a Gate verdict. Broad visual exploration starts after Gate 1; production
style locks only after the Strategy Gate and approval of one complete visual Mission.

## Current installable artifact

The recorded debug package is `android/app/build/outputs/apk/debug/app-debug.apk`. It is an internal
development build for installation and device testing, not a gameplay demo or release candidate.
Rebuild it after the certified rules are implemented before using it for new evidence.
