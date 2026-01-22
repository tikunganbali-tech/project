# 📘 FASE 6 — PANDUAN PENGGUNAAN ADMIN & OPERASIONAL

**Untuk:** Admin dan Operator Website  
**Versi:** 1.0  
**Tanggal:** 2026-01-11

---

## 📋 DAFTAR ISI

1. [Cara Menggunakan Admin](#cara-menggunakan-admin)
2. [Cara ON/OFF Scheduler](#cara-onoff-scheduler)
3. [Cara Generate Konten](#cara-generate-konten)
4. [Daftar ENV Wajib](#daftar-env-wajib)

---

## 1. CARA MENGGUNAKAN ADMIN

### 1.1 Login Admin

1. Buka halaman: `http://your-domain.com/admin/login`
2. Masukkan email dan password admin
3. Setelah login, Anda akan diarahkan ke Dashboard

### 1.2 Menu Utama Admin

**Dashboard** (`/admin`)
- Ringkasan sistem dan statistik

**Konten**
- **Blog Posts** (`/admin/blog/posts`): Kelola artikel blog
- **Produk** (`/admin/products`): Kelola produk
- **Kategori** (`/admin/categories`): Kelola kategori produk

**Pengaturan Website** (`/admin/system/website`)
- Hero Title & Subtitle
- CTA Text & Link
- Footer Content
- Logo & Favicon
- About & Contact Content

**Sistem**
- **Settings** (`/admin/system/settings`): Pengaturan sistem
- **Admins** (`/admin/system/admins`): Kelola admin users
- **Engine Status** (`/admin/engine/status`): Status engine AI
- **Scheduler** (`/admin/scheduler`): Konfigurasi scheduler

### 1.3 Membuat Blog Post

1. Buka `/admin/blog/posts`
2. Klik "Buat Post Baru"
3. Isi form:
   - **Judul** (min. 20 karakter)
   - **Slug** (auto-generate, bisa diubah)
   - **Excerpt** (ringkasan)
   - **Content** (isi artikel)
   - **Category** (pilih kategori)
   - **Featured Image** (opsional)
4. Klik "Simpan Draft" untuk menyimpan draft
5. Klik "Publish" untuk langsung publish
6. Atau klik "Submit for Review" untuk review terlebih dahulu

### 1.4 Mengelola Produk

1. Buka `/admin/products`
2. Klik "Tambah Produk" untuk produk baru
3. Atau klik produk yang ada untuk edit
4. Isi form lengkap:
   - Nama, Slug, Deskripsi
   - Kategori & Sub-kategori
   - Harga & Stok
   - Gambar produk
   - Informasi tambahan (cara pakai, dosis, dll)
5. Simpan sebagai Draft atau langsung Publish

### 1.5 Mengubah Pengaturan Website

1. Buka `/admin/system/website`
2. Edit field yang ingin diubah:
   - **Hero Section**: Title, Subtitle, CTA
   - **Footer**: About, Address, Phone, Email
   - **Logo**: Upload logo light & dark
   - **Favicon**: Upload favicon
3. Klik "Simpan Perubahan"
4. Perubahan akan langsung terlihat di frontend

### 1.6 Tips Penggunaan

- **Placeholder**: Semua field memiliki placeholder yang informatif
- **Auto-save**: Beberapa form memiliki auto-save draft
- **Slug**: Slug auto-generate dari nama, tapi bisa diubah manual
- **Status**: Setiap konten memiliki status (Draft, Review, Published, Archived)
- **Filter**: Gunakan filter untuk mencari konten spesifik

---

## 2. CARA ON/OFF SCHEDULER

### 2.1 Melalui Admin UI

1. Buka `/admin/scheduler`
2. Lihat status scheduler di bagian atas
3. Toggle switch "Enabled" untuk ON/OFF
4. Atau ubah "Daily Quota" untuk membatasi jumlah generate per hari
5. Klik "Simpan" untuk menyimpan perubahan

### 2.2 Melalui Environment Variable

Edit file `.env`:

```env
# ON scheduler
SCHEDULER_ENABLED=true
SCHEDULER_DAILY_QUOTA=10

# OFF scheduler
SCHEDULER_ENABLED=false
```

Setelah edit, restart server:
```bash
npm run dev  # development
# atau
npm run start  # production
```

### 2.3 Melalui API (Advanced)

```bash
# Check status
curl http://localhost:3000/api/admin/scheduler/status

# Enable
curl -X PUT http://localhost:3000/api/admin/scheduler/config \
  -H "Content-Type: application/json" \
  -d '{"enabled": true, "dailyQuota": 10}'

# Disable
curl -X PUT http://localhost:3000/api/admin/scheduler/config \
  -H "Content-Type: application/json" \
  -d '{"enabled": false}'
```

### 2.4 Catatan Penting

- **ON**: Scheduler akan otomatis generate konten sesuai jadwal
- **OFF**: Scheduler tidak akan generate konten (aman untuk maintenance)
- **Daily Quota**: Batas maksimal generate per hari (default: 10)
- **Safe Mode**: Jika `SAFE_MODE=true`, scheduler tidak akan jalan meskipun enabled

---

## 3. CARA GENERATE KONTEN

### 3.1 Generate Manual (Admin UI)

1. Buka `/admin/engine/jobs`
2. Pilih job yang ingin dijalankan
3. Klik "Run Job"
4. Tunggu proses selesai (bisa beberapa menit)
5. Hasil akan muncul di log

### 3.2 Generate via AI Generator

1. Buka `/admin/engine/generate`
2. Pilih tipe konten:
   - **Blog Post**: Generate artikel blog
   - **Product Copy**: Generate deskripsi produk
3. Masukkan **Topic** (topik konten)
4. Klik "Generate"
5. Preview hasil, lalu:
   - **Approve**: Simpan ke database
   - **Reject**: Buang hasil
   - **Regenerate**: Generate ulang

### 3.3 Generate via Scheduler (Otomatis)

1. Pastikan scheduler **ON** (lihat bagian 2)
2. Scheduler akan otomatis generate konten sesuai jadwal:
   - Blog posts: Setiap hari jam 08:00
   - Product copy: Setiap 2 hari
3. Hasil akan otomatis tersimpan sebagai Draft
4. Admin perlu review dan publish manual

### 3.4 Tips Generate

- **Topic**: Gunakan topik spesifik untuk hasil lebih baik
- **Review**: Selalu review hasil generate sebelum publish
- **Edit**: Hasil generate bisa diedit manual sebelum publish
- **Quota**: Perhatikan daily quota agar tidak melebihi batas

---

## 4. DAFTAR ENV WAJIB

### 4.1 ENV Wajib (Harus Diisi)

```env
# Database (WAJIB)
DATABASE_URL=postgresql://user:password@host:port/database

# Authentication (WAJIB di production)
NEXTAUTH_SECRET=your-secret-key-here
NEXTAUTH_URL=https://your-domain.com

# Site URL (WAJIB di production)
NEXT_PUBLIC_SITE_URL=https://your-domain.com
NEXT_PUBLIC_BASE_URL=https://your-domain.com
```

### 4.2 ENV Penting (Sangat Disarankan)

```env
# Engine Hub (jika menggunakan AI engine)
ENGINE_HUB_URL=http://localhost:8080

# Marketing Kill Switch (WAJIB false di production default)
MARKETING_LIVE_ENABLED=false
MARKETING_DRY_RUN=true

# Internal Services
INTERNAL_EVENT_KEY=your-random-secret-key
```

### 4.3 ENV Opsional

```env
# Email (jika menggunakan fitur email)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Image APIs (jika menggunakan image generation)
PEXELS_API_KEY=your-key
PIXABAY_API_KEY=your-key
UNSPLASH_ACCESS_KEY=your-key

# Marketing Pixels (jika menggunakan tracking)
NEXT_PUBLIC_FACEBOOK_PIXEL_ID=your-id
NEXT_PUBLIC_GOOGLE_ADS_ID=your-id
NEXT_PUBLIC_GA4_ID=your-id
```

### 4.4 Dokumentasi Lengkap ENV

Lihat file: `docs/env-reference.md` untuk dokumentasi lengkap semua environment variables.

---

## 🔒 KEAMANAN

### Checklist Sebelum Production

- ✅ `NODE_ENV=production`
- ✅ `NEXTAUTH_SECRET` di-set dengan nilai random kuat (32+ karakter)
- ✅ `DATABASE_URL` di-set dengan connection string production
- ✅ `MARKETING_LIVE_ENABLED=false` (atau `true` hanya setelah testing)
- ✅ `MARKETING_DRY_RUN=true` (atau `false` hanya setelah testing)
- ✅ Semua API keys di-set dengan nilai production
- ✅ **TIDAK ada** `TEST_ADMIN_EMAIL` atau `TEST_ADMIN_PASSWORD` di production

---

## 📞 BANTUAN

Jika mengalami masalah:

1. **Cek Log**: Lihat console browser (F12) untuk error
2. **Cek Server Log**: Lihat terminal/server log untuk error backend
3. **Cek Status**: Buka `/api/health` untuk cek status sistem
4. **Cek ENV**: Pastikan semua ENV wajib sudah di-set
5. **Restart**: Coba restart server (`npm run dev` atau `npm run start`)

---

**Last Updated:** 2026-01-11  
**Version:** 1.0
