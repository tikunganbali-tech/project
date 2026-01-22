/**
 * FASE F — F2: ADMIN & LINK ROTATION (BACKEND API)
 * 
 * PUT /api/admin/sales-admins/[id] - Update sales admin
 * DELETE /api/admin/sales-admins/[id] - Delete sales admin
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
 * PUT /api/admin/sales-admins/[id]
 * 
 * Fungsi: Update sales admin
 * 
 * Request Body:
 * {
 *   name?: string
 *   whatsapp?: string
 *   shopeeLink?: string
 *   tokopediaLink?: string
 *   isActive?: boolean
 *   activeHours?: string
 *   sortOrder?: number
 * }
 */
export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
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
    const updateData: any = {};

    if (name !== undefined) {
      updateData.name = name.trim();
    }

    if (whatsapp !== undefined) {
      const cleanWhatsapp = whatsapp.replace(/[\s\+-]/g, '');
      if (!/^\d+$/.test(cleanWhatsapp)) {
        return NextResponse.json(
          { error: 'Invalid WhatsApp number format' },
          { status: 400 }
        );
      }
      updateData.whatsapp = cleanWhatsapp;
    }

    if (shopeeLink !== undefined) {
      if (shopeeLink && !shopeeLink.startsWith('http')) {
        return NextResponse.json(
          { error: 'Shopee link must be a valid URL' },
          { status: 400 }
        );
      }
      updateData.shopeeLink = shopeeLink?.trim() || null;
    }

    if (tokopediaLink !== undefined) {
      if (tokopediaLink && !tokopediaLink.startsWith('http')) {
        return NextResponse.json(
          { error: 'Tokopedia link must be a valid URL' },
          { status: 400 }
        );
      }
      updateData.tokopediaLink = tokopediaLink?.trim() || null;
    }

    if (isActive !== undefined) {
      updateData.isActive = isActive;
      
      // ✅ VALIDATION: Tidak boleh semua admin nonaktif
      if (isActive === false) {
        const allAdmins = await prisma.salesAdmin.findMany({
          select: { id: true, isActive: true },
        });
        
        const activeCount = allAdmins.filter(a => a.isActive).length;
        const willBeActive = activeCount - (allAdmins.find(a => a.id === params.id)?.isActive ? 1 : 0);
        
        if (willBeActive === 0) {
          return NextResponse.json(
            { error: 'Cannot deactivate: At least one sales admin must be active' },
            { status: 400 }
          );
        }
      }
    }

    if (activeHours !== undefined) {
      updateData.activeHours = activeHours?.trim() || null;
    }

    if (sortOrder !== undefined) {
      updateData.sortOrder = sortOrder;
    }

    // 🎨 UPDATE SALES ADMIN
    const updatedAdmin = await prisma.salesAdmin.update({
      where: { id: params.id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      admin: {
        id: updatedAdmin.id,
        name: updatedAdmin.name,
        whatsapp: updatedAdmin.whatsapp,
        shopeeLink: updatedAdmin.shopeeLink,
        tokopediaLink: updatedAdmin.tokopediaLink,
        isActive: updatedAdmin.isActive,
        activeHours: updatedAdmin.activeHours,
        clickCount: updatedAdmin.clickCount,
        lastUsed: updatedAdmin.lastUsed?.toISOString() || null,
        sortOrder: updatedAdmin.sortOrder,
        createdAt: updatedAdmin.createdAt.toISOString(),
        updatedAt: updatedAdmin.updatedAt.toISOString(),
      },
    });
  } catch (error: any) {
    console.error('❌ [PUT /api/admin/sales-admins/[id]] Error:', error);
    
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Sales admin not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/sales-admins/[id]
 * 
 * Fungsi: Delete sales admin
 */
export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
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

    // 🎨 DELETE SALES ADMIN
    await prisma.salesAdmin.delete({
      where: { id: params.id },
    });

    return NextResponse.json({
      success: true,
      message: 'Sales admin deleted successfully',
    });
  } catch (error: any) {
    console.error('❌ [DELETE /api/admin/sales-admins/[id]] Error:', error);
    
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Sales admin not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
