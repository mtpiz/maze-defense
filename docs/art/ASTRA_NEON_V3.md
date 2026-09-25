# Astra Neon V3: Board First

Updated: 2026-09-19. Implements the approved Fable-reference feedback on space and neon intensity.

## Direction

The board is the primary interface. The HUD is minimal information and controls, not a separate
dashboard. Future teleporters, walls, lava, traps, and terrain belong on that board; they are not
implemented by this pass. Keep direct Foundation placement and hold/drag radial specialization.
Do not copy the reference's permanent tower-selection cards or its tower silhouettes.

## Layout

- One 52px status row: lives, wave, credits, speed, pause, settings. No branding row.
- One stable 56px bottom strip plus a 2px progress line. A selected tower or upgrade preview
  replaces wave information in that same space; it never resizes the arena. Launch remains available.
- Fit stays in the bottom strip; zoom buttons move into Settings. Pinch, drag, and wheel controls
  remain available. No camera toolbar or inspector covers buildable cells.
- Smaller screen and board gutters. At 390x844, HUD space falls from 270px to 110px, leaving 87%
  for the arena viewport. The fully fitted 9x14 board grows from 330x513px to 374x582px: 28% more area.
- Square cells and the complete map remain visible at Fit. The viewport can still have vertical
  space around this fixed-aspect map; it is not a claim that 87% of the screen contains grid cells.

## Color Identity

`neon-palette.ts` is the shared source for tower accents, UI tower identities, and projectiles:

| Tower | Color |
| --- | --- |
| Foundation | Muted blue-grey `#6f8f92` |
| Rail | Blue-cyan `#48cfff` |
| Siege | Yellow `#ffce39` |
| Arc | Violet `#ed66ff` |
| Gravity (reserved) | Mint `#77f0c7` |

Emitter and projectile cores use a 25% white tint of the same hue, never an unrelated white beam.
Muzzle flashes, shell markers, trails, impact rings, and sparks retain their source color. Delayed
impacts retain the firing tower's family even when that tower has been removed. Enemy death fragments
still use the enemy's own color and shape, not the attacking tower's color.

Specialist towers have layered emissive outlines while Foundations stay visually subordinate. A yellow route,
magenta entrance, cyan exit, and clearer grid keep the near-black board legible between attacks.
No balance values, shared simulation rules, or original benchmark files changed in this pass.

## Verified

- 15 Node tests and 182 Vitest tests passed; typecheck passed.
- Renderer tests check every projectile-effect color against its family's palette and tinted core,
  including delayed Siege impacts after tower removal. Recoil geometry tests remain intact.
- No page overflow at 320x740, 360x740, 390x844, 412x839, 1440x900, and landscape 844x390.
- Real pointer and emulated-touch radial preview/release purchases work with correct deductions.
  Keyboard radial navigation, focus restoration, camera controls, and launch while selected work.
- Canvas pixels are nonblank in opening, combat, 3x speed, and reduced motion. Combat samples change;
  paused samples are identical. Selecting and previewing leave arena bounds unchanged.
- Android unit tests, lint, assembly, and installation passed. Native smoke verified the installed
  APK hash, `/neon.html` startup, no overflow at 412x839, 30,163 bright canvas pixels, full-screen
  ADB captures, and live Rail firing on the software-rendered test emulator.

Browser evidence: `test-results/neon-v3-opening.png`, `neon-v3-combat.png`,
`neon-v3-radial.png`, `neon-v3-selected.png`, and viewport-specific `neon-v3-*.png`.
Native evidence: `test-results/neon-v3-apk-smoke.json`, `neon-v3-apk-opening.png`, and
`neon-v3-apk-combat.png`.

APK: `artifacts/builds/maze-defense-debug-f5f85814693b.apk`.
SHA-256: `f5f85814693bc9e1808b67f6dfa6aac748e83f225dd29cd9e59a68d1e7266b34`.

The active preview remains `/neon.html`; `/index.html` remains the original benchmark. Earlier
[V2 notes and APK](ASTRA_NEON_V2.md) are retained for comparison. Physical-phone readability and
sustained performance still require a real-device pass.

## Directional Identity Follow-Up

Updated: 2026-09-20. Specialist towers now trade universal 360-degree coverage for distinct,
player-aimed fields of fire:

| Tower | Primary range | Coverage | Secondary reach |
| --- | ---: | ---: | --- |
| Rail | 0-2.5 cells | 90-degree sector | Single-target precision; penetration reserved for upgrades |
| Siege | 1.25-3.5 cells | 90-degree sector | 1.2-cell Ground blast |
| Arc | 0-2.25 cells | 180-degree sector | Three targets with 1.25-cell jumps |

Foundation remains a 1.3-cell full circle. Installing a specialist initially faces the nearest
eligible route cell. Grabbing the highlighted outer edge of a selected specialist's range previews
and commits its mounted direction during opening, planning, or an active wave. Selected coverage is
drawn directly on the board in the tower's family color. Siege uses an annular sector so its dead zone
is visible. Turrets briefly track targets while firing, then return to their mounted direction.

The level-one Rail shot is also deliberately restrained: a round-ended tracer no longer than 0.28
cell, with thin source-color/core strokes, a small muzzle dot, and a small impact dot. It now fires a
single-target 52-damage slug at the existing 75-tick cadence. Penetration, brighter fire, and larger
effects remain reserved for later upgrade models.

The legacy staged layouts initially lost after directional acquisition was enabled. Re-aiming the
same towers toward the route restored the mixed and Rail-only six-wave clears under the earlier
penetrating Rail configuration. That result is retained as historical evidence and is superseded by
the current level-one role tuning below.

Verification for this follow-up:

- 15 Node tests and 202 Vitest tests passed; strict TypeScript and the production web build passed.
- Browser inspection at 390x844 confirmed Rail, Siege, and Arc sectors, live drag preview/commit,
  no page overflow, and no console errors.
- Android unit tests, lint, assembly, install, and launch passed on `emulator-5554`.
- Native smoke at 412x839 verified the installed hash, no overflow, 30,166 bright canvas pixels,
  live combat, one Rail shot, and a full-resolution native Rail-sector selection capture.

Browser evidence: `test-results/neon-directional-rail-selected.png`,
`neon-directional-rail-aim-preview.png`, `neon-directional-rail-aimed.png`,
`neon-directional-siege-selected.png`, and `neon-directional-arc-selected.png`.
Native evidence: `test-results/neon-directional-apk-smoke.json`,
`neon-directional-apk-opening.png`, `neon-directional-apk-combat.png`, and
`neon-directional-native-selected.png`.

APK: `artifacts/builds/maze-defense-debug-c39da7b79c0c.apk`.
SHA-256: `c39da7b79c0c778036a57b05c3eb1f302d7ada2ca7201a44d0f6377387af6da6`.

## Geometry Wars Horde Follow-Up

Updated: 2026-09-20. The three supplied Geometry Wars 3 references establish the creep direction:
many crisp geometric bodies should form a living, fast-moving horde rather than collapsing into one
centerline or an undifferentiated glow cloud. This is visual-language inspiration, not a direct copy.

- Creeps use bright family-colored outlines, dark translucent centers, restrained halos, and small
  luminous cores. Their silhouette remains readable when several overlap.
- Deterministic identity-based offsets give each creep a stable lane bias, longitudinal drift, scale
  pulse, and rotation. Broodlings move most freely; armored Carapaces remain comparatively disciplined.
- Headings ease through corners instead of snapping through 90 degrees. Short low-alpha motion tails
  strengthen speed without hiding the board or overpowering level-one projectiles.
- Deaths continue to fracture into smaller pieces of the defeated creep's own shape and color.
- Tower art is 80% of its earlier footprint, the grid perimeter carries a fine cyan edge, and all
  three radial upgrade choices now expand on the same timing.

These offsets are presentation-only. Route position, targeting, damage, timing, and deterministic
simulation state remain unchanged. The balance regression still requires a mixed Rail/Siege defense
to clear while Rail-only and Siege-only layouts fail, preserving Siege's role against thick swarms.

Verification for this follow-up:

- 19 Node script tests and 219 Vitest tests passed; strict TypeScript, the production web build,
  Android unit checks, lint, and debug assembly passed.
- A 412x839 browser pass reached 27 simultaneous outlined creeps with changing frames, zero page
  overflow, and no console errors. Evidence: `test-results/neon-geometry-wars-horde-live.png`.
- Staged APK: `artifacts/builds/maze-defense-debug-71684062bec1.apk`.
  SHA-256: `71684062bec190034926a15dc8adf6a30caffefef3b3dc25389ea861ceb5962a`.
- This APK is not yet physical-device evidence. The paired S25+ stopped accepting its previously
  advertised wireless ADB endpoint before installation, so touch, feel, and sustained performance
  remain unverified for this follow-up.

## Ground Queue Follow-Up (Superseded by 2D Crowd)

Updated: 2026-09-20. Ground creeps now have deterministic personal space derived from mass. Scheduled
Ground spawns enter in FIFO order only when the entrance has room, and faster followers cap their
movement behind the unit ahead rather than overtaking it. Airborne spawns bypass the Ground queue and
continue moving independently. Ground presentation retains lateral drift, rotation, and scale pulse,
but no longer adds longitudinal wobble that could visually move one unit through another.

This changes combat density as well as presentation. Gate Broodlings now have 28 health and the Gate
Siege blast deals 30 damage, so dense packs reward Siege area coverage while Rail-only, Siege-only,
and an undeveloped opening all fail the deterministic role regression. Two distinct mixed Rail/Siege
placements still clear. These are feasibility values for playtesting, not final balance.

Verification: simulation version 10; 19 Node tests and 221 Vitest tests passed with strict TypeScript,
the production web build, Android unit checks, lint, and debug assembly. A 412x839 browser pass showed
17 active creeps in an ordered mixed Ground column with zero overflow and no console errors. Evidence:
`test-results/neon-ground-queue-mixed.png`.

Staged APK: `artifacts/builds/maze-defense-debug-944fcaad0383.apk`.
SHA-256: `944fcaad0383b1c85a549e586a71fe359df5a9ec3e0e7fa40dda10829487dca6`.
The same artifact installed and launched successfully on the authorized Samsung S25+ over wireless ADB.
This confirms deployment only; the collision feel still needs the owner's physical playtest.

## Level-One Rail Role Follow-Up

Updated: 2026-09-20. Level-one Rail no longer penetrates. Its line mechanic remains available to
future upgrades, but the Gate configuration stops after the first target (`maxTargets: 1`). To retain
a distinct precision role without borrowing upgrade spectacle, the compact rounded tracer is
unchanged while its single hit deals 52 damage at the existing 75-tick cadence.

Two distinct mixed Rail/Siege layouts still clear the deterministic Gate regression. Rail-only,
Siege-only, and the undeveloped opening fail, preserving a reason to combine precision and blast
coverage. These are feasibility values for the next physical playtest, not final balance.

Verification: 19 Node tests and 221 Vitest tests passed with strict TypeScript, the production web
build, Android unit checks, lint, debug assembly, installation, and launch. The installed artifact is
`artifacts/builds/maze-defense-debug-e40fd8721a37.apk`, SHA-256
`e40fd8721a37592a5448cb071461d691733275b876b2f60f5d0ee9efe07465f9`.

## Ground Crowd and Smooth Contact

Updated: 2026-09-21. The FIFO queue above is historical. Ground units now move within route-cell
boundaries, spawn in authored bursts, push according to mass times push resistance, and go around
one another without body intersection. Runners seek passing gaps; heavy Carapaces hold the middle.

The owner rejected twitching and oversized invisible spacing. Red art stays small at .07-cell radius,
with an .08-cell physical radius. Runner art is now .105 rather than .09; armored art is .25 rather
than .13, with corresponding physical radii .115 and .26. Tight circular contact replaces the extra
separation margin. Ground bodies no longer scale-pulse. Halo/shadow pixels are decorative, not solid.

Stable passing-side selection, gradual avoidance strength, partial steps to walls, and waiting when
blocked reduce oscillation. The renderer interpolates authoritative positions between fixed ticks,
including multi-tick frames at faster speeds; headings continue easing between updates. Pause and
resume discard stale interpolation endpoints. Ground ambient rotation is slower and subtler.

Verification: simulation version 12; 19 Node and 235 Vitest tests passed, with a final 11-test renderer
pass for the pause/resume refinement. TypeScript, web production build, Android unit checks, lint,
and assembly passed. Browser evidence: `test-results/crowd-live-412.png`, `crowd-live-1440.png`, and
`crowd-browser-smoke.json`. Each viewport showed 37 active enemies, changing frames, visible neon
pixels, no overflow, and no browser exceptions. The live S25+ smoke was read-only after discovering
an ongoing wave; `test-results/crowd-phone-live.png` and `crowd-phone-smoke.json` capture that build
and session. Device performance and final movement feel remain separate owner-playtest judgments.

Final installed APK: `artifacts/builds/maze-defense-debug-105dc2681e62.apk`, SHA-256
`105dc2681e62c9aec65bc7d289edf9f947911346849005fd1d33c0eeb918e6ca`. Install and launch succeeded
on the paired S25+. The read-only live capture used the preceding `d26a7888c21e` build; the final
renderer-only refinement clears interpolation endpoints on pause/resume and is covered by its test.

## Crowd Liveness Follow-Up

Updated: 2026-09-24. Owner direction: creeps must never form a traffic jam. Strict no-intersection
contact could deadlock permanently: two Carapaces (0.52-cell bodies) cannot pass head-on in a one-cell
corridor, and mazes routinely send the route back through the same cells (for example through
waypoint 02). An undefended Foundation-only probe jammed in 20 of 20 random Neon mazes, 12 of them
permanently.

Owner clarification: overlap is acceptable when it prevents a jam; enemies must not pile up on top of
one another. The rules are therefore:

- Oncoming bodies in a true two-way corridor (the route re-enters those cells in the opposite
  direction) no longer block each other. They still steer to their own side, so light units mostly
  pass cleanly; heavy pairs visibly squeeze past. The hard "stay out of the oncoming half-lane" rule
  was removed because it forced swarms into single file.
- Same-direction bodies and opposite-facing neighbours in separate lanes (tight U-bends) keep hard
  contact. A pair that already overlaps may move apart or sideways but never deeper.
- Anti-stacking: every tick, overlapping bodies are eased apart by up to 0.07 cell, the lighter body
  yielding more and walls bounding every correction. A body that is unsticking is never pushed back;
  the other body steps aside across the lane, or along it where the lane is too narrow.
- Liveness guarantee: a Ground body with under 0.1 cell of route progress for 30 ticks unsticks unless
  it is queued behind a body that is still moving or already unsticking (hard cap 90 ticks). An
  unsticking body ignores other bodies, and as a last resort steps along the route centre line, until
  it is 1.5 cells further along and clear. Stall state is part of the creep state and checkpoints.

Simulation version 13. A 120-run probe (Neon and Gate, random mazes, mid-wave rebuilds, no damage)
cleared every wave; 5.8% of Ground creeps ever unstuck, p99 pause 8 ticks, worst single pause 6.0 s.
Bodies overlapped in 2.9% of body-ticks and were more than half on top of another in 0.07%; the
largest pile was 4 bodies and the longest-stacked pair separated within 3.0 s (before anti-stacking:
1.8% stacked, piles of 8, a pair stacked for 22 s).
Regression tests cover head-on heavies in a one-cell two-way corridor and four random Neon mazes;
both fail on the previous simulation.

## Rail Level 1 and 2 Art

Updated: 2026-09-25. Owner selection from the Rail workbench exploration: the Level 1 Rail starts
small and plain so later Levels have room to grow.

- Level 1: a single barrel on a small turret cap, over a hexagonal pedestal. The pedestal stays still
  while the turret turns. It is a translucent blue (`#1a5f80` at 55% opacity) with six bevel facets
  lit from the top left, plus its own ground shadow in place of the shared drop shadow.
- Level 2 keeps the Level 1 silhouette. It adds thin neon seams on the six joins between pedestal
  facets, and two thin guide rails beside the barrel.
- The earlier twin-barrel Rail is kept as `'rapid-fire'` art, a candidate for a Level 3 rapid-fire
  Specialization. Simulation towers have no Levels yet, so every placed Rail draws Level 1.
- Rail fire now starts at the drawn muzzle. The old tracer origin ignored the 0.8 art scale and began
  about 0.1 cell ahead of the barrel tip.
- The Rail radial and console icon matches the Level 1 art.

Presentation only: no simulation, balance, or timing values changed.
