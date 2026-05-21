# Start SmartWrite backend from project root
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
& (Join-Path $root "backend\start-backend.ps1")
