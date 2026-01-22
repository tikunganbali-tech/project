/**
 * PHASE 2: Frontend Content Reader
 * 
 * HANYA membaca dari FRONTEND_CONTENT_PACKAGE
 * Tidak ada merge dengan data legacy
 * Tidak ada computed text
 * Tidak ada fallback otomatis tanpa flag
 */

const FRONTEND_V2_ENABLED = process.env.NEXT_PUBLIC_AI_V2_ENABLED === 'true';
const FRONTEND_V2_FALLBACK_ENABLED = process.env.NEXT_PUBLIC_AI_V2_FALLBACK_ENABLED === 'true';

export interface FrontendContentPackage {
  pageType: 'blog' | 'product' | 'category' | 'homepage';
  title: string;
  heroCopy: string;
  sections: Array<{
    heading: string;
    headingLevel: 2 | 3;
    body: string;
    order: number;
  }>;
  cta: {
    text: string;
    action: string;
    placement: 'inline' | 'bottom' | 'both';
  };
  microcopy: {
    readingTime?: string;
    lastUpdated?: string;
    author?: string;
    tags?: string[];
  };
  tone: {
    style: string;
    formality: string;
    targetAudience: string;
  };
  metadata: {
    version: number;
    generatedAt: string;
    contentType: string;
    wordCount: number;
    readingTime: number;
  };
}

export interface LegacyContent {
  title: string;
  content: string;
  excerpt?: string | null;
  [key: string]: any;
}

/**
 * Read content from FRONTEND_CONTENT_PACKAGE
 * PHASE 2: HANYA membaca, tidak ada merge, tidak ada computed
 */
export async function readFrontendContent(
  pageId: string,
  version?: number
): Promise<FrontendContentPackage | null> {
  if (!FRONTEND_V2_ENABLED) {
    return null;
  }

  try {
    const url = version
      ? `/api/admin/ai-v2/preview?pageId=${pageId}&version=${version}`
      : `/api/admin/ai-v2/preview?pageId=${pageId}`;

    const response = await fetch(url, {
      cache: 'no-store', // Always fetch fresh
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data.package || data;
  } catch (error) {
    console.error('[FRONTEND CONTENT READER] Error:', error);
    return null;
  }
}

/**
 * Convert FRONTEND_CONTENT_PACKAGE to HTML content
 * PHASE 2: NO truncate, NO excerpt, NO computed text
 */
export function packageToHTML(pkg: FrontendContentPackage): string {
  let html = '';

  // Title (H1)
  html += `<h1>${escapeHTML(pkg.title)}</h1>\n\n`;

  // Hero Copy
  html += `<p class="hero-copy">${escapeHTML(pkg.heroCopy)}</p>\n\n`;

  // Sections - Render semua, tidak ada truncate
  const sortedSections = [...pkg.sections].sort((a, b) => a.order - b.order);
  
  for (const section of sortedSections) {
    if (section.headingLevel === 2) {
      html += `<h2>${escapeHTML(section.heading)}</h2>\n\n`;
    } else {
      html += `<h3>${escapeHTML(section.heading)}</h3>\n\n`;
    }
    
    // Body - NO truncate, render semua
    html += `<div class="section-body">${section.body}</div>\n\n`;
  }

  return html;
}

/**
 * Escape HTML untuk keamanan (sanitasi)
 * PHASE 2: Sanitasi hanya untuk keamanan, tidak mengubah isi teks
 */
function escapeHTML(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Get content with fallback (if enabled)
 * PHASE 2: Fallback HANYA jika flag aktif
 */
export async function getContentWithFallback(
  pageId: string,
  legacyContent: LegacyContent,
  version?: number
): Promise<{
  content: FrontendContentPackage | LegacyContent;
  source: 'v2' | 'legacy';
  isLegacy: boolean;
}> {
  // Try to get v2 content first
  const v2Content = await readFrontendContent(pageId, version);

  if (v2Content) {
    return {
      content: v2Content,
      source: 'v2',
      isLegacy: false,
    };
  }

  // Fallback to legacy ONLY if flag enabled
  if (FRONTEND_V2_FALLBACK_ENABLED) {
    // Log fallback usage
    if (typeof window === 'undefined') {
      // Server-side logging
      console.warn('[FRONTEND FALLBACK] Using legacy content:', {
        pageId,
        event: 'FRONTEND_FALLBACK_USED',
      });
    } else {
      // Client-side: send to logging endpoint
      fetch('/api/admin/ai-v2/fallback-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pageId,
          event: 'FRONTEND_FALLBACK_USED',
          timestamp: new Date().toISOString(),
        }),
      }).catch(() => {
        // Ignore errors
      });
    }

    return {
      content: legacyContent,
      source: 'legacy',
      isLegacy: true,
    };
  }

  // No fallback - return null
  return {
    content: legacyContent,
    source: 'legacy',
    isLegacy: true,
  };
}
