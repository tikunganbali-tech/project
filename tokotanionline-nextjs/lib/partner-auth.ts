/**
 * PHASE 9A: Partner Authentication (READ-ONLY)
 * 
 * Separate authentication system for partners
 * - Token-based authentication (API keys or JWT)
 * - Scope-bound access
 * - No reuse of admin tokens
 * - Session & token scope-bound
 */

import { prisma } from './db';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export interface PartnerAuthResult {
  partner: {
    id: string;
    partnerId: string;
    partnerName: string;
    status: string;
  };
  scopes: Array<{
    id: string;
    brandId: string | null;
    localeId: string | null;
    channel: string | null;
    pageType: string | null;
  }>;
}

/**
 * Authenticate partner from request
 * Supports:
 * - Bearer token (Authorization header)
 * - API key (X-API-Key header)
 * - Session token (Cookie)
 */
export async function authenticatePartner(
  request: NextRequest
): Promise<PartnerAuthResult | null> {
  try {
    // Try Bearer token first
    const authHeader = request.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      return await authenticateByToken(token, request);
    }

    // Try API key
    const apiKey = request.headers.get('x-api-key');
    if (apiKey) {
      return await authenticateByApiKey(apiKey, request);
    }

    // Try session token from cookie
    const sessionToken = request.cookies.get('partner_session')?.value;
    if (sessionToken) {
      return await authenticateBySessionToken(sessionToken, request);
    }

    return null;
  } catch (error: any) {
    console.error('[Partner Auth] Error:', error?.message || error);
    return null;
  }
}

/**
 * Authenticate by Bearer token (JWT or session token)
 */
async function authenticateByToken(
  token: string,
  request: NextRequest
): Promise<PartnerAuthResult | null> {
  // Find partner session by token
  const session = await prisma.partnerSession.findUnique({
    where: { sessionToken: token },
    include: {
      partner: {
        include: {
          scopes: {
            include: {
              brand: true,
              locale: true,
            },
          },
        },
      },
    },
  });

  if (!session) {
    return null;
  }

  // Check if session expired
  if (session.expiresAt < new Date()) {
    // Clean up expired session
    await prisma.partnerSession.delete({
      where: { id: session.id },
    }).catch(() => {});
    return null;
  }

  // Check partner status
  if (session.partner.status !== 'ACTIVE') {
    return null;
  }

  // Update last access
  await prisma.partnerSession.update({
    where: { id: session.id },
    data: { lastAccessAt: new Date() },
  }).catch(() => {});

  // Check if partner has scopes (required)
  if (!session.partner.scopes || session.partner.scopes.length === 0) {
    return null; // ❌ Tidak ada partner tanpa scope
  }

  return {
    partner: {
      id: session.partner.id,
      partnerId: session.partner.partnerId,
      partnerName: session.partner.partnerName,
      status: session.partner.status,
    },
    scopes: session.partner.scopes.map((scope) => ({
      id: scope.id,
      brandId: scope.brandId,
      localeId: scope.localeId,
      channel: scope.channel,
      pageType: scope.pageType,
    })),
  };
}

/**
 * Authenticate by API key
 * For now, API key is treated as session token
 * In production, you might want a separate PartnerApiKey model
 */
async function authenticateByApiKey(
  apiKey: string,
  request: NextRequest
): Promise<PartnerAuthResult | null> {
  // For PHASE 9A, treat API key as session token
  // In future phases, implement dedicated API key model
  return authenticateByToken(apiKey, request);
}

/**
 * Authenticate by session token from cookie
 */
async function authenticateBySessionToken(
  sessionToken: string,
  request: NextRequest
): Promise<PartnerAuthResult | null> {
  return authenticateByToken(sessionToken, request);
}

/**
 * Require partner authentication
 * Throws error or returns null if not authenticated
 */
export async function requirePartnerAuth(
  request: NextRequest
): Promise<PartnerAuthResult> {
  const authResult = await authenticatePartner(request);

  if (!authResult) {
    throw new Error('Unauthorized: Partner authentication required');
  }

  return authResult;
}

/**
 * Check if partner has access to a specific scope
 */
export function hasScopeAccess(
  scopes: PartnerAuthResult['scopes'],
  brandId?: string | null,
  localeId?: string | null,
  channel?: string | null,
  pageType?: string | null
): boolean {
  if (scopes.length === 0) {
    return false;
  }

  // Check if any scope matches
  return scopes.some((scope) => {
    // Brand check
    if (brandId !== undefined && brandId !== null) {
      if (scope.brandId !== null && scope.brandId !== brandId) {
        return false;
      }
    }

    // Locale check
    if (localeId !== undefined && localeId !== null) {
      if (scope.localeId !== null && scope.localeId !== localeId) {
        return false;
      }
    }

    // Channel check
    if (channel !== undefined && channel !== null) {
      if (scope.channel !== null && scope.channel !== channel) {
        return false;
      }
    }

    // Page type check
    if (pageType !== undefined && pageType !== null) {
      if (scope.pageType !== null && scope.pageType !== pageType) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Filter scopes based on request parameters
 */
export function filterScopesByRequest(
  scopes: PartnerAuthResult['scopes'],
  brandId?: string | null,
  localeId?: string | null,
  channel?: string | null,
  pageType?: string | null
): PartnerAuthResult['scopes'] {
  return scopes.filter((scope) => {
    // Brand filter
    if (brandId !== undefined && brandId !== null) {
      if (scope.brandId !== null && scope.brandId !== brandId) {
        return false;
      }
    }

    // Locale filter
    if (localeId !== undefined && localeId !== null) {
      if (scope.localeId !== null && scope.localeId !== localeId) {
        return false;
      }
    }

    // Channel filter
    if (channel !== undefined && channel !== null) {
      if (scope.channel !== null && scope.channel !== channel) {
        return false;
      }
    }

    // Page type filter
    if (pageType !== undefined && pageType !== null) {
      if (scope.pageType !== null && scope.pageType !== pageType) {
        return false;
      }
    }

    return true;
  });
}
