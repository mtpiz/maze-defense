# P2-04 frozen campaign contract

Base: b8c99db. Worktree: p2-04-campaign-flow. Branch: codex/p2-04-campaign-flow.
Approved scope: application orchestration and pure result application only. No builds, Android/phone commands, release creation, UI, new progression economy, persistence internals, simulation, weapon or mission-content edits.

## Task 1 - Astra acceptance gate

Author validation/phase-02/campaign.acceptance.test.ts, prove it fails before dispatch, and retain sole ownership. Tests exercise actual BenchmarkController simulation using the approved P2-03 command fixtures, injected save failures/delays and ProfileStore reload. No golden regeneration.

## Task 2 - Terra implementation

Owned files: apps/game/src/application/first-session-controller.ts and .test.ts; apps/game/src/application/player-profile.ts and .test.ts. BenchmarkController already accepts a MissionDefinition, so no constructor plumbing is needed. Report any proposed extra file change before acting. No commits/pushes/subagents. Run campaign/profile/missions acceptance, validation typecheck, repository typecheck and focused controller/balance tests; Astra handles final full-suite integration.

Export from player-profile.ts:
- MissionResult = { outcome: 'victory'; stars: 1|2|3 } | { outcome: 'defeat'; stars: 0 }.
- applyMissionResult(profile: PlayerProfile, entry: CompiledCampaignMission, result: MissionResult): PlayerProfile. Pure detached/deep-frozen output, no input mutation. Defeat preserves all progress/destination. Victory takes max previous/new Stars, unions authored awards once, preserves unrelated fields and sets destination to map. Reject inconsistent outcome/Stars at runtime. No additive reward ledger or schema change is needed for set/max rewards.

Export from first-session-controller.ts:
- ProfileWriter { save(profile: PlayerProfile): Promise<{revision:number}> }; caller must first load the existing ProfileStore successfully. Do not silently replace corrupt/unavailable profiles.
- FirstSessionController(profile: PlayerProfile, writer: ProfileWriter), using FIRST_SESSION_MISSIONS internally and composing BenchmarkController without UI imports.
- getState(): FirstSessionView, subscribe(listener): unsubscribe, dispose(). Published view is detached/read-only; no raw mutable combat controller exposed.
- FirstSessionView has screen: 'mission'|'results'|'map'; profile (last committed profile); activeMissionId: string|null; mission: BenchmarkViewState|null; nodes: readonly {id:string, locked:boolean, bestStars:0|1|2|3}[]; mapAvailable:boolean; loanedBlueprints: readonly specialist family IDs[]; result: null|{missionId:string,outcome:'victory'|'defeat',stars:0|1|2|3,awardedBlueprints:readonly specialist family IDs[]}; saveStatus:'idle'|'saving'|'error'; saveError:string|null.
- selectMission(id):boolean, showMap():boolean, retryMission(restoreOpening=true):boolean. Reject locked/unknown IDs directly. Fresh profile cold-opens M1; valid saved mission destination may reopen only unlocked mission; invalid/locked destination falls back to M1 before first clear, otherwise map. A saved map cannot bypass the first clear.
- retrySave():Promise<boolean>. Auto-save on actual victory; use a run identity/handled guard to prevent repeated terminal notifications creating multiple writes. Coalesce retries while saving. A failed write retains exactly the same candidate and completed session; retry retries the write, never recomputes awards or replays combat. While saving/error, selectMission/showMap/retryMission return false and all combat-mutating actions are inert. Only after success publish newly committed Stars/unlocks/map availability. Save failure is explicit and retryable. If ProfileStore rejects further writes for its own safety, surface that failure without bypassing it.
- Proxy existing controls: tapCell, clearSelection, dismantleSelected, installSelected, aimSelected, startWave, togglePause, cycleSpeed, setForeground, advanceFrame; interpolationAlpha getter. Same argument/return shapes as BenchmarkController. Gameplay actions only act on active mission screen; lifecycle foreground state survives mission replacement. Defeat shows results but writes no progress. Same-session retry reuses BenchmarkController.retry's opening restoration while resetting result/run guard. Mission switching creates a fresh BenchmarkController and detaches the old listener.

Navigation selection is transient in this packet; victory persists destination=map. No save is required merely to inspect the map/select an unlocked mission. Cross-process mission recovery is P2-05. Results remain visible after successful save; showMap reveals the now-available three-node map. Rail catalog loans affect current session availability only; profile ownership changes only after saved victory. Available specialists are constrained by authored catalog and owned/loaned eligibility; changing missions never carries credits, speed, towers or loans.

## Task 3 - Review and integration

Independent review checks scope, async save races, immutable views, duplicate/replayed awards, real terminal results, retry and mission/lifecycle isolation. Astra runs full tests once at integration, updates packets and pushes via the requested solo workflow. User explicitly prohibited builds/phone deployment; do not substitute an emulator build. P2-05/P2-06 remain separate packets requiring their own acceptance gates.

Progress: contract authored; expected-red confirmation pending.

2026-09-26: 10 campaign cases discovered and failed for absent first-session-controller; validation typecheck passed. Worker p2_04_implementation (Terra) dispatched after the red gate. Independent contract review assigned to Luna.

Contract review: Luna requested explicit preservation of terminal mission/result across failed save and retry; Astra added those comparisons plus a reentrant result-listener check proving navigation locks before notification. Contract count is now 11; behavior/ownership unchanged.

Review ruling: entering map detaches the old session and publishes activeMissionId=null, mission=null, loanedBlueprints=[] (matching cold-loaded map state); a result summary may remain. This makes the read-only view unambiguous for P2-06. If an old-session map retry is later desired it needs an explicit recovery action. Astra also adds a synchronous writer-throw retry regression: save errors must be retryable regardless of whether the writer throws or returns a rejected Promise.

Fix round 1: Astra reproduced synchronous writer failure retaining a settled Promise (12 cases: 11 passed, 1 failed before fix). Terra to fix save-attempt identity and detach map session. Independent map view assertion already passed after worker self-review, but map action must also clear the dormant controller (retry from map returns false).

Complete: 12 campaign cases passed, all 60 Phase 2 acceptance cases passed, full shipped suite (307 Vitest plus 19 Node checks) passed before final Neon-only rebase, both typechecks passed. Luna scoped re-review approved both fixes. No scope deviation or deployment. P2-05/P2-06 are unblocked on P2-04 but still need independent acceptance gates.
