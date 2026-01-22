import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { sendMail } from '@/lib/mailer';
import { generatePasswordResetEmail } from '@/lib/email-templates';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email || typeof email !== 'string') {
      // Return generic success even for invalid input (security)
      return NextResponse.json({ 
        success: true,
        message: 'Jika email terdaftar, kami akan mengirimkan link reset.'
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Find admin (if exists)
    const admin = await prisma.admin.findUnique({
      where: { email: normalizedEmail },
    });

    // Always return success (don't leak user existence)
    // If admin exists, generate and save token
    if (admin) {
      // Generate secure random token (32 bytes = 64 hex characters)
      const resetToken = randomBytes(32).toString('hex');
      
      // Hash token before storing (security best practice)
      const tokenHash = await bcrypt.hash(resetToken, 10);

      // Set expiry to 30 minutes from now (per requirements)
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + 30);

      // Invalidate any existing unused tokens for this admin
      await prisma.adminPasswordResetToken.updateMany({
        where: {
          adminId: admin.id,
          usedAt: null,
          expiresAt: { gt: new Date() }, // Not expired yet
        },
        data: {
          usedAt: new Date(), // Mark as used
        },
      });

      // Save new reset token
      await prisma.adminPasswordResetToken.create({
        data: {
          adminId: admin.id,
          tokenHash,
          expiresAt,
          requestedIpHash: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || null,
          requestedUserAgent: request.headers.get('user-agent') || null,
        },
      });

      // Generate reset link
      const resetLink = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/admin/reset-password?token=${resetToken}`;
      
      // Generate and send email
      try {
        const { subject, html, text } = generatePasswordResetEmail({
          adminName: admin.name,
          resetLink,
          expiryMinutes: 30,
        });

        await sendMail({
          to: normalizedEmail,
          subject,
          html,
          text,
        });

        console.log(`✅ Password reset email sent to: ${normalizedEmail}`);
      } catch (emailError: any) {
        // Log email error but don't expose to user (security)
        console.error('❌ Failed to send password reset email:', emailError?.message || emailError);
        // Continue - we still return success to prevent user enumeration
      }
    }

    // Always return generic success response (security - don't leak user existence)
    return NextResponse.json({ 
      success: true,
      message: 'Jika email terdaftar, kami akan mengirimkan link reset.'
    });

  } catch (error: any) {
    console.error('❌ Forgot password error:', error);
    
    // Even on error, return generic success (security)
    return NextResponse.json({ 
      success: true,
      message: 'Jika email terdaftar, kami akan mengirimkan link reset.'
    });
  }
}

