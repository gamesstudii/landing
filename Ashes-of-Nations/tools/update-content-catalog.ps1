$projectRoot = Split-Path -Parent $PSScriptRoot
$mapsDirectory = Join-Path $projectRoot "maps"
$scenariosDirectory = Join-Path $projectRoot "scenarios"
$dataDirectory = Join-Path $projectRoot "data"

New-Item -ItemType Directory -Path $mapsDirectory -Force | Out-Null
New-Item -ItemType Directory -Path $scenariosDirectory -Force | Out-Null
New-Item -ItemType Directory -Path $dataDirectory -Force | Out-Null

$maps = @()
Get-ChildItem -LiteralPath $mapsDirectory -File -Filter *.json | Sort-Object Name | ForEach-Object {
  try {
    $data = Get-Content -LiteralPath $_.FullName -Raw -Encoding utf8 | ConvertFrom-Json
    if ($null -ne $data.width -and $null -ne $data.height -and $null -ne $data.regions) {
      $maps += [ordered]@{
        name = if ($data.name) { [string]$data.name } else { $_.BaseName }
        file = $_.Name
        path = "maps/$($_.Name)"
        width = [int]$data.width
        height = [int]$data.height
        regions = @($data.regions).Count
      }
    }
  } catch {
    Write-Warning "Skipped invalid map: $($_.Name)"
  }
}

$scenarios = @()
Get-ChildItem -LiteralPath $scenariosDirectory -File -Filter *.json | Sort-Object Name | ForEach-Object {
  if ($_.Name -eq "manifest.json") {
    return
  }
  try {
    $data = Get-Content -LiteralPath $_.FullName -Raw -Encoding utf8 | ConvertFrom-Json
    if ($data.format -eq "ashes-of-nations-scenario" -and $null -ne $data.countries) {
      $mapFile = if ($data.map.file) { [System.IO.Path]::GetFileName([string]$data.map.file) } else { $null }
      $scenarios += [ordered]@{
        name = if ($data.name) { [string]$data.name } else { $_.BaseName }
        year = if ($data.year) { [int]$data.year } else { $null }
        file = $_.Name
        path = "scenarios/$($_.Name)"
        mapFile = $mapFile
        mapName = if ($data.map.name) { [string]$data.map.name } else { $null }
        countries = @($data.countries).Count
      }
    }
  } catch {
    Write-Warning "Skipped invalid scenario: $($_.Name)"
  }
}

$mapsJson = ConvertTo-Json -InputObject @($maps) -Depth 6 -Compress
$scenariosJson = ConvertTo-Json -InputObject @($scenarios) -Depth 6 -Compress
if (-not $mapsJson) { $mapsJson = "[]" }
if (-not $scenariosJson) { $scenariosJson = "[]" }

"window.MAPS_CATALOG = $mapsJson;" |
  Set-Content -LiteralPath (Join-Path $dataDirectory "maps-catalog.js") -Encoding utf8
"window.SCENARIOS_CATALOG = $scenariosJson;" |
  Set-Content -LiteralPath (Join-Path $dataDirectory "scenarios-catalog.js") -Encoding utf8

[ordered]@{ maps = @($maps) } |
  ConvertTo-Json -Depth 6 |
  Set-Content -LiteralPath (Join-Path $mapsDirectory "manifest.json") -Encoding utf8
[ordered]@{ scenarios = @($scenarios) } |
  ConvertTo-Json -Depth 6 |
  Set-Content -LiteralPath (Join-Path $scenariosDirectory "manifest.json") -Encoding utf8

Write-Host "Content catalog updated: $($maps.Count) maps, $($scenarios.Count) scenarios."
