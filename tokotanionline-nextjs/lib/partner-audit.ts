/**
 * PHASE 9A: Partner Audit Logging
 * 
 * Track all partner access for security and compliance
 * - Log every API request
 * - Track scope access
 * - Monitor for anomalies
 */

import { prisma } from './db';
import type { NextRequest } from 'next/server';
import type { PartnerAuthResult } from './partner-auth';

export interface AuditLogData {
  partnerId: string;
  action: string;
  endpoint: string;
  method: string;
  statusCode: number;
  ipAddress?: string;
  userAgent?: string;
  requestData?: any;
  responseSize?: number;
  durationMs?: number;
  error?: string;
}

/**
 * Log partner access
 */
export async function logPartnerAccess(data: AuditLogData): Promise<void> {
  try {
    await prisma.partnerAuditLog.create({
      data: {
        partnerId: data.partnerId,
        action: data.action,
        endpoint: data.endpoint,
        method: data.method,
        statusCode: data.statusCode,
        ipAddress: data.ipAddress || null,
        userAgent: data.userAgent || null,
        requestData: data.requestData ? JSON.parse(JSON.stringify(data.requestData)) : null,
        responseSize: data.responseSize || null,
        durationMs: data.durationMs || null,
        error: data.error || null,
      },
    });
  } catch (error: any) {
    // Silent fail - don't break request flow
    console.error('[Partner Audit] Failed to log:', error?.message || error);
  }
}

/**
 * Extract IP address from request
 */
export function getClientIp(request: NextRequest): string | undefined {
  // Try various headers (for proxies/load balancers)
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }

  return undefined;
}

/**
 * Extract user agent from request
 */
export function getUserAgent(request: NextRequest): string | undefined {
  return request.headers.get('user-agent') || undefined;
}

/**
 * Sanitize request data for audit log
 * Remove sensitive information
 */
export function sanitizeRequestData(data: any): any {
  if (!data || typeof data !== 'object') {
    return data;
  }

  const sanitized: any = { ...data };

  // Remove sensitive fields
  const sensitiveFields = [
    'password',
    'passwordHash',
    'token',
    'apiKey',
    'secret',
    'authorization',
  ];

  for (const field of sensitiveFields) {
    if (field in sanitized) {
      sanitized[field] = '[REDACTED]';
    }
  }

  return sanitized;
}
