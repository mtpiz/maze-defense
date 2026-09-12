# Claude Design Prompt: Neon Combat UI

Updated: 2026-09-11. Ready for a new Claude Design project; not a production-style approval.
This replaces the earlier request for four styles and multiple Worlds.

The opening brief below is self-contained. No codebase upload or previous concept image is required.
Optional reference screenshots or clips should illustrate the four specific reference qualities,
not instruct Claude to copy a whole game. Earlier generated mockups are not approved references.

## Opening Brief

```text
You are designing the playable interface, tower visual language, and enemy visual language for
Maze Defense, a working-title portrait Android mazing tower-defense game.

Create ONE cohesive, polished, retro-neon space direction and an interactive, animated prototype.
Do not give us another broad style exploration, four different themes, a marketing page, a slide
deck, a world map, or a realistic battlefield illustration. Start on the actual playable mission
screen. Focus on the HUD, grid interaction, tower design and mechanical identity, geometric creeps,
and the satisfaction of combat. We will explore other Worlds only after this foundation works.

We want substantially more design craft and completeness than a plain grid with a statistics strip
and two tower buttons. Simple 2D units are intentional; a simplistic, generic interface is not.

1. REFERENCE DNA: WHAT TO BORROW AND WHAT NOT TO BORROW

Infinitode 2:
- Excellent grid placement, zooming and moving around the map, tower mechanics, and progression.
- Borrow precise construction, clear placement feedback, camera ergonomics, mechanics-first 2D
  clarity, and meaningful tower choices. Do NOT copy its actual tower designs; the owner dislikes them.
- Progression should make mastery and tower development feel worthwhile, but do not design a full
  research tree, economy, or Campaign for this pass.

Geometry Wars 3:
- The owner loves popping colors, neon, and lasers/beams shooting across the map.
- Borrow crisp luminous color, strong contrast, beam choreography, and energetic responsiveness.
- Do not borrow its curved 3D arenas, camera, or twin-stick controls. Keep our board easy to read.

The Tower - Idle Tower Defense:
- Begin with simple geometric enemies, not detailed insects or realistic creatures.
- The key effect: defeated shapes explode into many smaller particles OF THE SAME SHAPE.
  Triangles break into triangles, squares into squares, circles into circles. Make this visible
  and satisfying in motion, not a static note or a generic smoke/spark effect.
- Its idle gameplay, monetization, and UI are not requirements for our game.

Tomb of the Mask on Android:
- Borrow fast-paced engagement, fast enemies, immediate response, low-friction continuation,
  and quick retries after a loss. The owner particularly values continuing where they left off.
- Apply that energy to tower-defense decisions. Do not turn the game into a platformer or hide
  strategic choices behind frantic interaction. Do not copy its controls, ads, or progression.

2. VISUAL DIRECTION

- Retro, neon, space, geometric, primarily 2D. No AAA realism and no detailed modeled machinery.
- Depth comes from short consistent shadows, layer separation, restrained highlights, and emissive
  accents, not heavyweight 3D assets, steep perspective, realistic lighting, or cinematic scenery.
- Quiet near-black or neutral-dark ground, a restrained grid, and several distinct vivid accent
  colors with specific jobs. Avoid a monochrome teal wash or a purple gradient theme.
- Crisp solid cores underneath glow. Distinguish friendly towers, threats, objectives, selection,
  and invalid actions through shape/value as well as color. Beams should pop without bleaching cells.
- Give the interface a deliberate visual rhythm: strong typography, custom coherent tower icons,
  a complete command hierarchy, and polished pressed, selected, disabled, and warning states.
- No realistic weapons, gritty concrete, metal bolts, detailed bugs, fantasy buildings, glossy
  plastic miniatures, ornamental dashboard cards, or decorative star particles over the playfield.
- Do not reuse an inherited corporate/SaaS design system. Establish a small game-specific neon
  component system for this project. Do not interpret 'retro' as unreadably small pixel text.

3. GAMEPLAY CONTRACT AND BOARD

- This is an active mazing tower-defense game. Players spend Field Credits to construct Foundation
  towers and develop specialists, creating a longer legal route while balancing combat investment.
- The default arena is 9 columns by 14 rows of square cells. Other dimensions are content-defined,
  but this prototype should prove this one arena well. No hexagons or angled/isometric board.
- Ground creeps travel from Spawn through permanent numbered Waypoints in order to Exit. Towers
  block ground movement. Construction cannot completely seal the required route.
- Airborne creeps use the same ordered Waypoints but ignore player towers, with a distinguishable
  route layer. Do not depict an airborne enemy as using an entirely unrelated destination.
- Placement is available during planning AND active combat. Show valid and invalid placement,
  affordability, selection/range feedback, and route changes without hiding the board.
- The initial camera fits the whole board. Pinch zoom and map pan must work; add an obvious fit/
  recenter action. HUD stays fixed and readable while the map moves. Zoom may crop the board, but
  must never strand the user or cause offscreen placement. Make touch pan versus placement intent
  unambiguous and show the selected cell clearly.
- The arena owns most of the screen. Controls may be rearranged creatively, but preserve thumb
  access, no path-obscuring panels, no viewport overflow, and a stable battlefield when selecting.
- Planning may show a faded route preview; combat suppresses route clutter. Waypoints stay visible.
- Show the same consistent board and tower positions across related views, not unrelated mock maps.

4. THE LOADOUT IS NOT TWO TOWERS

The current engineering benchmark has Foundation, Rail, and Siege. That is NOT the full product.
The planned specialist pool is RAIL, SIEGE, ARC, and GRAVITY. Foundation is always available and
does not consume a specialist slot. A normal mission permits UP TO THREE specialist Blueprints.
This means a mature mission command tray has Foundation PLUS THREE selected specialist families.
It does not mean only three individual towers can be placed; one slot unlocks a whole family.

Show all four specialist families in a small pre-mission Loadout selector, with exactly three
selected and one excluded. For the main mission example use Foundation + Rail + Siege + Arc.
Also allow a loadout swap that replaces Arc with Gravity so its mechanics and visuals can be seen.
Before three families are owned, unused slots remain visible. Do not invent additional tower names
or force a permanently equipped fifth family into a three-specialist mission.

The prototype may expose all four families to evaluate their designs now. This is a design preview,
not a claim that all four are unlocked early or implemented in the current APK. Do not expand Worlds
or production scope merely to demonstrate the full roster.

5. TOWER IDENTITIES AND MECHANICS

Give each family a recognizable original silhouette and attack rhythm, not a shared base with a
different color. Think distinctive geometric weapons and energy assemblies, not realistic turrets
or Infinitode tower icons. All tower footprints occupy one cell; art must not hide neighboring cells.

Foundation:
- Cheap universal maze construction with weak short-range ground cleanup fire.
- Compact, clearly structural, subordinate to specialists, but recognizably a tower rather than
  an arbitrary blank wall. It is not the answer to Armor, Airborne threats, or dense swarms.

Rail:
- Long-range deliberate attacks against ground and Airborne targets; straight lanes and target
  commitment matter. Large hits address Armor; penetration belongs to the appropriate development.
- A directional, linear accelerator silhouette. Show anticipation/charge, a crisp shot or beam,
  and rapid falloff. Beams span the valid lane/range, not arbitrary map-wide damage.
- Candidate branches: Lance, a charged high-impact lane shot; Repeater, sustained target commitment.

Siege:
- Expensive ground-only delayed area damage; clustering and placement timing matter.
- Broad heavy geometric body, clearly unlike Rail. Show a readable delay/impact marker, then a
  controlled burst or shockwave that makes area damage understandable.
- Candidate branches: Mortar, long-range barrage with minimum range; Quake, local radial shockwaves.

Arc:
- Rapid small hits chaining among nearby ground and Airborne enemies; useful for fast targets and
  connected groups, weaker into Armor. Short linked arcs, not the same beam as Rail.
- A split/contact-node silhouette with a clear pulse/jump rhythm.
- Working branch identities from the broader design: Interceptor and Storm. Keep their visual
  proposal distinct from final balance or release commitments.

Gravity:
- Negligible direct damage, slowing and grouping targets. It supports other towers rather than
  being a fourth damage color. Draw Light enemies together without breaking ordered Waypoints.
- Mass matters: Heavy enemies displace less; bosses cannot be displaced. Only the strongest slow
  applies. No permanent stun/freeze or infinite wave lock.
- A ring/field-anchor silhouette, clearly readable when idle. Controlled inward pulses or tethers,
  not a giant foggy orb that hides creeps. Working branch identities: Well and Tether.

For every family show a black-silhouette readability check, finished neon treatment at actual
board size, selected/range state, firing sequence, impact/response, and a concise mechanical role.
Present a coherent family comparison sheet, not just two enormous Rail/Siege drawings.

Specialist field development: Level 1 is the shared base, Level 2 improves behavior, Level 3 selects
one owned branch, and Levels 4-5 deepen that branch. Different towers of a family can use different
branches. Demonstrate the major Level-3 silhouette change for Rail and Siege without producing an
exhaustive asset catalog. Mark proposed changes or missing mechanical decisions as proposals.

6. GEOMETRIC CREEPS AND SHAPE-PRESERVING DEATHS

Start with simple squares, triangles, circles, diamonds, and polygons. Family names describe
behavior, not a requirement for biological anatomy. Keep them readable as small moving units.
Design these core identities first:
- Drone: ordinary Light ground baseline.
- Skitter: fast, fragile Light ground threat; added as an onboarding/design candidate, not a claim
  that it already ships in the benchmark.
- Carapace: slower Heavy ground enemy with visible Armor. An extra shell/outline must communicate
  protection without changing into a miniature realistic tank.
- Broodling: very fragile dense ground groups; small shape clusters must remain distinguishable
  from death particles and selectable UI.
- Glider: Light Airborne enemy using the ordered Waypoints. Use shape, shadow separation, outline,
  or motion to identify its layer without elaborate wings.

The four-family benchmark uses Drone, Carapace, Broodling, and Glider. Skitter is the next candidate.
Regenerator, Sporeguard, and Carrier are deferred candidates; do not expand this pass into their art
or extra Worlds. Propose a shape mapping and maintain it consistently across the HUD and battlefield.

Animate shape-preserving deaths: short impact confirmation, an outward burst of small copies of
the defeated unit's primitive, quick deceleration/fade, then a clean cell. Preserve its color identity
without making particles look like still-living enemies. Distinguish an Armor hit from Armor break.
Demonstrate both one death and a simultaneous crowd clear, plus reduced-motion/effects variants.
Avoid screen-obscuring confetti, strobing, long particle trails, and mandatory screen shake.

7. COMPLETE HUD AND INTERACTION STATES

Integrate Lives, wave progress, Field Credits, upcoming guaranteed wave income, pause/resume,
simulation speed (1x/2x/3x), the active phase, and concise next-wave threat information.
Frame-rate Quality/Battery mode is a display setting, not simulation speed.

Make Foundation plus the three equipped specialists available in a thumb-friendly construction
tray. Show price, affordability, selected family, and locked/empty states clearly. Contextual tower
inspection should expose targeting doctrine, relevant stats, available upgrade/branch action,
construction/temporary-disable state, and removal/refund information where allowed. Use realistic
sample values only as mock data; do not invent final balance or a paid economy.

Required coherent states in the same design system:
- Opening/planning with placement preview and a clear Launch action.
- Dense active combat: mixed creep shapes, multiple tower families, beams/arcs, area impacts, deaths.
- Selected tower with a compact contextual upgrade/branch treatment; stable arena dimensions.
- Between waves with brief useful threat/income information and Early Launch.
- Pause and explicit Resume after backgrounding; never advance invisibly behind an overlay.
- Loss with immediate retry/replay affordance, and successful wave/mission feedback without a long
  victory ceremony that interrupts the next decision.
- Return to an interrupted run and the three-of-four specialist Loadout selection.

IMPORTANT RECOVERY DISTINCTION: the current build supports in-process pause/resume and restoring an
opening plan, not durable mid-run recovery or a fully implemented failed-wave checkpoint replay.
The owner wants continuation and replay after loss. Prototype these intended flows with clearly
identified sample checkpoint data, preserving the last committed checkpoint consistently. Separate
Resume Run, Replay Failed Wave, and Restart Mission; do not silently give rewards twice or pretend
the checkpoint storage rules are already settled. Record unresolved retry/economy rules in handoff
notes. They must not block visual exploration, and must not be presented as completed engineering.

Make transitions brisk, responsive, and rewarding. Fast enemies should differ meaningfully from
slow armored threats; do not merely speed every animation up. Touch decisions and feedback matter
more than decorative motion. No explanatory feature-tour paragraphs inside the game interface.

8. DELIVERABLE AND IMPLEMENTATION BOUNDARY

Build an editable, interactive prototype, not only a raster mood board. Include moving creeps,
representative firing/death loops, working controls, Loadout swapping, zoom/pan/recenter, placement
feedback, tower inspection, and the principal mission states. Scripted representative encounters
are fine if clearly identified in design notes; do not claim a new combat engine is production code.

Start with the primary mission screen and one concise visual rationale, then develop the tower
family comparison, creep/death study, and supporting states in the SAME neon direction. A small
comparison of control arrangements within this direction is fine; no unrelated style gallery.

Target portrait Android at 390x844 and 412x915, and verify the smaller 360x800 layout. Desktop is
a review surface, not a separate dashboard. Provide reachable touch targets, safe-area clearance,
legible type, color-independent cues, high-contrast and reduced-motion treatments. No clipping,
overlapping controls, offscreen action buttons, or changing board size when a panel opens.

Our runtime is TypeScript, PixiJS 8 for 2D presentation, Preact for the HUD, and Capacitor 8 for
Android. Simulation is deterministic and separate from presentation. Prefer portable 2D assets,
SVG/vector masters where appropriate, explicit layers, and reusable tokens/components. Do not
require Unity, Unreal, Three.js, realistic 3D meshes, or an engine migration. Existing code, if
provided later, is a mechanics/architecture reference, NOT a design system to preserve.

Export an inspectable HTML prototype or source bundle and a concise handoff README. Include:
- named reusable HUD components and their states;
- color/type/spacing/icon tokens and hierarchy;
- tower and creep vector/shape definitions or exportable assets with consistent pivots/scale;
- layer/shadow/glow rules and firing/death timing notes;
- motion limits and reduced-motion equivalents;
- what is implemented in the prototype versus illustrative, proposed, or unresolved.

Success: the screen immediately feels like a crafted neon-space strategy game; the full Loadout is
understood; towers are recognizable by silhouette and behavior; geometric deaths feel excellent;
the grid is comfortable to manipulate; and players want to launch/retry rather than navigate menus.
Do not settle for a stock dashboard, a two-tower demo, or realistic machinery on a gray tiled board.
```

## Claude Design Research and Use

Checked against official documentation on 2026-09-11. Claude Design supports interactive
prototypes, reference uploads, direct/inline refinement, and HTML or ZIP export with code handoff.
This makes an animated gameplay prototype a better handoff target than a static screenshot alone.
[Getting started](https://support.claude.com/en/articles/14604416-get-started-with-claude-design).

Projects may inherit a design system. For this pass, use the game-specific brief rather than
automatically importing the old game's styling. A repository import is optional; if used, attach
only relevant source, not credentials, generated API responses, node_modules, or the entire tree.
Anthropic recommends focused code imports for large projects and documents design-context handoff
to coding agents. [Prototype workflow](https://academy.claude.com/tutorials/using-claude-design-for-prototypes-and-ux).

The one-direction scope, recovery distinctions, and required game states above are our project
decisions, not promises that Claude Design automatically implements game rules or checkpoint storage.
No Claude account connection, upload, publication, or new image-generation run was performed here.

## Project Sources

- [Owner reference notes](REFERENCE_GAME_NOTES.md): current art, pacing, and reference preferences.
- [Game Design](../design/GAME_DESIGN.md): Loadout slots, Foundation, development, and economy.
- [World One](../design/WORLD_ONE.md): current Rail/Siege candidates and creep contracts.
- [Specialist identities](../adr/0063-give-world-one-specialists-distinct-combat-kits.md): broader Arc/Gravity kits;
  later World One rollout rules take precedence over this older ADR's rollout scope.
- [Mass and control](../adr/0058-use-visible-mass-and-nonstacking-control.md): nonstacking slows/displacement.
- [Build status](../roadmap/BENCHMARK_BUILD_STATUS.md): implemented benchmark versus intended product.
