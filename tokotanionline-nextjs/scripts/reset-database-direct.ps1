# ============================================
# RESET DATABASE DIRECT (PowerShell)
# ============================================
# Eksekusi langsung reset database tanpa interaksi
# ============================================

param(
    [string]$DatabaseName = "tokotanionline",
    [string]$User = "postgres",
    [switch]$UseAggressive = $false
)

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "🔴 RESET DATABASE DIRECT" -ForegroundColor Red
Write-Host ""

$projectRoot = $PSScriptRoot + "\.."
Set-Location $projectRoot

# Pilih SQL file
if ($UseAggressive) {
    $sqlFile = Join-Path $projectRoot "scripts\reset-database-aggressive.sql"
    Write-Host "→ Menggunakan mode AGGRESSIVE (DELETE)" -ForegroundColor Yellow
} else {
    $sqlFile = Join-Path $projectRoot "scripts\reset-database.sql"
    Write-Host "→ Menggunakan mode STANDARD (TRUNCATE)" -ForegroundColor Yellow
}

if (-not (Test-Path $sqlFile)) {
    Write-Host "❌ File SQL tidak ditemukan: $sqlFile" -ForegroundColor Red
    exit 1
}

# Cek apakah psql tersedia
$psqlPath = Get-Command psql -ErrorAction SilentlyContinue
if (-not $psqlPath) {
    Write-Host "❌ psql tidak ditemukan!" -ForegroundColor Red
    Write-Host "→ Install PostgreSQL atau tambahkan ke PATH" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "⚠️  PERINGATAN: Semua data akan dihapus!" -ForegroundColor Yellow
Write-Host "   Database: $DatabaseName" -ForegroundColor Gray
Write-Host "   User: $User" -ForegroundColor Gray
Write-Host "   SQL File: $sqlFile" -ForegroundColor Gray
Write-Host ""

$confirm = Read-Host "Lanjutkan? (ketik 'YES' untuk konfirmasi)"
if ($confirm -ne "YES") {
    Write-Host "❌ Dibatalkan oleh user" -ForegroundColor Red
    exit 0
}

Write-Host ""
Write-Host "→ Menjalankan SQL reset..." -ForegroundColor Yellow

try {
    # Prompt untuk password
    $pgPassword = Read-Host "Masukkan password PostgreSQL ($User) [Enter jika trust auth]" -AsSecureString
    
    if ($pgPassword.Length -gt 0) {
        $BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($pgPassword)
        $plainPassword = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)
        $env:PGPASSWORD = $plainPassword
        [System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($BSTR)
    }
    
    # Jalankan SQL
    $result = & psql -U $User -d $DatabaseName -f $sqlFile 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "✅ Database reset berhasil!" -ForegroundColor Green
        Write-Host ""
        Write-Host "→ Verifikasi dengan menjalankan:" -ForegroundColor Yellow
        Write-Host "   .\scripts\verify-reset.ps1" -ForegroundColor Gray
    } else {
        Write-Host ""
        Write-Host "❌ Error saat reset database (exit code: $LASTEXITCODE)" -ForegroundColor Red
        Write-Host ""
        Write-Host "Output:" -ForegroundColor Yellow
        Write-Host $result -ForegroundColor Red
        Write-Host ""
        Write-Host "→ Coba dengan mode aggressive:" -ForegroundColor Yellow
        Write-Host "   .\scripts\reset-database-direct.ps1 -UseAggressive" -ForegroundColor Gray
        exit 1
    }
    
} catch {
    Write-Host ""
    Write-Host "❌ Error: $_" -ForegroundColor Red
    exit 1
} finally {
    if ($env:PGPASSWORD) {
        Remove-Item Env:\PGPASSWORD
    }
}

Write-Host ""
