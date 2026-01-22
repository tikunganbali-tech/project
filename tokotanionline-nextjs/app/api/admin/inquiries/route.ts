/**
 * STEP 2B — PUBLIC INQUIRY ADMIN VIEWER (READ-ONLY)
 * 
 * GET /api/admin/inquiries
 * 
 * Purpose: Admin read-only viewer untuk public inquiries
 * 
 * 🔒 GUARDS (WAJIB):
 * - Auth check (session required)
 * - Role check (role ≥ admin, yaitu: super_admin, admin, content_admin, marketing_admin)
 * - Read-only (NO mutations, NO side effects)
 * 
 * ❌ DILARANG:
 * - prisma.update
 * - prisma.delete
 * - prisma.create
 * - Any mutation operations
 * 
 * Query Params:
 * - page: number (default: 1)
 * - limit: number (default: 20, max: 100)
 * - fromDate: ISO date string (optional)
 * - toDate: ISO date string (optional)
 * - q: search text (optional, search in name, contact, message)
 * 
 * Response:
 * {
 *   items: PublicInquiry[],
 *   pagination: { page, limit, total, totalPages }
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    // 🔒 GUARD 1: AUTHENTICATION CHECK
    const session = await getServerSession();
    
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized: Not authenticated' },
        { status: 401 }
      );
    }

    // 🔒 GUARD 2: ROLE CHECK (role ≥ admin)
    const userRole = (session.user as any).role;
    const canRead = hasPermission(userRole, 'admin.read');

    if (!canRead) {
      return NextResponse.json(
        { error: 'Forbidden: Insufficient permissions' },
        { status: 403 }
      );
    }

    // 📥 PARSE QUERY PARAMS
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100); // Max 100
    const fromDate = searchParams.get('fromDate');
    const toDate = searchParams.get('toDate');
    const q = searchParams.get('q')?.trim() || null;

    // 🔍 BUILD WHERE CLAUSE (READ-ONLY, NO MUTATION)
    const where: any = {};

    // Date range filter
    if (fromDate || toDate) {
      where.createdAt = {};
      if (fromDate) {
        where.createdAt.gte = new Date(fromDate);
      }
      if (toDate) {
        where.createdAt.lte = new Date(toDate);
      }
    }

    // Search filter (name, contact, message)
    if (q) {
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { contact: { contains: q, mode: 'insensitive' } },
        { message: { contains: q, mode: 'insensitive' } },
      ];
    }

    // 📊 COUNT TOTAL (READ-ONLY)
    const total = await prisma.publicInquiry.count({ where });

    // 📖 FETCH INQUIRIES (READ-ONLY, NO MUTATION)
    const items = await prisma.publicInquiry.findMany({
      where,
      select: {
        id: true,
        name: true,
        contact: true,
        message: true,
        context: true,
        contextId: true,
        ipAddress: true,
        userAgent: true,
        createdAt: true,
        // ❌ TIDAK ada field status/processed/handled (tidak ada di model)
      },
      orderBy: {
        createdAt: 'desc', // Latest first
      },
      skip: (page - 1) * limit,
      take: limit,
    });

    // 📄 CALCULATE PAGINATION
    const totalPages = total > 0 ? Math.ceil(total / limit) : 0;

    // ✅ RETURN RESPONSE (READ-ONLY, NO SIDE EFFECTS)
    return NextResponse.json({
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    });
  } catch (error: any) {
    console.error('Error fetching inquiries:', error);
    return NextResponse.json(
      { error: 'Failed to fetch inquiries' },
      { status: 500 }
    );
  }
}

// ❌ EXPLICITLY BLOCK OTHER METHODS (NO MUTATIONS)
export async function POST() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}

export async function PUT() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}

export async function PATCH() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}
