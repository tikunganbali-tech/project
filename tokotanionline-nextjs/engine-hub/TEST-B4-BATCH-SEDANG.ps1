# TEST B4 - BATCH SEDANG (3 keywords)
# FASE B - B4: Test batch sedang - 3 keywords, semua tidak crash, retry terkendali, tidak duplikasi

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "TEST B4 - BATCH SEDANG (3 keywords)" -ForegroundColor Cyan
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
Write-Host "Sending batch request (3 keywords)..." -ForegroundColor Yellow
Write-Host ""

# Prepare request with 3 keywords
$body = @{
    mode = "PRODUCTION"
    batchSize = 3
    contentType = "DERIVATIVE_LONG"
    imageMode = "RAW_PHOTO"
    storage = "LOCAL"
    retryLogic = "ON"
    keywordRotation = "ON"
    keywords = @(
        "pengendalian hama tanaman padi",
        "teknik budidaya cabe rawit",
        "pemupukan tanaman jagung"
    )
    category = "K1"
    language = "id-ID"
} | ConvertTo-Json

try {
    $startTime = Get-Date
    $response = Invoke-RestMethod -Uri "http://localhost:8090/api/engine/ai/batch-production" -Method POST -Body $body -ContentType "application/json" -TimeoutSec 600
    $endTime = Get-Date
    $duration = ($endTime - $startTime).TotalSeconds
    
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "BATCH RESULT" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "Duration: $([math]::Round($duration, 2)) seconds" -ForegroundColor Gray
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
            Write-Host "    Attempt: $($article.attempt)" -ForegroundColor Gray
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
    
    # Check: tidak crash
    if ($response.status -ne $null) {
        Write-Host "[OK] Tidak crash: Server responded" -ForegroundColor Green
    } else {
        Write-Host "[FAIL] Tidak crash: No response" -ForegroundColor Red
        $allPass = $false
    }
    
    # Check: retry terkendali (max 3 attempts per keyword)
    $retryControlled = $true
    foreach ($article in $response.articles) {
        if ($article.attempt -gt 3) {
            Write-Host "[FAIL] Retry terkendali: Keyword '$($article.keyword)' has $($article.attempt) attempts (max 3)" -ForegroundColor Red
            $retryControlled = $false
            $allPass = $false
        }
    }
    if ($retryControlled) {
        Write-Host "[OK] Retry terkendali: All keywords within 3 attempts" -ForegroundColor Green
    }
    
    # Check: tidak duplikasi (tidak ada keyword yang sama di results)
    $keywords = @()
    $hasDuplication = $false
    foreach ($article in $response.articles) {
        if ($keywords -contains $article.keyword) {
            Write-Host "[FAIL] Tidak duplikasi: Duplicate keyword found: $($article.keyword)" -ForegroundColor Red
            $hasDuplication = $true
            $allPass = $false
        } else {
            $keywords += $article.keyword
        }
    }
    if (-not $hasDuplication) {
        Write-Host "[OK] Tidak duplikasi: No duplicate keywords" -ForegroundColor Green
    }
    
    # Check: semua keywords diproses
    $expectedKeywords = 3
    $processedKeywords = $response.articles.Count
    if ($processedKeywords -eq $expectedKeywords) {
        Write-Host "[OK] Semua keywords diproses: $processedKeywords/$expectedKeywords" -ForegroundColor Green
    } else {
        Write-Host "[WARN] Semua keywords diproses: $processedKeywords/$expectedKeywords processed" -ForegroundColor Yellow
    }
    
    Write-Host ""
    if ($allPass) {
        Write-Host "[RESULT] B4 BATCH SEDANG: LULUS" -ForegroundColor Green
    } else {
        Write-Host "[RESULT] B4 BATCH SEDANG: GAGAL" -ForegroundColor Red
    }
    
} catch {
    Write-Host "[FAIL] Error calling batch endpoint: $_" -ForegroundColor Red
    Write-Host "Error details: $($_.Exception.Message)" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "[RESULT] B4 BATCH SEDANG: GAGAL (Server crash or error)" -ForegroundColor Red
    exit 1
}
