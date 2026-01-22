[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$ErrorActionPreference = "Stop"

# Read outline with UTF8 encoding
$outline = [System.IO.File]::ReadAllText("$PWD\test-outline-derivative-3.txt", [System.Text.Encoding]::UTF8)

# Create payload
$payload = @{
    contentType = "DERIVATIVE"
    category = "K1"
    outline = $outline.Trim()
    language = "id-ID"
}

# Convert to JSON with UTF8
$jsonBody = $payload | ConvertTo-Json -Depth 10 -Compress:$false
$bytes = [System.Text.Encoding]::UTF8.GetBytes($jsonBody)

Write-Host "Sending request (payload size: $($bytes.Length) bytes)..."

try {
    $request = [System.Net.HttpWebRequest]::Create("http://localhost:8080/api/engine/ai/generate")
    $request.Method = "POST"
    $request.ContentType = "application/json; charset=utf-8"
    $request.ContentLength = $bytes.Length
    
    $requestStream = $request.GetRequestStream()
    $requestStream.Write($bytes, 0, $bytes.Length)
    $requestStream.Close()
    
    $response = $request.GetResponse()
    $responseStream = $response.GetResponseStream()
    $reader = New-Object System.IO.StreamReader($responseStream, [System.Text.Encoding]::UTF8)
    $responseBody = $reader.ReadToEnd()
    $reader.Close()
    $responseStream.Close()
    $response.Close()
    
    $result = $responseBody | ConvertFrom-Json
    
    $timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
    $result | ConvertTo-Json -Depth 10 | Out-File -FilePath "test-result-$timestamp.json" -Encoding UTF8
    
    Write-Host ""
    Write-Host "=== RESULT ===" -ForegroundColor Green
    Write-Host "Status: $($result.status)" -ForegroundColor Cyan
    Write-Host "Title: $($result.content.title)" -ForegroundColor White
    Write-Host "Meta Title: $($result.content.metaTitle)" -ForegroundColor White
    Write-Host "Meta Desc: $($result.content.metaDesc)" -ForegroundColor White
    Write-Host ""
    Write-Host "Body preview (first 1000 chars):" -ForegroundColor Yellow
    Write-Host $result.content.body.Substring(0, [Math]::Min(1000, $result.content.body.Length))
    Write-Host ""
    Write-Host "Full result saved to: test-result-$timestamp.json" -ForegroundColor Green
    
    $result
} catch {
    Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
    $webException = $_.Exception
    if ($webException.Response) {
        $errorStream = $webException.Response.GetResponseStream()
        $errorReader = New-Object System.IO.StreamReader($errorStream, [System.Text.Encoding]::UTF8)
        $errorBody = $errorReader.ReadToEnd()
        Write-Host "Error Response Body:" -ForegroundColor Red
        Write-Host $errorBody -ForegroundColor Yellow
        $errorReader.Close()
        $errorStream.Close()
        
        # Try to parse as JSON
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
    # Don't throw, just exit
    exit 1
}
