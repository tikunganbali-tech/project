/**
 * POST /api/admin/auth/reset-password
 * 
 * Admin reset password endpoint
 * Validates token and updates password
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { logActivity } from '@/lib/activity-logger';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, password } = body;

    // Validate input
    if (!token || typeof token !== 'string' || !password || typeof password !== 'string') {
      return NextResponse.json({ 
        success: false,
        message: 'Link reset tidak valid atau telah kedaluwarsa.'
      }, { status: 400 });
    }

    // Validate password length
    if (password.length < 6) {
      return NextResponse.json({ 
        success: false,
        message: 'Link reset tidak valid atau telah kedaluwarsa.'
      }, { status: 400 });
    }

    const now = new Date();

    // Find all unused and non-expired tokens
    // We need to check all tokens because tokenHash is hashed, so we can't query directly
    const validTokens = await prisma.adminPasswordResetToken.findMany({
      where: {
        usedAt: null,
        expiresAt: { gt: now }, // Not expired
      },
      include: {
        admin: true,
      },
    });

    // Find matching token by comparing plaintext token with hashed tokens
    let matchedToken: (typeof validTokens)[0] | null = null;
    for (const tokenRecord of validTokens) {
      const isMatch = await bcrypt.compare(token, tokenRecord.tokenHash);
      if (isMatch) {
        matchedToken = tokenRecord;
        break;
      }
    }

    // If no matching token found, return generic error
    if (!matchedToken) {
      return NextResponse.json({ 
        success: false,
        message: 'Link reset tidak valid atau telah kedaluwarsa.'
      }, { status: 400 });
    }

    // Token is valid - proceed with password reset
    // Hash new password
    const passwordHash = await bcrypt.hash(password, 10);

    // Update admin password
    await prisma.admin.update({
      where: { id: matchedToken.adminId },
      data: { passwordHash },
    });

    // Mark token as used (one-time use)
    await prisma.adminPasswordResetToken.update({
      where: { id: matchedToken.id },
      data: { usedAt: now },
    });

    // Activity log
    await logActivity({
      actorId: matchedToken.adminId,
      action: 'RESET_PASSWORD',
      entityType: 'USER',
      entityId: matchedToken.adminId,
      metadata: {
        email: matchedToken.admin.email,
      },
    });

    // Return generic success response
    return NextResponse.json({ 
      success: true,
      message: 'Password berhasil diperbarui. Silakan login.'
    });

  } catch (error: any) {
    console.error('❌ Reset password error:', error);
    
    // Return generic error (don't leak details)
    return NextResponse.json({ 
      success: false,
      message: 'Link reset tidak valid atau telah kedaluwarsa.'
    }, { status: 400 });
  }
}
