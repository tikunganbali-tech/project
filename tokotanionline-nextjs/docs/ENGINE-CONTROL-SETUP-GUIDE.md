# ENGINE CONTROL CENTER - Setup Guide

**Tanggal:** 2026-01-11  
**Status:** Setup Instructions

---

## 📋 CATATAN 1, 2, 3 - PENYELESAIAN

### CATATAN 1: Prisma Generate

**Masalah:** File mungkin locked saat server running.

**Solusi:**

1. **Stop semua process yang menggunakan Prisma:**
   ```powershell
   # Stop Next.js dev server (Ctrl+C di terminal yang menjalankan npm run dev)
   # Stop semua Node processes jika perlu
   Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force
   ```

2. **Jalankan Prisma Generate:**
   ```powershell
   cd "c:\Users\PC-Desktop\Music\AGRICULTURAL\tokotanionline-nextjs"
   npx prisma generate
   ```

3. **Verifikasi:**
   ```powershell
   # Check jika Prisma client ter-generate
   Test-Path "node_modules\.prisma\client\index.js"
   ```

**Expected Output:**
```
Environment variables loaded from .env
Prisma schema loaded from prisma\schema.prisma
✔ Generated Prisma Client (version x.x.x) to .\node_modules\@prisma\client in xxxms
```

---

### CATATAN 2: Database Migration

**Migration file sudah dibuat:** `prisma/migrations/20260111_add_engine_state/migration.sql`

**Cara apply migration:**

#### OPSI A: Menggunakan Prisma Migrate (Recommended)

```powershell
cd "c:\Users\PC-Desktop\Music\AGRICULTURAL\tokotanionline-nextjs"

# Apply migration
npx prisma migrate deploy
```

**Note:** Jika `migrate deploy` tidak tersedia, gunakan OPSI B.

#### OPSI B: Manual SQL Execution

1. **Masuk ke PostgreSQL:**
   ```powershell
   psql -U postgres -d tokotanionline
   ```

2. **Jalankan migration SQL:**
   ```sql
   \i prisma\migrations\20260111_add_engine_state\migration.sql
   ```

   Atau copy-paste isi file `prisma/migrations/20260111_add_engine_state/migration.sql` ke psql.

3. **Verifikasi:**
   ```sql
   SELECT * FROM "EngineState";
   ```

#### OPSI C: Menggunakan Prisma DB Push (Development Only)

```powershell
npx prisma db push
```

**Warning:** `db push` tidak membuat migration history. Gunakan hanya untuk development.

---

### CATATAN 3: End-to-End Testing

**Script testing sudah dibuat:** `scripts/test-engine-control-e2e.ts`

#### Cara Menjalankan Testing:

1. **Pastikan database migration sudah di-apply** (Catatan 2)

2. **Jalankan test script:**
   ```powershell
   cd "c:\Users\PC-Desktop\Music\AGRICULTURAL\tokotanionline-nextjs"
   npx tsx scripts/test-engine-control-e2e.ts
   ```

3. **Expected Output:**
   ```
   ═══════════════════════════════════════════════════════
     ENGINE CONTROL CENTER - E2E TESTING
   ═══════════════════════════════════════════════════════

   ✅ EngineState table exists
   ✅ Can create default EngineState
   ✅ Can update AI Engine status
   ✅ Can update access mode
   ✅ API endpoint /api/admin/engine/state exists
   ✅ UI components exist

   ═══════════════════════════════════════════════════════
     TEST SUMMARY
   ═══════════════════════════════════════════════════════

   Total Tests: 6
   ✅ Passed: 6
   ❌ Failed: 0
   ```

#### Manual Testing Checklist:

**1. Engine Control Page**
- [ ] Buka `/admin/system/engine-control`
- [ ] Lihat status AI Engine, SEO Engine, Scheduler
- [ ] Toggle AI Engine ON → status berubah ke ON
- [ ] Toggle AI Engine OFF → status berubah ke OFF
- [ ] Update Access Matrix (check/uncheck Admin/Editor)

**2. Global Indicator (Topbar)**
- [ ] Lihat indicator di topbar (Role, Engine Access, Mode)
- [ ] Jika AI OFF, lihat warning dengan link ke Engine Control
- [ ] Klik link → redirect ke Engine Control

**3. State-Aware Buttons**
- [ ] Buka `/admin/products/new`
- [ ] Jika AI Engine OFF → Generate button **disabled**
- [ ] Hover button → tooltip muncul dengan alasan
- [ ] Toggle AI Engine ON di Engine Control
- [ ] Refresh halaman → Generate button **aktif**

**4. Feature Access Badge**
- [ ] Buka `/admin/products`
- [ ] Jika AI Engine OFF → badge warning muncul
- [ ] Badge menampilkan reason dan link ke Engine Control

**5. API Endpoints**
- [ ] Test GET `/api/admin/engine/state` (harus return engine state)
- [ ] Test POST `/api/admin/engine/toggle` (harus update state)
- [ ] Test POST `/api/admin/engine/access` (harus update access mode)

**6. Permission Guards**
- [ ] Login sebagai viewer → Engine Control tidak accessible
- [ ] Login sebagai admin → Engine Control accessible (view only)
- [ ] Login sebagai super_admin → Engine Control accessible (full control)

---

## 🚀 QUICK START

**Langkah-langkah lengkap:**

```powershell
# 1. Stop server jika running
# (Ctrl+C di terminal npm run dev)

# 2. Generate Prisma Client
cd "c:\Users\PC-Desktop\Music\AGRICULTURAL\tokotanionline-nextjs"
npx prisma generate

# 3. Apply Migration
npx prisma migrate deploy
# Atau manual: psql -U postgres -d tokotanionline -f prisma\migrations\20260111_add_engine_state\migration.sql

# 4. Run Tests
npx tsx scripts/test-engine-control-e2e.ts

# 5. Start Server
npm run dev

# 6. Test Manual
# - Buka http://localhost:3000/admin/system/engine-control
# - Test semua flow sesuai checklist di atas
```

---

## ✅ VERIFIKASI SETUP

Setelah semua langkah selesai, verifikasi dengan:

1. **Database:**
   ```sql
   SELECT * FROM "EngineState";
   ```
   Harus return 0 atau 1 row (default state).

2. **Prisma Client:**
   ```typescript
   import { prisma } from '@/lib/db';
   const state = await prisma.engineState.findFirst();
   ```
   Harus tidak error.

3. **UI:**
   - Buka `/admin/system/engine-control`
   - Harus tampil tanpa error
   - Toggle buttons harus berfungsi

---

## 🐛 TROUBLESHOOTING

### Error: "EPERM: operation not permitted"
**Solusi:** Stop semua Node processes dan coba lagi.

### Error: "Table EngineState already exists"
**Solusi:** Migration sudah di-apply. Skip migration step.

### Error: "Prisma Client not generated"
**Solusi:** 
```powershell
rm -r node_modules\.prisma
npx prisma generate
```

### Error: "Permission denied" di API
**Solusi:** Pastikan login sebagai admin/super_admin dan memiliki permission `engine.view` atau `engine.control`.

---

**Setup selesai! Engine Control Center siap digunakan.** ✅
