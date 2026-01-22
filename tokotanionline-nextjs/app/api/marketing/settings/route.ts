import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { prisma } from '@/lib/db';

// GET /api/marketing/settings
export async function GET() {
  try {
    const session = await getServerSession();
    if (!session || (session.user as any).role !== 'super_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Try to get from database first, fallback to env vars
    let siteSettings = await prisma.siteSettings.findFirst();
    
    return NextResponse.json({
      settings: {
        facebookPixelId: siteSettings?.facebookPixelId || process.env.NEXT_PUBLIC_FACEBOOK_PIXEL_ID || '',
        googleAdsId: siteSettings?.googleAdsId || process.env.NEXT_PUBLIC_GOOGLE_ADS_ID || '',
        googleAnalyticsId: siteSettings?.googleAnalyticsId || process.env.NEXT_PUBLIC_GA4_ID || '',
        tiktokPixelId: siteSettings?.tiktokPixelId || process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID || '',
      },
    });
  } catch (error: any) {
    console.error('Error fetching marketing settings:', error);
    // Fallback to env vars if database error
    return NextResponse.json({
      settings: {
        facebookPixelId: process.env.NEXT_PUBLIC_FACEBOOK_PIXEL_ID || '',
        googleAdsId: process.env.NEXT_PUBLIC_GOOGLE_ADS_ID || '',
        googleAnalyticsId: process.env.NEXT_PUBLIC_GA4_ID || '',
        tiktokPixelId: process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID || '',
      },
    });
  }
}

// PUT /api/marketing/settings
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session || (session.user as any).role !== 'super_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { facebookPixelId, googleAdsId, googleAnalyticsId, tiktokPixelId } = body;

    // Save to database
    let siteSettings = await prisma.siteSettings.findFirst();
    
    // Prepare update data - only include fields that are provided (not empty)
    const updateData: any = {};
    if (facebookPixelId !== undefined && facebookPixelId !== null) {
      updateData.facebookPixelId = facebookPixelId || null;
    }
    if (googleAdsId !== undefined && googleAdsId !== null) {
      updateData.googleAdsId = googleAdsId || null;
    }
    if (googleAnalyticsId !== undefined && googleAnalyticsId !== null) {
      updateData.googleAnalyticsId = googleAnalyticsId || null;
    }
    if (tiktokPixelId !== undefined && tiktokPixelId !== null) {
      updateData.tiktokPixelId = tiktokPixelId || null;
    }
    
    if (siteSettings) {
      // Update existing settings - use upsert for safety
      siteSettings = await prisma.siteSettings.update({
        where: { id: siteSettings.id },
        data: updateData,
      });
    } else {
      // Create new settings with all fields
      siteSettings = await prisma.siteSettings.create({
        data: {
          facebookPixelId: facebookPixelId || null,
          googleAdsId: googleAdsId || null,
          googleAnalyticsId: googleAnalyticsId || null,
          tiktokPixelId: tiktokPixelId || null,
        },
      });
    }

    // Generate .env.local format for user to copy
    const envContent = [
      '# Marketing & Tracking Settings',
      '# Copy these to your .env.local file for production:',
      '',
      facebookPixelId ? `NEXT_PUBLIC_FACEBOOK_PIXEL_ID=${facebookPixelId}` : '# NEXT_PUBLIC_FACEBOOK_PIXEL_ID=',
      googleAdsId ? `NEXT_PUBLIC_GOOGLE_ADS_ID=${googleAdsId}` : '# NEXT_PUBLIC_GOOGLE_ADS_ID=',
      googleAnalyticsId ? `NEXT_PUBLIC_GA4_ID=${googleAnalyticsId}` : '# NEXT_PUBLIC_GA4_ID=',
      tiktokPixelId ? `NEXT_PUBLIC_TIKTOK_PIXEL_ID=${tiktokPixelId}` : '# NEXT_PUBLIC_TIKTOK_PIXEL_ID=',
    ].filter(Boolean).join('\n');

    return NextResponse.json({
      success: true,
      message: 'Marketing settings saved to database successfully!',
      settings: {
        facebookPixelId: siteSettings.facebookPixelId || '',
        googleAdsId: siteSettings.googleAdsId || '',
        googleAnalyticsId: siteSettings.googleAnalyticsId || '',
        tiktokPixelId: siteSettings.tiktokPixelId || '',
      },
      envContent,
      note: 'Settings are saved to database and will be used immediately. For production, also update your .env.local file with the values above.',
    });
  } catch (error: any) {
    console.error('Error saving marketing settings:', error);
    
    // Check if it's a Prisma Client issue (field not recognized)
    const errorMessage = error.message || error.toString() || '';
    const isPrismaClientIssue = 
      errorMessage.includes('Unknown argument') ||
      errorMessage.includes('facebookPixelId') ||
      errorMessage.includes('googleAdsId') ||
      errorMessage.includes('tiktokPixelId') ||
      error.code === 'P2009'; // Prisma validation error
    
    if (isPrismaClientIssue) {
      return NextResponse.json({ 
        error: 'Prisma Client needs to be regenerated. Please stop the dev server and run: npx prisma generate',
        code: 'PRISMA_CLIENT_OUTDATED',
        hint: 'Stop the dev server (Ctrl+C), run "npx prisma generate", then restart the server.',
      }, { status: 500 });
    }
    
    return NextResponse.json({ 
      error: error.message || 'Failed to save marketing settings',
      code: error.code,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    }, { status: 500 });
  }
}

