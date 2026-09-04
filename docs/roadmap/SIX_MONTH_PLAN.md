# Tower Defense Successor — Six-Month Evidence Plan

Status: Certified plan; Core Combat Gate implementation next  
Updated: 2026-09-03  
Team: One primary developer using AI-assisted engineering, design, art, audio, and QA, with a small
friend playtest group

This roadmap proves the game in dependency order. Week numbers describe effort windows after work
resumes; evidence, not elapsed time, opens the next phase.

## Six-month outcome

The target is an installable portrait Android build containing:

- one cohesive, production-quality Brood World.
- a short functional proxy-art path through Worlds Two and Three that proves Blueprint pacing.
- Foundation, Rail, Siege, Arc, and Gravity through the Levels needed by that path.
- deterministic authored Missions, Stars, Technology Trials, Research, Schematic Fragments, and
  varied budgeted Masteries.
- reliable local progression, recovery, settings, accessibility, audio, haptics, and 30/60 FPS modes.
- evidence from repeated physical-device use and available uncoached friend testing.

It is a production-quality proof of the game, not a public live-service launch. It contains no real
commerce, advertisements, account system, cloud synchronization, community service, seasonal
cadence, or renewable endgame mode.

## Operating rules

1. A Production Gate passes only on recorded evidence.
2. Test Android hardware every week after the native shell is usable.
3. Prove fun without account rewards before using progression to extend engagement.
4. Keep content and tuning data-driven.
5. Automated checks catch broken rules; uncoached humans judge comprehension and interest.
6. Remove content before lowering Maze, accessibility, reliability, readability, or performance quality.
7. Use coherent provisional art until mechanics survive the Strategy Gate.
8. Begin broad visual exploration after the Core Combat Gate, but multiply production art only after
   one approved post-Strategy visual Mission.
9. Do not build deferred platform infrastructure because an interface might be useful someday.

## Gate summary

| Gate | Target window | Evidence | Failure response |
|---|---:|---|---|
| Core Combat | Week 4 | Fun, device interaction, performance, and presentation-pipeline tracks on the noncanonical combat slice | Repair the failed track; switch engine only for persistent technical failure |
| First Session | Week 8 | Functional cold-open M1–M3, Rail unlock, local results, and uncoached comprehension | Repair onboarding, pacing, controls, or early encounter design |
| Strategy | Week 14 | Rail/Siege World One system plus proxy Arc/Gravity and multi-World progression demonstrate distinct builds and meaningful Research | Rework convergent towers, waves, progression, or economy before production art |
| World One | Week 20 | Approved visual Mission followed by complete start-to-boss Brood World | Cut redundant Missions/Arenas before cutting quality |
| Internal Release | Week 26 | Reliable saves, accessibility, device performance, balance, and friend-build evidence | Continue internal iteration; do not label the build public-ready |

## Phase 1 — Core Combat Gate, Weeks 1–4

### Existing baseline

- Standalone successor repository and dependency rules.
- fixed-step Mission Session, serializable Commands, snapshots, events, and replay hashes.
- schema-validated Arena content and deterministic ordered-Waypoint routing.
- distinct ground and Airborne traversal masks.
- Foundation tap placement, drag painting, route validation, HUD, native Android shell, and diagnostics.
- emulator build and preliminary frame evidence.

Existing probes and procedural visuals are scaffolding, not representative combat or art approval.

### Gate artifact

Build one noncanonical 5–7-minute Mission with:

- Foundation, Rail, and loaned Siege.
- Drones, Carapaces, Broodlings, and Gliders.
- one or two ordered Waypoints.
- live Foundation construction.
- six to eight purposeful waves.
- Ground and Airborne route presentation.
- Armor, density, lane, area, death, leak, and Mission-result behavior.
- opening and between-wave planning, Early Launch, predictable Field Credits, pause, and speed.
- coherent provisional futuristic towers, Brood enemies, effects, compact damage text, audio, haptics,
  high contrast, and reduced motion.

Do not add World Maps, Research screens, Schematics, permanent rewards, accounts, or commerce.

### Test fixtures

- Representative playable 9×14 Arena.
- Synthetic larger or irregular Arena exercising content-defined active cells, routing, fit, touch,
  and minimum camera behavior.
- Synthetic stress scene with approximately 100 active creeps, 40 firing towers, representative
  effects, and 3× simulation speed.

### Four independent verdicts

**Gameplay**

- Waves cause observable plan changes.
- Rail and Siege reward different geometry and investment.
- Live construction adds adaptation without dominant route-juggling or frantic input.
- More than one credible Maze succeeds.
- Available testers show voluntary experimentation beyond a single polite completion.

**Device interaction**

- Placement, painting, selection, UI, route reading, safe areas, lifecycle, and accessibility work on
  physical Android hardware.
- The standard board is comfortable; the alternate fixture proves the architecture is not 9×14-only.

**Performance**

- Representative and stress captures report frame distribution, simulation/render/UI work, memory,
  thermal behavior, battery impact, and visible hitches.
- Quality and Battery modes meet their recorded device targets without hiding tactical information.

**Presentation pipeline**

- Provisional towers, enemies, animations, effects, audio, and UI integrate repeatably with tracked
  provenance.
- Phone-scale silhouettes and feedback survive combat density.
- The renderer does not require unsustainable bespoke work to reach the target presentation class.

### Engine decision

Continue Pixi only if the technical tracks pass. One specific failure may receive one bounded repair
with written exit criteria. Persistent performance or pipeline failure triggers a single Godot port;
production never carries both implementations.

## Phase 2 — First Session, Weeks 5–8

Goal: prove the real opening without production-art multiplication.

### Product

- Cold-open directly into a three-to-five-minute Mission One.
- Reach first Foundation placement within seconds and first combat within roughly 15–30 seconds.
- Introduce one Waypoint and live construction in the next short Mission.
- Loan Rail in its required Technology Trial no later than Mission Three; award its base Blueprint on
  victory.
- Reveal the World Map only after first victory.
- Complete fast results, restored-plan retry, and Help replay for learned mechanics.

### Engineering

- Convert the Gate mechanics into versioned authored Mission content.
- Add deterministic results, Stars, Opening Plan restoration, and minimal versioned local profile.
- Retain golden replay, route, content, lifecycle, and native-build checks.
- Begin weekly physical-device captures.

### Visual exploration

- Explore tower shape language, Brood forms, Arena treatments, HUD, World Map, and progression UI in
  images and small runtime studies.
- Preserve prompts, references, provenance, and critique.
- Do not call any direction final or multiply it across the World.

### Evidence

Use every available uncoached tester. Record counts and observed behavior rather than percentages
that imply a larger sample. Players must understand entrance, exit, Foundation placement, Waypoint
order, legal route changes, Lives, and Rail's role without developer explanation.

## Phase 3 — Strategy and progression, Weeks 9–14

Goal: prove that the combat and slow reward cadence become deeper rather than merely longer.

### World One systems

- Complete Foundation, Rail, and Siege through the Levels and branches required for testing.
- Build Siege's required loan-and-unlock Technology Trial.
- Add only World One creep families that produce distinct multi-answer problems.
- Implement predictable Targeting Doctrines, Refit, Respecialize, Armor, and any retained support
  mechanics behind stable identifiers.
- Author representative three-Star and varied budgeted Mastery challenges.

### Account progression

- Implement base Blueprint awards, Blueprint Levels, Blueprint Ceiling, permanent Research spending,
  Specialization Schematics, deterministic Fragments, Foundation boss progression, Stars, and World
  Gates.
- Provide unrestricted developer reset and synthetic player profiles.
- Do not implement Prisms, rarity purchasing, Advancement Schematics, store simulations, or ledger
  infrastructure.

### Multi-World proof

- Build a short proxy-art main path in World Two that introduces either Arc or Gravity.
- Build a short proxy-art main path in World Three that introduces the other.
- Exercise loan, base unlock, partial catch-up Research, Schematic hunting, and three-of-four Blueprint
  selection by the end of World Three.
- These are progression proofs, not promises of three visually finished Worlds.

### Strategy evidence

- Rail and Siege remain behaviorally distinct across several Arenas.
- Arc and Gravity introduce new decisions rather than alternate damage colors.
- Representative late scenarios support several Maze and Loadout patterns.
- Foundation-only play stops succeeding once Capability Checks mature without becoming arbitrarily inert.
- Main-path scenarios survive imperfect Research allocation.
- Optional clean clears reward better allocation and counter-selection.
- No dominant live-construction exploit replaces planned Mazing.

Failure keeps production in provisional presentation while mechanics, economy, or content are reworked.

## Phase 4 — Visual slice and Brood World, Weeks 15–20

### Production visual slice

- Select promising directions from the post-Gate exploration.
- Bring one representative Mission from Opening Plan through results to production quality.
- Include final-candidate Arena treatment, Foundation/Rail/Siege forms, Brood enemies, animation,
  effects, HUD, audio, accessibility, and surrounding progression surfaces.
- Validate consistency, source provenance, runtime export, modular Level growth, device performance,
  and production throughput.
- Obtain explicit product-owner approval before multiplying the style.

If the slice fails, rework one Mission or revisit the engine before producing the World.

### World production

- Author the remaining purposeful main and Optional Missions.
- Complete required Rail and Siege Technology Trials, Schematic hunts, Masteries, boss, and World Gate.
- Build purposeful Arena rematches instead of statistical duplicates.
- Replace critical proxy assets only through the approved style and pipeline.
- Finish World Map paths, branch reveals, rewards, and continuity into the proxy World Two path.

World One is complete only when every wave has a purpose, every reward writes and restores correctly,
and no critical interaction or presentation path remains a placeholder.

## Phase 5 — Hardening and internal release, Weeks 21–26

### Balance and engagement

- Tune waves, Field Credits, refunds, Stars, Research scarcity, fragment pacing, and World Gates from
  observed behavior and deterministic replays.
- Verify ordinary and boss duration targets.
- Validate that returning to early content feels stronger without erasing the Maze.
- Remove filler waves rather than solving boredom through Mission Speed.

### Reliability

- Test migrations, corruption, interrupted writes, process death, reinstall, resume, duplicated
  rewards, and Opening Plan compatibility.
- Verify between-wave recovery at minimum.
- Test airplane mode even though no network is required.

### Mobile quality

- Profile every supported physical device class at 1×, 2×, and 3×.
- Verify 30 FPS Battery and 60 FPS Quality modes.
- Run sessions long enough to expose heat, battery, memory, audio-interruption, and background issues.
- Verify UI scale, high contrast, reduced effects, reduced motion, audio, and haptics.

### Internal distribution

- Deliver signed or otherwise safely installable builds to the available friend group.
- Capture concrete behavior, replay, performance, and crash evidence.
- Do not extrapolate a handful of testers into public-market retention claims.
- End with a written decision on whether to expand Campaign production, revisit the core, or begin the
  deferred platform and monetization design.

## Cut order

When capacity is threatened, cut in this order:

1. Decorative Galaxy and World Map animation.
2. Optional Mission count.
3. unique Arenas through stronger purposeful reuse.
4. main-path Missions that duplicate a solved idea.
5. production polish outside the approved representative slice.
6. proxy World Two/Three breadth while preserving one proof path each.

Do not cut deterministic authority, Foundation Mazing, ordered Waypoints, Blueprint differentiation,
accessibility fundamentals, local save recovery, physical-device testing, or the four-track Gate
evidence.

## Explicitly deferred

- Monetization and premium currency design.
- billing, advertisements, receipts, entitlements, and economy ledgers.
- accounts, cloud synchronization, remote configuration, and production analytics services.
- Community Arenas, creator verification, leaderboards, moderation, and social systems.
- Endurance, Expeditions, daily or weekly challenges, seasons, and live events.
- final Worlds beyond the thin World Two/Three progression proof.

These concepts may return only after the relevant gameplay evidence creates a concrete requirement.
