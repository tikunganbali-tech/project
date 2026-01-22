/**
 * FASE F — F2: ADMIN & LINK ROTATION (BACKEND API)
 * 
 * GET /api/admin/sales-admins - List sales admins
 * POST /api/admin/sales-admins - Create sales admin
 * 
 * Guards & Validasi:
 * - Auth required
 * - Permission: system.manage
 * - FEATURE_FREEZE respected
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { assertPermission } from '@/lib/permissions';
import { FEATURE_FREEZE } from '@/lib/admin-config';
import { prisma } from '@/lib/db';

/**
 * GET /api/admin/sales-admins
 * 
 * Fungsi: List sales admins
 * 
 * Guard:
 * - Auth required
 * - Permission: system.view
 * 
 * Response:
 * {
 *   success: true,
 *   admins: Array<{
 *     id, name, whatsapp, shopeeLink, tokopediaLink,
 *     isActive, activeHours, clickCount, lastUsed, sortOrder,
 *     createdAt, updatedAt
 *   }>,
 *   count: number
 * }
 */
export async function GET() {
  try {
    // 🔒 GUARD 1: AUTHENTICATION CHECK
    const session = await getServerSession();
    
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized: Not authenticated' },
        { status: 401 }
      );
    }

    // 🔒 GUARD 2: PERMISSION CHECK
    const userRole = (session.user as any).role;
    try {
      assertPermission(userRole, 'system.view');
    } catch (error: any) {
      if (error.status === 403 || error.statusCode === 403) {
        return NextResponse.json(
          { error: 'Forbidden: Insufficient permissions' },
          { status: 403 }
        );
      }
      throw error;
    }

    // 📥 FETCH SALES ADMINS
    const admins = await prisma.salesAdmin.findMany({
      orderBy: [
        { sortOrder: 'asc' },
        { createdAt: 'asc' },
      ],
    });

    // 🎨 FORMAT RESPONSE
    const formattedAdmins = admins.map((admin) => ({
      id: admin.id,
      name: admin.name,
      whatsapp: admin.whatsapp,
      shopeeLink: admin.shopeeLink,
      tokopediaLink: admin.tokopediaLink,
      isActive: admin.isActive,
      activeHours: admin.activeHours,
      clickCount: admin.clickCount,
      lastUsed: admin.lastUsed?.toISOString() || null,
      sortOrder: admin.sortOrder,
      createdAt: admin.createdAt.toISOString(),
      updatedAt: admin.updatedAt.toISOString(),
    }));

    return NextResponse.json({
      success: true,
      admins: formattedAdmins,
      count: formattedAdmins.length,
    });
  } catch (error: any) {
    console.error('❌ [GET /api/admin/sales-admins] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/sales-admins
 * 
 * Fungsi: Create sales admin
 * 
 * Guard:
 * - Permission: system.manage
 * - FEATURE_FREEZE → block jika aktif
 * 
 * Request Body:
 * {
 *   name: string (required)
 *   whatsapp: string (required)
 *   shopeeLink?: string (optional)
 *   tokopediaLink?: string (optional)
 *   isActive?: boolean (default: true)
 *   activeHours?: string (optional)
 *   sortOrder?: number (default: 0)
 * }
 */
export async function POST(req: Request) {
  try {
    // 🔒 GUARD 1: AUTHENTICATION CHECK
    const session = await getServerSession();
    
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized: Not authenticated' },
        { status: 401 }
      );
    }

    // 🔒 GUARD 2: PERMISSION CHECK
    const userRole = (session.user as any).role;
    try {
      assertPermission(userRole, 'system.manage');
    } catch (error: any) {
      if (error.status === 403 || error.statusCode === 403) {
        return NextResponse.json(
          { error: 'Forbidden: Insufficient permissions' },
          { status: 403 }
        );
      }
      throw error;
    }

    // 🔒 GUARD 3: FEATURE_FREEZE CHECK
    if (FEATURE_FREEZE) {
      const isSuperAdmin = userRole === 'super_admin';
      if (!isSuperAdmin) {
        return NextResponse.json(
          { error: 'Forbidden: System is in feature freeze mode' },
          { status: 403 }
        );
      }
    }

    // 📥 PARSE REQUEST
    const body = await req.json();
    const { name, whatsapp, shopeeLink, tokopediaLink, isActive, activeHours, sortOrder } = body;

    // ✅ VALIDATION
    if (!name || !whatsapp) {
      return NextResponse.json(
        { error: 'Name and WhatsApp are required' },
        { status: 400 }
      );
    }

    // Validate WhatsApp format (basic: digits only, optional + prefix)
    const cleanWhatsapp = whatsapp.replace(/[\s\+-]/g, '');
    if (!/^\d+$/.test(cleanWhatsapp)) {
      return NextResponse.json(
        { error: 'Invalid WhatsApp number format' },
        { status: 400 }
      );
    }

    // Validate URLs if provided
    if (shopeeLink && !shopeeLink.startsWith('http')) {
      return NextResponse.json(
        { error: 'Shopee link must be a valid URL' },
        { status: 400 }
      );
    }

    if (tokopediaLink && !tokopediaLink.startsWith('http')) {
      return NextResponse.json(
        { error: 'Tokopedia link must be a valid URL' },
        { status: 400 }
      );
    }

    // ✅ VALIDATION: Tidak boleh semua admin nonaktif
    // Check if this will be the only active admin
    if (isActive === false) {
      const existingActiveAdmins = await prisma.salesAdmin.count({
        where: { isActive: true },
      });
      
      if (existingActiveAdmins === 0) {
        return NextResponse.json(
          { error: 'Cannot create inactive admin: At least one sales admin must be active' },
          { status: 400 }
        );
      }
    }

    // 🎨 CREATE SALES ADMIN
    const newAdmin = await prisma.salesAdmin.create({
      data: {
        name: name.trim(),
        whatsapp: cleanWhatsapp,
        shopeeLink: shopeeLink?.trim() || null,
        tokopediaLink: tokopediaLink?.trim() || null,
        isActive: isActive !== false, // Default: true
        activeHours: activeHours?.trim() || null,
        sortOrder: sortOrder || 0,
        clickCount: 0,
      },
    });

    return NextResponse.json(
      {
        success: true,
        admin: {
          id: newAdmin.id,
          name: newAdmin.name,
          whatsapp: newAdmin.whatsapp,
          shopeeLink: newAdmin.shopeeLink,
          tokopediaLink: newAdmin.tokopediaLink,
          isActive: newAdmin.isActive,
          activeHours: newAdmin.activeHours,
          clickCount: newAdmin.clickCount,
          lastUsed: newAdmin.lastUsed?.toISOString() || null,
          sortOrder: newAdmin.sortOrder,
          createdAt: newAdmin.createdAt.toISOString(),
          updatedAt: newAdmin.updatedAt.toISOString(),
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('❌ [POST /api/admin/sales-admins] Error:', error);
    
    // Handle unique constraint violation
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Sales admin with this data already exists' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
