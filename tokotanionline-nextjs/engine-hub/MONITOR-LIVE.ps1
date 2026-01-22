# Live monitoring - refresh setiap 5 detik

param(
    [int]$Interval = 5
)

Write-Host "🔍 LIVE MONITORING - Refresh setiap $Interval detik" -ForegroundColor Cyan
Write-Host "Press Ctrl+C to stop" -ForegroundColor Gray
Write-Host ""

while ($true) {
    Clear-Host
    Write-Host "🔍 MONITORING STATUS - $(Get-Date -Format 'HH:mm:ss')" -ForegroundColor Cyan
    Write-Host "=" * 50 -ForegroundColor Cyan
    Write-Host ""
    
    # 1. Server Status
    Write-Host "1️⃣  SERVER:" -ForegroundColor Yellow
    try {
        $health = Invoke-RestMethod -Uri "http://localhost:8090/health" -TimeoutSec 2 -ErrorAction Stop
        $uptimeMin = [Math]::Round($health.uptime / 60, 1)
        Write-Host "    ✅ Running" -ForegroundColor Green
        Write-Host "    Uptime: $uptimeMin minutes" -ForegroundColor Gray
    } catch {
        Write-Host "    ❌ Not responding" -ForegroundColor Red
    }
    Write-Host ""
    
    # 2. Latest Result
    Write-Host "2️⃣  LATEST RESULT:" -ForegroundColor Yellow
    $result = Get-ChildItem -Filter "result-*.json" -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending | Select-Object -First 1
    if ($result) {
        $age = (Get-Date) - $result.LastWriteTime
        Write-Host "    ✅ $($result.Name)" -ForegroundColor Green
        Write-Host "    Age: $($age.TotalSeconds.ToString('F0')) seconds ago" -ForegroundColor Gray
        Write-Host "    Size: $([Math]::Round($result.Length/1KB, 2)) KB" -ForegroundColor Gray
        
        try {
            $content = Get-Content $result.FullName -Raw -ErrorAction Stop | ConvertFrom-Json -ErrorAction Stop
            Write-Host "    Status: $($content.status)" -ForegroundColor $(if ($content.status -eq "DRAFT_AI") { "Green" } else { "Yellow" })
            if ($content.content) {
                Write-Host "    Title: $($content.content.title.Substring(0, [Math]::Min(50, $content.content.title.Length)))..." -ForegroundColor White
            }
            if ($content.images) {
                Write-Host "    Images: $($content.images.Count)" -ForegroundColor White
            }
        } catch {
            Write-Host "    ⚠️  File sedang ditulis..." -ForegroundColor Yellow
        }
    } else {
        Write-Host "    ⚠️  Belum ada file result" -ForegroundColor Yellow
    }
    Write-Host ""
    
    # 3. Latest Article
    Write-Host "3️⃣  LATEST ARTICLE:" -ForegroundColor Yellow
    $article = Get-ChildItem -Filter "article-*.md" -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending | Select-Object -First 1
    if ($article) {
        $age = (Get-Date) - $article.LastWriteTime
        Write-Host "    ✅ $($article.Name)" -ForegroundColor Green
        Write-Host "    Age: $($age.TotalSeconds.ToString('F0')) seconds ago" -ForegroundColor Gray
        Write-Host "    Size: $([Math]::Round($article.Length/1KB, 2)) KB" -ForegroundColor Gray
        
        $lines = (Get-Content $article.FullName -ErrorAction SilentlyContinue).Count
        $imageRefs = (Select-String -Path $article.FullName -Pattern '!\[.*?\]\(/uploads/.*?\)' -ErrorAction SilentlyContinue).Count
        Write-Host "    Lines: $lines" -ForegroundColor White
        Write-Host "    Image refs: $imageRefs" -ForegroundColor $(if ($imageRefs -gt 0) { "Green" } else { "Yellow" })
    } else {
        Write-Host "    ⚠️  Belum ada file article" -ForegroundColor Yellow
    }
    Write-Host ""
    
    # 4. Image Storage
    Write-Host "4️⃣  IMAGE STORAGE:" -ForegroundColor Yellow
    $uploadsDir = "..\public\uploads"
    if (Test-Path $uploadsDir) {
        $folders = Get-ChildItem $uploadsDir -Directory -ErrorAction SilentlyContinue | Where-Object { $_.Name -ne "site" } | Sort-Object LastWriteTime -Descending
        if ($folders) {
            Write-Host "    ✅ $($folders.Count) folder(s)" -ForegroundColor Green
            foreach ($folder in $folders | Select-Object -First 3) {
                $files = Get-ChildItem $folder.FullName -File -ErrorAction SilentlyContinue
                $age = (Get-Date) - $folder.LastWriteTime
                Write-Host "    📁 $($folder.Name) ($($files.Count) files, $($age.TotalSeconds.ToString('F0'))s ago)" -ForegroundColor Gray
            }
        } else {
            Write-Host "    ⚠️  Belum ada folder artikel" -ForegroundColor Yellow
        }
    } else {
        Write-Host "    ❌ Uploads directory tidak ditemukan" -ForegroundColor Red
    }
    Write-Host ""
    
    # 5. Process Status
    Write-Host "5️⃣  PROCESSES:" -ForegroundColor Yellow
    $goProcs = Get-Process -Name "go" -ErrorAction SilentlyContinue
    if ($goProcs) {
        Write-Host "    🔵 Go: $($goProcs.Count) process(es)" -ForegroundColor White
    } else {
        Write-Host "    ⚠️  No Go processes" -ForegroundColor Yellow
    }
    Write-Host ""
    
    Write-Host "Next refresh in $Interval seconds... (Ctrl+C to stop)" -ForegroundColor DarkGray
    Start-Sleep -Seconds $Interval
}
