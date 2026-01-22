/**
 * STEP 19C-1: Product Status Rules (Backend Only)
 * 
 * Pure logic for product status management.
 * NO UI, NO ENGINE, NO DB WRITE.
 * 
 * Backend = Source of Truth
 * Engine only reads PUBLISHED products
 */

// ============================================
// PRODUCT STATUS DEFINITION
// ============================================

/**
 * Official product status values
 * Only these three statuses are allowed
 */
export const PRODUCT_STATUS = {
  DRAFT: 'DRAFT',
  PUBLISHED: 'PUBLISHED',
  ARCHIVED: 'ARCHIVED',
} as const;

export type ProductStatus = typeof PRODUCT_STATUS[keyof typeof PRODUCT_STATUS];

// ============================================
// TYPE DEFINITIONS (Minimal for Logic)
// ============================================

/**
 * Minimal product type for status validation
 * Only includes fields needed for publishability checks
 */
export type ProductForValidation = {
  status?: string | null;
  name: string;
  price: number;
  stock: number;
  isActive?: boolean;
  categoryId: string;
  description?: string | null;
  imageUrl?: string | null;
};

// ============================================
// STATUS VALIDATION HELPERS
// ============================================

/**
 * Check if product status is valid
 * @param status - Product status string
 * @returns true if status is one of the official values
 */
export function isValidStatus(status: string | null | undefined): boolean {
  if (!status) return false;
  return Object.values(PRODUCT_STATUS).includes(status as ProductStatus);
}

/**
 * Check if product is in DRAFT status
 * @param product - Product object
 * @returns true if product is DRAFT
 */
export function isDraft(product: ProductForValidation): boolean {
  return product.status === PRODUCT_STATUS.DRAFT;
}

/**
 * Check if product is in PUBLISHED status
 * @param product - Product object
 * @returns true if product is PUBLISHED
 */
export function isPublished(product: ProductForValidation): boolean {
  return product.status === PRODUCT_STATUS.PUBLISHED;
}

/**
 * Check if product is in ARCHIVED status
 * @param product - Product object
 * @returns true if product is ARCHIVED
 */
export function isArchived(product: ProductForValidation): boolean {
  return product.status === PRODUCT_STATUS.ARCHIVED;
}

// ============================================
// PUBLISHABILITY CHECK
// ============================================

/**
 * Check if product can be published (Product v2 - Updated Rules)
 * 
 * A2: VALIDATION RULE (WAJIB DIUBAH)
 * ❌ REMOVED: min word count, mandatory image, mandatory secondary keywords
 * ✅ REQUIRED:
 * - name
 * - slug
 * - short_description
 * - long_description_html (tidak kosong)
 * - seo.title
 * - seo.description
 * - qc_status = PASS
 * 
 * @param product - Product object to validate
 * @returns true if product meets all publishability requirements
 */
export function isPublishable(product: ProductForValidation): boolean {
  // Check name (REQUIRED)
  if (!product.name || product.name.trim().length === 0) {
    return false;
  }

  // Check price (must be positive)
  if (!product.price || product.price <= 0) {
    return false;
  }

  // Check categoryId (required)
  if (!product.categoryId || product.categoryId.trim().length === 0) {
    return false;
  }

  // Check description (long_description_html - REQUIRED, tidak kosong)
  if (!product.description || product.description.trim().length === 0 || 
      product.description === '<p></p>' || product.description === '<section></section>') {
    return false;
  }

  // A2: Image is NO LONGER mandatory (removed requirement)
  // Product images are real photos, not AI-generated
  
  // All requirements met
  return true;
}

// ============================================
// ENGINE READABILITY CHECK
// ============================================

/**
 * Check if product is readable by engines
 * 
 * Rules:
 * - Only PUBLISHED products are engine-readable
 * - DRAFT products are NOT engine-readable
 * - ARCHIVED products are NOT engine-readable
 * - Products without status (null/undefined) are treated as DRAFT (NOT readable)
 * 
 * This ensures engines only process mature, approved products.
 * 
 * @param product - Product object to check
 * @returns true if engines are allowed to read/process this product
 */
export function isEngineReadable(product: ProductForValidation): boolean {
  // Only PUBLISHED products are engine-readable
  if (product.status === PRODUCT_STATUS.PUBLISHED) {
    // Additional safety: ensure product is also active (if isActive field exists)
    // This is a double-check for legacy products
    if (product.isActive !== undefined && product.isActive === false) {
      return false;
    }
    return true;
  }

  // DRAFT, ARCHIVED, or null/undefined status = NOT engine-readable
  return false;
}

// ============================================
// STATUS TRANSITION HELPERS (Read-Only)
// ============================================

/**
 * Check if status transition is allowed
 * 
 * Allowed transitions:
 * - DRAFT → PUBLISHED (if publishable)
 * - PUBLISHED → ARCHIVED
 * - ARCHIVED → DRAFT (for reactivation)
 * - Any → DRAFT (reset)
 * 
 * @param currentStatus - Current product status
 * @param targetStatus - Desired product status
 * @param product - Product object (needed for publishability check)
 * @returns true if transition is allowed
 */
export function canTransitionTo(
  currentStatus: string | null | undefined,
  targetStatus: ProductStatus,
  product?: ProductForValidation
): boolean {
  // Transitioning to DRAFT is always allowed (reset)
  if (targetStatus === PRODUCT_STATUS.DRAFT) {
    return true;
  }

  // Transitioning to PUBLISHED requires publishability check
  if (targetStatus === PRODUCT_STATUS.PUBLISHED) {
    if (!product) return false;
    return isPublishable(product);
  }

  // Transitioning to ARCHIVED is allowed from PUBLISHED or DRAFT
  if (targetStatus === PRODUCT_STATUS.ARCHIVED) {
    return (
      currentStatus === PRODUCT_STATUS.PUBLISHED ||
      currentStatus === PRODUCT_STATUS.DRAFT
    );
  }

  return false;
}

// ============================================
// UTILITY HELPERS
// ============================================

/**
 * Get default status for new products
 * @returns Default status (DRAFT)
 */
export function getDefaultStatus(): ProductStatus {
  return PRODUCT_STATUS.DRAFT;
}

/**
 * Check if product should be visible to public
 * Only PUBLISHED products are public-visible
 * 
 * @param product - Product object
 * @returns true if product should be shown to public
 */
export function isPublicVisible(product: ProductForValidation): boolean {
  return isPublished(product);
}

