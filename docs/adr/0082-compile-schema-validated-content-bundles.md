# Compile schema-validated content bundles

V2 will move Arenas, Missions, waves, rewards, tower and creep definitions, and progression tables out of hardcoded runtime TypeScript into versioned human- and AI-editable data definitions. A build step validates references and constraints, then compiles immutable Content Bundles.

Content selects tested behavioral mechanics through stable identifiers and cannot inject arbitrary scripts. Headless simulations and structural validators must exercise every authored Mission before release. This permits rapid balance iteration without turning the simulation into an untyped scripting host.
