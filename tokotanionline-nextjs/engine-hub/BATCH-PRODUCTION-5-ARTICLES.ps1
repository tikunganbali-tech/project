# BATCH PRODUCTION - 5 ARTICLES (OPERASIONAL TERKONTROL)
# CTO FINAL - LOCKED: Production batch generation
# Date: 2026-01-11

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "BATCH PRODUCTION - 5 ARTICLES" -ForegroundColor Cyan
Write-Host "MODE: PRODUCTION (OPERASIONAL TERKONTROL)" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Configuration
$serverUrl = "http://localhost:8090"
$endpoint = "/api/engine/ai/batch-production"

# Keywords untuk batch production (5 keywords pertanian)
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
Write-Host "  Keywords: $($keywords.Count)" -ForegroundColor Gray
Write-Host ""

# Check if server is running
Write-Host "Checking server status..." -ForegroundColor Yellow
try {
    $healthCheck = Invoke-RestMethod -Uri "$serverUrl/health" -Method GET -TimeoutSec 5
    Write-Host "[OK] Server is running" -ForegroundColor Green
} catch {
    Write-Host "[FAIL] Server is not running or not accessible" -ForegroundColor Red
    Write-Host "  Please start the server first: go run cmd/server/main.go" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "Executing batch production..." -ForegroundColor Yellow
Write-Host ""

# Execute batch production
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$outputFile = "batch-production-result-$timestamp.json"

try {
    $response = Invoke-RestMethod -Uri "$serverUrl$endpoint" -Method POST -Body $payload -ContentType "application/json" -TimeoutSec 600
    
    # Save full response
    $response | ConvertTo-Json -Depth 10 | Out-File $outputFile -Encoding UTF8
    
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "BATCH PRODUCTION REPORT (5)" -ForegroundColor Cyan
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
    
    # Siap lanjut scale harian
    $siapScale = ($totalGenerated -ge 4) -and ($totalFailed -eq 0) -and ($blacklist.Count -eq 0)
    Write-Host "Siap lanjut scale harian: " -NoNewline -ForegroundColor Yellow
    if ($siapScale) {
        Write-Host "YA" -ForegroundColor Green
    } else {
        Write-Host "TIDAK" -ForegroundColor Red
        Write-Host "  Reason: " -NoNewline -ForegroundColor Gray
        if ($totalGenerated -lt 4) {
            Write-Host "Less than 4 articles generated" -ForegroundColor Gray
        } elseif ($totalFailed -gt 0) {
            Write-Host "Some articles failed" -ForegroundColor Gray
        } elseif ($blacklist.Count -gt 0) {
            Write-Host "Keywords blacklisted" -ForegroundColor Gray
        }
    }
    Write-Host ""
    
    Write-Host "Full response saved to: $outputFile" -ForegroundColor Gray
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    
} catch {
    Write-Host "[FAIL] Batch production failed!" -ForegroundColor Red
    Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Red
    
    if ($_.ErrorDetails.Message) {
        Write-Host "  Details: $($_.ErrorDetails.Message)" -ForegroundColor Red
    }
    
    exit 1
}
