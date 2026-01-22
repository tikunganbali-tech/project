/**
 * PHASE 6A — SYSTEM INTEGRATION CONFIGURATION API
 * 
 * Endpoints:
 * - GET: List all integration configs (with masked secrets)
 * - PUT: Update integration config (SUPER ADMIN only)
 * - POST: Test connection for an integration
 * 
 * Security:
 * - SUPER ADMIN only (system.manage permission)
 * - All secrets encrypted at-rest
 * - Secrets never returned in plaintext
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { assertPermission, isSuperAdmin } from '@/lib/permissions';
import { prisma } from '@/lib/db';
import { encrypt, decrypt, maskSecret } from '@/lib/encryption';

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

/**
 * GET /api/admin/system/integrations/config
 * List all integration configs (with masked secrets)
 */
export async function GET() {
  try {
    const session = await getServerSession();
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = (session.user as any).role;
    assertPermission(userRole, 'system.view');

    // Get all configs from DB
    const configs = await prisma.systemIntegrationConfig.findMany({
      orderBy: { integrationId: 'asc' },
    });

    // Get all defined integrations (merge with DB configs)
    const integrations = Object.keys(INTEGRATION_DEFINITIONS).map((id) => {
      const definition = INTEGRATION_DEFINITIONS[id as IntegrationId];
      const dbConfig = configs.find((c) => c.integrationId === id);

      let config: any = {};
      if (dbConfig?.configEncrypted) {
        try {
          const decrypted = decrypt(dbConfig.configEncrypted);
          const parsed = JSON.parse(decrypted);
          // Mask secrets
          config = maskConfigSecrets(parsed, id as IntegrationId);
        } catch (error) {
          console.error(`[IntegrationConfig] Failed to decrypt ${id}:`, error);
        }
      }

      return {
        id,
        name: definition.name,
        type: definition.type,
        isEnabled: dbConfig?.isEnabled ?? false,
        healthStatus: dbConfig?.healthStatus ?? 'NOT_CONFIGURED',
        healthMessage: dbConfig?.healthMessage ?? null,
        healthCheckedAt: dbConfig?.healthCheckedAt?.toISOString() ?? null,
        config,
        updatedAt: dbConfig?.updatedAt?.toISOString() ?? null,
      };
    });

    return NextResponse.json({
      success: true,
      integrations,
    });
  } catch (error: any) {
    console.error('[GET /api/admin/system/integrations/config] Error:', error);
    if (error.status === 403 || error.statusCode === 403) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PUT /api/admin/system/integrations/config
 * Update integration config (SUPER ADMIN only)
 */
export async function PUT(req: NextRequest) {
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
    const { integrationId, config, isEnabled } = body;

    if (!integrationId || !INTEGRATION_DEFINITIONS[integrationId as IntegrationId]) {
      return NextResponse.json({ error: 'Invalid integration ID' }, { status: 400 });
    }

    const definition = INTEGRATION_DEFINITIONS[integrationId as IntegrationId];

    // Validate config fields
    if (config) {
      for (const field of definition.fields) {
        if (field === 'apiKey' || field === 'password') {
          // Secrets are optional (can be updated separately)
          continue;
        }
        // Other fields should be present if config is provided
      }
    }

    // Encrypt config
    let configEncrypted: string | null = null;
    if (config) {
      // Merge with existing config if updating
      const existing = await prisma.systemIntegrationConfig.findUnique({
        where: { integrationId },
      });

      let mergedConfig = config;
      if (existing?.configEncrypted) {
        try {
          const decrypted = decrypt(existing.configEncrypted);
          const existingConfig = JSON.parse(decrypted);
          mergedConfig = { ...existingConfig, ...config };
        } catch (error) {
          // If decryption fails, use new config only
          mergedConfig = config;
        }
      }

      // Encrypt merged config
      configEncrypted = encrypt(JSON.stringify(mergedConfig));
    }

    // Upsert config
    const updated = await prisma.systemIntegrationConfig.upsert({
      where: { integrationId },
      create: {
        integrationId,
        name: definition.name,
        type: definition.type,
        isEnabled: isEnabled ?? false,
        configEncrypted,
        updatedBy: (session.user as any).id,
      },
      update: {
        ...(configEncrypted && { configEncrypted }),
        ...(isEnabled !== undefined && { isEnabled }),
        updatedBy: (session.user as any).id,
        updatedAt: new Date(),
      },
    });

    // Create audit log
    await prisma.integrationAuditLog.create({
      data: {
        integrationId: updated.id,
        action: 'CONFIGURE',
        changedBy: (session.user as any).id,
        changedByName: (session.user as any).name || (session.user as any).email,
        changes: {
          isEnabled: isEnabled !== undefined ? isEnabled : undefined,
          configUpdated: config ? true : false,
        },
      },
    });

    return NextResponse.json({
      success: true,
      integration: {
        id: updated.integrationId,
        isEnabled: updated.isEnabled,
        healthStatus: updated.healthStatus,
      },
    });
  } catch (error: any) {
    console.error('[PUT /api/admin/system/integrations/config] Error:', error);
    if (error.status === 403 || error.statusCode === 403) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/admin/system/integrations/config/test
 * Test connection for an integration
 */
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
    await prisma.integrationAuditLog.create({
      data: {
        integrationId: dbConfig.id,
        action: 'TEST',
        changedBy: (session.user as any).id,
        changedByName: (session.user as any).name || (session.user as any).email,
        errorMessage: testResult.status === 'ERROR' ? testResult.message : null,
      },
    });

    return NextResponse.json({
      success: testResult.status === 'CONNECTED',
      status: testResult.status,
      message: testResult.message,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[POST /api/admin/system/integrations/config/test] Error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
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
      // Note: Full SMTP test would require nodemailer or similar
      // For now, validate format
      const port = parseInt(config.port);
      if (isNaN(port) || port < 1 || port > 65535) {
        return { status: 'ERROR', message: 'Invalid SMTP port' };
      }
      return { status: 'CONNECTED', message: 'SMTP configuration valid (connection not tested)' };

    default:
      return { status: 'ERROR', message: 'Unknown integration type' };
  }
}

/**
 * Mask secrets in config object for display
 */
function maskConfigSecrets(config: any, integrationId: IntegrationId): any {
  const masked = { ...config };

  if (integrationId === 'ai-openai' && masked.apiKey) {
    masked.apiKey = maskSecret(masked.apiKey);
  }

  if (integrationId === 'email-smtp' && masked.password) {
    masked.password = maskSecret(masked.password);
  }

  return masked;
}
