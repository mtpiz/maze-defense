# Git Workflow

Status: Active  
Updated: 2026-09-25

This is a solo project. There are no pull requests, required CI, or branch protection. Work happens in
git worktrees and merges straight into `main`, and the phone gets the new build from your own machine.

## Rules

1. `main` is always playable. Verify before merging (see below).
2. Do each change in its own git worktree on its own branch, cut from the latest `main`. Claude Code
   sessions already do this under `.claude/worktrees/`. By hand:
   `git worktree add ../maze-<name> -b <name> origin/main`.
3. Keep branches short-lived. Merge to `main` as soon as a change is verified, not in large batches.
4. Merge by bringing the branch up to date with `main` and fast-forwarding `main` to it, so history
   stays linear.
5. After merging, remove the worktree and delete the branch.

## Merge to main and push to the phone

From the worktree:

```bash
git fetch origin
git rebase origin/main
npm test && npm run typecheck && npm run build
git push origin HEAD:main
npm run android:phone -- -Full
```

`git push origin HEAD:main` only succeeds as a fast-forward. If it is rejected, `main` moved: fetch,
rebase, verify, and push again.

`npm run android:phone` finds the paired phone over wireless ADB, builds the current bundle, installs
over the existing app without clearing data, and launches it. `-Full` also runs `npm test`, the Gradle
unit tests, and lint before installing; leave it off for quick iteration builds. Run it from the tree
you just pushed, so the phone gets exactly what is on `main`.

Then clean up:

```bash
git worktree remove <path>
git branch -d <name>
git push origin --delete <name>   # only if the branch was pushed
```

The builds must come from this machine. It holds the ADB pairing key for the phone and the debug
signing key the installed app was signed with. An APK signed anywhere else can only be installed by
uninstalling first, which wipes local progress.
