# Astra Neon V1 Comparison

Updated: 2026-09-12. Playable visual/interaction comparison, not production art approval.

The active Neon entry now includes the [V2 weapon-readability pass](ASTRA_NEON_V2.md).
This document retains the V1 record and original comparison APK.

## Open

- Neon V1: `http://127.0.0.1:5174/neon.html` while the local server is running.
- Original benchmark: `http://127.0.0.1:5174/index.html`.
- Start another server with `npm run dev -- --host 127.0.0.1 --port 5174` from the repository root
  if needed. The production build exports both entry pages.

The original renderer, styles, benchmark UI, and earlier concept files remain intact. This version
has its own [entry page](../../apps/game/neon.html) and [source directory](../../apps/game/src/neon).
Shared changes are limited to mission injection in the controller, the optional Arc chain mechanic,
the Lucide icon dependency, and Vite's second entry. Default benchmark content is unchanged.

## Visual Direction

A near-black 2D field, quiet cell grid and fixed compact HUD. Depth comes from short shadows,
outlined layers and small emissive cores. Cyan Rails have two independently recoiling barrels;
amber Siege has delayed impact rings; violet Arc links actual chain targets. Creep shapes break
into smaller copies of their own primitive. No generated images, 3D engine, or Claude assets are used.

The comparison begins with a small editable starter formation so tower identities are immediately
visible. Launch starts real deterministic combat. Settings offers a clean opening or restored starter
formation, reduced motion, and a link to the original benchmark. This is a separate encounter with
provisional Arc values and opening budget, not a Campaign unlock or balance change.

## Building

See [ADR 0093](../adr/0093-direct-foundation-radial-specialization.md).

- Tap a legal empty cell to build Foundation; tap an existing tower to inspect it.
- Hold for 320 ms to open Rail, Siege and Arc around the selected Foundation. Holding an empty
  legal cell places Foundation first. Drag onto a choice and release to specialize.
- Dwelling on a choice for 350 ms shows its silhouette, range and statistics. Previewing is free;
  release revalidates the current cost and Mission state before spending.
- Release at the center or outside the choices to cancel. An already built Foundation stays.
- Drag before the hold threshold to pan; pinch or use the camera controls to zoom and recenter.
- Keyboard: focus the arena, arrows choose a cell, Enter builds/selects, Shift+F10 opens upgrades,
  arrows navigate options, Enter chooses, Escape cancels. The inspector also has an upgrade button.

## Verification and Boundaries

Focused tests cover tap/hold/pan/cancel, disabled purchases, dwell preview, single-charge release,
alternating recoil, coordinate alignment, Arc targeting, default benchmark isolation and retry.
Browser checks cover portrait and desktop layout, real pointer/touch input, keyboard radial control,
nonblank canvas pixels and moving combat effects. Screenshots are in local `test-results/neon-*.png`.

Android debug APK built after this pass: `artifacts/builds/maze-defense-debug-12446d51c00a.apk`.
The package opens `/neon.html`; the original benchmark remains accessible from Settings.
Tests, typecheck, Android unit tests/lint and assembly passed. Emulator startup, screen fit,
installed APK identity and live firing were checked; evidence is in `test-results/neon-apk-smoke.json`.
Physical-phone feel and GPU performance still need a device pass.
This comparison has in-memory opening retries, not durable mid-wave recovery. Only Rail, Siege and
Arc are equipped here; Gravity and full progression remain outside this visual comparison.
