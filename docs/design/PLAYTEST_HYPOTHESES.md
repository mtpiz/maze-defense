# Playtest Hypothesis Register

Status: Active  
Updated: 2026-09-03

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
