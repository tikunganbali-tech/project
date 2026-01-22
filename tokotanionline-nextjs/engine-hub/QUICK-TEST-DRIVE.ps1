# QUICK TEST DRIVE - Run this after setting API key and starting server
# Usage: .\QUICK-TEST-DRIVE.ps1

param(
    [string]$ApiKey = "",
    [switch]$StartServer = $false
)

Write-Host "🚀 PHASE 4 — QUICK TEST DRIVE" -ForegroundColor Cyan
Write-Host "==============================" -ForegroundColor Cyan
Write-Host ""

# Check or set API key
# Priority: Parameter > Environment Variable > .env file
if ($ApiKey) {
    $env:OPENAI_API_KEY = $ApiKey
    Write-Host "✅ API Key set from parameter" -ForegroundColor Green
} elseif ($env:OPENAI_API_KEY) {
    Write-Host "✅ API Key found in environment" -ForegroundColor Green
} elseif ($env:AI_API_KEY) {
    $env:OPENAI_API_KEY = $env:AI_API_KEY
    Write-Host "✅ API Key found as AI_API_KEY" -ForegroundColor Green
} else {
    # Check if .env file exists (server will load it automatically)
    if (Test-Path ".env") {
        Write-Host "✅ .env file found - server will load API key automatically" -ForegroundColor Green
        Write-Host "   (No need to set environment variable)" -ForegroundColor Gray
    } else {
        Write-Host "⚠️  WARNING: No API key found!" -ForegroundColor Yellow
        Write-Host "   Options:" -ForegroundColor White
        Write-Host "   1. Create .env file with OPENAI_API_KEY=..." -ForegroundColor White
        Write-Host "   2. Set environment: `$env:OPENAI_API_KEY = 'sk-...'" -ForegroundColor White
        Write-Host "   3. Use parameter: .\QUICK-TEST-DRIVE.ps1 -ApiKey 'sk-...'" -ForegroundColor White
        Write-Host ""
        Write-Host "   Continuing anyway (server may load from .env)..." -ForegroundColor Gray
    }
}

# Check if server is running
Write-Host "`n🔍 Checking server status..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8080/health" -Method GET -TimeoutSec 2 -ErrorAction Stop
    Write-Host "✅ Server is running" -ForegroundColor Green
} catch {
    if ($StartServer) {
        Write-Host "⚠️  Server not running. Starting server..." -ForegroundColor Yellow
        Write-Host "   Starting in background (use separate terminal to see logs)" -ForegroundColor White
        Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD'; `$env:OPENAI_API_KEY='$env:OPENAI_API_KEY'; go run cmd/server/main.go"
        Write-Host "   Waiting 5 seconds for server to start..." -ForegroundColor White
        Start-Sleep -Seconds 5
        
        try {
            $response = Invoke-WebRequest -Uri "http://localhost:8080/health" -Method GET -TimeoutSec 2 -ErrorAction Stop
            Write-Host "✅ Server started successfully" -ForegroundColor Green
        } catch {
            Write-Host "❌ Server failed to start. Please start manually:" -ForegroundColor Red
            Write-Host "   cd engine-hub" -ForegroundColor White
            Write-Host "   go run cmd/server/main.go" -ForegroundColor White
            exit 1
        }
    } else {
        Write-Host "❌ Server not running!" -ForegroundColor Red
        Write-Host "   Start it with:" -ForegroundColor Yellow
        Write-Host "   cd engine-hub" -ForegroundColor White
        Write-Host "   go run cmd/server/main.go" -ForegroundColor White
        Write-Host "`n   Or run this script with -StartServer flag:" -ForegroundColor Yellow
        Write-Host "   .\QUICK-TEST-DRIVE.ps1 -StartServer" -ForegroundColor White
        exit 1
    }
}

Write-Host ""

# Read outline
$outlineFile = "test-outline-derivative-3.txt"
if (-not (Test-Path $outlineFile)) {
    Write-Host "❌ ERROR: Outline file not found: $outlineFile" -ForegroundColor Red
    exit 1
}

$outlineText = Get-Content $outlineFile -Raw

Write-Host "📝 Preparing request..." -ForegroundColor Yellow
Write-Host "   Content Type: DERIVATIVE" -ForegroundColor White
Write-Host "   Category: K1" -ForegroundColor White
Write-Host "   Language: id-ID" -ForegroundColor White
Write-Host "   Outline length: $($outlineText.Length) chars" -ForegroundColor White
Write-Host ""

# Prepare payload
$payload = @{
    contentType = "DERIVATIVE"
    category = "K1"
    outline = $outlineText.Trim()
    language = "id-ID"
} | ConvertTo-Json -Depth 10 -Compress:$false

Write-Host "🚀 Sending generate request..." -ForegroundColor Cyan
Write-Host "   (This may take 30-60 seconds)" -ForegroundColor Gray
Write-Host ""

try {
    $startTime = Get-Date
    $response = Invoke-RestMethod -Uri "http://localhost:8080/api/engine/ai/generate" `
        -Method POST `
        -ContentType "application/json" `
        -Body $payload `
        -TimeoutSec 120 `
        -ErrorAction Stop
    $duration = ((Get-Date) - $startTime).TotalSeconds

    $status = $response.status

    Write-Host "⏱️  Generation completed in $([Math]::Round($duration, 1)) seconds" -ForegroundColor Green
    Write-Host ""

    if ($status -eq "DRAFT_AI") {
        Write-Host "✅ GENERATION SUCCESS!" -ForegroundColor Green
        Write-Host "   Status: $status" -ForegroundColor White
        Write-Host ""

        # Extract content
        $title = $response.content.title
        $body = $response.content.body
        $metaTitle = $response.content.metaTitle
        $metaDesc = $response.content.metaDesc
        $images = $response.images

        Write-Host "📄 GENERATED CONTENT:" -ForegroundColor Cyan
        Write-Host "====================" -ForegroundColor Cyan
        Write-Host "Title: $title" -ForegroundColor White
        Write-Host "Meta Title ($($metaTitle.Length) chars): $metaTitle" -ForegroundColor White
        Write-Host "Meta Description ($($metaDesc.Length) chars): $metaDesc" -ForegroundColor White
        Write-Host "Images: $($images.Count)" -ForegroundColor White
        Write-Host ""

        # Word count (rough estimate)
        $wordCount = ($body -split '\s+').Count
        Write-Host "📊 Content Stats:" -ForegroundColor Cyan
        Write-Host "   Word count: ~$wordCount words" -ForegroundColor White
        Write-Host "   Body length: $($body.Length) characters" -ForegroundColor White
        Write-Host ""

        # Preview body (first 800 chars)
        Write-Host "📖 BODY PREVIEW (first 800 chars):" -ForegroundColor Cyan
        Write-Host "-----------------------------------" -ForegroundColor Gray
        $preview = if ($body.Length -gt 800) { $body.Substring(0, 800) + "...`n`n[... truncated ...]" } else { $body }
        Write-Host $preview -ForegroundColor White
        Write-Host ""

        # Save to file
        $timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
        $outputFile = "test-drive-result-$timestamp.json"
        $response | ConvertTo-Json -Depth 10 | Out-File -FilePath $outputFile -Encoding UTF8
        
        # Also save body as markdown for easy reading
        $mdFile = "test-drive-result-$timestamp.md"
        @"
# $title

**Meta Title:** $metaTitle
**Meta Description:** $metaDesc
**Generated:** $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
**Status:** $status
**Word Count:** ~$wordCount words

---

$body
"@ | Out-File -FilePath $mdFile -Encoding UTF8

        Write-Host "💾 Full response saved to:" -ForegroundColor Green
        Write-Host "   JSON: $outputFile" -ForegroundColor White
        Write-Host "   Markdown: $mdFile" -ForegroundColor White
        Write-Host ""

        Write-Host "📖 MANUAL REVIEW REQUIRED:" -ForegroundColor Cyan
        Write-Host "   Open $mdFile and read the full content" -ForegroundColor White
        Write-Host "   Evaluate as editor from major media outlet:" -ForegroundColor White
        Write-Host "   1. ✅ Does it feel like human-written article?" -ForegroundColor Yellow
        Write-Host "   2. ✅ Does it flow naturally, not stiff?" -ForegroundColor Yellow
        Write-Host "   3. ✅ Can you detect AI template patterns?" -ForegroundColor Yellow
        Write-Host "   4. ✅ Is it comfortable to read for 5-7 minutes?" -ForegroundColor Yellow
        Write-Host ""

        Write-Host "📤 REPORT FORMAT:" -ForegroundColor Cyan
        Write-Host "   PHASE 4 — TEST DRIVE" -ForegroundColor White
        Write-Host "   HASIL: LULUS / GAGAL" -ForegroundColor White
        Write-Host "   CATATAN: [your evaluation]" -ForegroundColor White

    } elseif ($status -eq "FAILED_VALIDATION") {
        Write-Host "❌ GENERATION FAILED: VALIDATION ERROR" -ForegroundColor Red
        Write-Host "   Status: $status" -ForegroundColor White
        $errorMsg = if ($response.message) { $response.message } else { $response.error }
        Write-Host "   Error: $errorMsg" -ForegroundColor Red
        Write-Host ""
        Write-Host "   This is EXPECTED if validation rules are working correctly." -ForegroundColor Yellow
        Write-Host "   Review the error message and fix the content generation." -ForegroundColor Yellow
        
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
        Write-Host "Response body:" -ForegroundColor Red
        Write-Host $responseBody -ForegroundColor Red
    }
    
    exit 1
}
