/**
 * FASE 5 — Admin CTA Management API
 * 
 * CRUD operations for CTA configuration.
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';

// Validation schema
const ctaConfigSchema = z.object({
  enabled: z.boolean().optional(),
  type: z.enum(['whatsapp', 'checkout', 'link']),
  label: z.string().min(1).max(100),
  targetUrl: z.string().url(),
  placement: z.enum(['inline', 'sidebar', 'footer']).optional(),
  contentType: z.enum(['blog', 'product', 'any']).optional(),
  keywordsInclude: z.array(z.string()).optional(),
  keywordsExclude: z.array(z.string()).optional(),
});

// GET: List all CTAs
export async function GET() {
  try {
    const session = await getServerSession();
    if (!session || (session.user as any)?.role !== 'super_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const ctas = await prisma.ctaConfig.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        _count: {
          select: {
            clicks: true,
          },
        },
      },
    });

    return NextResponse.json({
      ctas: ctas.map((cta) => ({
        id: cta.id,
        enabled: cta.enabled,
        type: cta.type,
        label: cta.label,
        targetUrl: cta.targetUrl,
        placement: cta.placement,
        contentType: cta.contentType,
        keywordsInclude: cta.keywordsInclude ? JSON.parse(cta.keywordsInclude) : [],
        keywordsExclude: cta.keywordsExclude ? JSON.parse(cta.keywordsExclude) : [],
        clickCount: cta._count.clicks,
        createdAt: cta.createdAt,
        updatedAt: cta.updatedAt,
      })),
    });
  } catch (error) {
    console.error('[ADMIN-CTA-API] GET Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST: Create new CTA
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session || (session.user as any)?.role !== 'super_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validated = ctaConfigSchema.parse(body);

    // Validate keywords arrays
    const keywordsInclude = validated.keywordsInclude ? JSON.stringify(validated.keywordsInclude) : null;
    const keywordsExclude = validated.keywordsExclude ? JSON.stringify(validated.keywordsExclude) : null;

    const cta = await prisma.ctaConfig.create({
      data: {
        enabled: validated.enabled ?? false,
        type: validated.type,
        label: validated.label,
        targetUrl: validated.targetUrl,
        placement: validated.placement || 'inline',
        contentType: validated.contentType || 'any',
        keywordsInclude,
        keywordsExclude,
      },
    });

    return NextResponse.json({ success: true, cta });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.issues }, { status: 400 });
    }
    console.error('[ADMIN-CTA-API] POST Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
