import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function GET() {
  try {
    // Test database connection
    await prisma.$connect();
    
    // Check if admin exists
    const admin = await prisma.admin.findFirst({
      where: { email: 'admin@tokotanionline.com' },
    });

    const testPassword = 'admin123';
    let passwordMatch = false;
    
    if (admin) {
      passwordMatch = await bcrypt.compare(testPassword, admin.passwordHash);
    }

    return NextResponse.json({
      database: 'connected',
      adminExists: !!admin,
      adminEmail: admin?.email || null,
      adminName: admin?.name || null,
      passwordMatch,
      nextAuthSecret: !!process.env.NEXTAUTH_SECRET,
      nextAuthUrl: process.env.NEXTAUTH_URL || 'not set',
    });
  } catch (error: any) {
    return NextResponse.json({
      error: error?.message || 'Unknown error',
      stack: process.env.NODE_ENV === 'development' ? error?.stack : undefined,
    }, { status: 500 });
  } finally {
    try {
      await prisma.$disconnect();
    } catch (e) {
      // Ignore disconnect errors
    }
  }
}

