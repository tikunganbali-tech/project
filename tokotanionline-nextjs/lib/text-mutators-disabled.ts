/**
 * PHASE 2: Text Mutators Disabled
 * 
 * Semua mutator teks dinonaktifkan:
 * - truncate
 * - excerpt
 * - summary
 * - slice / substring
 * - auto title-case / sentence-case
 * 
 * Sanitasi hanya untuk keamanan (escape)
 * ❌ Sanitasi yang mengubah isi teks DILARANG
 */

const TEXT_MUTATORS_DISABLED = process.env.NEXT_PUBLIC_DISABLE_TEXT_MUTATORS === 'true';

/**
 * PHASE 2: Truncate DISABLED
 * Returns original text without truncation
 */
export function truncateText(text: string | null | undefined, maxLength?: number): string {
  if (TEXT_MUTATORS_DISABLED) {
    // PHASE 2: Return original text, no truncation
    return text || '';
  }
  
  // Legacy behavior (only if flag not set)
  if (!text) return '';
  if (!maxLength || text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

/**
 * PHASE 2: Excerpt DISABLED
 * Returns empty string (excerpt tidak boleh digunakan)
 */
export function extractExcerpt(content: string, maxLength?: number): string {
  if (TEXT_MUTATORS_DISABLED) {
    // PHASE 2: Excerpt disabled
    return '';
  }
  
  // Legacy behavior (only if flag not set)
  if (!content) return '';
  const text = content.replace(/<[^>]*>/g, '').trim();
  if (!maxLength || text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

/**
 * PHASE 2: Summary DISABLED
 * Returns empty string
 */
export function generateSummary(content: string): string {
  if (TEXT_MUTATORS_DISABLED) {
    // PHASE 2: Summary disabled
    return '';
  }
  
  // Legacy behavior
  return content.substring(0, 200) + '...';
}

/**
 * PHASE 2: Safe HTML escape (sanitasi hanya untuk keamanan)
 * Tidak mengubah isi teks, hanya escape karakter berbahaya
 */
export function escapeHTML(text: string): string {
  const map: { [key: string]: string } = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

/**
 * PHASE 2: NO auto case conversion
 * Returns text as-is
 */
export function toTitleCase(text: string): string {
  if (TEXT_MUTATORS_DISABLED) {
    // PHASE 2: No case conversion
    return text;
  }
  
  // Legacy behavior
  return text.replace(/\w\S*/g, (txt) => {
    return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
  });
}

/**
 * PHASE 2: NO auto sentence case
 * Returns text as-is
 */
export function toSentenceCase(text: string): string {
  if (TEXT_MUTATORS_DISABLED) {
    // PHASE 2: No case conversion
    return text;
  }
  
  // Legacy behavior
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
}
