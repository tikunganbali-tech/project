# ENGINE CONTROL CENTER - Auto Migration Script (Non-Interactive)
# Apply migration untuk EngineState table tanpa interaktif input

Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  ENGINE CONTROL CENTER - AUTO MIGRATION" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Step 1: Check migration file
$migrationFile = "prisma\migrations\20260111_add_engine_state\migration.sql"
if (-not (Test-Path $migrationFile)) {
    Write-Host "❌ Migration file tidak ditemukan: $migrationFile" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Migration file ditemukan" -ForegroundColor Green
Write-Host ""

# Step 2: Try Prisma Generate (may fail if server running)
Write-Host "Step 1: Generate Prisma Client..." -ForegroundColor Yellow
try {
    $env:PRISMA_CLIENT_ENGINE_TYPE = "binary"
    npx prisma generate 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Prisma Client generated" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Prisma generate gagal (file mungkin locked)" -ForegroundColor Yellow
        Write-Host "   Pastikan server sudah di-stop, lalu jalankan: npx prisma generate" -ForegroundColor Yellow
    }
} catch {
    Write-Host "⚠️  Prisma generate error: $_" -ForegroundColor Yellow
}
Write-Host ""

# Step 3: Apply Migration using Prisma Migrate
Write-Host "Step 2: Apply database migration..." -ForegroundColor Yellow
Write-Host "   Menggunakan: npx prisma migrate deploy" -ForegroundColor Gray
try {
    npx prisma migrate deploy 2>&1 | Out-String | Write-Host
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Migration applied successfully" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Migration deploy gagal. Coba manual:" -ForegroundColor Yellow
        Write-Host "   psql -U postgres -d tokotanionline -f $migrationFile" -ForegroundColor Cyan
    }
} catch {
    Write-Host "⚠️  Migration error: $_" -ForegroundColor Yellow
    Write-Host "   Coba manual: psql -U postgres -d tokotanionline -f $migrationFile" -ForegroundColor Cyan
}
Write-Host ""

# Step 4: Run Tests
Write-Host "Step 3: Run E2E tests..." -ForegroundColor Yellow
try {
    npx tsx scripts/test-engine-control-e2e.ts
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ All tests passed" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Some tests failed" -ForegroundColor Yellow
    }
} catch {
    Write-Host "⚠️  Test error: $_" -ForegroundColor Yellow
    Write-Host "   Pastikan migration sudah di-apply sebelum run tests" -ForegroundColor Yellow
}
Write-Host ""

Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  SETUP COMPLETE" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. Jika Prisma generate gagal: Stop server, lalu npx prisma generate" -ForegroundColor Gray
Write-Host "  2. Start server: npm run dev" -ForegroundColor Gray
Write-Host "  3. Buka: http://localhost:3000/admin/system/engine-control" -ForegroundColor Gray
Write-Host "  4. Test semua flow sesuai checklist" -ForegroundColor Gray
Write-Host ""
