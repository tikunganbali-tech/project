# 🔴 FIX: Reset Database yang Lebih Agresif

## Masalah
Setelah reset, masih ada produk, post, image library, dan data lainnya.

## Solusi

### Opsi 1: Reset Agresif (Recommended)

```powershell
# Jalankan reset dengan mode AGGRESSIVE (menggunakan DELETE)
.\scripts\reset-database-direct.ps1 -UseAggressive
```

Mode aggressive menggunakan `DELETE` instead of `TRUNCATE` untuk memastikan semua data benar-benar terhapus, termasuk yang memiliki circular dependencies.

### Opsi 2: Reset Manual via psql

```powershell
# Masuk ke PostgreSQL
psql -U postgres -d tokotanionline

# Jalankan SQL aggressive
\i scripts\reset-database-aggressive.sql

# Atau langsung:
psql -U postgres -d tokotanionline -f scripts\reset-database-aggressive.sql
```

### Opsi 3: Reset via Master Script

```powershell
# Jalankan master script (akan menggunakan reset direct)
.\scripts\RESET-TO-VIRGIN.ps1
```

---

## Verifikasi Setelah Reset

### 1. Verifikasi dengan Script

```powershell
.\scripts\verify-reset.ps1
```

Script ini akan menampilkan semua tabel yang masih memiliki data.

### 2. Verifikasi Manual via psql

```sql
-- Cek semua tabel yang masih ada data
SELECT 
  schemaname,
  tablename,
  n_live_tup as row_count
FROM pg_stat_user_tables
WHERE schemaname = 'public'
  AND tablename NOT IN ('Brand', 'Locale', 'Admin', 'SiteSettings', '_prisma_migrations')
ORDER BY row_count DESC, tablename;

-- Semua row_count harus = 0
```

### 3. Verifikasi via UI

Setelah reset, pastikan:
- ✅ Admin → Products → **0 produk**
- ✅ Admin → Blog → **0 artikel**
- ✅ Admin → Media Library → **kosong** (atau hanya file sistem)
- ✅ Tidak ada data di dashboard

---

## Troubleshooting

### Masih Ada Data Setelah Reset?

1. **Cek apakah ada constraint yang mencegah DELETE:**
   ```sql
   -- Cek foreign key constraints
   SELECT
     tc.table_name, 
     kcu.column_name, 
     ccu.table_name AS foreign_table_name,
     ccu.column_name AS foreign_column_name 
   FROM information_schema.table_constraints AS tc 
   JOIN information_schema.key_column_usage AS kcu
     ON tc.constraint_name = kcu.constraint_name
   JOIN information_schema.constraint_column_usage AS ccu
     ON ccu.constraint_name = tc.constraint_name
   WHERE tc.constraint_type = 'FOREIGN KEY' 
     AND tc.table_schema = 'public';
   ```

2. **Cek apakah ada trigger yang mencegah DELETE:**
   ```sql
   SELECT * FROM information_schema.triggers 
   WHERE trigger_schema = 'public';
   ```

3. **Force delete dengan CASCADE:**
   ```sql
   -- Hapus semua data dengan CASCADE (sangat agresif)
   SET session_replication_role = 'replica';
   DELETE FROM "Product" CASCADE;
   DELETE FROM "Blog" CASCADE;
   DELETE FROM "BlogPost" CASCADE;
   -- ... (lanjutkan untuk semua tabel)
   SET session_replication_role = 'origin';
   ```

### Error: "relation does not exist"

Pastikan nama tabel menggunakan **huruf besar** dengan tanda kutip:
```sql
DELETE FROM "Product";  -- ✅ BENAR
DELETE FROM product;    -- ❌ SALAH (jika menggunakan Prisma)
```

### Error: "permission denied"

Jalankan sebagai user `postgres` atau user dengan superuser privileges:
```powershell
psql -U postgres -d tokotanionline -f scripts\reset-database-aggressive.sql
```

---

## File yang Tersedia

1. **`reset-database.sql`** - Reset standard (TRUNCATE)
2. **`reset-database-aggressive.sql`** - Reset aggressive (DELETE) ⭐ **RECOMMENDED**
3. **`reset-database-direct.ps1`** - PowerShell wrapper untuk eksekusi
4. **`verify-reset.ps1`** - Script verifikasi

---

## Checklist Setelah Reset

- [ ] Jalankan `verify-reset.ps1` → semua tabel kosong
- [ ] Cek UI Admin → Products = 0
- [ ] Cek UI Admin → Blog = 0  
- [ ] Cek UI Admin → Media Library = kosong
- [ ] Tidak ada error di console
- [ ] Database dalam kondisi VIRGIN ✓

---

**🎯 Jika masih ada data setelah reset aggressive, kemungkinan ada masalah dengan:**
- Foreign key constraints yang tidak ter-handle
- Trigger yang mencegah DELETE
- Transaction yang tidak commit
- Database connection yang masih aktif

**Solusi:** Restart PostgreSQL service dan coba lagi.
