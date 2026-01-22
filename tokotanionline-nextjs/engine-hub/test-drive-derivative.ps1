# PHASE 4 — TEST DRIVE SCRIPT (PowerShell)
# Test generate DERIVATIVE article dengan outline K1-TURUNAN-3

Write-Host "🚀 PHASE 4 — TEST DRIVE" -ForegroundColor Cyan
Write-Host "=========================" -ForegroundColor Cyan
Write-Host ""

# Check if API key is set
$apiKey = $env:OPENAI_API_KEY
if (-not $apiKey) {
    $apiKey = $env:AI_API_KEY
}

if (-not $apiKey) {
    Write-Host "❌ ERROR: OPENAI_API_KEY or AI_API_KEY must be set" -ForegroundColor Red
    Write-Host "   Set it with: `$env:OPENAI_API_KEY='your_key_here'" -ForegroundColor Yellow
    exit 1
}

# Check if server is running
Write-Host "🔍 Checking if Go engine server is running on :8080..." -ForegroundColor Yellow
try {
    $healthCheck = Invoke-WebRequest -Uri "http://localhost:8080/health" -Method GET -TimeoutSec 2 -ErrorAction Stop
    Write-Host "✅ Server is running" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Server not running. Please start it with:" -ForegroundColor Yellow
    Write-Host "   cd engine-hub" -ForegroundColor White
    Write-Host "   go run cmd/server/main.go" -ForegroundColor White
    exit 1
}

Write-Host ""

# Read outline from file
$outlineFile = "..\docs\OUTLINE-K1-TURUNAN-3-KESALAHAN-UMUM.md"
if (-not (Test-Path $outlineFile)) {
    Write-Host "❌ ERROR: Outline file not found: $outlineFile" -ForegroundColor Red
    exit 1
}

# Extract outline content (from line 28 to line 232)
$outlineContent = Get-Content $outlineFile | Select-Object -Skip 27 -First 205
$outlineText = $outlineContent -join "`n"

# Prepare JSON payload
$payload = @{
    contentType = "DERIVATIVE"
    category = "K1"
    outline = $outlineText
    language = "id-ID"
} | ConvertTo-Json -Depth 10

Write-Host "📝 Sending generate request..." -ForegroundColor Yellow
Write-Host "   Content Type: DERIVATIVE" -ForegroundColor White
Write-Host "   Category: K1" -ForegroundColor White
Write-Host "   Language: id-ID" -ForegroundColor White
Write-Host ""

# Make API call
try {
    $response = Invoke-RestMethod -Uri "http://localhost:8080/api/engine/ai/generate" `
        -Method POST `
        -ContentType "application/json" `
        -Body $payload `
        -ErrorAction Stop

    $status = $response.status

    if ($status -eq "DRAFT_AI") {
        Write-Host "✅ GENERATION SUCCESS" -ForegroundColor Green
        Write-Host "   Status: $status" -ForegroundColor White
        Write-Host ""

        # Extract content
        $title = $response.content.title
        $body = $response.content.body
        $metaTitle = $response.content.metaTitle
        $metaDesc = $response.content.metaDesc

        Write-Host "📄 GENERATED CONTENT:" -ForegroundColor Cyan
        Write-Host "====================" -ForegroundColor Cyan
        Write-Host "Title: $title" -ForegroundColor White
        Write-Host "Meta Title: $metaTitle" -ForegroundColor White
        Write-Host "Meta Description: $metaDesc" -ForegroundColor White
        Write-Host ""

        $bodyPreview = if ($body.Length -gt 500) { $body.Substring(0, 500) + "..." } else { $body }
        Write-Host "Body (first 500 chars):" -ForegroundColor Yellow
        Write-Host $bodyPreview -ForegroundColor White
        Write-Host ""

        # Save to file for review
        $timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
        $outputFile = "test-drive-result-$timestamp.json"
        $response | ConvertTo-Json -Depth 10 | Out-File -FilePath $outputFile -Encoding UTF8
        Write-Host "💾 Full response saved to: $outputFile" -ForegroundColor Green
        Write-Host ""

        Write-Host "📖 MANUAL REVIEW REQUIRED:" -ForegroundColor Cyan
        Write-Host "   Read the full content and evaluate:" -ForegroundColor White
        Write-Host "   1. Does it feel like human-written article?" -ForegroundColor White
        Write-Host "   2. Does it flow naturally, not stiff?" -ForegroundColor White
        Write-Host "   3. Can you detect AI template patterns?" -ForegroundColor White
        Write-Host "   4. Is it comfortable to read for 5-7 minutes?" -ForegroundColor White

    } elseif ($status -eq "FAILED_VALIDATION") {
        Write-Host "❌ GENERATION FAILED: VALIDATION ERROR" -ForegroundColor Red
        Write-Host "   Status: $status" -ForegroundColor White
        $errorMsg = if ($response.message) { $response.message } else { $response.error }
        Write-Host "   Error: $errorMsg" -ForegroundColor Red

    } else {
        Write-Host "⚠️  GENERATION FAILED" -ForegroundColor Yellow
        Write-Host "   Status: $status" -ForegroundColor White
        $response | ConvertTo-Json -Depth 10 | Write-Host
    }
} catch {
    Write-Host "❌ ERROR: Failed to call API" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response: $responseBody" -ForegroundColor Red
    }
    exit 1
}
