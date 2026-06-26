$projectRoot = Split-Path -Parent $PSScriptRoot
$flagsDirectory = Join-Path $projectRoot "flags"
$manifestPath = Join-Path $flagsDirectory "manifest.json"
$catalogPath = Join-Path $flagsDirectory "catalog.js"
$extensions = @(".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg")

$flags = Get-ChildItem -LiteralPath $flagsDirectory -File |
  Where-Object { $extensions -contains $_.Extension.ToLowerInvariant() } |
  Sort-Object Name |
  ForEach-Object {
    [ordered]@{
      name = $_.BaseName
      file = $_.Name
    }
  }

[ordered]@{ flags = @($flags) } |
  ConvertTo-Json -Depth 4 |
  Set-Content -LiteralPath $manifestPath -Encoding utf8

$catalogJson = ConvertTo-Json -InputObject @($flags) -Depth 4 -Compress
if (-not $catalogJson) {
  $catalogJson = "[]"
}
"window.FLAGS_CATALOG = $catalogJson;" |
  Set-Content -LiteralPath $catalogPath -Encoding utf8

Write-Host "Flags catalog updated: $($flags.Count) files."
