#!/bin/bash

# PHASE H — Media Backup Script
# 
# Purpose: Snapshot folder media sebelum launch
# 
# Usage:
#   ./scripts/backup-media.sh [output-dir]
#
# Output: Tar archive dengan semua media files

set -e

# PHASE H: Generate backup directory name
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
OUTPUT_DIR="${1:-media_backup_${TIMESTAMP}}"

# PHASE H: Media directories to backup
MEDIA_DIRS=(
  "public/images"
  "public/uploads"
)

# PHASE H: Create backup directory
mkdir -p "$OUTPUT_DIR"

# PHASE H: Copy media files
for dir in "${MEDIA_DIRS[@]}"; do
  if [ -d "$dir" ]; then
    echo "Backing up $dir..."
    cp -r "$dir" "$OUTPUT_DIR/"
  else
    echo "Warning: Directory $dir does not exist, skipping..."
  fi
done

# PHASE H: Create tar archive
ARCHIVE_NAME="${OUTPUT_DIR}.tar.gz"
echo "Creating archive..."
tar -czf "$ARCHIVE_NAME" "$OUTPUT_DIR"

# PHASE H: Cleanup temporary directory
rm -rf "$OUTPUT_DIR"

echo "Media backup created: $ARCHIVE_NAME"
echo "File size: $(du -h "$ARCHIVE_NAME" | cut -f1)"
