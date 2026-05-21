# Run from backend/ - starts SmartWrite API (uses system Python if venv is broken)
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$venv = Join-Path $root ".venv"
$venvPython = Join-Path $venv "Scripts\python.exe"

$port = 8002
if (Test-Path ".env") {
    foreach ($line in Get-Content ".env") {
        if ($line -match '^\s*PORT\s*=\s*(\d+)') { $port = [int]$Matches[1]; break }
    }
}

function Get-PythonExe {
    if (Test-Path $venvPython) {
        try {
            & $venvPython -c "import sys" 2>$null | Out-Null
            if ($LASTEXITCODE -eq 0) { return $venvPython }
        } catch { }
    }
    $cmd = Get-Command python -ErrorAction SilentlyContinue
    if ($cmd) { return $cmd.Source }
    throw "Python not found. Install Python 3.11+ and add it to PATH."
}

$python = Get-PythonExe

if (Test-Path (Join-Path $root "scripts\kill-port.ps1")) {
    & (Join-Path $root "scripts\kill-port.ps1") -Port 8001
    & (Join-Path $root "scripts\kill-port.ps1") -Port $port
}

& $python -m pip install -q -r (Join-Path $PSScriptRoot "requirements.txt")
Set-Location $PSScriptRoot

if (-not (Test-Path ".env")) {
    Copy-Item ".env.example" ".env"
}

Write-Host ""
Write-Host "Starting SmartWrite BACKEND"
Write-Host "  URL:   http://127.0.0.1:$port/"
Write-Host "  Docs:  http://127.0.0.1:$port/docs"
Write-Host "  Health must show: api = backend-v1"
Write-Host ""

& $python -m uvicorn main:app --host 127.0.0.1 --port $port --reload
