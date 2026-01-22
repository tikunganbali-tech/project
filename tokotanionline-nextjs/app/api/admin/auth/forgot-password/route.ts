/**
 * POST /api/admin/auth/forgot-password
 * 
 * Admin forgot password endpoint
 * Generates reset token and sends email
 */

export const dynamic = 'force-dynamic';

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
    console.log(`[forgot-password] Processing request for: ${normalizedEmail}`);

    // Find admin (if exists)
    let admin;
    try {
      admin = await prisma.admin.findUnique({
        where: { email: normalizedEmail },
      });
    } catch (dbError: any) {
      console.error('[forgot-password] Database error:', dbError?.message || dbError);
      // Return generic success (security)
      return NextResponse.json({ 
        success: true,
        message: 'Jika email terdaftar, kami akan mengirimkan link reset.'
      });
    }

    // Always return success (don't leak user existence)
    // If admin exists, generate and save token
    if (admin) {
      console.log(`[forgot-password] Admin found: ${admin.id}`);
      
      try {
        // Generate secure random token (32 bytes = 64 hex characters)
        const resetToken = randomBytes(32).toString('hex');
        console.log(`[forgot-password] Token generated (length: ${resetToken.length})`);
        
        // Hash token before storing (security best practice)
        const tokenHash = await bcrypt.hash(resetToken, 10);

        // Set expiry to 30 minutes from now (per requirements: 15-30 menit)
        const expiresAt = new Date();
        expiresAt.setMinutes(expiresAt.getMinutes() + 30);

        // Invalidate any existing unused tokens for this admin
        try {
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
        } catch (updateError: any) {
          console.error('[forgot-password] Error invalidating old tokens:', updateError?.message);
          // Continue - not critical
        }

        // Save new reset token
        try {
          await prisma.adminPasswordResetToken.create({
            data: {
              adminId: admin.id,
              tokenHash,
              expiresAt,
              requestedIpHash: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || null,
              requestedUserAgent: request.headers.get('user-agent') || null,
            },
          });
          console.log(`[forgot-password] Token saved to database`);
        } catch (createError: any) {
          console.error('[forgot-password] Error saving token:', createError?.message || createError);
          // Return generic success (security)
          return NextResponse.json({ 
            success: true,
            message: 'Jika email terdaftar, kami akan mengirimkan link reset.'
          });
        }

        // Generate reset link
        const baseUrl = process.env.NEXTAUTH_URL || 
                       request.headers.get('origin') || 
                       'http://localhost:3000';
        const resetLink = `${baseUrl}/admin/reset-password?token=${resetToken}`;
        console.log(`[forgot-password] Reset link generated: ${resetLink.substring(0, 50)}...`);
        
        // DEVELOPMENT MODE: Print token to console if SMTP not configured
        // This helps with testing when email is not set up
        if (process.env.NODE_ENV === 'development' && !process.env.SMTP_HOST) {
          console.log('\n🔧 DEVELOPMENT MODE - SMTP not configured');
          console.log('📧 Reset token for testing:');
          console.log(`   Token: ${resetToken}`);
          console.log(`   Link: ${resetLink}`);
          console.log(`   Expires: ${expiresAt.toISOString()}\n`);
        }
        
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
          console.error('❌ Email error stack:', emailError?.stack);
          
          // DEVELOPMENT MODE: If email fails and SMTP not configured, show token
          if (process.env.NODE_ENV === 'development' && !process.env.SMTP_HOST) {
            console.log('\n🔧 DEVELOPMENT MODE - Email failed, but token is saved');
            console.log('📧 You can test reset password with this token:');
            console.log(`   Link: ${resetLink}\n`);
          }
          
          // Continue - we still return success to prevent user enumeration
          // Token is already saved, user can request new link if needed
        }
      } catch (tokenError: any) {
        console.error('[forgot-password] Error generating token:', tokenError?.message || tokenError);
        // Return generic success (security)
        return NextResponse.json({ 
          success: true,
          message: 'Jika email terdaftar, kami akan mengirimkan link reset.'
        });
      }
    } else {
      console.log(`[forgot-password] Admin not found for: ${normalizedEmail}`);
    }

    // Always return generic success response (security - don't leak user existence)
    return NextResponse.json({ 
      success: true,
      message: 'Jika email terdaftar, kami akan mengirimkan link reset.'
    });

  } catch (error: any) {
    console.error('❌ Forgot password error:', error?.message || error);
    console.error('❌ Error stack:', error?.stack);
    
    // Even on error, return generic success (security)
    return NextResponse.json({ 
      success: true,
      message: 'Jika email terdaftar, kami akan mengirimkan link reset.'
    });
  }
}
