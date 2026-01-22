# FASE 1 — TEST IMAGE PIPELINE INTEGRATION
# Generate 1 artikel dengan pipeline gambar lengkap (download & simpan lokal)

Write-Host "🚀 FASE 1 — TEST IMAGE PIPELINE" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan
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

# Check if IMAGE_API_KEY is set (can use same as OPENAI_API_KEY)
$imageApiKey = $env:IMAGE_API_KEY
if (-not $imageApiKey) {
    $imageApiKey = $apiKey
}

# Check if server is running (default port 8090)
$serverPort = $env:ENGINE_PORT
if (-not $serverPort) {
    $serverPort = "8090"
}
$serverUrl = "http://localhost:$serverPort"

Write-Host "🔍 Checking if Go engine server is running on :$serverPort..." -ForegroundColor Yellow
try {
    $healthCheck = Invoke-WebRequest -Uri "$serverUrl/health" -Method GET -TimeoutSec 2 -ErrorAction Stop
    Write-Host "✅ Server is running on port $serverPort" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Server not running. Please start it with:" -ForegroundColor Yellow
    Write-Host "   cd engine-hub" -ForegroundColor White
    Write-Host "   go run cmd/server/main.go" -ForegroundColor White
    Write-Host ""
    Write-Host "   Or set ENGINE_PORT environment variable if using different port" -ForegroundColor Gray
    exit 1
}

Write-Host ""

# Read outline from file (using DERIVATIVE_LONG outline)
$outlineFile = "..\docs\OUTLINE-K1-CORNERSTONE-PANDUAN-DASAR.md"
if (-not (Test-Path $outlineFile)) {
    Write-Host "❌ ERROR: Outline file not found: $outlineFile" -ForegroundColor Red
    exit 1
}

# Extract outline content (from line 28 onwards - structure section)
$outlineContent = Get-Content $outlineFile | Select-Object -Skip 27
$outlineText = $outlineContent -join "`n"

Write-Host "📝 Preparing article generation request..." -ForegroundColor Yellow
Write-Host "   Content Type: DERIVATIVE_LONG" -ForegroundColor White
Write-Host "   Category: K1" -ForegroundColor White
Write-Host "   Language: id-ID" -ForegroundColor White
Write-Host "   Outline: Loaded from file" -ForegroundColor White
Write-Host ""

# Prepare JSON payload
$payload = @{
    contentType = "DERIVATIVE_LONG"
    category = "K1"
    outline = $outlineText.Trim()
    language = "id-ID"
} | ConvertTo-Json -Depth 10 -Compress:$false

Write-Host "🚀 Sending generate request with IMAGE PIPELINE..." -ForegroundColor Cyan
Write-Host "   (This may take 2-5 minutes for content + images)" -ForegroundColor Gray
Write-Host ""

try {
    $startTime = Get-Date
    $response = Invoke-RestMethod -Uri "$serverUrl/api/engine/ai/generate" `
        -Method POST `
        -ContentType "application/json" `
        -Body $payload `
        -TimeoutSec 600 `
        -ErrorAction Stop
    $duration = ((Get-Date) - $startTime).TotalSeconds

    $status = $response.status

    Write-Host "⏱️  Generation completed in $([Math]::Round($duration, 1)) seconds" -ForegroundColor Green
    Write-Host ""

    if ($status -eq "DRAFT_AI") {
        Write-Host "✅ GENERATION SUCCESS!" -ForegroundColor Green
        Write-Host ""
        
        # Display article info
        Write-Host "📄 ARTICLE INFO:" -ForegroundColor Cyan
        Write-Host "   Title: $($response.content.title)" -ForegroundColor White
        Write-Host "   Status: $($response.content.status)" -ForegroundColor White
        Write-Host ""
        
        # Display image info
        $imageCount = $response.images.Count
        Write-Host "🖼️  IMAGE INFO:" -ForegroundColor Cyan
        Write-Host "   Jumlah gambar: $imageCount" -ForegroundColor White
        
        if ($imageCount -gt 0) {
            Write-Host ""
            Write-Host "   Detail gambar:" -ForegroundColor Yellow
            $heroFound = $false
            for ($i = 0; $i -lt $imageCount; $i++) {
                $img = $response.images[$i]
                $imgType = if ($img.isHero) { "HERO" } else { "SECTION" }
                Write-Host "   [$($i+1)] $imgType - $($img.heading)" -ForegroundColor White
                Write-Host "       Local Path: $($img.localPath)" -ForegroundColor Gray
                Write-Host "       Alt Text: $($img.altText)" -ForegroundColor Gray
                if ($img.isHero) { $heroFound = $true }
            }
            
            # Check if images are saved locally
            Write-Host ""
            Write-Host "   ✅ Lokasi storage:" -ForegroundColor Green
            $firstImg = $response.images[0]
            if ($firstImg.localPath) {
                $pathParts = $firstImg.localPath -split '/'
                $articleSlug = $pathParts[2]  # /uploads/artikel-slug/filename
                $storagePath = "public\uploads\$articleSlug"
                Write-Host "       $storagePath" -ForegroundColor White
                
                # Check if directory exists
                if (Test-Path $storagePath) {
                    $files = Get-ChildItem $storagePath
                    Write-Host "       ✅ Folder ditemukan dengan $($files.Count) file" -ForegroundColor Green
                    foreach ($file in $files) {
                        Write-Host "          - $($file.Name) ($([Math]::Round($file.Length/1KB, 2)) KB)" -ForegroundColor Gray
                    }
                } else {
                    Write-Host "       ⚠️  Folder belum ditemukan (mungkin perlu restart server)" -ForegroundColor Yellow
                }
            }
        } else {
            Write-Host "   ⚠️  Tidak ada gambar yang dihasilkan" -ForegroundColor Yellow
        }
        
        Write-Host ""
        Write-Host "📝 CONTENT PREVIEW:" -ForegroundColor Cyan
        $bodyPreview = $response.content.body.Substring(0, [Math]::Min(500, $response.content.body.Length))
        Write-Host $bodyPreview -ForegroundColor White
        Write-Host "..."
        Write-Host ""
        
        # Check if images are injected into content
        $bodyText = $response.content.body
        $imageRefs = ([regex]::Matches($bodyText, '!\[.*?\]\(/uploads/.*?\)')).Count
        Write-Host "🔗 IMAGE INJECTION:" -ForegroundColor Cyan
        Write-Host "   Image references dalam content: $imageRefs" -ForegroundColor White
        if ($imageRefs -gt 0) {
            Write-Host "   ✅ Gambar berhasil di-inject ke markdown" -ForegroundColor Green
        } else {
            Write-Host "   ⚠️  Belum ada image reference di content" -ForegroundColor Yellow
        }
        
        Write-Host ""
        Write-Host "📊 SUMMARY:" -ForegroundColor Cyan
        Write-Host "   Artikel: ✅ Generated" -ForegroundColor Green
        Write-Host "   Gambar: $imageCount (target: 3-5)" -ForegroundColor $(if ($imageCount -ge 3) { "Green" } else { "Yellow" })
        Write-Host "   Storage: $(if ($firstImg.localPath) { "✅ Lokal" } else { "❌ Belum tersimpan" })" -ForegroundColor $(if ($firstImg.localPath) { "Green" } else { "Red" })
        Write-Host "   Injection: $(if ($imageRefs -gt 0) { "✅ Berhasil" } else { "❌ Belum" })" -ForegroundColor $(if ($imageRefs -gt 0) { "Green" } else { "Red" })
        Write-Host ""
        
        # Save response to file
        $timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
        $outputFile = "test-image-pipeline-result-$timestamp.json"
        $response | ConvertTo-Json -Depth 10 | Out-File -FilePath $outputFile -Encoding UTF8
        Write-Host "💾 Full response saved to: $outputFile" -ForegroundColor Gray
        Write-Host ""
        
    } else {
        Write-Host "❌ GENERATION FAILED!" -ForegroundColor Red
        Write-Host "   Status: $status" -ForegroundColor Red
        if ($response.error) {
            Write-Host "   Error: $($response.error)" -ForegroundColor Red
        }
        if ($response.message) {
            Write-Host "   Message: $($response.message)" -ForegroundColor Red
        }
    }
    
} catch {
    Write-Host "❌ ERROR: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response: $responseBody" -ForegroundColor Red
    }
    exit 1
}

Write-Host ""
Write-Host "✅ TEST COMPLETE" -ForegroundColor Green
