param([int]$Port = 8001)

$connections = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
if (-not $connections) {
    Write-Host "Port $Port is free."
    return
}

$pids = $connections | Select-Object -ExpandProperty OwningProcess -Unique
foreach ($procId in $pids) {
    try {
        $name = (Get-Process -Id $procId -ErrorAction SilentlyContinue).ProcessName
        Write-Host "Stopping $name (PID $procId) on port $Port..."
        Stop-Process -Id $procId -Force -ErrorAction Stop
    } catch {
        Write-Host "Could not stop PID $procId : $_"
    }
}

Start-Sleep -Seconds 1
Write-Host "Port $Port cleared."
