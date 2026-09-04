# CLAUDE.md

This repository is the standalone successor game. The frozen playable prototype lives in the
sibling `tower-defense-claude` repository and is research evidence only. Do not import runtime code,
dependencies, generated output, or deployment configuration from it. Port proven behavior only when
the successor interface is explicit and covered by tests.

## Product authority

Read these before changing product behavior or architecture:

1. [Domain Glossary](CONTEXT.md)
2. [Game Design](docs/design/GAME_DESIGN.md)
3. [World One](docs/design/WORLD_ONE.md)
4. [Architecture](docs/architecture/V2_ARCHITECTURE.md)
5. [Six-Month Plan](docs/roadmap/SIX_MONTH_PLAN.md)
6. [Core Combat Gate Status](docs/roadmap/BENCHMARK_BUILD_STATUS.md)

ADRs in `docs/adr/` are historical decision records, not product authority. Before relying on one,
check its status and the current design, architecture, and roadmap documents. An ADR without an
explicit accepted status does not override a current authority. Record balance and usability
assumptions in the playtest hypothesis register rather than promoting them to ADRs.

[docs/design/ADVERSARIAL_REVIEW.md](docs/design/ADVERSARIAL_REVIEW.md) is an external red-team of the
above. Consult it when a design decision is revisited or a Gate is defined. It is challenge material,
not product authority; its findings influence the current authorities only through deliberate review.

## Commands

Run JavaScript commands from the repository root:

```bash
npm test
npm run typecheck
npm run build
npm run dev
npm run cap:sync:android
```

Run Android verification from `android/` with JDK 21 and Android API 36 available:

```bash
./gradlew assembleDebug
./gradlew testDebugUnitTest lintDebug
```

## Architectural constraints

- `packages/sim` is deterministic Mission authority and imports no presentation, UI, browser,
  native, remote-platform, or prototype code.
- `packages/content` compiles authored data and contains no executable gameplay callbacks.
- The app orchestrator sends Commands and distributes immutable snapshots and presentation events.
- Pixi presentation and Preact UI do not mutate simulation state or recreate combat formulas.
- Authoritative simulation advances at a fixed 30 Hz; rendering cadence never changes outcomes.
- Android is the product reference. Browser runs are previews and fast development evidence.
- Generated output stays ignored and outside source navigation.
