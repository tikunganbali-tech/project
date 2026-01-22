# Regenerate images dengan PROMPT TEMPLATE FINAL (Reference-driven)

$env:OPENAI_API_KEY = "YOUR_OPENAI_API_KEY_HERE_6LK2v2RXmx0tE9F3jSjQ8jjml0zsBGWKZhggrmsTaNzb5MMLxMuB-T3BlbkFJ1o5axvKKw1mBIk_Ti5oTdpaRfF72Bkoo16_vc9mxLUoZoxwOne0LtRchu3Yhuos4PXut_fkbMA"
$env:IMAGE_API_KEY = $env:OPENAI_API_KEY

Write-Host "REGENERATE IMAGES - NEW PROMPT TEMPLATE" -ForegroundColor Cyan
Write-Host "=======================================" -ForegroundColor Cyan
Write-Host ""

$outlineFile = "..\docs\OUTLINE-K1-CORNERSTONE-PANDUAN-DASAR.md"
$outlineContent = Get-Content $outlineFile | Select-Object -Skip 27
$outlineText = $outlineContent -join "`n"

$payload = @{
    contentType = "DERIVATIVE_LONG"
    category = "K1"
    outline = $outlineText.Trim()
    language = "id-ID"
} | ConvertTo-Json -Depth 10

Write-Host "Calling generation endpoint with NEW PROMPT TEMPLATE..." -ForegroundColor Yellow
Write-Host "(This will use reference-driven photo transformation prompt)" -ForegroundColor Gray
Write-Host ""

try {
    $startTime = Get-Date
    $response = Invoke-RestMethod -Method POST -Uri "http://localhost:8090/api/engine/ai/generate" -Body $payload -ContentType "application/json; charset=utf-8" -TimeoutSec 600
    $duration = ((Get-Date) - $startTime).TotalSeconds
    
    Write-Host "✅ Generation completed in $([Math]::Round($duration, 1)) seconds" -ForegroundColor Green
    Write-Host ""
    Write-Host "Response Status: $($response.status)" -ForegroundColor White
    Write-Host "Title: $($response.content.title)" -ForegroundColor White
    Write-Host "Images generated: $($response.images.Count)" -ForegroundColor White
    Write-Host ""
    
    # Check local paths
    $localPathCount = 0
    foreach ($img in $response.images) {
        if ($img.localPath -and $img.localPath -ne "") {
            $localPathCount++
            Write-Host "  ✅ $($img.heading): $($img.localPath)" -ForegroundColor Green
        } else {
            Write-Host "  ⚠️  $($img.heading): No local path" -ForegroundColor Yellow
        }
    }
    
    Write-Host ""
    Write-Host "Local paths: $localPathCount / $($response.images.Count)" -ForegroundColor $(if ($localPathCount -eq $response.images.Count) { "Green" } else { "Yellow" })
    
    # Save result
    $timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
    $response | ConvertTo-Json -Depth 10 | Out-File "result-new-prompt-$timestamp.json" -Encoding UTF8
    if ($response.content.body) {
        $response.content.body | Out-File "article-new-prompt-$timestamp.md" -Encoding UTF8
    }
    
    Write-Host ""
    Write-Host "Files saved:" -ForegroundColor Cyan
    Write-Host "  - result-new-prompt-$timestamp.json" -ForegroundColor White
    Write-Host "  - article-new-prompt-$timestamp.md" -ForegroundColor White
    
    $response
} catch {
    Write-Host "❌ ERROR: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
