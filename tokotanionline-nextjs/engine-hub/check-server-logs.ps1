# Script untuk check apakah ada log file dari server
Write-Host "Checking for server output..." -ForegroundColor Cyan

# Check if server process is running
$processes = Get-Process | Where-Object { $_.ProcessName -like "*go*" -or $_.CommandLine -like "*server*" }
if ($processes) {
    Write-Host "Found Go processes:" -ForegroundColor Green
    $processes | Format-Table ProcessName, Id, StartTime
} else {
    Write-Host "No Go server process found" -ForegroundColor Yellow
}

# Try to get server logs from background process
# Note: Background process output might be in cursor terminal logs
Write-Host "`nTo see server logs:" -ForegroundColor Yellow
Write-Host "1. Check the terminal where you ran: go run cmd/server/main.go" -ForegroundColor White
Write-Host "2. Look for lines starting with [AI]" -ForegroundColor White
Write-Host "3. Look for PANIC RECOVERED messages" -ForegroundColor White
