# Playtest Hypothesis Register

Status: Active  
Updated: 2026-09-24

This register holds falsifiable expectations, initial tuning ranges, evidence, and failure responses.
It is intentionally not an ADR collection. A hypothesis may change whenever observation contradicts
it; the current design contract changes only when the product rule itself changes.

| ID | Hypothesis | Initial evidence target | Failure response | State |
|---|---|---|---|---|
| H01 | The core slice is enjoyable without account progression. | After an uncoached run, most available testers voluntarily retry, request another run, or continue experimenting rather than stopping after polite feedback. | Rework waves, tower decisions, and Maze interaction before building meta systems. | Open |
| H02 | Live Foundation placement adds adaptation without creating an APM tax or route exploit. | Testers use it for meaningful recovery or optimization; repeated stalling, frantic spam, and dominant route-juggling are absent. | Adjust construction delay, cost, timing, or return to planning-only Campaign placement behind the existing policy seam. | Open |
| H03 | Rail and Siege produce visibly different plans. | Testers can explain their roles from observed behavior, and successful layouts value different lane and cluster geometry. | Redesign mechanics or encounter pressures before adding more Blueprint families. | Open |
| H04 | Airborne routing is understandable when towers never block it. | Testers correctly predict the Airborne route after its first contextual explanation and can identify useful Airborne coverage. | Improve route visualization or simplify Arena presentation before adding layer-specific terrain. | Open |
| H05 | A fully visible 9×14 Arena is comfortable on phones. | Placement, selection, Waypoint reading, and contextual controls work without repeated mis-taps on physical devices. | Adjust active area, hit regions, interaction model, or World One dimensions. | Open |
| H06 | A 15–20-second planning countdown preserves strategy without dead time. | Players either use the interval deliberately or Early Launch promptly; waiting without a decision is rare. | Tune the interval and reward or test manual launch. | Open |
| H07 | Guaranteed wave income plus smaller kill and Early Launch rewards remains predictable. | Players can describe what they can afford next and do not attribute losses to unexplained income variance. | Increase forecast detail or reduce variable income. | Open |
| H08 | Scarce permanent Research creates identity without account regret. | Different investments remain viable on the main path; players understand the opportunity cost and do not feel progress is irrecoverably damaged. | Increase guaranteed Research, improve previews, alter costs, or add a bounded recovery mechanism. | Open |
| H09 | Approximate two-Star-average World Gates reward engagement without forcing perfection. | Main-path players can advance after some leaks, while three-Star and Mastery rewards still motivate replay. | Tune thresholds and substitute-Star availability. | Open |
| H10 | Purpose-sized Worlds avoid filler. | Every Mission has a written tactical purpose and playtesters do not identify solved or redundant waves. | Remove or combine content instead of increasing speed or statistics. | Open |
| H11 | Pixi and Capacitor can deliver the required presentation class on Android. | The Core Combat Gate passes physical-device interaction, performance, and presentation-pipeline tracks after at most one bounded repair. | Switch presentation and native delivery once to Godot using the certified contracts as the port specification. | Open |
| H12 | Budgeted per-family weapon and Brood death audio improves combat readability over silent hits without becoming fatiguing. | In the Neon comparison, testers can name which tower family is firing by ear, keep ambience and effects on through a full Mission, and do not describe the mix as noisy at 3x speed. | Revert combat to semantic-only cues, raise minimum intervals, or drop Foundation and Broodling layers first. | Open |

## Initial tuning ranges

These are starting values, not commitments:

- Ordinary Mission duration: approximately 6–8 experienced minutes.
- Boss Mission duration: approximately 10–14 experienced minutes.
- Ordinary wave count: commonly 10–14, fewer when the tactical arc is complete.
- Between-wave planning: approximately 15–20 seconds with immediate Early Launch.
- World One starting Lives: 20.
- Two-Star threshold: approximately 75 percent of starting Lives retained.
- Early Launch reward: small and capped; the previous ten-percent-of-allotment value is only a test seed.
- Foundation and specialist refund percentages: unresolved until live construction is exercised.
- Respecialization cost, downtime, and per-wave limit: unresolved until both branches exist.
- World size: normally 6–8 main Missions and 1–2 Optional Missions.
- Standard Specialization Schematic: 3 Fragments; exceptional late sets: no more than 5.

## Evidence notes

Add dated observations beneath this heading. Record behavior before interpretation, name the build
and Content Bundle used, and link any replay, diagnostic report, or screen recording. Small friend
tests use counts and concrete observations rather than percentages that imply a large sample.

### 2026-09-03: Playable combat flow, simulation version 6

`brood-combat-gate` now uses six waves, 200 creeps, 180 opening credits, clear allotments of
55/65/70/75/85/95, an 18-second planning interval unaffected by Mission Speed, and an Early Launch
bonus of at most six credits proportional to remaining time (rounded up). Two Stars requires 15 of
20 Lives; no Lives lost gives three. These values are provisional.

Automated scenarios confirm two staged Rail/Siege defenses can win, an undefended run loses, and
guaranteed clear income exceeds the available kill bounties. Countdown pause/expiry, bonus payment,
failed-wave income, rating thresholds, and opening-plan retry have regression coverage. This
supports rule correctness only: H01, H03, H06, H07, and the 5-7-minute Gate duration target still need
observed human runs. No account rewards or permanent progression were added.

### 2026-09-03: Balance and combat readability, simulation version 7

The same `brood-combat-gate` now grants clear allotments of 35/40/45/45/50/0. Guaranteed wave
income totals 215 versus a maximum of 92 kill credits; Broodlings grant no bounty, and the other
families grant one. Opening credits, planning time, and Early Launch rules are unchanged. Gate-only
Rail range is 4.5 cells with two-target penetration, Siege blast radius is 1.2 cells, and all
Broodling groups spawn five ticks apart. The final wave grants no construction income.

The repeatable scenario in `apps/game/src/application/gate-balance.test.ts` builds affordable towers
at planning boundaries and immediately launches. Each test uses the same ordered placement list;
these are comparison fixtures, not optimized strategies or human observations.

| Strategy | Before tuning | Current outcome | Current credits / towers | Combat seconds |
|---|---|---|---|---|
| Mixed Rail/Siege | Victory, 20 Lives, 261 credits | Victory, 16 Lives | 67 / 9 | 181 |
| Rail-only | Victory, 20 Lives, 276 credits | Victory, 18 Lives | 67 / 10 | 158 |
| Siege-only | Defeat | Defeat | 42 / 3 | 55 |
| Opening three towers only | Defeat | Defeat | 261 / 3 | 150 |

Interpretation: surplus income is lower and continued investment remains necessary in this fixture.
Rail-only success means H03 is still open; diversity has not been demonstrated. Successful combat
takes 158-181 seconds; adding every planning interval yields approximately 4-4.5 minutes before
untimed opening decisions. These runs do not establish the 5-7-minute Gate target. H01, H03, H06,
and H07 still require uncoached human evidence; no hypothesis is marked passed.

Readability now includes selected-tower range, weapon stats, bounded damage text with Armor
mitigation, and an independent aggregated leak label plus accessible status. Label timing is
independent of Mission Speed, with reduced-motion handling. Automated checks cover immutable
weapon data, event positions, label bounds/deduplication/expiry/retry, and accessible leak feedback.
All 60 tests pass. Phone screenshots at 390x844 and 320x568 show range previews and Armor labels,
including 3x speed with high contrast/reduced motion. Physical touch and player comprehension
remain untested.

A browser run cleared with 18 Lives, 198 kills, two Broodling leaks, two Stars, and 93 credits.
It used six Rails, two Sieges, and one Foundation, mixing 1x/3x speed, automatic launches, and live
construction. This was not the exact headless strategy. Results fit at 320x568 and 1440x900, the
browser reported no warnings/errors, and Retry restored only the opening three towers with 20
Lives and 30 credits. This is interaction verification, not uncoached playtest evidence.

### 2026-09-04: Semantic feedback and stress contracts

Construction, specialist installation, wave transitions, leaks, victory, and defeat now map to
distinct synthesized sound and vibration cues outside the deterministic simulation. Ordinary hits
produce no audio or haptics. Each event batch selects one highest-priority cue, and repeated
identical cues are limited to two per second. Sound effects and haptics are independently switchable
and represented in diagnostic exports. Unit tests cover priority, disabled channels, repeated leaks,
duplicate events, and retry sequence reset.

The controls fit at 390x844 and 320x568 without document overflow and produced no browser warnings.
The in-app browser exposed neither Web Audio nor vibration, so this verifies UI and fallback behavior,
not perceived audio, latency, interruption handling, or tactile quality. H11 remains open pending
physical Android evidence.

A separate deterministic stress Mission uses a 20x20 synthetic Arena, 120 durable Broodlings, and
40 alternating Rail/Siege towers at 3x. The headless fixture reaches at least 100 active creeps,
observes every tower firing, produces event batches above 100, keeps damage labels at the eight-label
budget, and emits no hit audio/haptics. This exercises larger content-defined geometry and workload
assembly. The `?stress=1` Pixi surface reached 120/120 active creeps and reported approximately 119
delivered FPS with an 8.5 ms frame p95 in the desktop in-app browser, without console warnings. It
also fit at 320x568 without document overflow. These are host-browser observations, not Android
frame, memory, heat, battery, or touch evidence.

### 2026-09-05: API 36 emulator loop and calibrated stress cadence

JDK 21, Android API 36, Emulator 37.1.11, and a Pixel 7 Google APIs x86_64 AVD now provide a
repeatable local Android build and verification loop. The current APK cold-launched in 1.33 seconds;
wave launch, pause, resume, and 3x speed were exercised through the Android accessibility tree.
Wave One resolved and Wave Two entered planning without a fatal exception, ANR, or app error. The
opening and planning layouts fit the 1080x2400 device surface.

The first stress run revealed that the synthetic fixture's one-tick cooldown made every tower fire
30 times per simulated second. It produced 137,512 presentation events in the 110-tick automated
probe and 2.69 million events in a short Android sample. The fixture now preserves authored weapon
cooldowns while retaining 120 durable creeps, 40 firing towers, full-map range, enlarged Siege
blasts, 3x speed, a 100-creep concurrency floor, and 100-event burst floor. A regression caps the
110-tick sample at 10,000 events.

With host GPU acceleration, the repaired Android stress surface reached 120/120 active creeps and
reported 59 FPS with a 16.8 ms frame p95. Android `gfxinfo` recorded 605 frames, two janky frames
(0.33 percent), and no missed Vsyncs; process memory was 122,901 KB PSS / 257,836 KB RSS. The frame
was visually complete at 1080x2400. Host-GPU WebGL logged repeated unbound-texture-unit warnings,
which remain a physical-device comparison item. Web Audio was available, while an emulator vibration
request returned false. H05 and H11 remain open pending physical touch, tactile, and device evidence.

### 2026-09-24: Procedural space audio (Neon comparison)

The Neon comparison now has a procedural sound bank (`apps/game/src/audio`): 21 cues plus two
ambient plasma-wave events, rendered once through `OfflineAudioContext` and played as buffers, and a
real-time space ambience whose pulse layer follows wave activity. Unlike the benchmark's semantic-only
contract, towers and Brood deaths make sound, bounded by an `AudioDirector` that plays each sound at
most once per event batch, enforces per-sound minimum spacing, and caps a batch at six requests, and
by a 16-voice engine that lets alerts steal from combat. A 12-second rehearsal of six Foundations,
three Rails, two Arcs, a Siege, and Broodling swarms filtered roughly half of all events. Offline
renders are click-free with clean tails; perceived balance, fatigue, Android latency, and
interruption handling are unverified, so H12 is open. Audition page: `sound-lab.html`.
