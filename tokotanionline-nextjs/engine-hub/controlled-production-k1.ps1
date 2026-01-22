# PHASE 5 - CONTROLLED PRODUCTION SCRIPT (PowerShell)
# Generate 3 DERIVATIVE K1 articles with QualityProfile active
# NO forced word count - natural generation for learning

Write-Host "PHASE 5 - CONTROLLED PRODUCTION" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "BACKEND ONLY - Quality Learning System" -ForegroundColor Yellow
Write-Host "  QualityProfile B: ACTIVE (NON-NEGOTIABLE)" -ForegroundColor White
Write-Host "  Word count: NOT FORCED (natural generation)" -ForegroundColor White
Write-Host "  Logging: ACTIVE" -ForegroundColor White
Write-Host ""

# Check if API key is set
$apiKey = $env:OPENAI_API_KEY
if (-not $apiKey) {
    $apiKey = $env:AI_API_KEY
}

if (-not $apiKey) {
    Write-Host "ERROR: OPENAI_API_KEY or AI_API_KEY must be set" -ForegroundColor Red
    Write-Host "  Set it with: `$env:OPENAI_API_KEY='your_key_here'" -ForegroundColor Yellow
    exit 1
}

# Check if server is running
Write-Host "Checking if Go engine server is running..." -ForegroundColor Yellow
$serverPort = "8090"
if ($env:ENGINE_PORT) {
    $serverPort = $env:ENGINE_PORT
}

$baseUrl = "http://localhost:$serverPort"
try {
    $healthCheck = Invoke-WebRequest -Uri "$baseUrl/health" -Method GET -TimeoutSec 2 -ErrorAction Stop
    Write-Host "Server is running on $baseUrl" -ForegroundColor Green
} catch {
    Write-Host "Server not running. Please start it with:" -ForegroundColor Yellow
    Write-Host "  cd engine-hub" -ForegroundColor White
    Write-Host "  go run cmd/server/main.go" -ForegroundColor White
    exit 1
}

Write-Host ""

# Prepare controlled production request
Write-Host "Preparing controlled production request..." -ForegroundColor Yellow
Write-Host "  Category: K1" -ForegroundColor White
Write-Host "  Content Type: DERIVATIVE_LONG" -ForegroundColor White
Write-Host "  Language: id-ID" -ForegroundColor White
Write-Host "  Count: 1 article (TEST MODE)" -ForegroundColor White
Write-Host ""

$payload = @{
    category = "K1"
    contentType = "DERIVATIVE_LONG"
    language = "id-ID"
    count = 1
} | ConvertTo-Json -Depth 10

Write-Host "Starting controlled production..." -ForegroundColor Cyan
Write-Host "  This will generate 1 article with quality metrics (TEST MODE)..." -ForegroundColor White
Write-Host ""

# Make API call
# Note: Timeout set to 600 seconds (10 minutes) to allow for 1 article generation
# Each article takes 2-5 minutes
Write-Host "Note: This process will take 2-5 minutes. Please be patient..." -ForegroundColor Yellow
Write-Host ""

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/engine/ai/controlled-production" -Method POST -ContentType "application/json" -Body $payload -TimeoutSec 600

    Write-Host ""
    Write-Host "CONTROLLED PRODUCTION COMPLETED" -ForegroundColor Green
    Write-Host "================================" -ForegroundColor Green
    Write-Host ""

    # Display summary
    Write-Host $response.summary -ForegroundColor White
    Write-Host ""

    # Display individual sample results
    Write-Host "DETAILED METRICS:" -ForegroundColor Cyan
    Write-Host "=================" -ForegroundColor Cyan
    Write-Host ""

    foreach ($sample in $response.samples) {
        if ($sample.pass -eq $true) {
            $statusColor = "Green"
            $statusText = "PASS"
        } else {
            $statusColor = "Red"
            $statusText = "FAIL"
        }
        
        Write-Host "SAMPLE #$($sample.sampleNumber): $statusText" -ForegroundColor $statusColor
        Write-Host "  Prompt Version: $($sample.promptVersion)" -ForegroundColor White
        if ($sample.title) {
            Write-Host "  Title: $($sample.title)" -ForegroundColor White
        }
        if ($null -ne $sample.wordCount) {
            Write-Host "  Word Count: $($sample.wordCount)" -ForegroundColor White
        }
        if ($null -ne $sample.depthScore) {
            Write-Host "  Depth Score: $($sample.depthScore.ToString('F2'))" -ForegroundColor White
        }
        if ($null -ne $sample.repetitionRate) {
            Write-Host "  Repetition Rate: $($sample.repetitionRate.ToString('P2'))" -ForegroundColor White
        }
        if ($null -ne $sample.structureCompl) {
            Write-Host "  Structure Compliance: $($sample.structureCompl.ToString('P2'))" -ForegroundColor White
        }
        if ($null -ne $sample.readability) {
            Write-Host "  Readability: $($sample.readability)" -ForegroundColor White
        }
        
        if ($sample.pass -eq $false) {
            if ($sample.failureReasons) {
                Write-Host "  Failure Reasons:" -ForegroundColor Red
                foreach ($reason in $sample.failureReasons) {
                    Write-Host "    - $reason" -ForegroundColor Yellow
                }
            }
        }
        Write-Host ""
    }

    # Count passes and fails
    $passCount = 0
    $failCount = 0
    if ($null -ne $response.samples) {
        foreach ($sample in $response.samples) {
            if ($sample.pass -eq $true) {
                $passCount++
            } else {
                $failCount++
            }
        }
    }
    
    $totalSamples = if ($null -ne $response.sampleCount) { $response.sampleCount } else { $passCount + $failCount }
    if ($totalSamples -gt 0) {
        $passRate = ($passCount / $totalSamples) * 100
    } else {
        $passRate = 0
    }
    
    if ($passRate -ge 66.7) {
        $passRateColor = "Green"
    } else {
        $passRateColor = "Yellow"
    }

    Write-Host "SUMMARY:" -ForegroundColor Cyan
    Write-Host "  Total Samples: $totalSamples" -ForegroundColor White
    Write-Host "  Pass: $passCount" -ForegroundColor Green
    Write-Host "  Fail: $failCount" -ForegroundColor Red
    Write-Host "  Pass Rate: $($passRate.ToString('F1'))%" -ForegroundColor $passRateColor
    Write-Host ""

    # Save results to file
    $timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
    $outputFile = "controlled-production-results-$timestamp.json"
    $response | ConvertTo-Json -Depth 10 | Out-File -FilePath $outputFile -Encoding UTF8
    Write-Host "Results saved to: $outputFile" -ForegroundColor Cyan
    Write-Host ""

} catch {
    Write-Host ""
    Write-Host "ERROR: Controlled production failed" -ForegroundColor Red
    Write-Host "  Error: $_" -ForegroundColor Yellow
    
    if ($_.Exception.Response) {
        try {
            $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
            $responseBody = $reader.ReadToEnd()
            Write-Host "  Response: $responseBody" -ForegroundColor Yellow
        } catch {
            # Ignore errors reading response
        }
    }
    
    exit 1
}

Write-Host "Done!" -ForegroundColor Green
