# 🔴 RESET TO VIRGIN SOURCE - PANDUAN EKSEKUSI

## ⚠️ PERINGATAN

Script ini akan **MENGHAPUS SEMUA DATA** dari database, build artifacts, dan test reports.

**AMAN:**
- ✅ Schema database tetap utuh
- ✅ Migration files tidak dihapus
- ✅ Engine logic tidak diubah
- ✅ Kontrak PHASE A tetap utuh

**AKAN DIHAPUS:**
- ❌ Semua data di database (Blog, Product, dll)
- ❌ Build artifacts (.next, cache)
- ❌ Test reports & documentation
- ❌ Engine storage files

---

## 📋 LANGKAH EKSEKUSI

### OPSI 1: Script Otomatis (Recommended)

```powershell
# Dari root project
cd scripts
.\RESET-TO-VIRGIN.ps1
```

Script akan:
1. ✅ Stop semua service (Next.js, Go Engine)
2. ✅ Reset database (TRUNCATE semua tabel)
3. ✅ Hapus build artifacts
4. ✅ Hapus test reports
5. ✅ Hapus engine storage files

**Konfirmasi:** Ketik `YES` saat diminta.

---

### OPSI 2: Manual Step-by-Step

#### STEP 1: Stop Services

```powershell
# Stop Next.js (port 3000)
# Tekan Ctrl+C di terminal yang menjalankan npm run dev

# Stop Go Engine (port 8090/8080)
# Tekan Ctrl+C di terminal yang menjalankan go run cmd/server/main.go

# Verifikasi port kosong
netstat -ano | findstr ":3000"
netstat -ano | findstr ":8090"
```

#### STEP 2: Reset Database

**A. Masuk ke PostgreSQL:**

```powershell
psql -U postgres -d tokotanionline
```

**B. Jalankan SQL Script:**

```sql
\i scripts/reset-to-virgin.sql
```

Atau copy-paste isi `scripts/reset-to-virgin.sql` ke psql.

**C. Verifikasi:**

```sql
SELECT COUNT(*) FROM "Blog";        -- Harus 0
SELECT COUNT(*) FROM "Product";     -- Harus 0
SELECT COUNT(*) FROM "AIContentGenerationLog"; -- Harus 0
```

#### STEP 3: Hapus Build Artifacts

```powershell
# Dari root project
Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force node_modules\.cache -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force engine\tmp -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force engine\logs -ErrorAction SilentlyContinue
Remove-Item -Force engine\storage\*.json -ErrorAction SilentlyContinue
Remove-Item -Force engine-hub\storage\*.json -ErrorAction SilentlyContinue
```

#### STEP 4: Hapus Test Reports

```powershell
# Hapus semua report files (kecuali README.md)
Get-ChildItem -Filter "*-REPORT*.md" | Remove-Item -Force
Get-ChildItem -Filter "*-TEST*.md" | Remove-Item -Force
Get-ChildItem -Filter "FASE-*.md" | Remove-Item -Force
Get-ChildItem -Filter "PHASE-*.md" | Remove-Item -Force
# ... (script otomatis akan handle semua pattern)
```

**File yang DI PERTAHANKAN:**
- `README.md`
- `docs\COMPREHENSIVE-FEATURES-DOCUMENTATION.md`
- `docs\PHASE-H-PRE-LAUNCH-CHECKLIST.md`
- `engine\README.md`
- `engine-hub\README.md`
- `deploy\README.md`

#### STEP 5: Clear Browser Storage

1. Buka browser DevTools (F12)
2. Application → Storage
3. Clear:
   - Local Storage
   - Session Storage
   - IndexedDB
4. Hard refresh (Ctrl + Shift + R)

---

## ✅ VERIFIKASI SETELAH RESET

### 1. Database Kosong

```sql
-- Harus return 0 untuk semua
SELECT COUNT(*) FROM "Blog";
SELECT COUNT(*) FROM "Product";
SELECT COUNT(*) FROM "BlogPost";
SELECT COUNT(*) FROM "AIContentGenerationLog";
SELECT COUNT(*) FROM "SchedulerExecutionLog";
```

### 2. Build Artifacts Hilang

```powershell
# Harus return: False
Test-Path .next
Test-Path node_modules\.cache
```

### 3. Test Reports Hilang

```powershell
# Harus return: 0 atau sangat sedikit
(Get-ChildItem -Filter "*-REPORT*.md").Count
(Get-ChildItem -Filter "FASE-*.md").Count
```

### 4. README Masih Ada

```powershell
# Harus return: True
Test-Path README.md
Test-Path docs\COMPREHENSIVE-FEATURES-DOCUMENTATION.md
```

---

## 🚀 SETELAH RESET - START ULANG

### 1. Start Go Engine

```powershell
cd engine-hub
$env:OPENAI_API_KEY="sk-..."
go run cmd/server/main.go
```

**Expected:** `[BOOT] ENGINE HUB RUNNING ON :8090`

### 2. Start Next.js

```powershell
cd tokotanionline-nextjs
npm run dev
```

**Expected:** `Ready on http://localhost:3000`

### 3. Verifikasi UI Kosong

1. Login admin: `http://localhost:3000/admin/login`
2. Blog list → Harus kosong (0 data)
3. Product list → Harus kosong (0 data)
4. Media library → Kosong
5. Tidak ada validation error

---

## 🧪 TEST PHASE B (BLOG) - SETELAH RESET

Setelah kondisi VIRGIN tercapai:

1. **Admin → Blog → New Post**
2. **Klik "Generate Artikel (AI)"**
3. **Isi form:**
   - Primary keyword
   - Secondary keywords (opsional)
   - Category
4. **Klik Generate**
5. **Verifikasi hasil**

### Format Laporan Hasil:

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

## 🆘 TROUBLESHOOTING

### Error: "psql: command not found"

**Solution:**
1. Install PostgreSQL atau tambahkan ke PATH
2. Atau gunakan Prisma Studio:
   ```powershell
   npx prisma studio
   ```
   Lalu jalankan SQL manual via Prisma Studio.

### Error: "Port 3000/8090 masih aktif"

**Solution:**
```powershell
# Find process
netstat -ano | findstr ":3000"
# Kill process (ganti <PID> dengan actual PID)
taskkill /PID <PID> /F
```

### Error: "DATABASE_URL tidak ditemukan"

**Solution:**
1. Buat file `.env.local` di root
2. Tambahkan:
   ```env
   DATABASE_URL="postgresql://user:pass@localhost:5432/tokotanionline"
   ```
3. Atau set manual saat script berjalan

### Database masih ada data setelah reset

**Solution:**
1. Cek apakah TRUNCATE berhasil (lihat output psql)
2. Cek foreign key constraints (mungkin ada tabel yang terlewat)
3. Jalankan manual:
   ```sql
   TRUNCATE TABLE "Blog" RESTART IDENTITY CASCADE;
   TRUNCATE TABLE "Product" RESTART IDENTITY CASCADE;
   -- ... (sesuaikan tabel yang masih ada data)
   ```

---

## 📝 CATATAN PENTING

1. **Backup Database** (opsional, jika perlu):
   ```powershell
   pg_dump -U postgres tokotanionline > backup-$(Get-Date -Format "yyyyMMdd-HHmmss").sql
   ```

2. **Schema tetap utuh** - Tidak perlu run migration lagi setelah reset.

3. **Admin account** - Jika ingin reset admin juga, uncomment di SQL:
   ```sql
   TRUNCATE TABLE "Admin" RESTART IDENTITY CASCADE;
   ```
   Tapi ini akan menghapus semua admin, termasuk yang untuk login.

4. **Brand & Locale** - Dipertahankan karena ini konfigurasi, bukan data test.

---

**✨ Setelah reset, sistem siap untuk testing murni tanpa data "hantu"!**
