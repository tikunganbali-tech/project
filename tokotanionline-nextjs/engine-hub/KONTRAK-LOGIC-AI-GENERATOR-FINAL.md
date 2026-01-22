# 🔒 KONTRAK LOGIC AI GENERATOR — FINAL (DETERMINISTIK)

**Status:** ✅ **DITETAPKAN & MENGIKAT**  
**Tanggal:** 2026-01-12  
**Versi:** FINAL v1.0

---

## 📋 PENDAHULUAN

Dokumen ini mengikat cara sistem berpikir dan bekerja.  
Setelah ini disetujui, baru boleh turun ke implementasi backend Golang.

**PRINSIP DASAR:** AI adalah RAW TEXT GENERATOR, bukan pengambil keputusan.

---

## 1️⃣ POSISI AI DALAM SISTEM (FINAL)

### AI BUKAN:
- ❌ Pengambil keputusan
- ❌ Validator
- ❌ Penentu publish
- ❌ Penentu kualitas

### AI HANYA:
- ✅ RAW TEXT GENERATOR
- ✅ Bekerja di bawah paksaan sistem

**Keputusan SELALU milik ENGINE (Golang), bukan AI.**

---

## 2️⃣ STATE MACHINE AI GENERATOR (WAJIB)

AI Generator BUKAN fungsi, tapi **STATE MACHINE**.

### 🔁 State Diagram (Konseptual)

```
INIT
 ↓
GENERATE_RAW
 ↓
NORMALIZE
 ↓
VALIDATE
 ↓
 ├─ PASS → STORE (DRAFT)
 └─ FAIL → CLASSIFY_FAILURE
             ↓
        ├─ RETRY_ALLOWED → RETRY (LIMITED)
        └─ NO_RETRY → QUARANTINE
```

**Aturan:**
- Tidak ada state lain
- Tidak ada shortcut
- Setiap transisi harus eksplisit

### State Definitions

| State | Status Code | Deskripsi |
|-------|-------------|-----------|
| `INIT` | - | Initial state, sebelum generate |
| `GENERATE_RAW` | `RAW_AI` | AI menghasilkan konten mentah |
| `NORMALIZE` | `NORMALIZED` | Normalizer memaksa compliance |
| `VALIDATE` | `VALIDATED` | Validator cek struktur & kualitas |
| `STORE` | `DRAFT_READY` | Konten siap, disimpan sebagai draft |
| `QUARANTINE` | `REJECTED` | Konten gagal, tidak boleh retry |
| `RETRY` | `RETRY_*` | Retry dengan input sama |

---

## 3️⃣ INPUT CONTRACT (ENGINE ← ADMIN)

Semua input HARUS eksplisit. **Tidak boleh inferensi.**

### Request Schema

```json
{
  "content_type": "blog | product | static",
  "primary_keyword": "string",
  "secondary_keywords": ["string"],
  "intent": "informational | commercial",
  "language": "id",
  "tone": "neutral | edukatif",
  "target_length": 900,
  "internal_links": ["url"],
  "image_required": true
}
```

### Validation Rules

- ✅ Jika ada field hilang → **ENGINE REJECT**
- ✅ Bukan AI yang menebak
- ✅ Semua field wajib (kecuali `internal_links` jika kosong)

### Field Requirements

| Field | Required | Type | Notes |
|-------|----------|------|-------|
| `content_type` | ✅ | enum | blog, product, static |
| `primary_keyword` | ✅ | string | Min 2 chars |
| `secondary_keywords` | ❌ | array | Optional |
| `intent` | ✅ | enum | informational, commercial |
| `language` | ✅ | string | Default: "id" |
| `tone` | ✅ | enum | neutral, edukatif |
| `target_length` | ✅ | number | Min 500, max 5000 |
| `internal_links` | ❌ | array | Optional URLs |
| `image_required` | ✅ | boolean | true/false |

---

## 4️⃣ OUTPUT CONTRACT (AI → ENGINE)

AI WAJIB mengeluarkan struktur ini:

### Response Schema

```json
{
  "title": "string",
  "outline": ["H1", "H2", "H3"],
  "content": "markdown",
  "meta_description": "string",
  "faq": ["Q/A"]
}
```

### Validation Rules (FAIL HARD)

Jika:
- ❌ `outline` kosong → **FAIL**
- ❌ `content` tanpa heading → **FAIL**
- ❌ `meta_description` > 160 char → **FAIL**
- ❌ `title` kosong → **FAIL**

**Tidak ada toleransi.**

### Field Requirements

| Field | Required | Type | Constraints |
|-------|----------|------|-------------|
| `title` | ✅ | string | Min 10 chars, max 100 chars |
| `outline` | ✅ | array | Min 2 items (H2), max 20 items |
| `content` | ✅ | string | Markdown, min 1 H2 heading |
| `meta_description` | ✅ | string | Max 160 chars |
| `faq` | ❌ | array | Optional Q/A pairs |

---

## 5️⃣ NORMALIZER (DETERMINISTIK, BUKAN AI)

Normalizer **HARDCODED** di Golang.

### Rule Wajib

1. **Tanda Seru:**
   - Maks 1 tanda seru per 500 kata
   - Jika lebih → ganti dengan titik

2. **Kata Absolut (LARANGAN):**
   - "pasti" → "umumnya"
   - "terbaik" → "sering dipilih"
   - "nomor satu" → "sering digunakan"
   - "100%" → "biasanya"
   - "selalu" → "biasanya"
   - "tidak pernah" → "jarang"

3. **Hilangkan:**
   - Hype marketing
   - Klaim medis / finansial
   - "menurut AI"
   - Placeholder: `[placeholder]`, `TODO`, `FIXME`

4. **Tone:**
   - Naratif
   - Manusia biasa
   - Tidak menggurui

**Normalizer tidak boleh cerdas. Hanya rule-based.**

---

## 6️⃣ VALIDATOR (KUNCI KEAMANAN)

Validator adalah **hakim**, bukan penasihat.

### Validator WAJIB Cek

1. ✅ Struktur heading utuh
   - Minimal 2 H2 headings
   - H2/H3 hierarchy valid (tidak jump)

2. ✅ Keyword density wajar
   - Primary keyword: 1-3% density
   - Tidak keyword stuffing

3. ✅ Tidak ada pengulangan frasa berlebihan
   - Max 3x pengulangan frasa identik per 500 kata

4. ✅ Bahasa alami (heuristic, bukan ML)
   - Tidak ada placeholder
   - Tidak ada AI references
   - Tidak ada CTA jualan

5. ✅ Internal link valid
   - Semua URL dalam `internal_links` harus valid
   - Link harus muncul di content

6. ✅ Panjang konten sesuai target ±10%
   - Target: `target_length`
   - Toleransi: ±10%
   - Minimum: 720 words (hard limit)

**Jika gagal satu saja → FAIL.**

---

## 7️⃣ FAILURE CLASSIFICATION (KRITIKAL)

Setiap kegagalan WAJIB diklasifikasikan:

### Error Classification

| Kode Error | Arti | Retry | Notes |
|------------|------|-------|-------|
| `AI_ERROR` | Model gagal jawab | ✅ | API timeout, rate limit |
| `STRUCTURE_ERROR` | Format rusak | ❌ | JSON invalid, missing fields |
| `QUALITY_ERROR` | Konten buruk | ❌ | Validation failed |
| `INFRA_ERROR` | API / timeout | ✅ | Network, service down |

### Retry Rules

- ➡️ Retry maksimal **2x**
- ➡️ Retry tidak boleh mengubah input
- ➡️ Retry hanya untuk `AI_ERROR` dan `INFRA_ERROR`
- ➡️ `STRUCTURE_ERROR` dan `QUALITY_ERROR` → **NO RETRY**

### Retry Flow

```
FAIL → CLASSIFY_FAILURE
         ↓
    RETRY_ALLOWED? → YES → RETRY (max 2x)
         ↓
         NO → QUARANTINE
```

---

## 8️⃣ STORAGE & STATUS

Konten **TIDAK PERNAH** auto-publish.

### Status yang Sah

| Status | Code | Deskripsi |
|--------|------|-----------|
| `RAW` | `RAW_AI` | Konten mentah dari AI |
| `NORMALIZED` | `NORMALIZED` | Sudah dinormalisasi |
| `VALIDATED` | `VALIDATED` | Lulus validasi |
| `REJECTED` | `REJECTED` | Gagal validasi, tidak retry |
| `DRAFT_READY` | `DRAFT_READY` | Siap untuk review admin |

### Publish Rules

- ❌ Tidak dari AI
- ❌ Tidak dari engine
- ✅ **Hanya dari ADMIN (manual)**

---

## 9️⃣ IMAGE PIPELINE (SESUAI NIAT ASLI)

Image diproses **SETELAH** konten VALID.

### Image Generation Flow

```
CONTENT VALIDATED
 ↓
EXTRACT CONTEXT
 ↓
GENERATE IMAGE
 ↓
DOWNLOAD
 ↓
LOCAL SAVE
 ↓
METADATA
 ↓
RELATE TO CONTENT
```

### Prompt Template

```
RAW
imperfect
natural lighting
```

### Output

- ✅ Disimpan lokal
- ✅ Diberi hash
- ✅ Dicatat metadata

### Failure Handling

Jika image gagal:
- ✅ Konten tetap `DRAFT_READY`
- ✅ Image bisa diulang manual
- ✅ Tidak mempengaruhi status konten

---

## 🔟 LARANGAN SISTEM (FINAL)

### ❌ DILARANG

1. ❌ Tidak ada cron publish
2. ❌ Tidak ada auto scheduler tanpa approval
3. ❌ Tidak ada fallback diam-diam
4. ❌ Tidak ada "biar jalan dulu"
5. ❌ Tidak ada logic di frontend
6. ❌ Tidak ada inferensi input
7. ❌ Tidak ada shortcut state
8. ❌ Tidak ada auto-retry tanpa limit

---

## 📌 APA ARTINYA DOKUMEN INI

Jika kontrak ini diikuti:

- ✅ Bug UI akan berkurang drastis
- ✅ Sistem tahan jangka panjang
- ✅ AI tidak berbahaya
- ✅ Anda tidak tergantung pada model
- ✅ Website aman hidup bertahun-tahun

**Ini inti kesempurnaan proyek, bukan tampilan.**

---

## 🛑 STATUS IMPLEMENTASI

- ✅ Langkah berikutnya DIMANTAPKAN
- ✅ Kontrak logic DITETAPKAN
- ✅ Tidak menyimpang dari rencana awal

---

## 📝 REVISI HISTORY

| Versi | Tanggal | Perubahan |
|-------|---------|-----------|
| FINAL v1.0 | 2026-01-12 | Kontrak final ditetapkan |

---

**DOKUMEN INI MENGIKAT. TIDAK BOLEH DILANGGAR.**
