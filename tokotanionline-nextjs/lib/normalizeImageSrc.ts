/**
 * M-01: Image Path Normalization Utility
 * 
 * Fixes incorrect paths containing /public prefix
 * In Next.js, public/ folder is served from root, so paths should be /images/... not /public/images/...
 * 
 * @param src - Image source path (may contain /public prefix)
 * @returns Normalized path without /public prefix, or placeholder if empty
 */
export function normalizeImageSrc(src?: string | null): string {
  if (!src) return "/images/placeholder.png";
  
  // Remove /public prefix if present
  if (src.startsWith("/public/")) {
    return src.replace("/public", "");
  }
  
  // Return as-is if already correct
  return src;
}
