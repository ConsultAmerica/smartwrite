# SmartWrite AI - start backend + desktop (PowerShell)
$ErrorActionPreference = "Stop"
$root = $PSScriptRoot
Set-Location $root

if (-not (Test-Path "node_modules")) {
    Write-Host "Installing root dependencies..."
    npm install
}

if (-not (Test-Path "desktop-app\node_modules")) {
    Write-Host "Installing desktop-app dependencies..."
    npm install --prefix desktop-app
}

Write-Host ""
Write-Host "  SmartWrite AI - starting backend + desktop"
Write-Host "  Backend:  http://127.0.0.1:8002"
Write-Host "  Desktop:  http://127.0.0.1:5173"
Write-Host "  Press Ctrl+C to stop both"
Write-Host ""

npm run dev
