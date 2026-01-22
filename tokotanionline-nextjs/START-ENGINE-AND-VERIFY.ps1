# Script untuk start Go Engine dan verify koneksi
# Sesuai dengan aturan yang sudah dibuat

Write-Host "=== START ENGINE & VERIFY CONNECTION ===" -ForegroundColor Cyan
Write-Host ""

# STEP 1: Cek environment variable
Write-Host "STEP 1: Checking environment variables..." -ForegroundColor Yellow
$envFile = ".env.local"
if (Test-Path $envFile) {
    $envContent = Get-Content $envFile -Raw
    if ($envContent -match "ENGINE_HUB_URL=(.+)") {
        $engineUrl = $matches[1].Trim()
        Write-Host "  Found ENGINE_HUB_URL: $engineUrl" -ForegroundColor Green
        if ($engineUrl -ne "http://localhost:8090") {
            Write-Host "  WARNING: ENGINE_HUB_URL is not http://localhost:8090" -ForegroundColor Yellow
            Write-Host "  Updating to http://localhost:8090..." -ForegroundColor Yellow
            $envContent = $envContent -replace "ENGINE_HUB_URL=.+", "ENGINE_HUB_URL=http://localhost:8090"
            Set-Content -Path $envFile -Value $envContent
            Write-Host "  Updated ENGINE_HUB_URL to http://localhost:8090" -ForegroundColor Green
        }
    } else {
        Write-Host "  ENGINE_HUB_URL not found, adding..." -ForegroundColor Yellow
        Add-Content -Path $envFile -Value "`nENGINE_HUB_URL=http://localhost:8090"
        Write-Host "  Added ENGINE_HUB_URL=http://localhost:8090" -ForegroundColor Green
    }
} else {
    Write-Host "  .env.local not found, creating..." -ForegroundColor Yellow
    "ENGINE_HUB_URL=http://localhost:8090" | Out-File -FilePath $envFile -Encoding utf8
    Write-Host "  Created .env.local with ENGINE_HUB_URL=http://localhost:8090" -ForegroundColor Green
}
Write-Host ""

# STEP 2: Cek apakah port 8090 sudah digunakan
Write-Host "STEP 2: Checking port 8090..." -ForegroundColor Yellow
$portCheck = Get-NetTCPConnection -LocalPort 8090 -ErrorAction SilentlyContinue
if ($portCheck) {
    Write-Host "  Port 8090 is in use (PID: $($portCheck.OwningProcess))" -ForegroundColor Green
    Write-Host "  Testing health endpoint..." -ForegroundColor Yellow
    try {
        $health = Invoke-RestMethod -Uri "http://localhost:8090/health" -TimeoutSec 2 -ErrorAction Stop
        Write-Host "  Engine is running and healthy!" -ForegroundColor Green
        Write-Host "  Uptime: $($health.uptime)s" -ForegroundColor Green
        Write-Host ""
        Write-Host "=== ENGINE IS READY ===" -ForegroundColor Green
        Write-Host "You can now use AI generation features." -ForegroundColor Green
        exit 0
    } catch {
        Write-Host "  Port 8090 is in use but engine is not responding" -ForegroundColor Red
        Write-Host "  Killing process and restarting..." -ForegroundColor Yellow
        Stop-Process -Id $portCheck.OwningProcess -Force -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 2
    }
} else {
    Write-Host "  Port 8090 is free" -ForegroundColor Gray
}
Write-Host ""

# STEP 3: Start Go Engine
Write-Host "STEP 3: Starting Go Engine..." -ForegroundColor Yellow
$engineHubPath = "engine-hub"
if (-not (Test-Path $engineHubPath)) {
    Write-Host "  engine-hub directory not found!" -ForegroundColor Red
    exit 1
}

# Cek apakah ada .env di engine-hub
$engineEnvPath = Join-Path $engineHubPath ".env"
if (Test-Path $engineEnvPath) {
    Write-Host "  Found .env in engine-hub" -ForegroundColor Green
} else {
    Write-Host "  .env not found in engine-hub (will use environment variables)" -ForegroundColor Yellow
}

# Set API key jika belum ada
if (-not $env:OPENAI_API_KEY) {
    Write-Host "  WARNING: OPENAI_API_KEY not set in environment" -ForegroundColor Yellow
    Write-Host "  Please set OPENAI_API_KEY before starting engine" -ForegroundColor Yellow
    Write-Host "  Example: `$env:OPENAI_API_KEY='sk-...'" -ForegroundColor Gray
}

Write-Host ""
Write-Host "Starting engine server in background..." -ForegroundColor Yellow
Write-Host "Watch for: [BOOT] ENGINE HUB RUNNING ON :8090" -ForegroundColor Yellow
Write-Host ""

# Start engine in background job
$engineJob = Start-Job -ScriptBlock {
    Set-Location $using:engineHubPath
    if ($using:env:OPENAI_API_KEY) {
        $env:OPENAI_API_KEY = $using:env:OPENAI_API_KEY
    }
    go run cmd/server/main.go
}

Write-Host "  Engine job started (Job ID: $($engineJob.Id))" -ForegroundColor Green
Write-Host ""

# STEP 4: Wait for engine to be ready
Write-Host "STEP 4: Waiting for engine to be ready..." -ForegroundColor Yellow
$maxWait = 30
$waited = 0
$engineReady = $false

while ($waited -lt $maxWait) {
    Start-Sleep -Seconds 2
    $waited += 2
    try {
        $health = Invoke-RestMethod -Uri "http://localhost:8090/health" -TimeoutSec 1 -ErrorAction Stop
        $engineReady = $true
        Write-Host "  Engine is ready! (uptime: $($health.uptime)s)" -ForegroundColor Green
        break
    } catch {
        Write-Host "  Waiting... ($waited/$maxWait seconds)" -ForegroundColor Gray
    }
}

if (-not $engineReady) {
    Write-Host "  Engine failed to start within $maxWait seconds" -ForegroundColor Red
    Write-Host "  Check engine logs:" -ForegroundColor Yellow
    Write-Host "     Receive-Job -Id $($engineJob.Id)" -ForegroundColor Gray
    Stop-Job -Id $engineJob.Id -ErrorAction SilentlyContinue
    Remove-Job -Id $engineJob.Id -ErrorAction SilentlyContinue
    exit 1
}

Write-Host ""
Write-Host "=== ENGINE STARTED SUCCESSFULLY ===" -ForegroundColor Green
Write-Host ""
Write-Host "Engine Status:" -ForegroundColor Cyan
Write-Host "  - URL: http://localhost:8090" -ForegroundColor White
Write-Host "  - Health: http://localhost:8090/health" -ForegroundColor White
Write-Host "  - Job ID: $($engineJob.Id)" -ForegroundColor White
Write-Host ""
Write-Host "To view engine logs:" -ForegroundColor Yellow
Write-Host "  Receive-Job -Id $($engineJob.Id)" -ForegroundColor Gray
Write-Host ""
Write-Host "To stop engine:" -ForegroundColor Yellow
Write-Host "  Stop-Job -Id $($engineJob.Id)" -ForegroundColor Gray
Write-Host "  Remove-Job -Id $($engineJob.Id)" -ForegroundColor Gray
Write-Host ""
Write-Host "You can now use AI generation features!" -ForegroundColor Green
