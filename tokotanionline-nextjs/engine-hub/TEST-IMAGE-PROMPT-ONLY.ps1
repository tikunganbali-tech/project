# Test image generation dengan prompt baru saja (gunakan artikel yang sudah ada)

$env:OPENAI_API_KEY = "YOUR_OPENAI_API_KEY_HERE"
$env:IMAGE_API_KEY = $env:OPENAI_API_KEY

Write-Host "TEST IMAGE GENERATION - NEW PROMPT" -ForegroundColor Cyan
Write-Host "===================================" -ForegroundColor Cyan
Write-Host ""

# Baca artikel yang sudah ada
$articleFile = "article-20260111-193726.md"
if (-not (Test-Path $articleFile)) {
    Write-Host "ERROR: Article file not found: $articleFile" -ForegroundColor Red
    exit 1
}

$articleBody = Get-Content $articleFile -Raw
$title = "Panduan Dasar Memahami Sarana Produksi Pertanian — Konsep, Alur, dan Kesalahan Umum"

# Generate slug
$slug = $title.ToLower() -replace "[^a-z0-9\s-]", "" -replace "\s+", "-" -replace "-+", "-" -replace "^-|-$", ""
if ($slug.Length -gt 100) { $slug = $slug.Substring(0, 100).TrimEnd("-") }

Write-Host "Title: $title" -ForegroundColor White
Write-Host "Slug: $slug" -ForegroundColor White
Write-Host ""

# Test langsung image generation via API internal
# Tapi karena tidak ada endpoint terpisah, kita perlu generate ulang artikel
# Tapi dengan outline yang sudah fix (tanpa H4)

# Alternatif: Test dengan outline yang sudah benar
$outlineFile = "..\docs\OUTLINE-K1-CORNERSTONE-PANDUAN-DASAR.md"
$outlineContent = Get-Content $outlineFile | Select-Object -Skip 27
$outlineText = $outlineContent -join "`n"

# Hapus H4 dari outline jika ada (untuk test)
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

Write-Host "Calling generation with cleaned outline (no H4)..." -ForegroundColor Yellow
Write-Host ""

try {
    $startTime = Get-Date
    $response = Invoke-RestMethod -Method POST -Uri "http://localhost:8090/api/engine/ai/generate" -Body $payload -ContentType "application/json; charset=utf-8" -TimeoutSec 600
    $duration = ((Get-Date) - $startTime).TotalSeconds
    
    Write-Host "✅ Generation completed in $([Math]::Round($duration, 1)) seconds" -ForegroundColor Green
    Write-Host ""
    Write-Host "Status: $($response.status)" -ForegroundColor White
    Write-Host "Title: $($response.content.title)" -ForegroundColor White
    Write-Host "Images: $($response.images.Count)" -ForegroundColor White
    Write-Host ""
    
    # Check prompts
    if ($response.images.Count -gt 0) {
        Write-Host "IMAGE PROMPTS (NEW TEMPLATE):" -ForegroundColor Cyan
        foreach ($img in $response.images) {
            Write-Host ""
            Write-Host "  [$($response.images.IndexOf($img) + 1)] $($img.heading)" -ForegroundColor Yellow
            Write-Host "  Prompt: $($img.prompt.Substring(0, [Math]::Min(150, $img.prompt.Length)))..." -ForegroundColor Gray
            Write-Host "  LocalPath: $($img.localPath)" -ForegroundColor $(if ($img.localPath) { "Green" } else { "Yellow" })
        }
    }
    
    $timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
    $response | ConvertTo-Json -Depth 10 | Out-File "result-test-prompt-$timestamp.json" -Encoding UTF8
    if ($response.content.body) {
        $response.content.body | Out-File "article-test-prompt-$timestamp.md" -Encoding UTF8
    }
    
    Write-Host ""
    Write-Host "Files saved: result-test-prompt-$timestamp.json, article-test-prompt-$timestamp.md" -ForegroundColor Green
    
    $response
} catch {
    Write-Host "❌ ERROR: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response: $responseBody" -ForegroundColor Red
    }
    exit 1
}
