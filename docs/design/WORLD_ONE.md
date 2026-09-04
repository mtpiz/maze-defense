# World One — Brood World

Status: Certified authoring direction; Mission count and encounter details remain hypotheses  
Updated: 2026-09-03

This document applies the certified [game design](GAME_DESIGN.md) to the first World. It is an
authoring brief, not permission to turn provisional Mission names, counts, layouts, or balance into
hardcoded rules.

## Purpose

Brood World teaches the universal game through an approachable main path while immediately offering
demanding three-Star and Mastery goals. It must prove that Foundation Mazing is enjoyable before a
large roster exists and that Rail and Siege produce visibly different tactical plans.

By its end, a progressing player should understand:

- Direct and drag Foundation construction.
- Legal live construction during waves.
- Ground-route revision and contextual Route Previews.
- Ordered, always-passable Waypoints.
- Airborne enemies sharing Waypoints while ignoring every player tower.
- Route length versus specialist investment.
- Rail lane geometry and Siege cluster geometry.
- Visible speed, Armor, density, and Airborne pressure.
- Technology Trials, Blueprint ownership, Research, Stars, Schematic Fragments, and Mastery.

World One does not need to teach the complete future platform, every creep behavior, both branches
of every tower, Community systems, renewable modes, monetization, or cloud accounts.

## Setting and visual contract

World One is an environment under biological or biomechanical Brood infestation, culminating in the
Brood Matriarch. Its exact location, terrain material, palette, and rendering treatment remain open
until the Core Combat and Strategy Gates provide evidence.

Foundation, Rail, and Siege remain coherent futuristic Player Technology. Their silhouettes and
family relationships persist across Worlds. Brood World may influence restrained ammunition,
energy, material, marking, or effect details on Siege, but Siege must still read as futuristic player
artillery rather than a biological or medieval structure.

Brood terrain and enemies establish the local identity. At the smallest supported phone scale,
buildable cells, hard terrain, entrances, exits, Waypoints, occupancy, both routes, towers, creep
families, and critical statuses must remain distinguishable without color alone.

## World Map

World One uses a purpose-sized authored path rather than a fixed ten-node quota. The first authoring
budget is six to eight main Missions, one or two Optional Missions, two required Technology Trials,
and the boss. A Technology Trial may appear visually as a branch, but its route reconnects as a
required step so its Blueprint cannot be missed.

The opening is deliberately direct:

1. First launch cold-opens into Mission One.
2. Victory reveals the World Map and nearby route.
3. Rail enters no later than the third Mission through a loan-and-unlock Technology Trial.
4. Siege enters later through Brood World's featured loan-and-unlock Technology Trial.
5. Selected three-Star results reveal or complete optional Schematic hunts.
6. The Brood Matriarch guards the World Gate.

Exact node placement follows encounter pacing. A Mission is removed or combined when it lacks a
unique tactical purpose.

## Common Mission contract

- Default Arena: fully visible 9×14 portrait field.
- Arena dimensions and active shape remain content-defined.
- Initial Lives hypothesis: 20.
- Ordinary leak: one Life unless visibly authored otherwise.
- Boss leak: immediate defeat.
- Deterministic authored waves with a written purpose.
- Opening: untimed, losslessly editable, and restorable on retry.
- Active waves: legal Foundation placement; no Dismantle or route-changing removal.
- Between waves: 15–20-second planning hypothesis with immediate Early Launch.
- Ordinary duration target: roughly 6–8 experienced minutes, shorter during the opening.
- Boss duration target: roughly 10–14 experienced minutes.
- Default objective: survive every wave with Lives remaining.

World One uses a small tile vocabulary: open construction floor, hard terrain, inactive cells,
entrance, exit, and ordered Waypoint. It introduces no teleportation, burrowing, tower destruction,
moving terrain, or mandatory alternate objective. Those mechanics belong to later Worlds only when
they create better Maze decisions.

## Arena grammar

Mission One contains no Waypoint. The next early Mission introduces one. A later Mission demonstrates
several ordered Waypoints and Airborne traversal. Waypoints remain unbuildable and do not count when
touched out of order.

Entrances may originate from any clearly presented edge. Later Worlds may use central or more
unusual spawns. Purposeful Arena reuse is encouraged when a changed entrance, Waypoint chain,
starting condition, or threat composition creates a different Maze problem; statistical rematches
do not qualify.

The World One content package must not assume all Arenas are rectangular or 9×14 even though that is
the default presentation. The Core Combat Gate separately exercises a synthetic larger or irregular
Arena before the engine decision.

## Provisional Mission curriculum

This sequence describes teaching dependencies, not locked names or node counts.

### Opening — Foundation

- Mission One is a three-to-five-minute cold open using Drones and no Waypoint.
- The player reads entrance and exit, places or paints Foundations, sees the dashed Ground Route,
  and starts combat within roughly 15–30 seconds.
- A second short Mission introduces one Waypoint, live adaptation, Skitter-like speed pressure, and
  optional Early Launch.
- Foundation damage remains useful but route geometry is the actual lesson.

### Rail Technology Trial

- Rail is loaned at the expected early Blueprint Level.
- Straight firing lanes and deliberate target commitment create an immediately observable contrast
  with Foundation.
- Victory permanently awards the Rail Blueprint.
- A following Mission introduces visible Armor so Rail is advantaged without becoming the sole
  viable answer.

### Shared sky

- Gliders follow the same ordered Waypoints but ignore every placed tower.
- The contextual Airborne Route is shown before the first consequential Glider wave.
- Rail provides a viable Airborne answer; Arena geometry and coverage matter more than owning a
  dedicated anti-air tower.

### Siege Technology Trial

- Siege is loaned during a required Brood World Mission and awarded on victory.
- Dense Broodlings or clustered waves make delayed area damage legible.
- Siege attacks ground only, but its tile is not a special Airborne exception because no tower blocks
  Airborne movement.
- Later waves force a genuine choice between spending on a longer Foundation route, Rail lanes, and
  stronger Siege coverage.

### Combination and boss

- Late ordinary Missions combine speed, Armor, density, Airborne routes, multiple entrances, and no
  more than one carefully introduced support or sustain behavior at a time.
- At least one familiar Arena returns under a different entrance or Waypoint condition.
- The final ordinary Mission introduces no new rule and tests several credible Maze and tower plans.
- The Brood Matriarch is a visible multi-phase ground boss whose shell loss, Broodling release, and
  speed change are telegraphed. It cannot skip Waypoints or destroy towers.

## Candidate creep families

The World begins with the smallest roster that produces distinct decisions. These contracts are
candidates; inclusion requires encounter evidence.

| Family | Stable behavior | Decision created |
|---|---|---|
| Drone | Ordinary Light ground creep | Baseline route and damage comparison |
| Skitter | Fast, fragile Light ground creep | Coverage and target acquisition |
| Carapace | Slow Heavy ground creep with visible flat Armor | Large hits and lane commitment |
| Broodling | Extremely fragile dense ground groups | Area damage and cluster geometry |
| Glider | Light Airborne creep using the shared Waypoint Chain | Airborne coverage independent of the ground maze |
| Regenerator | Heavy creep that heals after a visible no-damage interval | Continuous coverage |
| Sporeguard | Heavy support that visibly protects nearby allies but not itself | Formation and target priority |
| Carrier | Heavy creep that releases Broodlings where destroyed | Kill timing and exit risk |

The Core Combat Gate uses Drones, Carapaces, Broodlings, and Gliders. Skitter is the next onboarding
candidate. Regenerator, Sporeguard, and Carrier enter World One only if its Rail/Siege roster supports
multiple understandable answers; otherwise they move to later Worlds.

## World One tower kits through Level 3

### Foundation

Foundation supplies inexpensive Maze geometry and weak short-range ground fire. Its early linear
upgrades improve cleanup without becoming an Armor, Airborne, or density solution.

### Rail

Rail attacks ground and Airborne targets from long range and rewards straight lanes.

- Level 1: deliberate shot that ignores most Armor.
- Level 2 candidate: penetration into one aligned target behind the first.
- Lance Level 3 candidate: charged high-impact lane shot.
- Repeater Level 3 candidate: sustained fire that accelerates while maintaining one target.

One Rail Specialization is Brood World's featured completion reward. Its alternate branch is hunted
through later Worlds or Masteries.

### Siege

Siege is expensive ground-only area damage that rewards cluster geometry.

- Level 1: delayed area impact.
- Level 2 candidate: a clearly telegraphed secondary impact.
- Mortar Level 3 candidate: long-range barrage with a minimum range.
- Quake Level 3 candidate: radial shockwaves across nearby Maze lanes.

World One awards the base Siege Blueprint. Its Specialization progression may begin here but does not
need to complete before the World Gate.

## Progression and rewards

World One must establish scarcity without trapping the player:

- Rail and Siege base Blueprints are guaranteed Technology Trial rewards.
- First clears and improved Stars provide deterministic Research.
- Available Research can meaningfully improve selected technology but cannot maximize both families
  and every discovered branch.
- The boss awards the next Foundation Blueprint Level on victory.
- Three named Fragments complete Brood World's featured Rail Specialization Schematic.
- The final Fragment may be attached to a three-Star boss clear; the other two belong to visible or
  adequately hinted three-Star or Mastery accomplishments.
- The alternate Rail Schematic remains visible as a longer-term hunt rather than being fully awarded
  in World One.

Exact fragment locations, Research quantities, Blueprint costs, and World Gate Stars remain in the
playtest register until the Mission graph exists.

## Mastery

Three Stars reveal the Mastery inside that Mission Node. Every World One Mastery applies a combined
Blueprint-Level budget and may add one authored contract. Contracts must use the existing World One
vocabulary, remain visible before deployment, and avoid requiring an unowned Blueprint unless it is
loaned at a fixed Level that counts against the budget.

Mastery first clears award visible deterministic Research or named Schematic Fragments. They never
gate the main path.

## World One completion evidence

World One is ready for production multiplication only when tests show:

- New players understand Foundation Mazing and ordered Waypoints without coaching.
- Airborne routes are predicted correctly after their introduction.
- Rail and Siege lead to visibly different placement and investment decisions.
- At least several credible Maze patterns survive representative late Missions.
- Three-Star and Mastery play is demanding while main-path progress remains approachable.
- No candidate creep or wave exists only to extend runtime.
- The approved visual slice remains readable and performant on target phones.
