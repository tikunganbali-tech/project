/**
 * STEP 24B-1 — ADMIN USER MANAGEMENT (BACKEND API)
 * 
 * PUT /api/admin/system/admins/[id]/role
 * 
 * Fungsi: Assign role
 * 
 * Guard:
 * - Permission: system.write
 * - Requester HARUS super_admin
 * - FEATURE_FREEZE
 * 
 * Rules KERAS:
 * - ❌ Tidak bisa mengubah role diri sendiri
 * - ❌ Tidak bisa assign super_admin kecuali requester super_admin
 * - Role divalidasi via permissions.ts
 */

export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { 
  assertPermission, 
  isSuperAdmin,
  normalizeRole,
  type AdminRole 
} from '@/lib/permissions';
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

    // 🔒 GUARD 3: SUPER_ADMIN CHECK
    // Requester HARUS super_admin untuk assign role
    if (!isSuperAdmin(userRole)) {
      return NextResponse.json(
        { error: 'Forbidden: Only super_admin can assign roles' },
        { status: 403 }
      );
    }

    // 🔒 GUARD 4: FEATURE_FREEZE CHECK
    if (FEATURE_FREEZE) {
      return NextResponse.json(
        { error: 'Forbidden: System is in feature freeze mode' },
        { status: 403 }
      );
    }

    const adminId = params.id;

    // 🔒 GUARD 5: SELF-ROLE-CHANGE CHECK
    // Tidak bisa mengubah role diri sendiri
    if (userId === adminId) {
      return NextResponse.json(
        { error: 'Forbidden: Cannot change your own role' },
        { status: 403 }
      );
    }

    // 📥 PARSE REQUEST
    const body = await req.json();
    const { role } = body;

    // ✅ VALIDATION
    if (!role) {
      return NextResponse.json(
        { error: 'Role is required' },
        { status: 400 }
      );
    }

    // ✅ ROLE VALIDATION
    const validRoles: AdminRole[] = ['super_admin', 'admin', 'viewer'];
    if (!validRoles.includes(role as AdminRole)) {
      return NextResponse.json(
        { error: `Role must be one of: ${validRoles.join(', ')}` },
        { status: 400 }
      );
    }

    // 🔒 GUARD 6: SUPER_ADMIN ASSIGNMENT CHECK
    // Tidak bisa assign super_admin kecuali requester super_admin
    // (Sudah dicek di GUARD 3, tapi double-check)
    if (role === 'super_admin' && !isSuperAdmin(userRole)) {
      return NextResponse.json(
        { error: 'Forbidden: Only super_admin can assign super_admin role' },
        { status: 403 }
      );
    }

    // ✅ CHECK ADMIN EXISTS
    const existingAdmin = await prisma.admin.findUnique({
      where: { id: adminId },
    });

    if (!existingAdmin) {
      return NextResponse.json(
        { error: 'Admin not found' },
        { status: 404 }
      );
    }

    const oldRole = normalizeRole(existingAdmin.role);

    // 📝 UPDATE ROLE
    const updatedAdmin = await prisma.admin.update({
      where: { id: adminId },
      data: {
        role: role, // Store role as-is (akan dinormalize saat read)
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // 📝 AUDIT LOG: admin_role_changed (PHASE 4.1)
    const actorName = (session.user as any).name || 'Unknown';
    try {
      await prisma.eventLog.create({
        data: {
          event: 'admin_role_changed',
          url: `/admin/system/admins/${adminId}/role`,
          meta: {
            adminId: adminId,
            adminEmail: updatedAdmin.email,
            adminName: updatedAdmin.name,
            before: oldRole,
            after: normalizeRole(role) as AdminRole,
            actorId: userId,
            actorName: actorName,
            timestamp: new Date().toISOString(),
          },
        },
      });
    } catch (auditError: any) {
      // Silent fail - don't break main flow
      console.error('❌ [PUT /api/admin/system/admins/[id]/role] Audit log error:', auditError);
    }

    return NextResponse.json({
      success: true,
      admin: {
        id: updatedAdmin.id,
        email: updatedAdmin.email,
        name: updatedAdmin.name,
        role: normalizeRole(updatedAdmin.role) as AdminRole,
        isActive: updatedAdmin.isActive ?? true,
        createdAt: updatedAdmin.createdAt.toISOString(),
        updatedAt: updatedAdmin.updatedAt.toISOString(),
      },
      message: 'Admin role updated',
    });

  } catch (error: any) {
    console.error('❌ [PUT /api/admin/system/admins/[id]/role] Error:', error);
    
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
