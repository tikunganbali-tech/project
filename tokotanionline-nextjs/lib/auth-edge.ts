/**
 * E3.1.1 — EDGE-SAFE AUTH CONFIG (MIDDLEWARE ONLY)
 * 
 * KONTRAK TEKNIS:
 * - NO Prisma imports
 * - NO database dependencies
 * - NO NextAuth imports (causes openid-client issues in edge runtime)
 * - JWT-only session reading using jose library
 * - Edge Runtime compatible
 * 
 * Usage: Middleware only (for reading sessions)
 * Login/signIn: Use lib/auth.ts (with Prisma) in API routes
 */

import { type NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const SESSION_MAX_AGE_SHORT_SECONDS = 60 * 60 * 8; // 8 hours
const SESSION_MAX_AGE_LONG_SECONDS = 60 * 60 * 24 * 30; // 30 days

// E3.1: FAIL-FAST ENV CHECK - VPS-FRIENDLY (ALL ENVIRONMENTS)
const nextAuthSecret = process.env.NEXTAUTH_SECRET;
if (!nextAuthSecret) {
  throw new Error('NEXTAUTH_SECRET is required (missing environment variable)');
}

// Cookie name based on environment
const getCookieName = () => {
  return process.env.NODE_ENV === 'production' 
    ? '__Secure-authjs.session-token' 
    : 'authjs.session-token';
};

/**
 * Edge-safe auth function for middleware
 * Reads JWT from cookie and verifies it without using NextAuth
 */
export async function auth(request?: NextRequest): Promise<{ user: { id?: string; email?: string; role?: string } } | null> {
  try {
    // Get cookie from request or from headers
    const cookieName = getCookieName();
    let token: string | undefined;
    
    if (request) {
      token = request.cookies.get(cookieName)?.value;
    } else {
      // Fallback: try to get from headers (for edge runtime)
      // This is a workaround - in practice, request should always be provided
      return null;
    }

    if (!token) {
      return null;
    }

    // Verify JWT using jose (edge-compatible)
    const secret = new TextEncoder().encode(nextAuthSecret);
    const { payload } = await jwtVerify(token, secret);

    // Extract user info from payload
    const user = {
      id: payload.sub || payload.id as string,
      email: payload.email as string,
      role: payload.role as string,
    };

    return { user };
  } catch (error) {
    // Invalid token or verification failed
    return null;
  }
}
