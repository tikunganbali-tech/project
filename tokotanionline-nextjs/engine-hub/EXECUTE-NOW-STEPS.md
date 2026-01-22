# EXECUTE NOW - STEP BY STEP (WAJIB)

## ✅ STEP 1 COMPLETE: Server Stopped

Server sudah di-stop. Port 8090 kosong.

---

## ✅ STEP 2 COMPLETE: Build Success

Build sudah berhasil dengan prompt template baru.

---

## ⚠️ STEP 3: START SERVER (HARUS DI FOREGROUND)

**WAJIB:** Server HARUS dijalankan di terminal PowerShell TERPISAH (foreground, bukan background).

### Terminal 1 (Buka Terminal PowerShell Baru):

```powershell
cd "c:\Users\PC-Desktop\Music\AGRICULTURAL\tokotanionline-nextjs\engine-hub"

$env:OPENAI_API_KEY = "YOUR_OPENAI_API_KEY_HERE"
$env:IMAGE_API_KEY = $env:OPENAI_API_KEY

go run cmd/server/main.go
```

**⚠️ JANGAN TUTUP TERMINAL INI**

**WAJIB MUNCUL:**
```
[BOOT] ENGINE HUB RUNNING ON :8090
```

---

## 📞 STEP 4: CALL GENERATION (Terminal Baru)

**Buka Terminal PowerShell BARU** (jangan tutup server terminal):

```powershell
cd "c:\Users\PC-Desktop\Music\AGRICULTURAL\tokotanionline-nextjs\engine-hub"

$env:OPENAI_API_KEY = "YOUR_OPENAI_API_KEY_HERE"
$env:IMAGE_API_KEY = $env:OPENAI_API_KEY

$outlineFile = "..\docs\OUTLINE-K1-CORNERSTONE-PANDUAN-DASAR.md"
$outlineContent = Get-Content $outlineFile | Select-Object -Skip 27
$outlineText = $outlineContent -join "`n"

# Remove H4 headings
$outlineLines = $outlineText -split "`n"
$cleanOutline = @()
foreach ($line in $outlineLines) {
    if (-not $line.Trim().StartsWith("####")) {
        $cleanOutline += $line
    }
}
$cleanOutlineText = $cleanOutline -join "`n"

$payload = @{
    contentType = "DERIVATIVE_LONG"
    category = "K1"
    outline = $cleanOutlineText.Trim()
    language = "id-ID"
} | ConvertTo-Json -Depth 10

Invoke-RestMethod -Method POST -Uri "http://localhost:8090/api/engine/ai/generate" -Body $payload -ContentType "application/json; charset=utf-8" -TimeoutSec 600
```

---

## ✅ YANG HARUS TERJADI

**Di Terminal Server:**
- Logs muncul saat generation
- Tidak ada panic
- Status: DRAFT_AI

**Di Response:**
- Status: DRAFT_AI
- Images: 3-5
- Prompt pertama: "Realistic photograph..." (NEW PROMPT)

**Jika prompt masih "High-quality, professional illustration..." → Server belum restart dengan benar**
