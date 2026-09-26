# P2-05: Retry and Between-Wave Recovery

State: Blocked on Astra recovery design and acceptance tests; P2-04 accepted. Worker: Terra. Review owner: Astra.

## Outcome and Boundaries

Preserve the valid opening plan across retries and app restarts; recover an interrupted Mission at its
last completed-wave boundary, paused. Namespace saves by Mission, content hash, simulation version,
and effective loadout. Clear incompatible recovery safely while retaining permanent progress.

Primary files: new `apps/game/src/application/mission-recovery.ts`, orchestrator hooks, profile-store
recovery-envelope support, and focused tests. Existing `createCheckpoint()` is serialization only;
do not assume a restore API exists. Astra must choose and test boundary checkpoint restoration versus
deterministic command-log reconstruction before this packet is Ready. No ad hoc assignment to private
simulation fields. Any new sim restore surface needs its own strict validation and version checks.

## Acceptance

- [ ] Retry restores Foundation/specialist placement, facing, opening credits, and untouched wave state.
- [ ] Invalid/rejected saved commands fail explicitly without partial charge or a half-restored plan.
- [ ] Process death during a wave restores the last completed-wave boundary, not a fabricated mid-wave
      position. First-wave death recovers the opening plan. Backgrounding still pauses active play.
- [ ] Restored run matches uninterrupted deterministic state at the saved boundary and subsequent ticks.
- [ ] Restoring cannot duplicate income, deaths, rewards, or an already committed Mission result.
- [ ] Missing/corrupt/version-mismatched recovery never wipes permanent profile progress.
- [ ] Recovery opens paused and never consumes hidden/background time.

## Validation and Handoff

Astra supplies save/load replay pairs, corrupt envelopes, mismatched identities, and result-race cases
in `recovery.acceptance.test.ts`. Run recovery/profile/campaign acceptance and sim/lifecycle regressions.
Shared simulation changes require the full suite and native verification at integration. Handoff
documents the exact recovery guarantee and leaves mid-wave resumability explicitly out of scope.
