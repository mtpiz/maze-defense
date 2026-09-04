# Visual Exploration — Round One

Status: Generated; not approved  
Generated: 2026-08-22  
Method: OpenAI built-in image generation using the benchmark screenshots as structural references

[Exact prompts and ordered source references](PROMPTS.md)

## Candidates

| ID | Direction | Planning/combat board |
|---|---|---|
| A | Tactical Industrial Frontier | [Open image](direction-a-tactical-industrial.png) |
| B | Vector Alloy Energy | [Open image](direction-b-vector-alloy.png) |
| C | Bio-Mechanical Frontier | [Open image](direction-c-biomechanical-frontier.png) |

Source evidence:

- [Benchmark opening reference](reference-benchmark-opening.png)
- [Benchmark wave reference](reference-benchmark-wave.png)
- [Frozen v1 portrait anti-reference](anti-reference-v1-portrait.jpg)

These are disposable style studies. They are not production assets, approved UI, legal Arena
layouts, or evidence that an image generator can author deterministic gameplay geometry.

## Shared generation brief

All three candidates were asked to depict the same product constraints:

- A landscape review board containing two equal portrait screens: planning and dense combat.
- The existing Android benchmark supplied screen proportions, HUD zones, full-board presentation,
  ordered Waypoints, and the contextual bottom sheet.
- The old web prototype was supplied as an anti-reference for empty black space and wire-grid art.
- World One is a frontier machinery installation in an alien landscape under biomechanical attack.
- A fully visible, near-top-down 9×14 faux-3D Arena with open, hard, Spawn, Exit, Waypoint, and
  occupied tile states.
- A faded dashed ordered route during planning and a mostly suppressed route during combat.
- Foundations form the maze; Rail, Arc, and Siege demonstrate distinct combat feedback.
- Roughly thirty biomechanical creeps, sparse damage numbers, and restrained health/armor cues.
- A compact top HUD and contextual thumb-reachable bottom sheet with minimal text.
- Terrain stays quiet while routes, energy, status, projectiles, and interactions carry brightness.
- No branding, copied interface, watermark, medieval theme, glossy toy plastic, black neon wire grid,
  steep isometric camera, excessive bloom, or decorative tile occlusion.

## Direction deltas

### A — Tactical Industrial Frontier

Matte gunmetal machinery, graphite plating, muted olive terrain, ochre soil, slate rock, beveled tile
edges, restrained conduits, mint-cyan player energy, amber planning signals, and coral threat state.

### B — Vector Alloy Energy

Faceted alloy and ceramic surfaces, shallow geometric relief, technical inlays, quiet charcoal and
mineral terrain, and controlled cyan/violet/amber energy. The goal was arcade responsiveness without
turning the physical world into a neon grid.

### C — Bio-Mechanical Frontier

Rugged frontier machinery against an organic biomechanical swarm, with mossy alien terrain, dry
earth, rock, damaged installation material, cool player energy, and restrained enemy bioluminescence.

## Known generation failures

- Grid counts, route turns, occupancy, and exact tower locations are not fully consistent.
- Some towers sit on or visually interfere with paths that should route around blockers.
- Candidate screens use different interpretations of the shared Arena despite the locked prompt.
- Tower families remain too similar in A and C.
- A and B under-deliver on the grass, soil, and installation-in-landscape promise.
- C drifts toward realistic RTS rendering and excessive edge detail.

Round Two must use one accepted visual reference plus stronger edit invariants. It should explore one
direction through controlled changes, not generate three unrelated scenes again.

## Product-owner feedback

Pending. Record feedback as concrete keep, reject, increase, and reduce statements before Round Two.
