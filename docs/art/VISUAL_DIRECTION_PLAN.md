# Visual Direction Track

Status: Parked after Round One; broad exploration resumes after the Core Combat Gate  
Updated: 2026-09-03  
Decision owner: Product owner

## Purpose

This track preserves visual research without placing production polish ahead of mechanical evidence.
The current Android benchmark is structural scaffolding, and generated concepts are discussion
evidence—not production assets or proof that their depicted maze geometry is legal. Representative
combat, First-Session comprehension, and Strategy evidence now proceed with coherent proxy art.

Broad exploration resumes after the Core Combat Gate so visual quality receives sustained attention
while the first real Missions are built. Production style does not lock until the Strategy Gate,
when one complete visual Mission is approved before art is multiplied across World One.

## Locked visual constraints

- Portrait-first mobile presentation with a fully visible 9×14 World One default; Arena dimensions
  and active shape remain content-defined.
- Board-first hierarchy: the Arena owns roughly three quarters of the Mission screen.
- Foundation and core specialist towers retain one recognizable science-fiction Player Technology
  identity across every World.
- Worlds may use substantially different environments and art treatments without reskinning the core
  tower roster.
- World One is the Brood World and contrasts futuristic defenses with biological or biomechanical
  infestation.
- Towers and creep families remain identifiable by silhouette at the smallest supported phone size.
- The faded dashed Route Preview appears contextually during planning; ordered Waypoints remain
  permanent, readable route requirements.
- Every tower blocks ground and no player tower blocks Airborne movement; both layers share ordered
  Waypoints and use authorable terrain masks.
- Legal Foundation placement remains available during active waves.
- Combat effects support tactical comprehension at swarm density instead of obscuring it.
- Final terrain rendering, palette, material language, camera treatment within the readable board
  contract, UI theme, and degree of stylization remain open.

## Approval sequence

| Gate | Review artifact | Approval question | State |
|---|---|---|---|
| 0. Gate input | Proven Foundation/Rail/Siege behavior, Gate creeps, UI information, and density limits | Can representative combat carry intentional visual work? | Await Core Combat Gate |
| 1. Broad direction | Independent build/combat, World, tower, and UI explorations | Which visual DNA should survive? | Starts after Gate 1 |
| 2. Narrow exploration | Three controlled variants of the selected or hybrid direction | Which treatment becomes the base? | Pending |
| 3. Environment kit | Buildable, hard, Spawn, Exit, Waypoint, terrain, and Foundation sheets | Does World One have the right identity and clarity? | Pending |
| 4. Combat kit | Foundation, Rail, Siege, Gate creeps, attacks, impacts, and deaths; later Arc/Gravity extension | Is combat readable and satisfying? | Pending |
| 5. Interface family | Claude Design Mission HUD, sheets, World Map, Blueprint, and results screens | Does the product feel cohesive and premium? | Pending |
| 6. Final style frames | Phone-size build, dense combat, boss, and progression screens | Approve Visual Direction v0.1? | Pending |
| 7. Live fidelity proof | Approved direction reproduced in one complete Mission | Can the selected renderer deliver it sustainably at the performance target? | Pending |

Gate implementation is not blocked by final-style approval. It uses a coherent proxy kit to test
motion, density, phone-scale readability, and the presentation pipeline.

## Round One evidence

Round One uses the existing benchmark only as a layout reference. Each candidate shows a planning
state and active-wave state together:

- [Direction A — Tactical Industrial Frontier](exploration/round-01/direction-a-tactical-industrial.png)
- [Direction B — Vector Alloy Energy](exploration/round-01/direction-b-vector-alloy.png)
- [Direction C — Bio-Mechanical Frontier](exploration/round-01/direction-c-biomechanical-frontier.png)
- [Round One prompt, source-reference, and critique record](exploration/round-01/README.md)

Provisional internal assessment, not product-owner approval:

- A has strong industrial atmosphere and restrained energy, but muddy terrain and insufficient tower
  silhouette separation.
- B has the clearest board hierarchy and interface foundation, but risks generic dark science fiction.
- C has the strongest world and swarm identity, but is too realistic and visually busy as generated.
- The recommended next experiment is a controlled hybrid: B's hierarchy, C's environment/swarm
  contrast, and A's restrained palette and machinery materials, with simpler shapes and stronger
  tower-family silhouettes.

All three images contain model-generated route or occupancy mistakes. Those mistakes are explicitly
out of scope for style approval and cannot enter Arena authoring.

## Next action when the track resumes

1. Import the Gate-proven tower behaviors, creep contracts, UI information hierarchy, and density limits.
2. Run the blank-slate [Claude Design comparison](CLAUDE_DESIGN_EXPLORATION_PROMPT.md) without
   uploading the current concepts or design system.
3. Compare Claude's independent directions with Round One before deciding whether to narrow or reset.
4. Collect product-owner keep, reject, increase, and reduce feedback.
5. Generate controlled variants of the strongest direction at actual 390×844 presentation size.
6. After a battlefield base is selected, give its approved frame to Claude Design for the cohesive
   interface-family pass rather than allowing the UI to invent a separate style.

## Decision log

| Date | Decision | Evidence |
|---|---|---|
| 2026-08-22 | Pause broad feature expansion and put visual approval before representative combat. | Product-owner direction in design review |
| 2026-08-22 | Generate three controlled build/combat directions using the current benchmark as structure. | Round One images |
| 2026-08-23 | Persist visual work and status inside the v2 repository instead of relying on chat history. | This tracker and linked exploration record |
| 2026-08-23 | Restore the original evidence-gate order and make visual exploration non-blocking until Strategy evidence. | Product-owner correction; ADR-0092 |
| 2026-08-23 | Keep core towers as persistent futuristic Player Technology; make World One the Brood World. | Product-owner correction; ADR-0091 |
| 2026-09-03 | Resume broad exploration after the Core Combat Gate, but defer production-style lock until Strategy evidence and one approved visual Mission. | Certified adversarial-review resolution |

Product-owner Round One feedback: **Deferred; not required for current implementation.**

Independent comparison: [Claude Design exploration prompt](CLAUDE_DESIGN_EXPLORATION_PROMPT.md)
is ready for the post-Gate exploration as a blank-slate project without the current design system
or concept images.
