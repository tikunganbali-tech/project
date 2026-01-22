# Run Phase A Test
# This script runs the Phase A backend runtime verification test

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "PHASE A - BACKEND RUNTIME VERIFICATION" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if API key is set
if (-not $env:OPENAI_API_KEY -and -not $env:AI_API_KEY) {
    Write-Host "WARNING: OPENAI_API_KEY or AI_API_KEY not set" -ForegroundColor Yellow
    Write-Host "Test A1 (Normal Pass Flow) may fail if API key is required" -ForegroundColor Yellow
    Write-Host ""
}

# Set default environment variables if not set
if (-not $env:AI_API_URL) {
    $env:AI_API_URL = "https://api.openai.com/v1/chat/completions"
}

if (-not $env:AI_MODEL) {
    $env:AI_MODEL = "gpt-4o-mini"
}

Write-Host "Running Phase A test..." -ForegroundColor Yellow
Write-Host ""

# Run the test
.\test-phase-a.exe

Write-Host ""
Write-Host "Test completed. Check the output above and the generated report file." -ForegroundColor Green
