# Astra Neon V2: Weapon Readability Pass

Updated: 2026-09-18. Follow-up to the approved V1 visual critique, not final art approval.

The active Neon entry now includes the [V3 board-first layout and color pass](ASTRA_NEON_V3.md).
This document retains the V2 record and comparison APK.

## Scope

Keep the dark, minimal HUD and direct Foundation/radial construction model. Improve the same
playable Neon encounter before adding worlds, towers, progression systems, or decorative panels.
The original benchmark and earlier concept assets are unchanged by this pass.

## Changes

- Rail: long twin rails, illuminated inner channels, angular rear chassis, and separate barrel
  recoil. The muzzle flash follows the recoiling barrel instead of floating ahead of it.
- Siege: broad stabilizers and a recessed launcher replace the circular badge. Shell flight now
  follows simulation impact ticks at every speed; the impact gets a brief core, shock ring, and sparks.
- Arc: three angular emitters replace the node-and-spoke diagram. Brighter bolts still follow the
  actual chain targets rather than decorative connections.
- Creeps: filled geometric bodies, bright cores, and larger same-shape death fragments. Reduced
  motion uses fewer fragments with a complete short fade, and omits impact flashes and sparks.
- Arena: uniform subtle grid, shadowed obstacle blocks, directional endpoint markers, and quieter
  waypoint brackets. Opening construction rings no longer obscure every tower silhouette.
- HUD: shorter identity row, no debug coordinate row, compact numeric hierarchy, and a dark cyan
  launch control. Camera controls occupy their own strip so they cannot cover the bottom cells.

No balance values or shared simulation rules changed in this pass. The family icons were updated
alongside the arena art. The three equipped specialists remain Rail, Siege, and Arc.

## Verification

- Full suite: 15 Node tests and 173 Vitest tests passed. Typecheck passed.
- New tests cover independent barrel geometry and static chassis, finite/distinct silhouettes,
  tick-based shell progress, and normal/reduced particle lifetimes. The radial mount test also
  checks its new vertical alignment.
- Browser layouts: 360x740, 390x844, 412x839, and 1440x900 fit without page overflow. Camera
  controls sit below the canvas. Real pointer and emulated-touch hold/drag/dwell/release flows
  preview and purchase correctly, with no duplicate charge.
- Nonblank canvas checks passed in opening, live combat, 3x speed, and reduced motion. Two
  combat samples differed; two paused samples had identical pixel hashes. No browser console errors.
- Android unit-test/lint/assembly pipeline passed and the APK installed on emulator-5554.
- Native smoke: matching installed APK hash, `/neon.html` startup, no overflow at 412x839,
  11,762 bright canvas pixels, live Rail firing, and full-screen ADB captures verified.
  The old host-GPU emulator had a System UI ANR and stalled during reboot. Cold-starting the same
  AVD with `-gpu software -no-snapshot` recovered it without wiping data or changing game code.

Local comparison evidence (ignored build/test artifacts):

- `test-results/neon-v2-opening.png` and `neon-v2-combat.png`
- `test-results/neon-v2-combat-next.png` and `neon-v2-radial.png`
- `test-results/neon-v2-combat.webm` (browser capture, includes normal/fast/reduced-motion combat)
- `test-results/neon-v2-{360,390,412,1440}.png`
- `test-results/neon-v2-apk-smoke.json`, `neon-v2-apk-opening.png`, and `neon-v2-apk-combat.png`

APK: `artifacts/builds/maze-defense-debug-7e7f436bea80.apk`.
SHA-256: `7e7f436bea8085a3b2adcc7297ad8b62e1133efb64683be579d2fd08c61c8f44`.

## Compare

Run the existing Vite development command and open `/neon.html`. `/index.html` remains the original
benchmark. The previous V1 APK and screenshots remain available for comparison; V2 replaces only
the active Neon source entry. See [V1 notes](ASTRA_NEON_V1.md) for the interaction contract.

This is a readability and combat-feedback improvement, not a claim of reference-game-level finish.
Audio, physical-phone feel, sustained GPU performance, and a final authored visual identity remain
outside this pass. Do not treat emulator smoke checks as device performance certification.
