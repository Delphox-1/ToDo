@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Install Node.js 22.13 or later from https://nodejs.org/ and try again.
  pause
  exit /b 1
)
node scripts\local-server.mjs
pause
