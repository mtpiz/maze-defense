# Claude Design Prompt: Neon and World One Exploration

Updated: 2026-09-12. Ready for a new Claude Design project; not a production-style approval.
This revision supersedes the single-direction, fully interactive HTML target: explore several
neon and World One variations first, then let the owner select what to develop.

The opening brief below includes the gameplay context. The World One reference is the written
design document `docs/design/WORLD_ONE.md`, not a set of reference images. Provide that Markdown
document alongside this brief; its key visual constraints are also summarized below. No reference
artwork or full codebase upload is required. Derive original visual interpretations from the Brood
design rather than assuming an existing approved art style.

## Opening Brief

```text
You are designing the playable interface, tower visual language, and enemy visual language for
Maze Defense, a working-title portrait Android mazing tower-defense game.

Create MULTIPLE distinct visual directions for me to explore before we choose a favorite.
Start with six concepts: three retro-neon space variations (N1-N3) and three World One variations
(W1-W3) informed by the written Brood World design in WORLD_ONE.md. These should be different HUD,
arena, tower, and creep treatments, not six palette swaps of one layout.

Prioritize breadth, design quality, and easy comparison over perfecting a single HTML prototype.
Do not spend the first pass building a complete game or wiring every interaction. Editable visual
boards, screen studies, asset sheets, and lightweight motion studies are appropriate. An HTML
comparison gallery is optional, not the goal. Start with actual mission-screen designs, not a
marketing page, world map, or cinematic battlefield illustration. Explore only neon and World One;
do not invent additional Worlds or change the gameplay to make a style look better.

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
  and satisfying through a short motion study or clear frame sequence, not just a written note
  or a generic smoke/spark effect. Full animation can follow shortlist selection.
- Its idle gameplay, monetization, and UI are not requirements for our game.

Tomb of the Mask on Android:
- Borrow fast-paced engagement, fast enemies, immediate response, low-friction continuation,
  and quick retries after a loss. The owner particularly values continuing where they left off.
- Apply that energy to tower-defense decisions. Do not turn the game into a platformer or hide
  strategic choices behind frantic interaction. Do not copy its controls, ads, or progression.

2. TWO EXPLORATION TRACKS, SHARED READABILITY RULES

Neon track (N1-N3):
- Explore different interpretations of retro-neon space: typography, control placement, arena
  treatment, tower silhouettes, line weight, color relationships, and effect language can vary.
- Make the alternatives recognizably different, not the same screen with a new accent color.
- Quiet near-black or neutral-dark ground, a restrained grid, and distinct vivid accent colors
  with specific jobs are useful starting points, not a fixed palette for every concept.

World One track (W1-W3):
- World One is Brood World: an environment under biological or biomechanical infestation.
  Use WORLD_ONE.md as the reference: it is a game design document, not reference artwork.
  Briefly identify which written constraints inform each of three original visual interpretations.
- The document leaves exact location, terrain material, palette, and rendering treatment open.
  Propose terrain motifs, palette, texture, atmosphere, and restrained creep accents from its
  biological/biomechanical infestation premise; label these as design proposals, not existing art.
  Vary the HUD composition and tower language too; do not merely replace the neon background.
- Keep player towers coherent futuristic technology, not biological or medieval structures.
  Brood identity should come chiefly from the arena and enemy treatment.
- Keep creeps simple and geometrically readable. Stylize organic motifs as clean 2D shapes and
  patterns, not detailed insect anatomy. Preserve shape-matched deaths and mechanical identities.
- Do not force all World One concepts into neon; the written setting permits other treatments.
  Retain the simple, stylized 2D scope and strong combat readability across both tracks.
- No World One image assets are assumed or required. If WORLD_ONE.md is unavailable, use the
  summarized setting and mechanics in this brief, noting that the full document was not reviewed.
  Do not block exploration waiting for art uploads or claim to have inspected nonexistent images.

Shared constraints:
- Primarily 2D, stylized, and readable. No AAA realism and no detailed modeled machinery.
- Depth comes from short consistent shadows, layer separation, restrained highlights, and emissive
  accents, not heavyweight 3D assets, steep perspective, realistic lighting, or cinematic scenery.
- Avoid a monochrome teal wash or a purple gradient theme across the entire set. Explore deliberate
  palette differences while maintaining clear value separation between board, units, and controls.
- Crisp solid cores underneath glow. Distinguish friendly towers, threats, objectives, selection,
  and invalid actions through shape/value as well as color. Beams should pop without bleaching cells.
- Give the interface a deliberate visual rhythm: strong typography, custom coherent tower icons,
  a complete command hierarchy, and polished pressed, selected, disabled, and warning states.
- No realistic weapons, gritty concrete, metal bolts, detailed bugs, fantasy buildings, glossy
  plastic miniatures, ornamental dashboard cards, or decorative star particles over the playfield.
- Do not reuse an inherited corporate/SaaS design system. Give each concept a coherent game-specific
  component language. Do not interpret 'retro' as unreadably small pixel text.

3. GAMEPLAY CONTRACT AND BOARD

- This is an active mazing tower-defense game. Players spend Field Credits to construct Foundation
  towers and develop specialists, creating a longer legal route while balancing combat investment.
- The default arena is 9 columns by 14 rows of square cells. Other dimensions are content-defined,
  but all concepts should compare this one arena. No hexagons or angled/isometric board.
- Ground creeps travel from Spawn through permanent numbered Waypoints in order to Exit. Towers
  block ground movement. Construction cannot completely seal the required route.
- Airborne creeps use the same ordered Waypoints but ignore player towers, with a distinguishable
  route layer. Do not depict an airborne enemy as using an entirely unrelated destination.
- Placement is available during planning AND active combat. Show valid and invalid placement,
  affordability, selection/range feedback, and route changes without hiding the board.
- The intended initial camera fits the whole board. Design for pinch zoom and map pan, with a fit/
  recenter action. HUD stays fixed and readable while the map moves. Zoom may crop the board, but
  must never strand the user or cause offscreen placement. Make touch pan versus placement intent
  unambiguous and show the selected cell clearly. In the exploration pass, illustrate these states;
  working camera interactions are a later shortlisted-prototype requirement.
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
Show a secondary loadout example replacing Arc with Gravity so its mechanics and visuals can be seen;
the first pass does not need a functioning loadout selector.
Before three families are owned, unused slots remain visible. Do not invent additional tower names
or force a permanently equipped fifth family into a three-specialist mission.

The concepts may expose all four families to evaluate their designs now. This is a design preview,
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

For each concept, show all five families as silhouettes and in that concept's treatment at actual
board size. Include a concise mechanical role and representative firing/impact frames. Present a
coherent family comparison sheet, not just two enormous Rail/Siege drawings. After shortlisting,
expand selected/range states and firing sequences for the preferred tower designs.

Specialist field development: Level 1 is the shared base, Level 2 improves behavior, Level 3 selects
one owned branch, and Levels 4-5 deepen that branch. Different towers of a family can use different
branches. After shortlisting, demonstrate the major Level-3 silhouette change for Rail and Siege
without producing an exhaustive asset catalog. Mark missing mechanical decisions as proposals.

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

Show shape-preserving death studies: short impact confirmation, an outward burst of small copies of
the defeated unit's primitive, quick deceleration/fade, then a clean cell. Preserve its color identity
without making particles look like still-living enemies. Distinguish an Armor hit from Armor break.
Start with a small frame sequence or lightweight loop per concept. After shortlisting, demonstrate
both one death and a simultaneous crowd clear, plus reduced-motion/effects variants.
Avoid screen-obscuring confetti, strobing, long particle trails, and mandatory screen shake.

7. HUD CONTEXT AND STAGED INTERACTION COVERAGE

Integrate Lives, wave progress, Field Credits, upcoming guaranteed wave income, pause/resume,
simulation speed (1x/2x/3x), the active phase, and concise next-wave threat information.
Frame-rate Quality/Battery mode is a display setting, not simulation speed.

Make Foundation plus the three equipped specialists available in a thumb-friendly construction
tray. Show price, affordability, selected family, and locked/empty states clearly. Contextual tower
inspection should expose targeting doctrine, relevant stats, available upgrade/branch action,
construction/temporary-disable state, and removal/refund information where allowed. Use realistic
sample values only as mock data; do not invent final balance or a paid economy.

For the first comparison, every concept needs planning, dense combat, and selected-tower views,
plus the small Loadout study described above. Keep these coherent within each concept. The list
below is the fuller state inventory for shortlisted designs, not six complete implementation jobs:
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
The owner wants continuation and replay after loss. When refining shortlisted designs, show these
intended flows with clearly
identified sample checkpoint data, preserving the last committed checkpoint consistently. Separate
Resume Run, Replay Failed Wave, and Restart Mission; do not silently give rewards twice or pretend
the checkpoint storage rules are already settled. Record unresolved retry/economy rules in handoff
notes. They must not block visual exploration, and must not be presented as completed engineering.

Make transitions brisk, responsive, and rewarding. Fast enemies should differ meaningfully from
slow armored threats; do not merely speed every animation up. Touch decisions and feedback matter
more than decorative motion. No explanatory feature-tour paragraphs inside the game interface.

8. EXPLORATION DELIVERABLES AND SELECTION GATE

FIRST PASS: six comparable concept packages, clearly labeled N1-N3 and W1-W3.
For each provide:
- A short name and rationale explaining the distinct art and interface decisions.
- Portrait mission views for planning, dense combat, and selected-tower context, using the SAME
  board layout, tower positions, wave, and sample stats as the other concepts for fair comparison.
- A five-family tower sheet, a core-creep lineup, a three-of-four Loadout study, and a brief
  shape-preserving death sequence. Give tower and creep design real attention, not placeholder art.
- For World One, a short note connecting the visual proposal to WORLD_ONE.md, distinguishing
  written constraints from newly proposed visual choices.

Provide a side-by-side overview plus individually inspectable, full-size editable designs.
Compare layout, tower silhouettes, creep readability, arena treatment, and combat effects. Keep
each concept coherent, but make it easy for me to choose a HUD from one and towers from another.
Do not reduce the alternatives to tiny thumbnails, a text-only mood board, or palette swatches.

STOP FOR OWNER SELECTION after this comparison. Ask which concepts or individual elements to
combine/refine. Do not choose a winner yourself or spend the remaining effort polishing a single
perfect HTML file. Full interaction wiring, production exports, and exhaustive state coverage
belong to the next pass after I have explored the options.

Use 390x844 as the shared first-pass portrait canvas; show that controls are plausible on a phone.
For shortlisted designs, verify 412x915 and the smaller 360x800 layout. Desktop is
a review surface, not a separate dashboard. Provide reachable touch targets, safe-area clearance,
legible type, color-independent cues, high-contrast and reduced-motion treatments. No clipping,
overlapping controls, offscreen action buttons, or changing board size when a panel opens.

Our runtime is TypeScript, PixiJS 8 for 2D presentation, Preact for the HUD, and Capacitor 8 for
Android. Simulation is deterministic and separate from presentation. Prefer portable 2D assets,
SVG/vector masters where appropriate, explicit layers, and reusable tokens/components. Do not
require Unity, Unreal, Three.js, realistic 3D meshes, or an engine migration. Existing code, if
provided later, is a mechanics/architecture reference, NOT a design system to preserve.

First-pass output may be separate editable canvases/screens with exportable images and optional
motion studies. Do not force everything into one HTML artifact. If a gallery makes comparison
easier, keep it lightweight and preserve each concept separately.

AFTER SELECTION, refine the chosen elements into a coherent direction, then build a focused
interactive prototype where useful: camera/placement, loadout, tower inspection, and representative
combat/death loops. Scripted encounters are fine if labeled; no production-engine claim is implied.
Only then prepare an inspectable source/asset handoff with:
- named reusable HUD components and their states;
- color/type/spacing/icon tokens and hierarchy;
- tower and creep vector/shape definitions or exportable assets with consistent pivots/scale;
- layer/shadow/glow rules and firing/death timing notes;
- motion limits and reduced-motion equivalents;
- what is implemented in the prototype versus illustrative, proposed, or unresolved.

First-pass success: I have genuinely different neon and design-document-informed World One directions
to explore, compare, and mix, with distinctive HUDs, recognizable tower families, readable geometric
creeps, and convincing combat/death studies. I can choose what to develop before we invest in polish.
Do not settle for a stock dashboard, a two-tower demo, or realistic machinery on a gray tiled board.
```

## Claude Design Research and Use

Checked against official documentation on 2026-09-11. Claude Design supports interactive
prototypes, reference uploads, direct/inline refinement, and HTML or ZIP export with code handoff.
These are available formats, not a requirement to finish one HTML prototype before comparing styles.
[Getting started](https://support.claude.com/en/articles/14604416-get-started-with-claude-design).

Projects may inherit a design system. For this pass, use the game-specific brief rather than
automatically importing the old game's styling. A repository import is optional; if used, attach
only relevant source, not credentials, generated API responses, node_modules, or the entire tree.
Anthropic recommends focused code imports for large projects and documents design-context handoff
to coding agents. [Prototype workflow](https://academy.claude.com/tutorials/using-claude-design-for-prototypes-and-ux).

The exploration-first scope, recovery distinctions, and staged game states above are our project
decisions, not promises that Claude Design automatically implements game rules or checkpoint storage.
No Claude account connection, upload, publication, or new image-generation run was performed here.

## Project Sources

- [Owner reference notes](REFERENCE_GAME_NOTES.md): game-reference and pacing preferences recorded
  on September 11. This September 12 brief supersedes their single-neon-direction restriction;
  it now requests both neon and World One variations informed by the written design document.
- [Game Design](../design/GAME_DESIGN.md): Loadout slots, Foundation, development, and economy.
- [World One](../design/WORLD_ONE.md): primary written Brood setting and visual contract, plus
  current Rail/Siege candidates and creep contracts. This is the World One reference, not artwork.
- [Specialist identities](../adr/0063-give-world-one-specialists-distinct-combat-kits.md): broader Arc/Gravity kits;
  later World One rollout rules take precedence over this older ADR's rollout scope.
- [Mass and control](../adr/0058-use-visible-mass-and-nonstacking-control.md): nonstacking slows/displacement.
- [Build status](../roadmap/BENCHMARK_BUILD_STATUS.md): implemented benchmark versus intended product.
