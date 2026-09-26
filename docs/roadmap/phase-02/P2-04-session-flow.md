# P2-04: Campaign Flow and Results

State: Accepted. 12 independent campaign acceptance cases and source review passed; P2-02/P2-03 integrated. Worker: Terra. Review owner: Astra.

## Outcome and Boundaries

Create `apps/game/src/application/first-session-controller.ts` and pure result-application logic in
`apps/game/src/application/player-profile.ts`. Compose the existing BenchmarkController with a
selected Mission; do not clone simulation or rewrite Stars/credits logic. This packet owns the small
read-only campaign view/actions that P2-06 will consume. Astra freezes that API before dispatch.

Allowed: these application files and focused unit tests; narrowly required controller constructor
plumbing after Astra review. Excluded: UI styling, persistence internals, new progression economy.

## Acceptance

- [x] Empty profile selects M1 without map/menu; first victory reveals the map and unlocks M2.
- [x] Mission selection rejects locked nodes even when invoked directly without UI.
- [x] M3 loans Rail for that session without granting ownership before victory.
- [x] A victory applies best Stars and the authored award once; defeat awards neither.
- [x] Repeated result delivery, retry, and replay do not duplicate rewards or reduce best Stars.
- [x] Persist results before offering progress that would be lost on restart; save failure is explicit
      and retryable without replaying awards. A completed session is not silently discarded.
- [x] Field Credits, speed, combat state, and trial loans do not leak between Missions.

## Validation and Handoff

Astra supplies fake-store failure and replay scenarios in `campaign.acceptance.test.ts`. Worker adds
controller tests. Run campaign/profile/Mission acceptance, existing controller and balance tests,
typecheck, and full suite at integration. Handoff includes frozen view/action types for P2-05/P2-06,
explicit save-failure behavior, and no UI imports in application orchestration.

## Dispatch (2026-09-26)

- Base: b8c99db; branch: codex/p2-04-campaign-flow.
- Worktree: C:/Users/mpitt/.codex/worktrees/p2-04-campaign-flow/maze-defense.
- Worker: p2_04_implementation (Terra). Exact ownership/API: [P2-04-dispatch.md](P2-04-dispatch.md).
- Before dispatch: 10 campaign cases discovered and failed for missing first-session-controller; validation typecheck passed.
- Owner instruction: no builds or phone deployment; GitHub Releases is the delivery path. No release creation in this packet.

## Acceptance and handoff (2026-09-26)

- Astra authored and red-checked 10 initial cases before dispatch, then strengthened to 11 for terminal-state preservation/reentrant listeners. A twelfth case independently reproduced synchronous save failure blocking retry.
- Terra implemented only the controller, pure result helper and their focused tests. Luna reviewed the source; one fix round addressed map-session detachment and synchronous-save attempt identity. Re-review found no new important issues.
- All 12 campaign cases and all 60 Phase 2 acceptance cases passed. Full shipped regression passed 307 Vitest tests plus 19 Node checks before the final Neon-only rebase; both repository and validation typechecks passed. Windows worker teardown warnings occurred after passing tests, exit 0.
- API for P2-05/P2-06 is frozen in P2-04-dispatch.md and exported by first-session-controller.ts. Results are read-only; committed profile/unlocks are published only after save succeeds. Failed saves retain the terminal mission and candidate, block navigation, and retry the write without replaying awards. Both rejected Promises and synchronous throws are covered.
- Entering map detaches active combat and removes session loans. Mission selection is transient; victory saves destination=map. Cross-process mission/plan recovery belongs to P2-05, and the visible cold-open/map/results UI belongs to P2-06.
- No builds, Android commands, phone deployment, release creation, storage internals, simulation changes or UI changes in this packet, per owner direction.

Final rebase verification: incorporated origin/main 2f129fa (Siege art only) without conflicts. Combined tree passed 308 Vitest tests, 19 Node checks and repository typecheck, exit 0. The application/acceptance implementation was unchanged by rebase; all 60 acceptance checks had passed on that implementation. No build or deployment ran.
