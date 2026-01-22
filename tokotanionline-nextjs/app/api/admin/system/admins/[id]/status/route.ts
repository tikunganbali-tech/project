/**
 * STEP 24B-1 — ADMIN USER MANAGEMENT (BACKEND API)
 * 
 * PUT /api/admin/system/admins/[id]/status
 * 
 * Fungsi: Activate / Deactivate admin
 * 
 * Guard:
 * - Permission: system.write
 * - FEATURE_FREEZE
 * 
 * Rules:
 * - ❌ Tidak bisa menonaktifkan diri sendiri
 * - ❌ Tidak boleh menonaktifkan last active super_admin
 */

export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { assertPermission, isSuperAdmin, normalizeRole, type AdminRole } from '@/lib/permissions';
import { FEATURE_FREEZE } from '@/lib/admin-config';
import { prisma } from '@/lib/db';

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
    const userId = (session.user as any).id;
    
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
      return NextResponse.json(
        { error: 'Forbidden: System is in feature freeze mode' },
        { status: 403 }
      );
    }

    const adminId = params.id;

    // 🔒 GUARD 4: SELF-DISABLE CHECK
    // Tidak bisa menonaktifkan diri sendiri
    if (userId === adminId) {
      return NextResponse.json(
        { error: 'Forbidden: Cannot disable yourself' },
        { status: 403 }
      );
    }

    // 📥 PARSE REQUEST
    const body = await req.json();
    const { isActive } = body;

    // ✅ VALIDATION
    if (typeof isActive !== 'boolean') {
      return NextResponse.json(
        { error: 'isActive must be a boolean' },
        { status: 400 }
      );
    }

    // ✅ CHECK ADMIN EXISTS
    const existingAdmin = await prisma.admin.findUnique({
      where: { id: adminId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true, // PHASE 4.1: Include isActive
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!existingAdmin) {
      return NextResponse.json(
        { error: 'Admin not found' },
        { status: 404 }
      );
    }

    const targetRole = normalizeRole(existingAdmin.role);
    const oldStatus = existingAdmin.isActive ?? true;

    // 🔒 GUARD 5: LAST SUPER_ADMIN PROTECTION
    // Tidak boleh menonaktifkan last active super_admin
    if (isActive === false && targetRole === 'super_admin') {
      // Count active super_admins (exclude current target)
      const activeSuperAdmins = await prisma.admin.findMany({
        where: {
          role: 'super_admin',
          isActive: true, // PHASE 4.1: Check isActive field
          id: { not: adminId }, // Exclude target admin
        },
      });

      // Jika hanya ada 1 super_admin (target), block deactivation
      if (activeSuperAdmins.length === 0) {
        return NextResponse.json(
          { error: 'Forbidden: Cannot disable the last active super_admin' },
          { status: 403 }
        );
      }
    }

    // 📝 UPDATE STATUS (PHASE 4.1: Now actually updates isActive field)
    const updatedAdmin = await prisma.admin.update({
      where: { id: adminId },
      data: {
        isActive: isActive,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        lastLogin: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // 📝 AUDIT LOG: admin_status_changed (PHASE 4.1)
    const actorName = (session.user as any).name || 'Unknown';
    try {
      await prisma.eventLog.create({
        data: {
          event: 'admin_status_changed',
          url: `/admin/system/admins/${adminId}/status`,
          meta: {
            adminId: adminId,
            adminEmail: updatedAdmin.email,
            adminName: updatedAdmin.name,
            before: oldStatus ? 'ACTIVE' : 'SUSPENDED',
            after: isActive ? 'ACTIVE' : 'SUSPENDED',
            actorId: userId,
            actorName: actorName,
            timestamp: new Date().toISOString(),
          },
        },
      });
    } catch (auditError: any) {
      // Silent fail - don't break main flow
      console.error('❌ [PUT /api/admin/system/admins/[id]/status] Audit log error:', auditError);
    }

    return NextResponse.json({
      success: true,
      admin: {
        id: updatedAdmin.id,
        email: updatedAdmin.email,
        name: updatedAdmin.name,
        role: targetRole,
        isActive: updatedAdmin.isActive,
        lastLogin: updatedAdmin.lastLogin?.toISOString() || null,
        createdAt: updatedAdmin.createdAt.toISOString(),
        updatedAt: updatedAdmin.updatedAt.toISOString(),
      },
      message: `Admin status updated to ${isActive ? 'ACTIVE' : 'SUSPENDED'}`,
    });

  } catch (error: any) {
    console.error('❌ [PUT /api/admin/system/admins/[id]/status] Error:', error);
    
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Admin not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
