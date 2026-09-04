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

The verified Apple Silicon development setup uses JDK 21 and Android API 36. These shell values are
also persisted in the current workstation's `~/.zshrc`:

```bash
export JAVA_HOME="/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home"
export ANDROID_HOME="$HOME/Library/Android/sdk"
export PATH="$JAVA_HOME/bin:$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator:$PATH"
```

Build and verify the native project with:

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

## Dependency direction

```text
content → sim → app/orchestration → presentation and UI
                         ↓
                      platform
```

The Simulation Kernel imports no Pixi, Preact, browser, native, storage, network, or prototype code.
Content contains validated definitions and stable mechanic identifiers, never executable behavior.
