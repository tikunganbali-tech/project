/**
 * PHASE 10 - CORS Configuration
 * 
 * Strict CORS policy with origin whitelist
 * Different policies for public/admin/partner endpoints
 */

import { NextRequest, NextResponse } from 'next/server';

// Allowed origins (from environment)
const getAllowedOrigins = (): string[] => {
  const origins = process.env.CORS_ALLOWED_ORIGINS || '';
  return origins
    .split(',')
    .map(o => o.trim())
    .filter(o => o.length > 0);
};

// Default allowed origins (for development)
const DEFAULT_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:3001',
];

/**
 * Check if origin is allowed
 */
export function isOriginAllowed(origin: string | null): boolean {
  if (!origin) return false;

  const allowed = getAllowedOrigins();
  
  // If no origins configured, allow localhost in development
  if (allowed.length === 0) {
    if (process.env.NODE_ENV === 'development') {
      return DEFAULT_ORIGINS.includes(origin);
    }
    return false; // Production requires explicit configuration
  }

  return allowed.includes(origin);
}

/**
 * Apply CORS headers to response
 */
export function applyCORSHeaders(
  request: NextRequest,
  response: NextResponse,
  options: {
    allowCredentials?: boolean;
    allowedMethods?: string[];
    allowedHeaders?: string[];
    maxAge?: number;
  } = {}
): NextResponse {
  const origin = request.headers.get('origin');
  const isAllowed = isOriginAllowed(origin);

  if (!isAllowed && origin) {
    // Origin not allowed - return error
    return NextResponse.json(
      { error: 'CORS policy: Origin not allowed' },
      { status: 403 }
    );
  }

  // Set CORS headers
  if (isAllowed && origin) {
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set(
      'Access-Control-Allow-Methods',
      (options.allowedMethods || ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']).join(', ')
    );
    response.headers.set(
      'Access-Control-Allow-Headers',
      (options.allowedHeaders || ['Content-Type', 'Authorization']).join(', ')
    );
    
    if (options.allowCredentials) {
      response.headers.set('Access-Control-Allow-Credentials', 'true');
    }

    if (options.maxAge) {
      response.headers.set('Access-Control-Max-Age', options.maxAge.toString());
    }
  }

  return response;
}

/**
 * Handle CORS preflight request
 */
export function handleCORS(request: NextRequest): NextResponse | null {
  if (request.method === 'OPTIONS') {
    const origin = request.headers.get('origin');
    
    if (!isOriginAllowed(origin)) {
      return NextResponse.json(
        { error: 'CORS policy: Origin not allowed' },
        { status: 403 }
      );
    }

    const response = new NextResponse(null, { status: 204 });
    return applyCORSHeaders(request, response, {
      allowCredentials: true,
      maxAge: 86400, // 24 hours
    });
  }

  return null;
}
