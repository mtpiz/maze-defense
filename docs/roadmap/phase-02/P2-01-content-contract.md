# P2-01: Versioned Campaign Mission Compiler

State: Accepted and integrated into the current working tree. Dependencies: none.
Worker: Euclid, GPT-5.6 Terra, medium. Review owner: Astra.

Dispatched 2026-09-21. Agent: `01a0c596-a908-7cf2-958c-7188ca2447b9`.
Isolated workspace: `C:/Users/mpitt/.codex/worktrees/phase2-content-compiler/maze-defense`.
Base revision: `aa6b94ae2bb88eddaedf40c275da439be85b47c2`. The four current content source files
were copied into that old baseline; unrelated dirty workspace changes were not copied or committed.
Worker tests run from the main workspace with `P2_CONTENT_ROOT` pointing at the isolated content
package. This combines the worker's content changes with current simulation and architect acceptance
tests. Astra alone integrates reviewed changes and runs the current full suite.

## Outcome and Contract

Expose `compileCampaignMission(source: unknown)` from `@tower-defense/content`. Input is
`{ schemaVersion: 1, contentVersion: positiveInteger, mission, progression }`.
`mission` has the current `MissionDefinition` data fields, except `arena` is raw ArenaSource.
`progression` is `{ requires: string[], loans: TowerFamilyId[], awards: TowerFamilyId[] }`.
These are data, not executable callbacks. Output is an immutable, detached
`{ schemaVersion: 1, contentVersion, contentHash, mission, progression }`, with a compiled Arena.

Keep the content package independent of sim: describe its neutral compiled Mission data structurally
using content-owned types; the acceptance suite proves compatibility with `createMission`. Do not
move unrelated sim code or introduce a content-to-sim import. Hash canonical validated data, independent
of object key order; changes to versions, gameplay, or progression must change the hash.

Review clarification: export a `CampaignMissionSource` type with raw ArenaSource and optional
authored defaults so P2-03 can typecheck source data. Every loan must reference a catalog entry
available in this Mission; knowing the family ID alone is not enough to make the loan usable.
Awards may reference any known family (they are post-Mission ownership, not session availability).

## Files and Boundaries

- Create `packages/content/src/compile-campaign-mission.ts` and focused unit tests beside it.
- Modify `packages/content/src/index.ts`; add content-owned types in the compiler or model as needed.
- Read existing `compile-arena.ts`, sim MissionDefinition, and the architect-owned acceptance suite.
- Do not edit `packages/sim`, current Gate/Neon content, progression UI, package dependencies, or
  `validation/phase-02`. Keep export edits confined to this packet.

## Acceptance

- [x] All P2-01 executable cases pass, including simulator compatibility.
- Architect acceptance result: 17/17 passed after review, including loan availability.
- [x] Invalid input produces ContentValidationError with useful field paths, not incidental TypeError.
- [x] Validate integer schedules/counts/costs, nonempty tactical purpose, unique waves, known creep
      references, required Foundation, positive Lives, valid catalogs, and valid loan/award families.
- [x] Compile Arena through the existing validator; reject structurally invalid Arenas. P2-03's
      catalog adapter instantiates every compiled Mission to validate initial route reachability using
      the authoritative sim planner. Do not duplicate route planning inside the content package.
- [x] Deeply freeze a detached result, leaving the source caller's object untouched and mutable.
- [x] No campaign runtime switching yet; existing comparison remains unchanged.

## Execution and Validation

1. Run the acceptance command in VALIDATION.md and record its expected missing-export failure.
2. Add focused unit cases for structured error paths and catalog validation; implement the compiler.
3. Run the acceptance suite, `npm.cmd test`, and `npm.cmd run typecheck`.
4. Submit changed files and actual command results for Astra review. No push or phone installation.

Handoff to P2-03: exported source/output types, documented canonicalization/hash rules, and examples
that compile into a valid MissionSession without UI or storage. Unknown cross-Mission references are
validated when P2-03 assembles the three-Mission catalog, not guessed by this single-Mission compiler.

## Review and Integration Evidence

2026-09-21: initial dispatch was interrupted by an account usage limit. After the user resumed and
live usage became available, the same agent resumed the same worktree; no duplicate worker/task.

Astra reviewed the implementation and returned three fixes: reject a known loan missing from the
Mission catalog, export authoring source types, and repair readonly mutations in worker unit tests.
The loan regression was independently reproduced red, then passed after the worker fix. Strict test
typechecking was added because the worker's package-only typecheck excluded test files.

Integrated only `packages/content/src/compile-campaign-mission.ts`, its four-case unit test, and its
public barrel export. No other worker files or old-baseline changes were copied back. Content input
is explicit data; unknown extra fields are omitted, optional defaults are normalized, arrays retain
authored order, object keys are sorted for the existing FNV-1a-style content hash, and output is
detached/deeply frozen. This hash is content identity, not an authenticity/security signature.

Independent integrated verification: 17 architect acceptance tests passed; the normal suite passed
19 Node tests and 239 Vitest tests in 37 files. Strict production/test TypeScript, independent acceptance
suite typechecking, the production web build, and whitespace checks passed. No campaign UI change, APK install, commit, or push
was performed for this packet. The managed worker checkout is retained as review evidence.
