# Simple status check

Write-Host "🔍 STATUS CHECK" -ForegroundColor Cyan
Write-Host "===============" -ForegroundColor Cyan
Write-Host ""

# Server
Write-Host "1. Server:" -ForegroundColor Yellow
try {
    $h = Invoke-RestMethod -Uri "http://localhost:8090/health" -TimeoutSec 2
    Write-Host "   ✅ Running (uptime: $($h.uptime) seconds)" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Not responding" -ForegroundColor Red
}
Write-Host ""

# Result files
Write-Host "2. Result files:" -ForegroundColor Yellow
$r = Get-ChildItem -Filter "result-*.json" -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending | Select-Object -First 1
if ($r) {
    $ageSec = [Math]::Round(((Get-Date) - $r.LastWriteTime).TotalSeconds, 0)
    Write-Host "   ✅ $($r.Name)" -ForegroundColor Green
    Write-Host "      Age: $ageSec seconds ago" -ForegroundColor Gray
    Write-Host "      Size: $([Math]::Round($r.Length/1KB, 2)) KB" -ForegroundColor Gray
} else {
    Write-Host "   ⚠️  None yet" -ForegroundColor Yellow
}
Write-Host ""

# Article files
Write-Host "3. Article files:" -ForegroundColor Yellow
$a = Get-ChildItem -Filter "article-*.md" -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending | Select-Object -First 1
if ($a) {
    $ageSec = [Math]::Round(((Get-Date) - $a.LastWriteTime).TotalSeconds, 0)
    Write-Host "   ✅ $($a.Name)" -ForegroundColor Green
    Write-Host "      Age: $ageSec seconds ago" -ForegroundColor Gray
    Write-Host "      Size: $([Math]::Round($a.Length/1KB, 2)) KB" -ForegroundColor Gray
} else {
    Write-Host "   ⚠️  None yet" -ForegroundColor Yellow
}
Write-Host ""

# Image folders
Write-Host "4. Image folders:" -ForegroundColor Yellow
$up = "..\public\uploads"
if (Test-Path $up) {
    $folders = Get-ChildItem $up -Directory -ErrorAction SilentlyContinue | Where-Object { $_.Name -ne "site" }
    if ($folders) {
        $count = $folders.Count
        Write-Host "   ✅ $count folder(s):" -ForegroundColor Green
        foreach ($f in $folders) {
            $files = Get-ChildItem $f.FullName -File -ErrorAction SilentlyContinue
            $fileCount = $files.Count
            Write-Host "      - $($f.Name) ($fileCount file(s))" -ForegroundColor Gray
        }
    } else {
        Write-Host "   ⚠️  None yet" -ForegroundColor Yellow
    }
} else {
    Write-Host "   ⚠️  Uploads dir not found" -ForegroundColor Yellow
}
Write-Host ""

Write-Host "✅ Check complete" -ForegroundColor Green
