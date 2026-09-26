# P2-06: Minimal First-Session UI

State: Blocked on Astra UI acceptance tests; P2-04 accepted. Worker: Terra. Astra owns visual review.

## Outcome and Boundaries

Wire the accepted campaign controller into a new `apps/game/src/neon/first-session-app.tsx` entry shell.
Retain the existing arena, board-first HUD, gestures, and comparison entrypoint. Small result/map/help
components may live beside it. Bootstrap edits are serialized by Astra, not shared with another worker.

Do not refactor the whole Neon app, add a title screen, build a Galaxy Map, enlarge the HUD, change
tower art/physics, or grant Siege/Arc in the campaign simply because the comparison supports them.

## Acceptance

- [ ] Fresh profile enters a ready M1 board directly; tap builds Foundation and hold opens only eligible
      choices. Empty specialist availability cannot expose dead/locked radial controls.
- [ ] Entrance/exit and route are readable; M2 introduces one Waypoint and existing live construction.
- [ ] First victory exposes a compact three-node map; locked nodes are distinguishable without color.
- [ ] Results show existing Lives/Stars, earned Rail when applicable, next Mission, and restored retry.
- [ ] Rail loan/ownership is clear in the trial without permanent extra HUD panels.
- [ ] Contextual Help can be replayed on demand, exited immediately, and never changes progress/rewards.
- [ ] 412x839 and 1440x900 layouts fit; touch controls, safe areas, keyboard focus, high contrast,
      reduced motion, pause/resume, and error/recovery states remain usable.
- [ ] No repeated explanatory prose plastered over the board. Teaching uses brief contextual cues and
      the explicitly requested Help surface, not a marketing overlay or a forced tutorial tour.

## Validation and Handoff

Astra supplies interaction assertions and a browser journey through M1 victory, map, trial access,
results, Help, and recovery. Worker runs these and existing gesture/aim/renderer tests, typecheck,
and web build. Include phone-size screenshots of opening/map/results and error states. Astra reviews
the design before integration; native APK deployment occurs once for the integrated slice.
