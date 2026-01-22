# TEST B4 - BATCH GAGAL TERKONTROL (Simulasi API key salah)
# FASE B - B4: Test batch gagal terkontrol - simulasikan API key salah
# Expected: server mati, tidak ada content tercatat, tidak ada blacklist

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "TEST B4 - BATCH GAGAL TERKONTROL" -ForegroundColor Cyan
Write-Host "Simulasi: API key salah" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "WARNING: This test will temporarily set a wrong API key" -ForegroundColor Yellow
Write-Host "The server should FAIL FAST and stop." -ForegroundColor Yellow
Write-Host ""

# Save current API key
$originalApiKey = [System.Environment]::GetEnvironmentVariable("OPENAI_API_KEY", "User")
if (-not $originalApiKey) {
    $originalApiKey = [System.Environment]::GetEnvironmentVariable("OPENAI_API_KEY", "Machine")
}

if (-not $originalApiKey) {
    Write-Host "[FAIL] No API key found. Cannot run this test." -ForegroundColor Red
    exit 1
}

Write-Host "[INFO] Original API key saved (length: $($originalApiKey.Length))" -ForegroundColor Gray
Write-Host ""

# Check if server is running
$serverRunning = $false
try {
    $healthCheck = Invoke-RestMethod -Uri "http://localhost:8090/health" -Method GET -TimeoutSec 3
    $serverRunning = $true
    Write-Host "[INFO] Server is currently running" -ForegroundColor Yellow
    Write-Host "[INFO] This test requires server to be stopped first" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Please stop the server, then:" -ForegroundColor Yellow
    Write-Host "1. Set wrong API key: setx OPENAI_API_KEY `"wrong-key-123`"" -ForegroundColor White
    Write-Host "2. Start server: .\START-SERVER-PRODUCTION.ps1" -ForegroundColor White
    Write-Host "3. Expected: Server should FAIL FAST and not start" -ForegroundColor White
    Write-Host "4. Restore API key: setx OPENAI_API_KEY `"$originalApiKey`"" -ForegroundColor White
    Write-Host ""
    Write-Host "Or run this test manually by:" -ForegroundColor Yellow
    Write-Host "1. Stop server" -ForegroundColor White
    Write-Host "2. Set wrong API key in OS environment" -ForegroundColor White
    Write-Host "3. Try to start server" -ForegroundColor White
    Write-Host "4. Verify server FAILS FAST" -ForegroundColor White
    Write-Host "5. Restore correct API key" -ForegroundColor White
    exit 0
} catch {
    Write-Host "[OK] Server is not running (expected for this test)" -ForegroundColor Green
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "TEST SCENARIO" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "This test simulates API key error scenario:" -ForegroundColor Yellow
Write-Host "1. Server should FAIL FAST if API key is wrong/missing" -ForegroundColor White
Write-Host "2. No content should be recorded" -ForegroundColor White
Write-Host "3. No blacklist should be created" -ForegroundColor White
Write-Host ""

Write-Host "MANUAL TEST STEPS:" -ForegroundColor Cyan
Write-Host "1. Stop server if running" -ForegroundColor White
Write-Host "2. Set wrong API key: setx OPENAI_API_KEY `"wrong-key-test-123`"" -ForegroundColor White
Write-Host "3. Open NEW terminal (setx requires new session)" -ForegroundColor White
Write-Host "4. Try to start server: .\START-SERVER-PRODUCTION.ps1" -ForegroundColor White
Write-Host "5. Expected: Server should log.Fatal() and NOT start" -ForegroundColor Green
Write-Host "6. Verify: No server listening on port 8090" -ForegroundColor White
Write-Host "7. Restore correct API key: setx OPENAI_API_KEY `"$originalApiKey`"" -ForegroundColor White
Write-Host "8. Restart terminal and start server normally" -ForegroundColor White
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "B4 CRITERIA CHECK" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "After manual test, verify:" -ForegroundColor Yellow
Write-Host ""
Write-Host "[ ] Server tidak bisa start tanpa API key" -ForegroundColor White
Write-Host "[ ] Server pasti start jika API key ada" -ForegroundColor White
Write-Host "[ ] Batch & server membaca env yang sama" -ForegroundColor White
Write-Host "[ ] Tidak ada content tercatat saat API key salah" -ForegroundColor White
Write-Host "[ ] Tidak ada blacklist saat API key salah" -ForegroundColor White
Write-Host ""

Write-Host "[RESULT] B4 BATCH GAGAL TERKONTROL: MANUAL TEST REQUIRED" -ForegroundColor Yellow
Write-Host "Please follow manual test steps above." -ForegroundColor Yellow
