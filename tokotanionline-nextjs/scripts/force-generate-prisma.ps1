# Force Generate Prisma Client
# Script ini akan mencoba beberapa metode untuk generate Prisma client

Write-Host "=== Force Generate Prisma Client ===" -ForegroundColor Cyan
Write-Host ""

# Method 1: Coba generate langsung
Write-Host "[1/3] Attempting direct generate..." -ForegroundColor Yellow
try {
    npx prisma generate
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Success!" -ForegroundColor Green
        exit 0
    }
} catch {
    Write-Host "✗ Failed: $_" -ForegroundColor Red
}

# Method 2: Hapus .prisma folder dan regenerate
Write-Host ""
Write-Host "[2/3] Cleaning .prisma folder and retrying..." -ForegroundColor Yellow
try {
    $prismaPath = "node_modules\.prisma"
    if (Test-Path $prismaPath) {
        Write-Host "Removing .prisma folder..." -ForegroundColor Gray
        Remove-Item -Path $prismaPath -Recurse -Force -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 1
    }
    
    npx prisma generate
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Success!" -ForegroundColor Green
        exit 0
    }
} catch {
    Write-Host "✗ Failed: $_" -ForegroundColor Red
}

# Method 3: Generate dengan flag --skip-generate lalu generate manual
Write-Host ""
Write-Host "[3/3] Final attempt with cleanup..." -ForegroundColor Yellow
Write-Host ""
Write-Host "If this fails, please:" -ForegroundColor Yellow
Write-Host "  1. Stop ALL Node.js processes (dev server, etc.)" -ForegroundColor Yellow
Write-Host "  2. Close your IDE/editor" -ForegroundColor Yellow
Write-Host "  3. Run: npx prisma generate" -ForegroundColor Yellow
Write-Host "  4. Or restart your computer and try again" -ForegroundColor Yellow
Write-Host ""

try {
    # Kill any node processes that might be locking files
    Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
    
    npx prisma generate
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Success!" -ForegroundColor Green
        exit 0
    }
} catch {
    Write-Host "✗ All methods failed" -ForegroundColor Red
    Write-Host ""
    Write-Host "MANUAL STEPS REQUIRED:" -ForegroundColor Red
    Write-Host "1. Close ALL applications (IDE, terminal, dev server)" -ForegroundColor Yellow
    Write-Host "2. Open NEW terminal/PowerShell" -ForegroundColor Yellow
    Write-Host "3. cd to project directory" -ForegroundColor Yellow
    Write-Host "4. Run: npx prisma generate" -ForegroundColor Yellow
    exit 1
}
