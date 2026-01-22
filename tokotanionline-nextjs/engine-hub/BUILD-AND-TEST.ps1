# STEP 3 & 4: Build ulang dan jalankan 1 pipeline

Write-Host "🔨 STEP 3: Building..." -ForegroundColor Cyan
go build ./...

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Build failed!" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Build success!" -ForegroundColor Green
Write-Host ""

Write-Host "🧪 STEP 4: Running test..." -ForegroundColor Cyan

$env:OPENAI_API_KEY = "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"
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

Write-Host "   Sending request to server..." -ForegroundColor Yellow

try {
    $response = Invoke-RestMethod -Uri "http://localhost:8090/api/engine/ai/generate" -Method POST -ContentType "application/json; charset=utf-8" -Body $payload -TimeoutSec 600
    
    $timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
    $response | ConvertTo-Json -Depth 10 | Out-File "result-$timestamp.json" -Encoding UTF8
    $response.content.body | Out-File "article-$timestamp.md" -Encoding UTF8
    
    Write-Host ""
    Write-Host "✅ SUCCESS!" -ForegroundColor Green
    Write-Host "   Title: $($response.content.title)" -ForegroundColor White
    Write-Host "   Status: $($response.status)" -ForegroundColor White
    Write-Host "   Images: $($response.images.Count)" -ForegroundColor White
    Write-Host "   Files: result-$timestamp.json, article-$timestamp.md" -ForegroundColor White
    
    if ($response.images.Count -gt 0) {
        Write-Host ""
        Write-Host "   Images:" -ForegroundColor Cyan
        foreach ($img in $response.images) {
            Write-Host "     - $($img.localPath)" -ForegroundColor Gray
        }
    }
    
    $response
} catch {
    Write-Host ""
    Write-Host "❌ ERROR: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
