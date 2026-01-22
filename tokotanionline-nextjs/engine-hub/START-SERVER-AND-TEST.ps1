# FASE 1 — START SERVER & TEST IMAGE PIPELINE
# Script untuk start Go server dan langsung test image pipeline

Write-Host "🚀 FASE 1 — START SERVER & TEST" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan
Write-Host ""

# Check if we're in the right directory
if (-not (Test-Path "cmd\server\main.go")) {
    Write-Host "❌ ERROR: Please run this script from engine-hub directory" -ForegroundColor Red
    Write-Host "   Current directory: $(Get-Location)" -ForegroundColor Yellow
    exit 1
}

# Check API key
$apiKey = $env:OPENAI_API_KEY
if (-not $apiKey) {
    $apiKey = $env:AI_API_KEY
}

if (-not $apiKey) {
    Write-Host "❌ ERROR: OPENAI_API_KEY or AI_API_KEY must be set" -ForegroundColor Red
    Write-Host "   Set it with: `$env:OPENAI_API_KEY='your_key_here'" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ API Key found" -ForegroundColor Green
Write-Host ""

# Check if server is already running
$serverPort = $env:ENGINE_PORT
if (-not $serverPort) {
    $serverPort = "8090"
}
$serverUrl = "http://localhost:$serverPort"

try {
    $healthCheck = Invoke-WebRequest -Uri "$serverUrl/health" -Method GET -TimeoutSec 2 -ErrorAction Stop
    Write-Host "⚠️  Server is already running on port $serverPort" -ForegroundColor Yellow
    Write-Host "   Skipping server start, proceeding to test..." -ForegroundColor Yellow
    $serverRunning = $true
} catch {
    Write-Host "📦 Starting Go engine server..." -ForegroundColor Cyan
    Write-Host "   Port: $serverPort" -ForegroundColor White
    Write-Host ""
    
    # Start server in background
    $serverProcess = Start-Process -FilePath "go" -ArgumentList "run", "cmd/server/main.go" -NoNewWindow -PassThru
    
    Write-Host "⏳ Waiting for server to start..." -ForegroundColor Yellow
    
    # Wait for server to be ready (max 30 seconds)
    $maxWait = 30
    $waited = 0
    $serverReady = $false
    
    while ($waited -lt $maxWait) {
        Start-Sleep -Seconds 2
        $waited += 2
        
        try {
            $healthCheck = Invoke-WebRequest -Uri "$serverUrl/health" -Method GET -TimeoutSec 1 -ErrorAction Stop
            $serverReady = $true
            break
        } catch {
            Write-Host "   Still waiting... ($waited/$maxWait seconds)" -ForegroundColor Gray
        }
    }
    
    if (-not $serverReady) {
        Write-Host "❌ Server failed to start within $maxWait seconds" -ForegroundColor Red
        if ($serverProcess) {
            Stop-Process -Id $serverProcess.Id -Force -ErrorAction SilentlyContinue
        }
        exit 1
    }
    
    Write-Host "✅ Server started successfully!" -ForegroundColor Green
    Write-Host ""
    $serverRunning = $false
}

# Run the test script
Write-Host "🧪 Running image pipeline test..." -ForegroundColor Cyan
Write-Host ""

& ".\test-image-pipeline.ps1"

# If we started the server, offer to stop it
if (-not $serverRunning) {
    Write-Host ""
    Write-Host "🛑 Server is still running in background" -ForegroundColor Yellow
    Write-Host "   Process ID: $($serverProcess.Id)" -ForegroundColor White
    Write-Host "   To stop: Stop-Process -Id $($serverProcess.Id)" -ForegroundColor Gray
}
