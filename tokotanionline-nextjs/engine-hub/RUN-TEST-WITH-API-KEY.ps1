# FASE 1 — RUN TEST WITH API KEY
# Script untuk set API key dan langsung test image pipeline

Write-Host "🚀 FASE 1 — RUN TEST WITH API KEY" -ForegroundColor Cyan
Write-Host "===================================" -ForegroundColor Cyan
Write-Host ""

# Set API Key
$apiKey = "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"
$env:OPENAI_API_KEY = $apiKey
$env:IMAGE_API_KEY = $apiKey  # Use same key for image generation

Write-Host "✅ API Key set" -ForegroundColor Green
Write-Host ""

# Check if we're in the right directory
if (-not (Test-Path "cmd\server\main.go")) {
    Write-Host "❌ ERROR: Please run this script from engine-hub directory" -ForegroundColor Red
    Write-Host "   Current directory: $(Get-Location)" -ForegroundColor Yellow
    exit 1
}

# Check if server is running
$serverPort = $env:ENGINE_PORT
if (-not $serverPort) {
    $serverPort = "8090"
}
$serverUrl = "http://localhost:$serverPort"

Write-Host "🔍 Checking if Go engine server is running on :$serverPort..." -ForegroundColor Yellow
try {
    $healthCheck = Invoke-WebRequest -Uri "$serverUrl/health" -Method GET -TimeoutSec 2 -ErrorAction Stop
    Write-Host "✅ Server is already running on port $serverPort" -ForegroundColor Green
    Write-Host ""
    
    # Run test directly
    Write-Host "🧪 Running image pipeline test..." -ForegroundColor Cyan
    Write-Host ""
    & ".\test-image-pipeline.ps1"
    
} catch {
    Write-Host "⚠️  Server not running. Starting server..." -ForegroundColor Yellow
    Write-Host ""
    
    # Start server in background
    Write-Host "📦 Starting Go engine server..." -ForegroundColor Cyan
    $serverProcess = Start-Process -FilePath "go" -ArgumentList "run", "cmd/server/main.go" -NoNewWindow -PassThru
    
    Write-Host "⏳ Waiting for server to start (max 30 seconds)..." -ForegroundColor Yellow
    
    # Wait for server to be ready
    $maxWait = 30
    $waited = 0
    $serverReady = $false
    
    while ($waited -lt $maxWait) {
        Start-Sleep -Seconds 2
        $waited += 2
        
        try {
            $healthCheck = Invoke-WebRequest -Uri "$serverUrl/health" -Method GET -TimeoutSec 1 -ErrorAction Stop
            $serverReady = $true
            Write-Host "✅ Server is ready!" -ForegroundColor Green
            Write-Host ""
            break
        } catch {
            Write-Host "   Waiting... ($waited/$maxWait sec)" -ForegroundColor Gray
        }
    }
    
    if (-not $serverReady) {
        Write-Host "❌ Server failed to start within $maxWait seconds" -ForegroundColor Red
        if ($serverProcess) {
            Stop-Process -Id $serverProcess.Id -Force -ErrorAction SilentlyContinue
        }
        exit 1
    }
    
    # Run test
    Write-Host "🧪 Running image pipeline test..." -ForegroundColor Cyan
    Write-Host ""
    
    try {
        & ".\test-image-pipeline.ps1"
    } finally {
        # Offer to stop server
        Write-Host ""
        Write-Host "🛑 Server is still running in background" -ForegroundColor Yellow
        Write-Host "   Process ID: $($serverProcess.Id)" -ForegroundColor White
        Write-Host "   To stop: Stop-Process -Id $($serverProcess.Id)" -ForegroundColor Gray
    }
}
