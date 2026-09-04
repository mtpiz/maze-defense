# Tower Defense Successor — Certified Game Design

Status: Certified pre-production baseline  
Certified: 2026-09-03  
Primary platform: Portrait mobile, Android first

This document is the current product contract. ADRs preserve historical reasoning but do not
override it. Numerical expectations and uncertain behavior belong in
[PLAYTEST_HYPOTHESES.md](PLAYTEST_HYPOTHESES.md), not in this contract.

## Product promise

The game is a strategy-first portrait tower defense game in which the player constructs the ground
route as well as the defenses. Short deterministic Missions turn Foundation Mazing, ordered
Waypoints, limited Blueprint Loadouts, visible creep behavior, live construction, and deliberate
between-wave restructuring into a sequence of authored tactical problems.

The immediate objective is to make that game compelling for the developer and a small group of
friends. Monetization, a live-service cadence, community infrastructure, and renewable endgame modes
must not shape the current implementation. A future product may combine a free-to-start Campaign
with optional Blueprint or progression acceleration, but only after the game and progression curve
are proven without purchases.

The quality target is a highly polished indie mobile game achievable by one developer with
AI-assisted production over sustained iteration. It is not a claim of Bloons-scale staffing,
content volume, or runtime 3D production.

## Audience

The main path serves broad mobile strategy players who can understand the opening without prior
tower-defense expertise. Three-Star clears and Masteries must provide immediate depth for experienced
TD players. The game is not an idle loop, an optimization-only niche, or a sequence of 75-wave
endurance grinds.

## Design pillars

### The maze is the weapon

Foundation Towers create the ground route. Ordered Waypoints let an Arena demand reversals, loops,
long firing lanes, and repeated passes through valuable positions. Later Worlds may add authored
terrain and routing rules, but fixed roads never replace Mazing as the central play.

### Every wave changes a decision

Campaign waves are authored and deterministic. Each wave establishes, combines, reverses, or tests a
tactical idea. More health and more enemies are tuning; by themselves they are not content.

### Towers create strategies, not color counters

Blueprint families differ through targeting, geometry, timing, commitment, control, and placement.
Creep traits remain visible and stable. Capability Checks favor several possible answers and never
silently require one unowned Blueprint.

### Progress is the long-term reward

The Campaign reveals core Blueprints, Specialization Schematics, Research choices, Stars, and
Masteries over many Worlds. Permanent power is real and bounded. Earlier Worlds should become easier
after investment; enemies do not scale automatically to erase growth.

### Casual progress, demanding completion

Worlds One through Three teach Mazing through approachable main paths. Three-Star clears and
Masteries become demanding during World One. From World Four onward, mixed threats, Arena rules, and
three-of-many Blueprint selection increasingly drive difficulty.

### Spectacle serves comprehension

Futuristic Player Technology persists across radically different Worlds. Regional influence may be
visible in restrained materials or effects, but tower families remain coherent. Route state,
silhouettes, telegraphs, touch clarity, accessibility, and stable frame delivery outrank decorative
density.

## Core loop

```text
Cold-open Mission One
  → World Map
  → Mission Brief and available Blueprint Loadout
  → Opening Plan
  → short authored waves with live Foundation construction
  → between-wave restructuring or immediate Early Launch
  → victory, Stars, deterministic rewards, or informed retry
  → Research investment, Schematic progress, and optional Mastery
  → next Mission, completion replay, or next World
```

There is no energy system, required wait timer, compulsory login streak, account prompt, purchase
offer, or forced advertisement in the current product scope.

## Campaign structure

### Worlds and Missions

The long-term working shape is ten themed Worlds. This is a direction for reward pacing, not a
six-month content promise. Worlds are purpose-sized: normally six to eight main Missions, one or two
Optional Missions, and a boss. A World may be longer only when its mechanics support additional
purposeful encounters.

Most Missions use the familiar objective of surviving every wave with Lives remaining. Selected
Missions, mostly after World One, may add one clearly disclosed authored twist such as multiple
exits, shifting terrain, a protected structure, a fixed opening, or a constrained resource. A twist
must deepen Mazing or tower decisions rather than replace the core game with a bespoke minigame.

Campaign Mission retries reproduce the same Arena, wave composition, and timing. Procedural
Campaign waves, daily rotations, Endurance, Expeditions, and other renewable modes remain deferred
until the authored endgame demonstrates a need.

### World and Galaxy Maps

The Galaxy Map presents Worlds as distinct destinations. Each World uses an authored node path with
a visible main route, optional branches, and adequately hinted hidden branches. A short skippable
craft or rover movement may connect nodes without delaying the next decision.

Completing a main-path Mission opens the next connected main node. A World Gate requires boss
victory and a cumulative Star total initially tuned near a two-Star main-path average. Optional
Missions supply substitute Stars. Three-Star completion is strongly rewarded but never required on
every Mission to advance.

### Results and retries

World One begins ordinary Missions with 20 Lives as an initial hypothesis. Ordinary leaks remove
Lives; a boss leak causes immediate defeat.

- One Star: victory with Lives remaining.
- Two Stars: victory while retaining at least the configured high-life threshold.
- Three Stars: victory without losing a Life.

Time, score, Early Launch, and Mission Speed do not affect Stars. Victory reveals rewards and the
next route quickly. Failure identifies the final wave and leaking families, then offers restored-plan
retry, plan editing, or Loadout change without inserting an advertisement.

### Technology Trials

Each core specialist enters play through a required Technology Trial. The Mission loans that
Blueprint at the expected local Level, teaches its stable role, and permanently awards its base
Blueprint on victory. The unlock cannot be missed and is never hidden behind three Stars or Mastery.

World One front-loads two specialists: Rail as the first legible family and Siege as Brood World's
featured unlock. Worlds Two and Three introduce Arc and Gravity in an order chosen with their World
mechanics. By the end of World Three, four owned Blueprints compete for three Loadout slots.

Later Worlds normally introduce one core Blueprint each. Hard-to-find rewards deepen or diversify
owned families rather than withholding the minimum functional roster.

## Mission rules

### Arena grammar

World One defaults to a fully visible 9×14 portrait Arena. Arena dimensions, active shapes, terrain,
entrances, exits, and traversal masks are content—not simulation constants. Later content may use
larger rectangles, inactive cells producing L-shaped or oblong fields, central entrances, voids,
hazards, or camera movement when proven usable on phones.

Waypoint tiles are always visible, unbuildable, and traversable by applicable layers. Every creep
must physically touch every Waypoint in order. Touching a later Waypoint early has no effect. Route
segments may revisit cells and edges, deliberately looping creeps past strong positions.

Mission One has no Waypoint. Early Missions introduce one and then several before later Worlds use
them freely according to tactical purpose.

### Ground and Airborne routing

Ground and Airborne creeps share entrances, exits, and the Waypoint Chain. Every placed tower blocks
the Ground Route. Player towers never block the Airborne Route.

Each Arena supplies separate ground and Airborne traversal masks. World One normally uses hard
terrain that blocks both; later Worlds may author layer-specific cliffs, voids, ceilings, storms, or
other readable terrain. Displacement preserves a creep's current required Waypoint: it cannot skip,
reset, or satisfy progress without valid contact.

The familiar faded dashed Ground Route appears during planning and relevant construction. When
Airborne threats matter, their differing route appears contextually with a spaced, non-color-only
marker treatment. Route information recedes during combat without becoming unavailable.

### Construction

Opening planning is untimed and fully refundable. Tapping places one Foundation; dragging paints a
sequence while speculative validation updates the route. Illegal placement is rejected with a clear
reason. The most recent valid Opening Plan is saved for retry.

During active waves:

- Foundations may be placed when both required routes remain legal.
- A legal Foundation changes the Ground Route immediately.
- Its weapon observes a short construction delay.
- Dismantling, moving Foundations, and any route-changing action are unavailable.
- Upgrades and same-family Respecialization may remain available because they do not alter routing.

Between waves, the player may Dismantle and Refit under partial-refund rules. Exact refunds,
construction delays, and action costs remain hypotheses.

### Waves and pacing

Ordinary Missions target roughly 6–8 experienced minutes; boss Missions target roughly 10–14.
Mission length follows the tactical arc rather than a fixed quota. Ten to fourteen waves remains a
useful normal range, but a shorter Mission is correct when additional waves would repeat solved play.

After each wave, a 15–20-second planning countdown provides a Wave Briefing. Early Launch starts the
wave immediately and grants a small capped Field Credit reward. Live Foundation construction keeps
combat interactive; the planning interval remains valuable for Dismantle, Refit, and deliberate
review.

Guaranteed wave allotments provide most Field Credits. Kills and Early Launch are smaller
supplements. The interface shows guaranteed upcoming income. Normal Campaign imposes no artificial
tower-count or path-length limit; Field Credit opportunity cost balances maze length against
specialist development.

## Tower system

### Foundation

Foundation is the cheap universal ground-maze tower. Its weak short-range ground weapon handles
introductory enemies and stragglers but cannot answer later Capability Checks alone. Its separate
Foundation Blueprint advances linearly through boss rewards so an uninformed Research decision
cannot cripple the game's core construction tool.

### Loadouts and field development

A normal Loadout contains Foundation outside the slot budget and up to three selected specialist
Blueprints. One Blueprint consumes one slot regardless of tower count or owned branches. Before
three Blueprints are owned, remaining slots stay visibly empty.

Each specialist follows this field tree:

- Tower Level 1: shared base family supplied by its Blueprint.
- Tower Level 2: shared behavioral improvement after its Blueprint Level is researched.
- Tower Level 3: each tower chooses one owned Specialization.
- Tower Levels 4–5: that branch deepens without splitting again.

Selecting a Blueprint exposes every owned branch. Different towers of the same family may take
different branches simultaneously. Respecialization between owned branches retains Tower Level,
costs Field Credits, disables the weapon temporarily, and remains limited enough that placement and
initial choice matter.

Every Level must be identifiable at phone scale. Level 3 carries the major branch silhouette change;
Levels 4–5 may escalate through modular weapons, attachments, animation, emissives, and effects
rather than requiring a wholly unrelated asset.

### Account development

The permanent progression model separates four concepts:

1. A Technology Trial awards a base Blueprint and Level 1 access.
2. Research independently purchases shared Level 2 for that Blueprint.
3. Completing a named Specialization Schematic makes one Level 3 branch eligible; Research activates it.
4. Later Campaign Ceilings permit Research investment through Levels 4–5 without another Schematic type.

Research is scarce and normally permanent. Rewards let players develop a useful subset, not maximize
every acquisition. Main-path tuning must tolerate imperfect investment, development builds retain
unrestricted reset controls, and material balance changes require compensation.

New late-game Blueprints arrive with some Research so they can approach the local expected power, but
never enough to maximize the entire family automatically. Enemies do not scale to the player's exact
Research investment.

### Schematics and fragments

A Specialization Schematic belongs to one exact branch. Named deterministic Fragments assemble it
automatically. Fragments never duplicate, drop randomly, or require repeating easy Missions.

Standard early Schematics require three Fragments. Exceptional later sets may require four or five,
never more. A home World develops one featured specialization through demanding three-Star,
Mastery, and boss accomplishments. The alternate branch may send the player hunting through later
Worlds and Masteries. Broad source clues are visible; exact rewards appear when their World or hidden
node is discovered.

### Mastery

Three Stars unlock the Mission's optional Mastery within the same node. Every Mastery has a maximum
combined Blueprint-Level budget and may add at most one authored Mastery Contract. A named required
Blueprint is permitted only when loaned at a fixed effective Level that counts against the budget.

Mastery never gates the main Campaign. First clears award visible deterministic progression such as
Research or a named Schematic Fragment.

## Presentation and accessibility

The first launch begins directly inside Mission One. The player reads the route and places the first
Foundation within seconds; the first wave begins within roughly 15–30 seconds. The World Map is
revealed after the first victory. There is no separate tutorial.

The Arena dominates the portrait Mission screen. A compact top bar holds Lives, waves, Field
Credits, pause, and speed. A contextual bottom sheet serves construction, towers, briefings, and
creep inspection without permanently resizing the board.

Accessibility begins with the renderer: color-independent signals, photosensitivity-safe defaults,
reduced flash and shake, effect-intensity control, readable UI scaling, high-contrast route and range
presentation, independent audio and haptics, and 30/60 FPS modes.

## Scope boundaries

The current production path includes reliable versioned local saves, recovery, checkpoints,
settings, and diagnostic export. It excludes cloud identity, billing, entitlements, advertisements,
premium currencies, economy ledgers, Community services, live events, seasons, guilds, PvP, co-op,
and renewable endgame modes.

Interfaces should not obstruct later additions, but hypothetical integrations do not justify
shallow modules or unused adapters. The game earns platform investment only after its play is proven.
