# Tower Defense Successor

This repository contains the successor Core Combat Gate. It has no runtime dependency on the frozen
prototype in the sibling `tower-defense-claude` repository.

Current implementation evidence and open Gate work are tracked in
[Core Combat Gate Status](docs/roadmap/BENCHMARK_BUILD_STATUS.md). The certified product contract is
[Game Design](docs/design/GAME_DESIGN.md); historical ADRs do not override it.

## Commands

```bash
npm install
npm test
npm run typecheck
npm run dev
npm run build
npm run cap:add:android
npm run cap:sync:android
```

Capacitor 8 requires Node 22 or newer. The native project has been generated at `android/` and is
portrait-locked.

Display, motion, sound, and haptic settings persist through Capacitor Preferences. The plugin is
declared in both the game workspace and the root package because the root Capacitor CLI discovers
native plugins from the root dependency list. After dependency changes, `cap:sync:android` must report
`@capacitor/preferences`; an empty native plugin list is not a successful settings integration.

Display settings also select Quality (60 FPS) or Battery (30 FPS). Pixi owns both the presentation
clock and application stepping; simulation rules still use fixed 30 Hz ticks. Hiding an active wave
or planning countdown pauses the Mission. Returning requires explicit Resume; process-death Mission
recovery is not implemented. Local preferences do survive a process restart.

Native preference reads during startup are bounded to a 2-second attempt plus one read-only retry.
Unresolved reads fall back to disabled effects and haptics so bootstrap cannot wait forever; loading
does not write preferences, and late callbacks are ignored.

`npm test` includes mounted Preact settings/lifecycle tests in a test-only jsdom environment. The
simulation tests remain headless; browser screenshots and Android checks are separate evidence.

The native project targets Java 21 and Android API 36. JDK 17 cannot compile its Java 21 sources.

### Windows workstation

The verified 2026-09-05 setup has Temurin JDK 21 at
`C:\Users\mpitt\Tools\Java\jdk-21.0.12.1+1` and the SDK at
`C:\Users\mpitt\AppData\Local\Android\Sdk`. User-level `JAVA_HOME` and `ANDROID_HOME` are set, but
an already-running terminal or editor may still have its old environment. Refresh the current
PowerShell process and put the SDK's ADB ahead of older standalone copies:

```powershell
$env:JAVA_HOME = [Environment]::GetEnvironmentVariable('JAVA_HOME', 'User')
$env:ANDROID_HOME = [Environment]::GetEnvironmentVariable('ANDROID_HOME', 'User')
$env:PATH = "$env:JAVA_HOME\bin;$env:ANDROID_HOME\platform-tools;$env:ANDROID_HOME\emulator;$env:PATH"
npm.cmd run cap:sync:android
cd android
./gradlew.bat testDebugUnitTest lintDebug assembleDebug
cd ..
```

The installed AVD is `MazeDefense_Pixel7_API36` (API 36, Google APIs, x86_64). The recorded accelerated
run explicitly selected the host GPU; the saved AVD configuration does not reproduce that selection.
For a hidden local verification run:

```powershell
Start-Process -FilePath "$env:ANDROID_HOME\emulator\emulator.exe" -WindowStyle Hidden -ArgumentList @(
  '-avd', 'MazeDefense_Pixel7_API36', '-no-window', '-gpu', 'host',
  '-no-snapshot', '-no-boot-anim', '-no-metrics'
)
```

The Pixel 7 device profile controls emulator geometry, not physical Pixel 7 performance. Use an
explicit GPU mode and unchanged fixture when comparing runs. The extra JDK 17 installation is not
used by this project; no additional JDK or emulator installation is currently needed.

### One-command Android iterations

On Windows, build and stage a verified APK:

```powershell
npm run android:build
```

With a USB-debugging-authorized phone or an already paired wireless ADB device, pass its exact serial
from `adb devices -l` to build, install the update without clearing app data, and launch:

```powershell
npm run android:build -- DEVICE_SERIAL
```

The dedicated emulator uses `emulator-5554`. A missing or unauthorized requested device fails before
building; the script never chooses a device implicitly. Every successful run checks tests, TypeScript,
web/native asset sync, Android unit tests and lint, then stages a hash-named APK and `latest.json`
under `artifacts/builds/`. Debug APKs are excluded from Git. The manifest records the exact SHA-256,
size, application ID, and native version; it does not imply release signing or distribution approval.

This local pipeline needs no Firebase or Supabase configuration. Private cloud download links,
tester enrollment, and stable cross-workstation signing remain separate work. Phone USB/wireless
authorization must be completed on the physical device before unattended installation is possible.

### Automated Android regression

Build, install, and run the complete scripted regression on the explicitly selected test device:

```powershell
npm run android:iterate -- emulator-5554
```

To verify an already installed build without rebuilding:

```powershell
npm run android:verify -- emulator-5554
```

Use a dedicated test session: verification cold-restarts this app and replaces its in-progress Mission.
It does not clear saved preferences, change them, or choose a device automatically. The installed APK
and staged file must both match `artifacts/builds/latest.json` before the app is restarted. A connected
physical phone can use its exact authorized ADB serial in the same commands; this is not cloud delivery.

The runner builds an affordable mixed defense through UI buttons, plays six waves at 3x, checks a
nonblank moving canvas, sends real Android Home/return commands during a wave and planning, and checks
that explicit Resume is required. It verifies results, restored-opening retry, and stress-screen
return with all saved settings intact, then leaves the rebuilt opening on screen. It temporarily
intercepts the game's diagnostic clipboard export without writing
to the host clipboard; the original clipboard and its own CDP port forward are cleaned up afterward.

Timestamped JSON, ADB compositor screenshots, and app-process logs are saved under
`artifacts/android-verification/`. Failures return a nonzero exit code and retain partial evidence.
These runs are UI regressions, not controlled performance samples, uncoached playtests, or physical
touch validation. GPU timer-extension availability is recorded; GPU execution remains unmeasured.
`npm test` includes the verifier's Node tests as well as the simulation and mounted-UI suite.

### Apple Silicon setup

The earlier Apple Silicon setup used these shell values:

```bash
export JAVA_HOME="/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home"
export ANDROID_HOME="$HOME/Library/Android/sdk"
export PATH="$JAVA_HOME/bin:$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator:$PATH"
```

After `npm run cap:sync:android`, build and verify the native project with:

```bash
cd android
./gradlew assembleDebug
./gradlew testDebugUnitTest lintDebug
```

The generated debug package is `android/app/build/outputs/apk/debug/app-debug.apk`. Android Studio
should use JDK 21 (or `JAVA_HOME`) for this Gradle 8.14 project rather than its newer bundled runtime.

For Gate runs, open the top-right display menu and choose **Engine diagnostics**. The panel
tracks a bounded frame sample, fixed-step work, presentation-event count, JavaScript heap, and
lifecycle gaps. **Copy JSON** exports the versioned report for a device evidence log. These in-app
figures complement rather than replace Android Studio, `gfxinfo`, process-memory, thermal, and battery
profiles on physical hardware.

### Repeatable stress captures

`?stress&fps=30` and `?stress&fps=60` use the same 20x20, 120-creep, 40-tower fixture at 3x.
The stress footer provides sample reset and JSON export. Reports include fixture identity, starting
and ending load, sample duration, and the selected 20 ms / 40 ms long-frame threshold. Exports use
schema 3; samples are reset when the interactive game changes frame mode. CPU update, scene,
render-submission, and root UI-commit timings are separate bounded summaries. Actual GPU execution
remains unmeasured. See [timing definitions](docs/roadmap/DIAGNOSTIC_TIMING.md) before comparing reports.

For a foreground debug Android build, forward only that app's WebView and capture either mode:

```powershell
$serial = 'emulator-5554'
$adb = Join-Path $env:ANDROID_HOME 'platform-tools/adb.exe'
$gameProcessId = (& $adb -s $serial shell pidof com.towerdefensev2.game).Trim()
$port = (& $adb -s $serial forward tcp:0 "localabstract:webview_devtools_remote_$gameProcessId").Trim()
node scripts/capture-android-stress.mjs $port 60 $serial
node scripts/capture-android-stress.mjs $port 30 $serial
& $adb -s $serial forward --remove "tcp:$port"
```

The capture script reloads the fixture, waits for all 120 creeps and the provisional atlas, resets diagnostics, and captures
45 seconds before normal exits begin. It rejects interrupted or depleted samples and saves raw JSON
and an ADB compositor screenshot in `artifacts/emulator/`. Android WebView's CDP screenshot omits the
GPU canvas and must not be used as rendering evidence. Keep other stress scenes closed during a run.
These captures do not measure physical-device thermal behavior, battery savings, or separate GPU time.

Tower, enemy, and HUD style work is parked for owner-led Nano Banana exploration. The imported kit is
temporary; see [Visual Direction](docs/art/VISUAL_DIRECTION_PLAN.md) for the current approval boundary.

## Dependency direction

```text
content → sim → app/orchestration → presentation and UI
                         ↓
                      platform
```

The Simulation Kernel imports no Pixi, Preact, browser, native, storage, network, or prototype code.
Content contains validated definitions and stable mechanic identifiers, never executable behavior.
