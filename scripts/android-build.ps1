[CmdletBinding()]
param([string]$DeviceSerial, [switch]$Verify, [switch]$Quick)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
if ($Verify -and -not $DeviceSerial) { throw 'Pass an explicit DeviceSerial with -Verify.' }
foreach ($name in @('JAVA_HOME', 'ANDROID_HOME')) {
    if (-not [Environment]::GetEnvironmentVariable($name, 'Process')) {
        [Environment]::SetEnvironmentVariable($name, [Environment]::GetEnvironmentVariable($name, 'User'), 'Process')
    }
}
if (-not $env:JAVA_HOME -or -not (Test-Path -LiteralPath "$env:JAVA_HOME/bin/java.exe")) {
    throw 'Set JAVA_HOME to JDK 21 before building Android.'
}
if (-not $env:ANDROID_HOME -or -not (Test-Path -LiteralPath "$env:ANDROID_HOME/platform-tools/adb.exe")) {
    throw 'Set ANDROID_HOME to the Android SDK before building.'
}
$adb = Join-Path $env:ANDROID_HOME 'platform-tools/adb.exe'

function Invoke-Checked([string]$File, [string[]]$Arguments) {
    & $File @Arguments
    if ($LASTEXITCODE -ne 0) { throw "$File failed with exit code $LASTEXITCODE" }
}

Push-Location $root
try {
    if ($DeviceSerial) {
        Invoke-Checked $adb @('-s', $DeviceSerial, 'get-state')
    }
    if (-not $Quick) { Invoke-Checked 'npm.cmd' @('test') }
    Invoke-Checked 'npm.cmd' @('run', 'cap:sync:android')
    Push-Location (Join-Path $root 'android')
    try {
        $gradleTasks = if ($Quick) { @('assembleDebug') } else { @('testDebugUnitTest', 'lintDebug', 'assembleDebug') }
        Invoke-Checked './gradlew.bat' $gradleTasks
    } finally { Pop-Location }

    $apk = Join-Path $root 'android/app/build/outputs/apk/debug/app-debug.apk'
    $metadata = Get-Content -Raw -LiteralPath (Join-Path (Split-Path $apk) 'output-metadata.json') | ConvertFrom-Json
    $stream = [System.IO.File]::OpenRead($apk)
    $hasher = [System.Security.Cryptography.SHA256]::Create()
    try {
        $hash = [BitConverter]::ToString($hasher.ComputeHash($stream)).Replace('-', '').ToLowerInvariant()
    } finally {
        $stream.Dispose()
        $hasher.Dispose()
    }
    $directory = Join-Path $root 'artifacts/builds'
    New-Item -ItemType Directory -Force -Path $directory | Out-Null
    $filename = "maze-defense-debug-$($hash.Substring(0, 12)).apk"
    Copy-Item -LiteralPath $apk -Destination (Join-Path $directory $filename)
    $manifest = [ordered]@{
        schemaVersion = 1
        createdAt = [DateTime]::UtcNow.ToString('o')
        applicationId = $metadata.applicationId
        versionCode = $metadata.elements[0].versionCode
        versionName = $metadata.elements[0].versionName
        apk = $filename
        sha256 = $hash
        bytes = (Get-Item -LiteralPath $apk).Length
        buildType = 'debug'
    } | ConvertTo-Json
    [System.IO.File]::WriteAllText((Join-Path $directory 'latest.json'), $manifest, [System.Text.UTF8Encoding]::new($false))

    if ($DeviceSerial) {
        Invoke-Checked $adb @('-s', $DeviceSerial, 'install', '-r', $apk)
        Invoke-Checked $adb @('-s', $DeviceSerial, 'shell', 'am', 'start', '-n', 'com.towerdefensev2.game/.MainActivity')
    }
    if ($Verify) { Invoke-Checked 'node.exe' @('scripts/verify-android.mjs', $DeviceSerial) }
    $label = if ($Quick) { 'Installed iteration APK' } else { 'Verified APK' }
    Write-Output "${label}: $directory/$filename"
    Write-Output "SHA-256: $hash"
} finally { Pop-Location }
