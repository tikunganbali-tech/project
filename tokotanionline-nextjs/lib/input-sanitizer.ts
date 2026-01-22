/**
 * PHASE G — Input Sanitization for XSS Protection
 * 
 * Lightweight input sanitization untuk semua text input
 * 
 * Prinsip:
 * - Escape HTML entities
 * - Remove dangerous characters
 * - Preserve content (tidak mengubah makna)
 */

/**
 * PHASE G: Sanitize text input (XSS-safe)
 * 
 * Escapes HTML entities untuk mencegah XSS
 * 
 * @param input - Text input to sanitize
 * @returns Sanitized text
 */
export function sanitizeText(input: string | null | undefined): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  // PHASE G: Escape HTML entities
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * PHASE G: Sanitize object recursively
 * 
 * Sanitizes all string values in an object
 * 
 * @param obj - Object to sanitize
 * @returns Sanitized object
 */
export function sanitizeObject(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === 'string') {
    return sanitizeText(obj);
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }

  if (typeof obj === 'object') {
    const sanitized: any = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        sanitized[key] = sanitizeObject(obj[key]);
      }
    }
    return sanitized;
  }

  return obj;
}

/**
 * PHASE G: Sanitize URL
 * 
 * Validates and sanitizes URL to prevent XSS via href
 * 
 * @param url - URL to sanitize
 * @returns Sanitized URL or empty string if invalid
 */
export function sanitizeURL(url: string | null | undefined): string {
  if (!url || typeof url !== 'string') {
    return '';
  }

  // PHASE G: Remove dangerous protocols
  const dangerousProtocols = ['javascript:', 'data:', 'vbscript:'];
  const lowerUrl = url.toLowerCase().trim();
  
  for (const protocol of dangerousProtocols) {
    if (lowerUrl.startsWith(protocol)) {
      return '';
    }
  }

  // PHASE G: Basic URL validation
  try {
    const parsed = new URL(url);
    // Only allow http, https, mailto, tel
    const allowedProtocols = ['http:', 'https:', 'mailto:', 'tel:'];
    if (!allowedProtocols.includes(parsed.protocol)) {
      return '';
    }
    return url;
  } catch {
    // If URL parsing fails, return empty
    return '';
  }
}
