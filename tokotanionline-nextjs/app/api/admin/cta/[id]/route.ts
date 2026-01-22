/**
 * FASE 5 — Admin CTA Update/Delete API
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';

const ctaUpdateSchema = z.object({
  enabled: z.boolean().optional(),
  type: z.enum(['whatsapp', 'checkout', 'link']).optional(),
  label: z.string().min(1).max(100).optional(),
  targetUrl: z.string().url().optional(),
  placement: z.enum(['inline', 'sidebar', 'footer']).optional(),
  contentType: z.enum(['blog', 'product', 'any']).optional(),
  keywordsInclude: z.array(z.string()).optional(),
  keywordsExclude: z.array(z.string()).optional(),
});

// PUT: Update CTA
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession();
    if (!session || (session.user as any)?.role !== 'super_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validated = ctaUpdateSchema.parse(body);

    // Build update data
    const updateData: any = {};
    if (validated.enabled !== undefined) updateData.enabled = validated.enabled;
    if (validated.type) updateData.type = validated.type;
    if (validated.label) updateData.label = validated.label;
    if (validated.targetUrl) updateData.targetUrl = validated.targetUrl;
    if (validated.placement) updateData.placement = validated.placement;
    if (validated.contentType) updateData.contentType = validated.contentType;
    if (validated.keywordsInclude !== undefined) {
      updateData.keywordsInclude = validated.keywordsInclude.length > 0
        ? JSON.stringify(validated.keywordsInclude)
        : null;
    }
    if (validated.keywordsExclude !== undefined) {
      updateData.keywordsExclude = validated.keywordsExclude.length > 0
        ? JSON.stringify(validated.keywordsExclude)
        : null;
    }

    const cta = await prisma.ctaConfig.update({
      where: { id: params.id },
      data: updateData,
    });

    return NextResponse.json({ success: true, cta });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.issues }, { status: 400 });
    }
    console.error('[ADMIN-CTA-API] PUT Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE: Delete CTA
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession();
    if (!session || (session.user as any)?.role !== 'super_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await prisma.ctaConfig.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[ADMIN-CTA-API] DELETE Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
