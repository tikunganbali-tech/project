# Test dengan melihat server logs

Write-Host "Starting server in background and testing..." -ForegroundColor Cyan

# Stop existing
Get-NetTCPConnection -LocalPort 8090 -ErrorAction SilentlyContinue | ForEach-Object {
    Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue
}
Start-Sleep -Seconds 2

# Set env
$env:OPENAI_API_KEY = "YOUR_OPENAI_API_KEY_HERE_6LK2v2RXmx0tE9F3jSjQ8jjml0zsBGWKZhggrmsTaNzb5MMLxMuB-T3BlbkFJ1o5axvKKw1mBIk_Ti5oTdpaRfF72Bkoo16_vc9mxLUoZoxwOne0LtRchu3Yhuos4PXut_fkbMA"
$env:IMAGE_API_KEY = $env:OPENAI_API_KEY

# Start server
Write-Host "Starting server..." -ForegroundColor Yellow
$serverProcess = Start-Process -FilePath "go" -ArgumentList "run", "cmd/server/main.go" -NoNewWindow -PassThru -RedirectStandardOutput "server-output.log" -RedirectStandardError "server-error.log"

Start-Sleep -Seconds 5

# Test
$outlineFile = "..\docs\OUTLINE-K1-CORNERSTONE-PANDUAN-DASAR.md"
$outlineContent = Get-Content $outlineFile | Select-Object -Skip 27
$outlineText = $outlineContent -join "`n"

$payload = @{
    contentType = "DERIVATIVE"
    category = "K1"
    outline = $outlineText.Trim()
    language = "id-ID"
} | ConvertTo-Json -Depth 10

Write-Host "Sending test request..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Method POST -Uri "http://localhost:8090/api/engine/ai/generate" -Body $payload -ContentType "application/json; charset=utf-8" -TimeoutSec 300
    Write-Host "SUCCESS!" -ForegroundColor Green
    $response | ConvertTo-Json -Depth 5
} catch {
    Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Checking server logs..." -ForegroundColor Yellow
    if (Test-Path "server-error.log") {
        Write-Host "=== SERVER ERROR LOG ===" -ForegroundColor Red
        Get-Content "server-error.log" | Select-Object -Last 50
    }
    if (Test-Path "server-output.log") {
        Write-Host "=== SERVER OUTPUT LOG ===" -ForegroundColor Yellow
        Get-Content "server-output.log" | Select-Object -Last 50
    }
} finally {
    Stop-Process -Id $serverProcess.Id -Force -ErrorAction SilentlyContinue
}
