/**
 * Verify Admin Credentials API
 * Test endpoint to check if admin exists and credentials are correct
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ 
        error: 'Email and password required' 
      }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check database connection (with better error handling)
    try {
      await prisma.$connect();
    } catch (dbError: any) {
      return NextResponse.json({
        success: false,
        error: 'Database connection failed',
        message: dbError?.message || 'Unknown database error',
        suggestion: 'Check DATABASE_URL in .env.local and ensure PostgreSQL is running',
      }, { status: 503 });
    }

    // Find admin
    const admin = await prisma.admin.findUnique({
      where: { email: normalizedEmail },
    });

    if (!admin) {
      return NextResponse.json({ 
        success: false,
        error: 'Admin not found',
        email: normalizedEmail,
        suggestion: 'Run: npm run seed'
      }, { status: 404 });
    }

    // Verify password
    const isValid = await bcrypt.compare(password, admin.passwordHash);

    if (!isValid) {
      return NextResponse.json({ 
        success: false,
        error: 'Invalid password',
        email: normalizedEmail,
        adminExists: true
      }, { status: 401 });
    }

    return NextResponse.json({
      success: true,
      message: 'Credentials are valid',
      admin: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: admin.role,
      },
      nextAuthConfig: {
        hasSecret: !!process.env.NEXTAUTH_SECRET,
        url: process.env.NEXTAUTH_URL || 'not set',
      }
    });
  } catch (error: any) {
    console.error('Verify admin error:', error);
    return NextResponse.json({
      success: false,
      error: error?.message || 'Unknown error',
      stack: process.env.NODE_ENV === 'development' ? error?.stack : undefined,
    }, { status: 500 });
  }
}

