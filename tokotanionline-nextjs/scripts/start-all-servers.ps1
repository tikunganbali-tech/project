# START ALL SERVERS SCRIPT
# Menjalankan Next.js dev server, Go engine, dan verifikasi koneksi

Write-Host "🚀 Starting All Servers..." -ForegroundColor Cyan
Write-Host ""

# Check if .env.local exists
$envFile = ".env.local"
if (-not (Test-Path $envFile)) {
    Write-Host "⚠️  .env.local not found. Creating from .env.example..." -ForegroundColor Yellow
    if (Test-Path ".env.example") {
        Copy-Item ".env.example" $envFile
        Write-Host "✅ Created .env.local" -ForegroundColor Green
    } else {
        Write-Host "❌ .env.example not found. Please create .env.local manually." -ForegroundColor Red
        exit 1
    }
}

# Check DATABASE_URL
$envContent = Get-Content $envFile -Raw
if ($envContent -notmatch "DATABASE_URL") {
    Write-Host "⚠️  DATABASE_URL not found in .env.local" -ForegroundColor Yellow
    Write-Host "   Please add: DATABASE_URL=postgresql://user:password@localhost:5432/tokotanionline" -ForegroundColor Gray
}

# Check ENGINE_HUB_URL
if ($envContent -notmatch "ENGINE_HUB_URL") {
    Write-Host "⚠️  ENGINE_HUB_URL not found in .env.local. Adding default..." -ForegroundColor Yellow
    Add-Content $envFile "`nENGINE_HUB_URL=http://localhost:8090"
    Write-Host "✅ Added ENGINE_HUB_URL=http://localhost:8090" -ForegroundColor Green
}

# Check OPENAI_API_KEY for Go engine
if (-not $env:OPENAI_API_KEY) {
    Write-Host "⚠️  OPENAI_API_KEY not set in environment" -ForegroundColor Yellow
    Write-Host "   Go engine requires OPENAI_API_KEY to be set" -ForegroundColor Gray
    Write-Host "   Set it with: `$env:OPENAI_API_KEY='sk-...'" -ForegroundColor Gray
}

Write-Host ""
Write-Host "STEP 1: Checking PostgreSQL..." -ForegroundColor Yellow

# Check PostgreSQL
$pgRunning = $false
try {
    $pgCheck = Get-Service -Name postgresql* -ErrorAction SilentlyContinue
    if ($pgCheck) {
        $running = $pgCheck | Where-Object { $_.Status -eq 'Running' }
        if ($running) {
            Write-Host "✅ PostgreSQL service is running" -ForegroundColor Green
            $pgRunning = $true
        } else {
            Write-Host "⚠️  PostgreSQL service found but not running" -ForegroundColor Yellow
            Write-Host "   Attempting to start..." -ForegroundColor Gray
            try {
                Start-Service -Name $pgCheck[0].Name
                Write-Host "✅ PostgreSQL started" -ForegroundColor Green
                $pgRunning = $true
            } catch {
                Write-Host "❌ Failed to start PostgreSQL: $_" -ForegroundColor Red
            }
        }
    } else {
        Write-Host "⚠️  PostgreSQL service not found via Get-Service" -ForegroundColor Yellow
        Write-Host "   Checking port 5432..." -ForegroundColor Gray
        $portCheck = netstat -ano | findstr :5432
        if ($portCheck) {
            Write-Host "✅ Port 5432 is in use (PostgreSQL likely running)" -ForegroundColor Green
            $pgRunning = $true
        }
    }
} catch {
    Write-Host "⚠️  Could not check PostgreSQL status" -ForegroundColor Yellow
}

if (-not $pgRunning) {
    Write-Host "⚠️  PostgreSQL may not be running. Database operations may fail." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "STEP 2: Starting Go Engine Hub..." -ForegroundColor Yellow

# Check if Go engine is already running
$engineRunning = $false
try {
    $healthCheck = Invoke-WebRequest -Uri "http://localhost:8090/health" -TimeoutSec 2 -ErrorAction Stop
    Write-Host "✅ Go engine is already running on port 8090" -ForegroundColor Green
    $engineRunning = $true
} catch {
    Write-Host "📦 Starting Go engine server..." -ForegroundColor Cyan
    
    $engineHubPath = Join-Path $PSScriptRoot "..\engine-hub"
    if (-not (Test-Path $engineHubPath)) {
        Write-Host "❌ engine-hub directory not found at: $engineHubPath" -ForegroundColor Red
        exit 1
    }
    
    # Start Go engine in background
    $engineJob = Start-Job -ScriptBlock {
        Set-Location $using:engineHubPath
        if ($using:env:OPENAI_API_KEY) {
            $env:OPENAI_API_KEY = $using:env:OPENAI_API_KEY
        }
        $env:DATABASE_URL = $using:env:DATABASE_URL
        go run cmd/server/main.go 2>&1
    }
    
    Write-Host "   Engine job started (Job ID: $($engineJob.Id))" -ForegroundColor Gray
    Write-Host "   Waiting for engine to be ready..." -ForegroundColor Gray
    
    # Wait for engine to start
    $maxWait = 30
    $waited = 0
    while ($waited -lt $maxWait) {
        Start-Sleep -Seconds 2
        $waited += 2
        try {
            $health = Invoke-RestMethod -Uri "http://localhost:8090/health" -TimeoutSec 1 -ErrorAction Stop
            Write-Host "✅ Go engine is ready! (uptime: $($health.uptime)s)" -ForegroundColor Green
            $engineRunning = $true
            break
        } catch {
            Write-Host "   Still waiting... ($waited/$maxWait seconds)" -ForegroundColor Gray
        }
    }
    
    if (-not $engineRunning) {
        Write-Host "❌ Engine failed to start within $maxWait seconds" -ForegroundColor Red
        Write-Host "   Check logs: Receive-Job -Id $($engineJob.Id))" -ForegroundColor Yellow
        Stop-Job -Id $engineJob.Id -ErrorAction SilentlyContinue
        Remove-Job -Id $engineJob.Id -ErrorAction SilentlyContinue
        exit 1
    }
}

Write-Host ""
Write-Host "STEP 3: Starting Next.js Dev Server..." -ForegroundColor Yellow

# Check if Next.js is already running
$nextRunning = $false
try {
    $nextCheck = Invoke-WebRequest -Uri "http://localhost:3000" -TimeoutSec 2 -ErrorAction Stop
    Write-Host "✅ Next.js dev server is already running on port 3000" -ForegroundColor Green
    $nextRunning = $true
} catch {
    Write-Host "📦 Starting Next.js dev server..." -ForegroundColor Cyan
    Write-Host "   This will start in a new window..." -ForegroundColor Gray
    
    # Start Next.js in new window
    $nextPath = Join-Path $PSScriptRoot ".."
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$nextPath'; npm run dev"
    
    Write-Host "   Waiting for Next.js to be ready..." -ForegroundColor Gray
    
    # Wait for Next.js to start
    $maxWait = 60
    $waited = 0
    while ($waited -lt $maxWait) {
        Start-Sleep -Seconds 3
        $waited += 3
        try {
            $nextCheck = Invoke-WebRequest -Uri "http://localhost:3000" -TimeoutSec 2 -ErrorAction Stop
            Write-Host "✅ Next.js dev server is ready!" -ForegroundColor Green
            $nextRunning = $true
            break
        } catch {
            Write-Host "   Still waiting... ($waited/$maxWait seconds)" -ForegroundColor Gray
        }
    }
    
    if (-not $nextRunning) {
        Write-Host "⚠️  Next.js may still be starting. Check the new window." -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "=== ALL SERVERS STATUS ===" -ForegroundColor Green
Write-Host ""
Write-Host "✅ PostgreSQL: $($pgRunning ? 'Running' : 'Unknown')" -ForegroundColor $(if ($pgRunning) { "Green" } else { "Yellow" })
Write-Host "✅ Go Engine: $($engineRunning ? 'Running on :8090' : 'Not Running')" -ForegroundColor $(if ($engineRunning) { "Green" } else { "Red" })
Write-Host "✅ Next.js: $($nextRunning ? 'Running on :3000' : 'Starting...')" -ForegroundColor $(if ($nextRunning) { "Green" } else { "Yellow" })
Write-Host ""
Write-Host "🌐 URLs:" -ForegroundColor Cyan
Write-Host "   Frontend: http://localhost:3000" -ForegroundColor White
Write-Host "   Admin: http://localhost:3000/admin" -ForegroundColor White
Write-Host "   Go Engine: http://localhost:8090" -ForegroundColor White
Write-Host "   Engine Health: http://localhost:8090/health" -ForegroundColor White
Write-Host ""
Write-Host "✅ All servers started! Open http://localhost:3000 in your browser." -ForegroundColor Green
