# Provisional combat atlas v1

Generated: 2026-09-07, before the owner's Nano Banana decision on 2026-09-08.
Status: replaceable technical fixture, NOT approved production art.

## Provenance

- Built-in image_gen tool, one original sheet; no reference-game assets were imported.
- Source: apps/game/src/assets/combat-proxy-v1.png.
- Original output: exec-5f7b0f95-2ba4-4d8d-adb6-773ffe6d3ea3.png.
- Actual PNG: 1774 x 887, 32-bit RGBA, 1,255,331 bytes, genuine transparent corners.
- The generator did not honor the requested equal grid or dimensions. Runtime Texture rectangles
  use measured alpha bounds with an 8-pixel gutter; the PNG was copied unchanged.
- Seven regions are consumed: Foundation, Rail, Siege, Drone, Carapace, Broodling, Glider.
  The unused impact concept is not an implemented effect.
- One cached source is shared by the seven region textures. Each view owns its wrappers and
  live per-ID sprites; teardown does not destroy the cached source used by a subsequent view.
- Existing geometric rendering remains the high-contrast path and asset-loading fallback.
  Existing HUD, board, combat rules, and sound/haptic implementation were not redesigned.

## Reference observations

Official [Infinitode 2](https://play.google.com/store/apps/details?id=com.prineside.tdi2) and
[The Tower](https://play.google.com/store/apps/details?hl=en-US&id=com.TechTreeGames.TheTower)
screenshots were visually inspected. Design judgments: prioritize distinct silhouettes, quiet board
space, and weapon-specific energy cues. The [Geometry Wars official feature page](https://www.sierragames.com/geometrywars)
was consulted; direct screenshot access failed, so this pass does not claim fresh visual inspection
of that reference. No artwork from these games is shipped in the repository's runtime.

This sheet has more detail than a final phone-scale kit may need. It proves an import path, not a
style decision or distributed-swarm readability. Retained initial browser images are
artifacts/emulator/proxy-kit-opening-390x844.png and proxy-kit-wave-390x844.png.
Opening construction opacity remains unchanged at 0.45; a proposed visual adjustment was parked
when the owner redirected style work to Nano Banana.

## Original prompt

```text
Use case: stylized-concept. Asset type: original top-down mobile tower-defense game sprite atlas, a SINGLE transparent PNG sheet, 1536 x 768 pixels, exactly 4 columns by 2 rows of equal 384 x 384 cells. This is a runtime texture atlas, not a mockup or promotional illustration.
Background: genuine transparent alpha everywhere outside the eight isolated sprites. No fake checkerboard, no ground, no shadows outside the silhouette, no text, labels, dividers, grid, UI, or surrounding scene.
Each sprite is precisely centered within its cell, occupies about 240 x 240 pixels (never larger than 280 x 280), with at least 50 transparent pixels to every cell edge. All units face straight UP. Exact orthographic TOP view, flat 2D hand-painted hard-surface/organic game art with restrained cel shading; no perspective, no isometric view, no visible front faces.
Art direction: highly readable bold outer silhouettes and a few large interior shapes. Must remain identifiable at 16-32 pixels tall. Crisp pale edges, deep charcoal structural recesses, only two or three broad tonal zones per object, no tiny linework, no intricate texture or grain, no bloom or haze. Futuristic player technology in cool silver ceramic/alloy with colored cores, versus vivid coral and rose biomechanical Brood with pale chitin. Original designs, do not copy other games.
EXACT CELL CONTENTS in reading order:
Top row cell 1 FOUNDATION: compact silver diamond-shaped platform, four thick corner braces, broad circular MINT GREEN energy core. No barrel.
Top row cell 2 RAIL: narrow triangular silver footing, TWO clearly separated long parallel CYAN rail barrels pointing up, dark gap down the center, bold forked silhouette.
Top row cell 3 SIEGE: squat WIDE hexagonal silver turret housing, broad recessed circular AMBER mortar aperture at center, chunky armor shoulders; unmistakably different from Rail.
Top row cell 4 DRONE: coral-pink biomechanical scout, rounded pointed shield-shaped body, three large joined carapace plates and two short lateral limbs, pale pink ridge. Compact broad silhouette.
Bottom row cell 1 CARAPACE: broad heavy armored Brood creature, stout hexagonal IVORY shell with three wide plates, deep crimson body exposed on each side, four thick short legs, widest ground unit. Bold center spine.
Bottom row cell 2 BROODLING: small sleek hot-coral teardrop-shaped Brood creature with two short fins and a large pale pink head segment, very SIMPLE silhouette. Same apparent atlas bounding size as other sprites; engine scales it down.
Bottom row cell 3 GLIDER: ROSE-PINK winged biomechanical Brood, wide swept split wings with cutouts, ivory leading edges, luminous magenta central body, clearly AIRBORNE ray-like silhouette pointing UP. NOT cyan, not a human aircraft.
Bottom row cell 4 IMPACT: single compact amber-white radial impact spark with six short angular rays and empty gaps between, no smoke or large halo. Centered, same padding as the units.
All eight isolated elements must stay within their exact equal-grid cells, do not share a background or overlap. TRUE transparent background.
```
