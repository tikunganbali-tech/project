# PHASE 7A + 7B Quick Start Script (PowerShell)
# Run this script to execute all migration steps

Write-Host "🚀 PHASE 7A + 7B Quick Start" -ForegroundColor Cyan
Write-Host ""

# Step 1: Stop Node processes
Write-Host "Step 1: Stopping Node processes..." -ForegroundColor Yellow
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 2
Write-Host "✅ Node processes stopped" -ForegroundColor Green
Write-Host ""

# Step 2: Create migration
Write-Host "Step 2: Creating Prisma migration..." -ForegroundColor Yellow
Write-Host "Running: npx prisma migrate dev --name phase-7-multi-brand-language" -ForegroundColor Gray
npx prisma migrate dev --name phase-7-multi-brand-language
if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️  Migration failed. Trying db push..." -ForegroundColor Yellow
    npx prisma db push --accept-data-loss --skip-generate
}
Write-Host "✅ Migration complete" -ForegroundColor Green
Write-Host ""

# Step 3: Generate Prisma client
Write-Host "Step 3: Generating Prisma client..." -ForegroundColor Yellow
$env:PRISMA_CLIENT_ENGINE_TYPE = "binary"
npx prisma generate
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Prisma generate failed. Please:" -ForegroundColor Red
    Write-Host "   1. Close all VS Code windows" -ForegroundColor Red
    Write-Host "   2. Stop all Node processes" -ForegroundColor Red
    Write-Host "   3. Run: npx prisma generate" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Prisma client generated" -ForegroundColor Green
Write-Host ""

# Step 4: Run migration script
Write-Host "Step 4: Running migration script..." -ForegroundColor Yellow
Write-Host "Running: npx tsx scripts/phase-7-migration.ts" -ForegroundColor Gray
npx tsx scripts/phase-7-migration.ts
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Migration script failed" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Migration script complete" -ForegroundColor Green
Write-Host ""

# Step 5: Verify
Write-Host "Step 5: Verifying implementation..." -ForegroundColor Yellow
Write-Host "Running: npx tsx scripts/verify-phase-7.ts" -ForegroundColor Gray
npx tsx scripts/verify-phase-7.ts
if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️  Verification found issues. Please check output above." -ForegroundColor Yellow
} else {
    Write-Host "✅ Verification passed" -ForegroundColor Green
}
Write-Host ""

Write-Host "🎉 PHASE 7A + 7B Setup Complete!" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. Start dev server: npm run dev" -ForegroundColor White
Write-Host "  2. Test Brand Selector in admin UI" -ForegroundColor White
Write-Host "  3. Test Language Selector in admin UI" -ForegroundColor White
Write-Host "  4. Test AI Generator with brand + locale context" -ForegroundColor White
Write-Host ""
