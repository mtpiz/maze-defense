# Ground Crowd Movement

Approved by the owner: ground enemies occupy a two-dimensional corridor, form clumps, pass around
one another, and respect body and cell boundaries. Replace the version-10 single-file queue.

- Simulation owns positions and collision radii; renderers and weapons consume the same positions.
- Keep existing mass; add an authored movement profile with radius, push resistance, and pattern.
  Effective displacement weight is mass times push resistance. Swarm units yield, runners seek gaps,
  and heavy units seek the center and resist displacement. Air remains independent.
- Red swarm bodies and all other enemy art are about half their previous size. Collision envelopes
  permit four small bodies abreast in a cell, with room for their outlines.
- Spawn authored bursts across the entrance, admitting only bodies that physically fit. Pending
  arrivals remain counted and checkpointed. Do not serialize all Ground arrivals behind one body.
- Use SAT.js for circle contacts. Movement uses bounded steps, wall checks, and transactional local
  pushes: an unsuccessful displacement leaves all affected bodies where they were.
- Route progress still tracks ordered waypoints. Position is authoritative for targeting, rendering,
  and placement occupancy. Live rerouting preserves each in-flight segment and actual position.
- Verify bursts, overtaking, displacement weight, dense turns, no body intersection, wall clearance,
  deterministic replay, live rerouting, targeting, and the shared simulation suite. Inspect live combat
  in the browser before packaging and attempting the paired phone install.

Implementation sequence: author profile and crowd regressions; build collision/steering helper;
integrate simulation and spawn bursts; consume actual positions and smaller art; verify and deploy.

## Smooth Contact Follow-Up

Owner feedback supersedes the initial all-family size reduction. Keep red silhouettes small, make
runners slightly larger, and make slow armored bodies roughly twice the initial crowd-pass size.
Current collision radii: Broodling 80, Drone 115, Carapace 260 milli-cells. Ground art radius is the
authored collision radius minus 10 milli-cells for the outline. No animated Ground size pulse.

Use stable passing sides and continuous approach strength, move up to the wall instead of rejecting
a whole step, and wait when no passing gap exists. Keep escape/yield behavior for reversing routes.
Body contact is allowed; ground intersection is not. Weight remains mass times push resistance.

Render between authoritative snapshots with one tick of latency, including multi-tick 2x/3x frames.
Heading easing continues on every rendered frame; pause/resume clears stale interpolation endpoints.
The deterministic rules are simulation version 12. Position interpolation changes no targeting,
damage, admission, or physical occupancy rules.
