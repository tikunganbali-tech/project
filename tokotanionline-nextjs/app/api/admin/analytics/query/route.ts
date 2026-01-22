/**
 * Analytics Query API
 * Query analytics data with filtering (date range, location, device, etc)
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
// Cache manager removed - non-core feature, using direct queries
// Async queue removed - non-core feature, using direct queries

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session || (session.user as any).role !== 'super_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    
    // Date filtering
    const period = searchParams.get('period') || '7d'; // 1d, 7d, 30d, 90d, custom
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    
    // Location filtering
    const country = searchParams.get('country');
    const city = searchParams.get('city');
    const district = searchParams.get('district');
    
    // Device filtering
    const deviceType = searchParams.get('deviceType');
    const os = searchParams.get('os');
    const browser = searchParams.get('browser');
    
    // Page filtering
    const pageType = searchParams.get('pageType');
    const pageId = searchParams.get('pageId');
    
    // Calculate date range
    let dateFrom: Date;
    let dateTo: Date = new Date();
    
    switch (period) {
      case '1d':
        dateFrom = new Date(dateTo.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        dateFrom = new Date(dateTo.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        dateFrom = new Date(dateTo.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        dateFrom = new Date(dateTo.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case 'custom':
        dateFrom = startDate ? new Date(startDate) : new Date(dateTo.getTime() - 7 * 24 * 60 * 60 * 1000);
        dateTo = endDate ? new Date(endDate) : new Date();
        break;
      default:
        dateFrom = new Date(dateTo.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    // Build where clause
    const where: any = {
      createdAt: {
        gte: dateFrom,
        lte: dateTo,
      },
      isBot: false, // Exclude bots by default
    };

    if (country) where.country = country;
    if (city) where.city = city;
    if (district) where.district = district;
    if (deviceType) where.deviceType = deviceType;
    if (os) where.os = os;
    if (browser) where.browser = browser;
    if (pageType) where.pageType = pageType;
    if (pageId) where.pageId = pageId;

    // Generate cache key from query parameters
    const cacheKey = `analytics:query:${period}:${startDate || ''}:${endDate || ''}:${country || ''}:${city || ''}:${deviceType || ''}`;

    // Cache removed - direct query
    const result = await (async () => {
      // Check if AnalyticsVisit table exists, if not return empty data
      let visits: any[] = [];
      try {
        // Use try-catch to handle cases where table doesn't exist
        // Direct query (async queue removed)
        visits = await prisma.analyticsVisit.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          take: 10000, // Limit for performance
        });
      } catch (error: any) {
      // Table might not exist yet or model name mismatch
      const errorMessage = error.message || error.toString() || '';
      const isTableMissing = 
        errorMessage.includes('does not exist') || 
        errorMessage.includes('Unknown model') ||
        errorMessage.includes('Cannot find model') ||
        errorMessage.includes('AnalyticsVisit') ||
        error.code === 'P2001'; // Record not found
      
      if (isTableMissing) {
        console.warn('AnalyticsVisit table/model does not exist yet:', errorMessage);
        // Return empty data structure (within cache wrapper)
        return {
          stats: {
            totalVisits: 0,
            uniqueVisitors: 0,
            totalSessions: 0,
            avgTimeOnPage: 0,
            bounceRate: 0,
          },
          locationBreakdown: {
            byCountry: [],
            byCity: [],
            byDistrict: [],
          },
          deviceBreakdown: {
            byDeviceType: [],
            byOS: [],
            byBrowser: [],
            byDeviceModel: [],
          },
          sourceBreakdown: {
            byReferrer: [],
            byUtmSource: [],
            bySearchEngine: [],
          },
          pageBreakdown: {
            byPageType: [],
            topPages: [],
          },
          timeSeries: [],
          period: {
            from: dateFrom.toISOString(),
            to: dateTo.toISOString(),
          },
          message: 'Analytics tables not found. Please run: npx prisma db push',
        };
      }
      // Log error for debugging
      console.error('Analytics query error (AnalyticsVisit):', error);
      throw error; // Re-throw if it's a different error
    }

    // Get unique sessions
    let uniqueSessions: any[] = [];
    let totalSessions = 0;
      
      try {
        uniqueSessions = await prisma.analyticsVisit.findMany({
          where,
          select: { sessionId: true },
          distinct: ['sessionId'],
        });
      } catch (error: any) {
        // If AnalyticsVisit doesn't exist, sessions will be empty
        console.warn('Could not fetch unique sessions:', error.message);
      }

      try {
        totalSessions = await prisma.analyticsSession.count({
          where: {
            startedAt: {
              gte: dateFrom,
              lte: dateTo,
            },
          },
        });
      } catch (error: any) {
        // If AnalyticsSession doesn't exist, use unique sessions count
        console.warn('Could not count sessions:', error.message);
        totalSessions = uniqueSessions.length;
      }

      // Ensure visits is an array
      if (!Array.isArray(visits)) {
        visits = [];
      }

      // Aggregate statistics with safe calculations
      const stats = {
        totalVisits: visits.length || 0,
        uniqueVisitors: uniqueSessions.length || 0,
        totalSessions: totalSessions || 0,
        avgTimeOnPage: visits.length > 0 
          ? visits.reduce((sum, v) => sum + (Number(v.timeOnPage) || 0), 0) / visits.length
          : 0,
        bounceRate: visits.length > 0
          ? (visits.filter(v => v.isBounce === true).length / visits.length) * 100
          : 0,
      };

      // Location breakdown with error handling
      let locationBreakdown;
      try {
        locationBreakdown = {
          byCountry: await getLocationBreakdown(visits, 'country'),
          byCity: await getLocationBreakdown(visits, 'city'),
          byDistrict: await getLocationBreakdown(visits, 'district'),
        };
      } catch (error) {
        console.error('Error in location breakdown:', error);
        locationBreakdown = { byCountry: [], byCity: [], byDistrict: [] };
      }

      // Device breakdown with error handling
      let deviceBreakdown;
      try {
        deviceBreakdown = {
          byDeviceType: await getDeviceBreakdown(visits, 'deviceType'),
          byOS: await getDeviceBreakdown(visits, 'os'),
          byBrowser: await getDeviceBreakdown(visits, 'browser'),
          byDeviceModel: await getDeviceBreakdown(visits, 'deviceModel'),
        };
      } catch (error) {
        console.error('Error in device breakdown:', error);
        deviceBreakdown = { byDeviceType: [], byOS: [], byBrowser: [], byDeviceModel: [] };
      }

      // Traffic source breakdown with error handling
      let sourceBreakdown;
      try {
        sourceBreakdown = {
          byReferrer: await getSourceBreakdown(visits, 'referrerDomain'),
          byUtmSource: await getSourceBreakdown(visits, 'utmSource'),
          bySearchEngine: await getSourceBreakdown(visits, 'searchEngine'),
        };
      } catch (error) {
        console.error('Error in source breakdown:', error);
        sourceBreakdown = { byReferrer: [], byUtmSource: [], bySearchEngine: [] };
      }

      // Page breakdown with error handling
      let pageBreakdown;
      try {
        pageBreakdown = {
          byPageType: await getPageBreakdown(visits, 'pageType'),
          topPages: await getTopPages(visits),
        };
      } catch (error) {
        console.error('Error in page breakdown:', error);
        pageBreakdown = { byPageType: [], topPages: [] };
      }

      // Time series data (daily) with error handling
      let timeSeries: any[] = [];
      try {
        timeSeries = await getTimeSeries(visits, dateFrom, dateTo);
      } catch (error) {
        console.error('Error in time series:', error);
        timeSeries = [];
      }

      return {
        stats,
        locationBreakdown,
        deviceBreakdown,
        sourceBreakdown,
        pageBreakdown,
        timeSeries,
        period: {
          from: dateFrom.toISOString(),
          to: dateTo.toISOString(),
        },
      };
    })();

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Analytics query error:', error);
    
    // Return user-friendly error message
    const errorMessage = error.message || error.toString() || 'Unknown error';
    
    // Check if it's a database/model issue
    if (
      errorMessage.includes('does not exist') ||
      errorMessage.includes('Unknown model') ||
      errorMessage.includes('Cannot find model') ||
      error.code === 'P2001'
    ) {
      return NextResponse.json({
        stats: {
          totalVisits: 0,
          uniqueVisitors: 0,
          totalSessions: 0,
          avgTimeOnPage: 0,
          bounceRate: 0,
        },
        locationBreakdown: { byCountry: [], byCity: [], byDistrict: [] },
        deviceBreakdown: { byDeviceType: [], byOS: [], byBrowser: [], byDeviceModel: [] },
        sourceBreakdown: { byReferrer: [], byUtmSource: [], bySearchEngine: [] },
        pageBreakdown: { byPageType: [], topPages: [] },
        timeSeries: [],
        period: {
          from: new Date().toISOString(),
          to: new Date().toISOString(),
        },
        message: 'Analytics tables not found. Please run: npx prisma db push',
        error: errorMessage,
      }, { status: 200 }); // Return 200 with empty data instead of 500
    }
    
    return NextResponse.json(
      { 
        error: 'Query failed',
        message: errorMessage,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

// Helper functions with error handling
async function getLocationBreakdown(visits: any[], field: string) {
  try {
    if (!Array.isArray(visits)) {
      return [];
    }
    
    const map = new Map<string, number>();
    visits.forEach(v => {
      if (v && typeof v === 'object') {
        const value = v[field];
        if (value && typeof value === 'string') {
          map.set(value, (map.get(value) || 0) + 1);
        }
      }
    });
    
    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count: Number(count) || 0 }))
      .sort((a, b) => (b.count || 0) - (a.count || 0))
      .slice(0, 20);
  } catch (error) {
    console.error(`Error in getLocationBreakdown for field ${field}:`, error);
    return [];
  }
}

async function getDeviceBreakdown(visits: any[], field: string) {
  try {
    if (!Array.isArray(visits)) {
      return [];
    }
    
    const map = new Map<string, number>();
    visits.forEach(v => {
      if (v && typeof v === 'object') {
        const value = v[field];
        if (value && typeof value === 'string') {
          map.set(value, (map.get(value) || 0) + 1);
        }
      }
    });
    
    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count: Number(count) || 0 }))
      .sort((a, b) => (b.count || 0) - (a.count || 0))
      .slice(0, 15);
  } catch (error) {
    console.error(`Error in getDeviceBreakdown for field ${field}:`, error);
    return [];
  }
}

async function getSourceBreakdown(visits: any[], field: string) {
  try {
    if (!Array.isArray(visits)) {
      return [];
    }
    
    const map = new Map<string, number>();
    visits.forEach(v => {
      if (v && typeof v === 'object') {
        const value = v[field];
        if (value && typeof value === 'string') {
          map.set(value, (map.get(value) || 0) + 1);
        }
      }
    });
    
    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count: Number(count) || 0 }))
      .sort((a, b) => (b.count || 0) - (a.count || 0))
      .slice(0, 15);
  } catch (error) {
    console.error(`Error in getSourceBreakdown for field ${field}:`, error);
    return [];
  }
}

async function getPageBreakdown(visits: any[], field: string) {
  try {
    if (!Array.isArray(visits)) {
      return [];
    }
    
    const map = new Map<string, number>();
    visits.forEach(v => {
      if (v && typeof v === 'object') {
        const value = v[field];
        if (value && (typeof value === 'string' || typeof value === 'number')) {
          const key = String(value);
          map.set(key, (map.get(key) || 0) + 1);
        }
      }
    });
    
    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count: Number(count) || 0 }))
      .sort((a, b) => (b.count || 0) - (a.count || 0));
  } catch (error) {
    console.error(`Error in getPageBreakdown for field ${field}:`, error);
    return [];
  }
}

async function getTopPages(visits: any[]) {
  try {
    if (!Array.isArray(visits)) {
      return [];
    }
    
    const map = new Map<string, { url: string; title?: string; count: number; avgTime: number }>();
    
    visits.forEach(v => {
      if (v && typeof v === 'object') {
        const key = v.pageUrl || v.pagePath;
        if (key && typeof key === 'string') {
          const existing = map.get(key) || { 
            url: key, 
            title: v.pageTitle || '', 
            count: 0, 
            avgTime: 0 
          };
          existing.count = (existing.count || 0) + 1;
          existing.avgTime = (existing.avgTime || 0) + (Number(v.timeOnPage) || 0);
          map.set(key, existing);
        }
      }
    });
    
    return Array.from(map.values())
      .map(item => ({
        ...item,
        avgTime: item.count > 0 ? (item.avgTime || 0) / item.count : 0,
      }))
      .sort((a, b) => (b.count || 0) - (a.count || 0))
      .slice(0, 20);
  } catch (error) {
    console.error('Error in getTopPages:', error);
    return [];
  }
}

async function getTimeSeries(visits: any[], dateFrom: Date, dateTo: Date) {
  try {
    if (!Array.isArray(visits)) {
      return [];
    }
    
    const map = new Map<string, number>();
    
    visits.forEach(v => {
      if (v && v.createdAt) {
        try {
          const date = new Date(v.createdAt);
          if (!isNaN(date.getTime())) {
            const dateStr = date.toISOString().split('T')[0];
            map.set(dateStr, (map.get(dateStr) || 0) + 1);
          }
        } catch (error) {
          // Skip invalid dates
        }
      }
    });
    
    // Fill missing dates with 0
    const result: Array<{ date: string; visits: number }> = [];
    const current = new Date(dateFrom);
    const endDate = new Date(dateTo);
    
    while (current <= endDate) {
      const dateStr = current.toISOString().split('T')[0];
      result.push({
        date: dateStr,
        visits: map.get(dateStr) || 0,
      });
      current.setDate(current.getDate() + 1);
      
      // Safety check to prevent infinite loops
      if (result.length > 1000) {
        break;
      }
    }
    
    return result;
  } catch (error) {
    console.error('Error in getTimeSeries:', error);
    return [];
  }
}

