# SmartWrite AI - backend + web browser (no Electron)
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

if (-not (Test-Path "node_modules")) { npm install }
if (-not (Test-Path "desktop-app\node_modules")) { npm install --prefix desktop-app }

Write-Host ""
Write-Host "  SmartWrite AI - WEB mode"
Write-Host "  Backend:  http://127.0.0.1:8002"
Write-Host "  Browser:  http://127.0.0.1:5173"
Write-Host "  Press Ctrl+C to stop"
Write-Host ""

npm run dev:web
