/**
 * PHASE 7B: Locale Isolation Guardrails
 * 
 * Ensures:
 * - No content without locale_id
 * - No translate inplace (new version required)
 * - Locale isolation is maintained
 */

/**
 * Guardrail: Require locale_id in queries
 */
export function requireLocaleId(localeId: string | null | undefined): string {
  if (!localeId) {
    throw new Error('PHASE 7B GUARDRAIL: locale_id is required. No content without locale allowed.');
  }
  return localeId;
}

/**
 * Guardrail: Prevent translate inplace
 * New language = new version, not inplace translation
 */
export function preventTranslateInplace(
  sourceLocaleId: string,
  targetLocaleId: string
): void {
  if (sourceLocaleId === targetLocaleId) {
    throw new Error('PHASE 7B GUARDRAIL: Cannot translate to same locale. Use new version for different locale.');
  }
}

/**
 * Guardrail: Ensure content belongs to locale
 */
export function validateContentLocale(
  contentLocaleId: string | null | undefined,
  expectedLocaleId: string
): void {
  if (!contentLocaleId) {
    throw new Error('PHASE 7B GUARDRAIL: Content must have locale_id');
  }

  if (contentLocaleId !== expectedLocaleId) {
    throw new Error('PHASE 7B GUARDRAIL: Content does not belong to expected locale. Cross-locale access denied.');
  }
}

/**
 * Guardrail: Filter query by locale_id
 */
export function addLocaleFilter<T extends { localeId?: string | null }>(
  query: any,
  localeId: string
): any {
  return {
    ...query,
    where: {
      ...query.where,
      localeId: requireLocaleId(localeId),
    },
  };
}

/**
 * Guardrail: Ensure new version for new locale
 * When creating content in new locale, must create new version, not translate existing
 */
export function requireNewVersionForLocale(
  existingLocaleId: string,
  newLocaleId: string
): void {
  if (existingLocaleId === newLocaleId) {
    // Same locale - version increment is normal
    return;
  }
  
  // Different locale - must be new version
  // This is enforced by ContentVersion unique constraint: [entityType, entityId, brandId, localeId, versionType]
}
