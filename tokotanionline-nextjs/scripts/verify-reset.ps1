# ============================================
# VERIFIKASI RESET DATABASE
# ============================================
# Cek apakah semua tabel data sudah kosong
# ============================================

Write-Host "🔍 VERIFIKASI RESET DATABASE" -ForegroundColor Cyan
Write-Host ""

$projectRoot = $PSScriptRoot + "\.."
Set-Location $projectRoot

# Query untuk cek jumlah data di setiap tabel
$checkQuery = @"
SELECT 
  schemaname,
  tablename,
  n_live_tup as row_count
FROM pg_stat_user_tables
WHERE schemaname = 'public'
  AND tablename NOT IN ('Brand', 'Locale', 'Admin', 'SiteSettings', '_prisma_migrations')
ORDER BY row_count DESC, tablename;
"@

# Cek apakah psql tersedia
$psqlPath = Get-Command psql -ErrorAction SilentlyContinue
if (-not $psqlPath) {
    Write-Host "❌ psql tidak ditemukan!" -ForegroundColor Red
    Write-Host "→ Install PostgreSQL atau tambahkan ke PATH" -ForegroundColor Yellow
    exit 1
}

Write-Host "→ Menjalankan query verifikasi..." -ForegroundColor Yellow
Write-Host ""

try {
    # Prompt untuk password (opsional)
    $pgPassword = Read-Host "Masukkan password PostgreSQL (postgres) [Enter jika trust auth]"
    if ($pgPassword) {
        $env:PGPASSWORD = $pgPassword
    }
    
    # Cek database name dari .env atau gunakan default
    $dbName = "tokotanionline"
    if (Test-Path ".env.local") {
        $envContent = Get-Content ".env.local" | Where-Object { $_ -match "DATABASE_URL" }
        if ($envContent -match "/([^/?]+)") {
            $dbName = $matches[1]
        }
    }
    
    Write-Host "→ Database: $dbName" -ForegroundColor Gray
    Write-Host ""
    
    # Jalankan query
    $result = & psql -U postgres -d $dbName -t -A -F "|" -c $checkQuery 2>&1
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Error saat menjalankan query!" -ForegroundColor Red
        Write-Host $result -ForegroundColor Red
        exit 1
    }
    
    # Parse hasil
    $tablesWithData = @()
    $totalRows = 0
    
    foreach ($line in $result) {
        if ($line -match '^\s*$') { continue }
        
        $parts = $line -split '\|'
        if ($parts.Count -ge 3) {
            $tableName = $parts[1].Trim()
            $rowCount = [int]$parts[2].Trim()
            
            if ($rowCount -gt 0) {
                $tablesWithData += [PSCustomObject]@{
                    Table = $tableName
                    Rows = $rowCount
                }
                $totalRows += $rowCount
            }
        }
    }
    
    # Tampilkan hasil
    if ($tablesWithData.Count -eq 0) {
        Write-Host "✅ SEMUA TABEL SUDAH KOSONG!" -ForegroundColor Green
        Write-Host ""
        Write-Host "Database dalam kondisi VIRGIN ✓" -ForegroundColor Green
    } else {
        Write-Host "❌ MASIH ADA DATA DI TABEL BERIKUT:" -ForegroundColor Red
        Write-Host ""
        
        $tablesWithData | Format-Table -AutoSize
        
        Write-Host ""
        Write-Host "Total: $($tablesWithData.Count) tabel dengan $totalRows baris data" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "⚠️  Reset belum lengkap! Jalankan reset-database.sql lagi" -ForegroundColor Yellow
    }
    
} catch {
    Write-Host "❌ Error: $_" -ForegroundColor Red
} finally {
    if ($env:PGPASSWORD) {
        Remove-Item Env:\PGPASSWORD
    }
}

Write-Host ""
