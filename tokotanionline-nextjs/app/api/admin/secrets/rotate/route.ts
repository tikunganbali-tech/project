/**
 * PHASE 10 - Secret Rotation API
 * 
 * POST /api/admin/secrets/rotate
 * 
 * Rotate secrets with audit logging
 * Requires: super_admin role
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import crypto from 'crypto';

/**
 * Generate a secure random secret
 */
function generateSecret(length: number = 32): string {
  return crypto.randomBytes(length).toString('base64');
}

/**
 * Rotate a secret
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user is super_admin
    const admin = await prisma.admin.findUnique({
      where: { email: session.user.email! },
    });

    if (!admin || admin.role !== 'super_admin') {
      return NextResponse.json(
        { error: 'Forbidden: super_admin role required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { secretType, newValue } = body;

    if (!secretType) {
      return NextResponse.json(
        { error: 'secretType is required' },
        { status: 400 }
      );
    }

    // Validate secret type
    const allowedTypes = [
      'NEXTAUTH_SECRET',
      'INTERNAL_EVENT_KEY',
      'SCHEDULER_SERVICE_TOKEN',
    ];

    if (!allowedTypes.includes(secretType)) {
      return NextResponse.json(
        { error: `Invalid secretType. Allowed: ${allowedTypes.join(', ')}` },
        { status: 400 }
      );
    }

    // Generate new secret if not provided
    const secretValue = newValue || generateSecret(32);

    // Log rotation in audit log
    await prisma.auditLog.create({
      data: {
        action: 'SECRET_ROTATION',
        entityType: 'SECRET',
        entityId: secretType,
        userId: admin.id,
        metadata: {
          secretType,
          rotatedAt: new Date().toISOString(),
          rotatedBy: admin.email,
        },
      },
    });

    // Return new secret (user must update environment variable manually)
    return NextResponse.json({
      success: true,
      message: `Secret ${secretType} rotation initiated`,
      newSecret: secretValue,
      instructions: [
        `1. Update ${secretType} in your environment variables`,
        `2. Restart the application`,
        `3. Verify the new secret is working`,
        `4. Keep the old secret for rollback if needed`,
      ],
      warning: 'This secret is shown once. Save it securely before closing this response.',
    });
  } catch (error: any) {
    console.error('[secret-rotation] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to rotate secret' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/secrets/rotate - Get rotation history
 */
export async function GET() {
  try {
    const session = await getServerSession();
    
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const admin = await prisma.admin.findUnique({
      where: { email: session.user.email! },
    });

    if (!admin || admin.role !== 'super_admin') {
      return NextResponse.json(
        { error: 'Forbidden: super_admin role required' },
        { status: 403 }
      );
    }

    // Get rotation history from audit log
    const rotations = await prisma.auditLog.findMany({
      where: {
        action: 'SECRET_ROTATION',
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 50,
      select: {
        id: true,
        entityId: true,
        userId: true,
        createdAt: true,
        metadata: true,
        user: {
          select: {
            email: true,
          },
        },
      },
    });

    return NextResponse.json({
      rotations: rotations.map(r => ({
        id: r.id,
        secretType: r.entityId,
        rotatedBy: r.user.email,
        rotatedAt: r.createdAt,
        metadata: r.metadata,
      })),
    });
  } catch (error: any) {
    console.error('[secret-rotation] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch rotation history' },
      { status: 500 }
    );
  }
}
