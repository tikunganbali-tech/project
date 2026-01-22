# Test AI Generate on port 8090
$outline = [System.IO.File]::ReadAllText("$PWD\test-outline-derivative-3.txt", [System.Text.Encoding]::UTF8)
$payload = @{
    contentType = "DERIVATIVE"
    category = "K1"
    outline = $outline.Trim()
    language = "id-ID"
} | ConvertTo-Json -Depth 10

$bytes = [System.Text.Encoding]::UTF8.GetBytes($payload)

Write-Host "=== TESTING AI GENERATE (PORT 8090) ===" -ForegroundColor Cyan
Write-Host "Payload size: $($bytes.Length) bytes" -ForegroundColor Yellow
Write-Host "Sending request..." -ForegroundColor Yellow
Write-Host ""

try {
    $startTime = Get-Date
    $response = Invoke-WebRequest -Uri "http://localhost:8090/api/engine/ai/generate" `
        -Method POST `
        -ContentType "application/json; charset=utf-8" `
        -Body $bytes `
        -TimeoutSec 120
    
    $duration = ((Get-Date) - $startTime).TotalSeconds
    $result = $response.Content | ConvertFrom-Json
    
    Write-Host "SUCCESS - Duration: $([Math]::Round($duration, 1))s" -ForegroundColor Green
    Write-Host ""
    Write-Host "Status: $($result.status)" -ForegroundColor Cyan
    Write-Host "Title: $($result.content.title)" -ForegroundColor White
    Write-Host "Meta Title: $($result.content.metaTitle)" -ForegroundColor White
    Write-Host "Meta Desc: $($result.content.metaDesc)" -ForegroundColor White
    Write-Host ""
    
    $wordCount = ($result.content.body -split '\s+').Count
    Write-Host "Word count: ~$wordCount words" -ForegroundColor Cyan
    Write-Host "Body length: $($result.content.body.Length) chars" -ForegroundColor Cyan
    Write-Host ""
    
    Write-Host "Body Preview (first 500 chars):" -ForegroundColor Yellow
    $preview = if ($result.content.body.Length -gt 500) { 
        $result.content.body.Substring(0, 500) + "..."
    } else { 
        $result.content.body 
    }
    Write-Host $preview
    Write-Host ""
    
    $timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
    $result | ConvertTo-Json -Depth 10 | Out-File -FilePath "test-result-$timestamp.json" -Encoding UTF8
    
    Write-Host "Result saved to: test-result-$timestamp.json" -ForegroundColor Green
    Write-Host ""
    Write-Host "MANUAL REVIEW: Open test-result-$timestamp.json" -ForegroundColor Cyan
    
    $result
} catch {
    Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
    
    if ($_.Exception.Response) {
        $status = $_.Exception.Response.StatusCode.value__
        Write-Host "Status Code: $status" -ForegroundColor Red
        
        try {
            $stream = $_.Exception.Response.GetResponseStream()
            $reader = New-Object System.IO.StreamReader($stream, [System.Text.Encoding]::UTF8)
            $body = $reader.ReadToEnd()
            $reader.Close()
            $stream.Close()
            
            if ($body -and $body.Length -gt 0) {
                Write-Host ""
                Write-Host "=== ERROR RESPONSE ===" -ForegroundColor Red
                Write-Host $body -ForegroundColor Yellow
                
                try {
                    $errorJson = $body | ConvertFrom-Json
                    Write-Host ""
                    Write-Host "=== PARSED ERROR ===" -ForegroundColor Red
                    Write-Host "Status: $($errorJson.status)" -ForegroundColor White
                    Write-Host "Error: $($errorJson.error)" -ForegroundColor White
                    Write-Host "Message: $($errorJson.message)" -ForegroundColor White
                } catch {
                    Write-Host "Could not parse as JSON" -ForegroundColor Gray
                }
            } else {
                Write-Host ""
                Write-Host "Empty response body (server crash before response)" -ForegroundColor Yellow
            }
        } catch {
            Write-Host "Could not read error response" -ForegroundColor Gray
        }
    }
    
    Write-Host ""
    Write-Host "=== REQUIRED: COPY SERVER LOGS ===" -ForegroundColor Cyan
    Write-Host "Go to terminal where server is running" -ForegroundColor White
    Write-Host "Copy logs from [AI] Generate endpoint hit" -ForegroundColor White
    Write-Host "Send logs to debug" -ForegroundColor White
}
