# 📚 DOKUMENTASI LENGKAP FITUR & CARA PENGGUNAAN

**Versi:** 1.0  
**Tanggal:** 2026-01-11  
**Status:** Production Ready

---

## 📋 DAFTAR ISI

1. [Overview Sistem](#overview-sistem)
2. [Cara Menjalankan Server](#cara-menjalankan-server)
3. [Fitur Admin Panel](#fitur-admin-panel)
4. [Fitur Frontend Public](#fitur-frontend-public)
5. [API Endpoints](#api-endpoints)
6. [Cara Membaca Data](#cara-membaca-data)
7. [Integrasi Go Engine](#integrasi-go-engine)
8. [Database Schema](#database-schema)
9. [Troubleshooting](#troubleshooting)

---

## 1. OVERVIEW SISTEM

### Arsitektur

Sistem terdiri dari 3 komponen utama:

1. **Next.js Frontend** (Port 3000)
   - Admin Panel
   - Public Website
   - API Routes

2. **Go Engine Hub** (Port 8090)
   - AI Content Generation
   - Image Generation
   - SEO Optimization
   - Marketing Intelligence

3. **PostgreSQL Database** (Port 5432)
   - Data storage
   - Managed via Prisma ORM

### Environment Variables Wajib

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/tokotanionline

# Go Engine
ENGINE_HUB_URL=http://localhost:8090
OPENAI_API_KEY=sk-...  # Untuk Go engine

# NextAuth
NEXTAUTH_SECRET=your-secret-key
NEXTAUTH_URL=http://localhost:3000
```

---

## 2. CARA MENJALANKAN SERVER

### Opsi 1: Script Otomatis (Recommended)

```powershell
.\scripts\start-all-servers.ps1
```

Script ini akan:
- ✅ Cek dan start PostgreSQL
- ✅ Start Go Engine Hub (port 8090)
- ✅ Start Next.js dev server (port 3000)
- ✅ Verifikasi semua koneksi

### Opsi 2: Manual Start

#### A. Start PostgreSQL

```powershell
# Cek service
Get-Service -Name postgresql*

# Start service (jika belum running)
Start-Service -Name postgresql-x64-15
```

#### B. Start Go Engine Hub

```powershell
cd engine-hub

# Set API key
$env:OPENAI_API_KEY="sk-..."

# Set database URL (optional, untuk job queue)
$env:DATABASE_URL="postgresql://..."

# Start engine
go run cmd/server/main.go
```

**Expected Output:**
```
[BOOT] ENGINE HUB RUNNING ON :8090
```

#### C. Start Next.js Dev Server

```powershell
# Di root project
npm run dev
```

**Expected Output:**
```
▲ Next.js 14.2.18
- Local:        http://localhost:3000
```

### Verifikasi Semua Server Running

```powershell
# Test Go Engine
Invoke-WebRequest -Uri "http://localhost:8090/health"

# Test Next.js
Invoke-WebRequest -Uri "http://localhost:3000"
```

---

## 3. FITUR ADMIN PANEL

### 3.1 Dashboard (`/admin/dashboard`)

**Fungsi:** Overview sistem dan statistik

**Cara Menggunakan:**
1. Login ke `/admin/login`
2. Setelah login, otomatis redirect ke dashboard
3. Dashboard menampilkan:
   - Total produk
   - Total blog posts
   - Total kategori
   - Aktivitas terbaru
   - Engine status

**API Endpoint:**
- `GET /api/admin/dashboard` - Get dashboard data

**Cara Membaca Data:**
```typescript
// Frontend component
const response = await fetch('/api/admin/dashboard');
const data = await response.json();
// data.products, data.blogs, data.categories, etc.
```

---

### 3.2 Produk Management (`/admin/products`)

**Fungsi:** CRUD lengkap untuk produk

**Fitur:**
- ✅ Create produk baru
- ✅ Edit produk existing
- ✅ Delete produk
- ✅ Publish/Draft status
- ✅ Upload gambar produk
- ✅ AI Generate deskripsi produk

**Cara Menggunakan:**

#### Create Produk Baru:
1. Klik "Tambah Produk"
2. Isi form:
   - Nama produk
   - Slug (auto-generate, bisa diubah)
   - Deskripsi (bisa pakai AI Generate)
   - Kategori
   - Harga
   - Stok
   - Gambar produk
3. Klik "Simpan" atau "Publish"

#### AI Generate Deskripsi:
1. Di form produk, klik "Generate Deskripsi Produk (AI)"
2. Sistem akan:
   - Kirim request ke Go Engine (`/api/engine/ai/generate-v2`)
   - Generate konten berdasarkan nama produk
   - Auto-fill deskripsi di form
3. Bisa di-edit manual sebelum save

**API Endpoints:**
- `GET /api/admin/products` - List semua produk
- `GET /api/admin/products/[id]` - Get produk by ID
- `POST /api/admin/products` - Create produk baru
- `PUT /api/admin/products/[id]` - Update produk
- `DELETE /api/admin/products/[id]` - Delete produk
- `POST /api/admin/ai/product-generate` - AI generate deskripsi

**Cara Membaca Data:**
```typescript
// List produk
const products = await fetch('/api/admin/products').then(r => r.json());

// Get produk detail
const product = await fetch(`/api/admin/products/${id}`).then(r => r.json());

// AI Generate
const aiResult = await fetch('/api/admin/ai/product-generate', {
  method: 'POST',
  body: JSON.stringify({ productName, category, outline })
}).then(r => r.json());
```

---

### 3.3 Kategori Management (`/admin/categories`)

**Fungsi:** Kelola kategori produk dan blog

**Fitur:**
- ✅ Create kategori
- ✅ Edit kategori
- ✅ Delete kategori
- ✅ Hierarchical categories (parent/child)

**API Endpoints:**
- `GET /api/admin/categories` - List kategori
- `POST /api/admin/categories` - Create kategori
- `PUT /api/admin/categories/[id]` - Update kategori
- `DELETE /api/admin/categories/[id]` - Delete kategori

**Cara Membaca Data:**
```typescript
const categories = await fetch('/api/admin/categories').then(r => r.json());
// categories: Array<{ id, name, slug, parentId, ... }>
```

---

### 3.4 Blog Posts Management (`/admin/blog/posts`)

**Fungsi:** CRUD lengkap untuk artikel blog

**Fitur:**
- ✅ Create blog post
- ✅ Edit blog post
- ✅ Delete blog post
- ✅ Publish/Draft status
- ✅ AI Generate konten blog (v2 - Answer-Driven)
- ✅ Upload featured image
- ✅ SEO metadata (title, description, keywords)

**Cara Menggunakan:**

#### Create Blog Post:
1. Klik "Buat Post Baru"
2. Isi form:
   - Judul artikel
   - Slug (auto-generate)
   - Excerpt (ringkasan)
   - Content (HTML editor)
   - Kategori blog
   - Featured image
3. Klik "Simpan Draft" atau "Publish"

#### AI Generate Blog Content (v2):
1. Di form blog, klik "Generate AI"
2. Pilih mode:
   - **Quick Generate**: Generate langsung dengan outline otomatis
   - **Question-Driven**: Generate berdasarkan pertanyaan spesifik
3. Sistem akan:
   - Generate intent (informational/how_to/commercial/comparison)
   - Generate pertanyaan relevan (jika Question-Driven)
   - Generate jawaban untuk setiap pertanyaan
   - Generate SEO metadata
   - Generate gambar (jika diperlukan)
4. Konten auto-fill di form, bisa di-edit sebelum publish

**API Endpoints:**
- `GET /api/admin/blog/posts` - List blog posts
- `GET /api/admin/blog/posts/[id]` - Get blog post by ID
- `POST /api/admin/blog/posts` - Create blog post
- `PUT /api/admin/blog/posts/[id]` - Update blog post
- `DELETE /api/admin/blog/posts/[id]` - Delete blog post
- `POST /api/admin/blog/posts/ai-generate` - AI generate konten

**Cara Membaca Data:**
```typescript
// List blog posts
const posts = await fetch('/api/admin/blog/posts').then(r => r.json());

// Get blog post detail
const post = await fetch(`/api/admin/blog/posts/${id}`).then(r => r.json());

// AI Generate
const aiResult = await fetch('/api/admin/blog/posts/ai-generate', {
  method: 'POST',
  body: JSON.stringify({
    title: "Cara Menanam Padi",
    intent: "how_to",
    questions: ["Bagaimana cara menanam padi?", "Kapan waktu terbaik?"]
  })
}).then(r => r.json());
// aiResult: { title, slug, excerpt, content, sections[], seo, images }
```

---

### 3.5 Media Library (`/admin/media`)

**Fungsi:** Kelola file upload (gambar, dokumen)

**Fitur:**
- ✅ Upload file
- ✅ View semua media
- ✅ Delete media
- ✅ Search media

**API Endpoints:**
- `GET /api/admin/media` - List media
- `POST /api/admin/upload` - Upload file
- `DELETE /api/admin/media/[id]` - Delete media

---

### 3.6 Scheduler (`/admin/scheduler`)

**Fungsi:** Konfigurasi automated content generation

**Fitur:**
- ✅ Enable/Disable scheduler
- ✅ Set interval check
- ✅ View scheduled jobs
- ✅ Manual trigger jobs

**Cara Menggunakan:**
1. Buka `/admin/scheduler`
2. Toggle "Enable Scheduler"
3. Set interval (default: 1 jam)
4. Scheduler akan otomatis:
   - Cek database untuk jobs yang perlu di-generate
   - Trigger Go Engine untuk generate konten
   - Update status di database

**API Endpoints:**
- `GET /api/admin/scheduler` - Get scheduler config
- `PUT /api/admin/scheduler` - Update scheduler config
- `POST /api/internal/scheduler/run` - Manual trigger

---

### 3.7 Engine Status & Monitoring

#### Engine Status (`/admin/engine/status`)
**Fungsi:** Monitor status Go Engine Hub

**Data yang Ditampilkan:**
- Engine uptime
- Health status
- Active engines
- Connection status

**API Endpoint:**
- `GET /api/admin/engine/status` - Get engine status

#### Engine Jobs (`/admin/engine/jobs`)
**Fungsi:** Monitor dan manual trigger engine jobs

**Fitur:**
- ✅ View semua jobs
- ✅ View job status (PENDING/RUNNING/COMPLETED/FAILED)
- ✅ Manual run job
- ✅ View job results

**API Endpoints:**
- `GET /api/admin/engine/jobs` - List jobs
- `POST /api/admin/engine/jobs/[id]/run` - Manual run job

#### Engine Logs (`/admin/engine/logs`)
**Fungsi:** View real-time engine logs

**API Endpoint:**
- `GET /api/admin/engine/logs` - Get logs

---

### 3.8 System Settings

#### Website Settings (`/admin/system/website`)
**Fungsi:** Konfigurasi website (homepage, footer, logo, dll)

**Fitur:**
- ✅ Site title & tagline
- ✅ Logo & favicon
- ✅ Hero section
- ✅ Footer content
- ✅ About & Contact pages

**API Endpoints:**
- `GET /api/admin/site-settings` - Get settings
- `PUT /api/admin/site-settings` - Update settings

#### System Settings (`/admin/system/settings`)
**Fungsi:** System-wide configuration

**Fitur:**
- ✅ Feature toggles (salesEnabled, etc.)
- ✅ SAFE_MODE toggle (super_admin only)
- ✅ FEATURE_FREEZE toggle (super_admin only)
- ✅ Content settings
- ✅ Marketing settings

**API Endpoints:**
- `GET /api/admin/system/settings` - Get settings
- `PUT /api/admin/system/settings` - Update settings

#### Admin Management (`/admin/system/admins`)
**Fungsi:** Kelola admin users

**Fitur:**
- ✅ Create admin
- ✅ Edit admin
- ✅ Deactivate admin
- ✅ Role management (admin/super_admin)

**API Endpoints:**
- `GET /api/admin/system/admins` - List admins
- `POST /api/admin/system/admins` - Create admin
- `PUT /api/admin/system/admins/[id]` - Update admin
- `DELETE /api/admin/system/admins/[id]` - Delete admin

---

## 4. FITUR FRONTEND PUBLIC

### 4.1 Homepage (`/`)

**Fungsi:** Landing page utama

**Data yang Ditampilkan:**
- Hero section (dari Website Settings)
- Featured products
- Latest blog posts
- Categories

**Cara Membaca Data:**
```typescript
// Get homepage data
const homepage = await fetch('/api/public/homepage').then(r => r.json());
// homepage: { hero, products, blogs, categories }
```

---

### 4.2 Product Pages

#### Product List (`/produk`)
**Fungsi:** List semua produk

**API Endpoint:**
- `GET /api/public/products` - List produk (published only)

#### Product Detail (`/produk/[slug]`)
**Fungsi:** Detail produk individual

**Data yang Ditampilkan:**
- Nama produk
- Deskripsi
- Harga
- Stok
- Gambar
- Kategori
- Related products

**API Endpoint:**
- `GET /api/public/products/[slug]` - Get produk by slug

**Cara Membaca Data:**
```typescript
const product = await fetch(`/api/public/products/${slug}`).then(r => r.json());
// product: { id, name, slug, description, price, images, category, ... }
```

---

### 4.3 Blog Pages

#### Blog List (`/blog`)
**Fungsi:** List semua artikel blog

**API Endpoint:**
- `GET /api/public/blogs` - List blog posts (published only)

#### Blog Detail (`/blog/[slug]`)
**Fungsi:** Detail artikel blog

**Data yang Ditampilkan:**
- Judul
- Content (HTML)
- Featured image
- Author
- Published date
- Category
- Related posts

**API Endpoint:**
- `GET /api/public/blogs/[slug]` - Get blog post by slug

**Cara Membaca Data:**
```typescript
const blog = await fetch(`/api/public/blogs/${slug}`).then(r => r.json());
// blog: { id, title, slug, content, excerpt, featuredImage, author, publishedAt, category }
```

---

### 4.4 Category Pages (`/kategori/[slug]`)

**Fungsi:** Halaman kategori dengan produk/blog terkait

**API Endpoint:**
- `GET /api/public/categories/[slug]` - Get kategori dengan produk/blog

**Cara Membaca Data:**
```typescript
const category = await fetch(`/api/public/categories/${slug}`).then(r => r.json());
// category: { id, name, slug, products: [], blogs: [] }
```

---

## 5. API ENDPOINTS

### 5.1 Public API

Semua public API tidak memerlukan authentication:

- `GET /api/public/products` - List produk
- `GET /api/public/products/[slug]` - Get produk detail
- `GET /api/public/blogs` - List blog posts
- `GET /api/public/blogs/[slug]` - Get blog post detail
- `GET /api/public/categories` - List kategori
- `GET /api/public/categories/[slug]` - Get kategori detail
- `GET /api/public/homepage` - Homepage data

### 5.2 Admin API

Semua admin API memerlukan authentication (NextAuth session):

**Products:**
- `GET /api/admin/products`
- `POST /api/admin/products`
- `PUT /api/admin/products/[id]`
- `DELETE /api/admin/products/[id]`

**Blog Posts:**
- `GET /api/admin/blog/posts`
- `POST /api/admin/blog/posts`
- `PUT /api/admin/blog/posts/[id]`
- `DELETE /api/admin/blog/posts/[id]`
- `POST /api/admin/blog/posts/ai-generate` - AI generate

**Categories:**
- `GET /api/admin/categories`
- `POST /api/admin/categories`
- `PUT /api/admin/categories/[id]`
- `DELETE /api/admin/categories/[id]`

**System:**
- `GET /api/admin/system/settings`
- `PUT /api/admin/system/settings`
- `GET /api/admin/system/admins`
- `POST /api/admin/system/admins`
- `PUT /api/admin/system/admins/[id]`
- `DELETE /api/admin/system/admins/[id]`

### 5.3 Go Engine API (via Next.js Proxy)

Next.js bertindak sebagai proxy ke Go Engine:

- `GET /api/go-engine/status` → `http://localhost:8090/health`
- `GET /api/go-engine/engines` → `http://localhost:8090/api/engines`
- `GET /api/go-engine/logs` → `http://localhost:8090/logs`

**Direct Go Engine Endpoints:**
- `POST http://localhost:8090/api/engine/ai/generate-v2` - AI generate (v2)
- `POST http://localhost:8090/api/engine/ai/generate-questions` - Generate questions
- `POST http://localhost:8090/api/engine/ai/generate-product-images` - Generate product images
- `GET http://localhost:8090/health` - Health check

---

## 6. CARA MEMBACA DATA

### 6.1 Dari Database (Prisma)

```typescript
import { prisma } from '@/lib/db';

// Read products
const products = await prisma.product.findMany({
  where: { status: 'PUBLISHED' },
  include: { category: true }
});

// Read blog posts
const posts = await prisma.blogPost.findMany({
  where: { status: 'PUBLISHED' },
  include: { category: true, author: true }
});

// Read categories
const categories = await prisma.productCategory.findMany({
  include: { products: true }
});
```

### 6.2 Dari API Endpoints

```typescript
// Public API (no auth)
const products = await fetch('/api/public/products').then(r => r.json());

// Admin API (requires auth)
const session = await getServerSession();
const adminProducts = await fetch('/api/admin/products', {
  headers: { Cookie: request.headers.get('cookie') }
}).then(r => r.json());
```

### 6.3 Dari Go Engine

```typescript
const ENGINE_HUB_URL = process.env.ENGINE_HUB_URL || 'http://localhost:8090';

// Health check
const health = await fetch(`${ENGINE_HUB_URL}/health`).then(r => r.json());

// AI Generate
const aiResult = await fetch(`${ENGINE_HUB_URL}/api/engine/ai/generate-v2`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    contentType: 'DERIVATIVE_LONG',
    category: 'K1',
    outline: '...',
    language: 'id'
  })
}).then(r => r.json());
```

---

## 7. INTEGRASI GO ENGINE

### 7.1 AI Content Generation Flow

```
Frontend (Next.js)
    ↓
POST /api/admin/blog/posts/ai-generate
    ↓
Next.js API Route
    ↓
POST http://localhost:8090/api/engine/ai/generate-v2
    ↓
Go Engine Hub
    ↓
OpenAI API
    ↓
Response (content + images + SEO)
    ↓
Frontend (auto-fill form)
```

### 7.2 Environment Variables untuk Go Engine

```env
# Di engine-hub/.env atau OS environment
OPENAI_API_KEY=sk-...
DATABASE_URL=postgresql://...  # Optional, untuk job queue
ENGINE_PORT=8090  # Default port
```

### 7.3 Verifikasi Go Engine Running

```powershell
# Test health
Invoke-WebRequest -Uri "http://localhost:8090/health"

# Expected response:
# { "status": "ok", "uptime": 123 }
```

---

## 8. DATABASE SCHEMA

### Core Models

**Product:**
- id, name, slug, description, price, stock, status, categoryId, images, ...

**BlogPost:**
- id, title, slug, content, excerpt, status, categoryId, authorId, featuredImage, ...

**Category:**
- id, name, slug, parentId, type (PRODUCT/BLOG), ...

**Admin:**
- id, email, passwordHash, name, role, brandId, isActive, ...

**Brand:**
- id, brandName, brandSlug, brandStatus, domain, subdomain, ...

**Locale:**
- id, brandId, localeCode, languageName, isDefault, isActive, ...

### Relationships

- Product → Category (many-to-one)
- BlogPost → Category (many-to-one)
- BlogPost → Admin (author, many-to-one)
- Brand → Locale (one-to-many)
- Brand → Product (one-to-many)
- Brand → BlogPost (one-to-many)

### Cara Membaca Schema

```typescript
// Via Prisma Studio (GUI)
npx prisma studio

// Via Prisma Client
import { prisma } from '@/lib/db';
const schema = prisma; // Access all models
```

---

## 9. TROUBLESHOOTING

### 9.1 Database Connection Error

**Error:** `connect ECONNREFUSED 127.0.0.1:5432`

**Solution:**
1. Cek PostgreSQL service running:
   ```powershell
   Get-Service -Name postgresql*
   ```
2. Start service jika belum running
3. Verifikasi DATABASE_URL di `.env.local`

### 9.2 Go Engine Connection Error

**Error:** `Cannot connect to Go engine at http://localhost:8090`

**Solution:**
1. Cek Go engine running:
   ```powershell
   Invoke-WebRequest -Uri "http://localhost:8090/health"
   ```
2. Start Go engine jika belum running
3. Verifikasi ENGINE_HUB_URL di `.env.local`

### 9.3 AI Generation Timeout

**Error:** `Request timeout: Engine took too long to respond`

**Solution:**
1. Cek OpenAI API key valid
2. Cek network connection
3. Increase timeout di code (default: 5 minutes)

### 9.4 Port Already in Use

**Error:** `Port 3000/8090 already in use`

**Solution:**
```powershell
# Find process using port
netstat -ano | findstr :3000

# Kill process
taskkill /PID <PID> /F
```

---

## 📝 CATATAN PENTING

1. **Environment Variables:** Pastikan semua env vars sudah di-set sebelum start server
2. **Database Migration:** Run `npx prisma db push` setelah schema changes
3. **Go Engine:** Harus running sebelum menggunakan AI features
4. **Authentication:** Admin API memerlukan NextAuth session
5. **Ports:** Default ports (3000, 8090, 5432) bisa diubah via env vars

---

**END OF DOCUMENTATION**
