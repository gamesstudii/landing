@echo off
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "tools\start-game.ps1"
