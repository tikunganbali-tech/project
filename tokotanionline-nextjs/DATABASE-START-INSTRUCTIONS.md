# DATABASE START INSTRUCTIONS

**Status:** PostgreSQL service tidak bisa di-start otomatis (perlu administrator privileges)

---

## 🔧 CARA START POSTGRESQL SERVICE

### Opsi 1: Via Services Manager (Paling Mudah)

1. **Buka Services Manager:**
   - Tekan `Win + R`
   - Ketik `services.msc`
   - Tekan Enter

2. **Cari PostgreSQL Service:**
   - Cari service dengan nama "**postgresql-x64-18 - PostgreSQL Server 18**"
   - Atau cari semua service yang mengandung "postgresql"

3. **Start Service:**
   - Right-click pada service "postgresql-x64-18"
   - Pilih "**Start**"
   - Tunggu sampai Status berubah menjadi "Running"

4. **Verify:**
   - Status harus menunjukkan "**Running**"
   - Service Type: "Local System" atau sesuai konfigurasi

---

### Opsi 2: Via PowerShell (As Administrator)

1. **Buka PowerShell as Administrator:**
   - Tekan `Win + X`
   - Pilih "**Windows PowerShell (Admin)**" atau "**Terminal (Admin)**"

2. **Start Service:**
   ```powershell
   Start-Service -Name postgresql-x64-18
   ```

3. **Verify:**
   ```powershell
   Get-Service -Name postgresql-x64-18
   ```
   - Status harus "**Running**"

---

### Opsi 3: Via Command Prompt (As Administrator)

1. **Buka CMD as Administrator:**
   - Tekan `Win + X`
   - Pilih "**Command Prompt (Admin)**"

2. **Start Service:**
   ```cmd
   net start postgresql-x64-18
   ```

3. **Verify:**
   ```cmd
   sc query postgresql-x64-18
   ```
   - STATE harus "**RUNNING**"

---

## ✅ VERIFIKASI DATABASE RUNNING

Setelah service start, verifikasi database bisa diakses:

### Test Connection dengan Prisma

```bash
# Test database connection
npx prisma db pull
```

**Expected Output:**
- ✅ Connection successful
- ✅ No errors
- ✅ Database schema detected

### Test Connection dengan psql (jika tersedia)

```bash
# Connect ke database (adjust username jika berbeda)
psql -U postgres -d tokotanionline -h localhost -p 5432
```

**Expected Output:**
- ✅ Connected to database
- ✅ Prompt `tokotanionline=#` muncul

---

## 🔍 TROUBLESHOOTING

### Error: Service Cannot Start

**Kemungkinan Penyebab:**
1. **Service belum dikonfigurasi dengan benar**
2. **Data directory tidak ada atau corrupt**
3. **Port 5432 sudah digunakan oleh aplikasi lain**

**Solution:**

1. **Cek Port 5432:**
   ```powershell
   netstat -ano | findstr :5432
   ```
   - Jika ada process lain menggunakan port 5432, stop process tersebut

2. **Cek PostgreSQL Logs:**
   - Lokasi log biasanya: `C:\Program Files\PostgreSQL\18\data\log\`
   - Buka file log terbaru untuk melihat error detail

3. **Restart Computer:**
   - Kadang service perlu restart komputer untuk pertama kali

### Error: Permission Denied

**Solution:**
- Pastikan menjalankan command dengan **Administrator privileges**
- Atau gunakan Services Manager (tidak perlu admin untuk start service)

### Error: Database Not Found

**Jika error "database tokotanionline does not exist":**

```bash
# Connect ke default database (postgres)
psql -U postgres -h localhost -p 5432

# Create database
CREATE DATABASE tokotanionline;

# Exit
\q
```

Atau via Prisma:

```bash
# Prisma akan create database jika tidak ada (dari schema)
npx prisma db push
```

---

## 🎯 SETELAH DATABASE RUNNING

### 1. Verify Database Connection

```bash
npx prisma db pull
```

### 2. Generate Prisma Client (Jika Belum)

```bash
npx prisma generate
```

### 3. Verify Seed Data (4 Kategori Inti)

```bash
npx prisma db seed
```

**Expected Output:**
```
✅ ADMIN CREATED
✅ CATEGORY CREATED: Panduan Dasar (panduan-dasar)
✅ CATEGORY CREATED: Pendalaman & Analisis (pendalaman-analisis)
✅ CATEGORY CREATED: Solusi & Produk (solusi-produk)
✅ CATEGORY CREATED: Referensi & Update (referensi-update)
✅ ALL CATEGORIES SEEDED
```

### 4. Test API Endpoints

Setelah database running dan dev server running, test:

```
http://localhost:3000/api/public/categories
```

**Expected Response:**
```json
{
  "categories": [
    {
      "id": "...",
      "name": "Panduan Dasar",
      "slug": "panduan-dasar",
      "type": "PANDUAN_DASAR",
      ...
    },
    ...
  ]
}
```

---

## 📝 CHECKLIST

Setelah start PostgreSQL service:

- [ ] Service status: **Running**
- [ ] Database connection: **Success** (`npx prisma db pull`)
- [ ] Prisma client: **Generated** (`npx prisma generate`)
- [ ] Seed data: **Applied** (4 kategori inti)
- [ ] API endpoint: **Working** (`/api/public/categories`)

---

## ⚠️ CATATAN PENTING

1. **PostgreSQL Service biasanya auto-start saat boot**, tapi kadang perlu di-start manual pertama kali
2. **Service name mungkin berbeda** jika installasi berbeda — cek dengan `Get-Service -Name postgresql*`
3. **Jika service masih tidak bisa start**, cek PostgreSQL installation dan logs untuk detail error

---

**START POSTGRESQL SERVICE TERLEBIH DAHULU, LALU VERIFY DATABASE CONNECTION.**

---

**END OF INSTRUCTIONS**
