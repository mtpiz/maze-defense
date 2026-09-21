# Phase 2: First Session Work Board

Updated: 2026-09-21. Owner approved the current neon design and requested Astra-led architecture,
delegated implementation, and architect-owned validation. This is the execution index, not a replacement
for [SIX_MONTH_PLAN.md](../SIX_MONTH_PLAN.md), [GAME_DESIGN.md](../../design/GAME_DESIGN.md), or
[V2_ARCHITECTURE.md](../../architecture/V2_ARCHITECTURE.md).

## Outcome

A new player enters Mission One directly, learns Foundation construction, discovers the map after
victory, learns a Waypoint and live building in Mission Two, and earns Rail through Mission Three's
required loaned Technology Trial. Results, restored-plan retries, and recoverable local progress work.
Keep the approved dark, minimal, board-first neon presentation. Approval is a working visual baseline,
not certification of device performance or permission to multiply art across Worlds.

## Work Queue

| ID | Independently reviewable deliverable | Depends on | State | Suggested worker |
|---|---|---|---|---|
| [P2-00](P2-00-gate-evidence.md) | Record outstanding Core Combat evidence and verdicts | None | Ready: Astra-led evidence | Astra |
| [P2-01](P2-01-content-contract.md) | Versioned Mission compiler with stable content identity | None | Accepted: integrated, 17 acceptance checks pass | Terra |
| [P2-02](P2-02-local-profile.md) | Recoverable, versioned local player profile | None | Ready: 16 acceptance cases authored | Terra |
| [P2-03](P2-03-opening-missions.md) | Authored M1, M2, and required Rail trial | P2-01 | Blocked | Terra |
| [P2-04](P2-04-session-flow.md) | Campaign selection, results, and idempotent Rail award | P2-02, P2-03 | Blocked | Terra |
| [P2-05](P2-05-plan-recovery.md) | Opening-plan retry and between-wave recovery | P2-04 | Blocked | Terra |
| [P2-06](P2-06-first-session-ui.md) | Cold open, small map, results, and Help replay | P2-04 | Blocked | Terra; Astra design review |
| [P2-07](P2-07-first-session-gate.md) | Build-linked Android and uncoached first-session evidence | P2-00, P2-05, P2-06 | Blocked | Astra |

Ready means the inputs and architect-owned acceptance tests/checklist exist, not that the feature is
implemented. P2-01 is accepted; P2-02 is the next Ready implementation packet and has not been
dispatched. P2-03 still needs its architect-owned mission fixtures before dispatch despite its compiler
dependency now being met. P2-05/P2-06 can run together after the
P2-04 interface is integrated. Shared exports, bootstrap, and controller edits are serialized.

## Architect and Worker Responsibilities

- Astra owns decomposition, public contracts, acceptance tests, architecture changes, integration,
  visual review, and the final verdict. Workers own bounded implementation and additional unit tests.
- Use `ready -> in-progress -> review -> accepted`; `blocked` includes the concrete unmet dependency.
  A worker may mark review, never accepted. Record worker, branch/worktree, base revision, and evidence
  in its task file when dispatched. These fields are omitted until a worker actually exists.
- One packet per worker. Use an isolated worktree for concurrent coding; never copy or revert this
  dirty workspace wholesale. Astra records the exact integrated starting revision before dispatch.
- A handoff includes changed files, commands and exit codes, acceptance-case results, limitations,
  and evidence paths. No automatic commit/push/install by a worker. Astra integrates and deploys.
- Do not delegate tests/build commands alone. Prefer Terra for these implementation packets; Luna
  is appropriate only for a later tightly specified fixture/doc subtask. Escalate cross-module design
  decisions to Astra rather than inventing a new abstraction.
- Workers cannot change `validation/phase-02/`, weaken acceptance assertions, regenerate expected
  hashes, or change content objectives without Astra review. A real contract defect is reported.
- Before releasing the next blocked packet, Astra adds its executable acceptance tests and confirms
  the tests fail for the missing behavior. Do not confuse a written checklist with executable coverage.

## Architectural Boundaries

- Content validates immutable data; simulation owns combat/placement and accepts compiled definitions.
- The app orchestrator owns campaign navigation, result application, and persistence calls. Profile
  code is pure data logic; storage is a platform adapter, separate from existing LocalSettingsStore.
- Reuse simulation results, Stars, retry commands, and deterministic hashes already implemented.
  Do not rebuild them in UI. Preserve the noncanonical Gate and earlier visual entrypoints.
- A Mission catalog expresses available towers and loans. The current comparison's three specialist
  choices are not automatic campaign ownership. Keep Siege/Arc playable in the comparison; the
  Phase 2 campaign introduces only Foundation and loaned/unlocked Rail, as the roadmap specifies.
- Between-wave recovery is the Phase 2 minimum. No unsupported promise of exact mid-wave restore.
- No accounts/Firebase, Research economy, Siege trial, new creep mechanics, teleports/lava/traps,
  additional Worlds, monetization, or alternative art themes in these packets.

## Validation and Start Command

Read [VALIDATION.md](VALIDATION.md). Executable acceptance tests are intentionally outside the default
test suite until their features land; a missing implementation is a failing check, not a skipped test.

Start phrase: **"Run the next ready Phase 2 task."** Astra selects the first unclaimed Ready implementation packet,
confirms its prerequisites, dispatches one bounded worker, reviews the result, and advances the board.
This is a workflow convention, not an installed automation or a promise of background execution.

Phase 2 preparation can proceed under the owner's direction while P2-00 gathers evidence. The
Core Combat Gate remains open until its four verdicts are recorded; P2-07 cannot declare it passed
merely because these features compile or the owner likes the design.
