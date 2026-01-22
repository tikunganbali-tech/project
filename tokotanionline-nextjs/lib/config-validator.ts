/**
 * FASE 6.2 — Production Config Validator
 * 
 * Validasi konfigurasi produksi untuk memastikan default aman
 * - AI features OFF
 * - Engine OFF, SAFE_MODE dihormati
 * - Integrations visibility-only
 * - Secrets tidak tampil di UI/log
 * 
 * Prinsip:
 * - Fail-safe: Warning, bukan crash
 * - Audit-grade: Clear validation results
 */

import { 
  SAFE_MODE, 
  FEATURE_FREEZE, 
  AI_COPY_ASSIST_ENABLED, 
  AI_CONTENT_ASSIST_ENABLED 
} from '@/lib/admin-config';
import { FEATURES } from '@/lib/feature-flags';

export interface ConfigValidationResult {
  valid: boolean;
  warnings: string[];
  errors: string[];
}

/**
 * Validate production configuration
 */
export function validateProductionConfig(): ConfigValidationResult {
  const warnings: string[] = [];
  const errors: string[] = [];

  // Check AI features
  if (AI_COPY_ASSIST_ENABLED) {
    warnings.push('AI_COPY_ASSIST_ENABLED is ON (should be OFF in production)');
  }
  if (AI_CONTENT_ASSIST_ENABLED) {
    warnings.push('AI_CONTENT_ASSIST_ENABLED is ON (should be OFF in production)');
  }

  // Check SAFE_MODE
  if (!SAFE_MODE) {
    errors.push('SAFE_MODE is OFF (should be ON in production)');
  }

  // Check FEATURE_FREEZE
  if (!FEATURE_FREEZE) {
    warnings.push('FEATURE_FREEZE is OFF (should be ON in production freeze)');
  }

  // Check Engine features
  if (FEATURES.SEO_ENGINE) {
    warnings.push('FEATURES.SEO_ENGINE is ON (should be OFF in production)');
  }
  if (FEATURES.BLOG_ENGINE) {
    warnings.push('FEATURES.BLOG_ENGINE is ON (should be OFF in production)');
  }
  if (FEATURES.MARKETING_ENGINE) {
    warnings.push('FEATURES.MARKETING_ENGINE is ON (should be OFF in production)');
  }

  // Check environment variables
  if (!process.env.DATABASE_URL) {
    errors.push('DATABASE_URL is missing (required)');
  }

  if (process.env.NODE_ENV === 'production' && !process.env.NEXTAUTH_SECRET) {
    errors.push('NEXTAUTH_SECRET is missing (required in production)');
  }

  // Check marketing kill switches
  if (process.env.MARKETING_LIVE_ENABLED === 'true') {
    warnings.push('MARKETING_LIVE_ENABLED is true (should be false in production)');
  }
  if (process.env.MARKETING_DRY_RUN === 'false') {
    warnings.push('MARKETING_DRY_RUN is false (should be true in production)');
  }

  // Check for test credentials in production
  if (process.env.NODE_ENV === 'production') {
    if (process.env.TEST_ADMIN_EMAIL) {
      warnings.push('TEST_ADMIN_EMAIL is set in production (should be removed)');
    }
    if (process.env.TEST_ADMIN_PASSWORD) {
      warnings.push('TEST_ADMIN_PASSWORD is set in production (should be removed)');
    }
  }

  return {
    valid: errors.length === 0,
    warnings,
    errors,
  };
}

/**
 * Log validation results (non-blocking)
 */
export function logConfigValidation(): void {
  const result = validateProductionConfig();
  
  if (result.errors.length > 0) {
    console.error('❌ [Config Validation] ERRORS:', result.errors);
  }
  
  if (result.warnings.length > 0) {
    console.warn('⚠️ [Config Validation] WARNINGS:', result.warnings);
  }
  
  if (result.valid && result.warnings.length === 0) {
    console.log('✅ [Config Validation] All checks passed');
  }
}
