/**
 * PHASE A — Data Contract & Validation
 * 
 * Utility functions untuk validasi keras data produk
 * Memastikan data yang masuk = data yang bermakna
 */

/**
 * 1. SLUG VALIDATION
 * - Minimal panjang: ≥ 3 karakter
 * - Hanya: a-z 0-9 -
 * - Auto-regenerate jika invalid
 */
export function validateSlug(slug: string): { valid: boolean; error?: string; regenerated?: string } {
  if (!slug || slug.trim() === '') {
    return { valid: false, error: 'Slug tidak boleh kosong' };
  }

  const trimmed = slug.trim();
  
  // Minimal 3 karakter
  if (trimmed.length < 3) {
    return { valid: false, error: 'Slug minimal 3 karakter' };
  }

  // Hanya a-z 0-9 -
  const validPattern = /^[a-z0-9-]+$/;
  if (!validPattern.test(trimmed)) {
    return { valid: false, error: 'Slug hanya boleh mengandung huruf kecil, angka, dan tanda hubung' };
  }

  // Tidak boleh hanya simbol
  const hasAlphanumeric = /[a-z0-9]/.test(trimmed);
  if (!hasAlphanumeric) {
    return { valid: false, error: 'Slug harus mengandung huruf atau angka' };
  }

  return { valid: true };
}

/**
 * Generate slug dari title (untuk auto-regenerate)
 */
export function generateSlugFromTitle(title: string): string {
  if (!title || title.trim() === '') {
    return '';
  }

  let slug = title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .substring(0, 100);

  // Ensure minimal 3 karakter
  if (slug.length < 3) {
    slug = slug + '-product';
  }

  return slug;
}

/**
 * 2. SHORT DESCRIPTION VALIDATION
 * - Strip HTML
 * - Trim whitespace
 * - Minimal panjang teks bersih: ≥ 20 karakter
 */
export function validateShortDescription(shortDescription: string | undefined | null): { valid: boolean; error?: string; cleaned?: string } {
  if (!shortDescription) {
    return { valid: false, error: 'Deskripsi singkat diperlukan' };
  }

  // Strip HTML tags
  const stripped = shortDescription.replace(/<[^>]*>/g, '').trim();
  
  // Check if empty after strip
  if (stripped === '' || stripped === '<p></p>') {
    return { valid: false, error: 'Deskripsi singkat tidak boleh kosong (setelah menghapus HTML)' };
  }

  // Minimal 20 karakter
  if (stripped.length < 20) {
    return { valid: false, error: `Deskripsi singkat minimal 20 karakter (saat ini: ${stripped.length})` };
  }

  return { valid: true, cleaned: stripped };
}

/**
 * 3. SPECIFICATIONS VALIDATION
 * - WAJIB salah satu: array poin atau key-value list
 * - Tidak boleh: satu paragraf panjang atau kosong
 * - Minimal: ≥ 3 poin spesifikasi
 */
export function validateSpecifications(specifications: string | undefined | null): { valid: boolean; error?: string } {
  if (!specifications || specifications.trim() === '') {
    return { valid: false, error: 'Spesifikasi produk diperlukan' };
  }

  const trimmed = specifications.trim();
  
  // Tidak boleh hanya <p></p> atau tag kosong
  const stripped = trimmed.replace(/<[^>]*>/g, '').trim();
  if (stripped === '' || stripped === '<p></p>') {
    return { valid: false, error: 'Spesifikasi tidak boleh kosong' };
  }

  // Check struktur: harus ada list atau table
  const hasList = /<ul[^>]*>|<ol[^>]*>/.test(trimmed) || /^\s*[-*•]\s/m.test(stripped);
  const hasTable = /<table[^>]*>|<tr[^>]*>/.test(trimmed);
  const hasListItem = /<li[^>]*>/.test(trimmed);

  // Jika tidak ada struktur list/table, cek apakah paragraf panjang (tidak valid)
  if (!hasList && !hasTable && !hasListItem) {
    // Cek apakah hanya satu paragraf panjang (tidak valid)
    const paragraphs = stripped.split(/\n\s*\n/).filter(p => p.trim().length > 0);
    if (paragraphs.length === 1 && stripped.length > 200) {
      return { valid: false, error: 'Spesifikasi harus dalam format list atau tabel, bukan paragraf panjang' };
    }
  }

  // Count poin spesifikasi
  let pointCount = 0;
  
  // Count dari HTML list
  const listMatches = trimmed.match(/<li[^>]*>/g);
  if (listMatches) {
    pointCount += listMatches.length;
  }
  
  // Count dari markdown-style list
  const markdownListMatches = stripped.match(/^\s*[-*•]\s/gm);
  if (markdownListMatches) {
    pointCount += markdownListMatches.length;
  }
  
  // Count dari table rows
  const tableRowMatches = trimmed.match(/<tr[^>]*>/g);
  if (tableRowMatches) {
    pointCount += tableRowMatches.length;
  }
  
  // Count dari numbered list (1. 2. 3.)
  const numberedListMatches = stripped.match(/^\s*\d+\.\s/gm);
  if (numberedListMatches) {
    pointCount += numberedListMatches.length;
  }

  // Minimal 3 poin
  if (pointCount < 3 && !hasTable) {
    return { valid: false, error: `Spesifikasi minimal harus memiliki 3 poin (saat ini: ${pointCount})` };
  }

  return { valid: true };
}

/**
 * 4. SEO KEYWORD VALIDATION
 * - Primary keyword: WAJIB
 * - Secondary keyword: optional, tapi jika diisi → minimal 1, maksimal wajar
 */
export function validateSEOKeywords(seoSchema: string | undefined | null): { valid: boolean; error?: string; primaryKeyword?: string; secondaryKeywords?: string[] } {
  if (!seoSchema) {
    return { valid: false, error: 'SEO schema diperlukan (primary keyword wajib)' };
  }

  try {
    const schema = typeof seoSchema === 'string' ? JSON.parse(seoSchema) : seoSchema;
    
    // Primary keyword WAJIB
    const primaryKeyword = schema.primary_keyword;
    if (!primaryKeyword || primaryKeyword.trim() === '') {
      return { valid: false, error: 'Primary keyword wajib diisi' };
    }

    // Secondary keywords: optional, tapi jika diisi harus valid
    const secondaryKeywords = schema.secondary_keywords || [];
    if (Array.isArray(secondaryKeywords)) {
      // Filter empty strings
      const validSecondary = secondaryKeywords.filter((kw: string) => kw && kw.trim() !== '');
      
      // Maksimal wajar: 10 keywords
      if (validSecondary.length > 10) {
        return { valid: false, error: 'Secondary keywords maksimal 10' };
      }
    }

    return { 
      valid: true, 
      primaryKeyword: primaryKeyword.trim(),
      secondaryKeywords: Array.isArray(secondaryKeywords) ? secondaryKeywords.filter((kw: string) => kw && kw.trim() !== '').map((kw: string) => kw.trim()) : []
    };
  } catch (e) {
    return { valid: false, error: 'SEO schema tidak valid (format JSON salah)' };
  }
}

/**
 * 5. PUBLISH TIME VALIDATION
 * - Jika status = DRAFT → publishAt: null
 * - Jika status = PUBLISHED → publishAt: wajib ada (jika kosong → set now())
 */
export function validatePublishTime(status: string, publishedAt: Date | null | undefined): { valid: boolean; error?: string; normalizedPublishedAt?: Date | null } {
  if (status === 'DRAFT') {
    // DRAFT harus null
    if (publishedAt !== null && publishedAt !== undefined) {
      return { valid: false, error: 'Produk dengan status DRAFT tidak boleh memiliki publishedAt' };
    }
    return { valid: true, normalizedPublishedAt: null };
  }

  if (status === 'PUBLISHED') {
    // PUBLISHED harus ada waktu
    if (!publishedAt) {
      // Auto-set to now()
      return { valid: true, normalizedPublishedAt: new Date() };
    }

    // Validate datetime
    const date = new Date(publishedAt);
    if (isNaN(date.getTime())) {
      return { valid: false, error: 'publishedAt tidak valid (format datetime salah)' };
    }

    return { valid: true, normalizedPublishedAt: date };
  }

  return { valid: true, normalizedPublishedAt: publishedAt || null };
}

/**
 * Comprehensive validation untuk semua field PHASE A
 */
export function validateProductPhaseA(data: {
  slug: string;
  shortDescription?: string | null;
  specifications?: string | null;
  seoSchema?: string | null;
  status: string;
  publishedAt?: Date | null;
  name: string; // Untuk auto-regenerate slug
}): { 
  valid: boolean; 
  errors: string[]; 
  fixes?: {
    slug?: string;
    shortDescription?: string;
    publishedAt?: Date | null;
  }
} {
  const errors: string[] = [];
  const fixes: { slug?: string; shortDescription?: string; publishedAt?: Date | null } = {};

  // 1. Validate slug
  const slugValidation = validateSlug(data.slug);
  if (!slugValidation.valid) {
    errors.push(`Slug: ${slugValidation.error}`);
    // Auto-regenerate dari title
    const regenerated = generateSlugFromTitle(data.name);
    if (regenerated) {
      fixes.slug = regenerated;
      errors.push(`Slug akan diregenerasi menjadi: ${regenerated}`);
    }
  }

  // 2. Validate short description
  const shortDescValidation = validateShortDescription(data.shortDescription);
  if (!shortDescValidation.valid) {
    errors.push(`Deskripsi Singkat: ${shortDescValidation.error}`);
    if (shortDescValidation.cleaned) {
      fixes.shortDescription = shortDescValidation.cleaned;
    }
  }

  // 3. Validate specifications
  const specsValidation = validateSpecifications(data.specifications);
  if (!specsValidation.valid) {
    errors.push(`Spesifikasi: ${specsValidation.error}`);
  }

  // 4. Validate SEO keywords
  const seoValidation = validateSEOKeywords(data.seoSchema);
  if (!seoValidation.valid) {
    errors.push(`SEO Keywords: ${seoValidation.error}`);
  }

  // 5. Validate publish time
  const publishTimeValidation = validatePublishTime(data.status, data.publishedAt);
  if (!publishTimeValidation.valid) {
    errors.push(`Publish Time: ${publishTimeValidation.error}`);
  } else if (publishTimeValidation.normalizedPublishedAt !== undefined) {
    fixes.publishedAt = publishTimeValidation.normalizedPublishedAt;
  }

  return {
    valid: errors.length === 0,
    errors,
    fixes: Object.keys(fixes).length > 0 ? fixes : undefined,
  };
}
