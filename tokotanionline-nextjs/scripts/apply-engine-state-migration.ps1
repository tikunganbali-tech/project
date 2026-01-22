# ENGINE CONTROL CENTER - Migration Script
# Apply migration untuk EngineState table

Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  ENGINE CONTROL CENTER - MIGRATION SCRIPT" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Step 1: Check if migration file exists
$migrationFile = "prisma\migrations\20260111_add_engine_state\migration.sql"
if (-not (Test-Path $migrationFile)) {
    Write-Host "❌ Migration file tidak ditemukan: $migrationFile" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Migration file ditemukan" -ForegroundColor Green
Write-Host ""

# Step 2: Check if table already exists
Write-Host "Checking if EngineState table exists..." -ForegroundColor Yellow
$checkTable = @"
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'EngineState'
);
"@

try {
    $result = psql -U postgres -d tokotanionline -t -c $checkTable
    if ($result -match "t|true") {
        Write-Host "⚠️  EngineState table sudah ada. Skip migration?" -ForegroundColor Yellow
        $response = Read-Host "Continue anyway? (y/n)"
        if ($response -ne "y") {
            Write-Host "Migration dibatalkan." -ForegroundColor Yellow
            exit 0
        }
    }
} catch {
    Write-Host "⚠️  Tidak bisa check table (mungkin belum connect ke DB)" -ForegroundColor Yellow
    Write-Host "   Lanjutkan dengan manual migration jika perlu." -ForegroundColor Yellow
}

Write-Host ""

# Step 3: Apply migration
Write-Host "Step 1: Generate Prisma Client..." -ForegroundColor Yellow
try {
    npx prisma generate
    if ($LASTEXITCODE -ne 0) {
        Write-Host "⚠️  Prisma generate gagal. Pastikan server sudah di-stop." -ForegroundColor Yellow
        Write-Host "   Lanjutkan dengan manual: npx prisma generate" -ForegroundColor Yellow
    } else {
        Write-Host "✅ Prisma Client generated" -ForegroundColor Green
    }
} catch {
    Write-Host "⚠️  Error: $_" -ForegroundColor Yellow
}

Write-Host ""

Write-Host "Step 2: Apply database migration..." -ForegroundColor Yellow
Write-Host "   OPSI A: Menggunakan Prisma Migrate" -ForegroundColor Gray
Write-Host "   npx prisma migrate deploy" -ForegroundColor Gray
Write-Host ""
Write-Host "   OPSI B: Manual SQL (psql)" -ForegroundColor Gray
Write-Host "   psql -U postgres -d tokotanionline -f $migrationFile" -ForegroundColor Gray
Write-Host ""

$choice = Read-Host "Pilih opsi (A/B) atau tekan Enter untuk skip"
if ($choice -eq "A" -or $choice -eq "a") {
    try {
        npx prisma migrate deploy
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Migration applied successfully" -ForegroundColor Green
        } else {
            Write-Host "❌ Migration failed" -ForegroundColor Red
        }
    } catch {
        Write-Host "❌ Error: $_" -ForegroundColor Red
    }
} elseif ($choice -eq "B" -or $choice -eq "b") {
    Write-Host "Jalankan manual:" -ForegroundColor Yellow
    Write-Host "   psql -U postgres -d tokotanionline -f $migrationFile" -ForegroundColor Cyan
} else {
    Write-Host "Migration step skipped. Jalankan manual jika perlu." -ForegroundColor Yellow
}

Write-Host ""

# Step 4: Run tests
Write-Host "Step 3: Run E2E tests..." -ForegroundColor Yellow
$runTests = Read-Host "Jalankan tests? (y/n)"
if ($runTests -eq "y" -or $runTests -eq "Y") {
    try {
        npx tsx scripts/test-engine-control-e2e.ts
    } catch {
        Write-Host "⚠️  Test error: $_" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  SETUP COMPLETE" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. Start server: npm run dev" -ForegroundColor Gray
Write-Host "  2. Buka: http://localhost:3000/admin/system/engine-control" -ForegroundColor Gray
Write-Host "  3. Test semua flow sesuai checklist" -ForegroundColor Gray
Write-Host ""
