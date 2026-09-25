# P2-02: Recoverable Local Profile

State: Accepted and integrated into the current working tree. Dependencies: none.
Worker: Nash, GPT-5.6 Terra, medium. Review owner: Astra.

Dispatched 2026-09-24. Agent: `01a0d626-71ec-7601-bfe8-39cd81094f01`.
Isolated workspace: `C:/Users/mpitt/.codex/worktrees/phase2-local-profile/maze-defense`.
Base revision: `99b78caf3abaed489307d3215c372ee2edd230a0`.

## Outcome and Contract

Add a minimal version-1 local profile: completed Mission IDs with best Stars, unlocked Blueprint IDs,
acknowledged Help IDs, and the current campaign destination. Foundation is inherent, not a specialist
unlock. Do not persist a mutable UI tree or put Field Credits into a permanent wallet.

Pure profile validation belongs in `apps/game/src/application/player-profile.ts`; persistence belongs
in `apps/game/src/platform/profile-store.ts`, injecting the existing Preferences-style get/set adapter.
Astra's API is frozen below and in the independent acceptance suite. Keep local settings separate.
Do not build cloud abstractions, a database layer, or a generic migration framework.

## Frozen API

`player-profile.ts` exports `createPlayerProfile()` and `parsePlayerProfile(value: unknown)`. Both return
detached, deeply frozen `PlayerProfile` data. Parse rejects malformed values; it never silently coerces
Stars, IDs, or Blueprint names. Stable identifiers use the current kebab-case convention.

```ts
interface PlayerProfile {
  readonly schemaVersion: 1;
  readonly completedMissions: Readonly<Record<string, 1 | 2 | 3>>;
  readonly unlockedBlueprints: readonly Exclude<TowerFamilyId, 'foundation'>[];
  readonly seenHelp: readonly string[];
  readonly destination:
    | { readonly kind: 'mission'; readonly missionId: string }
    | { readonly kind: 'map' };
}
```

Fresh profile: empty completions/unlocks/help and Mission `world-01-mission-01`. Foundation ownership
is implicit. Reject duplicate unlock/help IDs. Allow existing specialist IDs from content, including
future families, without inventing unlock gameplay. No arbitrary dynamic campaign rewards here.

`profile-store.ts` exports `PROFILE_SLOT_KEYS` (the readonly tuple
`['maze-defense.profile.a', 'maze-defense.profile.b']`) and `ProfileStore`:

```ts
type Storage = {
  get(options: { key: string }): Promise<{ value: string | null }>;
  set(options: { key: string; value: string }): Promise<void>;
};
type ProfileLoad =
  | { status: 'new' | 'loaded' | 'recovered'; profile: PlayerProfile; revision: number }
  | { status: 'corrupt' | 'unsupported-version' | 'unavailable'; profile: null; revision: null };
// Default storage is Capacitor Preferences; inject a fake in tests.
new ProfileStore(storage?: Storage, options?: { readTimeoutMs?: number });
store.load(): Promise<ProfileLoad>;
store.save(profile: PlayerProfile): Promise<{ revision: number }>;
```

Use two independently checksummed slots. Envelope fields are `schemaVersion: 1`, `revision` (positive
safe integer), `checksum`, and `profile`. Checksum includes version, revision, and canonical profile
data; it detects accidental corruption, not malicious tampering. Load the highest valid revision.
One nonempty invalid slot plus one valid slot reports recovered; one valid slot plus an empty slot
reports loaded. Both empty reports new at revision zero, with no write. Unknown envelope OR profile
versions in either readable slot report unsupported-version, even if the other slot is valid.

Read both slots with a bounded timeout (default 2000ms per read, injected shorter in tests). Any read
failure reports unavailable instead of silently selecting an older slot. Never mutate persistence
on load or let late reads change an already returned result. A single store instance owns writes;
cross-tab/process writer coordination is out of scope for this mobile-first slice.

After successful load, serialize saves, capture and validate the caller's profile at invocation, and
write the older/invalid/empty slot, preserving the newest valid one. Revisions advance only for a
confirmed write. Verify a rejected native write with bounded readback: the exact intended envelope
confirms success; an unchanged target rejects without poisoning later queued saves; unreadable,
partial, or different target bytes reject and stop writes until reload. A fresh store can recover the
remaining valid slot after an interrupted/torn write. Save before a successful load, or after a
corrupt/unsupported/unavailable load, rejects without writes. No pointer/head key is needed. Do not
time out a write and race a new write over its target slot.

## Acceptance

- [x] New store loads a new profile without overwriting unknown or corrupt existing data.
- [x] Versioned envelope has checksum, monotonically increasing revision, and last-known-good recovery.
- [x] Two-slot/journaled commits survive interrupted writes; concurrent saves finish in revision order.
- [x] Corrupt primary recovers the verified backup; corrupt both returns an explicit recoverable error
      while preserving bytes. Unknown future versions are not downgraded or replaced with defaults.
- [x] Write/quota failures are observable. Failed persistence is never reported as a completed save.
- [x] Reads have bounded completion; a late native response cannot replace newer in-memory state.
- [x] The same injected failure suite runs against storage semantics shared by web and Android adapters.

## Validation and Handoff

Astra supplied `validation/phase-02/profile.acceptance.test.ts`: 16 cases cover data validation,
checksums/revision tampering, torn writes, ordered saves, captured input, quota failure, unsupported
versions, unreadable slots, and late read replies. All 16 pass. Worker unit tests add stale reload,
commit-then-reject, partial write lockout, clear quota retry, and future-profile precedence coverage.
Native persistence is verified later.
Handoff supplies explicit load/recovery results and failure semantics for the P2-04 orchestrator.

```powershell
npx.cmd vitest run --config validation/phase-02/vitest.config.ts validation/phase-02/profile.acceptance.test.ts
npx.cmd tsc -p validation/phase-02/tsconfig.json
```

## Review and Integration Evidence

Nash implemented the packet in the isolated worktree and committed only the two source modules and
their focused unit tests. Astra's first review rejected the initial result for a stale reload/write race,
ambiguous native write completion, future profile-version precedence, and a committed scratch report.
Fix round one serialized loads and saves, verified rejected writes with bounded readback, protected future
profile data before ordinary envelope validation, and removed scratch evidence from the net Git diff.
The scoped re-review found all four issues addressed with no new Critical or Important breakage.
Final whole-packet review then found locale-sensitive Mission-key ordering in the checksum; a focused
English-to-Danish collation regression reproduced the data-loss risk, and deterministic code-unit
ordering fixed it.

Independent integrated verification passed 16/16 architect acceptance cases, the validation TypeScript
check, 19 Node tests and 258 Vitest tests across 39 files, strict production/test TypeScript, and the Vite
production build. This accepts the deterministic adapter contract; Android persistence remains a later
device-evidence obligation and is not claimed here. No checksum migration is needed because this new
store has not yet been connected to a shipped runtime capable of writing profile slots.
