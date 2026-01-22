# ============================================
# RESET: HAPUS TEST REPORTS & DOKUMENTASI TEST
# ============================================
# Tujuan: Hapus semua laporan test dan dokumentasi test
# KECUALI: README.md dan dokumentasi arsitektur utama
# ============================================

Write-Host "🧹 STEP 4: Hapus Test Reports & Dokumentasi Test" -ForegroundColor Cyan
Write-Host ""

$projectRoot = $PSScriptRoot + "\.."
Set-Location $projectRoot

# Daftar file yang akan DIHAPUS (test reports)
$filesToDelete = @(
    # Root level test reports
    "EXECUTION-REPORT-BLOG-DISABLE.md",
    "FASE-D-IMPLEMENTATION-REPORT.md",
    "FASE-E1-IMPLEMENTATION-REPORT.md",
    "FASE-E2-FINAL-REPORT.md",
    "FASE-E3-MANUAL-TEST-CHECKLIST.md",
    "FASE-E3-TEST-REPORT.md",
    "FASE-E3.1.1-VALIDATION-REPORT.md",
    "FASE-E3.3-IMPLEMENTATION-REPORT.md",
    "FASE-F-FINAL-REPORT.md",
    "FASE-F-IMPLEMENTATION-REPORT.md",
    "FASE-F-REQUIRED-ACTIONS-COMPLETED.md",
    "FASE-F5-IMPLEMENTATION-REPORT.md",
    "FASE-F6-FINAL-REPORT.md",
    "FASE-F7-IMPLEMENTATION-REPORT.md",
    "FRONTEND-FINAL-VALIDATION-REPORT.md",
    "FRONTEND-SEO-AUDIT-REPORT.md",
    "LIVE-CHECK-ADMIN-BLOG.md",
    "LIVE-CHECK-ADMIN-CATEGORY.md",
    "LIVE-VERIFICATION-REPORT.md",
    "SESSION-PROVIDER-FIX.md",
    "SIDEBAR-MENU-ADDED.md",
    "SOP-EKSEKUSI-FINAL-COMPLETED.md",
    "STEP-16B-VISUAL-SUMMARY.txt",
    "VALIDATION-RESULTS.md",
    "AUDIT-CLEANUP-REPORT.md",
    "CSP-FIX-REPORT.md",
    "PHASE-I-EXECUTION-REPORT.md",
    "PHASE-H-EXECUTION-REPORT.md",
    "PHASE-G-EXECUTION-REPORT.md",
    "PHASE-F-EXECUTION-REPORT.md",
    "PHASE-E-EXECUTION-REPORT.md",
    "COMPLETE-ERROR-FIX-SUMMARY.md",
    "ROOT-500-ERROR-FIX.md",
    "NEXT-STEPS-UI-B-COMPLETED.md",
    "MEDIA-LIBRARY-SYNC-FIX.md",
    "MEDIA-CLEANUP-FINAL-FIX.md",
    "MEDIA-CLEANUP-DEBUGGING.md",
    "MEDIA-CLEANUP-FIX.md",
    "MEDIA-CLEANUP-IMPLEMENTATION.md",
    "NOTIFICATION-SYSTEM-IMPLEMENTATION.md",
    "AI-GENERATOR-V2-TUNING-COMPLETE.md",
    "AI-GENERATOR-V2-IMPLEMENTATION.md",
    "AI-GENERATOR-V2-FINAL-REPORT.md",
    "AI-GENERATOR-V2-COMPLETE.md",
    "METHOD-NOT-ALLOWED-FIX.md",
    "API-KEY-TEST-FIX.md",
    "AI-GENERATION-ERROR-DEBUG.md",
    "AI-GENERATOR-ERROR-FIX.md",
    "PORT-3000-FIX.md",
    "MIME-TYPE-ERROR-FIX.md",
    "LANGKAH-TERAKHIR-GENERATE-PRISMA.md",
    "DEBUG-FORGOT-PASSWORD.md",
    "BUILD-POWERSHELL-FIX-REPORT.md",
    "LAUNCH-MODE-FINAL-REPORT.md",
    "LAUNCH-VERIFICATION-REPORT.md",
    "SOP-EKSEKUSI-FINAL-COMPLETED.md",
    "PROSEDUR-EKSEKUSI-FINAL-REPORT.md",
    "PHASE-FINAL-EXECUTION-REPORT.md",
    "FASE-H-FINAL-ACCEPTANCE-REPORT-ULANG.md",
    "R5B-1-RESULT.md",
    "FASE-R4-FINAL-REPORT.md",
    "FASE-R4-VERIFICATION-COMPLETE.md",
    "FASE-R4-BOOTSTRAP-RECOVERY-REPORT.md",
    "FASE-R3-REPORT.md",
    "FASE-R2-FINAL-REPORT.md",
    "FASE-R2-AUDIT-REPORT.md",
    "FASE-R-FINAL-REPORT.md",
    "FASE-R-EXECUTION-REPORT.md",
    "FASE-R-AUDIT-REPORT.md",
    "FASE-H-RE-TEST-SUMMARY.md",
    "FASE-H-RE-TEST-REPORT.md",
    "FASE-H0-TEST-REPORT.md",
    "FASE-H-SUMMARY.md",
    "FASE-H-MANUAL-TESTING-GUIDE.md",
    "FASE-H-FINAL-ACCEPTANCE-REPORT.md",
    "FASE-G-AUDIT-REPORT.md",
    "E3.2-UX-AUDIT-SUMMARY.md",
    "E3.2-UX-AUDIT-REPORT.md",
    "ADMIN-OPERATION-GUIDE.md",
    "PROMPT-TEMPLATE-FINAL-CTO.md"
)

# Hapus file di root
$deletedCount = 0
foreach ($file in $filesToDelete) {
    $filePath = Join-Path $projectRoot $file
    if (Test-Path $filePath) {
        Remove-Item -Force $filePath
        Write-Host "  ✓ Dihapus: $file" -ForegroundColor Green
        $deletedCount++
    }
}

# Hapus test reports di docs/ (kecuali dokumentasi arsitektur utama)
$docsToDelete = @(
    "docs\LAPORAN-EKSEKUSI-FINAL.md",
    "docs\LAPORAN-EKSEKUSI-OUTLINE-PROMPT-FIX-FINAL.md",
    "docs\LAPORAN-EKSEKUSI-OUTLINE-PROMPT-FIX.md",
    "docs\LAPORAN-FINAL-DERIVATIVE-LONG-OUTLINE-PROMPT-FIX.md",
    "docs\LAPORAN-FINAL-DERIVATIVE-LONG-V3-UPDATE.md",
    "docs\LAPORAN-FINAL-DERIVATIVE-LONG-V3.md",
    "docs\LAPORAN-FINAL-TEST-DERIVATIVE-LONG-V3.md",
    "docs\LAPORAN-TEST-DERIVATIVE-LONG-V3.md",
    "docs\RINGKASAN-TEST-DERIVATIVE-LONG-V3.md",
    "docs\DERIVATIVE-LONG-V3-COMPLETE.md",
    "docs\DERIVATIVE-LONG-V3-FIX.md",
    "docs\DERIVATIVE-LONG-V3-STATUS.md",
    "docs\artikel-sampel.md",
    "docs\PENILAIAN-MANUSIA-ARTIKEL-684-KATA.md"
)

foreach ($file in $docsToDelete) {
    $filePath = Join-Path $projectRoot $file
    if (Test-Path $filePath) {
        Remove-Item -Force $filePath
        Write-Host "  ✓ Dihapus: $file" -ForegroundColor Green
        $deletedCount++
    }
}

# Hapus test reports di engine-hub/
$engineHubReports = @(
    "engine-hub\PHASE-A-EXECUTION-REPORT.md",
    "engine-hub\KONTRAK-IMPLEMENTATION-REPORT.md",
    "engine-hub\KONTRAK-LOGIC-AI-GENERATOR-FINAL.md",
    "engine-hub\FASE-C-IMAGE-SYSTEM-LOCKED.md",
    "engine-hub\FASE-B-IMPLEMENTATION-REPORT.md",
    "engine-hub\FASE-A-IMPLEMENTATION-REPORT.md",
    "engine-hub\INFRA-FINAL-RESULT.md",
    "engine-hub\INFRA-FINAL-CHECK.md",
    "engine-hub\BLACKLIST-ROLLBACK.md",
    "engine-hub\BATCH-PRODUCTION-RETRY-REPORT.md",
    "engine-hub\BATCH-PRODUCTION-REPORT.md",
    "engine-hub\BATCH-GENERATION-REPORT.md",
    "engine-hub\EXECUTE-NOW-STEPS.md",
    "engine-hub\STATUS-SUMMARY.md",
    "engine-hub\PHASE-4-TEST-DRIVE-REPORT.md",
    "engine-hub\TEST-DRIVE-EVALUATION.md",
    "engine-hub\RUN-FINAL-TEST.md",
    "engine-hub\FINAL-TEST-INSTRUCTIONS.md",
    "engine-hub\CRITICAL-INSTRUCTIONS.md",
    "engine-hub\RUN-TEST-WITH-LOGS.md",
    "engine-hub\FIX-COMPLETE-SUMMARY.md",
    "engine-hub\DEBUG-SUMMARY.md",
    "engine-hub\MANUAL-TEST-DRIVE-INSTRUCTIONS.md",
    "engine-hub\TEST-DRIVE-ERROR-REPORT.md",
    "engine-hub\TEST-DRIVE-INSTRUCTIONS.md"
)

foreach ($file in $engineHubReports) {
    $filePath = Join-Path $projectRoot $file
    if (Test-Path $filePath) {
        Remove-Item -Force $filePath
        Write-Host "  ✓ Dihapus: $file" -ForegroundColor Green
        $deletedCount++
    }
}

# Hapus artikel test markdown di engine-hub
Get-ChildItem -Path "engine-hub" -Filter "article-*.md" -ErrorAction SilentlyContinue | ForEach-Object {
    Remove-Item $_.FullName -Force
    Write-Host "  ✓ Dihapus: $($_.Name)" -ForegroundColor Green
    $deletedCount++
}

# Hapus JSON test results di engine-hub
Get-ChildItem -Path "engine-hub" -Filter "*result*.json" -ErrorAction SilentlyContinue | ForEach-Object {
    Remove-Item $_.FullName -Force
    Write-Host "  ✓ Dihapus: $($_.Name)" -ForegroundColor Green
    $deletedCount++
}

Write-Host ""
Write-Host "✓ Total $deletedCount file test reports dihapus!" -ForegroundColor Green
Write-Host ""
Write-Host "⚠️  FILE YANG TIDAK DIHAPUS (dokumentasi arsitektur):" -ForegroundColor Yellow
Write-Host "  - README.md" -ForegroundColor Gray
Write-Host "  - docs\COMPREHENSIVE-FEATURES-DOCUMENTATION.md" -ForegroundColor Gray
Write-Host "  - docs\PHASE-*.md (dokumentasi phase)" -ForegroundColor Gray
Write-Host "  - docs\FASE-*.md (dokumentasi fase)" -ForegroundColor Gray
Write-Host "  - docs\STEP-*.md (dokumentasi step)" -ForegroundColor Gray
Write-Host "  - docs\env-reference.md" -ForegroundColor Gray
Write-Host "  - docs\INSTRUKSI-RESTART-SERVER.md" -ForegroundColor Gray
