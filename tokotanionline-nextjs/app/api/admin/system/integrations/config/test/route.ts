/**
 * POST /api/admin/system/integrations/config/test
 * Test connection for an integration
 * 
 * This is a separate route file to match the URL path
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/permissions';
import { prisma } from '@/lib/db';
import { decrypt } from '@/lib/encryption';

// Integration definitions
const INTEGRATION_DEFINITIONS = {
  'analytics-ga4': {
    name: 'Google Analytics 4',
    type: 'ANALYTICS',
    fields: ['measurementId'],
  },
  'ads-facebook': {
    name: 'Facebook Pixel',
    type: 'ADS_PIXEL',
    fields: ['pixelId'],
  },
  'ads-google': {
    name: 'Google Ads Conversion',
    type: 'ADS_PIXEL',
    fields: ['conversionId', 'conversionLabel'],
  },
  'ads-tiktok': {
    name: 'TikTok Pixel',
    type: 'ADS_PIXEL',
    fields: ['pixelId'],
  },
  'ai-openai': {
    name: 'OpenAI',
    type: 'AI_PROVIDER',
    fields: ['apiKey', 'model', 'maxTokens', 'temperature', 'timeout'],
  },
  'email-smtp': {
    name: 'Email / SMTP',
    type: 'EMAIL_SMTP',
    fields: ['host', 'port', 'user', 'password', 'encryption'],
  },
} as const;

type IntegrationId = keyof typeof INTEGRATION_DEFINITIONS;

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = (session.user as any).role;
    if (!isSuperAdmin(userRole)) {
      return NextResponse.json({ error: 'Forbidden: SUPER ADMIN only' }, { status: 403 });
    }

    const body = await req.json();
    const { integrationId } = body;

    if (!integrationId || !INTEGRATION_DEFINITIONS[integrationId as IntegrationId]) {
      return NextResponse.json({ error: 'Invalid integration ID' }, { status: 400 });
    }

    // Get config
    const dbConfig = await prisma.systemIntegrationConfig.findUnique({
      where: { integrationId },
    });

    if (!dbConfig || !dbConfig.configEncrypted) {
      return NextResponse.json({
        success: false,
        status: 'NOT_CONFIGURED',
        message: 'Integration not configured',
      });
    }

    // Decrypt config
    let config: any;
    try {
      const decrypted = decrypt(dbConfig.configEncrypted);
      config = JSON.parse(decrypted);
    } catch (error) {
      return NextResponse.json({
        success: false,
        status: 'ERROR',
        message: 'Failed to decrypt configuration',
      });
    }

    // Test connection based on integration type
    const testResult = await testIntegrationConnection(integrationId as IntegrationId, config);

    // Update health status
    await prisma.systemIntegrationConfig.update({
      where: { integrationId },
      data: {
        healthStatus: testResult.status,
        healthMessage: testResult.message,
        healthCheckedAt: new Date(),
      },
    });

    // Create audit log
    try {
      await prisma.integrationAuditLog.create({
        data: {
          integrationId: dbConfig.id,
          action: 'TEST',
          changedBy: (session.user as any).id,
          changedByName: (session.user as any).name || (session.user as any).email,
          errorMessage: testResult.status === 'ERROR' ? testResult.message : null,
        },
      });
    } catch (auditError) {
      // Log audit error but don't fail the test
      console.error('[POST /api/admin/system/integrations/config/test] Audit log error:', auditError);
    }

    return NextResponse.json({
      success: testResult.status === 'CONNECTED',
      status: testResult.status,
      message: testResult.message,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[POST /api/admin/system/integrations/config/test] Error:', error);
    return NextResponse.json({ 
      success: false,
      error: error.message || 'Internal server error' 
    }, { status: 500 });
  }
}

/**
 * Test connection for a specific integration
 */
async function testIntegrationConnection(integrationId: IntegrationId, config: any): Promise<{
  status: 'CONNECTED' | 'ERROR' | 'NOT_CONFIGURED';
  message: string;
}> {
  switch (integrationId) {
    case 'analytics-ga4':
      // GA4 doesn't have a direct API to test, but we can validate format
      if (!config.measurementId || !config.measurementId.match(/^G-[A-Z0-9]+$/)) {
        return { status: 'ERROR', message: 'Invalid Measurement ID format' };
      }
      return { status: 'CONNECTED', message: 'Measurement ID format valid' };

    case 'ads-facebook':
    case 'ads-tiktok':
      // Pixel IDs are just strings, validate format
      if (!config.pixelId || config.pixelId.trim() === '') {
        return { status: 'ERROR', message: 'Pixel ID is required' };
      }
      return { status: 'CONNECTED', message: 'Pixel ID configured' };

    case 'ads-google':
      if (!config.conversionId || !config.conversionLabel) {
        return { status: 'ERROR', message: 'Conversion ID and Label are required' };
      }
      return { status: 'CONNECTED', message: 'Google Ads configuration valid' };

    case 'ai-openai':
      // Test OpenAI API key
      if (!config.apiKey) {
        return { status: 'ERROR', message: 'API key is required' };
      }
      try {
        const response = await fetch('https://api.openai.com/v1/models', {
          headers: {
            'Authorization': `Bearer ${config.apiKey}`,
          },
        });
        if (response.ok) {
          // Try to parse response to verify it's valid JSON
          try {
            await response.json();
            return { status: 'CONNECTED', message: 'OpenAI API key is valid' };
          } catch {
            // Response OK but not JSON - still consider it valid (some APIs return empty body)
            return { status: 'CONNECTED', message: 'OpenAI API key is valid' };
          }
        } else {
          // Parse error response safely
          let errorMessage = 'Invalid API key';
          try {
            const responseText = await response.text();
            if (responseText && responseText.trim() !== '') {
              try {
                const error = JSON.parse(responseText);
                errorMessage = error.error?.message || error.message || errorMessage;
              } catch {
                // Not JSON, use status text
                errorMessage = response.statusText || `HTTP ${response.status}`;
              }
            } else {
              errorMessage = response.statusText || `HTTP ${response.status}`;
            }
          } catch {
            errorMessage = response.statusText || `HTTP ${response.status}`;
          }
          return { status: 'ERROR', message: errorMessage };
        }
      } catch (error: any) {
        return { status: 'ERROR', message: `Connection failed: ${error.message}` };
      }

    case 'email-smtp':
      // SMTP test requires actual connection attempt
      if (!config.host || !config.port || !config.user || !config.password) {
        return { status: 'ERROR', message: 'SMTP configuration incomplete' };
      }
      // TODO: Implement actual SMTP connection test
      return { status: 'CONNECTED', message: 'SMTP configuration valid (connection not tested)' };

    default:
      return { status: 'ERROR', message: 'Unknown integration type' };
  }
}
