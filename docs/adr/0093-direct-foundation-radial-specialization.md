---
status: accepted
date: 2026-09-12
---

# Build Foundations directly with radial specialization

The first implementation of direct Foundation and radial specialization building will be an
isolated neon V1 comparison. It will not change the existing benchmark build or its art. A valid
empty-cell tap places one Foundation directly, without opening a build tray. Holding an existing
Foundation for 320 ms opens a radial menu containing the three specialists loaded for the current
Mission. Holding an empty valid cell places the Foundation when the hold threshold is reached and
then opens the same radial menu. The menu is clamped to the viewport and uses a connector to the
actual cell.

While the radial menu is open, dragging to a specialist slot focuses it; dwelling on a slot for
350 ms shows an informational tower preview and stats, but the preview is not a confirmation
requirement. Releasing on an enabled slot dispatches specialization exactly once. Release in the
center or outside the menu, Escape, pointer cancellation, window blur, or a second touch cancels
specialization. A Foundation placed at the hold threshold remains placed when specialization is
canceled; there is no surprise refund. A pointer that moves more than 10 px before the hold
threshold is treated as camera panning and does not build. V1 has no drag painting, and pinch input
cancels the menu.

At release, the implementation revalidates current Field Credit affordability and placement or
specialization legality. Disabled slots cannot spend. The Loadout remains Foundation plus up to
three selected specialist Blueprints; missing or locked slots are disabled rather than fabricated.
Existing specialists are inspected in place and are not refit automatically.

Keyboard construction follows the same interaction model: grid focus plus Enter places or selects,
the context-menu key or Shift+F10 opens the radial menu, arrow keys move focus, Enter selects, and
Escape dismisses. Ordinary buttons remain usable by touch tap after opening as an accessible
alternate to the gesture path.

This decision changes the construction interaction from a HUD tray to board-first gestures; it does
not change the gameplay architecture. Existing Field Credit, path, and phase-legality rules remain
authoritative. The 320 ms hold, 10 px movement threshold, and 350 ms dwell are tunable interaction
parameters, not balance decisions.
