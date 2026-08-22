$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$build = Join-Path $root 'build'
New-Item -ItemType Directory -Force -Path $build | Out-Null
$sources = Get-ChildItem (Join-Path $root 'src\main\java') -Recurse -Filter '*.java' | Select-Object -ExpandProperty FullName
javac -encoding UTF-8 -d $build $sources
Copy-Item -Path (Join-Path $root 'assets') -Destination (Join-Path $build 'assets') -Recurse -Force
$iconPath = Join-Path $build 'games-studio.ico'
Add-Type -AssemblyName System.Drawing
$bitmap = [System.Drawing.Bitmap]::new((Join-Path $root 'assets\Games Studio.png'))
$icon = [System.Drawing.Icon]::FromHandle($bitmap.GetHicon())
$stream = [System.IO.File]::Open($iconPath, [System.IO.FileMode]::Create)
$icon.Save($stream)
$stream.Dispose(); $icon.Dispose(); $bitmap.Dispose()
jar --create --file (Join-Path $build 'GamesStudioLauncher.jar') --main-class su.gamestudio.launcher.Launcher -C $build .
if (Get-Command jpackage -ErrorAction SilentlyContinue) {
    $dist = Join-Path $root 'dist'
    New-Item -ItemType Directory -Force -Path $dist | Out-Null
    $appOutput = Join-Path $dist 'Games Studio Launcher'
    if (Test-Path -LiteralPath $appOutput) {
        Remove-Item -LiteralPath $appOutput -Recurse -Force
    }
    jpackage --type app-image --name 'Games Studio Launcher' --input $build --main-jar GamesStudioLauncher.jar --main-class su.gamestudio.launcher.Launcher --icon $iconPath --dest $dist
}
