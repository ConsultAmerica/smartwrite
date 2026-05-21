@echo off
setlocal EnableExtensions
call "%~dp0free-dev-ports.cmd"
cd /d "%~dp0..\backend"

set PORT=8002
if exist .env (
  for /f "usebackq tokens=1,* delims==" %%a in (`findstr /b /i "PORT=" .env`) do (
    set PORT=%%b
  )
)

echo.
echo [SmartWrite] Backend on http://127.0.0.1:%PORT%
echo [SmartWrite] Docs:  http://127.0.0.1:%PORT%/docs
echo.

where python >nul 2>&1
if errorlevel 1 (
  echo ERROR: python not found. Install Python 3.11+ and add it to PATH.
  exit /b 1
)

python -m pip install -q -r requirements.txt
if not exist .env copy /y .env.example .env >nul

python -m uvicorn main:app --host 127.0.0.1 --port %PORT% --reload
exit /b %ERRORLEVEL%
