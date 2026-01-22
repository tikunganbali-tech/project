# Test RAW UNEDITED PHOTOGRAPH prompt template

Write-Host "Testing RAW UNEDITED PHOTOGRAPH prompt template..." -ForegroundColor Cyan
Write-Host ""

# Stop existing
Get-NetTCPConnection -LocalPort 8090 -ErrorAction SilentlyContinue | ForEach-Object {
    Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue
}
Start-Sleep -Seconds 2

# Set env
$env:OPENAI_API_KEY = "YOUR_OPENAI_API_KEY_HERE_6LK2v2RXmx0tE9F3jSjQ8jjml0zsBGWKZhggrmsTaNzb5MMLxMuB-T3BlbkFJ1o5axvKKw1mBIk_Ti5oTdpaRfF72Bkoo16_vc9mxLUoZoxwOne0LtRchu3Yhuos4PXut_fkbMA"
$env:IMAGE_API_KEY = $env:OPENAI_API_KEY

# Start server
Write-Host "Starting server..." -ForegroundColor Yellow
$serverProcess = Start-Process -FilePath "go" -ArgumentList "run", "cmd/server/main.go" -NoNewWindow -PassThru -RedirectStandardOutput "server-output.log" -RedirectStandardError "server-error.log"

Start-Sleep -Seconds 5

# Test with simple outline
$outline = @"
### H2 — Pengenalan Dasar
Pengenalan tentang sarana produksi pertanian.

### H2 — Komponen Utama
Komponen utama sarana produksi pertanian.
"@

$payload = @{
    contentType = "DERIVATIVE"
    category = "K1"
    outline = $outline
    language = "id-ID"
} | ConvertTo-Json -Depth 10

Write-Host "Sending test request..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Method POST -Uri "http://localhost:8090/api/engine/ai/generate" -Body $payload -ContentType "application/json; charset=utf-8" -TimeoutSec 300
    
    Write-Host ""
    Write-Host "✅ SUCCESS!" -ForegroundColor Green
    Write-Host ""
    
    if ($response.images -and $response.images.Count -gt 0) {
        $firstImage = $response.images[0]
        Write-Host "=== IMAGE PROMPT CHECK ===" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "Prompt:" -ForegroundColor Yellow
        Write-Host $firstImage.prompt -ForegroundColor White
        Write-Host ""
        
        # Check for key phrases
        $prompt = $firstImage.prompt
        $checks = @{
            "RAW, UNEDITED PHOTOGRAPH" = $prompt -match "RAW.*UNEDITED.*PHOTOGRAPH"
            "No artificial lighting" = $prompt -match "No artificial lighting"
            "No cinematic lighting" = $prompt -match "No cinematic lighting"
            "Imperfect framing" = $prompt -match "Imperfect framing"
            "Slight grain / noise" = $prompt -match "grain|noise"
            "casual photo upload" = $prompt -match "casual photo upload"
            "No artistic enhancement" = $prompt -match "No artistic enhancement"
            "No filters" = $prompt -match "No filters"
        }
        
        Write-Host "=== PROMPT VALIDATION ===" -ForegroundColor Cyan
        foreach ($check in $checks.GetEnumerator()) {
            $status = if ($check.Value) { "✅" } else { "❌" }
            Write-Host "$status $($check.Key)" -ForegroundColor $(if ($check.Value) { "Green" } else { "Red" })
        }
        Write-Host ""
        
        # Check for OLD phrases (should NOT be present)
        $oldPhrases = @{
            "realistic photography" = $prompt -match "realistic photography"
            "beautiful lighting" = $prompt -match "beautiful lighting"
            "clear composition" = $prompt -match "clear composition"
        }
        
        Write-Host "=== OLD PROMPT CHECK (should be absent) ===" -ForegroundColor Yellow
        $hasOldPhrases = $false
        foreach ($old in $oldPhrases.GetEnumerator()) {
            if ($old.Value) {
                Write-Host "❌ Found old phrase: $($old.Key)" -ForegroundColor Red
                $hasOldPhrases = $true
            }
        }
        if (-not $hasOldPhrases) {
            Write-Host "✅ No old stylization phrases found" -ForegroundColor Green
        }
        Write-Host ""
        
        Write-Host "Image URL: $($firstImage.url)" -ForegroundColor Cyan
        Write-Host "Local path: $($firstImage.localPath)" -ForegroundColor Cyan
    } else {
        Write-Host "⚠️  No images generated" -ForegroundColor Yellow
    }
    
    $timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
    $response | ConvertTo-Json -Depth 10 | Out-File "result-raw-prompt-$timestamp.json" -Encoding UTF8
    Write-Host ""
    Write-Host "Saved: result-raw-prompt-$timestamp.json" -ForegroundColor Green
    
} catch {
    Write-Host "❌ ERROR: $($_.Exception.Message)" -ForegroundColor Red
    if (Test-Path "server-error.log") {
        Write-Host ""
        Write-Host "=== SERVER ERROR LOG ===" -ForegroundColor Red
        Get-Content "server-error.log" | Select-Object -Last 30
    }
} finally {
    Stop-Process -Id $serverProcess.Id -Force -ErrorAction SilentlyContinue
    Write-Host ""
    Write-Host "Server stopped" -ForegroundColor Gray
}
