/**
 * M-07: HTML Sanitizer
 * 
 * Lightweight server-side HTML sanitization
 * Whitelist only: p, h2, h3, ul, li, strong, em, img
 * 
 * Security: Prevents XSS by removing dangerous tags/attributes
 */

const ALLOWED_TAGS = ['p', 'h2', 'h3', 'ul', 'li', 'strong', 'em', 'img'];
const ALLOWED_ATTRIBUTES: Record<string, string[]> = {
  img: ['src', 'alt', 'width', 'height'],
  a: ['href', 'title'],
};

/**
 * Sanitize HTML content - whitelist approach
 * Only allows safe tags and attributes
 */
export function sanitizeHTML(html: string): string {
  if (!html || typeof html !== 'string') {
    return '';
  }

  // Simple regex-based sanitization (lightweight, no heavy library)
  // Remove script, style, iframe, object, embed, form tags and their content
  let sanitized = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
    .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '')
    .replace(/<form\b[^<]*(?:(?!<\/form>)<[^<]*)*<\/form>/gi, '')
    .replace(/on\w+="[^"]*"/gi, '') // Remove event handlers
    .replace(/on\w+='[^']*'/gi, '') // Remove event handlers (single quotes)
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/data:text\/html/gi, ''); // Remove data URIs

  // Allow only whitelisted tags
  // This is a simplified approach - for production, consider using a proper HTML parser
  // But per requirements: "Tanpa menambah library berat"
  
  // Remove all tags not in whitelist
  const tagPattern = /<\/?([a-z][a-z0-9]*)\b[^>]*>/gi;
  sanitized = sanitized.replace(tagPattern, (match, tagName) => {
    const lowerTag = tagName.toLowerCase();
    if (ALLOWED_TAGS.includes(lowerTag)) {
      // Keep the tag but clean attributes
      if (lowerTag === 'img') {
        // For img tags, only allow specific attributes
        const srcMatch = match.match(/src=["']([^"']+)["']/i);
        const altMatch = match.match(/alt=["']([^"']*)["']/i);
        const widthMatch = match.match(/width=["']?(\d+)["']?/i);
        const heightMatch = match.match(/height=["']?(\d+)["']?/i);
        
        let cleanTag = '<img';
        if (srcMatch) cleanTag += ` src="${srcMatch[1]}"`;
        if (altMatch) cleanTag += ` alt="${altMatch[1]}"`;
        if (widthMatch) cleanTag += ` width="${widthMatch[1]}"`;
        if (heightMatch) cleanTag += ` height="${heightMatch[1]}"`;
        cleanTag += '>';
        return cleanTag;
      }
      // For other tags, remove dangerous attributes but keep the tag
      return match.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '')
                  .replace(/\s*javascript:/gi, '');
    }
    // Remove tag if not in whitelist
    return '';
  });

  return sanitized.trim();
}

/**
 * Escape HTML for TEXT mode rendering
 * Converts HTML to plain text representation
 */
export function escapeHTML(text: string): string {
  if (!text || typeof text !== 'string') {
    return '';
  }
  
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Infer contentMode from content (backward compatibility)
 * Returns 'HTML' if content contains HTML tags, 'TEXT' otherwise
 */
export function inferContentMode(content: string): 'TEXT' | 'HTML' {
  if (!content || typeof content !== 'string') {
    return 'TEXT';
  }
  
  // Check if content contains HTML tags
  const hasHTMLTags = /<[a-z][\s\S]*>/i.test(content);
  return hasHTMLTags ? 'HTML' : 'TEXT';
}
