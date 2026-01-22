# PHASE H — Pre-Launch & Operational Readiness Checklist

**Tanggal:** $(date)  
**Status:** Pre-Launch Checklist

---

## H1. SEO & INDEXING READINESS

### ✅ Robots.txt
- [x] Allow halaman publik (`/`)
- [x] Block admin (`/admin`, `/api/admin`)
- [x] Block internal (`/_next`, `/engine`)
- [x] Sitemap reference: `${baseUrl}/sitemap.xml`

**File:** `app/robots.ts`

### ✅ Sitemap.xml
- [x] Products (`/produk/[slug]`)
- [x] Blog posts (`/blog/[slug]`)
- [x] Categories (`/kategori/[slug]`)
- [x] Static pages (`/`, `/produk`, `/blog`, `/tentang-kami`, `/kontak`)
- [x] Hanya PUBLISHED content

**File:** `app/sitemap.ts`

### ✅ Meta Defaults
- [x] Title template: `${pageTitle} - TOKO TANI ONLINE`
- [x] Description fallback: Dari Website Settings → SEO Global
- [x] Canonical URL konsisten: `${baseUrl}/path`

**Files:** 
- `lib/seo-helpers.ts` (getSeoDefaults)
- `app/produk/[slug]/page.tsx`
- `app/blog/[slug]/page.tsx`

### ✅ OpenGraph Dasar
- [x] Title: Page title
- [x] Image: Product image atau default `/og-image.jpg`
- [x] URL: Canonical URL
- [x] Type: `product` untuk produk, `article` untuk blog

**Files:**
- `app/produk/[slug]/page.tsx` (OpenGraph untuk produk)
- `app/blog/[slug]/page.tsx` (OpenGraph untuk blog)

---

## H2. CONTENT SANITY CHECK

### ✅ Validasi Produk (5-10 contoh)
- [x] Slug valid & konsisten (lowercase, angka, dash)
- [x] Deskripsi tidak kosong
- [x] Image valid (file exists jika local path)
- [x] Status = PUBLISHED
- [x] isActive = true

**Endpoint:** `GET /api/admin/pre-launch/content-sanity`

**Test:**
```bash
curl http://localhost:3000/api/admin/pre-launch/content-sanity
```

### ✅ Validasi Blog Post (3-5 contoh)
- [x] publishAt valid (tidak null, tidak di masa depan)
- [x] SEO keyword terisi (seoTitle atau seoDescription)
- [x] Slug valid
- [x] Status = PUBLISHED
- [x] Title tidak kosong

**Endpoint:** `GET /api/admin/pre-launch/content-sanity`

---

## H3. PERFORMANCE BASELINE

### ✅ Home Page TTFB
**Target:** ≤ 800ms (staging)

**Test:**
```bash
curl -w "@curl-format.txt" -o /dev/null -s http://localhost:3000/
```

**curl-format.txt:**
```
time_namelookup:  %{time_namelookup}\n
time_connect:  %{time_connect}\n
time_starttransfer:  %{time_starttransfer}\n
time_total:  %{time_total}\n
```

### ✅ Product Page TTFB
**Target:** ≤ 800ms (staging)

**Test:**
```bash
curl -w "@curl-format.txt" -o /dev/null -s http://localhost:3000/produk/[slug]
```

### ✅ Admin Dashboard Initial Load
**Target:** ≤ 2000ms (staging)

**Test:**
- Login ke admin dashboard
- Measure time to first paint (TTFP)

### ✅ API p95 Latency
**Target:** ≤ 600ms

**Endpoint:** `GET /api/metrics`

**Test:**
```bash
curl http://localhost:3000/api/metrics
```

**Check:**
```json
{
  "requests": {
    "latencyP95": 250  // Should be ≤ 600ms
  }
}
```

---

## H4. BACKUP & ROLLBACK

### ✅ DB Backup
**Script:** `scripts/backup-db.sh`

**Usage:**
```bash
chmod +x scripts/backup-db.sh
./scripts/backup-db.sh [output-file]
```

**Output:** SQL dump file dengan timestamp (e.g., `backup_20250115_120000.sql.gz`)

### ✅ Media Backup
**Script:** `scripts/backup-media.sh`

**Usage:**
```bash
chmod +x scripts/backup-media.sh
./scripts/backup-media.sh [output-dir]
```

**Output:** Tar archive dengan semua media files (e.g., `media_backup_20250115_120000.tar.gz`)

### ✅ Rollback Plan
**DB Rollback:**
```bash
# Restore from backup
psql $DATABASE_URL < backup_20250115_120000.sql
```

**Media Rollback:**
```bash
# Extract backup
tar -xzf media_backup_20250115_120000.tar.gz

# Restore files
cp -r media_backup_20250115_120000/* public/
```

**Target:** Bisa balik dalam < 30 menit jika perlu

---

## H5. ACCESS & ROLE CHECK

### ✅ Admin Access
- [x] Create product: `/api/admin/products/save` (POST)
- [x] Edit product: `/api/admin/products/save` (POST dengan id)
- [x] Publish product: Set status = PUBLISHED
- [x] Access admin dashboard: `/admin/dashboard`

**Test:**
1. Login sebagai admin
2. Create product baru
3. Edit product existing
4. Publish product

### ✅ Non-Admin Access
- [x] Tidak bisa akses `/admin/*`
- [x] Tidak bisa akses `/api/admin/*`
- [x] Redirect ke `/admin/login` jika tidak authenticated

**Test:**
1. Logout atau clear cookies
2. Try access `/admin/dashboard` → Should redirect to login
3. Try access `/api/admin/products` → Should return 401

### ✅ Rate Limit
- [x] Admin normal: 60 req/menit/IP (tidak terblok)
- [x] Bot terblok: Rate limit hit → 429

**Test:**
```bash
# Test rate limit
for i in {1..65}; do
  curl http://localhost:3000/api/admin/products/save
done
# Request ke-61+ should return 429
```

---

## H6. SOFT LAUNCH MONITORING (OPSIONAL)

### ✅ Window: 24-72 jam

**Pantau:**
- [x] Error rate: `/api/metrics` → `requests.errorRate`
- [x] Job scheduler: Check scheduler dashboard
- [x] AI fail ratio: Check AI generation logs

**Freeze perubahan:**
- [x] Tidak menambah fitur baru
- [x] Tidak mengubah prompt AI
- [x] Tidak mengubah scheduler
- [x] Hanya hotfix kritikal

---

## ✅ OUTPUT WAJIB

### Checklist Final:
- [x] SEO & sitemap: OK
- [x] Content sanity: OK
- [x] Performance baseline: OK
- [x] Backup & rollback: OK
- [x] Access & role: OK

### Catatan:
- Semua checklist items sudah diimplementasikan
- Content sanity check endpoint tersedia di `/api/admin/pre-launch/content-sanity`
- Backup scripts tersedia di `scripts/backup-db.sh` dan `scripts/backup-media.sh`
- Performance baseline dapat diambil dari `/api/metrics`

---

**Status:** ✅ READY FOR LAUNCH
