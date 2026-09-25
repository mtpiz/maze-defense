# Git Workflow and Releases

Status: Active  
Updated: 2026-09-24

## Rules

1. `main` is always releasable. Nobody commits or pushes to it directly, including agents.
2. All work happens on a short-lived branch cut from the latest `main`, named `<type>/<short-name>`:
   `feat`, `fix`, `balance`, `perf`, `refactor`, `test`, `docs`, `chore`, or `ci`.
   Examples: `feat/space-audio`, `balance/siege-radius`, `fix/route-preview-flicker`.
3. Short-lived means days, not weeks. Split large work into several branches that each merge on
   their own. CI warns when a branch is more than 7 days old.
4. Every change reaches `main` through a pull request. The PR must pass all CI checks and be up to
   date with `main`. PRs are squash-merged, so each branch becomes one commit on `main`.
5. Delete the branch after merging.

```bash
git switch main && git pull
git switch -c feat/my-change
# work, commit
git push -u origin feat/my-change
# open a PR into main; merge when green
```

## CI (`.github/workflows/ci.yml`)

Runs on every PR into `main`, on every push to `main`, and on demand.

| Check | What it runs |
|---|---|
| Branch policy | Branch name matches `<type>/<short-name>`; warns past 7 days |
| Web tests and build | `npm ci`, `npm run typecheck`, `npm test` (node script tests + all Vitest suites), production web build |
| Android tests and APK | `npm run cap:sync:android`, then Gradle `testDebugUnitTest lintDebug assembleDebug`; the APK and lint report are kept as run artifacts for 14 days |

The Phase 2 acceptance suite in `validation/phase-02/` stays outside CI until its pending checks are
expected to pass.

## Branch protection (`.github/rulesets/main.json`)

Import once: GitHub → Settings → Rules → Rulesets → New ruleset → Import a ruleset → choose
`.github/rulesets/main.json`. It blocks direct pushes, force pushes, and deletion of `main`; requires
a PR; requires the three checks above to pass on a branch that is up to date with `main`; and allows
squash merges only. With no bypass actors, the rules apply to the owner too.

## Releases and phone sideload (`.github/workflows/release.yml`)

Publishing a GitHub Release (for example tag `v0.2.0` on `main`) triggers a job on the self-hosted
Windows runner that is paired with the phone. It:

1. Checks out the tag and runs `npm ci`.
2. Stamps `versionName` from the tag. `versionCode` stays fixed so local
   `npm run android:phone` builds can still update the app in place.
3. Runs `scripts/android-phone.ps1 -Full`, which discovers the wireless-ADB phone, runs `npm test`,
   syncs the web build, runs Gradle unit tests, lint, and `assembleDebug`, then installs over the
   existing app without clearing data and launches it.
4. Attaches the verified APK and `latest.json` to the release. This also happens when only the phone
   install fails.

The job runs on your machine rather than a GitHub-hosted runner for two reasons. That machine holds
the ADB pairing key for the phone, and it holds the debug signing key your existing install was
signed with. An APK signed by a GitHub-hosted runner could only be installed by uninstalling first,
which wipes local progress.

If the PC or phone is offline, the job waits in the queue until the runner comes online. If it
fails because the phone could not be found, re-pair wireless debugging and use **Re-run jobs**.
The workflow can also be started manually from the Actions tab with any ref (no APK is attached then).

### One-time runner setup (Windows)

1. GitHub → repository Settings → Actions → Runners → New self-hosted runner → Windows x64. Follow the
   download and `config.cmd` steps, and add the label `android-phone` when asked for extra labels.
2. Run the runner as your own Windows account, not as a service account. ADB keys (`%USERPROFILE%\.android`),
   `JAVA_HOME`, and `ANDROID_HOME` are per user. Either start `run.cmd` when you want releases to install,
   or install the service with `config.cmd --runasservice --windowslogonaccount .\mpitt`.
3. Keep the phone paired for wireless debugging (`npm run android:phone` working is the test).
4. Settings → Actions → General → Fork pull request workflows: require approval for all outside
   contributors. The release job also refuses to run for anyone except the owner, so fork code never
   executes on this machine.
