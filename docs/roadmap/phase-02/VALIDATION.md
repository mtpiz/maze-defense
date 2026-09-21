# Astra-Owned Phase 2 Validation

The task checklists below are acceptance requirements. P2-01 and P2-02 have executable feature
acceptance suites. Astra must author and red-check each later suite before releasing its packet.
Workers add unit tests for implementation detail, but do not edit these independent contracts.

## Commands

Run from the repository root on Windows:

```powershell
# P2-01: accepted; all 17 cases must pass.
npx.cmd vitest run --config validation/phase-02/vitest.config.ts validation/phase-02/content.acceptance.test.ts
npx.cmd tsc -p validation/phase-02/tsconfig.json

# P2-02: expected red until the local profile and store are implemented.
npx.cmd vitest run --config validation/phase-02/vitest.config.ts validation/phase-02/profile.acceptance.test.ts

# Current shipped behavior: must stay green.
npm.cmd test
npm.cmd run typecheck
```

The validation config has the same workspace aliases as the normal config but an independent test
include. Never use `--passWithNoTests`. Compiler availability is asserted; missing exports fail.
Initial red check on 2026-09-21: all 16 acceptance cases were discovered and failed because the compiler
export is not implemented. This is deliberate pending-feature evidence, not a shipped-game regression.
P2-01 integration: original cases plus one independently reproduced loan-availability regression now
pass (17 total). The current compiler and its worker unit tests also pass the normal regression suite.
P2-02 red check: 16 cases discovered, missing profile implementation; independent test typecheck passed.
Use targeted normal tests while iterating. Full tests/build/native checks happen at shared-contract
integration and phase gates, not repeatedly for every documentation or styling change.

## Acceptance Matrix

| Packet | Cases Astra must approve | Executable status |
|---|---|---|
| P2-00 | Four separate verdicts, exact APK/device, explicit unmet targets, approved visual baseline | Evidence checklist in packet |
| P2-01 | Schema/version, immutable detached output, canonical hash, semantic hash changes, malformed waves/references, bad Arena structure, available loans, simulator compatibility | `validation/phase-02/content.acceptance.test.ts`: 17 passed |
| P2-02 | Empty store, valid reload, corrupt primary/backup, both corrupt preserved, unknown future version, interrupted write, concurrent writes, quota rejection, bounded native-read failure | `validation/phase-02/profile.acceptance.test.ts` authored, 16 cases |
| P2-03 | M1 no Waypoint/Drone-only, M2 one Waypoint/live build, M3 Rail loan/award, connected unlock order, purposeful waves, deterministic wins/losses, forecast matches groups | Astra authors `missions.acceptance.test.ts` after P2-01 |
| P2-04 | First boot M1, map after first victory, locked nodes denied, trial loan without ownership, victory unlock once, defeat unlock never, replay no duplicated reward, stars never decrease | Astra authors `campaign.acceptance.test.ts` after P2-02/03 |
| P2-05 | Opening commands/facing/credits restored, rejected command handling, version/loadout mismatch, restart from completed-wave boundary, no duplicated kills/awards, paused recovery | Astra authors `recovery.acceptance.test.ts` after P2-04 |
| P2-06 | No first-boot menu, Foundation tap/hold/aim preserved, unavailable options absent, map unlock, fast results/retry, Help no rewards, safe areas, reduced motion | Astra authors `first-session-ui.acceptance.test.ts` plus browser journey after P2-04 |
| P2-07 | Fresh install/profile M1-M3 journey, Rail survives restart, recovery/corruption checks, frozen background, latest APK identity, uncoached observations | Astra authors final native journey once controls are integrated |

## Evidence Rules

- Each automated failure must identify the violated contract. Assert outcomes, not a worker's status
  flag or the mere presence of a button. Use fake storage and injected failures for save checks.
- Golden replays record content hash, simulation version, seed, tick-indexed commands, and outcome.
  A mismatch requires Astra's explanation/review; do not silently regenerate the golden.
- Human teaching targets: first Foundation placement within seconds, first combat roughly 15-30s,
  M1 duration 3-5 minutes. Record raw times and observations; do not turn bot completion into proof
  of comprehension or fun. No automatic wave launch that removes the player's planning choice.
- Visual baseline: approved dark neon HUD, board-first space, tower-colored projectiles, small swarm,
  stable contacts, larger heavy bodies, directional placement/aiming, and restrained level-one Rail.
- Storage adapter tests are not Android persistence evidence. Screenshots are not performance tests.
  Measure frame distribution and simulation/render work on the actual phone; label emulator data.
- Final evidence names APK/hash, device/OS, content/simulation versions, commands, screenshots/reports,
  failed cases, and owner verdict. Do not overwrite earlier evidence or claim a different build was tested.
