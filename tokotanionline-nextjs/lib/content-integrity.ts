/**
 * PHASE 2: Content Integrity Verification
 * 
 * Verifikasi hash konten server == hash DOM
 */

import crypto from 'crypto';

/**
 * Calculate content hash (SHA-256)
 */
export function calculateContentHash(content: string): string {
  return crypto.createHash('sha256').update(content, 'utf8').digest('hex');
}

/**
 * Extract text content from HTML (for DOM hash calculation)
 */
export function extractTextFromHTML(html: string): string {
  // Remove HTML tags but keep text content
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '') // Remove scripts
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '') // Remove styles
    .replace(/<[^>]+>/g, '') // Remove all HTML tags
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
}

/**
 * Verify content integrity
 * Returns true if server hash matches DOM hash
 */
export function verifyContentIntegrity(
  serverContent: string,
  domContent: string
): { valid: boolean; serverHash: string; domHash: string } {
  const serverHash = calculateContentHash(serverContent);
  const domText = extractTextFromHTML(domContent);
  const domHash = calculateContentHash(domText);
  
  return {
    valid: serverHash === domHash,
    serverHash,
    domHash,
  };
}

/**
 * Log integrity check result
 */
export function logIntegrityCheck(
  pageId: string,
  version: number,
  result: { valid: boolean; serverHash: string; domHash: string }
): void {
  if (!result.valid) {
    console.error('[CONTENT INTEGRITY] Hash mismatch:', {
      pageId,
      version,
      serverHash: result.serverHash,
      domHash: result.domHash,
    });
    
    // Log to server (if available)
    if (typeof window === 'undefined') {
      // Server-side logging
      console.error('[CONTENT INTEGRITY FAILED]', {
        pageId,
        version,
        serverHash: result.serverHash,
        domHash: result.domHash,
      });
    } else {
      // Client-side: send to analytics/logging endpoint
      fetch('/api/admin/ai-v2/integrity-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pageId,
          version,
          serverHash: result.serverHash,
          domHash: result.domHash,
          valid: false,
        }),
      }).catch(() => {
        // Ignore errors
      });
    }
  }
}
