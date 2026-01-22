# Quick generate - simplified version

$env:OPENAI_API_KEY = "YOUR_OPENAI_API_KEY_HERE_6LK2v2RXmx0tE9F3jSjQ8jjml0zsBGWKZhggrmsTaNzb5MMLxMuB-T3BlbkFJ1o5axvKKw1mBIk_Ti5oTdpaRfF72Bkoo16_vc9mxLUoZoxwOne0LtRchu3Yhuos4PXut_fkbMA"
$env:IMAGE_API_KEY = $env:OPENAI_API_KEY

$outlineFile = "..\docs\OUTLINE-K1-CORNERSTONE-PANDUAN-DASAR.md"
$outlineContent = Get-Content $outlineFile | Select-Object -Skip 27
$outlineText = $outlineContent -join "`n"

$payload = @{
    contentType = "DERIVATIVE_LONG"
    category = "K1"
    outline = $outlineText.Trim()
    language = "id-ID"
} | ConvertTo-Json -Depth 10

Write-Host "Generating..." -ForegroundColor Cyan

try {
    $response = Invoke-RestMethod -Uri "http://localhost:8090/api/engine/ai/generate" -Method POST -ContentType "application/json; charset=utf-8" -Body $payload -TimeoutSec 600
    $timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
    $response | ConvertTo-Json -Depth 10 | Out-File "result-$timestamp.json" -Encoding UTF8
    $response.content.body | Out-File "article-$timestamp.md" -Encoding UTF8
    Write-Host "Done! Files: result-$timestamp.json, article-$timestamp.md" -ForegroundColor Green
    $response
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
    $_
}
