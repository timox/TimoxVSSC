[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)] [string] $StableEnginePath,
    [Parameter(Mandatory = $true)] [string] $PortableExePath,
    [switch] $ConfirmHandoff,
    [switch] $NoLaunch
)

$ErrorActionPreference = 'Stop'
$handoffNode = Join-Path $PSScriptRoot 'portable-overlay-handoff.cjs'

if (-not (Test-Path -LiteralPath $StableEnginePath -PathType Leaf)) { throw "Stable engine not found: $StableEnginePath" }
if (-not (Test-Path -LiteralPath $PortableExePath -PathType Leaf)) { throw "Portable executable not found: $PortableExePath" }
if (-not $ConfirmHandoff) {
    throw 'Refusing handoff without -ConfirmHandoff. This closes attached TimoxVasio clients and stops the selected engine host.'
}

function Read-StableState {
    $json = & node $handoffNode state
    if ($LASTEXITCODE -ne 0) { throw 'Could not read the stable engine state.' }
    return ($json | ConvertFrom-Json)
}

function Get-TimoxClients($state) {
    $driver = @($state.virtualDrivers) | Where-Object { $_.id -eq 'TimoxVasio' } | Select-Object -First 1
    return @($driver.clients)
}

function Wait-ProcessExit([int] $ProcessId, [int] $TimeoutMs = 5000) {
    $deadline = [Environment]::TickCount64 + $TimeoutMs
    do {
        if (-not (Get-Process -Id $ProcessId -ErrorAction SilentlyContinue)) { return }
        Start-Sleep -Milliseconds 100
    } while ([Environment]::TickCount64 -lt $deadline)
    throw "Process $ProcessId did not exit in time. Handoff aborted."
}

$state = Read-StableState
$clients = Get-TimoxClients $state
foreach ($client in $clients) {
    $process = Get-Process -Id ([int]$client.pid) -ErrorAction SilentlyContinue
    if (-not $process) { throw "TimoxVasio client PID $($client.pid) disappeared; refresh state and retry." }
    if (-not $process.MainWindowHandle) { throw "TimoxVasio client PID $($client.pid) has no closable main window; close it manually and retry." }
    Write-Host "Closing TimoxVasio client $($client.processName) (PID $($client.pid))..."
    if (-not $process.CloseMainWindow()) { throw "Could not request a graceful close for PID $($client.pid)." }
    Wait-ProcessExit ([int]$client.pid)
}

& node $handoffNode stop
if ($LASTEXITCODE -ne 0) { throw 'The stable engine did not stop cleanly; portable launch skipped.' }

$stablePath = [IO.Path]::GetFullPath($StableEnginePath)
$engineProcesses = @(Get-CimInstance Win32_Process -Filter "name = 'TimoxVirtualAsioEngine.exe'" |
    Where-Object { $_.ExecutablePath -and [IO.Path]::GetFullPath($_.ExecutablePath) -eq $stablePath })
if ($engineProcesses.Count -ne 1) { throw "Expected exactly one stable engine at '$stablePath', found $($engineProcesses.Count)." }

$enginePid = [int]$engineProcesses[0].ProcessId
Write-Host "Stopping the already-idle stable engine host (PID $enginePid)..."
Stop-Process -Id $enginePid
Wait-ProcessExit $enginePid

$deadline = [Environment]::TickCount64 + 5000
do {
    try { Invoke-RestMethod 'http://127.0.0.1:52525/api/v1/state' -TimeoutSec 1 | Out-Null }
    catch { break }
    Start-Sleep -Milliseconds 100
} while ([Environment]::TickCount64 -lt $deadline)
if ([Environment]::TickCount64 -ge $deadline) { throw 'The stable engine API port was not released; portable launch skipped.' }

if (-not $NoLaunch) {
    Start-Process -FilePath $PortableExePath -WorkingDirectory ([IO.Path]::GetDirectoryName($PortableExePath))
    Write-Host "Portable preview launched: $PortableExePath"
}
