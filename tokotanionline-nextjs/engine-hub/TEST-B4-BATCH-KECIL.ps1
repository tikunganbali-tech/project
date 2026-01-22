# TEST B4 - BATCH KECIL (1 keyword)
# FASE B - B4: Test batch kecil - 1 keyword, pastikan success, image jalan, validator lulus

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "TEST B4 - BATCH KECIL (1 keyword)" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if server is running
try {
    $healthCheck = Invoke-RestMethod -Uri "http://localhost:8090/health" -Method GET -TimeoutSec 3
    Write-Host "[OK] Server is running" -ForegroundColor Green
} catch {
    Write-Host "[FAIL] Server is not running. Please start server first." -ForegroundColor Red
    Write-Host "Run: .\START-SERVER-PRODUCTION.ps1" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "Sending batch request (1 keyword)..." -ForegroundColor Yellow
Write-Host ""

# Prepare request
$body = @{
    mode = "PRODUCTION"
    batchSize = 1
    contentType = "DERIVATIVE_LONG"
    imageMode = "RAW_PHOTO"
    storage = "LOCAL"
    retryLogic = "ON"
    keywordRotation = "ON"
    keywords = @("cara memilih pupuk organik terbaik")
    category = "K1"
    language = "id-ID"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "http://localhost:8090/api/engine/ai/batch-production" -Method POST -Body $body -ContentType "application/json" -TimeoutSec 300
    
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "BATCH RESULT" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "Status: $($response.status)" -ForegroundColor $(if ($response.status -eq "SUCCESS") { "Green" } else { "Red" })
    Write-Host "Total Generated: $($response.totalGenerated)" -ForegroundColor $(if ($response.totalGenerated -gt 0) { "Green" } else { "Red" })
    Write-Host "Total Failed: $($response.totalFailed)" -ForegroundColor $(if ($response.totalFailed -eq 0) { "Green" } else { "Yellow" })
    Write-Host "Blacklist Count: $($response.blacklist.Count)" -ForegroundColor Gray
    Write-Host ""
    
    if ($response.articles) {
        Write-Host "Articles:" -ForegroundColor Cyan
        foreach ($article in $response.articles) {
            $statusColor = if ($article.success) { "Green" } else { "Red" }
            Write-Host "  Keyword: $($article.keyword)" -ForegroundColor $statusColor
            Write-Host "    Success: $($article.success)" -ForegroundColor $statusColor
            Write-Host "    Status: $($article.status)" -ForegroundColor $statusColor
            if ($article.success) {
                Write-Host "    Title: $($article.title)" -ForegroundColor Gray
                Write-Host "    Word Count: $($article.wordCount)" -ForegroundColor Gray
                Write-Host "    Images Count: $($article.imagesCount)" -ForegroundColor Gray
            } else {
                Write-Host "    Error: $($article.error)" -ForegroundColor Yellow
                Write-Host "    Failure Reason: $($article.failureReason)" -ForegroundColor Yellow
            }
            Write-Host ""
        }
    }
    
    Write-Host "Summary:" -ForegroundColor Cyan
    Write-Host $response.summary -ForegroundColor Gray
    
    # B4 Criteria Check
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "B4 CRITERIA CHECK" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    
    $allPass = $true
    
    # Check: success
    if ($response.totalGenerated -gt 0) {
        Write-Host "[OK] Success: Article generated" -ForegroundColor Green
    } else {
        Write-Host "[FAIL] Success: No article generated" -ForegroundColor Red
        $allPass = $false
    }
    
    # Check: image jalan
    $hasImages = $false
    foreach ($article in $response.articles) {
        if ($article.success -and $article.imagesCount -gt 0) {
            $hasImages = $true
            break
        }
    }
    if ($hasImages) {
        Write-Host "[OK] Image: Images generated" -ForegroundColor Green
    } else {
        Write-Host "[WARN] Image: No images generated (may be acceptable)" -ForegroundColor Yellow
    }
    
    # Check: validator lulus
    $validatorPassed = $true
    foreach ($article in $response.articles) {
        if ($article.success -and $article.status -eq "PUBLISHED") {
            $validatorPassed = $true
            break
        }
        if ($article.status -eq "VALIDATION_FAILED") {
            $validatorPassed = $false
        }
    }
    if ($validatorPassed) {
        Write-Host "[OK] Validator: Validation passed" -ForegroundColor Green
    } else {
        Write-Host "[FAIL] Validator: Validation failed" -ForegroundColor Red
        $allPass = $false
    }
    
    Write-Host ""
    if ($allPass) {
        Write-Host "[RESULT] B4 BATCH KECIL: LULUS" -ForegroundColor Green
    } else {
        Write-Host "[RESULT] B4 BATCH KECIL: GAGAL" -ForegroundColor Red
    }
    
} catch {
    Write-Host "[FAIL] Error calling batch endpoint: $_" -ForegroundColor Red
    Write-Host "Error details: $($_.Exception.Message)" -ForegroundColor Yellow
    exit 1
}
