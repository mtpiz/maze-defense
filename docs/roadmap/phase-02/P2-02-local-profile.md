# P2-02: Recoverable Local Profile

State: Ready for implementation; Astra API and 16 acceptance cases authored and red-checked. Dependencies: none.
Worker: Terra recommended. Review owner: Astra.

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
confirmed write. A rejected write rejects its caller and must not poison later queued saves. A fresh
store can recover the remaining valid slot after an interrupted/torn write. Save before a successful
load, or after a corrupt/unsupported/unavailable load, rejects without writes. No pointer/head key is
needed. When a native write's completion is genuinely ambiguous, stop writes and require reload;
do not time out a write and race a new write over its target slot.

## Acceptance

- [ ] New store loads a new profile without overwriting unknown or corrupt existing data.
- [ ] Versioned envelope has checksum, monotonically increasing revision, and last-known-good recovery.
- [ ] Two-slot/journaled commits survive interrupted writes; concurrent saves finish in revision order.
- [ ] Corrupt primary recovers the verified backup; corrupt both returns an explicit recoverable error
      while preserving bytes. Unknown future versions are not downgraded or replaced with defaults.
- [ ] Write/quota failures are observable. Failed persistence is never reported as a completed save.
- [ ] Reads have bounded completion; a late native response cannot replace newer in-memory state.
- [ ] The same injected failure suite runs against storage semantics shared by web and Android adapters.

## Validation and Handoff

Astra supplied `validation/phase-02/profile.acceptance.test.ts`: 16 cases cover data validation,
checksums/revision tampering, torn writes, ordered saves, captured input, quota failure, unsupported
versions, unreadable slots, and late read replies. All 16 fail on missing implementation; the suite
typechecks. Worker adds store unit tests and runs the named suite plus existing
`local-settings.test.ts`, typecheck, and full tests at integration. Native persistence is verified later.
Handoff supplies explicit load/recovery results and failure semantics for the P2-04 orchestrator.

```powershell
npx.cmd vitest run --config validation/phase-02/vitest.config.ts validation/phase-02/profile.acceptance.test.ts
npx.cmd tsc -p validation/phase-02/tsconfig.json
```
