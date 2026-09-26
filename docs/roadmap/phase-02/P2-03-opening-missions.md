# P2-03: Author Missions One Through Three

State: Accepted. Independent mission acceptance and content review passed; native deployment deferred by owner. Worker: Terra. Review owner: Astra.

## Outcome

Author real campaign encounters rather than renaming the noncanonical Gate. Read WORLD_ONE.md's
opening curriculum. Use the approved neon look; no Brood art production or new visual theme.

## Files and Boundaries

Create `content/world-01/first-session/` Mission/Arena data and
`apps/game/src/application/first-session-missions.ts` as its small compiled catalog adapter.
Add command-plan/replay fixtures under `packages/testkit/src/first-session/` when consumed by tests.
Do not edit crowd physics, weapon mechanics, comparison Mission data, profile code, or UI.

## Acceptance

- [x] Stable IDs `world-01-mission-01`, `world-01-mission-02`, `world-01-rail-trial` form M1 -> M2 -> M3.
- [x] M1: no Waypoint, Drone-only early pressure, Foundation only, 3-5 minute experienced-play target.
- [x] M2: one Waypoint, live Foundation construction, short encounter demonstrating route adaptation.
- [x] M3: required Rail trial, loaned Rail catalog entry and Rail award on victory; no ownership assumed.
- [x] Foundations are useful without making unchanged default play an automatic win. Rail geometry
      matters; level-one Rail stays single-target with 90-degree coverage and 2.5-cell range.
- [x] Each wave has a distinct written tactical purpose; forecast counts exactly match authored groups.
- [x] Catalog rejects duplicate IDs, missing prerequisites, cycles, and unreachable required trial.
- [x] Instantiate every compiled Mission through `createMission` during catalog validation; reject
      impossible initial Ground/Air routes using the existing authoritative planner.
- [x] Every Mission has a deterministic affordable winning plan and deliberate losing plan. M3 has
      at least two credible winning placements. Timing/playability hypotheses remain human-tested.

## Validation and Handoff

Astra authors mission structure assertions and replay-outcome checks before dispatch. Worker provides
plans as tick-indexed commands, seeds, hashes, and duration summaries. No change to approved tests or
golden values without review. Run compiler/mission acceptance, existing Gate balance tests, typecheck.
Handoff: compiled catalog, plan fixtures, content hashes, and known pacing concerns; no campaign launch.

## Dispatch evidence

- Base: f2f0f5b; branch: codex/p2-03-opening-missions.
- Worktree: C:/Users/mpitt/.codex/worktrees/p2-03-opening-missions/maze-defense.
- Frozen contract: [P2-03-dispatch.md](P2-03-dispatch.md). Worker: p2_03_implementation (gpt-5.6-terra).
- Before dispatch: compiler acceptance 17 passed; mission acceptance 15 failed for missing catalog adapter. Product implementation had not started.


## Acceptance evidence (2026-09-25)

- Independent mission acceptance: 15 passed; compiler: 17 passed; profile: 16 passed. Combined validation invocation discovered 339 Vitest tests including shipped regressions, all passed, exit 0. It emitted Windows worker-termination EPERM warnings after test completion.
- Worker checks: compiler/mission 32 passed, Gate/balance 9 passed, repository and validation typechecks passed.
- Independent content/catalog review: Luna clean after Astra strengthened distinct Rail placement and active-creep reroute assertions.
- Golden content hashes: M1 7503c616; M2 52f1f472; M3 c7ebd3e3. Seven static replay goldens approved after independent execution.
- M1 victory: 5474 ticks (182.5s). M2: 1609 ticks (53.6s). M3: 2476/2178 ticks (82.5/72.6s), Rail cells 51/12. Every empty-layout plan loses; reversed first M3 aim loses with zero Rail damage.
- Human opening time, comprehension, pacing and feel remain untested. Award metadata is accepted; actual victory-only persistent awarding belongs to P2-04.
- Full regression/web/APK build and Gradle unit/lint passed. Initial phone update rejected due to signing-certificate mismatch; data preserved while local-key triage proceeds.


## Integration direction (2026-09-26)

The owner requested pulling main, resolving conflicts and pushing this state, with no new builds or phone deployment. Rebase onto main includes the intervening Neon art changes without broadening P2-03. Earlier APK build evidence remains historical; the phone update failed due to a signing mismatch and no native certification is claimed. GitHub Releases is the delivery path. P2-04 still requires its own frozen API and expected-red campaign acceptance gate.

Rebase verification on 2026-09-26 at main 201dbe2: no conflicts; 302 shipped Vitest tests and 19 Node checks passed, all 48 P2-01/02/03 acceptance checks passed, typecheck passed. No new build or deployment ran.
