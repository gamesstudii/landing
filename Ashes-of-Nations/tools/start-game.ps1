$projectRoot = Split-Path -Parent $PSScriptRoot
$catalogScript = Join-Path $PSScriptRoot "update-content-catalog.mjs"
$flagsScript = Join-Path $PSScriptRoot "update-flags-manifest.ps1"
$serverScript = Join-Path $PSScriptRoot "static-server.ps1"

node $catalogScript
& $flagsScript

$watcherScript = {
  param($catalogScriptPath, $mapsPath, $scenariosPath)

  function Get-ContentState {
    param([string[]]$Paths)

    return ($Paths | ForEach-Object {
      Get-ChildItem -LiteralPath $_ -File -Filter "*.json" |
        Where-Object { $_.Name -ne "manifest.json" } |
        Sort-Object FullName |
        ForEach-Object {
          "$($_.FullName)|$($_.Length)|$($_.LastWriteTimeUtc.Ticks)"
        }
    }) -join "`n"
  }

  $paths = @($mapsPath, $scenariosPath)
  $previousState = Get-ContentState $paths

  while ($true) {
    Start-Sleep -Seconds 1
    $currentState = Get-ContentState $paths
    if ($currentState -ne $previousState) {
      $previousState = $currentState
      node $catalogScriptPath
    }
  }
}

$watcher = Start-Job -ScriptBlock $watcherScript -ArgumentList @(
  $catalogScript,
  (Join-Path $projectRoot "maps"),
  (Join-Path $projectRoot "scenarios")
)

try {
  & $serverScript -Root $projectRoot -Port 8765 -OpenBrowser
} finally {
  Stop-Job $watcher -ErrorAction SilentlyContinue
  Remove-Job $watcher -Force -ErrorAction SilentlyContinue
}
