@echo off
setlocal EnableExtensions
cd /d "%~dp0..\desktop-app"
echo [SmartWrite] Web UI dev server on http://127.0.0.1:5173
echo [SmartWrite] LAN: http://localhost:5173 (use --host)
call npx vite --host 127.0.0.1 --port 5173
exit /b %ERRORLEVEL%
