@echo off
setlocal EnableExtensions
cd /d "%~dp0.."

echo.
echo [SmartWrite] Building web frontend...
call npm run build --prefix desktop-app
if errorlevel 1 exit /b 1

echo.
echo [SmartWrite] Production web at http://127.0.0.1:8002
echo [SmartWrite] API docs: http://127.0.0.1:8002/docs
echo Press Ctrl+C to stop.
echo.

set SERVE_WEB=1
set HOST=0.0.0.0
cd backend
python -m uvicorn main:app --host 0.0.0.0 --port 8002
exit /b %ERRORLEVEL%
