# FASE 7.4 — LOG ROTATION SCRIPT (Windows/PowerShell)
#
# Rotates log files daily or by size
# Run via Task Scheduler: Daily at 00:00
#
# Configuration:
#   - Keep last 30 days of logs
#   - Rotate if file > 100MB
#   - Compress old logs (if 7-Zip available)

param(
    [string]$LogDir = "$PSScriptRoot\..\logs",
    [string]$EngineLogDir = "$PSScriptRoot\..\engine-hub\logs",
    [int]$MaxSizeMB = 100,
    [int]$KeepDays = 30
)

Write-Host "🔄 FASE 7.4 — Rotating logs..." -ForegroundColor Cyan

function Rotate-Log {
    param([string]$LogFile, [int]$MaxSizeBytes)
    
    if (-not (Test-Path $LogFile)) {
        return
    }
    
    $file = Get-Item $LogFile
    $size = $file.Length
    
    # Rotate if file is too large
    if ($size -gt $MaxSizeBytes) {
        $timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
        $rotatedFile = "${LogFile}.${timestamp}"
        Move-Item $LogFile $rotatedFile
        New-Item -ItemType File -Path $LogFile | Out-Null
        Write-Host "✅ Rotated (size): $LogFile -> $rotatedFile" -ForegroundColor Green
    }
}

function Clean-OldLogs {
    param([string]$Dir)
    
    if (-not (Test-Path $Dir)) {
        return
    }
    
    $maxSizeBytes = $MaxSizeMB * 1024 * 1024
    
    # Compress logs older than 1 day (if 7-Zip available)
    $oldLogs = Get-ChildItem -Path $Dir -Filter "*.log.*" -File | 
        Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-1) -and $_.Extension -ne ".gz" }
    
    if ($oldLogs) {
        $7zip = Get-Command 7z -ErrorAction SilentlyContinue
        if ($7zip) {
            foreach ($log in $oldLogs) {
                & 7z a -tgzip "${log.FullName}.gz" $log.FullName | Out-Null
                Remove-Item $log.FullName
                Write-Host "✅ Compressed: $($log.Name)" -ForegroundColor Green
            }
        }
    }
    
    # Delete compressed logs older than KEEP_DAYS
    $oldCompressed = Get-ChildItem -Path $Dir -Filter "*.log.*.gz" -File | 
        Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-$KeepDays) }
    
    if ($oldCompressed) {
        $oldCompressed | Remove-Item
        Write-Host "✅ Deleted old compressed logs: $($oldCompressed.Count) files" -ForegroundColor Green
    }
}

# Create log directories if they don't exist
New-Item -ItemType Directory -Force -Path $LogDir | Out-Null
New-Item -ItemType Directory -Force -Path $EngineLogDir | Out-Null

# Rotate application logs
Write-Host "📋 Rotating application logs..." -ForegroundColor Yellow
$maxSizeBytes = $MaxSizeMB * 1024 * 1024
Rotate-Log "$LogDir\engine.log" $maxSizeBytes
Rotate-Log "$LogDir\scheduler.log" $maxSizeBytes
Rotate-Log "$LogDir\error.log" $maxSizeBytes
Rotate-Log "$LogDir\nextjs.log" $maxSizeBytes

# Rotate engine hub logs
Write-Host "📋 Rotating engine hub logs..." -ForegroundColor Yellow
Rotate-Log "$EngineLogDir\engine.log" $maxSizeBytes
Rotate-Log "$EngineLogDir\scheduler.log" $maxSizeBytes
Rotate-Log "$EngineLogDir\error.log" $maxSizeBytes
Rotate-Log "$EngineLogDir\server.log" $maxSizeBytes

# Clean old logs
Write-Host "🧹 Cleaning old logs..." -ForegroundColor Yellow
Clean-OldLogs $LogDir
Clean-OldLogs $EngineLogDir

Write-Host "✅ Log rotation complete!" -ForegroundColor Green
