/**
 * PHASE D — Media File Utilities
 * 
 * Helper functions untuk file existence check dan path resolution
 * Filesystem = sumber kebenaran
 */

import fs from 'fs';
import path from 'path';

/**
 * PHASE D: Check if file exists on filesystem
 * Filesystem = sumber kebenaran
 * 
 * @param fileUrl - Media URL (e.g., /images/products/abc.jpg)
 * @returns true if file exists, false otherwise
 */
export function fileExists(fileUrl: string): boolean {
  if (!fileUrl || fileUrl.trim() === '') {
    return false;
  }

  try {
    // Remove leading slash and convert to file path
    const relativePath = fileUrl.startsWith('/') ? fileUrl.slice(1) : fileUrl;
    
    // Try multiple path resolution methods
    const basePath = process.cwd();
    const possiblePaths = [
      path.join(basePath, relativePath),
      path.join(basePath, 'public', relativePath),
      path.resolve(basePath, relativePath),
      path.resolve(basePath, 'public', relativePath),
    ];

    for (const filePath of possiblePaths) {
      const normalizedPath = path.normalize(filePath);
      if (fs.existsSync(normalizedPath)) {
        // Verify it's actually a file (not directory)
        try {
          const stats = fs.statSync(normalizedPath);
          if (stats.isFile()) {
            return true;
          }
        } catch {
          // If stat fails, file doesn't exist or not accessible
          continue;
        }
      }
    }

    return false;
  } catch (error) {
    console.error(`[MEDIA-FILE-UTILS] Error checking file existence for ${fileUrl}:`, error);
    return false;
  }
}

/**
 * PHASE D: Resolve file path from URL
 * 
 * @param fileUrl - Media URL (e.g., /images/products/abc.jpg)
 * @returns Absolute file path if exists, null otherwise
 */
export function resolveFilePath(fileUrl: string): string | null {
  if (!fileUrl || fileUrl.trim() === '') {
    return null;
  }

  try {
    const relativePath = fileUrl.startsWith('/') ? fileUrl.slice(1) : fileUrl;
    const basePath = process.cwd();
    const possiblePaths = [
      path.join(basePath, relativePath),
      path.join(basePath, 'public', relativePath),
      path.resolve(basePath, relativePath),
      path.resolve(basePath, 'public', relativePath),
    ];

    for (const filePath of possiblePaths) {
      const normalizedPath = path.normalize(filePath);
      if (fs.existsSync(normalizedPath)) {
        try {
          const stats = fs.statSync(normalizedPath);
          if (stats.isFile()) {
            return path.resolve(normalizedPath);
          }
        } catch {
          continue;
        }
      }
    }

    return null;
  } catch (error) {
    console.error(`[MEDIA-FILE-UTILS] Error resolving file path for ${fileUrl}:`, error);
    return null;
  }
}

/**
 * PHASE D: Generate unique ID for media item
 * Use URL as ID (already unique), but ensure it's always a string
 * 
 * @param url - Media URL
 * @returns Unique ID string
 */
export function generateMediaId(url: string): string {
  // Use URL as ID (already unique per file)
  // Ensure it's always a string and valid
  if (!url || url.trim() === '') {
    // Fallback: generate UUID-like string
    return `media-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
  }
  
  // Normalize URL to ensure consistency
  const normalized = url.startsWith('/') ? url : `/${url}`;
  return normalized;
}
