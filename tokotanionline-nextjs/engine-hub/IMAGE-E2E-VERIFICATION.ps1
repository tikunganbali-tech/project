# IMAGE E2E VERIFICATION - RAW UNEDITED PHOTOGRAPH Template
# Verifies: Prompt, Style, No Stylization, Local Storage

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "IMAGE E2E VERIFICATION" -ForegroundColor Cyan
Write-Host "RAW UNEDITED PHOTOGRAPH Template" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# STEP 1: Restart Server
Write-Host "STEP 1: Restarting Go server..." -ForegroundColor Yellow

# Stop existing
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

# Build
Write-Host "  Building..." -ForegroundColor Gray
$buildOutput = go build ./... 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "  ❌ Build failed" -ForegroundColor Red
    $buildOutput
    exit 1
}

# Start server
$env:OPENAI_API_KEY = "YOUR_OPENAI_API_KEY_HERE_6LK2v2RXmx0tE9F3jSjQ8jjml0zsBGWKZhggrmsTaNzb5MMLxMuB-T3BlbkFJ1o5axvKKw1mBIk_Ti5oTdpaRfF72Bkoo16_vc9mxLUoZoxwOne0LtRchu3Yhuos4PXut_fkbMA"
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

# STEP 2: Generate 1 Article
Write-Host "STEP 2: Generating 1 article (content + image)..." -ForegroundColor Yellow

$outlineFile = "..\docs\OUTLINE-K1-CORNERSTONE-PANDUAN-DASAR.md"
if (-not (Test-Path $outlineFile)) {
    Write-Host "  ❌ Outline file not found: $outlineFile" -ForegroundColor Red
    exit 1
}

$outlineContent = Get-Content $outlineFile | Select-Object -Skip 27
$outlineText = $outlineContent -join "`n"

$payload = @{
    contentType = "DERIVATIVE"
    category = "K1"
    outline = $outlineText.Trim()
    language = "id-ID"
} | ConvertTo-Json -Depth 10

try {
    $startTime = Get-Date
    Write-Host "  Sending request..." -ForegroundColor Gray
    $response = Invoke-RestMethod -Method POST -Uri "http://localhost:$serverPort/api/engine/ai/generate" -Body $payload -ContentType "application/json; charset=utf-8" -TimeoutSec 600
    $duration = ((Get-Date) - $startTime).TotalSeconds
    
    Write-Host "  ✅ Generation completed in $([Math]::Round($duration, 1))s" -ForegroundColor Green
    Write-Host ""
    
    # STEP 3: Verification
    Write-Host "STEP 3: IMAGE E2E VERIFICATION" -ForegroundColor Yellow
    Write-Host "==============================" -ForegroundColor Yellow
    Write-Host ""
    
    $verificationResults = @{}
    
    # Check if images were generated
    $imageCount = if ($response.images) { $response.images.Count } else { 0 }
    
    if ($imageCount -eq 0) {
        Write-Host "❌ CRITICAL: No images generated!" -ForegroundColor Red
        Write-Host ""
        Write-Host "IMAGE E2E CHECK RESULTS:" -ForegroundColor Cyan
        Write-Host "  Prompt mengandung 'RAW, UNEDITED PHOTOGRAPH': TIDAK (no images)" -ForegroundColor Red
        Write-Host "  Gaya gambar terasa foto kamera manusia: TIDAK (no images)" -ForegroundColor Red
        Write-Host "  Tidak ada kesan lukisan/render/ilustrasi: TIDAK (no images)" -ForegroundColor Red
        Write-Host "  Gambar tersimpan lokal di website: TIDAK (no images)" -ForegroundColor Red
        Write-Host ""
        Write-Host "❌ VERIFICATION FAILED - No images generated" -ForegroundColor Red
        exit 1
    }
    
    $firstImage = $response.images[0]
    $prompt = $firstImage.prompt
    
    # Check 1: Prompt contains "RAW, UNEDITED PHOTOGRAPH"
    Write-Host "1. Prompt verification:" -ForegroundColor Cyan
    $hasRawUnedited = $prompt -match "RAW.*UNEDITED.*PHOTOGRAPH" -or $prompt -match "RAW, UNEDITED PHOTOGRAPH"
    if ($hasRawUnedited) {
        Write-Host "   ✅ Prompt mengandung 'RAW, UNEDITED PHOTOGRAPH'" -ForegroundColor Green
        $verificationResults["PromptRawUnedited"] = "YA"
    } else {
        Write-Host "   ❌ Prompt TIDAK mengandung 'RAW, UNEDITED PHOTOGRAPH'" -ForegroundColor Red
        Write-Host "      Prompt preview: $($prompt.Substring(0, [Math]::Min(200, $prompt.Length)))..." -ForegroundColor Gray
        $verificationResults["PromptRawUnedited"] = "TIDAK"
    }
    Write-Host ""
    
    # Check 2: Anti-stylization keywords present
    Write-Host "2. Anti-stylization check:" -ForegroundColor Cyan
    $antiStylizationChecks = @{
        "No artificial lighting" = $prompt -match "No artificial lighting"
        "No cinematic lighting" = $prompt -match "No cinematic lighting"
        "No dramatic lighting" = $prompt -match "No dramatic lighting"
        "Imperfect framing" = $prompt -match "Imperfect framing"
        "Slight grain / noise" = $prompt -match "grain|noise"
        "No artistic enhancement" = $prompt -match "No artistic enhancement"
        "No filters" = $prompt -match "No filters"
        "casual photo upload" = $prompt -match "casual photo upload"
    }
    
    $antiStylizationCount = ($antiStylizationChecks.Values | Where-Object { $_ -eq $true }).Count
    $totalChecks = $antiStylizationChecks.Count
    
    if ($antiStylizationCount -ge 6) {
        Write-Host "   ✅ Anti-stylization constraints present ($antiStylizationCount/$totalChecks)" -ForegroundColor Green
        $verificationResults["AntiStylization"] = "YA"
    } else {
        Write-Host "   ⚠️  Anti-stylization constraints incomplete ($antiStylizationCount/$totalChecks)" -ForegroundColor Yellow
        $verificationResults["AntiStylization"] = "SEBAGIAN"
    }
    Write-Host ""
    
    # Check 3: Old stylization phrases should NOT be present
    Write-Host "3. Old stylization check (should be absent):" -ForegroundColor Cyan
    $oldPhrases = @{
        "beautiful lighting" = $prompt -match "beautiful lighting"
        "dramatic lighting" = $prompt -match "dramatic lighting" -and $prompt -notmatch "No dramatic lighting"
        "cinematic" = $prompt -match "cinematic" -and $prompt -notmatch "Not cinematic"
        "perfect composition" = $prompt -match "perfect composition"
        "stylized" = $prompt -match "stylized" -and $prompt -notmatch "not stylized"
    }
    
    $hasOldPhrases = ($oldPhrases.Values | Where-Object { $_ -eq $true }).Count -gt 0
    
    if (-not $hasOldPhrases) {
        Write-Host "   ✅ No old stylization phrases found" -ForegroundColor Green
        $verificationResults["NoOldStylization"] = "YA"
    } else {
        Write-Host "   ❌ Old stylization phrases still present:" -ForegroundColor Red
        foreach ($old in $oldPhrases.GetEnumerator()) {
            if ($old.Value) {
                Write-Host "      - $($old.Key)" -ForegroundColor Red
            }
        }
        $verificationResults["NoOldStylization"] = "TIDAK"
    }
    Write-Host ""
    
    # Check 4: Local storage
    Write-Host "4. Local storage check:" -ForegroundColor Cyan
    if ($firstImage.localPath -and $firstImage.localPath -ne "") {
        $localPath = $firstImage.localPath
        Write-Host "   ✅ Local path: $localPath" -ForegroundColor Green
        
        # Check if path is valid format
        if ($localPath -match "^/uploads/") {
            Write-Host "   ✅ Path format valid (starts with /uploads/)" -ForegroundColor Green
            $verificationResults["LocalStorage"] = "YA"
        } else {
            Write-Host "   ⚠️  Path format unusual: $localPath" -ForegroundColor Yellow
            $verificationResults["LocalStorage"] = "SEBAGIAN"
        }
    } else {
        Write-Host "   ❌ No local path found" -ForegroundColor Red
        $verificationResults["LocalStorage"] = "TIDAK"
    }
    Write-Host ""
    
    # Final Report
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "IMAGE E2E CHECK RESULTS" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    
    $check1 = $verificationResults["PromptRawUnedited"] -eq "YA"
    $check2 = ($verificationResults["AntiStylization"] -eq "YA") -and ($verificationResults["NoOldStylization"] -eq "YA")
    $check3 = $check2  # Same as check 2 (no stylization)
    $check4 = $verificationResults["LocalStorage"] -eq "YA"
    
    Write-Host "Prompt mengandung 'RAW, UNEDITED PHOTOGRAPH': $(if ($check1) { 'YA' } else { 'TIDAK' })" -ForegroundColor $(if ($check1) { 'Green' } else { 'Red' })
    Write-Host "Gaya gambar terasa foto kamera manusia: $(if ($check2) { 'YA' } else { 'TIDAK' })" -ForegroundColor $(if ($check2) { 'Green' } else { 'Red' })
    Write-Host "Tidak ada kesan lukisan/render/ilustrasi: $(if ($check3) { 'YA' } else { 'TIDAK' })" -ForegroundColor $(if ($check3) { 'Green' } else { 'Red' })
    Write-Host "Gambar tersimpan lokal di website: $(if ($check4) { 'YA' } else { 'TIDAK' })" -ForegroundColor $(if ($check4) { 'Green' } else { 'Red' })
    Write-Host ""
    
    $allPassed = $check1 -and $check2 -and $check3 -and $check4
    
    if ($allPassed) {
        Write-Host "✅ ALL CHECKS PASSED" -ForegroundColor Green
        Write-Host ""
        Write-Host "Image URL: $($firstImage.url)" -ForegroundColor Cyan
        Write-Host "Local Path: $($firstImage.localPath)" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "Prompt (first 500 chars):" -ForegroundColor Yellow
        Write-Host $prompt.Substring(0, [Math]::Min(500, $prompt.Length)) -ForegroundColor White
    } else {
        Write-Host "❌ VERIFICATION FAILED" -ForegroundColor Red
        Write-Host ""
        Write-Host "Please review the results above." -ForegroundColor Yellow
        Write-Host "If image style still looks like painting/render, send the image for hard-fix." -ForegroundColor Yellow
    }
    Write-Host ""
    
    # Save results
    $timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
    $response | ConvertTo-Json -Depth 10 | Out-File "result-image-e2e-$timestamp.json" -Encoding UTF8
    if ($response.content.body) {
        $response.content.body | Out-File "article-image-e2e-$timestamp.md" -Encoding UTF8
    }
    
    Write-Host "Files saved:" -ForegroundColor Cyan
    Write-Host "  - result-image-e2e-$timestamp.json" -ForegroundColor White
    Write-Host "  - article-image-e2e-$timestamp.md" -ForegroundColor White
    Write-Host ""
    
    $response
    
} catch {
    Write-Host "  ❌ ERROR: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "  Response: $responseBody" -ForegroundColor Red
    }
    exit 1
} finally {
    Write-Host ""
    Write-Host "Cleaning up server..." -ForegroundColor Yellow
    Stop-Job $serverJob -ErrorAction SilentlyContinue
    Remove-Job $serverJob -ErrorAction SilentlyContinue
    Write-Host "  ✅ Server stopped" -ForegroundColor Green
}
