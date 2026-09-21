# P2-03: Author Missions One Through Three

State: Blocked on P2-01 and Astra's mission acceptance fixtures. Worker: Terra. Review owner: Astra.

## Outcome

Author real campaign encounters rather than renaming the noncanonical Gate. Read WORLD_ONE.md's
opening curriculum. Use the approved neon look; no Brood art production or new visual theme.

## Files and Boundaries

Create `content/world-01/first-session/` Mission/Arena data and
`apps/game/src/application/first-session-missions.ts` as its small compiled catalog adapter.
Add command-plan/replay fixtures under `packages/testkit/src/first-session/` when consumed by tests.
Do not edit crowd physics, weapon mechanics, comparison Mission data, profile code, or UI.

## Acceptance

- [ ] Stable IDs `world-01-mission-01`, `world-01-mission-02`, `world-01-rail-trial` form M1 -> M2 -> M3.
- [ ] M1: no Waypoint, Drone-only early pressure, Foundation only, 3-5 minute experienced-play target.
- [ ] M2: one Waypoint, live Foundation construction, short encounter demonstrating route adaptation.
- [ ] M3: required Rail trial, loaned Rail catalog entry and Rail award on victory; no ownership assumed.
- [ ] Foundations are useful without making unchanged default play an automatic win. Rail geometry
      matters; level-one Rail stays single-target with 90-degree coverage and 2.5-cell range.
- [ ] Each wave has a distinct written tactical purpose; forecast counts exactly match authored groups.
- [ ] Catalog rejects duplicate IDs, missing prerequisites, cycles, and unreachable required trial.
- [ ] Instantiate every compiled Mission through `createMission` during catalog validation; reject
      impossible initial Ground/Air routes using the existing authoritative planner.
- [ ] Every Mission has a deterministic affordable winning plan and deliberate losing plan. M3 has
      at least two credible winning placements. Timing/playability hypotheses remain human-tested.

## Validation and Handoff

Astra authors mission structure assertions and replay-outcome checks before dispatch. Worker provides
plans as tick-indexed commands, seeds, hashes, and duration summaries. No change to approved tests or
golden values without review. Run compiler/mission acceptance, existing Gate balance tests, typecheck.
Handoff: compiled catalog, plan fixtures, content hashes, and known pacing concerns; no campaign launch.
