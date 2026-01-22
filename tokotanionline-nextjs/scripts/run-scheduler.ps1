# Run Scheduler Worker Script
# Loads DATABASE_URL from .env and runs the scheduler

$ErrorActionPreference = "Stop"

# Get the project root directory
$projectRoot = Split-Path -Parent $PSScriptRoot
$envFile = Join-Path $projectRoot ".env"

# Load DATABASE_URL from .env file
if (Test-Path $envFile) {
    Write-Host "📄 Loading environment variables from .env file..."
    Get-Content $envFile | ForEach-Object {
        if ($_ -match '^\s*([^#][^=]+)=(.*)$') {
            $key = $matches[1].Trim()
            $value = $matches[2].Trim()
            # Remove quotes if present
            $value = $value -replace '^["'']|["'']$', ''
            [Environment]::SetEnvironmentVariable($key, $value, "Process")
            Write-Host "   Loaded: $key"
        }
    }
} else {
    Write-Host "⚠️  .env file not found at: $envFile"
    Write-Host "   Using system environment variables..."
}

# Check if DATABASE_URL is set
if (-not $env:DATABASE_URL) {
    Write-Host "❌ ERROR: DATABASE_URL is not set!"
    Write-Host "   Please set DATABASE_URL in .env file or as system environment variable"
    exit 1
}

# Remove schema parameter (Prisma uses it but Go lib/pq doesn't support it)
if ($env:DATABASE_URL -match 'schema=') {
    # Remove schema parameter from query string
    $dbUrl = $env:DATABASE_URL
    if ($dbUrl -match '^([^?]+)(\?.+)$') {
        $baseUrl = $matches[1]
        $queryString = $matches[2]
        # Remove schema parameter (with value)
        $queryString = $queryString -replace '[&?]schema=[^&]*', ''
        # Clean up double ? or & at start
        $queryString = $queryString -replace '^\?&', '?'
        $queryString = $queryString -replace '^&', '?'
        $env:DATABASE_URL = $baseUrl + $queryString
        Write-Host "   Removed schema parameter from DATABASE_URL"
    } else {
        # No query string, just remove schema if it exists (shouldn't happen)
        $env:DATABASE_URL = $dbUrl -replace 'schema=[^&]*', ''
    }
}

# Add sslmode=disable if not present (for local PostgreSQL)
if ($env:DATABASE_URL -notmatch 'sslmode=') {
    if ($env:DATABASE_URL -match '\?') {
        $env:DATABASE_URL = "$($env:DATABASE_URL)&sslmode=disable"
    } else {
        $env:DATABASE_URL = "$($env:DATABASE_URL)?sslmode=disable"
    }
    Write-Host "   Added sslmode=disable to DATABASE_URL"
}

Write-Host "✅ DATABASE_URL is set (length: $($env:DATABASE_URL.Length))"
Write-Host ""
Write-Host "🚀 Starting scheduler worker..."
Write-Host "   Press Ctrl+C to stop"
Write-Host ""

# Set ENV to development to enable .env loading in Go
$env:ENV = "development"

# Change to engine-hub directory and run scheduler
Set-Location (Join-Path $projectRoot "engine-hub")
go run cmd/scheduler/main.go
