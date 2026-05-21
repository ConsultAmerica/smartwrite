@echo off
setlocal EnableExtensions
cd /d "%~dp0"

if not exist node_modules (
  echo Installing root dependencies...
  call npm install
)

if not exist desktop-app\node_modules (
  echo Installing desktop-app dependencies...
  call npm install --prefix desktop-app
)

echo.
echo  SmartWrite AI - WEB mode (browser)
echo  Backend:  http://127.0.0.1:8002
echo  Frontend: http://127.0.0.1:5173
echo  Press Ctrl+C to stop both
echo.

call scripts\free-dev-ports.cmd
call npm run dev:web
exit /b %ERRORLEVEL%
