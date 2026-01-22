# BLACKLIST ROLLBACK — CTO DECISION

**Tanggal:** 2026-01-12  
**Status:** 🔒 **DIKUNCI — WAJIB DIIKUTI**

---

## ⚠️ BLACKLIST SAAT INI TIDAK VALID SECARA BISNIS

### Keywords yang Di-Blacklist (TIDAK VALID):

1. cara memilih pupuk organik terbaik
2. pengendalian hama tanaman padi
3. teknik budidaya cabe rawit
4. pemupukan tanaman jagung
5. cara mengatasi penyakit tanaman tomat

---

## ❌ ALASAN BLACKLIST TIDAK VALID

**FAILED_REASON:** `INFRA_MISSING_API_KEY`

**Penjelasan:**
- ❌ Bukan kegagalan sistem konten
- ❌ Bukan kegagalan prompt
- ❌ Bukan kegagalan outline
- ❌ Bukan kegagalan image pipeline
- ❌ Bukan kegagalan retry logic
- ✅ **100% kegagalan disebabkan oleh:** `OPENAI_API_KEY TIDAK TERSEDIA SAAT RUNTIME`

**Akibat:**
- AI tidak pernah dipanggil
- Tidak ada output konten
- Tidak ada validasi kualitas
- **Ini gagal infra, bukan gagal produksi**

---

## 🔧 KEPUTUSAN CTO (FINAL & WAJIB DIIKUTI)

### 1️⃣ BLACKLIST HARUS DI-ROLLBACK

**Perintah tegas:**
- ✅ Keluarkan semua 5 keyword dari blacklist
- ✅ Tandai statusnya sebagai: `FAILED_REASON = INFRA_MISSING_API_KEY`
- ✅ Keyword boleh diproduksi ulang

**⚠️ Jika blacklist tidak di-rollback:**
- Anda akan kehilangan keyword emas
- Ini merusak logika SEO jangka panjang

### 2️⃣ TINDAKAN YANG SUDAH DILAKUKAN

1. ✅ Dokumentasi rollback dibuat (file ini)
2. ✅ API key di-set permanen via .env file
3. ✅ Server akan di-restart dengan .env yang benar
4. ✅ Batch production akan dijalankan ulang dengan keyword yang sama

---

## 📋 STATUS KEYWORD SETELAH ROLLBACK

Semua 5 keyword di atas:
- ✅ **Status:** `READY_FOR_RETRY`
- ✅ **Failed Reason:** `INFRA_MISSING_API_KEY` (bukan konten gagal)
- ✅ **Boleh diproduksi ulang:** YA
- ✅ **Prioritas:** TINGGI (keyword emas untuk SEO)

---

**Dokumen ini adalah referensi resmi untuk rollback blacklist.**
