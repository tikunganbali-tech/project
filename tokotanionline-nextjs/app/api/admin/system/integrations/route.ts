/**
 * PHASE 6A — INTEGRATIONS STATUS API (UPDATED)
 * 
 * GET /api/admin/system/integrations
 * 
 * Fungsi: Get integrations status
 * 
 * Guard:
 * - Auth required
 * - Permission: system.view
 * 
 * Rules:
 * - Reads from DB first (admin-managed config)
 * - Falls back to ENV if DB config not found (backward compatibility)
 * - ENV is now bootstrap/fallback only
 */

export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { assertPermission } from '@/lib/permissions';
import { prisma } from '@/lib/db';
import { decrypt } from '@/lib/encryption';

interface Integration {
  id: string;
  name: string;
  type: 'ANALYTICS' | 'ADS_PIXEL' | 'AI_PROVIDER' | 'EMAIL_SMTP';
  status: 'CONNECTED' | 'NOT_CONFIGURED' | 'ERROR';
  lastChecked: string;
  details?: string;
  healthMessage?: string;
}

/**
 * Check if an environment variable is configured (fallback)
 */
function isConfigured(envVar: string | undefined): boolean {
  return !!envVar && envVar.trim() !== '';
}

/**
 * Get integration config from DB or ENV fallback
 */
async function getIntegrationConfig(integrationId: string): Promise<{
  status: 'CONNECTED' | 'NOT_CONFIGURED' | 'ERROR';
  details: string;
  healthMessage?: string;
  lastChecked: string;
}> {
  // Try DB first
  const dbConfig = await prisma.systemIntegrationConfig.findUnique({
    where: { integrationId },
  });

  if (dbConfig && dbConfig.isEnabled) {
    // Use DB config
    const lastChecked = dbConfig.healthCheckedAt?.toISOString() || dbConfig.updatedAt.toISOString();
    
    let details = '';
    if (dbConfig.configEncrypted) {
      try {
        const decrypted = decrypt(dbConfig.configEncrypted);
        const config = JSON.parse(decrypted);
        
        // Build details string based on integration type
        switch (integrationId) {
          case 'analytics-ga4':
            details = config.measurementId ? `Measurement ID: ${config.measurementId.substring(0, 10)}...` : 'Not configured';
            break;
          case 'ads-facebook':
            details = config.pixelId ? `Pixel ID: ${config.pixelId.substring(0, 10)}...` : 'Not configured';
            break;
          case 'ads-google':
            details = config.conversionId ? `Conversion ID: ${config.conversionId.substring(0, 10)}...` : 'Not configured';
            break;
          case 'ads-tiktok':
            details = config.pixelId ? `Pixel ID: ${config.pixelId.substring(0, 10)}...` : 'Not configured';
            break;
          case 'ai-openai':
            details = config.apiKey ? 'API key configured' : 'Not configured';
            break;
          case 'email-smtp':
            details = config.host ? `${config.host} (${config.port || 'Default'} port)` : 'Not configured';
            break;
        }
      } catch (error) {
        details = 'Configuration error';
      }
    }
    
    return {
      status: dbConfig.healthStatus as 'CONNECTED' | 'NOT_CONFIGURED' | 'ERROR' || 'NOT_CONFIGURED',
      details: details || 'Configured',
      healthMessage: dbConfig.healthMessage || undefined,
      lastChecked,
    };
  }

  // Fallback to ENV (backward compatibility)
  const now = new Date().toISOString();
  
  switch (integrationId) {
    case 'analytics-ga4': {
      const ga4Id = process.env.NEXT_PUBLIC_GA4_ID;
      return {
        status: isConfigured(ga4Id) ? 'CONNECTED' : 'NOT_CONFIGURED',
        details: isConfigured(ga4Id) && ga4Id
          ? `Tracking ID: ${ga4Id.substring(0, 10)}... (from ENV)`
          : 'GA4 tracking ID not configured',
        lastChecked: now,
      };
    }
    case 'ads-facebook': {
      const fbPixelId = process.env.NEXT_PUBLIC_FACEBOOK_PIXEL_ID;
      return {
        status: isConfigured(fbPixelId) ? 'CONNECTED' : 'NOT_CONFIGURED',
        details: isConfigured(fbPixelId) && fbPixelId
          ? `Pixel ID: ${fbPixelId.substring(0, 10)}... (from ENV)`
          : 'Facebook Pixel ID not configured',
        lastChecked: now,
      };
    }
    case 'ads-google': {
      const googleAdsId = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID;
      return {
        status: isConfigured(googleAdsId) ? 'CONNECTED' : 'NOT_CONFIGURED',
        details: isConfigured(googleAdsId) && googleAdsId
          ? `Conversion ID: ${googleAdsId.substring(0, 10)}... (from ENV)`
          : 'Google Ads Conversion ID not configured',
        lastChecked: now,
      };
    }
    case 'ads-tiktok': {
      const tiktokPixelId = process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID;
      return {
        status: isConfigured(tiktokPixelId) ? 'CONNECTED' : 'NOT_CONFIGURED',
        details: isConfigured(tiktokPixelId) && tiktokPixelId
          ? `Pixel ID: ${tiktokPixelId.substring(0, 10)}... (from ENV)`
          : 'TikTok Pixel ID not configured',
        lastChecked: now,
      };
    }
    case 'ai-openai': {
      const hasOpenAI = isConfigured(process.env.OPENAI_API_KEY);
      return {
        status: hasOpenAI ? 'CONNECTED' : 'NOT_CONFIGURED',
        details: hasOpenAI
          ? 'API key configured (from ENV)'
          : 'OpenAI API key not configured',
        lastChecked: now,
      };
    }
    case 'email-smtp': {
      const hasSMTP = isConfigured(process.env.SMTP_HOST) && 
                     isConfigured(process.env.SMTP_USER) && 
                     isConfigured(process.env.SMTP_PASS);
      return {
        status: hasSMTP ? 'CONNECTED' : 'NOT_CONFIGURED',
        details: hasSMTP
          ? `${process.env.SMTP_HOST || 'Unknown'} (${process.env.SMTP_PORT || 'Default'} port) (from ENV)`
          : 'SMTP configuration incomplete (SMTP_HOST, SMTP_USER, SMTP_PASS required)',
        lastChecked: now,
      };
    }
    default:
      return {
        status: 'NOT_CONFIGURED',
        details: 'Unknown integration',
        lastChecked: now,
      };
  }
}

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

    const integrationIds = [
      'analytics-ga4',
      'ads-facebook',
      'ads-google',
      'ads-tiktok',
      'ai-openai',
      'email-smtp',
    ];

    const integrationNames: Record<string, string> = {
      'analytics-ga4': 'Google Analytics 4',
      'ads-facebook': 'Facebook Pixel',
      'ads-google': 'Google Ads Conversion',
      'ads-tiktok': 'TikTok Pixel',
      'ai-openai': 'OpenAI',
      'email-smtp': 'Email / SMTP',
    };

    const integrationTypes: Record<string, 'ANALYTICS' | 'ADS_PIXEL' | 'AI_PROVIDER' | 'EMAIL_SMTP'> = {
      'analytics-ga4': 'ANALYTICS',
      'ads-facebook': 'ADS_PIXEL',
      'ads-google': 'ADS_PIXEL',
      'ads-tiktok': 'ADS_PIXEL',
      'ai-openai': 'AI_PROVIDER',
      'email-smtp': 'EMAIL_SMTP',
    };

    const integrations: Integration[] = [];

    for (const id of integrationIds) {
      const config = await getIntegrationConfig(id);
      integrations.push({
        id,
        name: integrationNames[id],
        type: integrationTypes[id],
        status: config.status,
        lastChecked: config.lastChecked,
        details: config.details,
        healthMessage: config.healthMessage,
      });
    }

    return NextResponse.json({
      success: true,
      integrations,
      count: integrations.length,
    });

  } catch (error: any) {
    console.error('❌ [GET /api/admin/system/integrations] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
