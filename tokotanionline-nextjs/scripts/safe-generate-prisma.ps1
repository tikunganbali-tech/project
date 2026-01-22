# Safe Generate Prisma Client
# Script ini akan generate Prisma client dengan cara yang aman

Write-Host "=== Safe Generate Prisma Client ===" -ForegroundColor Cyan
Write-Host ""

# Cek apakah ada dev server yang running
$nodeProcesses = Get-Process node -ErrorAction SilentlyContinue | Where-Object {
    $_.Path -like "*nodejs*"
}

if ($nodeProcesses) {
    Write-Host "WARNING: Ada proses Node.js yang running" -ForegroundColor Yellow
    Write-Host "   Jumlah proses: $($nodeProcesses.Count)" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Jika dev server sedang running, silakan stop dulu (Ctrl+C)" -ForegroundColor Yellow
    Write-Host "Tekan Enter untuk lanjut..." -ForegroundColor Yellow
    $null = Read-Host
}

Write-Host "Generating Prisma Client..." -ForegroundColor Cyan
Write-Host ""

try {
    npx prisma generate
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "SUCCESS! Prisma Client generated!" -ForegroundColor Green
        Write-Host ""
        Write-Host "Next steps:" -ForegroundColor Cyan
        Write-Host "  1. Start dev server: npm run dev" -ForegroundColor White
        Write-Host "  2. Test fitur Products di /admin/products" -ForegroundColor White
        Write-Host ""
        exit 0
    } else {
        throw "Prisma generate failed"
    }
} catch {
    Write-Host ""
    Write-Host "FAILED to generate Prisma Client" -ForegroundColor Red
    Write-Host ""
    Write-Host "Error: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "SOLUSI:" -ForegroundColor Yellow
    Write-Host "  1. Pastikan dev server sudah di-STOP (Ctrl+C)" -ForegroundColor White
    Write-Host "  2. Tutup semua terminal yang menggunakan Prisma" -ForegroundColor White
    Write-Host "  3. Coba jalankan manual: npx prisma generate" -ForegroundColor White
    Write-Host ""
    Write-Host "  4. Atau restart komputer dan coba lagi" -ForegroundColor White
    Write-Host ""
    exit 1
}
