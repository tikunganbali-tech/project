/**
 * M-06: SEO Auto-Generation Utility
 * 
 * Rules:
 * - Primary Keyword = source of truth
 * - SEO Title & Description generated from keyword + context
 * - NEVER taken from article body
 * - If manual override exists, respect it
 */

export interface SEOInput {
  seoTitle?: string | null;
  seoDescription?: string | null;
  primaryKeyword?: string | null;
  seoManual?: boolean; // Track if user manually edited SEO
}

export interface SEOResult {
  seoTitle: string;
  seoDescription: string;
  source: 'MANUAL' | 'AUTO' | 'SCHEDULER';
}

/**
 * Ensure SEO fields are always filled
 * Priority:
 * 1. Manual override (if seoManual === true)
 * 2. Existing SEO (if not empty)
 * 3. Auto-generate from primaryKeyword
 */
export function ensureSEO(input: SEOInput): SEOResult {
  // If manually edited, respect existing values
  if (input.seoManual === true) {
    return {
      seoTitle: input.seoTitle || '',
      seoDescription: input.seoDescription || '',
      source: 'MANUAL',
    };
  }

  // If SEO already exists and not empty, use it
  if (input.seoTitle && input.seoDescription) {
    return {
      seoTitle: input.seoTitle,
      seoDescription: input.seoDescription,
      source: 'AUTO', // Was auto-generated previously
    };
  }

  // Auto-generate from primaryKeyword
  const kw = input.primaryKeyword || '';
  
  if (!kw) {
    // Fallback: empty SEO if no keyword
    return {
      seoTitle: '',
      seoDescription: '',
      source: 'AUTO',
    };
  }

  // Generate SEO Title (50-60 chars optimal)
  const seoTitle = `${kw} — Panduan Lengkap`;
  
  // Generate SEO Description (150-160 chars optimal)
  const seoDescription = `Pelajari ${kw} secara lengkap, praktis, dan mudah dipahami. Dapatkan tips, panduan, dan rekomendasi terbaik.`;

  return {
    seoTitle,
    seoDescription,
    source: 'AUTO',
  };
}
