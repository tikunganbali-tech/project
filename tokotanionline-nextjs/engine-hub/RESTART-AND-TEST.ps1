# Complete restart and test workflow

Write-Host "COMPLETE RESTART & TEST WORKFLOW" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Stop server
Write-Host "STEP 1: Stopping server..." -ForegroundColor Yellow
$connections = Get-NetTCPConnection -LocalPort 8090 -ErrorAction SilentlyContinue
if ($connections) {
    foreach ($conn in $connections) {
        $procId = $conn.OwningProcess
        Write-Host "  Stopping process $procId" -ForegroundColor Gray
        Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
    }
    Start-Sleep -Seconds 2
    Write-Host "  ✅ Server stopped" -ForegroundColor Green
} else {
    Write-Host "  ✅ No server running" -ForegroundColor Green
}
Write-Host ""

# Step 2: Build
Write-Host "STEP 2: Building..." -ForegroundColor Yellow
$buildOutput = go build ./... 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "  ✅ Build success" -ForegroundColor Green
} else {
    Write-Host "  ❌ Build failed" -ForegroundColor Red
    $buildOutput
    exit 1
}
Write-Host ""

# Step 3: Start server
Write-Host "STEP 3: Starting server..." -ForegroundColor Yellow
$env:OPENAI_API_KEY = "YOUR_OPENAI_API_KEY_HERE"
$env:IMAGE_API_KEY = $env:OPENAI_API_KEY

$serverJob = Start-Job -ScriptBlock {
    Set-Location $using:PWD
    go run cmd/server/main.go
}

Start-Sleep -Seconds 5

$maxWait = 30
$waited = 0
$serverReady = $false

while ($waited -lt $maxWait) {
    try {
        $health = Invoke-RestMethod -Uri "http://localhost:8090/health" -TimeoutSec 1 -ErrorAction Stop
        $serverReady = $true
        Write-Host "  ✅ Server ready (uptime: $($health.uptime)s)" -ForegroundColor Green
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

# Step 4: Generate
Write-Host "STEP 4: Generating..." -ForegroundColor Yellow
$outlineFile = "..\docs\OUTLINE-K1-CORNERSTONE-PANDUAN-DASAR.md"
$outlineContent = Get-Content $outlineFile | Select-Object -Skip 27
$outlineText = $outlineContent -join "`n"
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

try {
    $startTime = Get-Date
    $response = Invoke-RestMethod -Method POST -Uri "http://localhost:8090/api/engine/ai/generate" -Body $payload -ContentType "application/json; charset=utf-8" -TimeoutSec 600
    $duration = ((Get-Date) - $startTime).TotalSeconds
    
    Write-Host "  ✅ Generation completed in $([Math]::Round($duration, 1))s" -ForegroundColor Green
    Write-Host ""
    Write-Host "RESULTS:" -ForegroundColor Cyan
    Write-Host "  Status: $($response.status)" -ForegroundColor White
    Write-Host "  Images: $($response.images.Count)" -ForegroundColor White
    
    if ($response.images.Count -gt 0) {
        $prompt = $response.images[0].prompt
        Write-Host ""
        Write-Host "  PROMPT CHECK:" -ForegroundColor Cyan
        if ($prompt -match "Realistic photograph|real photograph|realistic photography") {
            Write-Host "    ✅ NEW PROMPT TEMPLATE" -ForegroundColor Green
        } elseif ($prompt -match "illustration") {
            Write-Host "    ❌ OLD PROMPT (server not restarted)" -ForegroundColor Red
        }
        Write-Host "    Preview: $($prompt.Substring(0, [Math]::Min(150, $prompt.Length)))..." -ForegroundColor Gray
    }
    
    $ts = Get-Date -Format "yyyyMMdd-HHmmss"
    $response | ConvertTo-Json -Depth 10 | Out-File "result-final-$ts.json" -Encoding UTF8
    Write-Host ""
    Write-Host "  File: result-final-$ts.json" -ForegroundColor Green
    
    $response
} catch {
    Write-Host "  ❌ ERROR: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
} finally {
    Stop-Job $serverJob -ErrorAction SilentlyContinue
    Remove-Job $serverJob -ErrorAction SilentlyContinue
}
