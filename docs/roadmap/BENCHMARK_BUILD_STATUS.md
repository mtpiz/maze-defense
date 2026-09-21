# Core Combat Gate status

Status: Neon V3 comparison active; original benchmark preserved; Gate remains open
Updated: 2026-09-21
Engine candidate: PixiJS 8 + Preact + Capacitor 8

This is the live evidence log for the revised [Core Combat Gate](SIX_MONTH_PLAN.md#phase-1--core-combat-gate-weeks-14).
Compilation, emulator launch, or attractive proxy imagery cannot pass the Gate. Gameplay, physical-device
interaction, performance, and presentation-pipeline feasibility receive independent verdicts.

## Current conclusion

Phase 2 planning update (2026-09-21): the owner approved the current neon design as the working
baseline and requested Astra-led architecture with delegated task packets. The
[Phase 2 work board](phase-02/README.md) now tracks eight bounded packets and architect-owned
acceptance checks. The Mission compiler packet was implemented by Euclid (Terra medium) in an isolated
worktree, reviewed by Astra, and integrated after correcting loan validation, source types, and unit-test
typing. Its 17 independent acceptance checks and 258 normal regression tests passed. The local-profile
packet now has a frozen API and 16 architect-owned failure-injection
cases and is ready, but is not dispatched in this round. Later implementation packets require their
named prerequisites and Astra-authored tests before dispatch. This is not a declaration that the four
Core Combat evidence tracks have all passed.

The existing baseline justifies continuing the bounded Pixi candidate. It does not justify a final
engine commitment:

- deterministic routing, Commands, rendering, touch construction, diagnostics, and Android packaging exist.
- the Windows JDK 21 / API 36 toolchain can build the current APK and run a dedicated emulator.
- deterministic creeps, Foundation/Rail/Siege combat, six authored waves, income, planning, and results exist.
- simulation 8 repairs live segment continuity; lifecycle-aware diagnostics retain foreground hitches.
- native settings persist across process restarts; cue budgets and audio/haptic cleanup are implemented.
- active waves and planning auto-pause on background; explicit Resume is required on return.
- persisted 30/60 FPS modes share one presentation/update clock; native texture warnings are repaired.
- one-command local Android build/install and reproducible full-load stress capture are implemented.
- one-command build/install/Mission/lifecycle/retry regression retains build-linked native evidence.
- physical install/launch pipeline evidence now exists, but host-GPU emulator figures remain not-device benchmarks.
- temporary imported unit assets, fallback rendering, and CPU phase timings are implemented and emulator-tested.
- September 9 stress cadence is below the prior identical-APK baseline; the cause remains unresolved.
- ten Nano Banana HUD/arena concepts and ten silhouettes each for Siege and Rail are ready for owner review; no final style is approved.

The old benchmark rules are not product authority. Continue the bounded Gate, repair the confirmed
defects, and collect comparable evidence before expanding scope or making an engine commitment.

## Current Ground Crowd Update (2026-09-21)

Simulation version 12 replaces the historical single-file Ground queue below with cell-width 2D
crowds, simultaneous entrance bursts, body collisions, and weight-based local displacement. Runners
can pass and push lighter units; heavy units resist displacement. Ground contact is allowed without
an extra spacing margin, while intersection and wall penetration remain forbidden.

The owner's smoothness follow-up reduces red collision radii to match their small outlines, increases
runner art slightly, and nearly doubles armored art. Stable passing-side steering, gradual avoidance,
partial wall-contact steps, and waiting behind impassable bodies reduce twitching. Snapshot interpolation
bridges 30 Hz combat to the render cadence and accounts for 2x/3x speed and pause/resume. Ground body
size no longer pulses. The original benchmark and earlier visual artifacts remain preserved.

Verification: 19 Node tests and 235 Vitest tests passed, including contact, anti-oscillation, passing,
dense turns, opposing traffic, deterministic replay, and the unchanged Gate role outcomes. The final
pause/resume refinement also passed all 11 renderer tests. TypeScript, production web build, Android
unit checks, lint, and debug assembly passed. Mobile and desktop browser captures showed 37 active
creeps, moving nonblank canvases, no overflow, and no page errors. A read-only physical S25+ capture
observed a live wave with a fitted canvas and changing frames. This is smoke evidence, not a measured
device-performance verdict or owner acceptance of the final movement feel.

Final packaged build: `artifacts/builds/maze-defense-debug-105dc2681e62.apk`, SHA-256
`105dc2681e62c9aec65bc7d289edf9f947911346849005fd1d33c0eeb918e6ca`, installed and launched on
the paired Samsung S25+ with `npm run android:phone`. The live phone capture above is from the
immediately preceding `d26a7888c21e` build; the final change only clears interpolation on pause/resume.

## Historical Focused Comparison (2026-09-20)

Neon V3 is the active visual comparison; the original benchmark remains preserved. The focused pass has
an empty opening board, compact HUD, Rail range of 2.5 cells with a 90-degree arc, a directional range
rotation handle, an animated dashed route with reverse-edge offsets, directional spawn/exit arrows,
muted Foundation presentation, and a synchronized direct Foundation radial upgrade flow.

The current follow-up reduces tower art to 80% of its prior footprint, moves rotation input to the
outer edge of the visible range sector, adds a fine cyan board perimeter, and brightens the compact
level-one Rail tracer without enlarging it. Geometry Wars 3 references now guide creep presentation:
outlined geometric bodies, dark centers, eased cornering, and deterministic family-weighted offsets
create a readable swarm while leaving route position, targeting, and balance in the simulation unchanged.

The follow-up Android build passed 19 Node script tests, 219 Vitest tests, TypeScript, the production
web build, native unit checks, lint, and debug assembly. The staged artifact is
`maze-defense-debug-71684062bec1.apk`, SHA-256
`71684062bec190034926a15dc8adf6a30caffefef3b3dc25389ea861ceb5962a`. It is not yet installed-device
evidence: the S25+ stopped accepting its previously advertised wireless ADB endpoint before install.

Ground occupancy is now a simulation rule in version 10. Mass-derived spacing, FIFO entrance admission,
and follower speed caps prevent Ground creeps from coexisting or overtaking; Airborne creeps bypass
that queue. Ground visual motion is lateral only. Gate role tuning raises Broodlings to 28 health and
the Siege blast to 30 damage: two mixed layouts clear, while Rail-only, Siege-only, and the undeveloped
opening fail. The full pipeline passed 19 Node and 221 Vitest tests plus TypeScript, web build, native
unit checks, lint, and assembly. The staged APK is `maze-defense-debug-944fcaad0383.apk`, SHA-256
`944fcaad0383b1c85a549e586a71fe359df5a9ec3e0e7fa40dda10829487dca6`.
That exact artifact installed and launched successfully on the authorized Samsung S25+ over wireless
ADB. This is deployment evidence, not a physical playtest or device-performance verdict.

Level-one Rail is now single-target (`maxTargets: 1`), with penetration reserved for an upgrade. Its
Gate damage is 52 at the existing 75-tick cadence; the short rounded tracer is unchanged. Two mixed
Rail/Siege layouts clear while Rail-only, Siege-only, and the undeveloped opening fail. The full
pipeline passed 19 Node and 221 Vitest tests plus TypeScript, web build, native unit checks, lint, and
assembly. `maze-defense-debug-e40fd8721a37.apk` (SHA-256
`e40fd8721a37592a5448cb071461d691733275b876b2f60f5d0ee9efe07465f9`) installed and launched on
the authorized Samsung S25+; device feel and balance still require the owner's playtest.

`npm run android:phone` successfully used the wireless ADB physical install pipeline to install
`maze-defense-debug-d1f3009cae6a.apk` on Samsung S25+ `SM-S936U`, SHA-256
`d1f3009cae6a686641d646cb53c9bd4586d4c828b852d5fd141e818f06cd317f`. This is physical-device
install/launch task evidence only: it is not touch, performance, audio, haptic, or playtest
certification.

## Current build and startup recovery (2026-09-10)

The latest complete `npm run android:iterate -- emulator-5554` passed with 148 Vitest tests across
18 files plus 14 Node verifier tests, for 162 tests total. Build, typecheck, native unit, lint,
assemble, install, and the scripted six-wave native mission also passed; the mission retained 18
Lives. Native Preferences reads now use a 2-second timeout and one read-only retry. If both attempts
fail, effects and haptics default to false; loading performs no writes and ignores late callbacks.

The current installable debug APK is `artifacts/builds/maze-defense-debug-7bc9a27c2ff9.apk`, created
`2026-09-10T03:32:37.4804424Z`, 5,647,532 bytes, SHA-256
`7bc9a27c2ff93e0975b6719e87b56c6bd0dd3bc3f8d073afefe349d39c42e409`. The compact native report is
[`report.json`](../../artifacts/android-verification/2026-09-10T03-32-43.835Z/report.json).
The follow-up `android:verify` run now includes the exact stress-to-root navigation that previously
left the old APK blank. It passed on `7bc9`: six waves, 18 Lives, 198 defeats, two leaks, explicit
wave/planning Resume, opening retry, and a nonblank reloaded opening with all six saved settings
unchanged. The native compositor image was inspected; the opening fits the 412x839 viewport and
the 824x1118 canvas reports zero WebGL errors. App-process error checks and CDP-forward cleanup
passed. See the [follow-up report](../../artifacts/android-verification/2026-09-11T01-49-58.690Z/report.json)
and [reload screenshot](../../artifacts/android-verification/2026-09-11T01-49-58.690Z/document-reload.png).
One added setting-preservation regression brings the Node suite to 15 passing tests; with the
unchanged 148-test Vitest suite, the verified total is now 163. No APK rebuild was needed for this
verifier-only addition. This successful native navigation plus deterministic lost-callback tests
establishes recovery coverage, not proof of the suspected upstream native-bridge race.

The older 158-test / `36ac` run remains historical. Its September 9 stress follow-up remains
unresolved: 34.19 / 27.33 / 33.44 FPS
were old-APK timings, not measurements of `7bc9`; physical phone/GPU evidence and owner-approved art
remain open gates.

## Repeatable Android regression (2026-09-09)

`npm run android:iterate -- emulator-5554` now runs tests, TypeScript/web build, native sync,
Android unit tests/lint/assembly, installation, and scripted UI regression. The lighter
`npm run android:verify -- emulator-5554` verifies the installed build without rebuilding.
Both require an explicit authorized device. The verifier hashes the staged and installed APK against
`latest.json` before restarting the game. It replaces the in-progress Mission on that test device,
but never clears preferences or changes their values.

The verifier uses actual UI buttons and diagnostic exports, not private simulation mutation. It
builds an affordable Rail/Siege defense, launches every wave, checks moving nonblank canvas pixels,
tests real Android Home/return during a wave and planning, and verifies results plus opening retry.
Its own CDP forward and temporary export interception are cleaned up on completion/failure. The
shared connection rejects disconnected, timed-out, protocol-error, and page-exception requests.
Failures return nonzero and retain partial JSON plus a best-effort compositor image.

An initial run caught a runner startup race: `am start` returned before the process was ready. The
runner now uses Android's `-W` launch handshake. Another check found the interactive Windows npm
invocation dropped a forwarded `-Verify` switch; `android:iterate` supplies that switch explicitly.
Missing-device and nonexistent-device commands fail before disturbing the game.

| Check | Recorded result |
|---|---|
| Combined command | Pass, including all native regression stages |
| Automated tests | 158 pass: 144 existing tests / 17 files plus 14 verifier tests / 3 files |
| APK | Unchanged `36ac052c82f3b7df97adf46738d0ad891f7d2e88d02aac19127b963bcf90dd5a`, 5,647,532 bytes; staged and installed hashes match |
| Mission | Six waves, 18 Lives, 198 defeats, two leaks, nine towers, 67 credits |
| Wave Home/return | Tick 232 held while hidden and after returning; advances to 266 only after Resume |
| Planning Home/return | Tick 754 held while hidden and after returning; advances to 769 only after Resume; Early Launch disabled while paused |
| Retry | Opening tick zero, 20 Lives, 30 credits, 1x, and only the original two Rails plus one Siege |
| Canvas / viewport | Changing 824x1118 pixel readback, no GL error, nonblank ADB images; 412x839 CSS viewport has no page overflow |
| Logs | No matched crash/rendering errors in the inspected app-process log; no claim about all system logs |
| GPU capability | This emulator's WebView exposes no timer/disjoint extension; actual GPU execution remains `not-measured` |

The combined-run [report](../../artifacts/android-verification/2026-09-10T03-12-15.043Z/report.json),
[Mission result](../../artifacts/android-verification/2026-09-10T03-12-15.043Z/mission-result.png),
[wave pause](../../artifacts/android-verification/2026-09-10T03-12-15.043Z/wave-paused.png), and
[retry](../../artifacts/android-verification/2026-09-10T03-12-15.043Z/retry.png) are retained.
An earlier standalone run also passed. Artifact filenames use September 10 UTC; local verification
was September 9. These are emulator UI regressions, not controlled performance comparisons, physical
touch validation, or uncoached playtests. The driver has different interaction timing from the earlier
17-Life smoke; this is not a balance improvement claim. No gameplay rules, assets, HUD styling,
cloud configuration, credentials, or domains changed.

### Stress-capture follow-up

The shared connection also completed full-load captures in both modes. These are valid captures,
not passing performance verdicts: the same installed APK and host-GPU AVD delivered substantially
lower cadence than on September 8. A fresh game process did not restore the previous cadence.
Every sample retained 120 creeps, 40 towers, 3x speed, the imported renderer, and zero lifecycle gaps.

| September 9 sample | FPS | Frame p95 | Long frames | Advanced ticks |
|---|---:|---:|---:|---:|
| Quality, after Mission verification | 34.19 | 50.1 ms | 52.44% | 4,044 |
| Battery, same process | 27.33 | 66.6 ms | 26.85% | 4,046 |
| Quality, fresh game process | 33.44 | 66.6 ms | 52.16% | 4,040 |

Raw reports: [Quality](../../artifacts/emulator/stress-native-60-2026-09-10T03-15-40.761Z.json),
[Battery](../../artifacts/emulator/stress-native-30-2026-09-10T03-18-56.020Z.json),
[fresh-process Quality](../../artifacts/emulator/stress-native-60-2026-09-10T03-21-41.402Z.json).
The first two emitted 115,020 events; the fresh-process sample emitted 114,940. Foreground hitches
and the existing 100 ms catch-up cap remain intact; neither sample load nor elapsed time was changed.
The AVD launch arguments still specify `-gpu host`. Android reported battery saver off and thermal
status zero. A host probe between samples reported 37% CPU load and 22,646,476 KiB free memory;
that single observation does not establish the cause, and emulator temperatures are not host thermals.
The [follow-up record](../../artifacts/android-verification/stress-followup-2026-09-09.json) retains
the comparison context. Further controlled runtime/GPU and physical-device evidence is required;
do not attribute this to the new harness, dismiss it as host noise, or tune gameplay to mask it.

## CPU timing and technical verification (2026-09-08)

The owner's current direction reserves future tower, enemy, and HUD image generation for Nano Banana.
No new art or HUD redesign followed that instruction. The atlas integrated on September 7 remains
a replaceable technical fixture, with [provenance and its original prompt](../art/proxy-kit-v1.md).

Schema 3 diagnostic exports now separate frame-update work, scene updates, Pixi CPU submission, and
root UI commits. The summaries are bounded, clear on sample/mode reset, and reject invalid or hidden
work. A regression test caught and repaired a root commit being counted when first mounted hidden,
before the passive visibility effect ran. [Timing definitions](DIAGNOSTIC_TIMING.md) describe overlap,
clock granularity, and exclusions; actual GPU execution is explicitly `not-measured`.

The native capture script now requires matching frame/CPU sample counts, a UI-commit sample, and
the imported renderer at both ends. The unchanged fixture retains 120 creeps, 40 towers, authored
cooldowns, and 3x speed. Both final-build samples ran for 45 seconds, advanced 4,050 ticks, produced
115,020 events, and had no lifecycle gaps. Only the dedicated API 36 host-GPU emulator was exercised.

| Final-build native sample | Quality 60 | Battery 30 |
|---|---:|---:|
| Estimated FPS | 58.33 | 29.47 |
| Frame p95 | 16.8 ms | 33.4 ms |
| Long frames | 2.59% at 20+ ms | 3.70% at 40+ ms |
| Foreground maximum interval | 83.3 ms | 50.1 ms |
| Frame-update CPU p95 | 0.9 ms | 1.0 ms |
| Scene CPU p95 | 1.0 ms | 0.8 ms |
| Render-submission CPU p95 | 2.0 ms | 1.8 ms |
| Root UI-commit p95 | 1.8 ms | 0.9 ms |

Raw final-build reports and ADB images:
[Quality](../../artifacts/emulator/stress-native-60-2026-09-09T02-11-01.432Z.json),
[Quality image](../../artifacts/emulator/stress-native-60-2026-09-09T02-11-01.432Z.png),
[Battery](../../artifacts/emulator/stress-native-30-2026-09-09T02-12-23.486Z.json),
[Battery image](../../artifacts/emulator/stress-native-30-2026-09-09T02-12-23.486Z.png).
Filenames use UTC, September 9; the local verification date is September 8.
The earlier 02-06-44.852Z sample used the interim `9569b8614558` APK, not the final build below.

| Verification | Result |
|---|---|
| Automated tests | 144 tests / 17 files pass, including real Pixi clock, sprite lifecycle, mounted UI, and timing exports |
| TypeScript, web build, Capacitor sync | Pass; Preferences plugin remains discovered |
| Native unit tests, lint, APK build/install | Pass via `npm run android:build -- emulator-5554` |
| Main JavaScript | `index-5Cj3OI2h.js`, 410.93 kB raw / 130.26 kB gzip |
| Temporary atlas | `combat-proxy-v1-Dq9UQUpC.png`, 1,255,331 bytes; no final-style claim |
| Debug APK | 5,647,532 bytes; SHA-256 `36ac052c82f3b7df97adf46738d0ad891f7d2e88d02aac19127b963bcf90dd5a` |
| Packaged assets | All 13 production assets, including the atlas, match the APK; staged hash/size match `latest.json` |
| Browser | 320x568, 390x844, 1440x900 have no page overflow; moving pixels, contrast switching, and context-loss recovery verified |
| Native Mission smoke | All six waves clear through UI commands: 17 Lives, 197 defeats, three Broodling leaks, two Stars, nine towers |

The [native Mission report](../../artifacts/emulator/cpu-diagnostics-native-mission-2026-09-08.json)
and [result image](../../artifacts/emulator/cpu-diagnostics-native-mission-2026-09-08.png) are retained.
That smoke run recorded a 233.4 ms foreground interval; it is not discarded or labeled suspension.
Browser verification ran during the Mission smoke, so its timings are not a controlled performance
comparison. The separate stress runs had the browser game closed. No matching app-process crash,
atlas-load failure, or prior unbound-texture error appeared in the inspected native logs.

The tightly overlapping stress pack still does not prove distributed-swarm readability. Actual GPU,
physical-device touch, thermal/battery, sound/haptic feel, gameplay duration, and tower-role balance
remain open. No sim rules, final art direction, cloud configuration, credentials, or domains changed.

## Lifecycle, frame modes, and iteration pipeline (2026-09-07, previous build)

Active waves and between-wave planning now pause when hidden, discard partial timing accumulators,
and require explicit Resume after returning. An untimed opening and an existing manual pause retain
their state. The native Home test held tick 168 while hidden and after returning, then advanced to
200 only after Resume. This is foreground lifecycle handling, not process-death Mission recovery.

Quality (60 FPS) and Battery (30 FPS) persist with the five existing preferences. Old records default
to Quality without resetting opt-outs. Pixi's ticker now owns both application stepping and GPU
submission, forwards uncapped elapsed time to diagnostics, and stops while hidden. Controller tests
produce identical 30/60 FPS outcomes at 1x, 2x, and 3x with regular frame delivery. The 100 ms simulation
catch-up cap remains; foreground stalls are still reported rather than silently excluded.

Native inspection found 32 supported texture slots but only slots 0-15 bound. Pixi 8.17's texture
initialization hard-codes 16 placeholders while its batch shader may reference all supported slots.
The Arena now uses Pixi's public texture API to initialize every supported slot, including after
context restoration. Native 32-slot and browser 16-slot probes restore without a GL error; fresh
native logs no longer contain the previous unbound-texture warning stream. No fixture load was reduced.

| Check | Result and scope |
|---|---|
| Automated tests | 129 tests across 17 files pass; controller, real Pixi ticker, mounted UI, export and cleanup coverage |
| TypeScript / web build / native sync | Pass; Preferences 8.0.1 remains discovered |
| Android checks | `testDebugUnitTest lintDebug assembleDebug` pass on JDK 21 / API 36 |
| Main JavaScript | 379.55 kB raw / 119.72 kB gzip; `index-dLDTlOEL.js` |
| Debug APK | 4,391,938 bytes; SHA-256 `aabbe46b3dff575d8f822d53549ed78304e7cf64c73139edac165acb0cd3e627` |
| Packaged assets | All 11 JS/CSS assets match the production web output |
| Settings / layout | Battery survives native cold restart and browser reload; 320x568, 390x844, 1440x900 fit |
| Browser canvas | Nonblank pixel readback, changing frames, and no GL error in the 320x568 stress surface |
| Local pipeline | Tests, sync, lint/build, hash-named staging, install/update, and launch pass; missing device fails early |

A final native UI-driven mixed-defense run cleared all six waves at 3x with 17 Lives, 197 kills,
three Broodling leaks, nine towers, and 67 credits. It recorded 60.75 seconds, 58.45 estimated FPS,
16.8 ms frame p95, an 83.4 ms foreground maximum, and no lifecycle gaps. Construction, specialist
installation, Early Launch, wave transitions, and results all ran through the actual UI. This is a
scripted feasibility run, not an uncoached playtest or proof of the target 5-7-minute experience.
The [mission result](../../artifacts/emulator/frame-modes-native-mission.png) fits the native viewport.
Raw lifecycle, graphics, build, and mission observations are in
[frame-modes-verification](../../artifacts/emulator/frame-modes-verification-2026-09-07.json).
The native Home/cold-restart probes used the interim frame-mode build before the texture repair;
the final mission and stress captures use the APK identified above.

The unchanged fixture was sampled from full load for 45 seconds at 3x, with 120 creeps and 40 towers
at both ends. Separate runs used the dedicated API 36 x86_64 AVD with host GPU and other browser
stress scenes closed. Both reported 115,020 events and no lifecycle gaps:

| Mode | FPS | Frame p95 | Long frames | Foreground max | Simulation p95 |
|---|---:|---:|---:|---:|---:|
| Quality 60 | 58.60 | 16.8 ms | 2.39% at 20+ ms | 33.4 ms | 0.2 ms |
| Battery 30 | 29.34 | 33.4 ms | 3.86% at 40+ ms | 166.6 ms | 0.3 ms |

Raw reports: [Quality](../../artifacts/emulator/stress-native-60-2026-09-07T22-38-58.582Z.json),
[Battery](../../artifacts/emulator/stress-native-30-2026-09-07T18-06-20.928Z.json).
The [native full-load image](../../artifacts/emulator/stress-native-60-2026-09-07T22-38-58.582Z.png)
uses ADB's compositor capture. Initial CDP images omit the GPU canvas and are not rendering evidence.
An initial overlong browser run depleted the fixture and was excluded. The capture script now reloads,
waits for full load, times the sample, and rejects depleted/interrupted runs. It does not freeze or
extend the fixture to improve results.

These are current-run mode comparisons, not a controlled speedup claim against the older renderer.
The tightly overlapping creep pack does not establish distributed combat readability. Emulator heap
readouts are coarse, and these results do not establish physical-phone battery savings or thermal
performance. Separate render/UI/GPU timing and physical feedback quality remain open. Existing
WebView cache-index, Gradle flatDir, and SDK XML-version warnings remain. Independent sidecar review
was unavailable because of its usage limit; these changes received local review and direct verification.

`npm run android:build -- DEVICE_SERIAL` now provides local unattended iterations after phone-side
ADB authorization. It preserves app data and stages the exact APK plus `artifacts/builds/latest.json`.
No Firebase, Supabase, credential, or domain changes were made; private cloud links remain unimplemented.
See [README](../../README.md#one-command-android-iterations) for build and capture commands.

## Settings and feedback verification (2026-09-07, earlier build)

The remaining three confirmed audit defects are repaired. All five local preferences load before
the interactive game mounts and persist through Capacitor Preferences, using Android SharedPreferences
on native builds and localStorage on web. Writes are serialized; malformed/unavailable storage falls
back without blocking launch, and a failed save is visible in settings. The plugin must be declared
at the root as well as in the game workspace for this repository's Capacitor CLI discovery.

The Android package now grants `VIBRATE`. Semantic feedback has a 500 ms per-cue repeat cooldown and
a 200 ms ordinary-cue gap per channel, with terminal-result priority. Only one synthesized voice is
active at a time. Muting, hiding, and unmounting stop audio and request haptic cancellation; re-enabling a saved opt-out restores
feedback. These changes do not alter Mission rules, encounter balance, or simulation version 8.

| Check | Result and scope |
|---|---|
| `npm test` | 102 tests across 14 files pass, including 8 mounted settings/lifecycle cases |
| `npm run cap:sync:android` | Both TypeScript checks, production web build, and native plugin/asset sync pass |
| Main JavaScript | 376.15 kB raw / 118.83 kB gzip; `index-DmYQaM1H.js` |
| `gradlew.bat testDebugUnitTest lintDebug assembleDebug` | Successful on JDK 21 / API 36; 43 tasks executed, 143 up-to-date |
| Debug APK | 4,391,938 bytes; SHA-256 `afb7bc13699993f184a7b2869a8b83cfd1f952026d5fea3f6715bf66186f4d56` |
| Packaged assets | All 11 JS/CSS files match the web build; Preferences 8.0.1 is in the native plugin registry |
| Native persistence | All five nondefault choices survive force-stop/cold relaunch; no save error; cold launch 1,046 ms |
| Native activated feedback | Muted construction creates no AudioContext or vibration request; re-enabled construction starts one oscillator and `vibrate(12)` returns true |
| Native Home/resume | Real hidden/visible transitions observed; haptic cancellation requested; hot resume 97 ms |
| Browser persistence/layout | Reload restores all five settings; 320x568, 390x844, and 1440x900 fit without page overflow |
| Dependency audit | 0 high/critical; 3 moderate findings in the Capacitor CLI / xcode / uuid development-tool chain |

Mounted tests exercise real bootstrap, UI, controller, storage serialization, and semantic feedback;
only GPU rendering and platform I/O are substituted. They cover delayed load with saved opt-outs,
rapid mixed toggles, construction feedback, mute/re-enable, visibility, unmount, and save-error recovery.
Independent follow-up review found the original integration-test gap sufficiently addressed. Its
remaining visibility-listener cleanup assertion was strengthened to dispatch a hidden event after
unmount; suspended-audio resume and physical feedback remain outside this test fixture's coverage.

Native results use the dedicated host-GPU x86_64 AVD, not a physical phone. An accepted vibration
request does not establish tactile feel or audible quality. The hidden cancellation request returned
false; the native Home check happened after the short tone ended, while mounted tests verify immediate
voice cancellation. Mission auto-pause and performance modes were not implemented in this earlier build.
Native WebGL texture-unit warnings and WebView cache-index messages were observed; the browser session had
one missing-favicon 404. Existing Gradle flatDir and SDK XML-version warnings also remain.

Raw observations and exact build identity are retained in
[`settings-feedback-2026-09-07.json`](../../artifacts/emulator/settings-feedback-2026-09-07.json).
Screenshots include [`native settings`](../../artifacts/emulator/settings-native-api36.png),
[`small-phone settings`](../../artifacts/emulator/settings-browser-320x568.png), and
[`small-phone Arena`](../../artifacts/emulator/settings-browser-320x568-arena.png).

## Repair verification (2026-09-06)

The first two audit findings are repaired without changing authored encounter balance or rendering.
Ground creeps finish their occupied segment before following a rebuilt route. Both endpoints of an
in-flight ground segment reject construction; Airborne movement is unchanged. Regression tests cover
fractional movement, atomic rejection, repeated placements, Waypoint arrival, and the final exit.
These changed rules increment the simulation version from 7 to 8.

Diagnostics now exclude intervals only after an explicit hidden/resume transition, including short
background gaps, and retain measured simulation work. A 500 ms foreground interval remains a long
frame in regression coverage. Both the game and stress surfaces report document visibility changes;
resetting samples preserves a pending resume gap. This is accounting repair, not a new automatic
suspend/pause policy or a renderer performance improvement.

| Check | Result and scope |
|---|---|
| `npm test` | 73 tests across 11 files pass, including 8 added regression cases |
| `npm run cap:sync:android` | Both TypeScript checks, production web build, and Android asset sync pass |
| Main JavaScript | 374.23 kB raw / 118.20 kB gzip; `index-CUfZkEHv.js` |
| `gradlew.bat testDebugUnitTest lintDebug assembleDebug` | Successful on JDK 21 / API 36; 47 tasks executed, 93 up-to-date |
| Debug APK | 4,483,084 bytes; SHA-256 `959c9b9063758251c6f64354f919d982449968ffb00c2b6b9fd89a42aee8e9b9` |
| Foreground-stall native probe | Intentional 600 ms stall reported as a 600 ms maximum and one long frame; zero discarded suspend gaps |
| Native Home/resume probe | Explicit hidden/visible events separated by 9,972.4 ms; one resume interval excluded |
| Defended Android smoke | Two Rails and one Siege clear Wave One at 3x with 20 Lives and 75 credits; Wave Two planning and pause work |
| Portrait inspection | Active and planning screens fit at 1080x2400 (412x839 CSS); rendered canvas 824x1118; no document overflow |

The probes use the dedicated Pixel 7 API 36 x86_64 AVD with `-gpu host`, not physical hardware.
The diagnostic exports were captured during opening and are not representative combat benchmarks.
An independent scoped code review found no concrete defects. Native unit tests remain generated
examples; the emulator smoke does not replace physical lifecycle, touch, audio, or haptic evidence.
Existing unbound-texture-unit warnings were observed and remain unresolved. Gradle also reports
existing flat-directory repository and SDK XML-version tooling warnings despite the successful build.

Raw exports, build identity, and smoke observations are retained in
[`repair-diagnostics-2026-09-06.json`](../../artifacts/emulator/repair-diagnostics-2026-09-06.json).
Fresh screenshots are [`repair-wave1.png`](../../artifacts/emulator/repair-wave1.png) and
[`repair-wave2-planning.png`](../../artifacts/emulator/repair-wave2-planning.png).

## Audit baseline (2026-09-05)

This pass reviewed the current working tree against `0b5847b` on `main`. The recent combat-flow,
tuning, feedback, and stress work is still uncommitted, including new source and test files. No
gameplay or renderer code was changed during this review. Mid-wave recovery was proposed in the
previous discussion but has not been implemented.

Checks recorded during that audit, before the repairs above:

| Check | Result and scope |
|---|---|
| `npm test` | 65 tests across 10 files pass |
| `npm run build` | Both TypeScript checks and production web build pass; main JS 373.78 kB / 118.09 kB gzip |
| `gradlew.bat testDebugUnitTest lintDebug assembleDebug` | Successful on installed JDK 21 / API 36; 3 tasks executed, 137 up-to-date |
| Native unit-test coverage | Only the generated `2 + 2` example; this is not Android gameplay or lifecycle coverage |
| Packaged assets | Main JS/CSS hashes match the fresh web build |
| Debug APK | 4,482,937 bytes; SHA-256 `614e6907ce33e34eedc28b59da41de9bb0cb0a6e76854503ac6ab033c001c59b` |
| Emulator/device state | Dedicated AVD installed; no emulator or physical device connected during this audit |
| Dependency security audit | Refresh not completed: approval-service usage limit blocked the command; older findings remain historical |

### Confirmed repair priorities

1. **Resolved in simulation 8: live rerouting changed position without time advancing (P1).**
   The audited [`mission-session.ts`](../../packages/sim/src/mission-session.ts) replaced the remaining
   route from its last cell center but retained progress along the old segment. A read-only 5x2 fixture
   with one half-cell-per-tick Drone reproduced this at tick 1: placing at cell 1 changed the creep from
   `0 -> 1, progress 500` to `0 -> 5, progress 500` at the same tick. Both the renderer and targeting
   use that changed segment, shifting the creep from `(0.5, 0)` to `(0, 0.5)` cells instantly.
   The prior live-placement tests used whole-cell steps and missed this. New fractional-step tests
   now cover preserved segment continuity and occupied-segment placement; see repair verification.
   This defect was already present in the committed baseline.
2. **Resolved in the current collector: diagnostics hid severe foreground stalls (P2).**
   The audited [`engine-gate-diagnostics.ts`](../../apps/game/src/platform/engine-gate-diagnostics.ts)
   discarded every interval over 250 ms without checking lifecycle state, including that frame's
   simulation work. Feeding `16, 500, 16` ms with no lifecycle transition reported 62.5 estimated FPS,
   zero long frames, and a 16 ms maximum. A 300 ms simulation sample was also lost. The collector now
   excludes only explicit background intervals and retains simulation samples. Separate render/UI
   work measurement remains a future profiling task.
   This is also a baseline defect, not a new regression from the feedback work.
3. **Resolved integration; physical validation open: Android vibration permission (P2).**
   Source and packaged manifests now declare `android.permission.VIBRATE`, which is granted in the
   installed APK. An activated foreground construction request returns true in the emulator.
   Physical tactile quality remains open; see settings/feedback verification above.
4. **Resolved: local accessibility and audio settings did not persist (P2).**
   [`local-settings.ts`](../../apps/game/src/platform/local-settings.ts) now owns versioned preference
   parsing and ordered writes. The game waits for loading before mounting. Browser reload and native
   process-restart checks retain all five settings, including sound/haptic opt-outs. Campaign profile
   and mid-wave recovery remain separate later work.
5. **Resolved: interleaved cues bypassed the repeat budget (P2).**
   [`semantic-feedback.ts`](../../apps/game/src/platform/semantic-feedback.ts) now retains per-cue
   cooldowns plus independent channel budgets and a single active audio voice. Regression tests cover
   interleaving, terminal priority, muted channels, and output cleanup.

### Performance and recovery follow-through

- The switch from one-tick to authored cooldowns changed the synthetic workload; switching
  SwiftShader to the host GPU changed the rendering environment. Those runs are not a controlled
  before/after renderer optimization. Keep the old overload observation separate and version future
  stress captures with the fixture, GPU mode, duration, and raw diagnostics.
- The 110-tick headless stress check reaches at least 100 creeps, not all 120 or sustained full load.
  It does not exercise a renderer or controller cadence. The slow, tightly overlapping creep pack
  also does not establish distributed combat readability. Add sustained, spatially representative
  evidence without changing simulation load merely to improve a score.
- Low-risk optimization candidates, not measured wins: reuse immutable wave counts/static snapshot
  data, avoid repeated UI snapshot generation per publish, and profile the duplicate combat-label
  draw in `ArenaView`'s ticker and render path. Keep the existing bounded label pool and board cache.
- Recovery remains a later, bounded design task. The current checkpoint has no restore API and
  fingerprints only Arena content, not the full Mission/tower/creep/wave definitions. A read-only
  probe changing a future wave from one Drone to two produced the same tick-1 hash, `f6c3007e`.
  Any recovery implementation needs a full content/version guard, bounded replay, non-destructive
  corrupt-save handling, and process-death tests. A one-second save interval cannot promise recovery
  of commands after the last successful save. The certified minimum later contract is between-wave
  recovery; exact mid-wave recovery is not the next Gate requirement.

## Previous implementation evidence (2026-09-04 to 2026-09-05)

These are recorded version-7 checks and playthroughs. The repair verification above identifies the
current test counts, simulation version, package, and native observations.

- Simulation version 7 adds immutable weapon data to tower snapshots and damage/leak positions to
  presentation events. All 65 tests, strict TypeScript checks, and the production web build pass.
  The main JavaScript bundle is 373.78 kB raw / 118.09 kB gzip.
- The six-wave Gate now grants clear allotments of 35/40/45/45/50/0, totaling 215 guaranteed credits
  versus at most 92 kill credits. The final wave grants no construction income. Opening credits
  remain 180, planning remains 18 seconds, and Early Launch remains capped at six credits.
- Gate-only tuning shortens Rail range to 4.5 cells and penetration to two targets, widens Siege
  blasts to 1.2 cells, and packs Broodling spawns five ticks apart. Benchmark defaults are unchanged.
- The repeatable `gate-balance.test.ts` scenarios clear with 16 Lives for mixed towers and 18 for
  Rail-only, both with 67 credits remaining. Siege-only and an unchanged opening lose. Another
  staged mixed layout also clears. These fixtures establish bounded feasibility, not fun or mastery.
- The successful scripted scenarios take 158-181 combat seconds. Even adding all five planning
  intervals gives approximately 4-4.5 minutes, excluding the untimed opening. The 5-7-minute Gate
  target and meaningful tower-role differentiation remain unvalidated.
- Selected towers show range on the Arena and damage/range in the command sheet. A fixed nine-label
  pool reserves eight slots for damage and one for aggregated leaked Lives. Armor mitigation is
  identified explicitly; label lifetimes use presentation time rather than Mission Speed.
- Leak events also update the accessible status message. Reduced motion removes label travel/fade;
  high contrast preserves the range boundary. Opening selection and range were inspected at 390x844
  and 320x568 with no document overflow; Armor labels were visible at 1x and 3x on the small viewport.
- A browser run using 1x/3x, automatic launches, and live construction cleared with 18 Lives,
  198 kills, two Broodling leaks, two Stars, and 93 credits. The final defense had six Rails, two
  Sieges, and one Foundation; its final specialist was not installed before the Mission ended.
  This differs from the immediately launched headless fixture. Results fit at 1440x900 and 320x568;
  the session reported no browser warnings or errors. Retry restored only the original two Rails
  and one Siege, 20 Lives, 30 credits, and 1x speed.
- Semantic feedback maps construction, specialist installation, wave transitions, leaks, victory,
  and defeat to distinct procedural sound and vibration cues. Ordinary hits are silent, one
  highest-priority cue is selected per drained event batch, and consecutive identical cues have a
  500 ms cooldown (interleaving bypasses it; see audit). Sound effects and haptics have independent
  controls; their states are included
  in diagnostics exports. The in-app browser exposed neither Web Audio nor vibration, so actual
  sound and tactile output remain physical Android evidence.
- A separate deterministic 20x20 synthetic Arena fixture uses 120 durable Broodlings and 40
  alternating Rail/Siege towers at 3x. Its headless test reaches at least 100 simultaneous creeps,
  observes all 40 towers firing, produces event batches above 100, and keeps damage labels capped
  at eight. The first Android run exposed an artificial one-tick weapon cooldown that produced
  137,512 presentation events in the 110-tick test and 2.69 million events during a short device
  sample. The fixture now preserves authored weapon cooldowns and caps the same test sample at
  10,000 events while retaining its concurrency and burst requirements.
- The authored-cooldown `?stress=1` APK reached 120/120 active creeps, 40 firing towers, 59 estimated FPS,
  and a 16.8 ms frame p95 on a Pixel 7 API 36 x86_64 emulator using the host NVIDIA GPU. Android
  `gfxinfo` recorded 605 frames, two janky frames (0.33 percent), and no missed Vsyncs; process memory
  was 122,901 KB PSS / 257,836 KB RSS. The view fit at 1080x2400. Host-GPU WebGL emitted repeated
  unbound-texture-unit warnings despite a visually complete frame. Their cause remains unresolved;
  a complete image does not establish that the warnings are harmless. SwiftShader observations are
  software-renderer evidence and are not directly comparable with the host-GPU run.
- The same stress surface previously reached 120/120 active creeps and approximately 119 estimated
  RAF FPS with an 8.5 ms frame p95 in the desktop in-app browser, without console warnings. It fit at
  320x568 without document overflow. These host and emulator figures prove a measurable renderer
  fixture and content-defined larger geometry, not physical-device performance.

### Previous combat-flow evidence (version 6, before tuning)

These figures record the prior encounter and must not be used as current balance evidence.

- Simulation version 6 implements live Foundation placement and Airborne tower passability, real
  health, Armor, targeting, Rail penetration, delayed Siege damage, deaths, and leaks.
- The noncanonical `brood-combat-gate` Mission has six authored waves and 200 creeps across Drones,
  Carapaces, Broodlings, and Gliders. Two staged Rail/Siege layouts clear the headless Mission;
  an undefended run loses. These are feasibility fixtures, not uncoached gameplay evidence.
- Opening remains untimed. Between-wave planning lasts 18 seconds at every Mission Speed. Tactical
  Pause stops the countdown and prevents construction. Early Launch pays a displayed bonus capped
  at six credits; automatic launch pays none.
- Clear allotments provide 445 guaranteed credits across the Mission, independent of kills or leaks
  in a survived wave. Briefings disclose the visible wave's families, counts, layers, Armor, and income.
- Results show Lives, cleared waves, kills, leaks by family, and Lives-based Stars. Retry restores the
  accepted opening construction in memory; Clear Plan starts empty. Reload persistence remains open.
- Presentation now includes bounded shot/death/impact cues, health bars, visible Armor, and specialist
  construction completion. The command sheet has fixed height so selection does not resize the Arena.
- All 53 automated tests, TypeScript, and the production web build pass. The main JavaScript bundle is
  362.24 kB raw / 114.68 kB gzip.
- Browser opening, combat, planning, and tower selection were inspected at 390x844 and 320x568.
  A real-time 3x run cleared all six waves with 18 Lives, 198 kills, two Broodling leaks, and two Stars.
  Automatic launch, Early Launch, live construction, and live specialist installation were exercised.
  The fresh completion session reported no console errors or warnings. An earlier Playwright session
  reported a missing favicon and stalled in its virtual-clock test; it was closed and not used as
  completion evidence.
- The full three-family briefing and results fit at 320x568 without overflow; desktop results and
  restored opening were inspected at 1440x900. Browser retry restored exactly the two Rails and one
  Siege from the opening, resetting to 20 Lives and 30 remaining opening credits. Later construction
  was excluded, matching the automated retry scenario.

## Remaining code-to-design differences

| Current baseline | Certified target |
|---|---|
| The playable Mission uses 9×14; a 20×20 synthetic Arena is headlessly, browser-, and emulator-rendered. Its stress view has no construction input. | 9×14 remains primary; touch-check the larger or an irregular synthetic Arena and necessary camera behavior on physical hardware. |
| Combat has a temporary imported atlas with geometric fallback, bounded cues, compact damage text, synthesized semantic audio, and Web vibration. | Owner-approved Nano Banana art and physical-device audio/haptic/readability evidence establish the final presentation. |
| Local settings persist; opening retry is in memory and checkpoint export has no restore path. | Establish suspend/resume behavior; add versioned recovery under the later mobile contract. |
| Persisted Quality/Battery modes and separate CPU work timings are verified on the emulator. | Measure actual GPU, physical-phone performance, heat/battery, and tactical readability in both modes. |

Repair each difference in its owning layer with focused tests: rules in the Simulation Kernel,
settings/lifecycle in platform and orchestration, and readability/rendering in presentation.

## Next implementation sequence

1. Completed at emulator scope: explicit-resume lifecycle, persisted 30/60 FPS modes, one frame clock,
   texture-slot repair, and full-load timed stress exports. Neon V3 is the active comparison while the
   original benchmark remains preserved; the focused visual pass is ready for physical interaction review.
2. CPU phase measurements and a one-command six-wave/lifecycle/retry regression are retained. Use
   `android:iterate` for subsequent runtime changes. Continue actual GPU/device profiling before
   calling performance settled; reproduce the September 9 slowdown under controlled runtime
   conditions. This emulator lacks a WebGL timer extension. Preserve fixture load and foreground-stall accounting.
3. Playtest the six-wave encounter for duration, challenge, meaningful Maze investment, and distinct
   Rail/Siege choices. Current scripted clears are short; the mixed-only regression establishes role
   dependence, but neither fun nor satisfying differentiation follows from a passing balance fixture.
4. The temporary import/reuse/fallback path is exercised. Park visual implementation for owner-led
   Nano Banana tower, enemy, and HUD exploration. Later validate the selected kit's silhouettes,
   feedback, audio, haptics, and accessibility under distributed combat density.
5. Extend the physical-device pipeline evidence into separate touch, lifecycle, frame, thermal, battery,
   audio, haptic, and uncoached playtest checks. The current wireless ADB install/launch result is not
   certification. Record four independent Gate verdicts before expanding into Campaign work.

The local phone-install pipeline is implemented and emulator-verified. Phone-side USB or wireless ADB
authorization is still required. Reusing Supabase for private internal download links remains a
proposal, not an implemented upload or Firebase setup. No cloud configuration, credentials, or domain
settings were changed in this pass.

Use Infinitode, Geometry Wars, and The Tower as the documented style references when the visual
track opens. Reference analysis and an original player-versus-Brood direction precede production art;
see the [visual direction plan](../art/VISUAL_DIRECTION_PLAN.md).

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

The following historical baseline figures are retained for comparison and do not describe the current
combat workload.

## Historical automated baseline evidence

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
| npm audit | 0 critical, 0 high, 3 development-tool findings |

The audit findings are transitive Capacitor CLI development dependencies and were absent from the
shipped game bundle at the recorded baseline. Recheck rather than assuming this remains current.

## Historical browser and emulator evidence

The previous client was exercised at 390×844 and 320×568 CSS viewports without document overflow.
Tap and drag construction, placement rejection, pause, contrast, reduced motion, and the semantic grid
worked under the old phase-locking rules.

The debug APK installed and cold-launched on a Pixel 7 API 36 ARM64 emulator. The 9×14 Arena, HUD,
command sheet, system bars, and safe areas fit in portrait. One clean `gfxinfo` sample recorded 812
frames, 1.72% janky frames under Android's metric, no missed Vsyncs, and a 20 ms 99th percentile. The
in-app collector recorded 60.0 estimated FPS, a 16.8 ms frame p95, 0.0% 20+ ms frames, and 0.1 ms
maximum fixed-step work in that probe scene.

These older ARM64 values describe route probes, not representative combat. They cannot pass the
performance track.

Background and resume retained the running WebView and Mission state in the emulator. Process memory
after the recorded run was 103,238 KB PSS and 234,236 KB RSS; sampled JavaScript heap was 9.5 MB. No
fatal exception, ANR, or crash appeared. Emulator Chromium warnings and high-input-latency samples
remain physical-device comparison items.

No physical Android device was attached. Thermal behavior, battery impact, real touch latency,
hardware lifecycle, low/mid/high device behavior, and TalkBack remain open.

### Windows emulator smoke run (2026-09-05, before this audit)

The current APK installed and cold-launched in 1.33 seconds on the dedicated Pixel 7 API 36 x86_64
AVD. Wave launch, pause, resume, and 3x speed were exercised through Android's accessibility tree.
The undefended first wave leaked ten Drones; Wave Two entered planning at ten Lives and 215 credits.
No fatal exception, ANR, or app error was recorded. This was a smoke run, not a defended full-Mission
Android playthrough. The 9x14 opening and planning screens fit at 1080x2400. Web Audio API presence
does not establish audible output; the unactivated vibration probe is inconclusive.

Retained captures are `artifacts/emulator/launch.png`, `wave1-active.png` (actually Wave Two planning),
and `stress-api36-hostgpu.png`. The screenshots are prior-run evidence, not fresh captures from this
audit. Raw stress diagnostics and Android profiler output were not retained alongside them.

## Gate verdicts

| Track | State | Evidence still required |
|---|---|---|
| Gameplay | Playable, not validated | Test duration, strategy differentiation, and uncoached play |
| Device interaction | Physical install/launch pipeline evidence; interaction not validated | Physical touch, safe area, lifecycle, camera, and accessibility evidence |
| Performance | CPU phases captured; latest emulator cadence below prior identical-APK baseline | Controlled reproduction, actual GPU timing, and physical heat/battery evidence |
| Presentation pipeline | Neon V3 focused comparison active; install/launch task evidence only | Owner-approved art, distributed density, physical audio/haptics, and production-cost assessment |

## Engine decision rule

Pixi remains the active candidate only through this bounded Gate. Each failed track names its cause:

- boring or convergent play causes gameplay iteration.
- poor touch or comprehension causes interaction and presentation repair.
- a specific technical failure may receive one written, time-boxed repair.
- persistent performance or presentation-pipeline failure causes one switch to Godot.

Final art direction is not a Gate verdict. The owner may start Nano Banana exploration before Gate 1
under the current direction; production style still requires approval of one complete visual Mission.

## Current installable artifact

The recorded debug package is `android/app/build/outputs/apk/debug/app-debug.apk`. It is an internal
playable development build for installation and device testing, not a release candidate. Its identity
is listed in the September 10 startup-recovery section above and `artifacts/builds/latest.json`.
After runtime changes, rebuild and sync web assets before
packaging, then record the new APK hash with any new evidence.
