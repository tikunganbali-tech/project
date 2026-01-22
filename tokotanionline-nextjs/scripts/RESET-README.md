# 🔴 RESET TOTAL KE KONDISI "VIRGIN SOURCE"

## Tujuan
Menghapus **SEMUA DATA UJI / SIMULASI / SISA TEST**, tanpa merusak:
- ✅ Schema Prisma
- ✅ Migration files
- ✅ Engine logic
- ✅ Kontrak PHASE A

## ⚠️ ATURAN KERAS

❌ **JANGAN** hapus migration  
❌ **JANGAN** hapus schema Prisma  
❌ **JANGAN** ubah logic engine  
✅ **HANYA** hapus DATA & ARTEFAK TEST  

---

## 🚀 Cara Eksekusi

### Opsi 1: Skrip Master (Recommended)

```powershell
# Jalankan skrip master reset
.\scripts\RESET-TO-VIRGIN.ps1
```

### Opsi 2: Manual Step-by-Step

#### STEP 1: Stop Semua Service

Hentikan semua service yang berjalan:
- Next.js (port 3000)
- Engine Go (port 8090/8080)

```powershell
# Cek port aktif
Get-NetTCPConnection -LocalPort 3000
Get-NetTCPConnection -LocalPort 8090
Get-NetTCPConnection -LocalPort 8080
```

#### STEP 2: Reset Database

```powershell
# Masuk ke PostgreSQL
psql -U postgres

# Jalankan SQL reset
\i scripts\reset-database.sql

# Atau langsung:
psql -U postgres -f scripts\reset-database.sql
```

#### STEP 3: Hapus Build Artifacts

```powershell
.\scripts\reset-cleanup-build.ps1
```

#### STEP 4: Hapus Test Reports

```powershell
.\scripts\reset-cleanup-reports.ps1
```

#### STEP 5: Reset Browser Storage (Manual)

1. Buka DevTools (F12)
2. Application → Storage
3. Clear:
   - Local Storage
   - Session Storage
   - IndexedDB
4. Hard refresh (Ctrl + Shift + R)

#### STEP 6: Start Ulang Services

```powershell
# Terminal 1: Engine Go
cd engine-hub
go run cmd/server/main.go

# Terminal 2: Next.js
npm run dev
```

---

## ✅ Verifikasi Kondisi VIRGIN

Setelah reset, pastikan:

- ✅ Admin login → kosong (tidak ada data)
- ✅ Blog list → 0 data
- ✅ Product list → 0 data
- ✅ Media → kosong
- ✅ Tidak ada validation error sebelum test
- ✅ Tidak ada log AI lama

**Jika SATU SAJA masih ada → STOP (reset belum bersih)**

---

## 🧪 Testing Setelah Reset

**JANGAN LOMPAT** - Baru setelah kondisi VIRGIN tercapai:

1. Admin → Blog → New Post
2. Klik Generate Artikel (AI)
3. Uji PHASE B (BLOG)
4. Laporkan dengan format:

```
PHASE B (BLOG) — HASIL EKSEKUSI (DATA VIRGIN)

AI Generate: OK / FAIL
Secondary Keyword: TERISI / KOSONG
Validation Error: HILANG / MASIH ADA
Scheduler: BISA / TIDAK
Auto Publish: TIDAK / YA

Catatan:
(jika ada)
```

---

## 📋 File yang Dihapus

### Build Artifacts
- `.next/`
- `node_modules/.cache/`
- `engine-hub/tmp/`
- `engine-hub/logs/`
- `engine-hub/bin/`

### Test Reports
- Semua file `*-REPORT.md` di root
- Semua file `*-FIX.md` di root
- Test reports di `docs/`
- Test reports di `engine-hub/`
- Artikel test markdown (`article-*.md`)
- JSON test results (`*result*.json`)

### File yang TIDAK Dihapus
- ✅ `README.md`
- ✅ `docs/COMPREHENSIVE-FEATURES-DOCUMENTATION.md`
- ✅ Dokumentasi phase/fase/step (`PHASE-*.md`, `FASE-*.md`, `STEP-*.md`)
- ✅ `docs/env-reference.md`
- ✅ `docs/INSTRUKSI-RESTART-SERVER.md`

---

## 🗄️ Database Tables yang Dihapus

Semua tabel data dihapus, **KECUALI**:

- `Brand` (konfigurasi brand)
- `Locale` (konfigurasi bahasa)
- `Admin` (user admin)
- `SiteSettings` (pengaturan sistem)

Semua tabel lain di-TRUNCATE dengan `RESTART IDENTITY CASCADE`.

---

## 🔧 Troubleshooting

### Error: psql tidak ditemukan
```powershell
# Install PostgreSQL atau tambahkan ke PATH
# Atau gunakan full path:
"C:\Program Files\PostgreSQL\15\bin\psql.exe" -U postgres -f scripts\reset-database.sql
```

### Error: Port masih aktif
```powershell
# Force kill process di port
Get-NetTCPConnection -LocalPort 3000 | Select-Object -ExpandProperty OwningProcess | Stop-Process -Force
```

### Error: Permission denied
```powershell
# Jalankan PowerShell sebagai Administrator
# Atau set execution policy:
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

---

## 📝 Catatan

- Reset ini **AMAN** untuk schema dan migration
- Semua data akan **HILANG PERMANEN**
- Backup database sebelum reset jika perlu
- Pastikan semua service **STOP** sebelum reset

---

**🎯 Ready for Virgin Testing!**
