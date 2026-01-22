# Script untuk generate Prisma client dengan retry mechanism
# Menangani masalah EPERM pada Windows

Write-Host "Generating Prisma Client..." -ForegroundColor Cyan

$maxRetries = 3
$retryCount = 0
$success = $false

while ($retryCount -lt $maxRetries -and -not $success) {
    try {
        Write-Host "Attempt $($retryCount + 1) of $maxRetries..." -ForegroundColor Yellow
        
        # Kill any processes that might be using Prisma files
        $prismaProcesses = Get-Process | Where-Object { 
            $_.Path -like "*node_modules\.prisma*" -or 
            $_.ProcessName -eq "node" 
        }
        
        if ($prismaProcesses) {
            Write-Host "Found processes that might be using Prisma files. Please stop your dev server first." -ForegroundColor Yellow
        }
        
        # Run prisma generate
        npx prisma generate
        
        if ($LASTEXITCODE -eq 0) {
            $success = $true
            Write-Host "✓ Prisma Client generated successfully!" -ForegroundColor Green
        } else {
            throw "Prisma generate failed with exit code $LASTEXITCODE"
        }
    } catch {
        $retryCount++
        if ($retryCount -lt $maxRetries) {
            Write-Host "Retrying in 2 seconds..." -ForegroundColor Yellow
            Start-Sleep -Seconds 2
        } else {
            Write-Host "✗ Failed to generate Prisma Client after $maxRetries attempts" -ForegroundColor Red
            Write-Host "Please ensure:" -ForegroundColor Yellow
            Write-Host "  1. Dev server is stopped" -ForegroundColor Yellow
            Write-Host "  2. No other processes are using Prisma files" -ForegroundColor Yellow
            Write-Host "  3. Try running: npx prisma generate manually" -ForegroundColor Yellow
            exit 1
        }
    }
}

if ($success) {
    Write-Host "`n✓ All done! You can now start your dev server." -ForegroundColor Green
}
