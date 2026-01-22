# FIX: Server Perlu Restart

## 🔴 MASALAH

Error saat generate sample:
```
invalid contentType: DERIVATIVE_LONG (must be CORNERSTONE, DERIVATIVE, or USE_CASE)
```

## ✅ PENYEBAB

Server yang sedang running masih menggunakan versi lama dari code. Code sudah di-update untuk support `DERIVATIVE_LONG`, tapi server perlu di-restart untuk load code baru.

## 🔧 SOLUSI

### Step 1: Stop Server

Di terminal tempat server running, tekan `Ctrl+C` untuk stop server.

### Step 2: Rebuild (Optional - sudah dilakukan)

```powershell
cd engine-hub
go build ./cmd/server
```

### Step 3: Restart Server

```powershell
cd engine-hub
$env:OPENAI_API_KEY="your-api-key-here"
go run cmd/server/main.go
```

**Tunggu sampai muncul:**
```
[BOOT] ENGINE HUB RUNNING ON :8090
```

### Step 4: Generate Sample Lagi

```powershell
cd engine-hub
.\controlled-production-k1.ps1
```

ATAU manual:

```powershell
$payload = @{
    category = "K1"
    contentType = "DERIVATIVE_LONG"
    language = "id-ID"
    count = 1
} | ConvertTo-Json -Depth 10

$response = Invoke-RestMethod -Uri "http://localhost:8090/api/engine/ai/controlled-production" -Method POST -ContentType "application/json" -Body $payload -TimeoutSec 600

$response | ConvertTo-Json -Depth 10
```

---

## ✅ VERIFIKASI CODE SUDAH BENAR

File `engine-hub/internal/ai/content/generator.go` line 126-133:

```go
validTypes := map[string]bool{
    "CORNERSTONE":    true,
    "DERIVATIVE":     true,
    "DERIVATIVE_LONG": true,  // ✅ SUDAH ADA
    "USE_CASE":       true,
}
```

Code sudah benar, hanya perlu restart server.
