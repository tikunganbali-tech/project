#!/bin/bash
# FASE 7.4 — LOG ROTATION SCRIPT
#
# Rotates log files daily or by size
# Run via cron: 0 0 * * * /opt/tokotani-online-nextjs/scripts/log-rotation.sh
#
# Configuration:
#   - Keep last 30 days of logs
#   - Rotate if file > 100MB
#   - Compress old logs

set -e

LOG_DIR="${LOG_DIR:-/opt/tokotani-online-nextjs/logs}"
ENGINE_LOG_DIR="${ENGINE_LOG_DIR:-/opt/tokotani-online-nextjs/engine-hub/logs}"
MAX_SIZE_MB=100
KEEP_DAYS=30

echo "🔄 FASE 7.4 — Rotating logs..."

# Function to rotate a log file
rotate_log() {
    local logfile="$1"
    local max_size_bytes=$((MAX_SIZE_MB * 1024 * 1024))
    
    if [ ! -f "$logfile" ]; then
        return 0
    fi
    
    local size=$(stat -f%z "$logfile" 2>/dev/null || stat -c%s "$logfile" 2>/dev/null || echo 0)
    
    # Rotate if file is too large
    if [ "$size" -gt "$max_size_bytes" ]; then
        local timestamp=$(date +%Y%m%d-%H%M%S)
        mv "$logfile" "${logfile}.${timestamp}"
        touch "$logfile"
        echo "✅ Rotated (size): $logfile -> ${logfile}.${timestamp}"
    fi
}

# Function to compress and clean old logs
clean_old_logs() {
    local dir="$1"
    
    if [ ! -d "$dir" ]; then
        return 0
    fi
    
    # Compress logs older than 1 day
    find "$dir" -name "*.log.*" -type f -mtime +1 ! -name "*.gz" -exec gzip {} \;
    
    # Delete compressed logs older than KEEP_DAYS
    find "$dir" -name "*.log.*.gz" -type f -mtime +$KEEP_DAYS -delete
    
    echo "✅ Cleaned old logs in: $dir"
}

# Create log directories if they don't exist
mkdir -p "$LOG_DIR"
mkdir -p "$ENGINE_LOG_DIR"

# Rotate application logs
echo "📋 Rotating application logs..."
rotate_log "$LOG_DIR/engine.log"
rotate_log "$LOG_DIR/scheduler.log"
rotate_log "$LOG_DIR/error.log"
rotate_log "$LOG_DIR/nextjs.log"

# Rotate engine hub logs
echo "📋 Rotating engine hub logs..."
rotate_log "$ENGINE_LOG_DIR/engine.log"
rotate_log "$ENGINE_LOG_DIR/scheduler.log"
rotate_log "$ENGINE_LOG_DIR/error.log"
rotate_log "$ENGINE_LOG_DIR/server.log"

# Clean old logs
echo "🧹 Cleaning old logs..."
clean_old_logs "$LOG_DIR"
clean_old_logs "$ENGINE_LOG_DIR"

echo "✅ Log rotation complete!"
