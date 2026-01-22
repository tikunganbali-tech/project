# START SERVER IN FOREGROUND (DO NOT CLOSE THIS TERMINAL)
# This script starts the server and shows all logs in real-time

Write-Host "=== STARTING SERVER IN FOREGROUND ===" -ForegroundColor Cyan
Write-Host "DO NOT CLOSE THIS TERMINAL - Logs will appear here" -ForegroundColor Yellow
Write-Host ""

# Set API key
$env:OPENAI_API_KEY="YOUR_OPENAI_API_KEY_HERE"

Write-Host "API Key set (length: $($env:OPENAI_API_KEY.Length))" -ForegroundColor Green
Write-Host ""
Write-Host "Starting server..." -ForegroundColor Yellow
Write-Host "Watch for logs starting with [BOOT] and [AI]" -ForegroundColor Yellow
Write-Host ""

# Run server (this will block and show all output)
go run cmd/server/main.go
