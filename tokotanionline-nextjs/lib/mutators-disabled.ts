/**
 * PHASE 2: Mutators Disabled
 * 
 * Semua fungsi mutator teks dinonaktifkan
 * - truncate
 * - excerpt
 * - summary
 * - slice / substring
 * - auto title-case / sentence-case
 * 
 * Sanitasi hanya untuk keamanan (escape)
 * ❌ Sanitasi yang mengubah isi teks DILARANG
 */

const MUTATORS_DISABLED = process.env.NEXT_PUBLIC_DISABLE_MUTATORS === 'true';

/**
 * PHASE 2: Truncate DISABLED
 * Returns text as-is, no truncation
 */
export function truncateText(text: string | null | undefined, maxLength?: number): string {
  if (MUTATORS_DISABLED) {
    // PHASE 2: Return as-is, no truncation
    return text || '';
  }
  
  // Legacy behavior (only if flag not set)
  if (!text) return '';
  if (!maxLength || text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

/**
 * PHASE 2: Excerpt DISABLED
 * Returns full content, no excerpt
 */
export function getExcerpt(content: string | null | undefined, maxLength?: number): string {
  if (MUTATORS_DISABLED) {
    // PHASE 2: Return full content, no excerpt
    return content || '';
  }
  
  // Legacy behavior (only if flag not set)
  if (!content) return '';
  if (!maxLength) return content;
  
  const text = content.replace(/<[^>]*>/g, '').trim();
  if (text.length <= maxLength) return text;
  
  const truncated = text.substring(0, maxLength);
  const lastPeriod = truncated.lastIndexOf('.');
  const lastQuestion = truncated.lastIndexOf('?');
  const lastExclamation = truncated.lastIndexOf('!');
  const lastSentenceEnd = Math.max(lastPeriod, lastQuestion, lastExclamation);
  
  if (lastSentenceEnd > maxLength * 0.5) {
    return truncated.substring(0, lastSentenceEnd + 1);
  }
  
  return truncated + '...';
}

/**
 * PHASE 2: Summary DISABLED
 * Returns full content, no summary
 */
export function getSummary(content: string | null | undefined, maxLength?: number): string {
  if (MUTATORS_DISABLED) {
    // PHASE 2: Return full content, no summary
    return content || '';
  }
  
  // Legacy behavior
  return getExcerpt(content, maxLength);
}

/**
 * PHASE 2: Safe slice (only for arrays, not strings)
 * String slicing is disabled
 */
export function safeSlice<T>(array: T[], start?: number, end?: number): T[] {
  // PHASE 2: Array slicing is allowed (for pagination, etc)
  // But string slicing is disabled
  return array.slice(start, end);
}

/**
 * PHASE 2: Safe substring DISABLED for content
 * Only allowed for non-content strings (IDs, etc)
 */
export function safeSubstring(text: string, start: number, end?: number): string {
  // PHASE 2: Only allow for non-content strings (IDs, slugs, etc)
  // Content strings should not be sliced
  if (text.length < 50) {
    // Likely an ID or short identifier - allow
    return end ? text.substring(start, end) : text.substring(start);
  }
  
  // Long strings (likely content) - return as-is
  return text;
}

/**
 * PHASE 2: Title case DISABLED
 * Returns text as-is, no case transformation
 */
export function toTitleCase(text: string): string {
  if (MUTATORS_DISABLED) {
    // PHASE 2: Return as-is, no case transformation
    return text;
  }
  
  // Legacy behavior
  return text.replace(/\w\S*/g, (txt) => {
    return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
  });
}

/**
 * PHASE 2: Sentence case DISABLED
 * Returns text as-is, no case transformation
 */
export function toSentenceCase(text: string): string {
  if (MUTATORS_DISABLED) {
    // PHASE 2: Return as-is, no case transformation
    return text;
  }
  
  // Legacy behavior
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
}

/**
 * PHASE 2: Sanitize HTML (escape only, no content modification)
 * Only escapes HTML for security, does not modify content
 */
export function sanitizeHTML(html: string): string {
  // PHASE 2: Only escape for security, don't modify content
  const div = document.createElement('div');
  div.textContent = html;
  return div.innerHTML;
}
