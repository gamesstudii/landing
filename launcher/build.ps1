$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$build = Join-Path $root 'build'
New-Item -ItemType Directory -Force -Path $build | Out-Null
$sources = Get-ChildItem (Join-Path $root 'src\main\java') -Recurse -Filter '*.java' | Select-Object -ExpandProperty FullName
javac -encoding UTF-8 -d $build $sources
jar --create --file (Join-Path $build 'GamesStudioLauncher.jar') --main-class su.gamestudio.launcher.Launcher -C $build .
if (Get-Command jpackage -ErrorAction SilentlyContinue) {
    $dist = Join-Path $root 'dist'
    New-Item -ItemType Directory -Force -Path $dist | Out-Null
    jpackage --type app-image --name 'Games Studio Launcher' --input $build --main-jar GamesStudioLauncher.jar --main-class su.gamestudio.launcher.Launcher --dest $dist
}
