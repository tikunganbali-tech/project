/**
 * PHASE 7C: Insight Guardrails
 * 
 * Ensures:
 * - No cross-brand content access
 * - No auto-rewrite recommendations
 * - No auto-publish
 * - Insight is informational only
 */

/**
 * Guardrail: Prevent cross-brand content access
 * Insight aggregation should NOT expose raw content from other brands
 */
export function preventCrossBrandContentAccess(
  requestedBrandId: string,
  adminBrandId: string | null,
  isSuperAdmin: boolean
): void {
  if (isSuperAdmin) {
    // Super admin can view aggregated insights across brands
    return;
  }

  if (!adminBrandId) {
    throw new Error('PHASE 7C GUARDRAIL: Admin must be assigned to a brand to view insights');
  }

  if (adminBrandId !== requestedBrandId) {
    throw new Error('PHASE 7C GUARDRAIL: Admin cannot access insights from other brands');
  }
}

/**
 * Guardrail: Ensure insight response contains no raw content
 */
export function validateInsightResponse(insight: any): void {
  // Check for raw content fields
  const forbiddenFields = ['content', 'body', 'text', 'html', 'rawContent', 'fullText'];
  
  for (const field of forbiddenFields) {
    if (insight[field]) {
      throw new Error(`PHASE 7C GUARDRAIL: Insight response contains forbidden field: ${field}. Raw content not allowed.`);
    }
  }

  // Check nested objects
  if (insight.topPages) {
    for (const page of insight.topPages) {
      for (const field of forbiddenFields) {
        if (page[field]) {
          throw new Error(`PHASE 7C GUARDRAIL: Top pages contain forbidden field: ${field}. Raw content not allowed.`);
        }
      }
    }
  }
}

/**
 * Guardrail: Prevent auto-rewrite recommendations
 * Insights should NOT trigger automatic content rewrite
 */
export function preventAutoRewrite(recommendations: any[]): void {
  for (const rec of recommendations) {
    if (rec.action && (
      rec.action.toLowerCase().includes('rewrite') ||
      rec.action.toLowerCase().includes('auto-rewrite') ||
      rec.action.toLowerCase().includes('automatically rewrite')
    )) {
      throw new Error('PHASE 7C GUARDRAIL: Auto-rewrite recommendations are not allowed. Insights are informational only.');
    }
  }
}

/**
 * Guardrail: Prevent auto-publish
 * Insights should NOT trigger automatic publish
 */
export function preventAutoPublish(insight: any): void {
  if (insight.autoPublish || insight.shouldPublish || insight.recommendPublish) {
    throw new Error('PHASE 7C GUARDRAIL: Auto-publish is not allowed. Insights are informational only.');
  }
}

/**
 * Guardrail: Ensure metrics are normalized
 */
export function validateNormalizedMetrics(metrics: any): void {
  // Check that metrics are within expected ranges
  if (metrics.seoScore !== undefined && (metrics.seoScore < 0 || metrics.seoScore > 100)) {
    throw new Error('PHASE 7C GUARDRAIL: SEO score must be normalized (0-100)');
  }

  if (metrics.avgCtr !== undefined && (metrics.avgCtr < 0 || metrics.avgCtr > 1)) {
    throw new Error('PHASE 7C GUARDRAIL: CTR must be normalized (0.0-1.0)');
  }

  if (metrics.avgBounceRate !== undefined && (metrics.avgBounceRate < 0 || metrics.avgBounceRate > 1)) {
    throw new Error('PHASE 7C GUARDRAIL: Bounce rate must be normalized (0.0-1.0)');
  }
}

/**
 * Guardrail: Ensure page identifiers are anonymized
 */
export function validateAnonymizedIdentifiers(insight: any): void {
  // Page IDs should be hashed, not raw
  if (insight.topPages) {
    for (const page of insight.topPages) {
      if (page.pageId && !page.pageIdHash) {
        // If pageId exists, it should be hashed
        if (page.pageId.length < 32) {
          // Likely not hashed (hashes are typically longer)
          throw new Error('PHASE 7C GUARDRAIL: Page identifiers must be anonymized (hashed)');
        }
      }
    }
  }
}
