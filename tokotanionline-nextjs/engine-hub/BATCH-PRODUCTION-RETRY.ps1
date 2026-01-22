# BATCH PRODUCTION RETRY - 5 ARTICLES (VALIDASI ULANG)
# CTO FINAL - LOCKED: Retry batch dengan keyword yang sama setelah rollback blacklist
# Date: 2026-01-12

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "BATCH PRODUCTION RETRY - 5 ARTICLES" -ForegroundColor Cyan
Write-Host "MODE: PRODUCTION (VALIDASI ULANG)" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Catatan: Batch ini menggunakan keyword yang sama setelah rollback blacklist" -ForegroundColor Yellow
Write-Host "         dan setup API key permanen via .env file" -ForegroundColor Yellow
Write-Host ""

# Configuration
$serverUrl = "http://localhost:8090"
$endpoint = "/api/engine/ai/batch-production"

# Keywords yang sama (setelah rollback blacklist)
$keywords = @(
    "cara memilih pupuk organik terbaik",
    "pengendalian hama tanaman padi",
    "teknik budidaya cabe rawit",
    "pemupukan tanaman jagung",
    "cara mengatasi penyakit tanaman tomat"
)

# Payload sesuai CTO specification
$payload = @{
    mode = "PRODUCTION"
    batchSize = 5
    contentType = "DERIVATIVE_LONG"
    imageMode = "RAW_PHOTO"
    storage = "LOCAL"
    retryLogic = "ON"
    keywordRotation = "ON"
    keywords = $keywords
    category = "K1"
    language = "id-ID"
} | ConvertTo-Json -Depth 10

Write-Host "Configuration:" -ForegroundColor Yellow
Write-Host "  Mode: PRODUCTION" -ForegroundColor Gray
Write-Host "  Batch Size: 5" -ForegroundColor Gray
Write-Host "  Content Type: DERIVATIVE_LONG" -ForegroundColor Gray
Write-Host "  Image Mode: RAW_PHOTO" -ForegroundColor Gray
Write-Host "  Retry Logic: ON" -ForegroundColor Gray
Write-Host "  Keyword Rotation: ON" -ForegroundColor Gray
Write-Host "  Keywords: $($keywords.Count) (same as previous batch)" -ForegroundColor Gray
Write-Host ""

# Check if .env file exists
Write-Host "Checking .env file..." -ForegroundColor Yellow
if (Test-Path ".\.env") {
    Write-Host "[OK] .env file found" -ForegroundColor Green
} else {
    Write-Host "[FAIL] .env file not found!" -ForegroundColor Red
    Write-Host "  Please create .env file with OPENAI_API_KEY" -ForegroundColor Yellow
    exit 1
}

# Check if server is running
Write-Host "Checking server status..." -ForegroundColor Yellow
try {
    $healthCheck = Invoke-RestMethod -Uri "$serverUrl/health" -Method GET -TimeoutSec 5
    Write-Host "[OK] Server is running" -ForegroundColor Green
} catch {
    Write-Host "[FAIL] Server is not running or not accessible" -ForegroundColor Red
    Write-Host "  Please start the server first: go run cmd/server/main.go" -ForegroundColor Yellow
    Write-Host "  Make sure .env file is loaded (check server logs for 'Loaded .env file')" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "Executing batch production retry..." -ForegroundColor Yellow
Write-Host ""

# Execute batch production
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$outputFile = "batch-production-retry-result-$timestamp.json"

try {
    $response = Invoke-RestMethod -Uri "$serverUrl$endpoint" -Method POST -Body $payload -ContentType "application/json" -TimeoutSec 600
    
    # Save full response
    $response | ConvertTo-Json -Depth 10 | Out-File $outputFile -Encoding UTF8
    
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "BATCH PRODUCTION REPORT (5) - RETRY" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    
    # Extract results
    $totalGenerated = $response.totalGenerated
    $totalFailed = $response.totalFailed
    $blacklist = $response.blacklist
    $articles = $response.articles
    
    Write-Host "Total Success: $totalGenerated" -ForegroundColor $(if ($totalGenerated -gt 0) { "Green" } else { "Red" })
    Write-Host "Total Failed: $totalFailed" -ForegroundColor $(if ($totalFailed -eq 0) { "Green" } else { "Red" })
    Write-Host ""
    
    # Blacklist keywords
    if ($blacklist.Count -gt 0) {
        Write-Host "Blacklist Keywords: $($blacklist.Count)" -ForegroundColor Yellow
        foreach ($kw in $blacklist) {
            Write-Host "  - $kw" -ForegroundColor Red
        }
        Write-Host ""
    } else {
        Write-Host "Blacklist Keywords: 0" -ForegroundColor Green
        Write-Host ""
    }
    
    # Article details
    Write-Host "Article Details:" -ForegroundColor Yellow
    for ($i = 0; $i -lt $articles.Count; $i++) {
        $article = $articles[$i]
        $statusColor = if ($article.success) { "Green" } else { "Red" }
        $statusIcon = if ($article.success) { "[OK]" } else { "[FAIL]" }
        
        Write-Host "  $($i + 1). $statusIcon Keyword: $($article.keyword)" -ForegroundColor $statusColor
        Write-Host "     Status: $($article.status)" -ForegroundColor Gray
        Write-Host "     Attempt: $($article.attempt)" -ForegroundColor Gray
        
        if ($article.success) {
            Write-Host "     Title: $($article.title)" -ForegroundColor Gray
            Write-Host "     Word Count: $($article.wordCount)" -ForegroundColor Gray
            Write-Host "     Images: $($article.imagesCount)" -ForegroundColor Gray
        } else {
            Write-Host "     Error: $($article.failureReason)" -ForegroundColor Red
            if ($article.error) {
                Write-Host "     Details: $($article.error)" -ForegroundColor DarkRed
            }
        }
        Write-Host ""
    }
    
    # Anomali check
    $anomali = @()
    if ($totalFailed -gt 0) {
        $anomali += "Some articles failed generation"
    }
    if ($blacklist.Count -gt 0) {
        $anomali += "$($blacklist.Count) keywords blacklisted"
    }
    if ($totalGenerated -lt 5) {
        $anomali += "Incomplete batch (generated $totalGenerated/5)"
    }
    
    Write-Host "Anomali: " -NoNewline -ForegroundColor Yellow
    if ($anomali.Count -eq 0) {
        Write-Host "TIDAK ADA" -ForegroundColor Green
    } else {
        Write-Host "ADA" -ForegroundColor Red
        foreach ($a in $anomali) {
            Write-Host "  - $a" -ForegroundColor Yellow
        }
    }
    Write-Host ""
    
    # Catatan
    Write-Host "Catatan:" -ForegroundColor Yellow
    if ($totalGenerated -eq 5) {
        Write-Host "  - Semua artikel berhasil di-generate" -ForegroundColor Green
        Write-Host "  - Blacklist rollback berhasil (keyword yang sama sekarang berhasil)" -ForegroundColor Green
    } elseif ($totalGenerated -gt 0) {
        Write-Host "  - Sebagian artikel berhasil (validasi API key berhasil)" -ForegroundColor Yellow
        Write-Host "  - Beberapa keyword mungkin perlu review manual" -ForegroundColor Yellow
    } else {
        Write-Host "  - Semua artikel gagal (perlu investigasi lebih lanjut)" -ForegroundColor Red
    }
    Write-Host ""
    
    Write-Host "Full response saved to: $outputFile" -ForegroundColor Gray
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    
} catch {
    Write-Host "[FAIL] Batch production retry failed!" -ForegroundColor Red
    Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Red
    
    if ($_.ErrorDetails.Message) {
        Write-Host "  Details: $($_.ErrorDetails.Message)" -ForegroundColor Red
    }
    
    exit 1
}
