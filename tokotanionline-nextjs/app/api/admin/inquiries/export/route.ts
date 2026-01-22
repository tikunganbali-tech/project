/**
 * STEP 2C.2 — PUBLIC INQUIRY EXPORT (READ-ONLY, MANUAL)
 * 
 * GET /api/admin/inquiries/export
 * 
 * Purpose: Manual export inquiry data untuk follow-up offline
 * 
 * 🔒 GUARDS (WAJIB):
 * - Auth check (session required)
 * - Role check (role ≥ admin, permission: admin.read)
 * - GET only (no mutations, no side effects)
 * 
 * ❌ DILARANG:
 * - Automation / scheduled export
 * - Email / WA / webhook
 * - Engine trigger
 * - Status update (termasuk "exported" flag)
 * - Background job
 * - Logging yang mengubah state
 * 
 * ✅ BOLEH:
 * - Export on-demand (manual trigger)
 * - File CSV atau JSON
 * - Hanya via admin UI
 * - Scope data hasil filter yang sedang dilihat
 * 
 * Query Params:
 * - format: 'csv' | 'json' (required)
 * - fromDate: ISO date string (optional, same as viewer)
 * - toDate: ISO date string (optional, same as viewer)
 * - q: search text (optional, same as viewer)
 * 
 * Response:
 * - CSV: Content-Type: text/csv, Content-Disposition: attachment
 * - JSON: Content-Type: application/json, Content-Disposition: attachment
 * 
 * Field Whitelist (BOLEH diekspor):
 * - id, name, contact, message, context, createdAt
 * 
 * Field Blacklist (TIDAK BOLEH diekspor):
 * - ipAddress, userAgent, internal metadata, sensitive data
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * Convert inquiry data to CSV format
 */
function toCSV(inquiries: any[]): string {
  // CSV Header
  const headers = ['ID', 'Name', 'Contact', 'Message', 'Context', 'Created At'];
  const rows = inquiries.map((inquiry) => {
    // Escape CSV special characters
    const escapeCSV = (str: string) => {
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    return [
      inquiry.id,
      escapeCSV(inquiry.name),
      escapeCSV(inquiry.contact),
      escapeCSV(inquiry.message),
      inquiry.context,
      new Date(inquiry.createdAt).toISOString(),
    ].join(',');
  });

  return [headers.join(','), ...rows].join('\n');
}

/**
 * Convert inquiry data to JSON format
 */
function toJSON(inquiries: any[]): string {
  return JSON.stringify(
    inquiries.map((inquiry) => ({
      id: inquiry.id,
      name: inquiry.name,
      contact: inquiry.contact,
      message: inquiry.message,
      context: inquiry.context,
      createdAt: inquiry.createdAt,
    })),
    null,
    2
  );
}

export async function GET(request: NextRequest) {
  try {
    // 🔒 GUARD 1: AUTHENTICATION CHECK
    const session = await getServerSession();
    
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized: Not authenticated' },
        { status: 401 }
      );
    }

    // 🔒 GUARD 2: ROLE CHECK (role ≥ admin)
    const userRole = (session.user as any).role;
    const canRead = hasPermission(userRole, 'admin.read');

    if (!canRead) {
      return NextResponse.json(
        { error: 'Forbidden: Insufficient permissions' },
        { status: 403 }
      );
    }

    // 📥 PARSE QUERY PARAMS
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format')?.toLowerCase();

    // ✅ VALIDATION: Format harus csv atau json
    if (!format || (format !== 'csv' && format !== 'json')) {
      return NextResponse.json(
        { error: 'Invalid format. Must be "csv" or "json"' },
        { status: 400 }
      );
    }

    // 📥 PARSE FILTER PARAMS (same as viewer)
    const fromDate = searchParams.get('fromDate');
    const toDate = searchParams.get('toDate');
    const q = searchParams.get('q')?.trim() || null;

    // 🔍 BUILD WHERE CLAUSE (READ-ONLY, NO MUTATION)
    const where: any = {};

    // Date range filter
    if (fromDate || toDate) {
      where.createdAt = {};
      if (fromDate) {
        where.createdAt.gte = new Date(fromDate);
      }
      if (toDate) {
        where.createdAt.lte = new Date(toDate);
      }
    }

    // Search filter (name, contact, message)
    if (q) {
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { contact: { contains: q, mode: 'insensitive' } },
        { message: { contains: q, mode: 'insensitive' } },
      ];
    }

    // 📖 FETCH INQUIRIES (READ-ONLY, NO MUTATION)
    // ✅ WHITELIST: Hanya field yang BOLEH diekspor
    const inquiries = await prisma.publicInquiry.findMany({
      where,
      select: {
        id: true,
        name: true,
        contact: true,
        message: true,
        context: true,
        createdAt: true,
        // ❌ TIDAK include: ipAddress, userAgent, contextId, internal metadata
      },
      orderBy: {
        createdAt: 'desc',
      },
      // ❌ TIDAK ada limit untuk export (export semua yang match filter)
    });

    // ❌ TIDAK ADA MUTATION:
    // - Tidak update "exported" flag
    // - Tidak log ke database
    // - Tidak trigger engine
    // - Tidak kirim email/WA/webhook
    // - Tidak ada side effects

    // 📄 GENERATE EXPORT DATA
    let content: string;
    let contentType: string;
    let filename: string;

    if (format === 'csv') {
      content = toCSV(inquiries);
      contentType = 'text/csv';
      filename = `inquiries-${new Date().toISOString().split('T')[0]}.csv`;
    } else {
      content = toJSON(inquiries);
      contentType = 'application/json';
      filename = `inquiries-${new Date().toISOString().split('T')[0]}.json`;
    }

    // ✅ RETURN FILE DOWNLOAD (NO SIDE EFFECTS)
    return new NextResponse(content, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        // ❌ TIDAK ada custom headers yang trigger automation
      },
    });
  } catch (error: any) {
    console.error('Error exporting inquiries:', error);
    return NextResponse.json(
      { error: 'Failed to export inquiries' },
      { status: 500 }
    );
  }
}

// ❌ EXPLICITLY BLOCK OTHER METHODS (NO MUTATIONS)
export async function POST() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}

export async function PUT() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}

export async function PATCH() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}
