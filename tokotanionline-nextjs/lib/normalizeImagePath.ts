/**
 * M-02: Image Path Normalizer
 * 
 * Server-side helper to normalize image paths to standard format.
 * 
 * Rules:
 * - Input: any string (including /public/... or /images/...)
 * - Output: /images/... (ImagePath type)
 * 
 * This function MUST be called before saving any image path to database.
 */

import type { ImagePath } from '@/types/ImagePath';

/**
 * Normalizes an image path to the standard format: /images/...
 * 
 * @param input - Raw image path (may include /public/ prefix or invalid format)
 * @returns Normalized path in format /images/...
 * @throws Error if path is empty or cannot be normalized
 * 
 * @example
 * normalizeImagePath('/public/images/products/x.png') // => '/images/products/x.png'
 * normalizeImagePath('/images/products/x.png') // => '/images/products/x.png'
 * normalizeImagePath('/uploads/x.png') // => throws Error
 */
export function normalizeImagePath(input: string | null | undefined): ImagePath {
  if (!input) {
    throw new Error("Image path empty");
  }

  // Remove /public prefix if present
  if (input.startsWith("/public/")) {
    return input.replace("/public", "") as ImagePath;
  }

  // Validate that path starts with /images/
  if (!input.startsWith("/images/")) {
    throw new Error(`Invalid image path: ${input}. Must start with /images/`);
  }

  return input as ImagePath;
}

/**
 * Normalizes an image path, returning null if invalid instead of throwing.
 * Useful for optional image fields.
 */
export function normalizeImagePathSafe(input: string | null | undefined): ImagePath | null {
  try {
    return normalizeImagePath(input);
  } catch {
    return null;
  }
}

/**
 * Normalizes an array of image paths.
 * Filters out invalid paths (returns only valid normalized paths).
 */
export function normalizeImagePaths(input: (string | null | undefined)[] | null | undefined): ImagePath[] {
  if (!input || !Array.isArray(input)) {
    return [];
  }
  
  const normalized: ImagePath[] = [];
  for (const path of input) {
    const normalizedPath = normalizeImagePathSafe(path);
    if (normalizedPath) {
      normalized.push(normalizedPath);
    }
  }
  
  return normalized;
}
