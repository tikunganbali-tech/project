# Start server dengan binary baru

Write-Host "STEP 3: Starting server..." -ForegroundColor Cyan

$env:OPENAI_API_KEY = "YOUR_OPENAI_API_KEY_HERE_6LK2v2RXmx0tE9F3jSjQ8jjml0zsBGWKZhggrmsTaNzb5MMLxMuB-T3BlbkFJ1o5axvKKw1mBIk_Ti5oTdpaRfF72Bkoo16_vc9mxLUoZoxwOne0LtRchu3Yhuos4PXut_fkbMA"
$env:IMAGE_API_KEY = $env:OPENAI_API_KEY

$serverProcess = Start-Process -FilePath "go" -ArgumentList "run", "cmd/server/main.go" -NoNewWindow -PassThru

Write-Host "Server starting (PID: $($serverProcess.Id))..." -ForegroundColor Yellow
Write-Host "Waiting for server to be ready..." -ForegroundColor Gray

Start-Sleep -Seconds 3

$maxWait = 30
$waited = 0
$serverReady = $false

while ($waited -lt $maxWait) {
    try {
        $health = Invoke-RestMethod -Uri "http://localhost:8090/health" -TimeoutSec 1 -ErrorAction Stop
        $serverReady = $true
        Write-Host "✅ Server is ready!" -ForegroundColor Green
        break
    } catch {
        Start-Sleep -Seconds 2
        $waited += 2
        Write-Host "  Waiting... ($waited/$maxWait seconds)" -ForegroundColor Gray
    }
}

if (-not $serverReady) {
    Write-Host "❌ Server failed to start" -ForegroundColor Red
    Stop-Process -Id $serverProcess.Id -Force -ErrorAction SilentlyContinue
    exit 1
}

Write-Host ""
Write-Host "Server is running and ready for requests" -ForegroundColor Green
