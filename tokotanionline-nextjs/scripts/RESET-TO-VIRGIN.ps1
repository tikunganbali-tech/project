# ============================================
# RESET TO VIRGIN SOURCE - COMPREHENSIVE SCRIPT
# ============================================
# Tujuan: Menghapus SEMUA DATA UJI/SIMULASI/TEST
# Tanpa merusak: schema, migration, engine, kontrak PHASE A
# ============================================

param(
    [switch]$SkipConfirmation,
    [switch]$SkipServices
)

$ErrorActionPreference = "Stop"
$script:RootPath = $PSScriptRoot | Split-Path -Parent

Write-Host "`n============================================" -ForegroundColor Cyan
Write-Host "  RESET TO VIRGIN SOURCE" -ForegroundColor Yellow
Write-Host "============================================`n" -ForegroundColor Cyan

# ============================================
# STEP 1: CONFIRMATION
# ============================================
if (-not $SkipConfirmation) {
    Write-Host "[!] PERINGATAN: Script ini akan:" -ForegroundColor Red
    Write-Host "   - Menghapus SEMUA data dari database" -ForegroundColor Yellow
    Write-Host "   - Menghapus build artifacts (.next, cache)" -ForegroundColor Yellow
    Write-Host "   - Menghapus test reports & documentation" -ForegroundColor Yellow
    Write-Host "   - Menghapus engine storage files" -ForegroundColor Yellow
    Write-Host "`n[OK] AMAN: Schema, migration, engine logic tetap utuh`n" -ForegroundColor Green
    
    $confirm = Read-Host "Lanjutkan? (ketik 'YES' untuk konfirmasi)"
    if ($confirm -ne "YES") {
        Write-Host "`n[X] Dibatalkan oleh user`n" -ForegroundColor Red
        exit 0
    }
}

# ============================================
# STEP 2: STOP ALL SERVICES
# ============================================
Write-Host "`n[STEP 1] STOP SEMUA SERVICE`n" -ForegroundColor Cyan

if (-not $SkipServices) {
    # Stop Next.js (port 3000)
    Write-Host "Menghentikan Next.js (port 3000)..." -ForegroundColor Yellow
    $nextjs = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue
    if ($nextjs) {
        $processId = ($nextjs | Select-Object -First 1).OwningProcess
        if ($processId) {
            Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
            Write-Host "   [OK] Next.js dihentikan (PID: $processId)" -ForegroundColor Green
        }
    } else {
        Write-Host "   [OK] Port 3000 tidak aktif" -ForegroundColor Green
    }
    
    # Stop Go Engine (port 8090, 8080)
    Write-Host "Menghentikan Go Engine (port 8090/8080)..." -ForegroundColor Yellow
    $engine8090 = Get-NetTCPConnection -LocalPort 8090 -ErrorAction SilentlyContinue
    $engine8080 = Get-NetTCPConnection -LocalPort 8080 -ErrorAction SilentlyContinue
    
    if ($engine8090) {
        $processId = ($engine8090 | Select-Object -First 1).OwningProcess
        if ($processId) {
            Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
            Write-Host "   [OK] Go Engine (8090) dihentikan (PID: $processId)" -ForegroundColor Green
        }
    }
    if ($engine8080) {
        $processId = ($engine8080 | Select-Object -First 1).OwningProcess
        if ($processId) {
            Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
            Write-Host "   [OK] Go Engine (8080) dihentikan (PID: $processId)" -ForegroundColor Green
        }
    }
    if (-not $engine8090 -and -not $engine8080) {
        Write-Host "   [OK] Port engine tidak aktif" -ForegroundColor Green
    }
    
    Start-Sleep -Seconds 2
} else {
    Write-Host "   [SKIP] Melewati stop services (--SkipServices)" -ForegroundColor Yellow
}

# ============================================
# STEP 3: RESET DATABASE
# ============================================
Write-Host "`n[STEP 2] RESET DATABASE (POSTGRES)`n" -ForegroundColor Cyan

$dbUrl = $env:DATABASE_URL
if (-not $dbUrl) {
    Write-Host "[!] DATABASE_URL tidak ditemukan di environment" -ForegroundColor Yellow
    Write-Host "   Mencoba membaca dari .env.local..." -ForegroundColor Yellow
    
    $envFiles = @(".env.local", ".env")
    foreach ($envFileName in $envFiles) {
        $envFile = Join-Path $script:RootPath $envFileName
        if (Test-Path $envFile) {
            $envContent = Get-Content $envFile -Raw
            # Try with quotes
            if ($envContent -match 'DATABASE_URL\s*=\s*"([^"]+)"') {
                $dbUrl = $matches[1]
                Write-Host "   [OK] DATABASE_URL ditemukan di $envFileName" -ForegroundColor Green
                break
            }
            # Try without quotes
            if (-not $dbUrl -and $envContent -match 'DATABASE_URL\s*=\s*([^\s\r\n]+)') {
                $dbUrl = $matches[1].Trim()
                Write-Host "   [OK] DATABASE_URL ditemukan di $envFileName" -ForegroundColor Green
                break
            }
        }
    }
}

if (-not $dbUrl) {
    Write-Host "[X] DATABASE_URL tidak ditemukan." -ForegroundColor Red
    Write-Host "   Set DATABASE_URL sebagai environment variable atau tambahkan ke .env.local" -ForegroundColor Yellow
    Write-Host "   Format: DATABASE_URL=postgresql://user:pass@host:port/dbname" -ForegroundColor Gray
    exit 1
}

# Extract connection details
if ($dbUrl -match 'postgresql://([^:]+):([^@]+)@([^:]+):(\d+)/(.+)') {
    $dbUser = $matches[1]
    $dbPass = $matches[2]
    $dbHost = $matches[3]
    $dbPort = $matches[4]
    $dbName = $matches[5]
    
    Write-Host "   Database: ${dbName}@${dbHost}:${dbPort}" -ForegroundColor Gray
    
    # Set PGPASSWORD for psql
    $env:PGPASSWORD = $dbPass
    
    # Execute SQL reset script
    $sqlScript = Join-Path $PSScriptRoot "reset-to-virgin.sql"
    
    if (Test-Path $sqlScript) {
        Write-Host "   Menjalankan SQL reset script..." -ForegroundColor Yellow
        
        $psqlPath = "psql"
        # Try to find psql in common locations
        $psqlPaths = @(
            "C:\Program Files\PostgreSQL\15\bin\psql.exe",
            "C:\Program Files\PostgreSQL\14\bin\psql.exe",
            "C:\Program Files\PostgreSQL\13\bin\psql.exe",
            "psql"
        )
        
        $psqlFound = $false
        foreach ($path in $psqlPaths) {
            if (Get-Command $path -ErrorAction SilentlyContinue) {
                $psqlPath = $path
                $psqlFound = $true
                break
            }
        }
        
        if (-not $psqlFound) {
            Write-Host "   [!] psql tidak ditemukan. Mencoba menggunakan Prisma..." -ForegroundColor Yellow
            
            # Try using TypeScript script via Prisma
            $prismaScript = Join-Path $PSScriptRoot "reset-database-via-prisma.ts"
            if (Test-Path $prismaScript) {
                Write-Host "   Menjalankan reset via Prisma..." -ForegroundColor Yellow
                Push-Location $script:RootPath
                try {
                    $result = npx tsx $prismaScript 2>&1
                    if ($LASTEXITCODE -eq 0) {
                        Write-Host "   [OK] Database berhasil di-reset via Prisma" -ForegroundColor Green
                    } else {
                        Write-Host "   [X] Error saat reset database via Prisma" -ForegroundColor Red
                        Write-Host $result -ForegroundColor Red
                        Write-Host "`n   Alternatif: Jalankan manual:" -ForegroundColor Yellow
                        Write-Host "   psql -U $dbUser -h $dbHost -p $dbPort -d $dbName -f `"$sqlScript`"" -ForegroundColor Gray
                    }
                } catch {
                    Write-Host "   [X] Error: $_" -ForegroundColor Red
                    Write-Host "`n   Alternatif: Jalankan manual:" -ForegroundColor Yellow
                    Write-Host "   psql -U $dbUser -h $dbHost -p $dbPort -d $dbName -f `"$sqlScript`"" -ForegroundColor Gray
                } finally {
                    Pop-Location
                }
            } else {
                Write-Host "   [!] Script Prisma tidak ditemukan. Jalankan manual:" -ForegroundColor Yellow
                Write-Host "   psql -U $dbUser -h $dbHost -p $dbPort -d $dbName -f `"$sqlScript`"" -ForegroundColor Gray
                Write-Host "`n   Atau copy-paste isi $sqlScript ke psql" -ForegroundColor Gray
            }
        } else {
            $sqlContent = Get-Content $sqlScript -Raw
            $sqlContent | & $psqlPath -U $dbUser -h $dbHost -p $dbPort -d $dbName
            
            if ($LASTEXITCODE -eq 0) {
                Write-Host "   [OK] Database berhasil di-reset" -ForegroundColor Green
            } else {
                Write-Host "   [X] Error saat reset database. Cek output di atas." -ForegroundColor Red
            }
        }
    } else {
        Write-Host "   [X] SQL script tidak ditemukan: $sqlScript" -ForegroundColor Red
    }
    
    # Clear password from environment
    Remove-Item Env:\PGPASSWORD -ErrorAction SilentlyContinue
} else {
    Write-Host "   [X] Format DATABASE_URL tidak valid" -ForegroundColor Red
    Write-Host "   Format: postgresql://user:pass@host:port/dbname" -ForegroundColor Gray
}

# ============================================
# STEP 4: HAPUS BUILD ARTIFACTS & CACHE
# ============================================
Write-Host "`n[STEP 3] HAPUS BUILD ARTIFACTS & CACHE`n" -ForegroundColor Cyan

$pathsToClean = @(
    ".next",
    "node_modules\.cache",
    "engine\tmp",
    "engine\logs",
    "engine\storage\*.json",
    "engine-hub\storage\*.json"
)

foreach ($path in $pathsToClean) {
    $fullPath = Join-Path $script:RootPath $path
    
    if ($path -like "*\*.json") {
        # Handle wildcard patterns
        $dir = Split-Path $fullPath
        $pattern = Split-Path $fullPath -Leaf
        if (Test-Path $dir) {
            Get-ChildItem -Path $dir -Filter $pattern -ErrorAction SilentlyContinue | Remove-Item -Force -ErrorAction SilentlyContinue
            Write-Host "   [OK] Dihapus: $path" -ForegroundColor Green
        }
    } elseif (Test-Path $fullPath) {
        Remove-Item -Path $fullPath -Recurse -Force -ErrorAction SilentlyContinue
        Write-Host "   [OK] Dihapus: $path" -ForegroundColor Green
    } else {
        Write-Host "   [-] Tidak ada: $path" -ForegroundColor Gray
    }
}

# ============================================
# STEP 5: HAPUS TEST REPORTS & DOCUMENTATION
# ============================================
Write-Host "`n[STEP 4] HAPUS TEST REPORTS & DOKUMENTASI`n" -ForegroundColor Cyan

# Files to preserve
$preserveFiles = @(
    "README.md",
    "docs\COMPREHENSIVE-FEATURES-DOCUMENTATION.md",
    "docs\PHASE-H-PRE-LAUNCH-CHECKLIST.md",
    "engine\README.md",
    "engine-hub\README.md",
    "deploy\README.md",
    "package.json",
    "package-lock.json",
    "tsconfig.json"
)

# Patterns to delete
$deletePatterns = @(
    "*-REPORT*.md",
    "*-TEST*.md",
    "*-AUDIT*.md",
    "*-FIX*.md",
    "*-EXECUTION*.md",
    "*-IMPLEMENTATION*.md",
    "*-SUMMARY*.md",
    "*-VERIFICATION*.md",
    "*-CHECK*.md",
    "*-GUIDE*.md",
    "FASE-*.md",
    "PHASE-*.md",
    "EXECUTION-*.md",
    "LIVE-*.md",
    "MEDIA-*.md",
    "METHOD-*.md",
    "API-*.md",
    "AI-*.md",
    "PORT-*.md",
    "MIME-*.md",
    "DEBUG-*.md",
    "BUILD-*.md",
    "LAUNCH-*.md",
    "SESSION-*.md",
    "SIDEBAR-*.md",
    "SOP-*.md",
    "STEP-*.md",
    "VALIDATION-*.md",
    "NOTIFICATION-*.md",
    "NEXT-STEPS-*.md",
    "PROSEDUR-*.md",
    "PROMPT-*.md",
    "R5B-*.md",
    "E3.2-*.md",
    "ADMIN-*.md",
    "COMPLETE-*.md",
    "ROOT-*.md",
    "CSP-*.md",
    "AUDIT-*.md",
    "FRONTEND-*.md",
    "m-*.json", # Test result JSON files (m- prefix)
    "*-results.json", # Test result JSON files
    "*-verification*.json" # Test verification JSON files
)

$deletedCount = 0
$preservedCount = 0

# Delete files matching patterns in root
foreach ($pattern in $deletePatterns) {
    $files = Get-ChildItem -Path $script:RootPath -Filter $pattern -File -ErrorAction SilentlyContinue
    foreach ($file in $files) {
        $relativePath = $file.FullName.Replace($script:RootPath + "\", "")
        $shouldPreserve = $false
        
        foreach ($preserve in $preserveFiles) {
            if ($relativePath -eq $preserve -or $relativePath -like "*\$preserve") {
                $shouldPreserve = $true
                break
            }
        }
        
        if (-not $shouldPreserve) {
            Remove-Item -Path $file.FullName -Force -ErrorAction SilentlyContinue
            Write-Host "   [OK] Dihapus: $relativePath" -ForegroundColor Green
            $deletedCount++
        } else {
            Write-Host "   [-] Dipertahankan: $relativePath" -ForegroundColor Gray
            $preservedCount++
        }
    }
}

# Clean engine-hub test files
$engineHubPath = Join-Path $script:RootPath "engine-hub"
if (Test-Path $engineHubPath) {
    $engineHubTestFiles = @(
        "article-*.md",
        "batch-*.md",
        "batch-*.json",
        "controlled-production-*.json",
        "test-*.json",
        "*-REPORT*.md",
        "*-TEST*.md"
    )
    
    foreach ($pattern in $engineHubTestFiles) {
        $files = Get-ChildItem -Path $engineHubPath -Filter $pattern -File -ErrorAction SilentlyContinue
        foreach ($file in $files) {
            Remove-Item -Path $file.FullName -Force -ErrorAction SilentlyContinue
            Write-Host "   [OK] Dihapus: engine-hub\$($file.Name)" -ForegroundColor Green
            $deletedCount++
        }
    }
}

Write-Host "`n   Total dihapus: $deletedCount file(s)" -ForegroundColor Cyan
Write-Host "   Total dipertahankan: $preservedCount file(s)" -ForegroundColor Cyan

# ============================================
# STEP 6: VERIFICATION
# ============================================
Write-Host "`n[OK] RESET SELESAI`n" -ForegroundColor Green

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  VERIFIKASI MANUAL DIPERLUKAN" -ForegroundColor Yellow
Write-Host "============================================`n" -ForegroundColor Cyan

Write-Host "1. Database:" -ForegroundColor Yellow
Write-Host "   - Jalankan: SELECT COUNT(*) FROM `"Blog`";" -ForegroundColor Gray
Write-Host "   - Harus return: 0`n" -ForegroundColor Gray

Write-Host "2. Build artifacts:" -ForegroundColor Yellow
Write-Host "   - Folder .next tidak ada" -ForegroundColor Gray
Write-Host "   - Cache bersih`n" -ForegroundColor Gray

Write-Host "3. Test files:" -ForegroundColor Yellow
Write-Host "   - Tidak ada *-REPORT*.md di root" -ForegroundColor Gray
Write-Host "   - README.md masih ada`n" -ForegroundColor Gray

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  NEXT STEPS" -ForegroundColor Yellow
Write-Host "============================================`n" -ForegroundColor Cyan

Write-Host "1. Start Go Engine:" -ForegroundColor Yellow
Write-Host "   cd engine-hub" -ForegroundColor Gray
Write-Host "   go run cmd/server/main.go`n" -ForegroundColor Gray

Write-Host "2. Start Next.js:" -ForegroundColor Yellow
Write-Host "   npm run dev`n" -ForegroundColor Gray

Write-Host "3. Test PHASE B (BLOG):" -ForegroundColor Yellow
Write-Host "   - Login admin" -ForegroundColor Gray
Write-Host "   - Blog → New Post" -ForegroundColor Gray
Write-Host "   - Klik Generate Artikel (AI)" -ForegroundColor Gray
Write-Host "   - Verifikasi hasil`n" -ForegroundColor Gray

Write-Host "`n[OK] Sistem siap untuk testing murni!`n" -ForegroundColor Green
