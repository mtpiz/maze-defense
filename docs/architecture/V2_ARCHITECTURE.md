# Tower Defense Successor — Architecture

Status: Certified implementation baseline  
Updated: 2026-09-03  
Primary candidate: TypeScript, Pixi 8, Preact, Capacitor  
Fallback: one Godot switch if the bounded Core Combat Gate fails

This document defines implementation constraints and deep-module seams for the standalone successor.
The [game design](../design/GAME_DESIGN.md), [Brood World brief](../design/WORLD_ONE.md),
[glossary](../../CONTEXT.md), and [hypothesis register](../design/PLAYTEST_HYPOTHESES.md) are its
companions. ADRs are historical records and do not override these current authorities.

## Objective

Build a deterministic, data-driven mobile game whose Mission rules can run without rendering, whose
presentation can change without rewriting those rules, and whose authored content can iterate
without recompiling mechanic code. The code must remain navigable by one developer and AI
collaborators through deep modules: small interfaces hiding substantial behavior.

The first engineering objective is not a platform or engine demo. It is an installable Core Combat
Gate that proves gameplay, device interaction, performance, and presentation feasibility together.

## Repository seam

The frozen live prototype remains deployable in the sibling `tower-defense-claude` repository. This
standalone repository owns the successor. It imports no prototype runtime code, dependencies,
generated output, or deployment configuration. Proven behavior is reintroduced only through an
explicit interface and tests.

The intended source organization is:

```text
/
  apps/game/             # orchestration, Pixi presentation, Preact UI, native shell
  packages/sim/          # deterministic Mission authority
  packages/content/      # source validation and immutable Content Bundles
  packages/testkit/      # scenarios, replay helpers, stress fixtures
  content/               # authored source data
  assets/                # source provenance and processed runtime assets
  docs/                  # current contracts, history, plans, and evidence
```

Extract a package only when its interface hides meaningful complexity or a second caller makes the
seam real. Folder count is not architecture.

The dependency direction is:

```text
validated Content Bundle
          │
          ▼
app/orchestrator ───► Simulation Kernel
      │                       │
      ├──► Pixi presentation ◄┘ snapshots and events
      ├──► Preact UI          ◄┘ UI projections
      └──► local platform adapters
```

- Simulation imports no Pixi, Preact, DOM, native, storage, network, or prototype code.
- Content imports no runtime presentation or platform code.
- Presentation and UI observe immutable projections and dispatch Commands.
- Presentation never recomputes authoritative combat, routing, cost, or eligibility rules.

## Simulation Kernel

### Interface

The kernel exposes one session-oriented interface conceptually equivalent to:

```ts
createMission(definition, loadout, seed): MissionSession
session.dispatch(command): CommandResult
session.advance(tickCount): AdvanceResult
session.getRenderSnapshot(): RenderSnapshot
session.getUiSnapshot(): UiSnapshot
session.drainPresentationEvents(): PresentationEvent[]
session.createCheckpoint(): MissionCheckpoint
session.getDeterminismHash(): string
```

Names may change. Callers never receive mutable internal collections or entities. Structured Command
rejections carry stable reason identifiers for UI feedback and tests.

### Timing and determinism

- Authoritative simulation advances at 30 fixed ticks per second.
- Quality rendering normally interpolates at 60 frames per second.
- Battery rendering may run at 30 frames per second without changing outcomes.
- Mission Speed advances additional fixed ticks; it never multiplies movement deltas.
- Simulation consumes tick counts and seeded randomness, never wall-clock time or `Math.random()`.
- Equivalent Content Bundles, seeds, Loadouts, and Commands produce equivalent hashes and results.

The candidate implementation runs in-process. A transport seam or Web Worker appears only if a
profile demonstrates contention and a second adapter makes that seam real.

### Deep internal modules

The external session interface may hide internal modules for:

- Mission phases and result state.
- Ordered-Waypoint route planning.
- construction and Field Credit transactions.
- deterministic encounter scheduling.
- targeting, weapons, Armor, damage, death, and leaks.
- statuses, Mass, displacement, barriers, regeneration, and boss phases.
- progression result calculation.

Content selects tested mechanic identifiers and data. It cannot inject executable callbacks.

### Commands

Player actions are serializable Commands, including:

- `PlaceFoundation` and `PlaceFoundationPath`.
- `Dismantle`, `InstallSpecialist`, `UpgradeTower`, `Refit`, and `Respecialize`.
- targeting-doctrine changes.
- `StartWave`, `EarlyLaunch`, pause, and speed changes.
- Opening Plan restoration.

MissionDefinition supplies an explicit construction policy. The certified Campaign default permits
Foundation placement during active waves but forbids Dismantle and route-changing removal. Keeping
the policy data-driven allows a direct planning-only comparison without branching the kernel.

### Snapshots and presentation events

Render and UI snapshots contain only the stable data their consumers require and never expose
authoritative mutable state. Presentation events describe semantic occurrences such as construction,
anticipation, shot, impact, barrier break, death, leak, branch selection, and boss phase change.

Events carry deterministic identifiers and sequence numbers. Presentation may pool, suppress, or
aggregate them under the Combat Readability Budget without changing the simulation.

## Route planner

The route planner hides all traversal logic behind route calculation and speculative-placement
interfaces. It computes sequential paths:

```text
entrance → W1 → W2 → … → exit
```

For each traversal layer it consumes:

- Arena dimensions and active-cell mask.
- layer-specific terrain mask.
- shared entrance, exit, and ordered Waypoints.
- dynamic blockers appropriate to that layer.

Every tower is a dynamic Ground blocker. Player towers are never Airborne blockers. World One hard
terrain normally blocks both layers; future Content Bundles may differ. Waypoints are unbuildable and
always traversable when their layer permits them. Out-of-order contact has no semantic effect.

Complete deterministic recomputation after a build edit is preferred while Arena sizes remain small.
Property tests generate placements and assert that every committed state preserves every required
route. A live placement becomes authoritative only after all applicable speculative routes succeed.

Displacement retains the creep's current required-Waypoint index, cannot create contact through a
skipped segment, and repaths toward that same requirement.

## Content pipeline

### Authored source

Content source describes:

- Galaxy, World, and Mission-node topology.
- Arena dimensions, active cells, traversal masks, entrances, exits, and Waypoints.
- Mission construction policy, objective, threats, Loadout constraints, rewards, and Mastery.
- deterministic wave groups, entrances, timing, and written tactical purpose.
- tower Levels, branches, costs, and mechanic identifiers.
- creep and boss contracts.
- Stars, World Gates, Research grants, Blueprint unlocks, and Schematic Fragments.

The source syntax remains replaceable. The compiler interface—not JSON versus JSON5—is the durable
seam.

### Compiler responsibilities

The content compiler must:

- validate schema versions, stable identifiers, references, and duplicate IDs.
- validate active shapes and every required traversal layer.
- reject impossible Mission starts and malformed wave schedules.
- validate Blueprint loans, Mastery Budgets, rewards, and fragment uniqueness.
- ensure normal Capability Checks have a guaranteed or loaned answer.
- require a written tactical purpose for every authored wave.
- emit a canonical immutable bundle and content hash.

Runtime bundles contain no arbitrary code. Saves and replays identify their content and simulation
versions.

### Authoring validation

Every authored Mission receives structural schema tests, route properties, headless completion and
loss scenarios, economy sanity checks, golden deterministic replays, forecast-versus-content checks,
and reward invariants. Bots detect impossible, broken, trivial, and malformed content; humans decide
whether it is understandable or fun.

## Presentation

Pixi owns battlefield presentation: terrain, towers, creeps, projectiles, route views, animation,
effects, camera fitting, pooling, atlases, and adaptive visual quality. Preact owns surrounding UI:
HUD, sheets, Maps, progression, settings, and results. Combat-event density must not cause DOM work
proportional to every hit.

The presentation layer consumes semantic events through bounded pools and priorities. Audio and
haptics use the same semantic vocabulary and do not trigger indiscriminately per hit.

### Combat Readability Budget

Each quality mode caps concurrent damage labels, particles, trails, decals, flashes, screen response,
audio voices, and haptics. Boss, leak, barrier, route, selection, targeting, health, and Waypoint
information outrank ordinary hit decoration. Adaptive reduction removes decoration before tactical
information.

### Asset pipeline

Gate assets use one coherent futuristic-player-versus-Brood proxy kit. The pipeline must preserve
source provenance and support repeatable import, atlas generation, animation, modular tower growth,
effects, and phone-scale review. Generated imagery is source material rather than automatically
accepted production art.

Broad visual exploration resumes after the Core Combat Gate. Production style locks only after the
Strategy Gate and approval of one complete production-quality Mission.

## Native mobile application

The Pixi candidate runs inside a portrait-locked Capacitor shell. Android physical devices are the
product reference; the browser and emulator are fast feedback surfaces only. Native adapters cover
lifecycle, safe areas, back behavior, audio interruption, haptics, local storage, and diagnostic
export.

The current scope deliberately excludes identity, cloud synchronization, billing, advertisements,
entitlements, remote configuration, and network-dependent gameplay. Do not create hypothetical
adapters for them. Their future requirements must earn their own seams.

## Local Player Profile

The eventual Campaign needs a versioned local Player Profile with:

- atomic or journaled writes.
- a checksum and last-known-good recovery copy.
- corruption detection and non-destructive recovery.
- ordered migration fixtures.
- saves after meaningful progress and app background.
- Opening Plans namespaced by Mission, Loadout, and content version.

A `ProfileStore` seam becomes real when web preview and native storage adapters both exist. Gate 1
does not need account progression persistence; it needs only local settings and diagnostic export.

Between-wave Mission recovery is the minimum later mobile contract. Mid-wave recovery follows
deterministic lifecycle evidence rather than being assumed.

## Replay seam

A replay records simulation and content versions, Mission and Arena identifiers, seed, effective
Loadout, ordered tick-indexed Commands, periodic hashes, and the final result. Gate 1 needs golden
replays and debugging export, not online verification.

## Core Combat Gate

### Playable artifact

The Gate builds one noncanonical 5–7-minute representative Mission with:

- Foundation, Rail, and loaned Siege.
- one or two ordered Waypoints.
- Drones, Carapaces, Broodlings, and Gliders.
- live Foundation construction and between-wave restructuring.
- six to eight purposeful waves.
- Armor, density, lane, area, Airborne, death, leak, and result behavior.
- real HUD, route presentation, compact damage text, semantic audio, haptics, and accessibility modes.
- coherent provisional Player Technology and Brood assets.

The artifact contains no World Map, Research UI, Schematic UI, cloud behavior, or commerce. It is not
Mission One and does not become Campaign content by accident.

A separate stress fixture reaches approximately 100 active creeps, 40 firing towers, representative
effects, and 3× simulation speed. A second synthetic Arena exercises a larger rectangle or irregular
active shape and minimum viable camera behavior without becoming production content.

### Independent evidence tracks

**Gameplay** passes when observation shows that waves change decisions, Rail and Siege produce
different geometry and investment, live construction adds adaptation without dominant route abuse,
and more than one credible Maze succeeds.

**Device interaction** passes when placement, painting, selection, route reading, UI, safe areas,
accessibility, lifecycle, and any necessary camera behavior work on physical Android hardware.

**Performance** passes when the representative Mission and stress fixture meet the recorded frame,
simulation, memory, thermal, battery, and stability targets on the chosen device classes.

**Presentation pipeline** passes when provisional towers, enemies, animation, effects, audio, and UI
can be produced and integrated repeatably without fragile bespoke renderer work.

Each track records evidence and its own verdict. Good performance cannot compensate for boring play;
disliked proxy styling cannot fail an engine that demonstrably supports the required presentation.

### Engine decision

Pixi continues only if all technical Gate tracks pass. A specific performance or pipeline failure may
receive one time-boxed repair with written exit criteria. Persistent failure causes one switch to
Godot; production never maintains two engines.

A Godot port reuses domain language, content definitions where practical, Command semantics,
deterministic scenarios, behavior expectations, and visual requirements as its specification. The
TypeScript Simulation Kernel itself is not assumed portable.

## Verification strategy

### Simulation and content

- Unit tests for deterministic rules and every mechanic.
- Property tests for routes, Commands, economy conservation, and progression invariants.
- Golden replay hashes for representative scenarios.
- Headless stress and balance fixtures.
- schema and reference validation for every Content Bundle.

### Presentation and device

- Screenshot comparison at supported aspect ratios and UI scales.
- touch and gesture tests on physical devices.
- route, Waypoint, Airborne, targeting, and status comprehension observation.
- reduced-motion, high-contrast, and effect-budget verification.
- suspend, resume, audio interruption, low-memory, and process-recreation tests.

### Performance

Quality mode initially targets 60 FPS on a representative midrange Android device; Battery mode
targets stable 30 FPS. Reports include frame-time distribution, simulation/render/UI work, memory,
thermal behavior, battery impact, load time, and visible hitches. Exact thresholds remain hypotheses
until physical-device baselines exist.

## Deferred decisions

The following do not block Gate 1:

- local Campaign database choice.
- in-process versus Worker transport.
- final content source syntax and validation library.
- production texture compression, atlas, animation, and audio codecs.
- exact Android and later iOS support ranges.
- cloud, identity, analytics, crash, billing, advertisement, and community providers.
- final production art direction.

Deferred decisions must not leak accidental assumptions into the Simulation Kernel or Content Bundle.
