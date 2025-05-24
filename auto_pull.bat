@echo off
cd /d %~dp0
powershell -NoExit -Command "while ($true) { bash auto_pull.sh; Start-Sleep -Seconds 30 }"
