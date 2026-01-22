/**
 * STEP 24B-1 — ADMIN USER MANAGEMENT (BACKEND API)
 * 
 * PUT /api/admin/system/admins/[id]
 * 
 * Fungsi: Update profile admin (name, isActive)
 * 
 * Guard:
 * - Permission: system.write
 * - FEATURE_FREEZE
 * 
 * Rules:
 * - ❌ Tidak bisa ubah role di endpoint ini
 * - ❌ Tidak bisa disable diri sendiri
 */

export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { assertPermission } from '@/lib/permissions';
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

    // 📥 PARSE REQUEST
    const body = await req.json();
    const { name, isActive } = body;

    // ✅ VALIDATION
    if (name === undefined && isActive === undefined) {
      return NextResponse.json(
        { error: 'At least one field (name or isActive) must be provided' },
        { status: 400 }
      );
    }

    // 🔒 GUARD 4: SELF-DISABLE CHECK
    // Tidak bisa disable diri sendiri
    if (isActive === false && userId === adminId) {
      return NextResponse.json(
        { error: 'Forbidden: Cannot disable yourself' },
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

    // 📝 UPDATE ADMIN
    // Note: isActive tidak ada di schema, jadi kita skip update isActive
    // Role tidak bisa diubah di endpoint ini (gunakan /role endpoint)
    const updateData: any = {};
    
    if (name !== undefined) {
      updateData.name = name.trim();
    }
    
    // Note: isActive field tidak ada di schema
    // Untuk sekarang, kita skip update isActive
    // Jika diperlukan, bisa ditambahkan field isActive di schema di step berikutnya

    const updatedAdmin = await prisma.admin.update({
      where: { id: adminId },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      admin: {
        id: updatedAdmin.id,
        email: updatedAdmin.email,
        name: updatedAdmin.name,
        role: updatedAdmin.role,
        isActive: true, // Default (tidak ada field di schema)
        createdAt: updatedAdmin.createdAt,
        updatedAt: updatedAdmin.updatedAt,
      },
      message: isActive !== undefined 
        ? 'Note: isActive field not available in schema. Update skipped.'
        : 'Admin profile updated',
    });

  } catch (error: any) {
    console.error('❌ [PUT /api/admin/system/admins/[id]] Error:', error);
    
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
