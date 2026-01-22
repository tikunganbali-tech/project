/**
 * PHASE 6B — INTEGRATION HEALTH CHECK SERVICE
 * 
 * Periodic health check untuk semua integrations
 * - Test connection untuk setiap integration
 * - Update healthStatus, healthMessage, healthCheckedAt
 * - Tidak bocor secret di log
 */

import { prisma } from './db';
import { decrypt } from './encryption';

const INTEGRATION_IDS = [
  'analytics-ga4',
  'ads-facebook',
  'ads-google',
  'ads-tiktok',
  'ai-openai',
  'email-smtp',
] as const;

type IntegrationId = typeof INTEGRATION_IDS[number];

/**
 * Test connection for a specific integration
 */
async function testIntegrationConnection(
  integrationId: IntegrationId,
  config: any
): Promise<{ status: 'CONNECTED' | 'ERROR' | 'NOT_CONFIGURED'; message: string }> {
  switch (integrationId) {
    case 'analytics-ga4':
      if (!config.measurementId || !config.measurementId.match(/^G-[A-Z0-9]+$/)) {
        return { status: 'ERROR', message: 'Invalid Measurement ID format' };
      }
      return { status: 'CONNECTED', message: 'Measurement ID format valid' };

    case 'ads-facebook':
    case 'ads-tiktok':
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
          return { status: 'CONNECTED', message: 'OpenAI API key is valid' };
        } else {
          const error = await response.json().catch(() => ({ error: { message: 'Invalid API key' } }));
          return { status: 'ERROR', message: error.error?.message || 'Invalid API key' };
        }
      } catch (error: any) {
        return { status: 'ERROR', message: `Connection failed: ${error.message}` };
      }

    case 'email-smtp':
      if (!config.host || !config.port || !config.user || !config.password) {
        return { status: 'ERROR', message: 'SMTP configuration incomplete' };
      }
      const port = parseInt(config.port);
      if (isNaN(port) || port < 1 || port > 65535) {
        return { status: 'ERROR', message: 'Invalid SMTP port' };
      }
      return { status: 'CONNECTED', message: 'SMTP configuration valid' };

    default:
      return { status: 'ERROR', message: 'Unknown integration type' };
  }
}

/**
 * Health check all integrations
 */
export async function healthCheckIntegrations(): Promise<{
  success: boolean;
  result?: any;
  error?: string;
}> {
  try {
    const results: any[] = [];
    const now = new Date();

    for (const integrationId of INTEGRATION_IDS) {
      try {
        // Get config from DB
        const dbConfig = await prisma.systemIntegrationConfig.findUnique({
          where: { integrationId },
        });

        if (!dbConfig || !dbConfig.isEnabled) {
          // Not configured or disabled
          await prisma.systemIntegrationConfig.upsert({
            where: { integrationId },
            create: {
              integrationId,
              name: integrationId,
              type: 'ANALYTICS',
              isEnabled: false,
              healthStatus: 'NOT_CONFIGURED',
              healthMessage: 'Integration not configured',
              healthCheckedAt: now,
            },
            update: {
              healthStatus: 'NOT_CONFIGURED',
              healthMessage: 'Integration not configured',
              healthCheckedAt: now,
            },
          });
          results.push({ integrationId, status: 'NOT_CONFIGURED' });
          continue;
        }

        // Decrypt config
        let config: any = {};
        if (dbConfig.configEncrypted) {
          try {
            const decrypted = decrypt(dbConfig.configEncrypted);
            config = JSON.parse(decrypted);
          } catch (error) {
            await prisma.systemIntegrationConfig.update({
              where: { integrationId },
              data: {
                healthStatus: 'ERROR',
                healthMessage: 'Failed to decrypt configuration',
                healthCheckedAt: now,
              },
            });
            results.push({ integrationId, status: 'ERROR', error: 'Decryption failed' });
            continue;
          }
        }

        // Test connection
        const testResult = await testIntegrationConnection(integrationId as IntegrationId, config);

        // Update health status
        await prisma.systemIntegrationConfig.update({
          where: { integrationId },
          data: {
            healthStatus: testResult.status,
            healthMessage: testResult.message,
            healthCheckedAt: now,
          },
        });

        results.push({
          integrationId,
          status: testResult.status,
          message: testResult.message,
        });
      } catch (error: any) {
        console.error(`[HEALTH-CHECK] Error checking ${integrationId}:`, error);
        results.push({
          integrationId,
          status: 'ERROR',
          error: error.message || 'Unknown error',
        });
      }
    }

    return {
      success: true,
      result: {
        checked: results.length,
        timestamp: now.toISOString(),
        results,
      },
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Health check failed',
    };
  }
}
