/**
 * Analytics Track API
 * Handle page view and engagement tracking
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    // Defensive: some clients may POST without a JSON body
    const rawBody = await request.text();
    let body: any = {};
    if (rawBody && rawBody.trim().length > 0) {
      try {
        body = JSON.parse(rawBody);
      } catch (parseError) {
        // Non-critical: tracking should never break the page
        console.error('Analytics track error: invalid JSON body');
        return NextResponse.json({ success: false, error: 'invalid_json' }, { status: 200 });
      }
    }
    const {
      pageUrl,
      pagePath,
      pageTitle,
      pageType,
      pageId,
      categoryId,
      categoryName,
      tags = [],
      referrer,
      utmSource,
      utmMedium,
      utmCampaign,
      utmTerm,
      utmContent,
      screenWidth,
      screenHeight,
      timeOnPage,
      scrollDepth,
    } = body;

    // Get or create session ID
    const cookieStore = await cookies();
    let sessionId = cookieStore.get('analytics_session_id')?.value;
    
    const response = NextResponse.json({ success: true });
    
    if (!sessionId) {
      sessionId = `analytics_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      response.cookies.set('analytics_session_id', sessionId, {
        maxAge: 60 * 60 * 24 * 365, // 1 year
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
      });
    }

    // Get IP address
    const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0] || 
                     request.headers.get('x-real-ip') || 
                     undefined;

    // Get user agent
    const userAgent = request.headers.get('user-agent') || undefined;

    // Try to find existing visit for this session and page
    let visit = await prisma.analyticsVisit.findFirst({
      where: {
        sessionId,
        pagePath,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (visit) {
      // Update existing visit with new data
      visit = await prisma.analyticsVisit.update({
        where: { id: visit.id },
        data: {
          timeOnPage: timeOnPage || visit.timeOnPage,
          scrollDepth: scrollDepth || visit.scrollDepth,
          pageTitle: pageTitle || visit.pageTitle,
        },
      });
    } else {
      // Create new visit
      try {
        visit = await prisma.analyticsVisit.create({
          data: {
            sessionId,
            ipAddress,
            userAgent,
            pageUrl: pageUrl || pagePath,
            pagePath,
            pageTitle,
            pageType,
            pageId,
            categoryId,
            categoryName,
            tags: Array.isArray(tags) ? tags : [],
            referrer,
            referrerDomain: referrer ? new URL(referrer).hostname : undefined,
            utmSource,
            utmMedium,
            utmCampaign,
            utmTerm,
            utmContent,
            screenWidth,
            screenHeight,
            timeOnPage,
            scrollDepth,
            isMobile: screenWidth ? screenWidth < 768 : false,
            isTablet: screenWidth ? screenWidth >= 768 && screenWidth < 1024 : false,
            isDesktop: screenWidth ? screenWidth >= 1024 : false,
          },
        });
      } catch (dbError: any) {
        // Log but don't fail - tracking is non-critical
        console.error('Analytics tracking error (non-critical):', dbError.message);
        return response;
      }
    }

    return response;
  } catch (error: any) {
    console.error('Analytics track error:', error);
    // Return success to prevent breaking the page
    return NextResponse.json({ success: false, error: error.message }, { status: 200 });
  }
}

