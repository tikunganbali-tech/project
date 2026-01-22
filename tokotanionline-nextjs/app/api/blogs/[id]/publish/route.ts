import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { prisma } from '@/lib/db';

// POST /api/blogs/[id]/publish - Publish blog now
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession();
    if (!session || (session.user as any).role === 'marketing_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // QUALITY ASSURANCE: Validate before publishing
    // DISABLED: Quality assurance module not available
    // const { validateAndBlockPublishing } = await import('@/lib/quality/content-quality-assurance');
    // const validation = await validateAndBlockPublishing(params.id);

    // if (!validation.canPublish) {
    //   return NextResponse.json({
    //     error: 'Content validation failed',
    //     validation: validation.result,
    //     errors: validation.result.errors,
    //     warnings: validation.result.warnings,
    //     message: 'Content does not meet quality standards. Please fix issues before publishing.',
    //   }, { status: 400 });
    // }

    // PHASE 3: Publish tanpa validasi isi
    // PHASE 3: Publish tidak boleh gagal karena SEO/validator
    const blog = await prisma.blog.update({
      where: { id: params.id },
      data: {
        status: 'published',
        publishedAt: new Date(),
        scheduledAt: null,
      },
    });

    // PHASE 3: Emit CONTENT_PUBLISHED event (jika menggunakan AI v2)
    // Check if this blog uses AI v2 content
    const ENGINE_HUB_URL = process.env.ENGINE_HUB_URL || process.env.GO_ENGINE_API_URL || 'http://localhost:8090';
    
    // Try to emit event (non-blocking)
    // PHASE 3: Publish tidak boleh gagal karena event emission
    try {
      // Generate pageId from blog slug
      const pageId = `blog-${blog.slug}`;
      
      // Try to get version from blog metadata or use 1 as default
      const version = 1; // TODO: Get from blog metadata if stored
      
      const eventUrl = `${ENGINE_HUB_URL}/api/v2/events/publish`;
      fetch(eventUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pageId,
          version,
          pageType: 'blog',
        }),
      }).catch((e) => {
        // PHASE 3: Publish tidak boleh gagal karena event emission
        console.error('[PUBLISH] Failed to emit event (non-blocking):', e);
      });
    } catch (error) {
      // PHASE 3: Publish tidak boleh gagal karena event emission
      console.error('[PUBLISH] Error emitting event (non-blocking):', error);
    }

    // PHASE 3: Guardrail - Tidak ada SEO/validator di publish
    // Semua engine calls sudah dihapus/disabled

    return NextResponse.json({ blog });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

