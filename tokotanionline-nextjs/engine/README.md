# E1.3 — HARD ISOLATION ENGINE

## 🎯 TUJUAN

Engine SEO **TIDAK PERNAH** mem-block UI Admin, tidak ikut lifecycle render, tidak ikut hydration, tidak ikut bundle frontend.

## 📁 STRUKTUR

```
/engine
  ├─ runner.ts        # Entry point - standalone Node.js process
  ├─ queue.ts         # Queue manager (file-based)
  ├─ analytics.ts     # Analytics writer (batch, async, delayed)
  ├─ storage/         # File storage untuk komunikasi
  │  ├─ health.json   # Engine health status
  │  ├─ status.json   # Engine status details
  │  ├─ queue.json    # Task queue
  │  └─ analytics.json # Analytics data
  └─ ecosystem.config.js # PM2 config untuk production
```

## 🚀 MENJALANKAN ENGINE

### Development

```bash
npm run engine:start
```

atau langsung:

```bash
tsx engine/runner.ts
```

### Production (PM2)

```bash
# Start
npm run engine:pm2

# Stop
npm run engine:pm2:stop

# Restart
npm run engine:pm2:restart
```

atau langsung:

```bash
pm2 start engine/ecosystem.config.js --name seo-engine
```

## 🔒 HARD ISOLATION RULES

### ❌ FORBIDDEN

Engine **TIDAK BOLEH**:
- Di-import di `app/`
- Di-import di `pages/`
- Di-import di `components/`
- Di-trigger dari React lifecycle
- Di-import di API routes (hanya baca file storage)

### ✅ ALLOWED

Engine **HANYA BOLEH**:
- Jalan sebagai Node.js process terpisah
- Baca/tulis dari `engine/storage/`
- Komunikasi via file-based storage

## 📡 KOMUNIKASI ENGINE ↔ ADMIN

### Pola Komunikasi

```
ENGINE → storage/*.json (write)
ADMIN  → /api/admin/engine/* (read-only, fetch from storage)
```

### File Storage

- `health.json` - Engine health status (ON/OFF, last run, last success)
- `status.json` - Detailed engine status
- `queue.json` - Task queue (admin menulis, engine membaca)
- `analytics.json` - Analytics data (batch, async, delayed)

### API Endpoints (Read-Only)

- `GET /api/admin/engine/health` - Engine health check
- `GET /api/admin/engine/stats` - Engine statistics
- `GET /api/admin/engine/queue` - Queue status
- `POST /api/admin/engine/queue` - Add task to queue
- `GET /api/admin/engine/analytics` - Analytics data

## 📊 HEALTH CHECK

Health check mengembalikan:

```json
{
  "engine": "idle" | "running" | "offline",
  "lastRun": "2026-01-03T01:12:00",
  "lastSuccess": "2026-01-03T01:10:00",
  "status": "ok" | "error" | "offline",
  "uptime": 1234567,
  "version": "1.0.0"
}
```

## 🔄 QUEUE SYSTEM

### Menambahkan Task ke Queue

```bash
POST /api/admin/engine/queue
{
  "engineName": "programmatic_seo",
  "taskType": "generate_pages",
  "params": { "limit": 20 },
  "priority": 10
}
```

Engine akan membaca queue setiap 30 detik dan execute tasks.

## 📈 ANALYTICS

Analytics ditulis secara:
- **Batch** - Buffer events, flush setiap 1 menit atau 100 events
- **Async** - Non-blocking write
- **Delayed** - Tidak realtime

Admin membaca dari `/api/admin/engine/analytics` (ISR, revalidate 10 menit).

## 🛡️ BUILD PROTECTION

`next.config.mjs` memiliki webpack alias yang mem-block engine imports:

```javascript
config.resolve.alias = {
  '@/engine': false,
  '@/lib/seo-engine/controller': false,
  '@/lib/seo-engine/executor': false,
  '@/lib/seo-engine/scheduler': false,
};
```

Jika engine tidak sengaja ter-import di app/, build **HARUS FAIL**.

## ✅ VERIFIKASI ISOLATION

1. **Build Check**: `npm run build` harus SUCCESS tanpa engine imports di app/
2. **Runtime Check**: Admin UI tidak import engine modules
3. **Process Check**: Engine jalan sebagai process terpisah
4. **Communication Check**: Admin hanya baca dari file storage via API

## 📝 CATATAN PENTING

- Engine tidak tahu Next.js hidup atau mati
- Next.js tidak tahu engine hidup atau mati
- Komunikasi hanya via file storage
- Admin UI = static/ISR, tidak SSR realtime
- Analytics = batch, async, delayed







