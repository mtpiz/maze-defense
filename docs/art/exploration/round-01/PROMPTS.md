# Round One generation prompts

Method: OpenAI built-in image generation  
Input order:

1. [Benchmark opening reference](reference-benchmark-opening.png)
2. [Benchmark wave reference](reference-benchmark-wave.png)
3. [Frozen v1 portrait anti-reference](anti-reference-v1-portrait.jpg)

Each generation used all three images in that order. The shared prompt below was followed by one
direction-specific suffix.

## Shared prompt

```text
Use case: ui-mockup
Asset type: Round-one visual-direction approval board for a portrait mobile mazing tower-defense game
Primary request: Transform the supplied structural references into a premium, original indie-mobile game presentation. Produce one clean landscape comparison board containing TWO equal-size tall portrait gameplay screenshots side by side. LEFT is the untimed build phase. RIGHT is the same arena during a dense active wave. This must look like an actual shippable game screenshot, not splash art, not a phone advertisement, and not a loose concept painting.
Input images: Image 1 is the current build-phase structural reference and establishes portrait proportions, compact top HUD, fully visible board, ordered Waypoints, and contextual bottom panel. Image 2 is the current wave structural reference and establishes the same gameplay state during motion. Image 3 is the old prototype and is an anti-reference for excessive empty black space and thin wire-grid presentation.
Scene/backdrop: World One, a frontier machinery installation driven into an alien landscape and being overrun by a biomechanical swarm.
Board geometry: preserve a clearly countable 9-column by 14-row rectangular tile arena, fully visible without camera movement. Use a near-top-down orthographic view with shallow faux-3D tile thickness and contact shadows; do not use a steep isometric camera. Preserve clear open buildable floor, hard unbuildable terrain, one spawn, one exit, and two numbered ordered Waypoints. Towers occupy exactly one tile.
Left build phase: several inexpensive Foundation towers form a deliberate looping maze. Show a quiet faded dashed route from spawn through Waypoint 1, then Waypoint 2, then exit. Clearly distinguish buildable, occupied, hard-terrain, spawn, exit, and Waypoint tiles. Show one selected Foundation with a restrained range indication.
Right combat phase: same exact map and tower positions. The route preview is mostly suppressed. Roughly 30 small readable biomechanical creeps travel the maze as a swarm. Include distinct Rail, Arc, and Siege towers firing: a precise linear shot, a short chain arc, and a heavy ground impact. Use sparse compact damage numbers, visible health/armor cues on only a few relevant creeps, and clear anticipation-to-impact effects without covering the maze.
Interface: battlefield occupies about 75 percent of each portrait screen. Compact top bar with icon-led values for lives 20, wave 7/10, field credits 430, pause, and 2x speed. Contextual thumb-reachable bottom sheet with a selected tower portrait, level pips, one primary action, and two small controls. Keep text extremely minimal and do not invent paragraphs or fake branding.
Visual hierarchy: towers and creeps must be recognizable at actual phone size; route and interaction signals are bright only when relevant; terrain is quieter; enemy silhouettes contrast strongly with constructed defensive machines.
Constraints: original visual identity; consistent lighting and perspective across both screens; strong silhouette readability; restrained effects; polished mobile UX; no recognizable characters, logos, names, or copied interface from an existing game; no watermark.
Avoid: generic black neon wire grid, realistic military rendering, medieval fantasy, glossy toy-plastic cartoon style, overgrown detail, excessive bloom, unreadable particles, huge damage numbers, steep isometric perspective, camera crop, decorative objects covering tiles, landscape gameplay.
```

## Direction A suffix

```text
Direction A — Tactical Industrial Frontier:
Use matte constructed machinery, worn gunmetal, graphite industrial plating, muted olive alien grass, compact ochre soil, and slate rock. Tile depth comes from beveled front edges, crisp contact shadows, seams, drainage channels, and occasional restrained conduits. Player energy is mint-cyan; Waypoints and planning actions are warm amber; dangerous enemy state is coral-red. Towers feel engineered, modular, compact, and powerful rather than realistic. The overall result is calm tactical terrain with sharp luminous combat information, sophisticated and highly legible.
```

## Direction B suffix

```text
Direction B — Vector Alloy Energy:
Use clean faceted alloy and dark ceramic surfaces, shallow geometric relief, precise chamfers, thin technical inlays, and subtle topographic patterns in terrain. Keep the physical world readable in charcoal, desaturated blue-green, and mineral gray; reserve electric cyan, violet, and amber for route logic, targeting, arcs, and impacts. Towers have bold geometric silhouettes and moving energy cores. Effects feel fast, mathematical, and responsive, but terrain remains material and dimensional rather than becoming a neon grid. Premium graphic-design clarity with controlled arcade energy.
```

## Direction C suffix

```text
Direction C — Bio-Mechanical Frontier:
Emphasize the conflict between rugged frontier machinery and an alien living swarm. Terrain mixes subdued mossy alien grass, dry earth, layered rock, rusted cream-and-graphite plating, embedded cables, and damaged installation fragments that never obstruct tile readability. Towers are sturdy constructed machines with clear mechanical joints and contained cyan energy. Creeps use distinct chitin, tendon, bone-plate, and luminous organ shapes in small readable silhouettes—evoking overwhelming biological swarm pressure without copying any existing creature design. Use warm environmental light, cool player energy, and restrained magenta-coral enemy bioluminescence. More atmospheric than Direction A, but still a crisp strategy-game screen.
```
