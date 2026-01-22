/**
 * STEP 24B-1 — ADMIN USER MANAGEMENT (BACKEND API)
 * 
 * GET /api/admin/system/admins - List admin users
 * POST /api/admin/system/admins - Create admin user
 * 
 * Guards & Validasi:
 * - Auth required
 * - Permission checks via permissions.ts
 * - FEATURE_FREEZE respected
 * - Role validation eksplisit
 */

export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { 
  assertPermission, 
  normalizeRole, 
  isSuperAdmin,
  type AdminRole 
} from '@/lib/permissions';
import { FEATURE_FREEZE } from '@/lib/admin-config';
import { prisma } from '@/lib/db';

/**
 * GET /api/admin/system/admins
 * 
 * Fungsi: List admin users (read-only)
 * 
 * Guard:
 * - Auth required
 * - Permission: system.view
 * 
 * Response:
 * - id, email, name, role, isActive, createdAt
 * - ❌ Tidak expose password / secrets
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

    // 📥 FETCH ADMINS
    const admins = await prisma.admin.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true, // PHASE 4.1: Include isActive
        lastLogin: true, // PHASE 4.1: Include lastLogin
        createdAt: true,
        updatedAt: true,
        // ❌ TIDAK expose: passwordHash
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // 🎨 FORMAT RESPONSE
    const formattedAdmins = admins.map(admin => ({
      id: admin.id,
      email: admin.email,
      name: admin.name,
      role: normalizeRole(admin.role) as AdminRole, // Normalize role
      isActive: admin.isActive ?? true, // Default: true if null (backward compatibility)
      lastLogin: admin.lastLogin?.toISOString() || null,
      createdAt: admin.createdAt.toISOString(),
      updatedAt: admin.updatedAt.toISOString(),
    }));

    return NextResponse.json({
      success: true,
      admins: formattedAdmins,
      count: formattedAdmins.length,
    });

  } catch (error: any) {
    console.error('❌ [GET /api/admin/system/admins] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/system/admins
 * 
 * Fungsi: Create admin user
 * 
 * Guard:
 * - Permission: system.write
 * - FEATURE_FREEZE → block jika aktif
 * 
 * Rules:
 * - Role harus eksplisit (super_admin | admin | viewer)
 * - Tidak boleh membuat super_admin kecuali requester super_admin
 * - Default: isActive = true
 * - Password: TIDAK dibuat di sini (invite/reset flow di step terpisah)
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
      return NextResponse.json(
        { error: 'Forbidden: System is in feature freeze mode' },
        { status: 403 }
      );
    }

    // 📥 PARSE REQUEST
    const body = await req.json();
    const { email, name, role } = body;

    // ✅ VALIDATION
    if (!email || !name) {
      return NextResponse.json(
        { error: 'Email and name are required' },
        { status: 400 }
      );
    }

    // ✅ ROLE VALIDATION
    const validRoles: AdminRole[] = ['super_admin', 'admin', 'viewer'];
    if (!role || !validRoles.includes(role as AdminRole)) {
      return NextResponse.json(
        { error: `Role must be one of: ${validRoles.join(', ')}` },
        { status: 400 }
      );
    }

    // 🔒 GUARD 4: SUPER_ADMIN CREATION CHECK
    // Tidak boleh membuat super_admin kecuali requester super_admin
    if (role === 'super_admin' && !isSuperAdmin(userRole)) {
      return NextResponse.json(
        { error: 'Forbidden: Only super_admin can create super_admin users' },
        { status: 403 }
      );
    }

    // ✅ CHECK EMAIL UNIQUE
    const existingAdmin = await prisma.admin.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (existingAdmin) {
      return NextResponse.json(
        { error: 'Email already exists' },
        { status: 409 }
      );
    }

    // 📝 CREATE ADMIN
    // Note: Password tidak dibuat di sini (invite/reset flow di step terpisah)
    // PasswordHash akan di-set via password reset/invite flow
    const newAdmin = await prisma.admin.create({
      data: {
        email: email.toLowerCase().trim(),
        name: name.trim(),
        role: role, // Store role as-is (akan dinormalize saat read)
        passwordHash: '', // Temporary - akan di-set via invite flow
        isActive: true, // PHASE 4.1: Default active
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

    // 📝 AUDIT LOG: admin_created (PHASE 4.1)
    const actorId = (session.user as any).id;
    const actorName = (session.user as any).name || 'Unknown';
    try {
      await prisma.eventLog.create({
        data: {
          event: 'admin_created',
          url: '/admin/system/admins',
          meta: {
            adminId: newAdmin.id,
            adminEmail: newAdmin.email,
            adminName: newAdmin.name,
            adminRole: normalizeRole(newAdmin.role),
            actorId: actorId,
            actorName: actorName,
            timestamp: new Date().toISOString(),
          },
        },
      });
    } catch (auditError: any) {
      // Silent fail - don't break main flow
      console.error('❌ [POST /api/admin/system/admins] Audit log error:', auditError);
    }

    return NextResponse.json({
      success: true,
      admin: {
        id: newAdmin.id,
        email: newAdmin.email,
        name: newAdmin.name,
        role: normalizeRole(newAdmin.role) as AdminRole,
        isActive: newAdmin.isActive,
        createdAt: newAdmin.createdAt,
        updatedAt: newAdmin.updatedAt,
      },
      message: 'Admin user created. Password must be set via invite/reset flow.',
    }, { status: 201 });

  } catch (error: any) {
    console.error('❌ [POST /api/admin/system/admins] Error:', error);
    
    // Handle Prisma unique constraint error
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Email already exists' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
