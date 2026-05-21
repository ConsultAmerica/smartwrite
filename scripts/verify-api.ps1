# Quick check: is the correct SmartWrite backend running on port 8001?
$ErrorActionPreference = "Continue"
$port = 8002
if (Test-Path (Join-Path (Split-Path $PSScriptRoot -Parent) "backend\.env")) {
    foreach ($line in Get-Content (Join-Path (Split-Path $PSScriptRoot -Parent) "backend\.env")) {
        if ($line -match '^\s*PORT\s*=\s*(\d+)') { $port = [int]$Matches[1]; break }
    }
}
$base = "http://127.0.0.1:$port"

Write-Host "Checking $base ..."
Write-Host ""

try {
    $health = Invoke-RestMethod -Uri "$base/health" -TimeoutSec 5
    Write-Host "GET /health OK"
    Write-Host ($health | ConvertTo-Json -Compress)
    if ($health.api -ne "backend-v1") {
        Write-Host ""
        Write-Host "WARNING: Wrong API is running (expected api=backend-v1)."
        Write-Host "Stop the old server, then run: cd backend; .\start-backend.ps1"
    }
} catch {
    Write-Host "GET /health FAILED - is the backend running?"
    Write-Host $_.Exception.Message
}

Write-Host ""
try {
    $root = Invoke-RestMethod -Uri "$base/" -TimeoutSec 5
    Write-Host "GET / OK"
    Write-Host ($root | ConvertTo-Json -Compress)
} catch {
    Write-Host "GET / FAILED (404 = old ai-service still running on 8001)"
    Write-Host $_.Exception.Message
}

Write-Host ""
try {
    $body = '{"text":"The biggest improving now is bad"}'
    $grammar = Invoke-RestMethod -Uri "$base/check-grammar" -Method POST -Body $body -ContentType "application/json" -TimeoutSec 120
    Write-Host "POST /check-grammar OK - issues:" $grammar.issue_count "grammar score:" $grammar.grammar_score
} catch {
    Write-Host "POST /check-grammar FAILED (404 = wrong API on port 8001)"
    Write-Host $_.Exception.Message
}
