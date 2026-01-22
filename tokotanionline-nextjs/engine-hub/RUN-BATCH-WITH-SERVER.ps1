# Complete batch generation with auto server management

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "BATCH GENERATION TEST (3 ARTICLES)" -ForegroundColor Cyan
Write-Host "Mode: DERIVATIVE_LONG, Category: K1" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# STEP 1: Stop existing server
Write-Host "STEP 1: Stopping existing server..." -ForegroundColor Yellow
$ports = @(8080, 8090)
foreach ($port in $ports) {
    $connections = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    if ($connections) {
        foreach ($conn in $connections) {
            $procId = $conn.OwningProcess
            Write-Host "  Stopping process $procId on port $port" -ForegroundColor Gray
            Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
        }
        Start-Sleep -Seconds 2
    }
}
Write-Host "  ✅ Ports cleared" -ForegroundColor Green
Write-Host ""

# STEP 2: Build
Write-Host "STEP 2: Building Go server..." -ForegroundColor Yellow
$buildOutput = go build ./... 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "  ❌ Build failed" -ForegroundColor Red
    $buildOutput
    exit 1
}
Write-Host "  ✅ Build success" -ForegroundColor Green
Write-Host ""

# STEP 3: Start server
Write-Host "STEP 3: Starting server..." -ForegroundColor Yellow
$env:OPENAI_API_KEY = "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"
$env:IMAGE_API_KEY = $env:OPENAI_API_KEY

$serverJob = Start-Job -ScriptBlock {
    Set-Location $using:PWD
    $env:OPENAI_API_KEY = $using:env:OPENAI_API_KEY
    $env:IMAGE_API_KEY = $using:env:IMAGE_API_KEY
    go run cmd/server/main.go 2>&1
}

Start-Sleep -Seconds 5

$maxWait = 30
$waited = 0
$serverReady = $false
$serverPort = 8090

while ($waited -lt $maxWait) {
    try {
        $health = Invoke-RestMethod -Uri "http://localhost:$serverPort/health" -TimeoutSec 1 -ErrorAction Stop
        $serverReady = $true
        Write-Host "  ✅ Server ready on port $serverPort" -ForegroundColor Green
        break
    } catch {
        Start-Sleep -Seconds 2
        $waited += 2
    }
}

if (-not $serverReady) {
    Write-Host "  ❌ Server failed to start" -ForegroundColor Red
    Stop-Job $serverJob -ErrorAction SilentlyContinue
    Remove-Job $serverJob -ErrorAction SilentlyContinue
    exit 1
}
Write-Host ""

# STEP 4: Run batch generation
Write-Host "STEP 4: Running batch generation (3 articles)..." -ForegroundColor Yellow
Write-Host ""

# Load outline
$outlineFile = "..\docs\OUTLINE-K1-CORNERSTONE-PANDUAN-DASAR.md"
if (-not (Test-Path $outlineFile)) {
    Write-Host "  ❌ Outline file not found: $outlineFile" -ForegroundColor Red
    Stop-Job $serverJob -ErrorAction SilentlyContinue
    Remove-Job $serverJob -ErrorAction SilentlyContinue
    exit 1
}

$outlineContent = Get-Content $outlineFile | Select-Object -Skip 27
$outlineText = $outlineContent -join "`n"

# Batch results
$batchResults = @()
$articleCount = 3

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

# Cleanup
Write-Host "Stopping server..." -ForegroundColor Yellow
Stop-Job $serverJob -ErrorAction SilentlyContinue
Remove-Job $serverJob -ErrorAction SilentlyContinue
Write-Host "  ✅ Server stopped" -ForegroundColor Green
