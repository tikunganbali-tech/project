/**
 * STEP 6: Error handling hardened
 */
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import * as logger from '@/lib/logger';

// GET /api/admin/settings
export async function GET() {
  try {
    const session = await getServerSession();
    if (!session || (session.user as any).role !== 'super_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const settings = await prisma.siteSettings.findFirst();
    return NextResponse.json({ settings });
  } catch (error: any) {
    // STEP 6: Use logger, don't leak error details
    logger.error('Error fetching settings:', error);
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}

// PUT /api/admin/settings
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session || (session.user as any).role !== 'super_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    // Build update object dynamically - only include fields that are explicitly provided
    const updateData: any = {};
    
    if (body.logoUrl !== undefined) {
      updateData.logoUrl = body.logoUrl === '' ? null : body.logoUrl;
    }
    if (body.faviconUrl !== undefined) {
      updateData.faviconUrl = body.faviconUrl === '' ? null : body.faviconUrl;
    }
    if (body.primaryColor !== undefined) {
      updateData.primaryColor = body.primaryColor;
    }
    if (body.secondaryColor !== undefined) {
      updateData.secondaryColor = body.secondaryColor;
    }
    if (body.heroEnabled !== undefined) {
      updateData.heroEnabled = body.heroEnabled;
    }
    if (body.ctaEnabled !== undefined) {
      updateData.ctaEnabled = body.ctaEnabled;
    }
    if (body.testimonialsEnabled !== undefined) {
      updateData.testimonialsEnabled = body.testimonialsEnabled;
    }
    if (body.socialProofEnabled !== undefined) {
      updateData.socialProofEnabled = body.socialProofEnabled;
    }
    if (body.homepageBlocks !== undefined) {
      updateData.homepageBlocks = body.homepageBlocks ? JSON.stringify(body.homepageBlocks) : null;
    }
    // Hero Section
    if (body.heroTitle !== undefined) updateData.heroTitle = body.heroTitle;
    if (body.heroSubtitle !== undefined) updateData.heroSubtitle = body.heroSubtitle;
    if (body.heroBackgroundImage !== undefined) updateData.heroBackgroundImage = body.heroBackgroundImage;
    if (body.heroCtaText !== undefined) updateData.heroCtaText = body.heroCtaText;
    if (body.heroCta2Text !== undefined) updateData.heroCta2Text = body.heroCta2Text;
    
    // Value Proposition (FASE 5.1 STEP 2)
    if (body.valuePropsTitle !== undefined) updateData.valuePropsTitle = body.valuePropsTitle;
    if (body.valueProps !== undefined) updateData.valueProps = body.valueProps ? JSON.stringify(body.valueProps) : null;
    
    // Features
    if (body.featuresTitle !== undefined) updateData.featuresTitle = body.featuresTitle;
    if (body.features !== undefined) updateData.features = body.features ? JSON.stringify(body.features) : null;
    
    // Featured Products
    if (body.featuredProductsTitle !== undefined) updateData.featuredProductsTitle = body.featuredProductsTitle;
    if (body.featuredProductsSubtitle !== undefined) updateData.featuredProductsSubtitle = body.featuredProductsSubtitle;
    
    // Problem-Solution
    if (body.problemTitle !== undefined) updateData.problemTitle = body.problemTitle;
    if (body.problemSubtitle !== undefined) updateData.problemSubtitle = body.problemSubtitle;
    if (body.problemContent !== undefined) updateData.problemContent = body.problemContent;
    if (body.problemItems !== undefined) updateData.problemItems = body.problemItems ? JSON.stringify(body.problemItems) : null;
    
    // Trust
    if (body.trustItems !== undefined) updateData.trustItems = body.trustItems ? JSON.stringify(body.trustItems) : null;
    
    // Blog
    if (body.blogTitle !== undefined) updateData.blogTitle = body.blogTitle;
    if (body.blogSubtitle !== undefined) updateData.blogSubtitle = body.blogSubtitle;
    
    // CTA
    if (body.ctaTitle !== undefined) updateData.ctaTitle = body.ctaTitle;
    if (body.ctaSubtitle !== undefined) updateData.ctaSubtitle = body.ctaSubtitle;
    if (body.ctaButtonText !== undefined) updateData.ctaButtonText = body.ctaButtonText;
    
    // Marketplace
    if (body.marketplaceTitle !== undefined) updateData.marketplaceTitle = body.marketplaceTitle;
    if (body.marketplaceSubtitle !== undefined) updateData.marketplaceSubtitle = body.marketplaceSubtitle;
    if (body.shopeeUrl !== undefined) updateData.shopeeUrl = body.shopeeUrl === '' ? null : body.shopeeUrl;
    if (body.tokopediaUrl !== undefined) updateData.tokopediaUrl = body.tokopediaUrl === '' ? null : body.tokopediaUrl;
    
    // Footer
    if (body.footerAbout !== undefined) updateData.footerAbout = body.footerAbout;
    if (body.footerAddress !== undefined) updateData.footerAddress = body.footerAddress;
    if (body.footerPhone !== undefined) updateData.footerPhone = body.footerPhone;
    if (body.footerEmail !== undefined) updateData.footerEmail = body.footerEmail;
    if (body.footerSocialMedia !== undefined) updateData.footerSocialMedia = body.footerSocialMedia ? JSON.stringify(body.footerSocialMedia) : null;
    
    // About Page
    if (body.aboutTitle !== undefined) updateData.aboutTitle = body.aboutTitle;
    if (body.aboutSubtitle !== undefined) updateData.aboutSubtitle = body.aboutSubtitle;
    if (body.aboutStory !== undefined) updateData.aboutStory = body.aboutStory;
    if (body.aboutValues !== undefined) updateData.aboutValues = body.aboutValues ? JSON.stringify(body.aboutValues) : null;
    if (body.aboutStats !== undefined) updateData.aboutStats = body.aboutStats ? JSON.stringify(body.aboutStats) : null;
    if (body.aboutMission !== undefined) updateData.aboutMission = body.aboutMission;
    
    // Contact Page
    if (body.contactTitle !== undefined) updateData.contactTitle = body.contactTitle;
    if (body.contactSubtitle !== undefined) updateData.contactSubtitle = body.contactSubtitle;
    if (body.contactAddress !== undefined) updateData.contactAddress = body.contactAddress;
    if (body.contactPhone !== undefined) updateData.contactPhone = body.contactPhone;
    if (body.contactEmail !== undefined) updateData.contactEmail = body.contactEmail;
    if (body.contactHours !== undefined) updateData.contactHours = body.contactHours;

    const settings = await prisma.siteSettings.upsert({
      where: { id: '1' },
      update: updateData,
      create: {
        id: '1',
        logoUrl: body.logoUrl || null,
        faviconUrl: body.faviconUrl || null,
        primaryColor: body.primaryColor || '#16a34a',
        secondaryColor: body.secondaryColor || '#15803d',
        heroEnabled: body.heroEnabled !== false,
        ctaEnabled: body.ctaEnabled !== false,
        testimonialsEnabled: body.testimonialsEnabled !== false,
        socialProofEnabled: body.socialProofEnabled !== false,
        homepageBlocks: JSON.stringify(body.homepageBlocks || ['hero', 'featured', 'trust', 'blog', 'cta']),
        heroTitle: body.heroTitle || null,
        heroSubtitle: body.heroSubtitle || null,
        heroBackgroundImage: body.heroBackgroundImage || null,
        heroCtaText: body.heroCtaText || null,
        heroCta2Text: body.heroCta2Text || null,
        valuePropsTitle: body.valuePropsTitle || null,
        valueProps: body.valueProps ? JSON.stringify(body.valueProps) : null,
        featuresTitle: body.featuresTitle || null,
        features: body.features ? JSON.stringify(body.features) : null,
        featuredProductsTitle: body.featuredProductsTitle || null,
        featuredProductsSubtitle: body.featuredProductsSubtitle || null,
        problemTitle: body.problemTitle || null,
        problemSubtitle: body.problemSubtitle || null,
        problemContent: body.problemContent || null,
        problemItems: body.problemItems ? JSON.stringify(body.problemItems) : null,
        trustItems: body.trustItems ? JSON.stringify(body.trustItems) : null,
        blogTitle: body.blogTitle || null,
        blogSubtitle: body.blogSubtitle || null,
        ctaTitle: body.ctaTitle || null,
        ctaSubtitle: body.ctaSubtitle || null,
        ctaButtonText: body.ctaButtonText || null,
        marketplaceTitle: body.marketplaceTitle || null,
        marketplaceSubtitle: body.marketplaceSubtitle || null,
        shopeeUrl: body.shopeeUrl || null,
        tokopediaUrl: body.tokopediaUrl || null,
        footerAbout: body.footerAbout || null,
        footerAddress: body.footerAddress || null,
        footerPhone: body.footerPhone || null,
        footerEmail: body.footerEmail || null,
        footerSocialMedia: body.footerSocialMedia ? JSON.stringify(body.footerSocialMedia) : null,
        aboutTitle: body.aboutTitle || null,
        aboutSubtitle: body.aboutSubtitle || null,
        aboutStory: body.aboutStory || null,
        aboutValues: body.aboutValues ? JSON.stringify(body.aboutValues) : null,
        aboutStats: body.aboutStats ? JSON.stringify(body.aboutStats) : null,
        aboutMission: body.aboutMission || null,
        contactTitle: body.contactTitle || null,
        contactSubtitle: body.contactSubtitle || null,
        contactAddress: body.contactAddress || null,
        contactPhone: body.contactPhone || null,
        contactEmail: body.contactEmail || null,
        contactHours: body.contactHours || null,
      },
    });

    return NextResponse.json({ settings });
  } catch (error: any) {
    // STEP 6: Use logger
    logger.error('Settings save error:', error);
    
    // Check for Prisma errors
    if (error.code === 'P2002') {
      return NextResponse.json({ 
        error: 'Settings already exist. Try updating instead.',
      }, { status: 400 });
    }
    
    if (error.code === 'P2025') {
      return NextResponse.json({ 
        error: 'Settings not found.',
      }, { status: 404 });
    }

    // STEP 6: Don't leak error details
    return NextResponse.json({ 
      error: 'Failed to save settings',
    }, { status: 500 });
  }
}
