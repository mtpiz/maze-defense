# Adversarial Design Review

Status: Reviewed and resolved as challenge material; not product authority  
Date: 2026-08-23  
Resolution: 2026-09-03
Scope reviewed: 90 ADRs, GAME_DESIGN, WORLD_ONE, V2_ARCHITECTURE, SIX_MONTH_PLAN, BENCHMARK_BUILD_STATUS, CONTEXT, `packages/sim`, `packages/content`, `apps/game`, and the frozen prototype

This document is a deliberate red-team of the v2 design. It is evidence for discussion, not a
decision record. [GAME_DESIGN.md](GAME_DESIGN.md) remains the product contract,
[CONTEXT.md](../../CONTEXT.md) owns terminology, and the
[ADR status index](../adr/README.md) explains why historical ADRs are not product authority.

Findings are stated adversarially by request. Several argue against decisions that are defensible on
their own terms; the value is in forcing each one to be defended rather than assumed.

The review was resolved with the product owner on 2026-09-03. Major accepted changes include a
game-first local scope with monetization deferred, slow multi-World Blueprint progression, live
Foundation construction, Airborne routes that ignore towers, content-defined Arena shapes, a reduced
progression vocabulary, modular tower evolution, and a four-track Core Combat Gate. Seeded modes, a
separate tutorial, authored third-Star objectives, immediate final-art lock, and an immediate Godot
rewrite were rejected or deferred. Current decisions and open hypotheses live in the linked product
contract and [hypothesis register](PLAYTEST_HYPOTHESES.md); the findings below remain unchanged as the
original critique.

Two premises were corrected by the product owner during review and are reflected below: the reviewed
corpus is World One of an intended five-to-ten-world, thirty-to-fifty-tower game, and ADR-0036 exists
to prevent sell-and-rebuild maze juggling. A third correction separates persistent futuristic Player
Technology from World art; ADR-0091, GAME_DESIGN, WORLD_ONE, and the Visual Direction track now
reflect it.

## Headline

The design is a premium tactics game carrying the infrastructure of a free-to-play title. It is
authored, deterministic, finite, ethically monetized, with no timers and no random acquisition. That
is a coherent product. But the plan also funds two currencies, an Economy Ledger, receipt validation,
entitlement restore, Blueprint Ceilings, rarity bands, a store, and a rewarded-ad placement. That
machinery consumes most of Phase 3 and Phase 5 and adds nothing a paid application needs.

Pick a business model and write the ADR. If premium, delete the free-to-play stack and spend the
recovered months on Arenas and towers. If free-to-play, the content engine, the roster size, and the
spend surface all need rebuilding before Week 1 rather than after Week 26.

## Severity

| Level | Meaning |
|---|---|
| Structural | Invalidates a pillar, a Gate, or the business case |
| Costly | Burns budget or players without killing the project |
| Sharpening | The decision is defensible but a better version exists |

## Findings

### F-01 — There is no day-seven loop, and the documents forbid building one

Structural. References: ADR-0017, ADR-0037, SIX_MONTH_PLAN outcome.

ADR-0017 rules out energy, logins, and calendar waits. ADR-0037 rules out Research from repeat clears.
The plan defers Endurance, Expeditions, Community Arenas, leaderboards, seasons, events, guilds, PvP,
and co-op. What remains is twelve Missions, their Stars, and their Masteries, after which the game
gives the player nothing.

Every one of those constraints is defensible alone. Collectively they produce a game with no renewable
source of goals. For the shipped multi-World game this is a solvable future problem. For the Vertical
Slice it is a measurement problem: Week 26 puts a two-hour build in front of 200–500 testers and asks
whether 35 percent voluntarily replay within a week. That number will report content exhaustion and
will read as disengagement.

Recommendation: build the renewable loop inside authored content rather than beside it. Weekly seeded
modifier runs over existing Arenas cost almost nothing once the content compiler exists, respect every
anti-grind principle in ADR-0017, and supply a recurring reason to open the application.

### F-02 — Content efficiency is roughly one tenth of the genre standard

Structural. References: ADR-0024, ADR-0068, WORLD_ONE Arena plan.

Eight Arenas yield twelve Missions plus twelve Masteries — about a 3x multiplier. Bloons TD6 extracts
15–30x from one map through difficulties, modes, and event overlays. Infinitode extracts endless,
leaderboards, and procedural maps from the same tiles.

v2 builds the most expensive kind of content — roughly 150 hand-authored deterministic waves, each
requiring a written tactical purpose — and extracts the least replay from it. At the intended scale
this decides whether the game exists: five to ten Worlds at this cadence is 700–1,400 authored waves
and, at the World One rate of six months, two and a half to five solo years. The Blueprint Ceiling
schedule already encodes that assumption, placing Level 4 at World Four and Level 5 at World Eight.

The full-game scope makes this finding worse rather than better. A 3x replay multiplier is a minor
inefficiency across eight Arenas and a catastrophic one across eighty.

Recommendation: compress the Ceiling schedule so the arc fits a fundable budget — Level 5 by World
Three. Prove the content multipliers in World One where they are cheap to get wrong: a difficulty axis
over every Mission, and seeded composition within authored wave bounds. Together those take one Arena
from roughly 3 configurations to roughly 15 at near-zero authoring cost. Discovering this at World Four
means re-authoring three Worlds.

### F-03 — The slice cannot validate the Loadout system, which is what the slice is for

Costly. References: ADR-0008, ADR-0024, SIX_MONTH_PLAN Strategy Gate.

ADR-0008 is correct for the shipped game. Three slots against an eventual thirty to fifty families is
real preparation tension.

The problem is local. World One ships four families and the free path awards exactly three, so for the
entire Vertical Slice the preparation choice is either no choice or one binary swap. The Threat
Forecast exists to inform a decision that, in the content being tested, has no branches.

This disarms the Strategy Gate. "No specialist appears in more than 90 percent of eligible clean
victories" cannot return a meaningful result when the player owns three and must field all three. It
will read as a hard failure caused by roster size rather than by convergent tower design, leaving
"the towers are too similar" indistinguishable from "there were not enough of them" — which is the
question Week 14 exists to answer.

Recommendation: reach six families in World One so the Gate has something to measure. The meta-systems
in F-05 are worth roughly two families of engineering time. If six is unreachable, keep four and
rewrite the Strategy Gate to measure what the slice can observe: distinct maze patterns per Mission,
and per-family share of damage and kills rather than presence in an unchosen Loadout.

### F-04 — The wave lock is aimed at the right exploit and catches too much with it

Structural. References: ADR-0036, ADR-0032, ADR-0033, ADR-0061, ADR-0047.

ADR-0036 prevents maze juggling: sell a tower ahead of a running creep, rebuild behind it, repeat, and
the route becomes effectively infinite. That is a genuine degenerate strategy and it deserves a rule.
But the exploit is specifically sell-and-rebuild, and the current rule also bans construction, which
cannot produce it.

Build-only mazing is monotonic. Every placement lengthens the route or is rejected; nothing shortens
it, so the maze converges rather than cycling. It is bounded twice, by board area and by Field Credits,
and a creep cannot be juggled with a tower that cannot be removed. Banning Dismantle during waves kills
juggling completely while leaving live re-routing intact.

The economy supplies a second independent lever. ADR-0033 refunds 80 percent of Foundation cost on live
Dismantle, so five juggle cycles cost roughly one Foundation. At approximately 35 percent the strategy
dies on its own arithmetic while emergency Dismantles remain available.

What the full lock costs: re-routing a wave that is already running is the genre's highest skill
expression and the clearest expression of the first pillar. Note also that "most tower defenses have a
build phase" does not imply this rule — Bloons TD6, Kingdom Rush, and Defense Grid all have build
phases and allow building during rounds. The phase is a pacing device, not an exclusive window.

Waves are not dead air, since ADR-0032 and ADR-0061 already permit upgrades and Respecialization under
fire. The remaining pacing concern is narrower but live: twelve waves at 17.5 seconds is three and a
half minutes of a six-to-eight-minute Mission in a planning state. ADR-0028 specified four to six
seconds and ADR-0047 superseded it with fifteen to twenty, landing on the dwell length at which mobile
players leave the application.

Recommendation: narrow ADR-0036 so that Dismantle is illegal during waves while Foundation placement
remains legal at all times with continuous route re-validation. Cut live Dismantle refund to
approximately 35 percent as a second guard. Replace the fixed interval with untimed planning plus a
manual Launch and an Early Launch bonus worth optimizing.

### F-05 — Twenty-eight concepts sitting on top of four towers

Structural. References: CONTEXT.md, ADR-0011, ADR-0044, ADR-0046, ADR-0056, ADR-0057, ADR-0061.

Field Credits, Research, Prisms, Blueprint, Blueprint Level, Blueprint Ceiling, Tower Level, base
Schematic, Specialization Schematic, Advancement Schematic, Schematic Segment, Rarity band, Loadout,
Star, Mastery, Mastery Budget, Refit, Respecialize, Dismantle, Targeting Doctrine, Air Blocking, Mass,
Armor, Waypoint Chain, Early Launch, Opening Plan, Threat Forecast, Wave Briefing, Commander Pack.

That is a live-service meta-layer attached to a two-hour game. Specific objections:

- Segments are a shard system with the randomness removed, which removes the only reason shard systems
  exist — drip-feed pacing and a duplicate sink. Deterministic three-piece assembly is "beat these three
  Missions" wearing an inventory screen.
- Three gates gate one door. A Blueprint Level requires the Ceiling, the Schematic, and the Research.
  Any two pace progression adequately. Ceiling is the least legible and the most likely to read as a
  paywall regardless of intent.
- Advancement Schematics gate Levels 4 and 5, which do not exist in the slice. That is specification
  debt shaping a system nobody will play for two years.
- Mastery Budget is a gear score. CONTEXT.md lists "power rating, gear score" under _Avoid_ for that
  exact entry while defining a sum-of-levels power cap.
- Refit, Respecialize, and Dismantle are three change-my-mind verbs with different refund rates, timing
  legality, cooldowns, and route-blocking side effects, resolved on a phone inside a short window.
  Players will experience all three as "can I change this tower."

Recommendation: collapse to two verbs — Sell, which changes the maze, and Reconfigure, which does not —
one Schematic type, and two progression gates. The deleted systems fund the families missing in F-03.

### F-06 — The conversion test is aimed at the one item players are told is optional

Structural. References: ADR-0039, ADR-0030, ADR-0040, ADR-0044.

Gravity is the designated monetization proof. But Loadouts hold three specialists, the free path awards
exactly three, and Gravity deals negligible damage. The flagship purchase is the thing onboarding proves
optional.

The free path compounds it. Gravity's three Segments come from a Trial three-Star, a Trial Mastery, and
the boss Mastery — the three hardest accomplishments in the game. The offer therefore reads as paying to
skip the content the player is most engaged with. Players engaged enough to want Gravity are engaged
enough to earn it; players who are not will not pay.

The only other product is the Commander Pack. Selling a speed multiplier that ADR-0030 guarantees does
not change tactical outcomes is selling the player's time back to them, which is the coercive pattern
the risk register warns about. The store is also revenue-suppressing by construction: deterministic
bundles, owned pieces reduce price, no consumables, no repeat purchases, cosmetics deferred. A paying
user's lifetime ceiling is roughly one Blueprint plus one pack.

Recommendation: if premium, charge up front, delete the store, and market the ethics — no ads, no gacha,
no timers is a genuine differentiator. If free-to-play, promote cosmetics from deferred to a first-class
pillar built in Phase 2. Tower skins, Arena palettes, craft liveries, and effect sets are the only spend
surface with no ceiling and no power implication, and every other honest lever is already ruled out by ADR.

### F-07 — The most expensive decision in the corpus is defended by three lines

Structural. References: ADR-0025, ADR-0062, SIX_MONTH_PLAN risk register. See also F-20.

ADR-0025 commits to stylized faux-3D frontier art: grass, soil, rock, industrial plating, contact
shadows, material variation, faux-3D tile faces, a biomechanical swarm with per-family silhouettes and
telegraphs. That is the largest cost line in the project, it is assigned to AI-assisted generation, and
the risk register already flags AI art inconsistency with no mitigation beyond tightening the style bible.

The full-game scope multiplies this by roughly forty. ADR-0062 requires every tower Level to change
silhouette. At thirty to fifty families across five Levels, that is 150–250 distinct tower forms before
branch effects, plus creep families and terrain sets for five to ten environments. In a systematized
visual language — silhouette-led, procedurally recolorable, compositional — that is a solvable pipeline
and a new tower is a parameter set. In hand-crafted faux-3D with per-asset material, shadow, and
perspective work, 250 forms is not a solo art bill at any timeline. ADR-0025 and ADR-0062 are
individually reasonable and jointly unaffordable, and nothing in the corpus multiplies them together.

The frozen prototype is relevant evidence here. It generated all art procedurally in `assets.ts` and
`enhanced-assets.ts` with no image files at all. Its execution was correctly rejected as an
anti-reference, but the production model is a separate question from the art direction, and a
parameterized procedural pipeline directly answers the tower-forty problem.

Recommendation: run the art comparison as a real fork judged on accepted assets per week, and judge
against the 250-form number rather than World One's twenty. The question is not whether one tower can
look good; it is whether form and Level read compositionally so that tower fifty costs what tower five
cost.

### F-08 — A 9x14 board with no camera starves the mechanic the game is named for

Costly. References: ADR-0002, WORLD_ONE Mission contract, V2_ARCHITECTURE performance contract.

126 tiles, less hard terrain, Spawn, Exit, and Waypoints, leaves roughly a hundred buildable cells —
about a third of the prototype's 21x17 canvas. Maze depth scales with area, so the flagship tension in
ADR-0069, targeting 25–40 percent of Field Credits in Foundations, has little dynamic range. There is
not room for the long serpentines that make Mazing feel like authorship.

Second problem: nine columns on a 390-pixel screen is a roughly 40-pixel tile against a roughly
45-pixel fingertip, and the performance contract places about 100 creeps on that board — approximately
one creep per buildable cell. The Combat Readability Budget is well designed but is being asked to
solve a density problem created by board size.

Recommendation: keep portrait and drop "no combat camera movement." The prototype already shipped
pan-and-pinch touch handling. A 12x20 board with a fit-to-screen default and optional zoom gives the
maze room and the contextual sheet somewhere to live.

### F-09 — Airborne routing costs a great deal in teaching and pays out almost nowhere

Costly. References: ADR-0074, ADR-0023, ADR-0071, prototype `docs/TODO.md`.

Gliders share the ground Waypoint Chain, every tower blocks ground, only Air-Blocking towers block air,
Foundation blocks both, Siege blocks only ground. Since Foundation is the maze, the Airborne route is
identical to the ground route everywhere except tiles occupied by Siege.

For that narrow divergence the project pays a second blocker mask, a contextual dual-route overlay with
spaced wing markers, a reveal-comparison interaction on Refit, three ADRs, a dedicated curriculum
Mission, and a named risk. The comprehension target is 70 percent after Mission 3, for a mechanic whose
observable effect is a route bending around one tower type.

The prototype's deferred-work list records air as its worst-balanced system: immune to all crowd control
except one slow, no strategic depth, unkillable past wave 66. The lesson should push toward
simplification.

Recommendation: choose an extreme. Either Airborne ignores the maze and flies Spawn to Exit — instantly
understood, and it makes Arc's coverage role legible — or Airborne is fully mazed with no exceptions.
The half-measure is both the expensive option and the confusing one.

### F-10 — Stars measure one thing, and that thing is nearly binary

Costly. References: ADR-0042, ADR-0043, ADR-0035.

Three Stars requires zero leaks; two requires 15 of 20 Lives. In practice a build good enough to hold
leaks nothing, and a build that is not collapses well past five leaks. The middle band is thin, so the
distribution collapses to three Stars or failure, which makes twenty Lives decorative.

That produces the rage-restart loop: one leak on wave four makes the run worthless, so the correct play
is an immediate restart. This appears in funnels as high restart rates and is easily misread as
engagement.

It also makes the World Gate incoherent. A two-Star average is nearly free for a competent player and
an immovable wall for anyone else, so the Gate discriminates against exactly the population it should
not block.

Recommendation: make the third Star orthogonal rather than the extreme end of the first axis. Star one
for victory, star two for Lives, star three for a per-Mission authored condition such as a family
restriction, a Foundation budget, or a timing objective. That produces genuine replay variety from
content already authored and removes the mandatory restart.

### F-11 — The plan is two to three times over capacity and cuts the wrong axis first

Costly. References: SIX_MONTH_PLAN Phases 3 and 5, ADR-0083, V2_ARCHITECTURE persistence.

Inside six months one developer is scheduled to deliver cloud identity with platform linking, an
Economy Ledger with monotonic merge, receipt validation, entitlement restore, two-device conflict
resolution, migration fixtures from every released schema, corruption recovery, consent-aware
telemetry, crash reporting, remote configuration, and a 200–500 person closed beta, in addition to the
entire game. That is a backend team's quarter inside a solo schedule.

The scope-cut ladder then cuts Arenas from eight to six and Missions from ten to eight while leaving
live billing at position four and cloud sync at position five. Content breadth is the product; the
free-to-play platform stack is overhead for a business the project may not be in.

Recommendation: invert the ladder. Cut cloud sync, real billing, receipt validation, and remote
configuration to zero for the slice, ship local-only with robust migration and a simulated store, and
move every recovered week into Arenas, towers, and the difficulty axis.

### F-12 — The Engine Gate profiles the wrong risk and the Godot fallback is not real

Costly. References: ADR-0026, V2_ARCHITECTURE Godot fallback, BENCHMARK_BUILD_STATUS.

Week 4 asks whether Pixi can render 100 creeps at 60 FPS. It almost certainly can; the prototype did
more in a desktop browser and the emulator already reports 60.0 FPS with 0.1 ms of fixed-step work.
The two real risks are art production consistency and Capacitor WebView behavior on midrange Android
silicon — thermal throttling, touch latency, driver behavior. The benchmark log is honest that no
physical device has been touched, yet WebView sits under deferred technical decisions.

Bundling these into one Pixi-versus-Godot verdict means an art failure could trigger an engine switch
that does not fix it. The switch is also fictional: at Week 4 it means learning an engine, re-porting
the kernel out of TypeScript, and discarding the test and content-compiler infrastructure the
architecture depends on. A phantom fallback is worse than none because it licenses deferring the
decision.

Recommendation: split into three gates with separate evidence. A Device Gate on real low, mid, and
high hardware, run in Week 1 rather than Week 4. An Art Gate on accepted assets per week. A Perf Gate
on the stress fixture. Decide Godot in a three-day Week 0 spike or not at all.

### F-13 — Fully deterministic authored waves make each Mission a puzzle with one solution

Costly. References: ADR-0065, ADR-0015, second design pillar.

Deterministic composition, timing, entrances, fixed Loadouts, and a fixed Arena give the Mission a
solution. Once found, three-Starring is execution rather than strategy, and Mastery is the same
solution with less power. This is why the design leans hard on withholding information — the fog is
doing work that variance should do, and it evaporates when a wiki exists.

The cited lineage is inconsistent here. Arknights is also authored and deterministic and retains
through gacha, rotating stages, and resource farming, all of which v2 removes. The prototype already
had seeded per-run variation and a working seeded PRNG, listed in the architecture document as a
proven capability.

Recommendation: author wave intent and seed composition within authored bounds — for example, an
armored column of four to six Carapaces from entrance A or B with plus or minus 15 percent spacing.
Determinism per seed is preserved, so replays, golden tests, and future Creator Clear verification all
still work, while the Mission stops being solvable once. The content compiler is already the right seam.

### F-14 — Flat Armor plus four towers is a two-option quiz

Costly. References: ADR-0054, ADR-0051, WORLD_ONE combat rules.

Flat subtraction with a damage floor is the right readability call. But with a roster of four, the
answer to Armor is Rail, with Siege as the only alternative, one of which is locked behind an optional
Trial. At thirty-plus families this resolves itself, but World One is where players learn whether
counters feel like tools or like locks, and a two-key lock teaches the wrong lesson first.

Flat reduction is also swingy at small damage numbers. Arc does not feel situationally weak against
Carapaces; it feels broken, because small chained hits against flat Armor do nothing. Players read
that as a bug rather than a wrong tool.

Recommendation: keep flat Armor but give every family a legitimate second-order answer so no wave is a
hard gate — Gravity grouping enabling Siege value, Arc chains applying an Armor-shred stack, Foundation
Levels contributing flat pierce. Set the minimum-damage floor around 15–20 percent of base so a wrong
tool reads as inefficient rather than inert.

### F-15 — Half the Targeting Doctrines are invisible optimizers

Sharpening. References: ADR-0055, WORLD_ONE Targeting Doctrines.

Armored, Strongest, Fastest, Frontmost, and Densest are predictable. Best Line and Best Chain are
solver outputs — the player cannot predict them, therefore cannot build around them, therefore will set
them once and never revisit them, which is the failure state ADR-0055 exists to avoid.

Recommendation: prefer predictable geometric rules. If Best Line is retained, draw the line it will
choose as a selection overlay; an invisible rule becomes strategic the moment it is visualized.

### F-16 — Gravity displacement and the ordered Waypoint Chain have an unspecified collision

Sharpening. References: ADR-0070, CONTEXT Waypoint Chain, CONTEXT Gravity Tower.

Waypoints must be touched in order and Gravity draws Light creeps inward. What happens when a pull
moves a creep backward across a satisfied Waypoint, or forward past an unsatisfied one? Does chain
index reset, hold, or advance? Can a Tether drag a creep onto its next Waypoint and skip a segment?
Can a Well hold creeps where the route no longer resolves?

This is a specification hole in the tower designated as the monetization test, and displacement is
unusually hazardous in an ordered-Waypoint game because most tower defenses with pull effects have no
Waypoint semantics to violate.

Recommendation: state the rule in CONTEXT.md now — chain progress is monotonic and never decremented by
displacement, and a displaced creep re-paths from its current cell to its current required Waypoint —
then write the property test in `packages/sim` before Gravity exists.

### F-17 — The economy repeats a prototype mistake: income the player cannot plan around

Sharpening. References: ADR-0031, ADR-0048, ADR-0069, ADR-0049, prototype `docs/TODO.md`.

The prototype's deferred-work list records that its interest system was invisible to the player and
that waves passed too quickly to notice it. The v2 hybrid income has the same shape: three sources, two
small and variable, with Early Launch capped at 10 percent — small enough to be unplannable but complex
enough to require explanation.

ADR-0069's central tension depends on the player forecasting credits across several waves to choose
between route length and an upgrade. With variable income and only the next wave briefed, that forecast
is impossible, so players will spend reactively and the flagship tradeoff never surfaces.

Recommendation: show a projected-credit line in the HUD, and either drop kill rewards for predictability
or raise Early Launch to 25–30 percent so it becomes a real risk and reward lever.

### F-18 — Ninety ADRs at Week 1 pre-decides what playtesting exists to decide

Sharpening. References: `docs/adr/`, ADR-0006, ADR-0028, ADR-0034.

Three ADRs are superseded before a Mission is playable, each reversed on reasoning rather than
evidence. The durable ones will survive — repository strategy, determinism, portrait target, no random
packs. The ones committing to specific numbers are hypotheses wearing the costume of decisions, and the
format makes them expensive to revisit.

Recommendation: split the corpus. ADRs record shape decisions that would be expensive to reverse in
code. Numeric values move to a tuning table in the Content Bundle with a rationale column. The plan
already states that a balance change does not need an ADR; roughly fifteen existing ADRs violate that
rule.

### F-19 — Sixty to ninety seconds to combat is slow for this market

Sharpening. References: ADR-0075, ADR-0027, SIX_MONTH_PLAN First Session Gate.

Arrival animation, World Map, Mission Brief, Loadout, untimed Opening Plan, then wave one. Mission 1 is
six to eight minutes, so a tester's first meaningful success is roughly ten minutes in. Install to
first win is the highest-leverage number in a mobile funnel.

Recommendation: open cold on the board mid-Mission with a two-minute Mission Zero won before anything
else is introduced, and reveal the World Map as its reward. Everything in ADR-0075 can still happen
after the player has succeeded once.

### F-20 — The stated visual direction contradicted the documented one

Addressed 2026-08-23. References: ADR-0025, ADR-0091, VISUAL_DIRECTION_PLAN locked constraints.

The product owner stated a preference for a space, neon, and science-fiction direction with space-age
towers and lightly themed Worlds, and an explicit dislike of desktop-tower-defense 3D treatments. The
documents specified something else: grass, soil, metal, and rock tiles on a frontier installation,
faux-3D tiles with contact shadows, and neon restricted to gameplay signals. Round One was generated
against the terrestrial brief, and its own record criticizes candidate B for risking "generic dark
science fiction" — a note that reads differently once science fiction is the target.

ADR-0091 supersedes ADR-0025 and resolves the core of this: Player Technology now holds one coherent
science-fiction identity across every World, World One becomes the Brood World with its environment
deliberately left open, and towers are no longer reskinned per World. GAME_DESIGN and WORLD_ONE are
updated to match.

The Visual Direction track now locks only portrait readability, persistent futuristic towers, World
independence, and World One's Brood contrast. Terrain rendering, palette, materials, UI theme, camera
treatment within the board contract, and degree of stylization remain open. The procedural production
model in F-07 can therefore be evaluated against the later chosen direction instead of assumed now.

### F-21 — Visual screen design was running ahead of the systems it depicts

Addressed 2026-08-23 by ADR-0092. References: SIX_MONTH_PLAN operating rule 8, BENCHMARK_BUILD_STATUS.

The art language was never premature — ADR-0026 passes the Engine Gate only if Pixi reaches "the
required visual direction," which cannot be evaluated without a direction, and rendering technique
determines asset pipeline and renderer architecture.

The screens were. Combat is not implemented; the benchmark log correctly describes the moving shapes as
route probes. The question the Gate asks is whether a style survives motion and swarm density, which a
static image cannot answer — Round One's own record notes that all three candidates contain route or
occupancy mistakes and cannot depict legal board states. HUD and contextual-sheet design also depends on
systems still in flux, including several this review recommends cutting. Operating rule 8 then paused
representative combat until Visual Direction Gate 2, which was circular: combat is the evidence the Gate
needs.

ADR-0092 resolves this. The Engine Gate now runs on provisional Player Technology, Brood enemies,
interface wireframes, and representative effects without requiring art-direction approval; representative
combat and the Strategy Gate must establish tower roles and build diversity before production art locks;
and one complete Mission receives the visual and asset-pipeline treatment before art multiplies across
World One. Operating rule 8, the Gate summary, and the immediate next action in SIX_MONTH_PLAN now
match that order.

## Reference lineage audit

For each cited influence, what v2 took and what it left behind. The pattern is consistent: v2 borrows
each game's design surface while discarding the structural feature that made that surface viable.

| Reference | Taken | Left behind |
|---|---|---|
| Cube Defense | Ordered Waypoints, route authorship | Large tower roster and co-op |
| Defense Grid | Player-shaped Mazing | Per-level challenge modes; 20 levels yield roughly 100 configurations |
| Infinitode | Polish target, tactical tiles, quick interaction | Endless, leaderboards, procedural maps, deep research tree — its entire retention |
| Geometry Wars 3 | Energy, responsiveness, effect clarity | Its art language, replaced by faux-3D — see F-07 and F-20 |
| Defenders 2 | Collectible long-term tower aspiration | Its grind wall, correctly rejected |
| Arknights | Capability checks, mechanically distinct units | A several-hundred-unit roster and every retention system it runs on |
| The Tower | Restrained damage text, continuous feel | Idle structure, correctly rejected |
| Super Mario World | Node travel, hidden branches | Cleanly borrowed |
| Bloons and Kingdom Rush | Quality and accessibility bar | Bloons' content multiplier and cosmetic economy; Kingdom Rush's premium pricing |

The most instructive omission is Bloons TD6, the closest commercial analogue: paid up front, cosmetics
and convenience only, and a content vault multiplied by difficulties, modes, and weekly events. Three
of those four levers are deferred or ruled out.

## What survives the review

These are decisions worth defending, several better than what most funded mobile studios ship.

- CONTEXT.md with _Avoid_ terms. Rare discipline and uniquely valuable under AI-assisted production
  where terminology drift is the main source of incoherence.
- The deterministic kernel, Command pattern, and content compiler. The correct spine, visibly earned
  from the prototype's specific failures. The "what v2 must not inherit" section is the most valuable
  page in the corpus.
- Creep family contracts that do not silently change with difficulty. This directly fixes the
  prototype's air-balance failure. The eight families are the strongest single piece of the design;
  Regenerator, Sporeguard, and Carrier are all readable, teachable, and positionally interesting.
- Accessibility designed into the renderer, and the Combat Readability Budget.
- The monetization ethics. F-06 argues this is under-monetized, not wrong, and it is a marketing asset
  if stated openly.
- Evidence Gates with falsifiable thresholds, and the explicit refusal to redefine a metric after the
  fact.
- The benchmark log's honesty about emulator versus device evidence.

## Recommended next actions

Ordered by leverage. The first is a business decision and the rest follow from it.

1. Declare the business model and write the ADR. Every finding above resolves differently depending on
   the answer, and the corpus currently pays for both.
2. Delete the free-to-play platform stack from the slice — cloud sync, billing, receipts, remote
   configuration, Ceilings, rarity bands, Segments, Advancement Schematics — and reinvest in two more
   tower families in World One, the minimum at which the Strategy Gate can measure anything.
3. Narrow ADR-0036 to Dismantle only, cut live Dismantle refund to approximately 35 percent, and
   replace the fixed planning interval with untimed planning plus a manual Launch.
4. Prove the content multipliers in World One: seeded composition within authored wave bounds, plus a
   difficulty axis over every Mission.
5. Rewrite the Locked visual constraints in VISUAL_DIRECTION_PLAN to match ADR-0091, reconcile
   operating rule 8 and the Gate summary with ADR-0092, and run the art comparison on throughput
   against the 250-form number.
6. Put the debug APK on three physical Android phones this week.
7. Make the third Star an authored condition rather than zero leaks.

None of this contradicts the design's values. The pillars, the ethics, the determinism, the
accessibility commitment, and the creep design all survive intact. What changes is where the six months
go.

## Open question raised but not analyzed

ADR-0056 gives every family two Specializations. At forty families that is eighty branch endpoints, each
requiring distinct behavior, balance, and art. Bloons runs three paths across roughly twenty-five
monkeys and treats that as a full-studio content line. Whether branches are universal or reserved for a
subset is far cheaper to decide at four families than at forty.
