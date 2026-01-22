# KILL ALL GO PROCESSES
# FASE B - B1: Pastikan tidak ada server lama hidup sebelum start server baru

Write-Host "========================================" -ForegroundColor Yellow
Write-Host "KILLING ALL GO PROCESSES" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Yellow
Write-Host ""

# Find all Go processes
$goProcesses = Get-Process -Name "go" -ErrorAction SilentlyContinue

if ($goProcesses) {
    Write-Host "Found $($goProcesses.Count) Go process(es)" -ForegroundColor Yellow
    
    foreach ($proc in $goProcesses) {
        Write-Host "Killing process: $($proc.ProcessName) (PID: $($proc.Id))" -ForegroundColor Gray
        try {
            Stop-Process -Id $proc.Id -Force -ErrorAction Stop
            Write-Host "  [OK] Process killed" -ForegroundColor Green
        } catch {
            Write-Host "  [WARN] Failed to kill process: $_" -ForegroundColor Yellow
        }
    }
    
    # Wait a bit for processes to fully terminate
    Start-Sleep -Seconds 2
    
    # Verify all are killed
    $remaining = Get-Process -Name "go" -ErrorAction SilentlyContinue
    if ($remaining) {
        Write-Host "[WARN] Some Go processes still running:" -ForegroundColor Yellow
        foreach ($proc in $remaining) {
            Write-Host "  - PID $($proc.Id)" -ForegroundColor Yellow
        }
    } else {
        Write-Host "[OK] All Go processes killed" -ForegroundColor Green
    }
} else {
    Write-Host "[OK] No Go processes found" -ForegroundColor Green
}

Write-Host ""
