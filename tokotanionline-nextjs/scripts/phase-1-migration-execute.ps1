# PHASE 1: Universal Category Core - Migration Execution Script
# 
# This script:
# 1. Stops all running processes (Next.js, Go engine)
# 2. Runs Prisma migration
# 3. Generates Prisma client
# 4. Runs data migration
# 5. Provides restart instructions

Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  PHASE 1: UNIVERSAL CATEGORY CORE - MIGRATION" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Step 1: Stop Node.js processes
Write-Host "Step 1: Stopping Node.js processes..." -ForegroundColor Yellow
$nodeProcesses = Get-Process node -ErrorAction SilentlyContinue
if ($nodeProcesses) {
    Write-Host "  Found $($nodeProcesses.Count) Node.js process(es)" -ForegroundColor Gray
    $nodeProcesses | ForEach-Object {
        Write-Host "  Stopping PID $($_.Id)..." -ForegroundColor Gray
        Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
    }
    Start-Sleep -Seconds 2
    Write-Host "  ✅ Node.js processes stopped" -ForegroundColor Green
} else {
    Write-Host "  ℹ️  No Node.js processes running" -ForegroundColor Gray
}
Write-Host ""

# Step 2: Check for Go engine (port 8090/8080)
Write-Host "Step 2: Checking for Go engine..." -ForegroundColor Yellow
$goEnginePorts = netstat -ano | findstr ":8090 :8080" | findstr "LISTENING"
if ($goEnginePorts) {
    Write-Host "  ⚠️  Go engine detected on port 8090/8080" -ForegroundColor Yellow
    Write-Host "  Please stop Go engine manually if running:" -ForegroundColor Yellow
    Write-Host "    - Press Ctrl+C in Go engine terminal" -ForegroundColor Yellow
    Write-Host "    - Or kill the process manually" -ForegroundColor Yellow
    Write-Host ""
    $continue = Read-Host "  Continue anyway? (y/n)"
    if ($continue -ne "y" -and $continue -ne "Y") {
        Write-Host "  ❌ Migration cancelled" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "  ✅ No Go engine detected" -ForegroundColor Green
}
Write-Host ""

# Step 3: Verify ports are free
Write-Host "Step 3: Verifying ports are free..." -ForegroundColor Yellow
$port3000 = netstat -ano | findstr ":3000" | findstr "LISTENING"
if ($port3000) {
    Write-Host "  ⚠️  Port 3000 still in use" -ForegroundColor Yellow
    Write-Host "  Waiting 3 seconds and checking again..." -ForegroundColor Gray
    Start-Sleep -Seconds 3
    $port3000 = netstat -ano | findstr ":3000" | findstr "LISTENING"
    if ($port3000) {
        Write-Host "  ❌ Port 3000 still in use. Please stop manually." -ForegroundColor Red
        exit 1
    }
}
Write-Host "  ✅ Ports are free" -ForegroundColor Green
Write-Host ""

# Step 4: Run Prisma migration
Write-Host "Step 4: Running Prisma migration..." -ForegroundColor Yellow
Write-Host "  Command: npx prisma migrate dev --name unified-category-core" -ForegroundColor Gray
Write-Host ""

$migrationResult = & npx prisma migrate dev --name unified-category-core 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "  ❌ Prisma migration failed" -ForegroundColor Red
    Write-Host $migrationResult -ForegroundColor Red
    Write-Host ""
    Write-Host "  Trying alternative: npx prisma db push --accept-data-loss" -ForegroundColor Yellow
    & npx prisma db push --accept-data-loss --skip-generate
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  ❌ Prisma db push also failed" -ForegroundColor Red
        exit 1
    }
}
Write-Host "  ✅ Prisma migration complete" -ForegroundColor Green
Write-Host ""

# Step 5: Generate Prisma client
Write-Host "Step 5: Generating Prisma client..." -ForegroundColor Yellow
$env:PRISMA_CLIENT_ENGINE_TYPE = "binary"
$generateResult = & npx prisma generate 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "  ❌ Prisma generate failed" -ForegroundColor Red
    Write-Host $generateResult -ForegroundColor Red
    Write-Host ""
    Write-Host "  Please:" -ForegroundColor Yellow
    Write-Host "    1. Close all VS Code windows" -ForegroundColor Yellow
    Write-Host "    2. Stop all Node processes" -ForegroundColor Yellow
    Write-Host "    3. Run: npx prisma generate" -ForegroundColor Yellow
    exit 1
}
Write-Host "  ✅ Prisma client generated" -ForegroundColor Green
Write-Host ""

# Step 6: Run data migration
Write-Host "Step 6: Running data migration..." -ForegroundColor Yellow
Write-Host "  Command: npx tsx scripts/migrate-to-unified-categories.ts" -ForegroundColor Gray
Write-Host "  ⚠️  This will migrate existing ProductCategory/BlogCategory/ContentCategory data" -ForegroundColor Yellow
Write-Host ""

$dataMigrationResult = & npx tsx scripts/migrate-to-unified-categories.ts 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "  ❌ Data migration failed" -ForegroundColor Red
    Write-Host $dataMigrationResult -ForegroundColor Red
    exit 1
}
Write-Host "  ✅ Data migration complete" -ForegroundColor Green
Write-Host ""

# Summary
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  MIGRATION COMPLETE" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. Verify categories in admin UI: /admin/categories" -ForegroundColor White
Write-Host "  2. Test product filtering: /produk" -ForegroundColor White
Write-Host "  3. Test blog filtering: /blog" -ForegroundColor White
Write-Host "  4. Test AI generator with category_id" -ForegroundColor White
Write-Host ""
Write-Host "To restart services:" -ForegroundColor Yellow
Write-Host "  - Next.js: npm run dev" -ForegroundColor White
Write-Host "  - Go Engine: (if needed) cd engine-hub then run: go run cmd/server/main.go" -ForegroundColor White
Write-Host ""
