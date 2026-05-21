@echo off
setlocal EnableDelayedExpansion
set PORT=%~1
if "!PORT!"=="" set PORT=5173

set FOUND=0
for /f "tokens=5" %%p in ('netstat -ano 2^>nul ^| findstr ":!PORT!" ^| findstr LISTENING') do (
  set FOUND=1
  echo [kill-port] Freeing port !PORT! - stopping PID %%p
  taskkill /F /PID %%p >nul 2>&1
)

if "!FOUND!"=="0" (
  echo [kill-port] Port !PORT! is free.
) else (
  ping 127.0.0.1 -n 2 >nul
)
exit /b 0
