# START SERVER - PRODUCTION MODE
# FASE B - B1: Server dengan environment variable OS (bukan .env)
# HARUS kill semua process Go sebelum start

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "STARTING SERVER - PRODUCTION MODE" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# FASE B - B1: MATIKAN SEMUA PROCESS GO SEBELUM START
Write-Host "[B1] Killing all Go processes..." -ForegroundColor Yellow
& "$PSScriptRoot\KILL-ALL-GO-PROCESSES.ps1"
Write-Host ""

# Check API key from OS environment
$apiKey = [System.Environment]::GetEnvironmentVariable("OPENAI_API_KEY", "User")
if (-not $apiKey) {
    $apiKey = [System.Environment]::GetEnvironmentVariable("OPENAI_API_KEY", "Machine")
}

# FASE B - B1: VALIDASI ENV DI OS
if ($apiKey) {
    # Validasi panjang > 100 char
    if ($apiKey.Length -le 100) {
        Write-Host "[FAIL] OPENAI_API_KEY is too short (length: $($apiKey.Length))" -ForegroundColor Red
        Write-Host "Expected > 100 characters. Please verify your API key." -ForegroundColor Yellow
        exit 1
    }
    
    # Validasi tidak ada spasi di awal/akhir
    $trimmedKey = $apiKey.Trim()
    if ($trimmedKey -ne $apiKey) {
        Write-Host "[FAIL] OPENAI_API_KEY contains leading/trailing spaces" -ForegroundColor Red
        Write-Host "Please set API key without spaces." -ForegroundColor Yellow
        exit 1
    }
    
    # Validasi tidak ada quote salah
    if ($apiKey -match '["'']') {
        Write-Host "[FAIL] OPENAI_API_KEY contains quotes" -ForegroundColor Red
        Write-Host "Please set API key without quotes in the value itself." -ForegroundColor Yellow
        exit 1
    }
    
    Write-Host "[OK] OPENAI_API_KEY found in OS environment (length: $($apiKey.Length))" -ForegroundColor Green
    Write-Host "[OK] API key validation passed" -ForegroundColor Green
    $env:OPENAI_API_KEY = $apiKey
} else {
    Write-Host "[FAIL] OPENAI_API_KEY not found in OS environment!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please set API key using:" -ForegroundColor Yellow
    Write-Host "  setx OPENAI_API_KEY `"sk-xxxxx`"" -ForegroundColor White
    Write-Host ""
    Write-Host "Then restart this terminal and run this script again." -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "Starting server..." -ForegroundColor Yellow
Write-Host "Server will FAIL FAST if API key is not available." -ForegroundColor Gray
Write-Host ""

# Start server
cd $PSScriptRoot
go run cmd/server/main.go
