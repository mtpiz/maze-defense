# Maze Defense Agent Guidance

## Lean iteration workflow

- Use Astra for product decisions, visual design, architecture, work decomposition, independent
  acceptance validation, and integration. Delegate bounded implementation through the approved task packets.
- Do not spawn an agent merely to run deterministic shell commands such as tests, typechecks, builds, Gradle, APK packaging, or installation.
- Batch related polish changes into one implementation pass to avoid repeatedly re-reading the same project context.
- During routine visual or interaction iterations, run only checks relevant to the changed behavior, plus typecheck, the web build, and one focused browser interaction check.
- Do not repeat the full test suite, Android emulator boot, broad code review, or multiple screenshot passes after every small visual adjustment.
- At a roadmap gate, before opening a pull request into `main`, or when changes touch shared simulation contracts, run the full test suite, production build, APK build, and appropriate Android smoke verification. CI repeats the suite on every PR.
- Never commit or push to `main`. Work on a short-lived `<type>/<short-name>` branch and merge through a pull request with green CI; see `docs/process/GIT_WORKFLOW.md`.
- Use incremental Gradle builds for requested phone-testing APKs. Building an APK does not require a separate reasoning agent.
- When the paired physical phone is reachable, use `npm run android:phone` to discover it, build the current Neon bundle, update the app in place, and launch it. Do not give the user an APK link as the default iteration workflow.
- Delegate bounded implementation packets, genuinely independent investigation, or failure triage.
  Prefer `gpt-5.6-luna` with low reasoning for clear repetitive work and `gpt-5.6-terra` for bounded
  implementation/analysis that needs more judgment.
- Keep tool output concise. Report the command, exit status, and meaningful failures instead of replaying long successful logs.
- Keep native emulator smoke and physical-device performance or feel as separate evidence. Never present emulator smoke as physical-device certification.

## Project boundaries

- For Phase 2 work, start at `docs/roadmap/phase-02/README.md`. Astra owns architecture, packet
  dependencies, acceptance tests, integration, and final approval; implementation agents take one
  Ready packet at a time. Do not start a blocked packet or broaden its file ownership.
- `validation/phase-02/` contains architect-owned acceptance checks. Workers may add unit tests but
  must not weaken those checks or regenerate expected outcomes without Astra review. Run the packet's
  explicit acceptance command; the pending Phase 2 checks are separate from the shipped test suite.
- Keep the approved board-first neon design as the Phase 2 baseline. Design approval does not close
  outstanding performance/device evidence or authorize new Worlds and production-art expansion.

- Treat current files under `docs/design/`, `docs/architecture/`, and `docs/roadmap/` as product authority over historical ADRs.
- Keep deterministic combat and placement rules in `packages/sim`; presentation code consumes simulation state and events.
- Preserve the original benchmark and earlier visual artifacts while iterating on Neon V2.
