$outline = Get-Content "test-outline-derivative-3.txt" -Raw
$payload = @{
    contentType = "DERIVATIVE"
    category = "K1"
    outline = $outline.Trim()
    language = "id-ID"
} | ConvertTo-Json -Depth 10

Write-Host "Sending request..."
try {
    $response = Invoke-RestMethod -Uri "http://localhost:8080/api/engine/ai/generate" -Method POST -ContentType "application/json" -Body $payload -TimeoutSec 120
    
    $timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
    $response | ConvertTo-Json -Depth 10 | Out-File -FilePath "test-result-$timestamp.json" -Encoding UTF8
    
    Write-Host "Status: $($response.status)"
    Write-Host "Title: $($response.content.title)"
    Write-Host ""
    Write-Host "Body preview:"
    if ($response.content.body) {
        $preview = $response.content.body.Substring(0, [Math]::Min(1000, $response.content.body.Length))
        Write-Host $preview
    }
    
    $response
} catch {
    Write-Host "Error: $($_.Exception.Message)"
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response: $responseBody"
    }
    throw
}
