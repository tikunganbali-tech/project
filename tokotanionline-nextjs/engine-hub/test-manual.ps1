# MANUAL TEST - Simple request untuk debug
# Jalankan ini di terminal TERPISAH (jangan tutup server terminal)

Write-Host "=== MANUAL TEST DRIVE ===" -ForegroundColor Cyan
Write-Host ""

# Read outline
$outlinePath = Join-Path $PWD "test-outline-derivative-3.txt"
Write-Host "Reading outline from: $outlinePath" -ForegroundColor Yellow

if (-not (Test-Path $outlinePath)) {
    Write-Host "ERROR: Outline file not found!" -ForegroundColor Red
    exit 1
}

$outline = [System.IO.File]::ReadAllText($outlinePath, [System.Text.Encoding]::UTF8)
Write-Host "Outline loaded, length: $($outline.Length) chars" -ForegroundColor Green
Write-Host ""

# Create payload
Write-Host "Creating request payload..." -ForegroundColor Yellow
$payload = @{
    contentType = "DERIVATIVE"
    category = "K1"
    outline = $outline.Trim()
    language = "id-ID"
} | ConvertTo-Json -Depth 10

$bytes = [System.Text.Encoding]::UTF8.GetBytes($payload)
Write-Host "Payload created, size: $($bytes.Length) bytes" -ForegroundColor Green
Write-Host ""

# Check server (try 8080 first, then 8090)
Write-Host "Checking server status..." -ForegroundColor Yellow
$serverPort = 8090  # Default to 8090
$serverUrl = "http://localhost:8090"

try {
    $healthCheck = Invoke-WebRequest -Uri "http://localhost:8090/health" -Method GET -TimeoutSec 2 -ErrorAction Stop
    Write-Host "Server is running on port 8090!" -ForegroundColor Green
} catch {
    try {
        $healthCheck = Invoke-WebRequest -Uri "http://localhost:8080/health" -Method GET -TimeoutSec 2 -ErrorAction Stop
        Write-Host "Server is running on port 8080!" -ForegroundColor Green
        $serverPort = 8080
        $serverUrl = "http://localhost:8080"
    } catch {
        Write-Host "ERROR: Server not running on :8080 or :8090" -ForegroundColor Red
        Write-Host "Please start server first with: go run cmd/server/main.go" -ForegroundColor Yellow
        exit 1
    }
}

Write-Host ""
Write-Host "Sending request to /api/engine/ai/generate..." -ForegroundColor Cyan
Write-Host "WATCH THE SERVER TERMINAL FOR LOGS!" -ForegroundColor Yellow
Write-Host ""

try {
    $response = Invoke-WebRequest -Uri "$serverUrl/api/engine/ai/generate" `
        -Method POST `
        -ContentType "application/json; charset=utf-8" `
        -Body $bytes `
        -TimeoutSec 120 `
        -ErrorAction Stop

    Write-Host "SUCCESS! Status Code: $($response.StatusCode)" -ForegroundColor Green
    Write-Host ""
    
    $result = $response.Content | ConvertFrom-Json
    
    Write-Host "=== RESPONSE ===" -ForegroundColor Cyan
    Write-Host "Status: $($result.status)" -ForegroundColor White
    Write-Host "Title: $($result.content.title)" -ForegroundColor White
    Write-Host "Meta Title: $($result.content.metaTitle)" -ForegroundColor White
    Write-Host ""
    
    $timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
    $result | ConvertTo-Json -Depth 10 | Out-File -FilePath "test-result-$timestamp.json" -Encoding UTF8
    Write-Host "Full result saved to: test-result-$timestamp.json" -ForegroundColor Green
    
} catch {
    Write-Host "ERROR occurred!" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    
    if ($_.Exception.Response) {
        $statusCode = $_.Exception.Response.StatusCode.value__
        Write-Host "Status Code: $statusCode" -ForegroundColor Red
        
        try {
            $stream = $_.Exception.Response.GetResponseStream()
            $reader = New-Object System.IO.StreamReader($stream, [System.Text.Encoding]::UTF8)
            $errorBody = $reader.ReadToEnd()
            $reader.Close()
            $stream.Close()
            
            if ($errorBody) {
                Write-Host ""
                Write-Host "=== ERROR RESPONSE ===" -ForegroundColor Red
                Write-Host $errorBody -ForegroundColor Yellow
                
                try {
                    $errorJson = $errorBody | ConvertFrom-Json
                    Write-Host ""
                    Write-Host "Parsed Error:" -ForegroundColor Red
                    Write-Host "  Status: $($errorJson.status)" -ForegroundColor White
                    Write-Host "  Message: $($errorJson.message)" -ForegroundColor White
                    Write-Host "  Error: $($errorJson.error)" -ForegroundColor White
                } catch {
                    Write-Host "Could not parse error as JSON" -ForegroundColor Gray
                }
            }
        } catch {
            Write-Host "Could not read error response body" -ForegroundColor Gray
        }
    }
    
    Write-Host ""
    Write-Host "CHECK THE SERVER TERMINAL FOR DETAILED LOGS!" -ForegroundColor Yellow
}
