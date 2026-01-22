# FASE 7.2 — VPS DEPLOYMENT GUIDE

## 📋 Overview

This directory contains systemd service files and deployment scripts for production VPS deployment.

## 🔧 Systemd Services

### 1. Next.js Application (`tokotani-nextjs.service`)

- **Port:** 3000
- **User:** www-data
- **Auto-restart:** Yes (on failure)
- **Logs:** systemd journal

### 2. Go Engine Hub (`tokotani-engine-hub.service`)

- **Port:** 8090
- **User:** www-data
- **Auto-restart:** Yes (on failure)
- **Logs:** systemd journal

## 🚀 Quick Setup

### Step 1: Install Services

```bash
sudo bash deploy/systemd-setup.sh
```

### Step 2: Configure Environment Variables

**CRITICAL:** Set all required environment variables in systemd override files:

```bash
# Edit Next.js service ENV
sudo nano /etc/systemd/system/tokotani-nextjs.service.d/override.conf

# Edit Engine Hub service ENV
sudo nano /etc/systemd/system/tokotani-engine-hub.service.d/override.conf
```

**Required ENV vars:**

**Next.js:**
- `DATABASE_URL` - PostgreSQL connection string
- `NEXTAUTH_SECRET` - NextAuth secret (min 32 chars)
- `NEXTAUTH_URL` - Public URL (e.g., https://yourdomain.com)
- `OPENAI_API_KEY` - OpenAI API key (if using AI)
- `ENGINE_HUB_URL` - Engine hub URL (default: http://localhost:8090)

**Engine Hub:**
- `OPENAI_API_KEY` - OpenAI API key (CRITICAL - server won't start without this)
- `DATABASE_URL` - PostgreSQL connection string (if using database features)
- `ENV=production` - Already set in service file

### Step 3: Build Go Binary

```bash
cd engine-hub
go build -o bin/server cmd/server/main.go
```

### Step 4: Enable & Start Services

```bash
# Enable services (start on boot)
sudo systemctl enable tokotani-nextjs
sudo systemctl enable tokotani-engine-hub

# Start services
sudo systemctl start tokotani-nextjs
sudo systemctl start tokotani-engine-hub
```

### Step 5: Verify

```bash
# Check status
sudo systemctl status tokotani-nextjs
sudo systemctl status tokotani-engine-hub

# Check health endpoints
curl http://localhost:3000/api/health
curl http://localhost:8090/health

# View logs
sudo journalctl -u tokotani-nextjs -f
sudo journalctl -u tokotani-engine-hub -f
```

## 📝 Service Management

### Start/Stop/Restart

```bash
sudo systemctl start tokotani-nextjs
sudo systemctl stop tokotani-nextjs
sudo systemctl restart tokotani-nextjs

sudo systemctl start tokotani-engine-hub
sudo systemctl stop tokotani-engine-hub
sudo systemctl restart tokotani-engine-hub
```

### View Logs

```bash
# Real-time logs
sudo journalctl -u tokotani-nextjs -f
sudo journalctl -u tokotani-engine-hub -f

# Last 100 lines
sudo journalctl -u tokotani-nextjs -n 100
sudo journalctl -u tokotani-engine-hub -n 100

# Logs since today
sudo journalctl -u tokotani-nextjs --since today
```

### Check Status

```bash
sudo systemctl status tokotani-nextjs
sudo systemctl status tokotani-engine-hub
```

## 🔒 Security Notes

1. **Environment Variables:** Never commit `override.conf` files to git
2. **File Permissions:** Services run as `www-data` user (non-root)
3. **Logs:** All logs go to systemd journal (no file permissions needed)
4. **Restart Policy:** Services auto-restart on failure (max 10s delay)

## ⚠️ Troubleshooting

### Service fails to start

1. Check logs: `sudo journalctl -u tokotani-nextjs -n 50`
2. Verify ENV vars: `sudo systemctl show tokotani-nextjs | grep Environment`
3. Check file permissions: `ls -la /opt/tokotani-online-nextjs`

### Port already in use

```bash
# Check what's using the port
sudo lsof -i :3000
sudo lsof -i :8090

# Kill process if needed
sudo kill -9 <PID>
```

### Database connection errors

- Verify `DATABASE_URL` is set correctly
- Check PostgreSQL is running: `sudo systemctl status postgresql`
- Test connection: `psql $DATABASE_URL`

## 📚 Related Documentation

- [FASE 7.1 - ENV Production Lock](../FASE-7-ENV-PRODUCTION-LOCK.md)
- [FASE 7.3 - Health Check](../FASE-7-HEALTH-CHECK.md)
- [FASE 7.4 - Logging & Rotation](../FASE-7-LOGGING.md)
