# PHASE 4 — TEST DRIVE INSTRUCTIONS

## 🎯 TUJUAN
Menilai rasa tulisan (human-feel), bukan sekadar lolos mesin.

---

## 📋 LANGKAH EKSEKUSI

### 1. Pastikan Environment Variables

```powershell
# Set API key (ganti dengan API key Anda)
$env:OPENAI_API_KEY = "sk-..."  # atau
$env:AI_API_KEY = "sk-..."

# Optional: Set image size
$env:IMAGE_SIZE = "1024x1024"
```

### 2. Start Go Engine Server

```powershell
cd engine-hub
go run cmd/server/main.go
```

Server akan running di `http://localhost:8080`

**Tinggalkan terminal ini terbuka** (server harus tetap running)

### 3. Trigger Generate (Terminal Baru)

Buka terminal baru (jangan tutup server), lalu jalankan:

**PowerShell:**
```powershell
cd engine-hub
.\test-drive-derivative.ps1
```

**Atau manual dengan curl (jika tersedia):**
```bash
# Extract outline terlebih dahulu dari docs/OUTLINE-K1-TURUNAN-3-KESALAHAN-UMUM.md
# Lalu gunakan payload di bawah
```

### 4. Manual API Call (Alternative)

Jika script tidak berjalan, gunakan manual call:

**PowerShell:**
```powershell
$outline = Get-Content "..\docs\OUTLINE-K1-TURUNAN-3-KESALAHAN-UMUM.md" -Raw
$outlineSection = ($outline -split "`n")[27..231] -join "`n"

$payload = @{
    contentType = "DERIVATIVE"
    category = "K1"
    outline = $outlineSection
    language = "id-ID"
} | ConvertTo-Json -Depth 10

$response = Invoke-RestMethod -Uri "http://localhost:8080/api/engine/ai/generate" `
    -Method POST `
    -ContentType "application/json" `
    -Body $payload

# Save response
$response | ConvertTo-Json -Depth 10 | Out-File -FilePath "test-drive-result.json" -Encoding UTF8

# Preview
Write-Host "Status: $($response.status)"
Write-Host "Title: $($response.content.title)"
Write-Host "Meta Title: $($response.content.metaTitle)"
Write-Host "Meta Desc: $($response.content.metaDesc)"
Write-Host "`nBody Preview:`n$($response.content.body.Substring(0, [Math]::Min(500, $response.content.body.Length)))"
```

---

## 🧠 KRITERIA LULUS TEST DRIVE

Setelah generate, **BACA HASIL SEPERTI EDITOR MEDIA BESAR**:

### ✅ LULUS jika:
1. ✅ Terasa seperti artikel manusia (bukan template AI)
2. ✅ Mengalir natural, tidak kaku
3. ✅ Tidak tercium pola AI yang jelas
4. ✅ Nyaman dibaca 5-7 menit
5. ✅ Struktur sesuai outline
6. ✅ Nada informatif, non-promosi

### ❌ GAGAL jika:
1. ❌ Terasa seperti template AI
2. ❌ Terlalu rapi & kaku
3. ❌ Pola AI terlihat jelas (contoh: "Dalam artikel ini...", "Mari kita mulai...")
4. ❌ Membosankan atau tidak natural
5. ❌ Ada CTA atau nada promosi

---

## 📤 FORMAT LAPORAN BALIK

Setelah test drive, kirim:

```
PHASE 4 — TEST DRIVE
HASIL: LULUS / GAGAL
CATATAN:
- [jika lulus] Artikel terasa natural, mengalir dengan baik
- [jika gagal] Bagian yang terasa mesin:
  * [contoh] Paragraf pembuka terlalu template
  * [contoh] Transisi antar section kaku
  * [contoh] Kesimpulan terlalu generik
```

---

## 🔍 OUTLINE YANG DIGUNAKAN

Outline: `docs/OUTLINE-K1-TURUNAN-3-KESALAHAN-UMUM.md`

**Judul Kerja:** "Kesalahan Umum dalam Penggunaan Sarana Produksi Pertanian dan Dampaknya"

**Struktur:**
- H1: Judul utama
- H2: Mengapa Kesalahan Terjadi?
- H2: Kesalahan Strategis
- H2: Kesalahan Ekspektasi
- H2: Kesalahan Urutan & Integrasi
- H2: Dampak Jangka Pendek vs Jangka Panjang
- H2: Penutup

---

## ⚠️ TROUBLESHOOTING

### Server tidak running
```powershell
# Check if port 8080 is in use
netstat -an | findstr :8080

# Kill existing process if needed
# (Find PID from netstat, then)
# taskkill /F /PID <PID>
```

### API Key Error
```
Error: AI_API_KEY or OPENAI_API_KEY environment variable not set
```
**Solution:** Set environment variable sebelum start server

### Validation Failed
```
Status: FAILED_VALIDATION
```
**Ini NORMAL jika validation engine bekerja dengan benar!** 
Periksa error message untuk detail apa yang gagal validasi.

### Timeout
```
API request failed: context deadline exceeded
```
**Solution:** Increase timeout di `generator.go` atau check API key validity

---

## 📝 NOTES

- Test drive ini **WAJIB** dilakukan sebelum production
- Jika hasil GAGAL, perbaiki prompt internal (bukan frontend)
- Fokus pada **human-feel**, bukan technical correctness
