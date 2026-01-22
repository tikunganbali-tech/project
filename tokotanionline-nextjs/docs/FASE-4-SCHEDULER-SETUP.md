# FASE 4 — SCHEDULER & AUTOMATION — SETUP GUIDE

## 📌 Overview

Scheduler automation untuk konten terbit otomatis (3–5/hari) menggunakan engine & AI yang sudah ada, dengan kontrol admin ON/OFF.

## 🧱 Prinsip Wajib

- ✅ Semua berjalan server-side
- ✅ Deterministik (jadwal & kuota jelas)
- ✅ VPS-friendly (systemd/cron/worker)
- ✅ Fail-fast & logging jelas
- ❌ Tidak ada AI di admin
- ❌ Tidak ada batch liar
- ❌ Tidak ada cron di frontend

## 📦 Database Setup

1. **Run migration untuk menambahkan tabel baru:**
   ```bash
   npx prisma db push
   # atau
   npx prisma migrate dev --name add_scheduler_tables
   ```

2. **Verify tables created:**
   - `SchedulerConfig` - Konfigurasi scheduler
   - `SchedulerRun` - Log setiap run

## ⚙️ Environment Variables

Tambahkan ke `.env`:

```env
# Scheduler Service Token (untuk internal API calls)
SCHEDULER_SERVICE_TOKEN=scheduler-internal-token-change-in-production

# API Base URL (untuk worker)
NEXT_PUBLIC_API_URL=http://localhost:3000
# atau untuk production:
# NEXT_PUBLIC_API_URL=https://yourdomain.com

# Engine Hub URL (sudah ada)
ENGINE_HUB_URL=http://localhost:8090
# atau
GO_ENGINE_API_URL=http://localhost:8090

# AI API Key (sudah ada)
OPENAI_API_KEY=your-key-here
# atau
AI_API_KEY=your-key-here

# DRY_RUN mode (optional, untuk testing)
DRY_RUN=false
```

## 🔧 Worker Setup

### Option 1: Cron (Recommended untuk VPS)

1. **Buat cron job yang menjalankan worker setiap 15 menit:**
   ```bash
   crontab -e
   ```

2. **Tambahkan baris berikut:**
   ```cron
   */15 * * * * cd /path/to/tokotanionline-nextjs && npx tsx scripts/scheduler-worker.ts >> /var/log/scheduler-worker.log 2>&1
   ```

3. **Atau gunakan script wrapper untuk logging yang lebih baik:**
   ```bash
   # Buat file: scripts/run-scheduler-worker.sh
   #!/bin/bash
   cd /path/to/tokotanionline-nextjs
   export NODE_ENV=production
   export DRY_RUN=false
   npx tsx scripts/scheduler-worker.ts >> /var/log/scheduler-worker.log 2>&1
   ```

   ```cron
   */15 * * * * /path/to/tokotanionline-nextjs/scripts/run-scheduler-worker.sh
   ```

### Option 2: Systemd Service (Recommended untuk production)

1. **Buat service file:** `/etc/systemd/system/scheduler-worker.service`
   ```ini
   [Unit]
   Description=Scheduler Worker for Content Automation
   After=network.target

   [Service]
   Type=oneshot
   User=www-data
   WorkingDirectory=/path/to/tokotanionline-nextjs
   Environment="NODE_ENV=production"
   Environment="DRY_RUN=false"
   ExecStart=/usr/bin/npx tsx scripts/scheduler-worker.ts
   StandardOutput=journal
   StandardError=journal

   [Install]
   WantedBy=multi-user.target
   ```

2. **Buat timer file:** `/etc/systemd/system/scheduler-worker.timer`
   ```ini
   [Unit]
   Description=Run scheduler worker every 15 minutes
   Requires=scheduler-worker.service

   [Timer]
   OnCalendar=*:0/15
   Persistent=true

   [Install]
   WantedBy=timers.target
   ```

3. **Enable dan start:**
   ```bash
   sudo systemctl daemon-reload
   sudo systemctl enable scheduler-worker.timer
   sudo systemctl start scheduler-worker.timer
   sudo systemctl status scheduler-worker.timer
   ```

### Option 3: Manual Testing

```bash
# Run sekali untuk test
npx tsx scripts/scheduler-worker.ts

# Dengan DRY_RUN mode
DRY_RUN=true npx tsx scripts/scheduler-worker.ts
```

## 🎛️ Admin Configuration

1. **Akses admin panel:** `/admin/scheduler`

2. **Enable scheduler:**
   - Klik "Turn ON" untuk mengaktifkan scheduler
   - Scheduler akan mulai bekerja setelah worker dijalankan

3. **Configure settings:**
   - **Daily Quota:** 3-5 (recommended)
   - **Time Windows:** Array of time ranges, e.g., `["09:00-12:00", "14:00-17:00", "19:00-21:00"]`
   - Default: `["09:00-21:00"]`

4. **Monitor status:**
   - Today's count
   - Quota remaining
   - Last run time
   - Recent runs log

## 📊 Monitoring & Logging

### Logs Location

- **Worker logs:** `/var/log/scheduler-worker.log` (jika menggunakan cron)
- **Systemd logs:** `journalctl -u scheduler-worker.service`
- **Database logs:** Tabel `SchedulerRun` menyimpan semua run history

### Check Status

```bash
# Via admin panel
curl http://localhost:3000/api/admin/scheduler/status

# Check recent runs
curl http://localhost:3000/api/admin/scheduler/runs?limit=10
```

### Debugging

1. **Enable DRY_RUN mode:**
   ```env
   DRY_RUN=true
   ```

2. **Check worker logs:**
   ```bash
   tail -f /var/log/scheduler-worker.log
   ```

3. **Check database:**
   ```bash
   npx prisma studio
   # Navigate to SchedulerRun table
   ```

## 🔒 Safety Features

1. **Rate Limiting:**
   - Daily quota enforcement
   - Tidak akan melebihi quota yang ditetapkan

2. **Non-Overlap:**
   - Hanya satu job yang berjalan pada satu waktu
   - Worker akan skip jika ada job yang sedang running

3. **Time Window:**
   - Hanya berjalan dalam time window yang ditentukan
   - Skip jika di luar window

4. **Fail-Fast:**
   - Jika AI generation gagal, job langsung fail
   - Tidak ada retry otomatis (manual retry via admin)

5. **Validation:**
   - Content harus pass normalizer & validator
   - Jika gagal, job di-mark sebagai failed

## 🚨 Troubleshooting

### Worker tidak jalan

1. Check cron/systemd status
2. Check environment variables
3. Check logs
4. Verify database connection

### Scheduler enabled tapi tidak generate konten

1. Check time window (apakah dalam waktu yang benar?)
2. Check daily quota (apakah sudah habis?)
3. Check worker logs untuk error
4. Verify `SCHEDULER_SERVICE_TOKEN` sama di worker dan API

### Content generation failed

1. Check Go engine hub status
2. Check AI API key
3. Check validation errors di log
4. Check database untuk error details

## ✅ Verification Checklist

- [ ] Database tables created (`SchedulerConfig`, `SchedulerRun`)
- [ ] Environment variables set
- [ ] Worker script dapat dijalankan manual
- [ ] Cron/systemd service configured
- [ ] Admin panel dapat akses `/admin/scheduler`
- [ ] Toggle ON/OFF berfungsi
- [ ] Settings dapat diupdate
- [ ] Status view menampilkan data benar
- [ ] Worker generate konten saat enabled
- [ ] Logs tercatat di database
- [ ] Rate limiting bekerja (tidak melebihi quota)
- [ ] Time window enforcement bekerja

## 📝 Notes

- Worker harus dijalankan secara teratur (recommended: setiap 15 menit)
- Konten yang di-generate akan berstatus `DRAFT` (tidak auto-publish)
- Admin harus review dan publish manual
- Scheduler tidak akan generate jika:
  - Disabled di admin
  - Di luar time window
  - Daily quota sudah habis
  - Ada job yang sedang running
