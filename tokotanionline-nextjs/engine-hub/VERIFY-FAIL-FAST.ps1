# VERIFY FAIL-FAST BEHAVIOR (STEP A)
# Expected: Server GAGAL START dengan [FATAL] OPENAI_API_KEY is not set

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "STEP A: VERIFY FAIL-FAST (Without API Key)" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Unsetting OPENAI_API_KEY..." -ForegroundColor Yellow
$env:OPENAI_API_KEY = ""

Write-Host "Starting server (should FAIL)..." -ForegroundColor Yellow
Write-Host ""

# Try to start server and capture output
$process = Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD'; `$env:OPENAI_API_KEY=''; Write-Host 'Starting server without API key...'; Write-Host ''; go run cmd/server/main.go 2>&1 | Select-Object -First 20" -PassThru -WindowStyle Normal

Write-Host "Waiting 5 seconds for server to start/fail..." -ForegroundColor Gray
Start-Sleep -Seconds 5

# Check if process is still running
if ($process.HasExited) {
    Write-Host ""
    Write-Host "[PASS] Server correctly failed to start (process exited)" -ForegroundColor Green
    Write-Host "Exit code: $($process.ExitCode)" -ForegroundColor Gray
} else {
    Write-Host ""
    Write-Host "[FAIL] Server is still running (should have failed)" -ForegroundColor Red
    Write-Host "Stopping server..." -ForegroundColor Yellow
    Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Please check the server window for [FATAL] message" -ForegroundColor Yellow
Write-Host "Expected: [FATAL] OPENAI_API_KEY is not set. Server will not start." -ForegroundColor Gray
Write-Host "========================================" -ForegroundColor Cyan
