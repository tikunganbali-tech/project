# END-TO-END FINAL TEST - Content Normalizer Integration
# Tests: Content validation, Image generation, Local storage, Image injection

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "END-TO-END FINAL TEST" -ForegroundColor Cyan
Write-Host "Content Normalizer Integration" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Stop existing server
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

# Step 2: Build
Write-Host "STEP 2: Building Go server..." -ForegroundColor Yellow
$buildOutput = go build ./... 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "  ✅ Build success" -ForegroundColor Green
} else {
    Write-Host "  ❌ Build failed" -ForegroundColor Red
    $buildOutput
    exit 1
}
Write-Host ""

# Step 3: Start server in background
Write-Host "STEP 3: Starting server..." -ForegroundColor Yellow
$env:OPENAI_API_KEY = "YOUR_OPENAI_API_KEY_HERE"
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
        Write-Host "  Waiting... ($waited/$maxWait seconds)" -ForegroundColor Gray
    }
}

if (-not $serverReady) {
    Write-Host "  ❌ Server failed to start" -ForegroundColor Red
    Stop-Job $serverJob -ErrorAction SilentlyContinue
    Remove-Job $serverJob -ErrorAction SilentlyContinue
    exit 1
}
Write-Host ""

# Step 4: Generate article
Write-Host "STEP 4: Generating article with normalizer..." -ForegroundColor Yellow
$outlineFile = "..\docs\OUTLINE-K1-CORNERSTONE-PANDUAN-DASAR.md"
if (-not (Test-Path $outlineFile)) {
    Write-Host "  ❌ Outline file not found: $outlineFile" -ForegroundColor Red
    exit 1
}

$outlineContent = Get-Content $outlineFile | Select-Object -Skip 27
$outlineText = $outlineContent -join "`n"

$payload = @{
    contentType = "DERIVATIVE_LONG"
    category = "K1"
    outline = $outlineText.Trim()
    language = "id-ID"
} | ConvertTo-Json -Depth 10

try {
    $startTime = Get-Date
    Write-Host "  Sending request to server..." -ForegroundColor Gray
    $response = Invoke-RestMethod -Method POST -Uri "http://localhost:$serverPort/api/engine/ai/generate" -Body $payload -ContentType "application/json; charset=utf-8" -TimeoutSec 600
    $duration = ((Get-Date) - $startTime).TotalSeconds
    
    Write-Host "  ✅ Generation completed in $([Math]::Round($duration, 1))s" -ForegroundColor Green
    Write-Host ""
    
    # Step 5: Verification
    Write-Host "STEP 5: Verification" -ForegroundColor Yellow
    Write-Host "===================" -ForegroundColor Yellow
    Write-Host ""
    
    $verificationResults = @{}
    
    # Check 1: Content validation passed
    Write-Host "1. Content validation:" -ForegroundColor Cyan
    if ($response.status -eq "DRAFT_AI" -or $response.status -eq "SUCCESS") {
        Write-Host "   ✅ Content lulus validator" -ForegroundColor Green
        $verificationResults["ContentValidation"] = "YA"
    } else {
        Write-Host "   ❌ Content gagal validator (Status: $($response.status))" -ForegroundColor Red
        $verificationResults["ContentValidation"] = "TIDAK"
    }
    Write-Host ""
    
    # Check 2: Image generation active
    Write-Host "2. Image generation:" -ForegroundColor Cyan
    $imageCount = if ($response.images) { $response.images.Count } else { 0 }
    if ($imageCount -gt 0) {
        Write-Host "   ✅ Image generation aktif ($imageCount images)" -ForegroundColor Green
        $verificationResults["ImageGeneration"] = "YA"
    } else {
        Write-Host "   ❌ Image generation tidak aktif (0 images)" -ForegroundColor Red
        $verificationResults["ImageGeneration"] = "TIDAK"
    }
    Write-Host ""
    
    # Check 3: Realistic photo style
    Write-Host "3. Gaya gambar foto realistik:" -ForegroundColor Cyan
    if ($imageCount -gt 0) {
        $firstImage = $response.images[0]
        $prompt = $firstImage.prompt
        if ($prompt -match "Realistic photograph|real photograph|realistic photography|NOT illustration|NOT cartoon|NOT vector|NOT painting|NOT AI-generated") {
            Write-Host "   ✅ Gaya foto realistik (reference-based prompt)" -ForegroundColor Green
            $verificationResults["PhotoStyle"] = "YA"
        } else {
            Write-Host "   ❌ Gaya bukan foto realistik" -ForegroundColor Red
            Write-Host "      Prompt preview: $($prompt.Substring(0, [Math]::Min(100, $prompt.Length)))..." -ForegroundColor Gray
            $verificationResults["PhotoStyle"] = "TIDAK"
        }
    } else {
        Write-Host "   ⚠️  Tidak ada gambar untuk dicek" -ForegroundColor Yellow
        $verificationResults["PhotoStyle"] = "N/A"
    }
    Write-Host ""
    
    # Check 4: Local storage & injection
    Write-Host "4. Gambar tersimpan lokal & ter-inject:" -ForegroundColor Cyan
    if ($imageCount -gt 0) {
        $hasLocalPath = $false
        $hasInjection = $false
        
        foreach ($img in $response.images) {
            if ($img.localPath -and $img.localPath -ne "") {
                $hasLocalPath = $true
                Write-Host "   ✅ Local path: $($img.localPath)" -ForegroundColor Green
            }
        }
        
        $body = $response.content.body
        if ($body) {
            foreach ($img in $response.images) {
                if ($img.localPath -and $body -match [regex]::Escape($img.localPath)) {
                    $hasInjection = $true
                    Write-Host "   ✅ Image ter-inject ke content" -ForegroundColor Green
                    break
                }
            }
        }
        
        if ($hasLocalPath -and $hasInjection) {
            $verificationResults["LocalStorage"] = "YA"
        } elseif ($hasLocalPath) {
            Write-Host "   ⚠️  Gambar tersimpan lokal tapi belum ter-inject" -ForegroundColor Yellow
            $verificationResults["LocalStorage"] = "SEBAGIAN"
        } else {
            Write-Host "   ❌ Gambar tidak tersimpan lokal" -ForegroundColor Red
            $verificationResults["LocalStorage"] = "TIDAK"
        }
    } else {
        Write-Host "   ⚠️  Tidak ada gambar untuk dicek" -ForegroundColor Yellow
        $verificationResults["LocalStorage"] = "N/A"
    }
    Write-Host ""
    
    # Final Report
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "FINAL E2E TEST REPORT" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Konten lolos validator: $($verificationResults['ContentValidation'])" -ForegroundColor $(if ($verificationResults['ContentValidation'] -eq 'YA') { 'Green' } else { 'Red' })
    Write-Host "Image generation jalan: $($verificationResults['ImageGeneration'])" -ForegroundColor $(if ($verificationResults['ImageGeneration'] -eq 'YA') { 'Green' } else { 'Red' })
    Write-Host "Gaya gambar foto manusia: $($verificationResults['PhotoStyle'])" -ForegroundColor $(if ($verificationResults['PhotoStyle'] -eq 'YA') { 'Green' } else { 'Yellow' })
    Write-Host "Gambar tersimpan lokal: $($verificationResults['LocalStorage'])" -ForegroundColor $(if ($verificationResults['LocalStorage'] -eq 'YA') { 'Green' } else { 'Yellow' })
    
    $allPassed = ($verificationResults['ContentValidation'] -eq 'YA') -and 
                 ($verificationResults['ImageGeneration'] -eq 'YA') -and 
                 ($verificationResults['PhotoStyle'] -eq 'YA') -and 
                 ($verificationResults['LocalStorage'] -eq 'YA')
    
    Write-Host ""
    if ($allPassed) {
        Write-Host "Siap review editorial: YA" -ForegroundColor Green
    } else {
        Write-Host "Siap review editorial: TIDAK" -ForegroundColor Red
    }
    Write-Host ""
    
    # Save results
    $timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
    $response | ConvertTo-Json -Depth 10 | Out-File "result-e2e-$timestamp.json" -Encoding UTF8
    if ($response.content.body) {
        $response.content.body | Out-File "article-e2e-$timestamp.md" -Encoding UTF8
    }
    
    Write-Host "Files saved:" -ForegroundColor Cyan
    Write-Host "  - result-e2e-$timestamp.json" -ForegroundColor White
    Write-Host "  - article-e2e-$timestamp.md" -ForegroundColor White
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
