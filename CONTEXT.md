# Tower Defense Successor Domain Glossary

This glossary defines the shared product language for the successor game. It names settled concepts;
rules and tunable values belong in the design contract and playtest hypothesis register.

## Core play

**Mazing**:
The strategic creation and revision of ground-creep routes with placed Foundation Towers while every required route remains valid.
_Avoid_: Walling, fixed-road defense

**Arena**:
The battlefield geometry used by a Mission, including its active shape, traversal layers, construction spaces, terrain, entrances, exits, and Waypoint Chain.
_Avoid_: Mission, World, level

**Waypoint Chain**:
The ordered set of visible, unbuildable route markers that every applicable creep must touch in sequence before reaching its exit.
_Avoid_: Air waypoints, ground waypoints, direction decoration

**Traversal Layer**:
An authored Arena mask specifying which cells one movement class may cross. World One normally shares hard terrain across layers; later Arenas may differ.
_Avoid_: Tower resistance, hidden route rule

**Ground Route**:
The current path through the Waypoint Chain computed with terrain and every placed tower treated as obstacles.
_Avoid_: Fixed road, prescribed maze

**Airborne Route**:
The path through the same Waypoint Chain computed from the Airborne traversal layer while ignoring all player towers.
_Avoid_: Air maze, Air Blocking, separate waypoint chain

**Route Preview**:
The faded dashed visualization of a current valid route. Ground is primary; differing Airborne segments appear contextually with a distinct non-color-only treatment.
_Avoid_: Permanent road, decorative trail

**Live Construction**:
Legal Foundation placement while a wave is active. Placement changes the ground route immediately, while the new weapon observes its construction delay.
_Avoid_: Combat pause, unrestricted live editing

**Opening Plan**:
The saved pre-Wave-1 arrangement associated with one Mission and Loadout, restorable for a retry without replaying later decisions.
_Avoid_: Automated strategy, Mission replay

**Field Credits**:
The temporary Mission resource used for construction and tower development, reset when that Mission ends.
_Avoid_: Research, gold account balance

**Early Launch**:
The choice to begin the next wave before its planning countdown expires in return for a small capped Field Credit reward.
_Avoid_: Fast-forward, skip wave

**Tactical Pause**:
A halt to Mission simulation for inspection without construction or tower-development actions.
_Avoid_: Build phase, planning interval

**Mission Speed**:
A presentation-time multiplier that advances more deterministic simulation ticks without changing Mission rules or outcomes.
_Avoid_: Difficulty, damage multiplier

## Campaign

**Campaign**:
The primary progression mode, composed of deterministic authored Worlds and Missions.
_Avoid_: Endless mode, random run

**World**:
A themed Campaign destination whose purpose-sized Missions share an environment and develop a coherent set of tactical ideas.
_Avoid_: Biome, level pack

**Galaxy Map**:
The high-level Campaign view used to travel between Worlds.
_Avoid_: World Map, Mission list

**World Map**:
The authored node path used to navigate Missions, visible branches, and revealed hidden branches inside one World.
_Avoid_: Galaxy Map, random route

**Mission Node**:
A World Map location representing one Mission and its best Star Rating, rewards, and Mastery status.
_Avoid_: Arena, Mastery node

**Mission**:
A single authored Campaign challenge played on one Arena.
_Avoid_: Arena, map, stage

**Optional Mission**:
A side-branch Mission that awards additional progression but never blocks the next main-path Mission.
_Avoid_: Technology Trial, Mastery

**Hidden Mission**:
An Optional Mission whose branch is revealed through a visible or adequately hinted authored accomplishment.
_Avoid_: Random encounter, undisclosed requirement

**Technology Trial**:
A required Mission that loans its featured specialist Blueprint at an appropriate Level and awards the base Blueprint on victory.
_Avoid_: Optional unlock, paid trial

**Mission Brief**:
The pre-deployment view containing threats, Arena rules, rewards, prior results, Loadout, and the Deploy action.
_Avoid_: Store, multi-screen lobby

**Threat Forecast**:
The pre-Mission disclosure of relevant behaviors, Arena rules, entrances, and exits without revealing the complete wave script.
_Avoid_: Full wave list, blind loadout

**Wave Briefing**:
The between-wave disclosure of the next wave's families, entrance, movement layer, major traits, and approximate volume.
_Avoid_: Full encounter script, vague warning

**Star Rating**:
The permanent one-to-three-Star Mission result based only on victory and Lives retained; three Stars means no Lives lost.
_Avoid_: Score, difficulty rank

**World Gate**:
The boss-victory and cumulative-Star requirement for opening the next World, initially tuned near a two-Star main-path average.
_Avoid_: Paid gate, per-Mission lock

**Mastery**:
The optional challenge inside a three-Star Mission Node, combining a Mastery Budget with at most one authored contract and never gating the main Campaign.
_Avoid_: Fourth Star, generic hard mode

**Mastery Budget**:
The maximum sum of effective Blueprint Levels permitted across Foundation and the selected specialist Blueprints in a Mastery.
_Avoid_: Gear score, tower count cap

**Mastery Contract**:
The single authored variation that gives one Mastery a distinct tactical test, such as a loan, altered entrance, action restriction, or revised wave composition.
_Avoid_: Hidden rule, arbitrary handicap

**Lives**:
The Mission allowance consumed when ordinary creeps reach an exit; an escaping boss causes immediate defeat.
_Avoid_: Core Integrity, base health

## Towers and account progression

**Player Technology**:
The coherent futuristic defense identity shared by Foundation and specialist tower families across every World, with restrained regional influence allowed on earned technology.
_Avoid_: World-specific tower skin, unrelated roster styles

**Foundation Tower**:
The always-available, slot-free, inexpensive tower that creates the ground maze and provides weak basic ground damage.
_Avoid_: Wall, specialist slot, Air blocker

**Tower Blueprint**:
A permanent account unlock for one specialist tower family, earned through a required Technology Trial and occupying one specialist Loadout slot.
_Avoid_: Tower card, Schematic, tower instance

**Loadout**:
Foundation plus at most three selected Tower Blueprints available during one Mission. Each selected Blueprint includes all of its owned Specializations.
_Avoid_: Deck, specialization slots

**Tower Level**:
The temporary one-to-five development level of one placed tower during a Mission.
_Avoid_: Blueprint Level, rarity tier

**Blueprint Level**:
The persistent one-to-five maximum Tower Level researched independently for one Blueprint or owned Specialization.
_Avoid_: Tower Level, account rank

**Blueprint Ceiling**:
The highest Blueprint Level that current Campaign progress permits the player to research.
_Avoid_: Dynamic enemy scaling, paid ceiling

**Specialization**:
One of two collectible linear branches inside a specialist Blueprint, beginning at Tower Level 3 and consuming no additional Loadout slot.
_Avoid_: Sub-Blueprint, extra slot

**Specialization Schematic**:
The completed named discovery that makes one Specialization eligible for Research.
_Avoid_: Blueprint, upgrade currency

**Schematic Fragment**:
One named, deterministic, one-time piece of a specific Specialization Schematic. Standard sets contain three; exceptional sets may contain four or five.
_Avoid_: Schematic, random shard, duplicate drop

**Research**:
The scarce universal account currency permanently invested to raise individual Blueprint and Specialization Levels within the Blueprint Ceiling.
_Avoid_: Field Credits, tower XP, premium currency

**Foundation Blueprint**:
The boss-awarded progression track that raises the maximum Tower Level of Foundation without consuming Research or choosing a Specialization.
_Avoid_: Specialist Blueprint, starter card

**Refit**:
The between-wave replacement of the specialist family installed on an existing Foundation position, resetting that tower's specialist development.
_Avoid_: Respecialize, Dismantle

**Respecialize**:
The live, costly switch between two owned Specializations of the same installed Blueprint while retaining Tower Level and temporarily disabling its weapon.
_Avoid_: Refit, free branch swap

**Dismantle**:
The between-wave removal of a placed tower for a partial Field Credit refund, changing the ground maze when its Foundation is removed.
_Avoid_: Refit, delete

## Combat language

**Creep Family**:
A visually and behaviorally distinct enemy type whose tactical contract remains stable while numerical strength may scale.
_Avoid_: Skin, stat package

**Capability Check**:
An Arena or creep problem with multiple tactical answers that rewards appropriate tools without secretly requiring one unloaned Blueprint.
_Avoid_: Exact-tower gate, hidden immunity

**Armor**:
A visible trait that subtracts a fixed amount from each hit while preserving a small minimum-damage floor.
_Avoid_: Hidden resistance, elemental chart

**Mass**:
A visible category controlling displacement and slow resistance: Light, Heavy, or boss-scale immovable.
_Avoid_: Hidden control immunity, weight stat

**Targeting Doctrine**:
The predictable target-priority rule inherited by a Blueprint family and optionally overridden on one tower.
_Avoid_: Manual aiming, invisible heuristic

**Combat Readability Budget**:
The explicit limit and priority order for simultaneous effects, labels, flashes, trails, shake, audio voices, and haptics.
_Avoid_: Unrestricted spectacle, graphics preset alone

## Production

**Core Combat Gate**:
The first evidence Gate, using a noncanonical representative Mission to judge gameplay, physical-device interaction, performance, and presentation-pipeline feasibility before broader production.
_Avoid_: Engine-only benchmark, final-art review

**Production Gate**:
An evidence checkpoint whose tracks pass independently; elapsed time never constitutes a pass.
_Avoid_: Calendar milestone, status update

**Simulation Kernel**:
The renderer-independent deterministic authority for Mission rules, routing, combat, economy, and outcomes.
_Avoid_: Renderer state, global world object

**Content Bundle**:
A versioned immutable runtime package compiled from validated authored Campaign, Arena, Mission, tower, creep, reward, and progression data.
_Avoid_: Executable mod, hardcoded balance

**Player Profile**:
The versioned local record of Campaign progression, settings, unlocks, Research investments, results, and Opening Plans.
_Avoid_: Mandatory account, cloud identity

**Playtest Hypothesis**:
A falsifiable but revisable expectation recorded with evidence and a failure response rather than treated as a durable product decision.
_Avoid_: ADR, promise, balance fact
