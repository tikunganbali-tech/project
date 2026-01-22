# CRITICAL INSTRUCTIONS - MUST FOLLOW

## 🔴 MASALAH SAAT INI

**Error 500 dengan empty response body** - Server crash sebelum bisa write response.

**Kemungkinan:**
- Panic terjadi sebelum panic recovery bisa capture
- Response writer sudah closed atau corrupted
- Error di OpenAI API call yang tidak ter-handle

## ✅ FIX YANG SUDAH DILAKUKAN

1. ✅ Content Engine DEV MODE (tidak perlu database)
2. ✅ Global panic recovery di main()
3. ✅ Handler panic recovery
4. ✅ Boot logging lengkap
5. ✅ Debug logging di semua titik kritis
6. ✅ Error handling untuk JSON decode
7. ✅ Error handling untuk empty API response

## 🔴 LANGKAH WAJIB

### STEP 1: Kill Semua Server

```powershell
taskkill /IM go.exe /F
netstat -ano | findstr :8080
# Pastikan kosong
```

### STEP 2: Jalankan Server di FOREGROUND (WAJIB!)

**JANGAN gunakan background process!**

**Buka terminal PowerShell baru:**

```powershell
cd c:\Users\PC-Desktop\Music\AGRICULTURAL\tokotanionline-nextjs\engine-hub
$env:OPENAI_API_KEY="YOUR_OPENAI_API_KEY_HERE"
go run cmd/server/main.go
```

**TINGGALKAN TERMINAL INI TERBUKA** - Logs akan muncul di sini.

### STEP 3: Test (Terminal Baru)

**Buka terminal PowerShell BARU:**

```powershell
cd c:\Users\PC-Desktop\Music\AGRICULTURAL\tokotanionline-nextjs\engine-hub
.\test-manual.ps1
```

**PERHATIKAN TERMINAL SERVER** - harus muncul logs.

## 📋 LOGS YANG HARUS MUNCUL

### Startup Logs:
```
[BOOT] Server starting...
[BOOT] Loading .env file...
[BOOT] Loaded .env file for development
[BOOT] Registering Tracking Engine...
[BOOT] Tracking Engine started
[BOOT] Initializing Content Engine...
[CONTENT-ENGINE] WARNING: Failed to initialize database: DATABASE_URL environment variable is not set
[CONTENT-ENGINE] Running in DEV MODE (memory-only, no job queue)
[CONTENT-ENGINE] AI pipeline endpoint will work without database
[CONTENT-ENGINE] Content Engine started (DEV MODE - no database)
[BOOT] Content engine started successfully
[BOOT] Registering HTTP handlers...
[BOOT] Registering AI Generate endpoint...
[BOOT] ENGINE HUB RUNNING ON :8080
```

### Request Logs (saat test):
```
[AI] Generate endpoint hit
[AI GENERATE] Received request: contentType=DERIVATIVE, category=K1, language=id-ID, outlineLength=3322
[AI GENERATE] Creating pipeline...
[PIPELINE] Creating new pipeline...
[GENERATOR] Creating new content generator...
[GENERATOR] API key loaded: present=true, length=70
[AI GENERATE] Executing pipeline...
[AI PIPELINE] Starting content generation workflow
[AI PIPELINE] STEP 1: Generating raw AI content...
[AI] Starting content generation...
[AI] Building prompt...
[AI] Prompt built, length: XXXX chars
[AI] Calling OpenAI API...
```

**Jika berhasil:**
```
[AI] OpenAI API response status: 200
[AI] Successfully extracted content, length: XXXX chars
[AI GENERATE] Pipeline completed successfully
```

**Jika error:**
```
[FATAL PANIC] <error message>
ATAU
[AI GENERATE] PANIC RECOVERED: <error message>
ATAU
[AI GENERATE] Pipeline failed: <error message>
```

## 📤 YANG HARUS DIKIRIM KE SAYA

**COPY-PASTE LOG TERMINAL SERVER:**

Dari:
```
[BOOT] Server starting...
```

Sampai:
- Success: `[AI GENERATE] Pipeline completed successfully`
- Error: `[AI GENERATE] Pipeline failed: ...`
- Panic: `[FATAL PANIC] ...` atau `[AI GENERATE] PANIC RECOVERED: ...`

**TANPA LOGS INI → TIDAK BISA LANJUT**  
**DENGAN LOGS INI → BUG BISA KITA KUNCI 100%**

---

**Server sudah siap. Jalankan di FOREGROUND dan kirim logs!**
