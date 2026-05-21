param([switch]$InstallOnly)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$backend = Join-Path $root "backend"
$venv = Join-Path $root ".venv"

if (-not (Test-Path $venv)) {
    Write-Host "[backend] Creating Python venv..."
    python -m venv $venv
}

$python = Join-Path $venv "Scripts\python.exe"
$pip = Join-Path $venv "Scripts\pip.exe"

& $pip install -q -r (Join-Path $backend "requirements.txt")

Set-Location $backend
if (-not (Test-Path ".env")) {
    Copy-Item ".env.example" ".env"
    Write-Host "[backend] Created backend/.env"
}

if ($InstallOnly) {
    Write-Host "[backend] Dependencies installed."
    exit 0
}

$port = 8002
if (Test-Path (Join-Path $backend ".env")) {
    foreach ($line in Get-Content (Join-Path $backend ".env")) {
        if ($line -match '^\s*PORT\s*=\s*(\d+)') { $port = [int]$Matches[1]; break }
    }
}

& (Join-Path $root "scripts\kill-port.ps1") -Port 8001
& (Join-Path $root "scripts\kill-port.ps1") -Port $port

Write-Host "[backend] API -> http://127.0.0.1:$port"
& $python -m uvicorn main:app --host 127.0.0.1 --port $port --reload
