# FASE 7.4 — LOGGING & ROTATION

## 📋 Overview

Production-grade logging system with automatic rotation to prevent disk space issues.

## 📁 Log Structure

### Application Logs (`/opt/tokotani-online-nextjs/logs/`)

- `info.log` - Informational messages
- `warn.log` - Warnings
- `error.log` - Errors
- `engine.log` - Engine-specific logs
- `scheduler.log` - Scheduler-specific logs
- `nextjs.log` - Next.js application logs

### Engine Hub Logs (`/opt/tokotani-online-nextjs/engine-hub/logs/`)

- `engine.log` - Engine operations
- `scheduler.log` - Scheduler operations
- `error.log` - Errors
- `server.log` - Server logs

## 🔄 Log Rotation

### Automatic Rotation

Logs are rotated:
- **By size:** When log file exceeds 100MB
- **By time:** Daily rotation (via cron/Task Scheduler)
- **Retention:** Keep last 30 days of logs

### Rotation Scripts

**Linux:**
```bash
# Manual rotation
bash scripts/log-rotation.sh

# Add to cron (daily at midnight)
0 0 * * * /opt/tokotani-online-nextjs/scripts/log-rotation.sh
```

**Windows:**
```powershell
# Manual rotation
.\scripts\log-rotation.ps1

# Add to Task Scheduler (daily at 00:00)
```

### Rotation Behavior

1. **Size-based:** If log > 100MB, rotate immediately
2. **Time-based:** Rotate daily at midnight
3. **Compression:** Old logs (> 1 day) are compressed with gzip
4. **Cleanup:** Compressed logs older than 30 days are deleted

## 📝 Usage

### In Code

```typescript
import { productionLogger, engineLogger, schedulerLogger } from '@/lib/production-logger';

// General logging
productionLogger.info('User logged in', { userId: '123' });
productionLogger.warn('Rate limit approaching', { remaining: 10 });
productionLogger.error('Database connection failed', error, { query: 'SELECT *' });

// Engine logging
engineLogger.log('Content generation started', { jobId: 'abc' });

// Scheduler logging
schedulerLogger.log('Scheduler run completed', { itemsCreated: 5 });
```

### Log Format

**JSON Format (structured logs):**
```json
{
  "timestamp": "2026-01-13T10:30:00.000Z",
  "level": "error",
  "message": "Database connection failed",
  "context": {
    "query": "SELECT * FROM users",
    "userId": "123"
  },
  "error": {
    "message": "Connection timeout",
    "stack": "..."
  }
}
```

**Text Format (engine/scheduler logs):**
```
[2026-01-13T10:30:00.000Z] [ENGINE] Content generation started {"jobId":"abc"}
```

## 🔒 Security

- **Sensitive Data Redaction:** Passwords, tokens, API keys are automatically redacted
- **File Permissions:** Logs are writable by service user only
- **No Public Access:** Logs are not exposed via web

## 📊 Monitoring

### View Logs

**Linux (systemd):**
```bash
# Application logs
sudo journalctl -u tokotani-nextjs -f

# Engine hub logs
sudo journalctl -u tokotani-engine-hub -f

# File logs
tail -f /opt/tokotani-online-nextjs/logs/error.log
```

**Windows:**
```powershell
# View logs
Get-Content logs\error.log -Tail 50 -Wait
```

### Log Analysis

```bash
# Count errors in last hour
grep -c "ERROR" logs/error.log

# Find specific error
grep "Database connection" logs/error.log

# View recent engine logs
tail -n 100 logs/engine.log
```

## ⚠️ Troubleshooting

### Logs Not Rotating

1. Check script permissions: `chmod +x scripts/log-rotation.sh`
2. Verify cron is running: `systemctl status cron`
3. Check disk space: `df -h`

### Logs Growing Too Fast

1. Reduce log verbosity in production
2. Adjust rotation size threshold
3. Reduce retention period

### Permission Errors

```bash
# Fix log directory permissions
sudo chown -R www-data:www-data /opt/tokotani-online-nextjs/logs
sudo chmod 755 /opt/tokotani-online-nextjs/logs
```

## 📚 Related Documentation

- [FASE 7.2 - Service Management](../deploy/README.md)
- [FASE 7.5 - File Permissions](./FASE-7-PERMISSIONS.md)
