# STEP 4: CALL GENERATION (Jalankan di Terminal Kedua)
# Server HARUS sudah running di terminal pertama (foreground)

Write-Host "=== STEP 4: CALL GENERATION ===" -ForegroundColor Cyan
Write-Host ""

# Set API Keys
$env:OPENAI_API_KEY = "YOUR_OPENAI_API_KEY_HERE"
$env:IMAGE_API_KEY = $env:OPENAI_API_KEY

# Check server status
Write-Host "Checking server status..." -ForegroundColor Gray
try {
    $health = Invoke-RestMethod -Uri "http://localhost:8090/health" -TimeoutSec 2 -ErrorAction Stop
    Write-Host "✅ Server is ready (uptime: $($health.uptime)s)" -ForegroundColor Green
} catch {
    Write-Host "❌ Server is NOT running on port 8090" -ForegroundColor Red
    Write-Host "   Please start server first (STEP 3)" -ForegroundColor Yellow
    exit 1
}

Write-Host ""

# Load outline and clean H4 headings
Write-Host "Loading outline..." -ForegroundColor Gray
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

# Prepare payload
$payload = @{
    contentType = "DERIVATIVE_LONG"
    category = "K1"
    outline = $cleanOutlineText.Trim()
    language = "id-ID"
} | ConvertTo-Json -Depth 10

# Call generation
Write-Host "Calling generation endpoint..." -ForegroundColor Cyan
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
    if ($response.images.Count -gt 0) {
        $prompt = $response.images[0].prompt
        Write-Host "PROMPT CHECK (First Image):" -ForegroundColor Cyan
        
        if ($prompt -match "Realistic photograph|real photograph|realistic photography") {
            Write-Host "  ✅ NEW PROMPT TEMPLATE USED" -ForegroundColor Green
        } elseif ($prompt -match "illustration|vector|cartoon") {
            Write-Host "  ❌ OLD PROMPT STILL USED (contains: illustration/vector/cartoon)" -ForegroundColor Red
        } else {
            Write-Host "  ⚠️  UNKNOWN FORMAT" -ForegroundColor Yellow
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
    }
    
    # Save results
    $ts = Get-Date -Format "yyyyMMdd-HHmmss"
    $response | ConvertTo-Json -Depth 10 | Out-File "result-final-$ts.json" -Encoding UTF8
    if ($response.content.body) {
        $response.content.body | Out-File "article-final-$ts.md" -Encoding UTF8
    }
    
    Write-Host ""
    Write-Host "Files saved:" -ForegroundColor Cyan
    Write-Host "  - result-final-$ts.json" -ForegroundColor Gray
    if ($response.content.body) {
        Write-Host "  - article-final-$ts.md" -ForegroundColor Gray
    }
    
    Write-Host ""
    Write-Host "=== SUMMARY ===" -ForegroundColor Cyan
    Write-Host "SERVER FOREGROUND: OK (assumed - check terminal 1)" -ForegroundColor Green
    Write-Host "GENERATE CALLED: OK" -ForegroundColor Green
    if ($response.images.Count -gt 0) {
        $promptCheck = if ($prompt -match "Realistic photograph|real photograph|realistic photography") { "ADA" } else { "TIDAK" }
        Write-Host "LOG PROMPT BARU: $promptCheck" -ForegroundColor $(if ($promptCheck -eq "ADA") { "Green" } else { "Red" })
        $imageType = if ($prompt -match "illustration|vector|cartoon") { "MASIH ILUSTRATIF" } else { "FOTO REALISTIK (cek manual)" }
        Write-Host "HASIL GAMBAR: $imageType" -ForegroundColor $(if ($imageType -match "ILUSTRATIF") { "Red" } else { "Yellow" })
    }
    
} catch {
    Write-Host "❌ ERROR: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response: $responseBody" -ForegroundColor Gray
    }
    exit 1
}
