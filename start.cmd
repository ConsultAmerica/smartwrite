@echo off
setlocal EnableExtensions
cd /d "%~dp0"

if not exist node_modules (
  echo Installing root dependencies...
  call npm install
)

if not exist desktop-app\node_modules (
  echo Installing desktop-app dependencies...
  cd desktop-app
  call npm install
  cd ..
)

echo.
echo SmartWrite AI - backend :8002 + desktop :5173
echo Press Ctrl+C to stop.
echo.

call scripts\free-dev-ports.cmd
call npm run dev
exit /b %ERRORLEVEL%
