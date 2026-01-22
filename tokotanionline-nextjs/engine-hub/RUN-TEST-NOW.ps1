# Quick test - generate 1 artikel dengan API key yang sudah diset

$env:OPENAI_API_KEY = "YOUR_OPENAI_API_KEY_HERE"
$env:IMAGE_API_KEY = $env:OPENAI_API_KEY

Write-Host "🚀 Generating article with image pipeline..." -ForegroundColor Cyan
Write-Host ""

# Read outline
$outlineFile = "..\docs\OUTLINE-K1-CORNERSTONE-PANDUAN-DASAR.md"
$outlineContent = Get-Content $outlineFile | Select-Object -Skip 27
$outlineText = $outlineContent -join "`n"

# Prepare payload
$payload = @{
    contentType = "DERIVATIVE_LONG"
    category = "K1"
    outline = $outlineText.Trim()
    language = "id-ID"
} | ConvertTo-Json -Depth 10

$serverUrl = "http://localhost:8090"

Write-Host "📝 Sending request to $serverUrl/api/engine/ai/generate..." -ForegroundColor Yellow
Write-Host "   (This may take 2-5 minutes)" -ForegroundColor Gray
Write-Host ""

try {
    $startTime = Get-Date
    $response = Invoke-RestMethod -Uri "$serverUrl/api/engine/ai/generate" `
        -Method POST `
        -ContentType "application/json; charset=utf-8" `
        -Body $payload `
        -TimeoutSec 600 `
        -ErrorAction Stop
    
    $duration = ((Get-Date) - $startTime).TotalSeconds
    
    Write-Host "✅ Generation completed in $([Math]::Round($duration, 1)) seconds" -ForegroundColor Green
    Write-Host ""
    
    # Save result
    $timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
    $outputFile = "test-result-$timestamp.json"
    $response | ConvertTo-Json -Depth 10 | Out-File -FilePath $outputFile -Encoding UTF8
    
    Write-Host "📊 RESULTS:" -ForegroundColor Cyan
    Write-Host "   Title: $($response.content.title)" -ForegroundColor White
    Write-Host "   Status: $($response.status)" -ForegroundColor White
    Write-Host "   Images: $($response.images.Count)" -ForegroundColor White
    Write-Host "   Output file: $outputFile" -ForegroundColor White
    Write-Host ""
    
    # Save article markdown separately
    $articleFile = "test-article-$timestamp.md"
    $response.content.body | Out-File -FilePath $articleFile -Encoding UTF8
    Write-Host "📄 Article saved to: $articleFile" -ForegroundColor White
    Write-Host ""
    
    # Check images
    if ($response.images.Count -gt 0) {
        Write-Host "🖼️  IMAGES:" -ForegroundColor Cyan
        foreach ($img in $response.images) {
            Write-Host "   - $($img.heading)" -ForegroundColor White
            Write-Host "     Path: $($img.localPath)" -ForegroundColor Gray
        }
    }
    
    return $response
    
} catch {
    Write-Host "❌ ERROR: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response: $responseBody" -ForegroundColor Red
    }
    exit 1
}
