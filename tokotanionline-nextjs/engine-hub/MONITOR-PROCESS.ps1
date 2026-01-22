# Monitor proses generasi artikel + gambar

Write-Host "🔍 MONITORING PROSES GENERASI" -ForegroundColor Cyan
Write-Host "==============================" -ForegroundColor Cyan
Write-Host ""

# Check server status
Write-Host "1️⃣ SERVER STATUS:" -ForegroundColor Yellow
try {
    $health = Invoke-WebRequest -Uri "http://localhost:8090/health" -Method GET -TimeoutSec 2 -ErrorAction Stop
    Write-Host "   ✅ Server running on port 8090" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Server not running" -ForegroundColor Red
}
Write-Host ""

# Check latest result files
Write-Host "2️⃣ LATEST RESULT FILES:" -ForegroundColor Yellow
$resultFiles = Get-ChildItem -Filter "result-*.json" -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending | Select-Object -First 1
if ($resultFiles) {
    $age = (Get-Date) - $resultFiles.LastWriteTime
    Write-Host "   📄 $($resultFiles.Name)" -ForegroundColor White
    Write-Host "   ⏰ Last modified: $($age.TotalSeconds.ToString('F1')) seconds ago" -ForegroundColor Gray
    Write-Host "   📦 Size: $($resultFiles.Length) bytes" -ForegroundColor Gray
    
    # Try to read and show status
    try {
        $content = Get-Content $resultFiles.FullName -Raw | ConvertFrom-Json
        Write-Host "   Status: $($content.status)" -ForegroundColor $(if ($content.status -eq "DRAFT_AI") { "Green" } else { "Yellow" })
        if ($content.content) {
            Write-Host "   Title: $($content.content.title)" -ForegroundColor White
        }
        if ($content.images) {
            Write-Host "   Images: $($content.images.Count)" -ForegroundColor White
        }
    } catch {
        Write-Host "   ⚠️  File masih dalam proses atau corrupted" -ForegroundColor Yellow
    }
} else {
    Write-Host "   ⚠️  No result files found yet" -ForegroundColor Yellow
}
Write-Host ""

# Check article files
Write-Host "3️⃣ LATEST ARTICLE FILES:" -ForegroundColor Yellow
$articleFiles = Get-ChildItem -Filter "article-*.md" -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending | Select-Object -First 1
if ($articleFiles) {
    $age = (Get-Date) - $articleFiles.LastWriteTime
    Write-Host "   📄 $($articleFiles.Name)" -ForegroundColor White
    Write-Host "   ⏰ Last modified: $($age.TotalSeconds.ToString('F1')) seconds ago" -ForegroundColor Gray
    Write-Host "   📦 Size: $($articleFiles.Length) bytes" -ForegroundColor Gray
    
    # Count lines and check for images
    $lines = Get-Content $articleFiles.FullName
    $imageRefs = ($lines | Select-String -Pattern '!\[.*?\]\(/uploads/.*?\)').Count
    Write-Host "   Lines: $($lines.Count)" -ForegroundColor White
    Write-Host "   Image references: $imageRefs" -ForegroundColor $(if ($imageRefs -gt 0) { "Green" } else { "Yellow" })
} else {
    Write-Host "   ⚠️  No article files found yet" -ForegroundColor Yellow
}
Write-Host ""

# Check image folders
Write-Host "4️⃣ IMAGE STORAGE:" -ForegroundColor Yellow
$uploadsDir = "..\public\uploads"
if (Test-Path $uploadsDir) {
    $articleFolders = Get-ChildItem $uploadsDir -Directory -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending
    if ($articleFolders.Count -gt 0) {
        Write-Host "   📁 Found $($articleFolders.Count) article folder(s):" -ForegroundColor White
        foreach ($folder in $articleFolders | Select-Object -First 3) {
            $files = Get-ChildItem $folder.FullName -File -ErrorAction SilentlyContinue
            $age = (Get-Date) - $folder.LastWriteTime
            Write-Host "      - $($folder.Name) ($($files.Count) files, $($age.TotalSeconds.ToString('F1'))s ago)" -ForegroundColor Gray
            foreach ($file in $files | Select-Object -First 3) {
                Write-Host "        • $($file.Name) ($([Math]::Round($file.Length/1KB, 2)) KB)" -ForegroundColor DarkGray
            }
        }
    } else {
        Write-Host "   ⚠️  No article folders found" -ForegroundColor Yellow
    }
} else {
    Write-Host "   ⚠️  Uploads directory not found" -ForegroundColor Yellow
}
Write-Host ""

# Check running processes
Write-Host "5️⃣ RUNNING PROCESSES:" -ForegroundColor Yellow
$goProcesses = Get-Process -Name "go" -ErrorAction SilentlyContinue
$psProcesses = Get-Process -Name "powershell" -ErrorAction SilentlyContinue | Where-Object { $_.Id -ne $PID }
if ($goProcesses) {
    Write-Host "   🔵 Go processes: $($goProcesses.Count)" -ForegroundColor White
    foreach ($proc in $goProcesses | Select-Object -First 3) {
        $runtime = (Get-Date) - $proc.StartTime
        Write-Host "      - PID $($proc.Id) (running for $($runtime.TotalMinutes.ToString('F1')) min)" -ForegroundColor Gray
    }
} else {
    Write-Host "   ⚠️  No Go processes found" -ForegroundColor Yellow
}
if ($psProcesses) {
    Write-Host "   🔵 PowerShell processes: $($psProcesses.Count)" -ForegroundColor White
    foreach ($proc in $psProcesses | Select-Object -First 3) {
        $runtime = (Get-Date) - $proc.StartTime
        Write-Host "      - PID $($proc.Id) (running for $($runtime.TotalMinutes.ToString('F1')) min)" -ForegroundColor Gray
    }
}
Write-Host ""

Write-Host "✅ Monitoring complete" -ForegroundColor Green
