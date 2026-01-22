# Script untuk memperbaiki koneksi database PostgreSQL
# Jalankan: .\scripts\fix-database-connection.ps1

Write-Host "`n=== FIX DATABASE CONNECTION ===" -ForegroundColor Cyan

# Step 1: Cek port PostgreSQL
Write-Host "`n[STEP 1] Checking PostgreSQL port..." -ForegroundColor Yellow
$postgresPaths = @(
    "C:\Program Files\PostgreSQL\18\data\postgresql.conf",
    "C:\Program Files\PostgreSQL\17\data\postgresql.conf",
    "C:\Program Files\PostgreSQL\16\data\postgresql.conf",
    "C:\Program Files\PostgreSQL\15\data\postgresql.conf"
)

$port = $null
foreach ($path in $postgresPaths) {
    if (Test-Path $path) {
        $content = Get-Content $path | Select-String -Pattern "^port\s*="
        if ($content) {
            $port = ($content -split '=')[1].Trim()
            Write-Host "✅ Port ditemukan: $port" -ForegroundColor Green
            break
        }
    }
}

if (-not $port) {
    Write-Host "⚠️  Port tidak ditemukan, menggunakan default: 5432" -ForegroundColor Yellow
    $port = "5432"
}

# Step 2: Test koneksi psql
Write-Host "`n[STEP 2] Testing PostgreSQL connection..." -ForegroundColor Yellow
Write-Host "Jalankan perintah ini di PowerShell (akan diminta password):" -ForegroundColor Cyan
Write-Host "psql -U postgres -h localhost -p $port" -ForegroundColor White
Write-Host "`nSetelah berhasil login, ketik: \q untuk keluar" -ForegroundColor Gray

# Step 3: Minta input dari user
Write-Host "`n[STEP 3] Masukkan informasi database:" -ForegroundColor Yellow
$password = Read-Host "Password PostgreSQL (akan disembunyikan)" -AsSecureString
$passwordPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
    [Runtime.InteropServices.Marshal]::SecureStringToBSTR($password)
)

# Step 4: Update .env.local
Write-Host "`n[STEP 4] Updating .env.local..." -ForegroundColor Yellow
$envFile = ".env.local"
$newDbUrl = "postgresql://postgres:$passwordPlain@localhost:$port/tokotanionline"

if (Test-Path $envFile) {
    $content = Get-Content $envFile
    $updated = $false
    $newContent = @()
    
    foreach ($line in $content) {
        if ($line -match "^DATABASE_URL=") {
            $newContent += "DATABASE_URL=$newDbUrl"
            $updated = $true
        } else {
            $newContent += $line
        }
    }
    
    if (-not $updated) {
        $newContent += "DATABASE_URL=$newDbUrl"
    }
    
    $newContent | Set-Content $envFile
    Write-Host "✅ DATABASE_URL updated!" -ForegroundColor Green
} else {
    Add-Content $envFile "DATABASE_URL=$newDbUrl"
    Write-Host "✅ .env.local created with DATABASE_URL!" -ForegroundColor Green
}

# Step 5: Test Prisma
Write-Host "`n[STEP 5] Testing Prisma connection..." -ForegroundColor Yellow
Write-Host "Jalankan: npx prisma db push" -ForegroundColor White

Write-Host "`n✅ Script selesai!" -ForegroundColor Green
Write-Host "Lanjutkan dengan: npx prisma db push" -ForegroundColor Cyan

