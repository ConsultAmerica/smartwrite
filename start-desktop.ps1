# Start SmartWrite AI Electron desktop (requires backend on :8001)
$ErrorActionPreference = "Stop"
$desktop = Join-Path (Split-Path -Parent $MyInvocation.MyCommand.Path) "desktop-app"
Set-Location $desktop
if (-not (Test-Path "node_modules")) {
    npm install
}
npm run dev
