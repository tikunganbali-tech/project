/**
 * POST /api/admin/auth/login
 * 
 * Admin login endpoint with rate limiting and security
 * 
 * This endpoint validates credentials and applies rate limiting.
 * Actual session creation is handled by NextAuth via /api/auth/callback/credentials
 * when client calls signIn() from 'next-auth/react'.
 * 
 * For API-only usage, this endpoint validates credentials and returns user info.
 * The client must still use NextAuth's signIn() to create the session cookie.
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/rate-limit';
import { prisma } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { logActivity } from '@/lib/activity-logger';

export async function POST(request: NextRequest) {
  try {
    // Rate limiting: 5 attempts per 15 minutes per IP
    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0] : 
               request.headers.get('x-real-ip') || 
               'unknown';
    
    const rateLimit = checkRateLimit(ip, 'login');
    
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Terlalu banyak percobaan login. Silakan coba lagi nanti.' 
        },
        {
          status: 429,
          headers: {
            'Retry-After': Math.ceil((rateLimit.resetTime - Date.now()) / 1000).toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': new Date(rateLimit.resetTime).toISOString(),
          },
        }
      );
    }

    const body = await request.json();
    const { email, password } = body;

    // Validate input
    if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
      // Generic error (don't leak which field is missing)
      return NextResponse.json(
        { success: false, error: 'Email atau password salah' },
        { status: 401 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Find admin
    const admin = await prisma.admin.findUnique({
      where: { email: normalizedEmail },
    });

    // Generic error if admin not found (security - don't leak email existence)
    if (!admin) {
      return NextResponse.json(
        { success: false, error: 'Email atau password salah' },
        { status: 401 }
      );
    }

    // Check if admin is active
    if (!admin.isActive) {
      return NextResponse.json(
        { success: false, error: 'Email atau password salah' },
        { status: 401 }
      );
    }

    // Verify password
    const isValid = await bcrypt.compare(password, admin.passwordHash);

    if (!isValid) {
      return NextResponse.json(
        { success: false, error: 'Email atau password salah' },
        { status: 401 }
      );
    }

    // Update lastLogin
    try {
      await prisma.admin.update({
        where: { id: admin.id },
        data: { lastLogin: new Date() },
      });
    } catch (error) {
      // Silent fail - don't break login flow
      console.error('[admin/auth/login] Failed to update lastLogin:', error);
    }

    // Activity log
    await logActivity({
      actorId: admin.id,
      action: 'LOGIN',
      entityType: 'USER',
      entityId: admin.id,
      metadata: {
        email: admin.email,
        role: admin.role,
      },
    });

    // Return success with user info
    // Note: Session creation must be done via NextAuth signIn() from client
    // This endpoint validates credentials only
    return NextResponse.json({
      success: true,
      user: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: admin.role,
      },
    });

  } catch (error: any) {
    console.error('[admin/auth/login] Error:', error?.message || error);
    
    // Generic error response
    return NextResponse.json(
      { success: false, error: 'Email atau password salah' },
      { status: 401 }
    );
  }
}
