# P2-04: Campaign Flow and Results

State: Blocked on Astra campaign API and acceptance tests; P2-02/P2-03 accepted. Worker: Terra. Review owner: Astra.

## Outcome and Boundaries

Create `apps/game/src/application/first-session-controller.ts` and pure result-application logic in
`apps/game/src/application/player-profile.ts`. Compose the existing BenchmarkController with a
selected Mission; do not clone simulation or rewrite Stars/credits logic. This packet owns the small
read-only campaign view/actions that P2-06 will consume. Astra freezes that API before dispatch.

Allowed: these application files and focused unit tests; narrowly required controller constructor
plumbing after Astra review. Excluded: UI styling, persistence internals, new progression economy.

## Acceptance

- [ ] Empty profile selects M1 without map/menu; first victory reveals the map and unlocks M2.
- [ ] Mission selection rejects locked nodes even when invoked directly without UI.
- [ ] M3 loans Rail for that session without granting ownership before victory.
- [ ] A victory applies best Stars and the authored award once; defeat awards neither.
- [ ] Repeated result delivery, retry, and replay do not duplicate rewards or reduce best Stars.
- [ ] Persist results before offering progress that would be lost on restart; save failure is explicit
      and retryable without replaying awards. A completed session is not silently discarded.
- [ ] Field Credits, speed, combat state, and trial loans do not leak between Missions.

## Validation and Handoff

Astra supplies fake-store failure and replay scenarios in `campaign.acceptance.test.ts`. Worker adds
controller tests. Run campaign/profile/Mission acceptance, existing controller and balance tests,
typecheck, and full suite at integration. Handoff includes frozen view/action types for P2-05/P2-06,
explicit save-failure behavior, and no UI imports in application orchestration.
