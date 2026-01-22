# Test download image directly

$imageUrl = "https://oaidalleapiprodscus.blob.core.windows.net/private/org-mzSPPlo7xX2Q9FrABtUtv3Tm/user-fXx5XWeFnhCL2RNLs0FpI5jg/img-b7gagPcMRKDz9hCkCpnXCUJd.png?st=2026-01-11T11%3A36%3A21Z&se=2026-01-11T13%3A36%3A21Z&sp=r&sv=2024-08-04&sr=b&rscd=inline&rsct=image/png&skoid=35890473-cca8-4a54-8305-05a39e0bc9c3&sktid=a48cca56-e6da-484e-a814-9c849652bcb3&skt=2026-01-11T12%3A36%3A21Z&ske=2026-01-12T12%3A36%3A21Z&sks=b&skv=2024-08-04&sig=hOAJORrqifHdzQhQcolHKfdnLvh1F0RGbrpKGU3Vb3g%3D"

Write-Host "Testing image download..." -ForegroundColor Cyan
Write-Host "URL: $imageUrl" -ForegroundColor Gray
Write-Host ""

$targetDir = "..\public\uploads\test-article"
if (-not (Test-Path $targetDir)) {
    New-Item -ItemType Directory -Path $targetDir -Force | Out-Null
}

try {
    $response = Invoke-WebRequest -Uri $imageUrl -Method GET -TimeoutSec 30
    Write-Host "Download successful!" -ForegroundColor Green
    Write-Host "Content-Type: $($response.Headers['Content-Type'])" -ForegroundColor White
    Write-Host "Size: $($response.Content.Length) bytes" -ForegroundColor White
    
    $filePath = Join-Path $targetDir "hero.png"
    [System.IO.File]::WriteAllBytes($filePath, $response.Content)
    Write-Host "Saved to: $filePath" -ForegroundColor Green
    
    if (Test-Path $filePath) {
        $file = Get-Item $filePath
        Write-Host "File exists: YES ($($file.Length) bytes)" -ForegroundColor Green
    }
} catch {
    Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
}
