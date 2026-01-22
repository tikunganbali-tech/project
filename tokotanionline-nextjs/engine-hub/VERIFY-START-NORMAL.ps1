# VERIFY START NORMAL (STEP B)
# Expected: Server START dengan log [BOOT] OPENAI_API_KEY: present=true

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "STEP B: VERIFY START NORMAL (With API Key)" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Get API key from OS environment
$apiKey = [System.Environment]::GetEnvironmentVariable("OPENAI_API_KEY", "User")
if (-not $apiKey) {
    $apiKey = [System.Environment]::GetEnvironmentVariable("OPENAI_API_KEY", "Machine")
}

if ($apiKey) {
    Write-Host "[OK] OPENAI_API_KEY found in OS environment" -ForegroundColor Green
    Write-Host "Length: $($apiKey.Length) characters" -ForegroundColor Gray
    $env:OPENAI_API_KEY = $apiKey
    Write-Host ""
    Write-Host "Starting server..." -ForegroundColor Yellow
    Write-Host ""
    
    # Start server in new window
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD'; `$env:OPENAI_API_KEY=[System.Environment]::GetEnvironmentVariable('OPENAI_API_KEY','User'); if (-not `$env:OPENAI_API_KEY) { `$env:OPENAI_API_KEY=[System.Environment]::GetEnvironmentVariable('OPENAI_API_KEY','Machine') }; Write-Host 'Starting server with API key...'; Write-Host ''; go run cmd/server/main.go" -WindowStyle Normal
    
    Write-Host "Server starting in new window..." -ForegroundColor Gray
    Write-Host "Waiting 8 seconds for server to start..." -ForegroundColor Gray
    Start-Sleep -Seconds 8
    
    # Check if server is running
    try {
        $healthCheck = Invoke-RestMethod -Uri "http://localhost:8090/health" -Method GET -TimeoutSec 3
        Write-Host ""
        Write-Host "[PASS] Server is running successfully!" -ForegroundColor Green
        Write-Host ""
        Write-Host "Please check the server window for:" -ForegroundColor Yellow
        Write-Host "  Expected: [BOOT] OPENAI_API_KEY: present=true, length=XXX" -ForegroundColor Gray
    } catch {
        Write-Host ""
        Write-Host "[FAIL] Server is not responding" -ForegroundColor Red
        Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host ""
        Write-Host "Please check the server window for errors" -ForegroundColor Yellow
    }
} else {
    Write-Host "[FAIL] OPENAI_API_KEY not found in OS environment!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please set API key using:" -ForegroundColor Yellow
    Write-Host "  setx OPENAI_API_KEY `"sk-xxxxx`"" -ForegroundColor White
    Write-Host "Then restart this terminal and run again." -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
