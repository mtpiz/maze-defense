[CmdletBinding()]
param([string]$DeviceSerial)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
foreach ($name in @('ANDROID_HOME')) {
    if (-not [Environment]::GetEnvironmentVariable($name, 'Process')) {
        [Environment]::SetEnvironmentVariable($name, [Environment]::GetEnvironmentVariable($name, 'User'), 'Process')
    }
}
if (-not $env:ANDROID_HOME -or -not (Test-Path -LiteralPath "$env:ANDROID_HOME/platform-tools/adb.exe")) {
    throw 'Set ANDROID_HOME to the Android SDK before deploying.'
}
$adb = Join-Path $env:ANDROID_HOME 'platform-tools/adb.exe'

Push-Location $root
try {
    if (-not $DeviceSerial) {
        $services = & $adb mdns services
        foreach ($line in $services) {
            if ($line -match '_adb-tls-connect\._tcp\s+(\d{1,3}(?:\.\d{1,3}){3}:\d+)') {
                & $adb connect $Matches[1] | Out-Null
            }
        }
        $deviceList = (& $adb devices -l) -join "`n"
        $DeviceSerial = $deviceList | & node.exe scripts/android-device-selector.mjs
        if ($LASTEXITCODE -ne 0) { throw 'Unable to select a physical Android phone.' }
    }
    Write-Output "Deploying to $DeviceSerial"
    & powershell.exe -NoProfile -File scripts/android-build.ps1 -DeviceSerial $DeviceSerial -Quick
    if ($LASTEXITCODE -ne 0) { throw "Phone deployment failed with exit code $LASTEXITCODE" }
} finally {
    Pop-Location
}
