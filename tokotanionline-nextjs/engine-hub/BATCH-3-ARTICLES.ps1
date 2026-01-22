# BATCH GENERATION TEST - 3 Articles
# Mode: DERIVATIVE_LONG, Category: K1
# Tests consistency across 3 articles

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "BATCH GENERATION TEST (3 ARTICLES)" -ForegroundColor Cyan
Write-Host "Mode: DERIVATIVE_LONG, Category: K1" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "⚠️  PREREQUISITE: Server must be running on port 8090" -ForegroundColor Yellow
Write-Host "   Run: go run cmd/server/main.go" -ForegroundColor Gray
Write-Host ""

# Check if server is running
try {
    $health = Invoke-RestMethod -Uri "http://localhost:8090/health" -TimeoutSec 2 -ErrorAction Stop
    Write-Host "✅ Server is running" -ForegroundColor Green
    Write-Host ""
} catch {
    Write-Host "❌ Server is NOT running on port 8090" -ForegroundColor Red
    Write-Host "   Please start server first: go run cmd/server/main.go" -ForegroundColor Yellow
    exit 1
}

# Load outline
$outlineFile = "..\docs\OUTLINE-K1-CORNERSTONE-PANDUAN-DASAR.md"
if (-not (Test-Path $outlineFile)) {
    Write-Host "❌ Outline file not found: $outlineFile" -ForegroundColor Red
    exit 1
}

$outlineContent = Get-Content $outlineFile | Select-Object -Skip 27
$outlineText = $outlineContent -join "`n"

# Set API keys
$env:OPENAI_API_KEY = "YOUR_OPENAI_API_KEY_HERE"
$env:IMAGE_API_KEY = $env:OPENAI_API_KEY

# Batch results
$batchResults = @()
$serverPort = 8090
$articleCount = 3

Write-Host "Generating $articleCount articles..." -ForegroundColor Yellow
Write-Host ""

for ($i = 1; $i -le $articleCount; $i++) {
    Write-Host "----------------------------------------" -ForegroundColor Cyan
    Write-Host "ARTIKEL $i / $articleCount" -ForegroundColor Cyan
    Write-Host "----------------------------------------" -ForegroundColor Cyan
    Write-Host ""
    
    $articleResult = @{
        Number = $i
        Success = $false
        Validator = "FAIL"
        ImageStyle = "UNKNOWN"
        ImageLocal = "FAIL"
        Error = $null
        Slug = $null
        LocalPath = $null
    }
    
    try {
        $payload = @{
            contentType = "DERIVATIVE_LONG"
            category = "K1"
            outline = $outlineText.Trim()
            language = "id-ID"
        } | ConvertTo-Json -Depth 10
        
        Write-Host "  Sending request..." -ForegroundColor Gray
        $startTime = Get-Date
        $response = Invoke-RestMethod -Method POST -Uri "http://localhost:$serverPort/api/engine/ai/generate" -Body $payload -ContentType "application/json; charset=utf-8" -TimeoutSec 600
        $duration = ((Get-Date) - $startTime).TotalSeconds
        
        Write-Host "  ✅ Generation completed in $([Math]::Round($duration, 1))s" -ForegroundColor Green
        Write-Host ""
        
        # Check validator
        if ($response.status -eq "DRAFT_AI" -or $response.status -eq "SUCCESS") {
            Write-Host "  ✅ Validator: PASS" -ForegroundColor Green
            $articleResult.Validator = "PASS"
        } else {
            Write-Host "  ❌ Validator: FAIL (Status: $($response.status))" -ForegroundColor Red
            $articleResult.Validator = "FAIL"
            $articleResult.Error = "Validator failed: $($response.status)"
            $batchResults += $articleResult
            Write-Host ""
            Write-Host "❌ BATCH STOPPED: Artikel $i failed validation" -ForegroundColor Red
            break
        }
        
        # Check image generation
        $imageCount = if ($response.images) { $response.images.Count } else { 0 }
        if ($imageCount -gt 0) {
            $firstImage = $response.images[0]
            $prompt = $firstImage.prompt
            
            # Check image style (RAW UNEDITED PHOTOGRAPH)
            if ($prompt -match "RAW.*UNEDITED.*PHOTOGRAPH") {
                Write-Host "  ✅ Image style: FOTO MANUSIA (RAW UNEDITED)" -ForegroundColor Green
                $articleResult.ImageStyle = "FOTO MANUSIA"
            } else {
                Write-Host "  ⚠️  Image style: CHECK NEEDED (prompt doesn't match template)" -ForegroundColor Yellow
                $articleResult.ImageStyle = "CHECK NEEDED"
            }
            
            # Check local storage
            if ($firstImage.localPath -and $firstImage.localPath -ne "") {
                $localPath = $firstImage.localPath
                Write-Host "  ✅ Image local: OK ($localPath)" -ForegroundColor Green
                $articleResult.ImageLocal = "OK"
                $articleResult.LocalPath = $localPath
                
                # Extract slug from path
                if ($localPath -match "/uploads/([^/]+)/") {
                    $articleResult.Slug = $matches[1]
                }
            } else {
                Write-Host "  ❌ Image local: FAIL (no local path)" -ForegroundColor Red
                $articleResult.ImageLocal = "FAIL"
                $articleResult.Error = "Image not saved locally"
                $batchResults += $articleResult
                Write-Host ""
                Write-Host "❌ BATCH STOPPED: Artikel $i image not saved locally" -ForegroundColor Red
                break
            }
        } else {
            Write-Host "  ❌ No images generated" -ForegroundColor Red
            $articleResult.ImageStyle = "NO IMAGES"
            $articleResult.ImageLocal = "FAIL"
            $articleResult.Error = "No images generated"
            $batchResults += $articleResult
            Write-Host ""
            Write-Host "❌ BATCH STOPPED: Artikel $i no images generated" -ForegroundColor Red
            break
        }
        
        $articleResult.Success = $true
        $batchResults += $articleResult
        
        # Save result
        $timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
        $response | ConvertTo-Json -Depth 10 | Out-File "result-batch-$i-$timestamp.json" -Encoding UTF8
        if ($response.content.body) {
            $response.content.body | Out-File "article-batch-$i-$timestamp.md" -Encoding UTF8
        }
        
        Write-Host "  Saved: result-batch-$i-$timestamp.json" -ForegroundColor Gray
        Write-Host ""
        
        # Small delay between requests
        if ($i -lt $articleCount) {
            Start-Sleep -Seconds 2
        }
        
    } catch {
        Write-Host "  ❌ ERROR: $($_.Exception.Message)" -ForegroundColor Red
        $articleResult.Error = $_.Exception.Message
        $batchResults += $articleResult
        Write-Host ""
        Write-Host "❌ BATCH STOPPED: Artikel $i failed with error" -ForegroundColor Red
        break
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "BATCH GENERATION REPORT ($($batchResults.Count))" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$successCount = ($batchResults | Where-Object { $_.Success -eq $true }).Count

if ($successCount -eq $articleCount) {
    # All passed - generate report
    for ($i = 0; $i -lt $batchResults.Count; $i++) {
        $result = $batchResults[$i]
        $num = $i + 1
        Write-Host "Artikel $($num):" -ForegroundColor Cyan
        Write-Host "  - Validator: $($result.Validator)" -ForegroundColor $(if ($result.Validator -eq "PASS") { "Green" } else { "Red" })
        Write-Host "  - Image style: $($result.ImageStyle)" -ForegroundColor $(if ($result.ImageStyle -eq "FOTO MANUSIA") { "Green" } else { "Yellow" })
        Write-Host "  - Image local: $($result.ImageLocal)" -ForegroundColor $(if ($result.ImageLocal -eq "OK") { "Green" } else { "Red" })
        Write-Host ""
    }
    
    Write-Host "Anomali: TIDAK ADA" -ForegroundColor Green
    Write-Host ""
    Write-Host "✅ ALL $successCount ARTICLES GENERATED SUCCESSFULLY" -ForegroundColor Green
    
    # File system verification
    Write-Host ""
    Write-Host "File System Verification:" -ForegroundColor Cyan
    foreach ($result in $batchResults) {
        if ($result.Slug) {
            $uploadPath = "..\public\uploads\$($result.Slug)"
            if (Test-Path $uploadPath) {
                $files = Get-ChildItem $uploadPath -File
                Write-Host "  ✅ $($result.Slug): $($files.Count) file(s)" -ForegroundColor Green
            } else {
                Write-Host "  ⚠️  $($result.Slug): Folder not found" -ForegroundColor Yellow
            }
        }
    }
} else {
    # Some failed
    Write-Host "❌ BATCH INCOMPLETE: $successCount / $articleCount articles succeeded" -ForegroundColor Red
    Write-Host ""
    
    for ($i = 0; $i -lt $batchResults.Count; $i++) {
        $result = $batchResults[$i]
        $num = $i + 1
        Write-Host "Artikel $($num):" -ForegroundColor Cyan
        if ($result.Success) {
            Write-Host "  - Validator: $($result.Validator)" -ForegroundColor Green
            Write-Host "  - Image style: $($result.ImageStyle)" -ForegroundColor Green
            Write-Host "  - Image local: $($result.ImageLocal)" -ForegroundColor Green
        } else {
            Write-Host "  - Status: FAILED" -ForegroundColor Red
            Write-Host "  - Error: $($result.Error)" -ForegroundColor Red
        }
        Write-Host ""
    }
    
    Write-Host "Anomali: ADA" -ForegroundColor Red
    $failedArticles = $batchResults | Where-Object { $_.Success -eq $false }
    foreach ($failed in $failedArticles) {
        Write-Host "  - Artikel $($failed.Number): $($failed.Error)" -ForegroundColor Red
    }
}

Write-Host ""
