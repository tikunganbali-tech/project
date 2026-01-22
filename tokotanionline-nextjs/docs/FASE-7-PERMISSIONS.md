# FASE 7.5 — FILE & STORAGE PERMISSIONS

## 📋 Overview

Proper file and folder permissions for production VPS deployment.

## 🔒 Permission Requirements

### Application Directory

**Path:** `/opt/tokotani-online-nextjs`

**Permissions:**
```bash
# Owner: www-data (service user)
# Group: www-data
# Permissions: 755 (drwxr-xr-x)

sudo chown -R www-data:www-data /opt/tokotani-online-nextjs
sudo chmod 755 /opt/tokotani-online-nextjs
```

### Log Directories

**Paths:**
- `/opt/tokotani-online-nextjs/logs`
- `/opt/tokotani-online-nextjs/engine-hub/logs`

**Permissions:**
```bash
# Owner: www-data
# Group: www-data
# Permissions: 755 (directory), 644 (files)

sudo chown -R www-data:www-data /opt/tokotani-online-nextjs/logs
sudo chown -R www-data:www-data /opt/tokotani-online-nextjs/engine-hub/logs
sudo chmod 755 /opt/tokotani-online-nextjs/logs
sudo chmod 755 /opt/tokotani-online-nextjs/engine-hub/logs
```

### Storage Directories

**Paths:**
- `/opt/tokotani-online-nextjs/public/uploads` (AI-generated images)
- `/opt/tokotani-online-nextjs/.next` (Next.js build cache)

**Permissions:**
```bash
# Owner: www-data
# Group: www-data
# Permissions: 755 (directory), 644 (files)

sudo chown -R www-data:www-data /opt/tokotani-online-nextjs/public/uploads
sudo chown -R www-data:www-data /opt/tokotani-online-nextjs/.next
sudo chmod 755 /opt/tokotani-online-nextjs/public/uploads
sudo chmod 755 /opt/tokotani-online-nextjs/.next
```

## 🚫 Security Rules

### ❌ NEVER Use 777 Permissions

**Why:** 777 allows anyone to read/write/execute, which is a security risk.

**Correct:**
```bash
# Directory: 755 (owner: rwx, group: r-x, others: r-x)
chmod 755 directory

# File: 644 (owner: rw-, group: r--, others: r--)
chmod 644 file
```

### ✅ Recommended Permissions

| Type | Permissions | Owner | Group | Description |
|------|-------------|-------|-------|-------------|
| Application dir | 755 | www-data | www-data | Main application directory |
| Log dir | 755 | www-data | www-data | Log files directory |
| Log files | 644 | www-data | www-data | Individual log files |
| Upload dir | 755 | www-data | www-data | User uploads directory |
| Upload files | 644 | www-data | www-data | Uploaded files |
| Config files | 600 | www-data | www-data | Sensitive config (if any) |
| Scripts | 755 | root | root | Executable scripts |

## 📝 Setup Script

### Linux

```bash
#!/bin/bash
# Setup permissions for production

APP_DIR="/opt/tokotani-online-nextjs"
SERVICE_USER="www-data"

# Set ownership
sudo chown -R $SERVICE_USER:$SERVICE_USER $APP_DIR

# Set directory permissions
find $APP_DIR -type d -exec chmod 755 {} \;

# Set file permissions
find $APP_DIR -type f -exec chmod 644 {} \;

# Set executable permissions for scripts
find $APP_DIR/scripts -type f -name "*.sh" -exec chmod 755 {} \;

# Set log directory permissions (writable by service)
chmod 755 $APP_DIR/logs
chmod 755 $APP_DIR/engine-hub/logs

# Set upload directory permissions (writable by service)
chmod 755 $APP_DIR/public/uploads

echo "✅ Permissions set correctly"
```

### Windows

```powershell
# Windows uses ACLs instead of Unix permissions
# Service account should have:
# - Full Control on application directory
# - Read/Write on logs and uploads directories
# - Read/Execute on scripts

$appDir = "C:\opt\tokotani-online-nextjs"
$serviceAccount = "NT AUTHORITY\NETWORK SERVICE"  # Or your service account

# Grant permissions (run as Administrator)
icacls $appDir /grant "${serviceAccount}:(OI)(CI)F" /T
```

## 🔍 Verification

### Check Permissions

```bash
# Check directory permissions
ls -la /opt/tokotani-online-nextjs

# Check log directory
ls -la /opt/tokotani-online-nextjs/logs

# Check upload directory
ls -la /opt/tokotani-online-nextjs/public/uploads

# Verify ownership
stat /opt/tokotani-online-nextjs
```

### Test Write Access

```bash
# Test log write (as service user)
sudo -u www-data touch /opt/tokotani-online-nextjs/logs/test.log
sudo -u www-data rm /opt/tokotani-online-nextjs/logs/test.log

# Test upload write
sudo -u www-data touch /opt/tokotani-online-nextjs/public/uploads/test.txt
sudo -u www-data rm /opt/tokotani-online-nextjs/public/uploads/test.txt
```

## ⚠️ Troubleshooting

### Permission Denied Errors

**Symptom:** Service fails to write logs or uploads

**Fix:**
```bash
# Check current permissions
ls -la /opt/tokotani-online-nextjs/logs

# Fix ownership
sudo chown -R www-data:www-data /opt/tokotani-online-nextjs/logs

# Fix permissions
sudo chmod 755 /opt/tokotani-online-nextjs/logs
```

### Service Can't Read Files

**Symptom:** Service fails to start or read config

**Fix:**
```bash
# Ensure service user can read application files
sudo chown -R www-data:www-data /opt/tokotani-online-nextjs
sudo find /opt/tokotani-online-nextjs -type f -exec chmod 644 {} \;
sudo find /opt/tokotani-online-nextjs -type d -exec chmod 755 {} \;
```

### Upload Directory Not Writable

**Symptom:** AI image generation fails

**Fix:**
```bash
# Make upload directory writable
sudo chown -R www-data:www-data /opt/tokotani-online-nextjs/public/uploads
sudo chmod 755 /opt/tokotani-online-nextjs/public/uploads
```

## 📚 Related Documentation

- [FASE 7.2 - Service Management](./FASE-7-SERVICE-MANAGEMENT.md)
- [FASE 7.4 - Logging](./FASE-7-LOGGING.md)
