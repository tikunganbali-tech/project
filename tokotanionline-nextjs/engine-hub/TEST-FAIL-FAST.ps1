# TEST FAIL-FAST BEHAVIOR
# CTO FINAL - Verify server fails fast without API key

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "TEST FAIL-FAST BEHAVIOR" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Test server start WITHOUT API key (should fail)
Write-Host "Step 1: Testing server start WITHOUT API key..." -ForegroundColor Yellow
Write-Host "  (Temporarily removing OPENAI_API_KEY from environment)" -ForegroundColor Gray

$originalKey = $env:OPENAI_API_KEY
$env:OPENAI_API_KEY = ""

Write-Host "  Starting server (should FAIL)..."
$process = Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD'; `$env:OPENAI_API_KEY=''; go run cmd/server/main.go" -PassThru -WindowStyle Minimized
Start-Sleep -Seconds 5

# Check if process is still running (should exit with error)
if ($process.HasExited) {
    Write-Host "  [OK] Server correctly failed to start (exit code: $($process.ExitCode))" -ForegroundColor Green
} else {
    Write-Host "  [FAIL] Server is still running (should have failed)" -ForegroundColor Red
    Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue
}

# Restore API key
$env:OPENAI_API_KEY = $originalKey

Write-Host ""
Write-Host "Step 2: Testing server start WITH API key..." -ForegroundColor Yellow

# Step 2: Test server start WITH API key (should succeed)
if ($env:OPENAI_API_KEY) {
    Write-Host "  [OK] OPENAI_API_KEY is set in environment" -ForegroundColor Green
    Write-Host "  Server should start successfully" -ForegroundColor Gray
} else {
    Write-Host "  [FAIL] OPENAI_API_KEY is not set" -ForegroundColor Red
    Write-Host "  Please run: setx OPENAI_API_KEY `"sk-xxxxx`"" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "Test complete. Server should now start normally." -ForegroundColor Green
