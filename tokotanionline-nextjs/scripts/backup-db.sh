#!/bin/bash

# PHASE H — Database Backup Script
# 
# Purpose: Manual dump sebelum launch
# 
# Usage:
#   ./scripts/backup-db.sh [output-file]
#
# Output: SQL dump file dengan timestamp

set -e

# PHASE H: Get database URL from environment
if [ -z "$DATABASE_URL" ]; then
  echo "Error: DATABASE_URL environment variable not set"
  exit 1
fi

# PHASE H: Generate backup filename
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
OUTPUT_FILE="${1:-backup_${TIMESTAMP}.sql}"

# PHASE H: Extract database connection details
# Format: postgresql://user:password@host:port/database
DB_URL="$DATABASE_URL"

# PHASE H: Run pg_dump
echo "Creating database backup..."
pg_dump "$DB_URL" > "$OUTPUT_FILE"

# PHASE H: Compress backup (optional)
if command -v gzip &> /dev/null; then
  echo "Compressing backup..."
  gzip "$OUTPUT_FILE"
  OUTPUT_FILE="${OUTPUT_FILE}.gz"
fi

echo "Backup created: $OUTPUT_FILE"
echo "File size: $(du -h "$OUTPUT_FILE" | cut -f1)"
