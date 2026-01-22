# Complete test: Start server and call generation

Write-Host "=== COMPLETE TEST EXECUTION ===" -ForegroundColor Cyan
Write-Host ""

# Set API keys
$env:OPENAI_API_KEY = "YOUR_OPENAI_API_KEY_HERE_6LK2v2RXmx0tE9F3jSjQ8jjml0zsBGWKZhggrmsTaNzb5MMLxMuB-T3BlbkFJ1o5axvKKw1mBIk_Ti5oTdpaRfF72Bkoo16_vc9mxLUoZoxwOne0LtRchu3Yhuos4PXut_fkbMA"
$env:IMAGE_API_KEY = $env:OPENAI_API_KEY

# Step 1: Check if server already running
Write-Host "STEP 1: Checking server status..." -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "http://localhost:8090/health" -TimeoutSec 2 -ErrorAction Stop
    Write-Host "  ✅ Server already running (uptime: $($health.uptime)s)" -ForegroundColor Green
    $serverWasRunning = $true
} catch {
    Write-Host "  ⚠️  Server not running, will start new one" -ForegroundColor Yellow
    $serverWasRunning = $false
}

# Step 2: Start server if needed
if (-not $serverWasRunning) {
    Write-Host ""
    Write-Host "STEP 2: Starting server..." -ForegroundColor Yellow
    
    $serverProcess = Start-Process -FilePath "go" -ArgumentList "run", "cmd/server/main.go" -WorkingDirectory $PWD -NoNewWindow -PassThru
    
    Write-Host "  Server process started (PID: $($serverProcess.Id))" -ForegroundColor Gray
    Write-Host "  Waiting for server to be ready..." -ForegroundColor Gray
    
    $maxWait = 30
    $waited = 0
    $serverReady = $false
    
    while ($waited -lt $maxWait) {
        Start-Sleep -Seconds 2
        $waited += 2
        
        try {
            $health = Invoke-RestMethod -Uri "http://localhost:8090/health" -TimeoutSec 1 -ErrorAction Stop
            $serverReady = $true
            Write-Host "  ✅ Server ready (uptime: $($health.uptime)s)" -ForegroundColor Green
            break
        } catch {
            Write-Host "    Still waiting... ($waited/$maxWait seconds)" -ForegroundColor Gray
        }
    }
    
    if (-not $serverReady) {
        Write-Host "  ❌ Server failed to start within $maxWait seconds" -ForegroundColor Red
        if ($serverProcess) {
            Stop-Process -Id $serverProcess.Id -Force -ErrorAction SilentlyContinue
        }
        exit 1
    }
} else {
    Write-Host ""
}

# Step 3: Load outline and prepare payload
Write-Host "STEP 3: Preparing generation request..." -ForegroundColor Yellow
$outlineFile = "..\docs\OUTLINE-K1-CORNERSTONE-PANDUAN-DASAR.md"
$outlineContent = Get-Content $outlineFile | Select-Object -Skip 27
$outlineText = $outlineContent -join "`n"

# Remove H4 headings
$outlineLines = $outlineText -split "`n"
$cleanOutline = @()
foreach ($line in $outlineLines) {
    if (-not $line.Trim().StartsWith("####")) {
        $cleanOutline += $line
    }
}
$cleanOutlineText = $cleanOutline -join "`n"

$payload = @{
    contentType = "DERIVATIVE_LONG"
    category = "K1"
    outline = $cleanOutlineText.Trim()
    language = "id-ID"
} | ConvertTo-Json -Depth 10

Write-Host "  ✅ Payload prepared" -ForegroundColor Green
Write-Host ""

# Step 4: Call generation
Write-Host "STEP 4: Calling generation endpoint..." -ForegroundColor Yellow
Write-Host ""

$startTime = Get-Date

try {
    $response = Invoke-RestMethod -Method POST -Uri "http://localhost:8090/api/engine/ai/generate" -Body $payload -ContentType "application/json; charset=utf-8" -TimeoutSec 600
    
    $duration = ((Get-Date) - $startTime).TotalSeconds
    
    Write-Host "✅ Generation completed in $([Math]::Round($duration, 1)) seconds" -ForegroundColor Green
    Write-Host ""
    Write-Host "=== RESULTS ===" -ForegroundColor Cyan
    Write-Host "Status: $($response.status)" -ForegroundColor White
    Write-Host "Images: $($response.images.Count)" -ForegroundColor White
    Write-Host ""
    
    # Check prompt template
    $promptStatus = "N/A"
    $imageType = "N/A"
    
    if ($response.images.Count -gt 0) {
        $prompt = $response.images[0].prompt
        Write-Host "PROMPT CHECK (First Image):" -ForegroundColor Cyan
        
        if ($prompt -match "Realistic photograph|real photograph|realistic photography") {
            Write-Host "  ✅ NEW PROMPT TEMPLATE USED" -ForegroundColor Green
            $promptStatus = "ADA"
        } elseif ($prompt -match "illustration|vector|cartoon") {
            Write-Host "  ❌ OLD PROMPT STILL USED" -ForegroundColor Red
            $promptStatus = "TIDAK"
        } else {
            Write-Host "  ⚠️  UNKNOWN FORMAT" -ForegroundColor Yellow
            $promptStatus = "TIDAK"
        }
        
        Write-Host "  Preview: $($prompt.Substring(0, [Math]::Min(200, $prompt.Length)))..." -ForegroundColor Gray
        Write-Host ""
        
        # Check local paths
        Write-Host "LOCAL PATHS:" -ForegroundColor Cyan
        $localCount = 0
        foreach ($img in $response.images) {
            if ($img.localPath -and $img.localPath -ne "") {
                $localCount++
                Write-Host "  ✅ $($img.localPath)" -ForegroundColor Green
            } else {
                Write-Host "  ⚠️  No local path" -ForegroundColor Yellow
            }
        }
        Write-Host ""
        Write-Host "Local paths: $localCount / $($response.images.Count)" -ForegroundColor $(if ($localCount -eq $response.images.Count) { "Green" } else { "Yellow" })
        
        $imageType = if ($prompt -match "illustration|vector|cartoon") { "MASIH ILUSTRATIF" } else { "FOTO REALISTIK (cek manual)" }
    }
    
    # Save results
    $ts = Get-Date -Format "yyyyMMdd-HHmmss"
    $response | ConvertTo-Json -Depth 10 | Out-File "result-final-$ts.json" -Encoding UTF8
    if ($response.content.body) {
        $response.content.body | Out-File "article-final-$ts.md" -Encoding UTF8
    }
    
    Write-Host ""
    Write-Host "=== SUMMARY (LAPORAN) ===" -ForegroundColor Cyan
    Write-Host "SERVER FOREGROUND: OK" -ForegroundColor Green
    Write-Host "GENERATE CALLED: OK" -ForegroundColor Green
    Write-Host "LOG PROMPT BARU: $promptStatus" -ForegroundColor $(if ($promptStatus -eq "ADA") { "Green" } else { "Red" })
    Write-Host "HASIL GAMBAR: $imageType" -ForegroundColor $(if ($imageType -match "ILUSTRATIF") { "Red" } else { "Yellow" })
    Write-Host ""
    Write-Host "Files saved:" -ForegroundColor Cyan
    Write-Host "  - result-final-$ts.json" -ForegroundColor Gray
    if ($response.content.body) {
        Write-Host "  - article-final-$ts.md" -ForegroundColor Gray
    }
    
} catch {
    Write-Host "❌ ERROR: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        try {
            $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
            $responseBody = $reader.ReadToEnd()
            Write-Host "Response: $responseBody" -ForegroundColor Gray
        } catch {
            Write-Host "Could not read error response" -ForegroundColor Gray
        }
    }
    exit 1
}
