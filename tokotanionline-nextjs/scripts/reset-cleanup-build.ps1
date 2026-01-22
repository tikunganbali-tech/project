# ============================================
# RESET: HAPUS BUILD ARTIFACTS & CACHE
# ============================================
# Tujuan: Hapus semua file build dan cache
# AMAN: Tidak merusak source code atau konfigurasi
# ============================================

Write-Host "🧹 STEP 3: Hapus Build Artifacts & Cache" -ForegroundColor Cyan
Write-Host ""

$projectRoot = $PSScriptRoot + "\.."
Set-Location $projectRoot

# Frontend Build Artifacts
Write-Host "  [1/4] Hapus .next folder..." -ForegroundColor Yellow
if (Test-Path ".next") {
    Remove-Item -Recurse -Force ".next"
    Write-Host "    ✓ .next dihapus" -ForegroundColor Green
} else {
    Write-Host "    - .next tidak ada" -ForegroundColor Gray
}

Write-Host "  [2/4] Hapus node_modules/.cache..." -ForegroundColor Yellow
if (Test-Path "node_modules\.cache") {
    Remove-Item -Recurse -Force "node_modules\.cache"
    Write-Host "    ✓ node_modules/.cache dihapus" -ForegroundColor Green
} else {
    Write-Host "    - node_modules/.cache tidak ada" -ForegroundColor Gray
}

# Engine Build Artifacts
Write-Host "  [3/4] Hapus engine-hub/tmp..." -ForegroundColor Yellow
if (Test-Path "engine-hub\tmp") {
    Remove-Item -Recurse -Force "engine-hub\tmp"
    Write-Host "    ✓ engine-hub/tmp dihapus" -ForegroundColor Green
} else {
    Write-Host "    - engine-hub/tmp tidak ada" -ForegroundColor Gray
}

Write-Host "  [4/4] Hapus engine-hub/logs..." -ForegroundColor Yellow
if (Test-Path "engine-hub\logs") {
    Remove-Item -Recurse -Force "engine-hub\logs"
    Write-Host "    ✓ engine-hub/logs dihapus" -ForegroundColor Green
} else {
    Write-Host "    - engine-hub/logs tidak ada" -ForegroundColor Gray
}

# Engine build artifacts (Go)
Write-Host "  [5/5] Hapus engine-hub/bin dan executable..." -ForegroundColor Yellow
if (Test-Path "engine-hub\bin") {
    Remove-Item -Recurse -Force "engine-hub\bin"
    Write-Host "    ✓ engine-hub/bin dihapus" -ForegroundColor Green
}

# Hapus executable Go jika ada di root engine-hub
Get-ChildItem -Path "engine-hub" -Filter "*.exe" -ErrorAction SilentlyContinue | ForEach-Object {
    Remove-Item $_.FullName -Force
    Write-Host "    ✓ $($_.Name) dihapus" -ForegroundColor Green
}

Write-Host ""
Write-Host "✓ Build artifacts & cache cleanup selesai!" -ForegroundColor Green
