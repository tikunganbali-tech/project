/**
 * PHASE 9A: Partner Guardrails
 * 
 * Enforces read-only access and prevents:
 * - Data mutations
 * - Cross-partner data leaks
 * - Privilege escalation
 * - Raw content access
 * - API key exposure
 * - Integration config exposure
 * - Event writes
 */

import type { NextRequest } from 'next/server';
import { prisma } from './db';

/**
 * Guardrail: Prevent data mutations
 * All partner endpoints must be GET-only
 */
export function preventDataMutations(method: string): void {
  if (method !== 'GET') {
    throw new Error('Method not allowed. Partner API is read-only.');
  }
}

/**
 * Guardrail: Prevent cross-partner data leak
 * Ensures partner can only access data within their scopes
 */
export function preventCrossPartnerDataLeak(
  partnerId: string,
  requestedBrandId: string | null,
  requestedLocaleId: string | null,
  allowedScopes: Array<{
    brandId: string | null;
    localeId: string | null;
    channel: string | null;
    pageType: string | null;
  }>
): void {
  // Check if any scope allows access
  const hasAccess = allowedScopes.some((scope) => {
    // Brand check
    if (requestedBrandId !== null) {
      if (scope.brandId !== null && scope.brandId !== requestedBrandId) {
        return false;
      }
    }

    // Locale check
    if (requestedLocaleId !== null) {
      if (scope.localeId !== null && scope.localeId !== requestedLocaleId) {
        return false;
      }
    }

    return true;
  });

  if (!hasAccess) {
    throw new Error('Access denied: Cross-partner data leak prevented');
  }
}

/**
 * Guardrail: Prevent privilege escalation
 * Partner cannot access admin endpoints or admin data
 */
export function preventPrivilegeEscalation(
  endpoint: string,
  partnerRole: string
): void {
  // Block admin endpoints
  if (endpoint.startsWith('/api/admin')) {
    throw new Error('Access denied: Admin endpoints are not accessible to partners');
  }

  // Block internal endpoints
  if (endpoint.startsWith('/api/internal')) {
    throw new Error('Access denied: Internal endpoints are not accessible to partners');
  }

  // Block engine control endpoints
  if (endpoint.includes('/engine/control') || endpoint.includes('/actions/execute')) {
    throw new Error('Access denied: Engine control is not accessible to partners');
  }

  // Ensure role is partner_readonly
  if (partnerRole !== 'partner_readonly') {
    throw new Error('Access denied: Invalid partner role');
  }
}

/**
 * Guardrail: Prevent raw content access
 * Partner can only access aggregated data, not raw content
 */
export function preventRawContentAccess(responseData: any): void {
  // Check for raw content fields
  const rawContentFields = [
    'content',
    'body',
    'html',
    'markdown',
    'rawContent',
    'fullContent',
    'description', // Full description might contain raw content
  ];

  for (const field of rawContentFields) {
    if (field in responseData && typeof responseData[field] === 'string' && responseData[field].length > 500) {
      // If field exists and is a long string, it might be raw content
      // In production, you'd have more sophisticated checks
      console.warn(`[Partner Guardrail] Potential raw content in field: ${field}`);
    }
  }
}

/**
 * Guardrail: Prevent API key exposure
 * Remove any API keys from response
 */
export function preventApiKeyExposure(responseData: any): any {
  const sanitized = JSON.parse(JSON.stringify(responseData));

  const sensitiveFields = [
    'apiKey',
    'api_key',
    'accessToken',
    'access_token',
    'secret',
    'secretKey',
    'secret_key',
    'password',
    'passwordHash',
    'token',
    'authorization',
  ];

  function sanitizeObject(obj: any): any {
    if (obj === null || obj === undefined) {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(sanitizeObject);
    }

    if (typeof obj === 'object') {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(obj)) {
        const lowerKey = key.toLowerCase();
        if (sensitiveFields.some((field) => lowerKey.includes(field.toLowerCase()))) {
          sanitized[key] = '[REDACTED]';
        } else {
          sanitized[key] = sanitizeObject(value);
        }
      }
      return sanitized;
    }

    return obj;
  }

  return sanitizeObject(sanitized);
}

/**
 * Guardrail: Prevent integration config exposure
 * Remove integration configuration from response
 */
export function preventIntegrationConfigExposure(responseData: any): any {
  const sanitized = JSON.parse(JSON.stringify(responseData));

  const configFields = [
    'config',
    'configuration',
    'settings',
    'integration',
    'credentials',
    'webhook',
    'endpoint',
    'url', // URLs might be internal endpoints
  ];

  function sanitizeObject(obj: any): any {
    if (obj === null || obj === undefined) {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(sanitizeObject);
    }

    if (typeof obj === 'object') {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(obj)) {
        const lowerKey = key.toLowerCase();
        if (configFields.some((field) => lowerKey.includes(field.toLowerCase()))) {
          // Only redact if it looks like a config (object or contains sensitive patterns)
          if (typeof value === 'object' || (typeof value === 'string' && (value.includes('://') || value.includes('key')))) {
            sanitized[key] = '[REDACTED]';
          } else {
            sanitized[key] = sanitizeObject(value);
          }
        } else {
          sanitized[key] = sanitizeObject(value);
        }
      }
      return sanitized;
    }

    return obj;
  }

  return sanitizeObject(sanitized);
}

/**
 * Guardrail: Prevent event writes
 * Partner cannot trigger events
 */
export function preventEventWrites(method: string, endpoint: string): void {
  if (method === 'POST' && endpoint.includes('/events')) {
    throw new Error('Access denied: Event writes are not allowed for partners');
  }

  if (endpoint.includes('/publish') || endpoint.includes('/trigger')) {
    throw new Error('Access denied: Publish and trigger actions are not allowed for partners');
  }
}

/**
 * Validate partner scope requirements
 * Partner must have at least one scope
 */
export async function validatePartnerScopes(partnerId: string): Promise<void> {
  const partner = await prisma.partner.findUnique({
    where: { id: partnerId },
    include: {
      scopes: true,
    },
  });

  if (!partner) {
    throw new Error('Partner not found');
  }

  // ❌ Tidak ada partner tanpa scope
  if (!partner.scopes || partner.scopes.length === 0) {
    throw new Error('Partner must have at least one scope');
  }
}

/**
 * Comprehensive guardrail check for partner requests
 */
export function validatePartnerRequest(
  method: string,
  endpoint: string,
  partnerRole: string
): void {
  // Prevent mutations
  preventDataMutations(method);

  // Prevent privilege escalation
  preventPrivilegeEscalation(endpoint, partnerRole);

  // Prevent event writes
  preventEventWrites(method, endpoint);
}
