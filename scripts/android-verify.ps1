[CmdletBinding()]
param([string]$DeviceSerial)

$ErrorActionPreference = 'Stop'
if (-not $DeviceSerial) { throw 'Pass an explicit DeviceSerial; the verifier never selects one automatically.' }
if (-not $env:ANDROID_HOME) {
    $env:ANDROID_HOME = [Environment]::GetEnvironmentVariable('ANDROID_HOME', 'User')
}
& node.exe (Join-Path $PSScriptRoot 'verify-android.mjs') $DeviceSerial
if ($LASTEXITCODE -ne 0) { throw "Android verification failed with exit code $LASTEXITCODE" }
