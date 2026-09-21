# Directional Tower Coverage Design

## Goal

Make placement direction part of each specialist tower's identity while keeping aiming readable on the board and deterministic in the simulation.

## Playtest Matrix

| Tower | Minimum range | Maximum range | Coverage arc | Existing secondary mechanic |
| --- | ---: | ---: | ---: | --- |
| Foundation | 0 cells | 1.3 cells | 360 degrees | Direct fire |
| Rail | 0 cells | 5.25 cells | 30 degrees | Two-target line penetration |
| Siege | 1.25 cells | 3.5 cells | 90 degrees | 1.2-cell blast, Ground only |
| Arc | 0 cells | 2.25 cells | 180 degrees | Three-target chain, 1.25-cell jumps |

Damage, cooldown, armor piercing, cost, and construction delay remain unchanged for the first geometry playtest. Balance changes require evidence from the deterministic Gate scenarios.

## Simulation Contract

Weapon definitions carry `minimumRangeMilliCells` and `coverageArcMilliDegrees`. Tower state carries `facingMilliDegrees`, where `0` points east, `90_000` points south, and values are normalized to `0..359_999`. Integer angles keep checkpoints, command logs, and hashes stable.

Primary target acquisition requires all three checks: supported movement layer, radial distance between minimum and maximum range, and angular distance from mounted facing within half the authored coverage arc. Secondary Rail penetration, Siege blast, and Arc chain rules remain unchanged after a valid primary target is acquired.

Foundation uses a full circle and ignores facing. Installing a specialist automatically aims it toward the nearest cell on a route that its weapon can target. Ties follow stable route order.

An `aim-tower` command changes a specialist's mounted facing during opening or planning. It is rejected during an active wave and for missing or Foundation towers. Aim commands are part of deterministic command history and checkpoint tower snapshots.

## Interaction

Selecting a specialist shows its true coverage sector directly on the board. Siege also shows its inner dead zone. The overlay uses the tower's family color at restrained opacity and does not add HUD controls.

During opening or planning, dragging outward from a selected specialist rotates the mounted sector. The preview follows the pointer; release commits the quantized angle. Short taps continue to select towers and empty cells continue to place Foundations. Facing is locked during waves.

The turret assembly may track a target within its mounted sector for firing animation, but its base and coverage overlay preserve the mounted direction. When idle, the turret points along the mounted facing.

## Verification

- Unit tests cover angle normalization, wraparound at north, minimum range, sector boundaries, and full-circle Foundation behavior.
- Mission tests prove primary acquisition obeys facing and that aiming is rejected during waves.
- Controller tests prove selected-tower aiming dispatch and feedback.
- Renderer tests prove the selected overlay is a sector rather than a full circle and includes Siege's dead zone.
- Existing deterministic replay, Gate balance, full test suite, typecheck, production build, browser screenshots, and Android smoke are rerun.
