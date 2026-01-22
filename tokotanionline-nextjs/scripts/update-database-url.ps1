# Script untuk update DATABASE_URL di .env.local
# Jalankan: .\scripts\update-database-url.ps1

param(
    [Parameter(Mandatory=$true)]
    [string]$Password,
    
    [Parameter(Mandatory=$false)]
    [string]$Port = "5432"
)

Write-Host "`n=== UPDATE DATABASE_URL ===" -ForegroundColor Cyan

$envFile = ".env.local"
$newDbUrl = "postgresql://postgres:$Password@localhost:$Port/tokotanionline"

Write-Host "Updating DATABASE_URL..." -ForegroundColor Yellow
Write-Host "Port: $Port" -ForegroundColor Gray
Write-Host "Password: [HIDDEN]" -ForegroundColor Gray

if (Test-Path $envFile) {
    $content = Get-Content $envFile
    $updated = $false
    $newContent = @()
    
    foreach ($line in $content) {
        if ($line -match "^DATABASE_URL=") {
            $newContent += "DATABASE_URL=$newDbUrl"
            $updated = $true
            Write-Host "✅ DATABASE_URL updated!" -ForegroundColor Green
        } else {
            $newContent += $line
        }
    }
    
    if (-not $updated) {
        $newContent += ""
        $newContent += "# Database"
        $newContent += "DATABASE_URL=$newDbUrl"
        Write-Host "✅ DATABASE_URL added!" -ForegroundColor Green
    }
    
    $newContent | Set-Content $envFile
} else {
    @(
        "# Database",
        "DATABASE_URL=$newDbUrl"
    ) | Set-Content $envFile
    Write-Host "✅ .env.local created with DATABASE_URL!" -ForegroundColor Green
}

Write-Host "`nNew DATABASE_URL:" -ForegroundColor Cyan
Write-Host $newDbUrl.Replace($Password, "****") -ForegroundColor Gray

Write-Host "`n✅ Update selesai!" -ForegroundColor Green
Write-Host "Lanjutkan dengan: npx prisma db push" -ForegroundColor Yellow

