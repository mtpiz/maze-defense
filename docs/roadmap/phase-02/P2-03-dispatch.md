# P2-03 frozen dispatch contract

Base: f2f0f5b. Worktree: p2-03-opening-missions. Branch: codex/p2-03-opening-missions.
Scope approved by the owner: P2-03 only. No UI, profile, crowd physics, weapon changes or campaign launch.

1. Astra owns validation/phase-02/missions.acceptance.test.ts. Confirm expected red before dispatch.
2. Terra owns only content/world-01/first-session/**, apps/game/src/application/first-session-missions.ts, packages/testkit/src/first-session/**.
3. Astra reviews actual content and replay evidence, freezes golden values, runs compiler/mission acceptance, Gate balance, typecheck and integration verification. P2-04 remains separate.

The adapter exports FIRST_SESSION_SOURCES (CampaignMissionSource[]), FIRST_SESSION_MISSIONS (CompiledCampaignMission[]), compileFirstSessionCatalog(sources: readonly unknown[]) and getWaveForecasts(entry), returning { waveId, total, counts } per wave. Catalog validation compiles, validates the exact required connected three-mission path, and instantiates all missions using createMission to verify both movement layers. Reuse existing compiler, planner and simulation; no duplicate combat logic.

packages/testkit/src/first-session/replay-plans.json is a static array of plans: id, missionId, integer seed, simulationVersion, contentHash, outcome ('victory'|'defeat'), durationTicks, determinismHash, commands [{tick, command}]. Ticks are absolute simulation ticks; preserve same-tick command ordering. Commands are accepted, affordable, explicit (including wave starts), without adaptive code. Supply one victory and one empty-layout defeat per mission, plus a second M3 victory with different placement cells. Every victory includes useful Foundation damage; M2 includes accepted live Foundation placement changing the route; M3 includes damaging, deliberately aimed Rail. Reversing the first M3 win's aim must reduce Rail damage and total kills. Initial golden hashes are worker proposals, frozen only after independent Astra replay.

M1 scripted winning elapsed simulation time is 180-300 seconds; it is a pacing proxy excluding human opening time, not evidence of teaching or fun. Keep M2 short. Missions use authored meaningful waves with distinct tactical purposes and forecasts exactly summing group counts (burstSize does not multiply count). Rail level one stays maxTargets 1, coverageArcMilliDegrees 90000, rangeMilliCells 2500. Foundation/Rail weapon definitions reuse established levels; tune encounters, not weapons. Written pacing concerns and plan summaries belong under content/world-01/first-session/README.md.

Checks: npx.cmd vitest run --config validation/phase-02/vitest.config.ts validation/phase-02/content.acceptance.test.ts validation/phase-02/missions.acceptance.test.ts; npx.cmd tsc -p validation/phase-02/tsconfig.json; npm.cmd run typecheck; existing packages/balance tests. Worker does not edit architect validation/docs, commit, push or install to phone. Report any contract defect to Astra.

Progress: acceptance contract authored; pending expected-red check. No implementation released yet.

2026-09-25: 15 mission cases discovered and failed for the absent adapter; 17 compiler cases passed. Terra dispatched. Architect runner handles an earlier terminal state in the reversed-aim counterfactual without requiring later commands to remain dispatchable.

Contract review: Luna identified that comparing Foundation cells alone did not prove distinct Rail placements. Astra changed the assertion to compare actual terminal Rail cells. Both M3 layouts must independently win and deal Rail damage; no worker code boundary changed.

Architect content ruling: M1 needs multiple purposeful waves rather than one stretched Drone drip to meet the pacing target; M2 live adaptation must happen with active creeps. These checks refine the approved teaching objectives within existing file ownership. If pacing feels wrong in human play, revisit encounter data only.

Implementation complete: Terra stayed within all three owned paths; 32 compiler/mission acceptance, 9 focused balance checks and both typechecks passed. Luna final source review clean. Astra independently replayed and froze all seven goldens (15 mission tests passed), with no simulation/weapon/UI/profile changes. Integration build and phone signing triage remain with Astra.

2026-09-26: owner authorized integration onto latest main and prohibited further builds/phone deployment. P2-03 accepted on independent content/replay evidence; native/teaching/feel evidence remains explicitly separate.
