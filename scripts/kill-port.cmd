@echo off
setlocal EnableDelayedExpansion
set PORT=%~1
if "!PORT!"=="" set PORT=5173

set FOUND=0
for /f "tokens=5" %%p in ('netstat -ano 2^>nul ^| findstr ":!PORT!" ^| findstr LISTENING') do (
  set FOUND=1
  echo [kill-port] Freeing port !PORT! - stopping PID %%p
  taskkill /F /PID %%p /T >nul 2>&1
)

REM Also clear orphaned uvicorn/multiprocessing workers that can keep 8002 bound
if "!PORT!"=="8002" (
  for /f "tokens=2 delims=," %%p in ('wmic process where "CommandLine like '%%spawn_main%%uvicorn%%' or CommandLine like '%%uvicorn%%main:app%%'" get ProcessId /format:csv 2^>nul ^| findstr /r "[0-9]"') do (
    echo [kill-port] Stopping uvicorn worker PID %%p
    taskkill /F /PID %%p /T >nul 2>&1
    set FOUND=1
  )
)

if "!FOUND!"=="0" (
  echo [kill-port] Port !PORT! is free.
) else (
  ping 127.0.0.1 -n 2 >nul
)
exit /b 0
