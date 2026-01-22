/**
 * FASE 3 — KONTRAK DATA KONTEN (WAJIB)
 * 
 * Semua konten AI harus masuk kontrak ini. Tidak ada bypass.
 */

export type ContentType = 'blog' | 'product';

export type ContentStatus = 'draft' | 'published';

export type ContentSource = 'ai' | 'manual';

export interface ContentSEO {
  title: string;
  description: string;
  keywords: string[]; // Array of keywords
}

export interface ContentRecord {
  id: string;
  type: ContentType;
  title: string;
  slug: string;
  body: string; // HTML/MD terkontrol
  excerpt: string;
  seo: ContentSEO;
  status: ContentStatus;
  createdAt: Date;
  source: ContentSource;
  // Additional fields for blog
  categoryId?: string | null;
  author?: string;
  imageUrl?: string | null;
  // Additional fields for product
  price?: number;
  discountPrice?: number | null;
  stock?: number;
}

/**
 * Normalize slug untuk konsistensi
 */
export function normalizeSlug(text: string): string {
  let slug = text.toLowerCase().trim();
  
  // Replace spaces and special chars
  slug = slug.replace(/\s+/g, '-');
  slug = slug.replace(/[^\w\-]+/g, '');
  slug = slug.replace(/\-\-+/g, '-');
  slug = slug.replace(/^-+/, '');
  slug = slug.replace(/-+$/, '');
  
  // Limit length
  if (slug.length > 100) {
    slug = slug.substring(0, 100);
    slug = slug.replace(/-+$/, '');
  }
  
  return slug;
}
