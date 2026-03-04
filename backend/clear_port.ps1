# Clear port 8080 (PowerShell)
$PORT = 8080

Write-Host "🔍 Checking for processes on port $PORT..." -ForegroundColor Cyan

$process = Get-NetTCPConnection -LocalPort $PORT -ErrorAction SilentlyContinue |
           Select-Object -ExpandProperty OwningProcess |
           Get-Unique

if ($null -eq $process) {
    Write-Host "✅ Port $PORT is free!" -ForegroundColor Green
    exit 0
}

Write-Host "⚠️  Found process PID: $process" -ForegroundColor Yellow
Write-Host "🔫 Killing process on port $PORT..." -ForegroundColor Yellow

try {
    Stop-Process -Id $process -Force -ErrorAction Stop
    Write-Host "✅ Port $PORT is now free!" -ForegroundColor Green
} catch {
    Write-Host "❌ Failed to kill process: $_" -ForegroundColor Red
    exit 1
}
