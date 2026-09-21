# P2-00: Core Combat Evidence Handoff

State: Ready for Astra-led evidence work. Dependencies: none. No runtime implementation delegated.

## Outcome

Record what the owner approved and what still needs proof before the Core Combat Gate can close.
Read `docs/roadmap/BENCHMARK_BUILD_STATUS.md` and the four tracks in `SIX_MONTH_PLAN.md`.

## Scope

Allowed: update build-status evidence; add build-linked captures under `artifacts/`. Preserve raw results.
Excluded: new game systems, engine changes, artificial passing thresholds, resetting the owner's profile.

## Acceptance

- [ ] Record current neon visual approval as the Phase 2 baseline, not final production-art approval.
- [ ] Separate gameplay, physical interaction, performance, and presentation-pipeline verdicts.
- [ ] Collect outstanding alternate-arena and sustained physical stress evidence; report memory,
      hitches, thermal/battery observations, mode, duration, and exact hardware.
- [ ] Before capture, Astra records numerical targets from the existing gate/device test protocol;
      if none are approved, mark performance unresolved rather than inventing a pass after measurement.
- [ ] Owner/tester observations distinguish a visually approved build from fun/strategic validation.
- [ ] Name missing evidence and the next bounded action for each unresolved track.

## Validation and Handoff

Use the existing `scripts/android-build.ps1`, `scripts/android-verify.ps1`, and Gate stress fixture;
inspect supported arguments first. Do not treat the short `crowd-phone-smoke.mjs` as a stress result.
Commands with meaningful exit codes, APK identity, device details, four verdicts, and evidence links
are the deliverable. This packet can stay open without blocking pure Phase 2 contract preparation.
