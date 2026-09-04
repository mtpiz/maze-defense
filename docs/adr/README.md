# Architecture Decision Record index

ADRs in this directory preserve the reasoning available when a choice was made. They are historical
records, not current product authority. Read the glossary, game design, World brief, architecture,
roadmap, Gate status, and hypothesis register first.

## Status rules

- Explicit `status: accepted` means the historical decision still applies only where current
  authorities do not supersede it.
- Explicit `status: superseded by ADR-NNNN` points to a later historical decision.
- Explicit `status: deprecated` means the decision is not part of the current product.
- No status means historical or unclassified; it must never be treated as a requirement by itself.
- Numerical values and test expectations belong in the playtest hypothesis register even when an old
  ADR recorded them.

## Certified-baseline reconciliation

The 2026-09-03 certified baseline materially supersedes or parks these records:

| ADRs | Current disposition |
|---|---|
| 0005, 0034, 0038–0041, 0044, 0046 | Monetization, Prisms, purchasable progression, rarity commerce, and store bundles are deferred. |
| 0011, 0060 | Base Blueprints come from Technology Trials; Advancement Schematics are removed. Current Level rules live in `GAME_DESIGN.md`. |
| 0016 | Exact Blueprint Ceiling milestones are hypotheses rather than durable decisions. |
| 0018 | The concept survives as named deterministic Schematic Fragments, normally three and never more than five. |
| 0023 | Player towers no longer block Airborne movement. Ground and Airborne retain shared Waypoints and authorable traversal masks. |
| 0024 | The six-month target remains one polished World but now includes thin proxy paths through Worlds Two and Three and excludes commerce/cloud proof. |
| 0026, 0085, 0089 | The engine-only benchmark is replaced by the four-track Core Combat Gate. |
| 0036 | Legal Foundation placement is now allowed during active waves; destructive route-changing actions remain between waves. |
| 0045 | Research remains scarce, but the old four-specialist World One allocation is obsolete. |
| 0063 | World One now owns Foundation, Rail, and Siege; Arc and Gravity enter through later proxy Worlds. Individual mechanic ideas remain candidates. |
| 0066 | A fixed ten-Mission/eight-family curriculum is replaced by a purpose-sized World. |
| 0074 | Siege is a required World One Technology Trial; Gravity is no longer a World One hidden purchase candidate. |
| 0075 | First launch now cold-opens directly into Mission One and targets first combat in roughly 15–30 seconds. |
| 0083 | Versioned local recovery remains; cloud identity, ledgers, receipts, and entitlements are deferred. |
| 0086–0087 | Testing uses the available friend group and concrete counts; large-cohort percentages are not current commitments. |
| 0088 | The certified roadmap owns the new cut order. |
| 0091 | Persistent futuristic Player Technology survives; restrained regional influence and a normal one-core-Blueprint-per-World cadence are now accepted. |
| 0092 | Presentation feasibility before production art survives; broad exploration begins after Gate 1 and production style locks after Strategy. |

All other ADRs remain useful context only. If a future change is hard to reverse, surprising, and the
result of a genuine tradeoff, add a focused ADR with an explicit status. Do not create ADRs merely to
freeze balance or content tuning.
