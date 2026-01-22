/**
 * PHASE 7A: Brand Isolation Guardrails
 * 
 * Ensures:
 * - No queries without brand_id
 * - No cross-brand content access
 * - Brand isolation is maintained
 */

/**
 * Guardrail: Require brand_id in queries
 */
export function requireBrandId(brandId: string | null | undefined): string {
  if (!brandId) {
    throw new Error('PHASE 7A GUARDRAIL: brand_id is required. No query without brand_id allowed.');
  }
  return brandId;
}

/**
 * Guardrail: Validate brand access
 * Ensures admin can only access their assigned brand (unless super_admin)
 */
export async function validateBrandAccess(
  adminBrandId: string | null,
  requestedBrandId: string,
  isSuperAdmin: boolean = false
): Promise<boolean> {
  // Super admin can access all brands
  if (isSuperAdmin) {
    return true;
  }

  // Regular admin can only access their assigned brand
  if (!adminBrandId) {
    throw new Error('PHASE 7A GUARDRAIL: Admin must be assigned to a brand or be super_admin');
  }

  if (adminBrandId !== requestedBrandId) {
    throw new Error('PHASE 7A GUARDRAIL: Admin cannot access brand they are not assigned to');
  }

  return true;
}

/**
 * Guardrail: Ensure content belongs to brand
 */
export function validateContentBrand(
  contentBrandId: string | null | undefined,
  expectedBrandId: string
): void {
  if (!contentBrandId) {
    throw new Error('PHASE 7A GUARDRAIL: Content must have brand_id');
  }

  if (contentBrandId !== expectedBrandId) {
    throw new Error('PHASE 7A GUARDRAIL: Content does not belong to expected brand. Cross-brand access denied.');
  }
}

/**
 * Guardrail: Filter query by brand_id
 */
export function addBrandFilter<T extends { brandId?: string | null }>(
  query: any,
  brandId: string
): any {
  return {
    ...query,
    where: {
      ...query.where,
      brandId: requireBrandId(brandId),
    },
  };
}

/**
 * Guardrail: Ensure no cross-brand aggregation without explicit flag
 */
export function validateCrossBrandAggregation(
  allowCrossBrand: boolean,
  brandIds: string[]
): void {
  if (!allowCrossBrand && brandIds.length > 1) {
    throw new Error(
      'PHASE 7A GUARDRAIL: Cross-brand aggregation requires explicit allowCrossBrand flag'
    );
  }
}
