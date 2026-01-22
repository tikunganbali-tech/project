# Download images from result JSON and save locally

Write-Host "DOWNLOAD IMAGES FROM RESULT" -ForegroundColor Cyan
Write-Host "===========================" -ForegroundColor Cyan
Write-Host ""

$resultFile = "result-20260111-193726.json"
if (-not (Test-Path $resultFile)) {
    Write-Host "ERROR: Result file not found: $resultFile" -ForegroundColor Red
    exit 1
}

$json = Get-Content $resultFile -Raw | ConvertFrom-Json

# Generate slug from title
$title = $json.content.title
$slug = $title.ToLower() -replace "[^a-z0-9\s-]", "" -replace "\s+", "-" -replace "-+", "-" -replace "^-|-$", ""
if ($slug.Length -gt 100) { $slug = $slug.Substring(0, 100).TrimEnd("-") }

Write-Host "Title: $title" -ForegroundColor White
Write-Host "Slug: $slug" -ForegroundColor White
Write-Host "Images: $($json.images.Count)" -ForegroundColor White
Write-Host ""

$targetDir = "..\public\uploads\$slug"
if (-not (Test-Path $targetDir)) {
    New-Item -ItemType Directory -Path $targetDir -Force | Out-Null
    Write-Host "Created directory: $targetDir" -ForegroundColor Green
}

$successCount = 0
$failedCount = 0

foreach ($img in $json.images) {
    $index = $json.images.IndexOf($img)
    
    # Determine filename
    if ($index -eq 0) {
        $filename = "hero.png"
    } else {
        $filename = "section-$index.png"
    }
    
    $filePath = Join-Path $targetDir $filename
    $url = $img.url
    
    Write-Host "Downloading [$($index + 1)/$($json.images.Count)]: $filename" -ForegroundColor Yellow
    Write-Host "  URL: $($url.Substring(0, [Math]::Min(80, $url.Length)))..." -ForegroundColor Gray
    
    try {
        $response = Invoke-WebRequest -Uri $url -Method GET -TimeoutSec 30 -ErrorAction Stop
        [System.IO.File]::WriteAllBytes($filePath, $response.Content)
        $file = Get-Item $filePath
        Write-Host "  ✅ Saved: $filename ($([Math]::Round($file.Length/1KB, 2)) KB)" -ForegroundColor Green
        $successCount++
    } catch {
        Write-Host "  ❌ Failed: $($_.Exception.Message)" -ForegroundColor Red
        $failedCount++
    }
}

Write-Host ""
Write-Host "SUMMARY" -ForegroundColor Cyan
Write-Host "=======" -ForegroundColor Cyan
Write-Host "Success: $successCount" -ForegroundColor Green
Write-Host "Failed: $failedCount" -ForegroundColor $(if ($failedCount -gt 0) { "Red" } else { "Green" })
Write-Host "Target directory: $targetDir" -ForegroundColor White

if ($successCount -gt 0) {
    Write-Host ""
    Write-Host "✅ Images downloaded successfully!" -ForegroundColor Green
}
