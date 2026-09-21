# Directional Tower Coverage Implementation Plan

Status: Completed and verified on 2026-09-20.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add deterministic directional acquisition and planning-only tower aiming with truthful Neon board overlays.

**Architecture:** Content authors weapon geometry; simulation owns mounted facing and target eligibility; the controller exposes one aiming action; Neon converts pointer direction to a quantized angle and renders the snapshot geometry. Existing secondary weapon mechanics stay untouched.

**Tech Stack:** TypeScript, Vitest, Preact, PixiJS 8, deterministic fixed-tick simulation.

**Spec:** `docs/superpowers/specs/2026-09-20-directional-tower-coverage-design.md`

## Global Constraints

- Rail: 0-5.25 cells, 30-degree sector, two-target line penetration.
- Siege: 1.25-3.5 cells, 90-degree sector, 1.2-cell Ground blast.
- Arc: 0-2.25 cells, 180-degree sector, three targets, 1.25-cell jumps.
- Foundation remains 0-1.3 cells and 360 degrees.
- Damage, cooldown, armor piercing, costs, and construction delays do not change in the first playtest.
- Aiming is accepted only during opening and planning.

---

### Task 1: Deterministic Coverage Geometry

**Files:**
- Modify: `packages/content/src/model.ts`
- Create: `packages/sim/src/tower-coverage.ts`
- Create: `packages/sim/src/tower-coverage.test.ts`
- Modify: `packages/sim/src/index.ts`

**Interfaces:**
- Produces: `normalizeFacing(facingMilliDegrees)`, `bearingMilliDegrees(dx, dy)`, and `isPointInWeaponCoverage(...)`.
- Produces: weapon fields `minimumRangeMilliCells` and `coverageArcMilliDegrees`.

- [ ] Write failing table tests for full-circle, narrow-sector, wraparound, boundary, and dead-zone eligibility.
- [ ] Run `npx vitest run --config vitest.config.ts packages/sim/src/tower-coverage.test.ts` and confirm failures are caused by the missing module or fields.
- [ ] Implement integer-facing helpers and add the four approved weapon geometries.
- [ ] Rerun the focused test and confirm it passes.

### Task 2: Simulation Facing and Aim Command

**Files:**
- Modify: `packages/sim/src/mission-session.ts`
- Modify: `packages/sim/src/mission-session.test.ts`
- Modify: `packages/sim/src/mission-flow.test.ts`

**Interfaces:**
- Consumes: Task 1 coverage helpers and weapon fields.
- Produces: `TowerSnapshot.facingMilliDegrees` and `MissionCommand` variant `{ type: 'aim-tower'; towerId; facingMilliDegrees }`.

- [ ] Write failing mission tests proving a Rail fires only inside its mounted sector, Siege ignores targets inside 1.25 cells, angle wraparound works, and aiming is rejected during a wave.
- [ ] Run the focused simulation tests and confirm the expected geometry and missing-command failures.
- [ ] Add facing to tower state/snapshots, deterministic route-facing on specialist install, aim validation, command dispatch, and primary target coverage filtering.
- [ ] Increment `SIMULATION_VERSION` because checkpoints and hashes change.
- [ ] Rerun the focused simulation tests and confirm they pass.

### Task 3: Controller and Neon Aim Interaction

**Files:**
- Modify: `apps/game/src/application/benchmark-controller.ts`
- Modify: `apps/game/src/application/benchmark-controller.test.ts`
- Create: `apps/game/src/neon/tower-aim.ts`
- Create: `apps/game/src/neon/tower-aim.test.ts`
- Modify: `apps/game/src/neon/neon-app.tsx`
- Modify: `apps/game/src/neon/neon-app.test.ts`

**Interfaces:**
- Consumes: `aim-tower` and `TowerSnapshot.facingMilliDegrees`.
- Produces: `BenchmarkController.aimSelected(facingMilliDegrees)` and pointer-to-facing conversion.

- [ ] Write failing tests for controller dispatch, planning/wave feedback, pointer angle conversion, drag threshold, and preserving tap/build gestures.
- [ ] Run the focused controller and Neon tests and confirm they fail for the absent behavior.
- [ ] Implement planning-only selected-tower aiming and a board drag gesture that previews then commits facing.
- [ ] Rerun focused tests and confirm they pass.

### Task 4: Truthful Coverage Overlay and Mounted Art

**Files:**
- Create: `apps/game/src/neon/coverage-shape.ts`
- Create: `apps/game/src/neon/coverage-shape.test.ts`
- Modify: `apps/game/src/neon/neon-arena.ts`
- Modify: `apps/game/src/neon/neon-arena.test.ts`

**Interfaces:**
- Consumes: selected tower range, minimum range, coverage arc, and mounted facing.
- Produces: deterministic annular-sector points in board-cell coordinates and `NeonArena.aimPreview`.

- [ ] Write failing tests for 30/90/180/360-degree shapes, Siege inner radius, wraparound, and preview direction.
- [ ] Run focused renderer tests and confirm the old full-circle overlay fails.
- [ ] Draw the restrained family-colored sector on the route layer and use mounted facing for idle tower art.
- [ ] Rerun focused renderer tests and inspect 390x844 and landscape screenshots.

### Task 5: Balance and Delivery Verification

**Files:**
- Modify only if evidence requires it: `apps/game/src/application/gate-balance.test.ts`
- Modify: `docs/art/ASTRA_NEON_V3.md`

**Interfaces:**
- Consumes: completed directional simulation and Neon interaction.
- Produces: recorded playtest evidence and a fresh Android debug APK.

- [ ] Run `npm test`, `npm run typecheck`, and `npm run build`.
- [ ] Run deterministic Gate scenarios and record tower uptime/outcome; do not alter damage or cooldown unless a specialist cannot perform its authored role.
- [ ] Verify selection, re-aiming, locked wave facing, reduced motion, zoom/pan, and no overflow in browser screenshots.
- [ ] Run `npm run android:build -- -DeviceSerial emulator-5554`, then native smoke and inspect the ADB screenshots.
- [ ] Record the geometry and evidence in `docs/art/ASTRA_NEON_V3.md` and report the hashed APK path.
