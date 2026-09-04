---
status: superseded by ADR-0090
---

# Build v2 as deep modules beside the prototype

The successor will live beside the frozen live prototype in the same repository but will have no runtime dependency on it. Proven algorithms and behaviors may be ported under characterization tests; prototype modules are not imported wholesale.

V2 will separate a deterministic simulation kernel, validated content, Pixi presentation, Preact interface, and platform services for storage, identity, analytics, purchases, advertisements, and native capabilities. State crosses these seams through explicit commands, snapshots, presentation events, and narrow service interfaces. This deep-module structure supersedes the prototype's shared mutable world and presentation assumptions without discarding the research value of its tests.
