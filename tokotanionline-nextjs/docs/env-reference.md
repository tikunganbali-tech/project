# ENVIRONMENT VARIABLES REFERENCE

**Dokumentasi Lengkap Environment Variables untuk TOKO TANI ONLINE**

---

## 📋 DAFTAR ISI

1. [Core System](#core-system)
2. [Database](#database)
3. [Authentication](#authentication)
4. [Engine Infrastructure](#engine-infrastructure)
5. [Marketing & AI Engine](#marketing--ai-engine)
6. [Email / SMTP](#email--smtp)
7. [Third-Party Services](#third-party-services)
8. [Image Generation APIs](#image-generation-apis)
9. [Internal Services](#internal-services)
10. [WhatsApp Integration](#whatsapp-integration)
11. [Testing](#testing)
12. [Auto-Set Variables](#auto-set-variables)

---

## 🔍 LEGENDA KLASIFIKASI

- **REQUIRED** = Harus diisi untuk aplikasi bisa jalan
- **OPTIONAL** = Tidak wajib, hanya diperlukan jika fitur tertentu digunakan
- **PRODUCTION REQUIRED** = Wajib di production, optional di development
- **🔒 Safe Default** = Default value aman (tidak berbahaya)
- **🚫 Dangerous if Active** = Berbahaya jika aktif tanpa testing/knowledge

---

## 1. CORE SYSTEM

### `NODE_ENV`
- **Type:** `development | production | test`
- **Required:** No (default: `development`)
- **Safe Default:** ✅ `development`
- **Dangerous if Active:** ❌ No
- **Description:** Environment mode untuk aplikasi
- **Usage:** Digunakan untuk conditional logic (error handling, logging, security headers)

### `NEXT_PUBLIC_BASE_URL`
- **Type:** String (URL)
- **Required:** No (default: `http://localhost:3000`)
- **Safe Default:** ✅ `http://localhost:3000`
- **Dangerous if Active:** ❌ No
- **Description:** Base URL untuk internal API calls
- **Usage:** Digunakan di `lib/public-api.ts`, engine-hub communication

### `NEXT_PUBLIC_SITE_URL`
- **Type:** String (URL)
- **Required:** No (default: `http://localhost:3000`)
- **Safe Default:** ✅ `http://localhost:3000`
- **Dangerous if Active:** ❌ No
- **Description:** Site URL untuk SEO (sitemap, robots.txt, meta tags)
- **Usage:** Digunakan di `app/sitemap.ts`, `app/robots.ts`, blog/product pages

---

## 2. DATABASE

### `DATABASE_URL`
- **Type:** String (PostgreSQL connection string)
- **Required:** ✅ **YES** (aplikasi tidak bisa jalan tanpa ini)
- **Safe Default:** ❌ No (harus diisi dengan connection string valid)
- **Dangerous if Active:** ❌ No (tapi berbahaya jika salah/kosong)
- **Format:** `postgresql://user:password@host:port/database`
- **Description:** PostgreSQL connection string untuk Prisma
- **Usage:** Digunakan di `prisma/schema.prisma`, `lib/db.ts`, `engine-hub/internal/content/db.go`
- **Security Note:** Jangan commit nilai ini ke repository!

---

## 3. AUTHENTICATION

### `NEXTAUTH_SECRET`
- **Type:** String (random secret)
- **Required:** ✅ **PRODUCTION REQUIRED**
- **Safe Default:** ❌ No (harus di-generate)
- **Dangerous if Active:** ⚠️ **YES** (jika tidak di-set di production, session tidak secure)
- **Description:** Secret untuk encrypt NextAuth session tokens
- **Generate:** `openssl rand -base64 32`
- **Usage:** Digunakan di `lib/auth.ts`
- **Security Note:** **CRITICAL** - Jangan commit nilai ini!

### `NEXTAUTH_URL`
- **Type:** String (URL)
- **Required:** No (default: akan menggunakan `NEXT_PUBLIC_BASE_URL`)
- **Safe Default:** ✅ Auto-fallback ke `NEXT_PUBLIC_BASE_URL`
- **Dangerous if Active:** ❌ No
- **Description:** Base URL untuk NextAuth callbacks
- **Usage:** Digunakan di `lib/auth.ts`, `app/api/auth/forgot-password/route.ts`

---

## 4. ENGINE INFRASTRUCTURE

### `ENGINE_HUB_URL`
- **Type:** String (URL)
- **Required:** No (optional, hanya jika menggunakan engine-hub)
- **Safe Default:** ✅ `http://localhost:8080` (atau empty untuk disable)
- **Dangerous if Active:** ❌ No
- **Description:** URL untuk Go engine-hub service
- **Usage:** Digunakan di `lib/engine-hub.ts`, `app/api/engines/control/route.ts`

### `GO_ENGINE_API_URL`
- **Type:** String (URL)
- **Required:** No (optional, alternate/legacy)
- **Safe Default:** ✅ `http://localhost:8080`
- **Dangerous if Active:** ❌ No
- **Description:** Alternate URL untuk Go engine API (legacy)
- **Usage:** Digunakan di berbagai admin API routes untuk engine control

---

## 5. MARKETING & AI ENGINE

### ⚠️ **KILL SWITCH VARIABLES** - CRITICAL SAFETY

### `MARKETING_LIVE_ENABLED`
- **Type:** Boolean (`true` | `false`)
- **Required:** No
- **Safe Default:** ✅ **`false`** (WAJIB false di production default)
- **Dangerous if Active:** 🚫 **YES - CRITICAL**
- **Description:** Global kill switch untuk marketing live dispatch
- **Behavior:**
  - `false` = DRY-RUN mode (safe, hanya log, tidak kirim ke platform)
  - `true` = LIVE mode (bahaya! akan kirim event ke Facebook/Google/TikTok)
- **Usage:** Digunakan di `app/api/admin/system/confidence/route.ts`, `engine-hub/internal/marketing/adapters/live_config.go`
- **Security Note:** **JANGAN set ke `true` tanpa testing menyeluruh!**

### `MARKETING_DRY_RUN`
- **Type:** Boolean (`true` | `false`)
- **Required:** No
- **Safe Default:** ✅ **`true`** (WAJIB true di production default)
- **Dangerous if Active:** 🚫 **YES** (jika `false`, akan kirim ke platform)
- **Description:** Global dry-run mode untuk marketing dispatch
- **Behavior:**
  - `true` = dry-run (safe, hanya log)
  - `false` = live (bahaya! akan kirim ke platform)
- **Usage:** Digunakan di `app/api/admin/system/confidence/route.ts`, `engine-hub/internal/marketing/adapters/live_config.go`
- **Security Note:** **JANGAN set ke `false` tanpa testing menyeluruh!**

### `MARKETING_LIVE_EVENTS`
- **Type:** String (comma-separated event keys)
- **Required:** No
- **Safe Default:** ✅ Empty string (kosong = allow all jika live enabled)
- **Dangerous if Active:** ⚠️ Moderate (jika live enabled, akan allow events ini)
- **Description:** Event allowlist untuk live mode
- **Example:** `"purchase,add_to_cart"`
- **Usage:** Digunakan di `engine-hub/internal/marketing/adapters/live_config.go`

### `FB_DRY_RUN`
- **Type:** Boolean (`true` | `false`)
- **Required:** No
- **Safe Default:** ✅ **`true`**
- **Dangerous if Active:** 🚫 **YES** (jika `false`, akan kirim ke Facebook)
- **Description:** Per-integration dry-run untuk Facebook
- **Usage:** Digunakan di `engine-hub/internal/marketing/adapters/live_config.go`

### `GA_DRY_RUN`
- **Type:** Boolean (`true` | `false`)
- **Required:** No
- **Safe Default:** ✅ **`true`**
- **Dangerous if Active:** 🚫 **YES** (jika `false`, akan kirim ke Google Ads)
- **Description:** Per-integration dry-run untuk Google Ads
- **Usage:** Digunakan di `engine-hub/internal/marketing/adapters/live_config.go`

### `TIKTOK_DRY_RUN`
- **Type:** Boolean (`true` | `false`)
- **Required:** No
- **Safe Default:** ✅ **`true`**
- **Dangerous if Active:** 🚫 **YES** (jika `false`, akan kirim ke TikTok)
- **Description:** Per-integration dry-run untuk TikTok
- **Usage:** Digunakan di `engine-hub/internal/marketing/adapters/live_config.go`

---

## 6. EMAIL / SMTP

### `SMTP_HOST`
- **Type:** String (SMTP server hostname)
- **Required:** No (optional, hanya jika fitur email aktif)
- **Safe Default:** ✅ `smtp.gmail.com` (contoh)
- **Dangerous if Active:** ❌ No
- **Description:** SMTP server hostname
- **Usage:** Digunakan di `lib/mailer.ts`

### `SMTP_PORT`
- **Type:** Number (port)
- **Required:** No (default: `587`)
- **Safe Default:** ✅ `587`
- **Dangerous if Active:** ❌ No
- **Description:** SMTP server port
- **Usage:** Digunakan di `lib/mailer.ts`

### `SMTP_USER`
- **Type:** String (email address)
- **Required:** No (optional, hanya jika fitur email aktif)
- **Safe Default:** ❌ No (harus diisi jika menggunakan email)
- **Dangerous if Active:** ❌ No
- **Description:** SMTP username (email address)
- **Usage:** Digunakan di `lib/mailer.ts`
- **Security Note:** Jangan commit nilai ini!

### `SMTP_PASS`
- **Type:** String (password/app password)
- **Required:** No (optional, hanya jika fitur email aktif)
- **Safe Default:** ❌ No (harus diisi jika menggunakan email)
- **Dangerous if Active:** ❌ No
- **Description:** SMTP password atau app password
- **Usage:** Digunakan di `lib/mailer.ts`
- **Security Note:** **CRITICAL** - Jangan commit nilai ini!

### `SMTP_SECURE`
- **Type:** Boolean (`true` | `false`)
- **Required:** No (default: `false`, atau `true` jika port 465)
- **Safe Default:** ✅ `false` (untuk port 587)
- **Dangerous if Active:** ❌ No
- **Description:** Use TLS/SSL untuk SMTP connection
- **Usage:** Digunakan di `lib/mailer.ts`

### `EMAIL_FROM`
- **Type:** String (email address)
- **Required:** No (default: akan menggunakan `SMTP_USER`)
- **Safe Default:** ✅ Auto-fallback ke `SMTP_USER`
- **Dangerous if Active:** ❌ No
- **Description:** From address untuk email
- **Usage:** Digunakan di `lib/mailer.ts`

---

## 7. THIRD-PARTY SERVICES (MARKETING / TRACKING)

### `NEXT_PUBLIC_FACEBOOK_PIXEL_ID`
- **Type:** String (Facebook Pixel ID)
- **Required:** No (optional)
- **Safe Default:** ✅ Empty string
- **Dangerous if Active:** ❌ No (hanya tracking, tidak berbahaya)
- **Description:** Facebook Pixel ID untuk tracking
- **Usage:** Digunakan di `components/MarketingPixels.tsx`, `app/api/marketing/settings/route.ts`
- **Note:** `NEXT_PUBLIC_*` variables exposed ke client-side

### `NEXT_PUBLIC_GOOGLE_ADS_ID`
- **Type:** String (Google Ads Conversion ID)
- **Required:** No (optional)
- **Safe Default:** ✅ Empty string
- **Dangerous if Active:** ❌ No (hanya tracking, tidak berbahaya)
- **Description:** Google Ads Conversion ID
- **Usage:** Digunakan di `app/api/marketing/settings/route.ts`

### `NEXT_PUBLIC_GA4_ID`
- **Type:** String (Google Analytics 4 ID)
- **Required:** No (optional)
- **Safe Default:** ✅ Empty string
- **Dangerous if Active:** ❌ No (hanya tracking, tidak berbahaya)
- **Description:** Google Analytics 4 ID
- **Usage:** Digunakan di `components/MarketingPixels.tsx`, `app/api/marketing/settings/route.ts`

### `NEXT_PUBLIC_TIKTOK_PIXEL_ID`
- **Type:** String (TikTok Pixel ID)
- **Required:** No (optional)
- **Safe Default:** ✅ Empty string
- **Dangerous if Active:** ❌ No (hanya tracking, tidak berbahaya)
- **Description:** TikTok Pixel ID untuk tracking
- **Usage:** Digunakan di `app/api/marketing/settings/route.ts`

---

## 8. IMAGE GENERATION APIs

### `PEXELS_API_KEY`
- **Type:** String (API key)
- **Required:** No (optional)
- **Safe Default:** ✅ Empty string
- **Dangerous if Active:** ❌ No (hanya untuk generate images)
- **Description:** Pexels API key untuk image generation
- **Usage:** Digunakan di `app/api/admin/image-api-keys/route.ts`
- **Security Note:** Jangan commit nilai ini!

### `PIXABAY_API_KEY`
- **Type:** String (API key)
- **Required:** No (optional)
- **Safe Default:** ✅ Empty string
- **Dangerous if Active:** ❌ No
- **Description:** Pixabay API key
- **Usage:** Digunakan di `app/api/admin/image-api-keys/route.ts`
- **Security Note:** Jangan commit nilai ini!

### `UNSPLASH_ACCESS_KEY`
- **Type:** String (API key)
- **Required:** No (optional)
- **Safe Default:** ✅ Empty string
- **Dangerous if Active:** ❌ No
- **Description:** Unsplash Access Key
- **Usage:** Digunakan di `app/api/admin/image-api-keys/route.ts`
- **Security Note:** Jangan commit nilai ini!

### `STABLE_DIFFUSION_API_KEY`
- **Type:** String (API key)
- **Required:** No (optional)
- **Safe Default:** ✅ Empty string
- **Dangerous if Active:** ❌ No
- **Description:** Stable Diffusion API key
- **Usage:** Digunakan di `app/api/admin/image-api-keys/route.ts`
- **Security Note:** Jangan commit nilai ini!

### `LEONARDO_API_KEY`
- **Type:** String (API key)
- **Required:** No (optional)
- **Safe Default:** ✅ Empty string
- **Dangerous if Active:** ❌ No
- **Description:** Leonardo AI API key
- **Usage:** Digunakan di `app/api/admin/image-api-keys/route.ts`
- **Security Note:** Jangan commit nilai ini!

---

## 9. INTERNAL SERVICES

### `INTERNAL_EVENT_KEY`
- **Type:** String (random secret)
- **Required:** No (optional, hanya jika menggunakan engine-hub)
- **Safe Default:** ❌ No (harus di-generate jika menggunakan engine-hub)
- **Dangerous if Active:** ⚠️ Moderate (jika tidak di-set, engine-hub communication akan fail)
- **Description:** API key untuk internal event communication (engine-hub ↔ Next.js)
- **Generate:** `openssl rand -base64 32`
- **Usage:** Digunakan di `app/api/internal/events/log/route.ts`, `engine-hub/internal/marketing/emitter.go`
- **Security Note:** Jangan commit nilai ini!

---

## 10. WHATSAPP INTEGRATION

### `NEXT_PUBLIC_WHATSAPP_NUMBER`
- **Type:** String (phone number)
- **Required:** No (optional)
- **Safe Default:** ✅ Empty string
- **Dangerous if Active:** ❌ No
- **Description:** WhatsApp number untuk CTA button (format: 6281234567890)
- **Usage:** Digunakan di `components/WhatsAppCTA.tsx`
- **Note:** `NEXT_PUBLIC_*` variables exposed ke client-side

---

## 11. TESTING (Development Only)

### ⚠️ **JANGAN gunakan di production!**

### `TEST_ADMIN_EMAIL`
- **Type:** String (email)
- **Required:** No (hanya untuk development/testing)
- **Safe Default:** ✅ `admin@tokotanionline.com` (contoh)
- **Dangerous if Active:** ⚠️ **YES** (jika digunakan di production, security risk)
- **Description:** Test admin email untuk smoke tests
- **Usage:** Digunakan di `scripts/smoke-admin-api.ts`
- **Security Note:** **JANGAN gunakan di production!**

### `TEST_ADMIN_PASSWORD`
- **Type:** String (password)
- **Required:** No (hanya untuk development/testing)
- **Safe Default:** ✅ `admin123` (contoh, tidak aman!)
- **Dangerous if Active:** 🚫 **YES** (jika digunakan di production, security risk)
- **Description:** Test admin password untuk smoke tests
- **Usage:** Digunakan di `scripts/smoke-admin-api.ts`
- **Security Note:** **JANGAN gunakan di production!**

---

## 12. AUTO-SET VARIABLES

Variabel berikut di-set otomatis oleh platform/runtime, **tidak perlu di-set manual:**

### `VERCEL_URL`
- **Auto-set oleh:** Vercel (jika deploy di Vercel)
- **Description:** Vercel deployment URL
- **Usage:** Digunakan sebagai fallback untuk `NEXT_PUBLIC_BASE_URL`

### `NEXT_RUNTIME`
- **Auto-set oleh:** Next.js
- **Values:** `nodejs` | `edge`
- **Description:** Next.js runtime mode
- **Usage:** Digunakan di `instrumentation.ts`

---

## 🔒 SECURITY CHECKLIST

Sebelum deploy ke production, pastikan:

- ✅ `NODE_ENV=production`
- ✅ `NEXTAUTH_SECRET` di-set dengan nilai random yang kuat (32+ characters)
- ✅ `DATABASE_URL` di-set dengan connection string production
- ✅ `MARKETING_LIVE_ENABLED=false` (atau `true` hanya setelah testing menyeluruh)
- ✅ `MARKETING_DRY_RUN=true` (atau `false` hanya setelah testing menyeluruh)
- ✅ Semua API keys di-set dengan nilai production
- ✅ SMTP credentials di-set dengan nilai production
- ✅ `INTERNAL_EVENT_KEY` di-set dengan nilai random yang kuat (jika menggunakan engine-hub)
- ✅ `NEXT_PUBLIC_BASE_URL` dan `NEXT_PUBLIC_SITE_URL` di-set ke domain production
- ✅ Semua `NEXT_PUBLIC_*` variables di-set sesuai kebutuhan
- ✅ **TIDAK ada** `TEST_ADMIN_EMAIL` atau `TEST_ADMIN_PASSWORD` di production

---

## 📝 NOTES

1. **`NEXT_PUBLIC_*` Variables:** Variables dengan prefix `NEXT_PUBLIC_` akan di-expose ke client-side (browser). Jangan simpan secrets di sini!

2. **Marketing Kill Switch:** Variables `MARKETING_LIVE_ENABLED` dan `MARKETING_DRY_RUN` adalah **critical safety controls**. Default harus `false` dan `true` masing-masing.

3. **Database Connection:** `DATABASE_URL` adalah **REQUIRED**. Aplikasi tidak akan bisa jalan tanpa ini.

4. **Secrets:** Jangan commit secrets (passwords, API keys, tokens) ke repository. Gunakan environment variables atau secret management service.

5. **Production vs Development:** Beberapa variables memiliki behavior berbeda di production vs development (misalnya error handling, logging).

---

## 🔗 RELATED FILES

- `.env.example` - Template file dengan default values
- `lib/auth.ts` - Authentication configuration
- `lib/db.ts` - Database connection
- `lib/mailer.ts` - Email configuration
- `app/api/admin/system/confidence/route.ts` - Marketing kill switch logic
- `engine-hub/internal/marketing/adapters/live_config.go` - Go engine live config

---

**Last Updated:** 2026-01-09  
**Version:** 1.0
