# Reference Games and Owner Direction

Recorded: 2026-09-11. Source: direct product-owner feedback in this task.
These notes supersede earlier generic reference summaries and broad multi-style exploration briefs.
They record preferences and intended behavior, not claims that all features are implemented.

## Infinitode 2

Owner notes: excellent grid placement; zoom in and move the map; great tower mechanics and game
progression. Dislikes the actual tower designs but likes the simple 2D style focused on mechanics.

Take inspiration from precise grid construction, readable placement states, comfortable map zoom
and pan, strategic tower differentiation, and satisfying progression. Keep the mechanics-first 2D
clarity. Do not copy its tower silhouettes or treat its visual simplicity as permission for an
unfinished HUD. Progression is a reference, not a request to build its entire progression system now.

## Geometry Wars 3

Owner notes: loves the popping colors and neon; enjoys lasers and beams shooting across the map.

Take inspiration from vivid emissive accents, crisp high-contrast shapes, energetic beams and
lasers, responsive combat, and clearly separated effects against a quiet background. The reference
is specifically Geometry Wars 3. Do not import its 3D arena geometry, camera, or shooter controls.
Brightness should support readable combat, not hide the board under bloom.

## The Tower - Idle Tower Defense

Owner notes: likes the simple shapes as enemies and wants to emulate this to start. Really likes
the death animation where shapes explode into many small particles of the same shape.

Start with geometric creeps rather than detailed insects, monsters, or realistic aliens. Preserve
family identity through silhouette, outline, scale, motion, and attack response. On death, a square
breaks into smaller squares, a triangle into triangles, and a circle into circles. This is a clear
effect requirement, not a generic particle puff. Idle progression and monetization are not implied.

## Tomb of the Mask - Android

Owner notes: "love love the fast paced game, keeping people engaged." Likes continuing where you
left off, replaying waves after losing, fast enemies, and fast gameplay.

Take inspiration from brisk transitions, immediate response, active engagement, quick retries,
and continuity between sessions. Apply these to a strategic tower-defense game, not to copying
its movement controls or changing genres. Fast presentation must still leave time for meaningful
placement decisions and readable threats. Resume and wave-replay expectations require an explicit
checkpoint/recovery contract; they are not established by the current opening-retry feature alone.

## Current Art and Scope Decisions

- One cohesive neon-retro space HUD to start, not more unrelated art directions or Worlds.
- Focus on tower design and mechanical differentiation, then creep design and combat feedback.
- Simple 2D geometry with depth from shadows, layering, small highlights, and restrained glow.
- No AAA realism, realistic metal machinery, detailed alien anatomy, heavyweight 3D models,
  steep perspective, or Unity-style 3D scene treatment.
- Simple units do not mean a simplistic interface. The owner found the earlier HUD concepts too
  simple and wants a more complete, intentional, polished gameplay interface from Claude Design.
- Do not restrict the design to the current Rail/Siege benchmark. The planned pool is Rail, Siege,
  Arc, and Gravity; Foundation is always available outside the three-specialist Loadout budget.
  A mature in-mission tray therefore shows Foundation plus three chosen specialists, not only two.
- Keep the existing generated concepts as historical experiments, not approved style authority.
- Claude Design is the next tool for the HUD, tower, and creep design pass. Nano Banana remains
  available for explicitly requested image exploration; it does not dictate this design handoff.

## Authority and Next Step

Use [the Claude Design prompt](CLAUDE_DESIGN_EXPLORATION_PROMPT.md) for the next design pass.
Gameplay rules remain grounded in [Game Design](../design/GAME_DESIGN.md) and
[World One](../design/WORLD_ONE.md). Earlier ADRs supply the broader specialist identities;
they do not override later World One rollout constraints. Show the full roster in the design
prototype without claiming those specialists or durable checkpoint recovery already ship.
