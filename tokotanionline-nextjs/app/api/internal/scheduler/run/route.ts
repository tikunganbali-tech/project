/**
 * FASE 4 — INTERNAL SCHEDULER RUN API
 * 
 * POST /api/internal/scheduler/run
 * 
 * Internal endpoint for scheduler worker (no user auth required, uses service token)
 * This endpoint is called by the scheduler worker to execute scheduled content generation
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { normalizeContent } from '@/lib/content-normalizer';
import { validateContent } from '@/lib/content-validator';
import { normalizeSlug, ContentType } from '@/lib/content-contract';
import { ensureProductExtraInfo } from '@/lib/product-extra-info';

// Service token for internal calls (set in env)
const SCHEDULER_SERVICE_TOKEN = process.env.SCHEDULER_SERVICE_TOKEN || 'scheduler-internal-token-change-in-production';

// Fail-fast ENV check
const ENGINE_HUB_URL = process.env.ENGINE_HUB_URL || process.env.GO_ENGINE_API_URL || 'http://localhost:8090';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || process.env.AI_API_KEY;

async function resolveBrandIdForScheduler(request: NextRequest): Promise<string> {
  const headerBrandId = request.headers.get('x-brand-id');
  if (headerBrandId) return headerBrandId;

  const firstActiveBrand = await prisma.brand.findFirst({
    where: { brandStatus: 'ACTIVE' },
    orderBy: { createdAt: 'asc' },
    select: { id: true },
  });
  if (!firstActiveBrand) {
    throw new Error('No ACTIVE brand found. Please create a brand first.');
  }
  return firstActiveBrand.id;
}

async function resolveLocaleIdForScheduler(request: NextRequest, brandId: string): Promise<string> {
  const headerLocaleId = request.headers.get('x-locale-id');
  if (headerLocaleId) return headerLocaleId;

  const defaultLocale = await prisma.locale.findFirst({
    where: { brandId, isActive: true, isDefault: true },
    orderBy: { createdAt: 'asc' },
    select: { id: true },
  });
  if (defaultLocale) return defaultLocale.id;

  const firstActiveLocale = await prisma.locale.findFirst({
    where: { brandId, isActive: true },
    orderBy: { createdAt: 'asc' },
    select: { id: true },
  });
  if (!firstActiveLocale) {
    throw new Error('No ACTIVE locale found for brand. Please create a locale first.');
  }
  return firstActiveLocale.id;
}

/**
 * POST /api/internal/scheduler/run
 * Execute a single content generation job
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Service token auth
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    
    if (token !== SCHEDULER_SERVICE_TOKEN) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { type, topic, categoryId, language = 'id', runId, publishMode, keywordId } = body; // M-08

    const brandId = body?.brandId || (await resolveBrandIdForScheduler(request));
    const localeId = body?.localeId || (await resolveLocaleIdForScheduler(request, brandId));

    if (!type || !topic) {
      return NextResponse.json(
        { error: 'Missing required fields: type, topic' },
        { status: 400 }
      );
    }

    console.log(`[SCHEDULER-WORKER] Starting generation: type=${type}, topic=${topic}, runId=${runId}`);

    // Check DRY_RUN mode
    const isDryRun = process.env.DRY_RUN === 'true';
    if (isDryRun) {
      console.log('[SCHEDULER-WORKER] DRY_RUN mode - skipping actual generation');
      return NextResponse.json({
        success: true,
        dryRun: true,
        message: 'DRY_RUN mode - content not generated',
      });
    }

    // 🔧 STEP 1: AI GENERATE (via Go engine hub)
    let aiResult;
    try {
      aiResult = await callGoEngine({ type, topic, language, categoryId });
    } catch (error: any) {
      console.error('[SCHEDULER-WORKER] Go engine call failed:', error.message);
      throw new Error(`AI generation failed: ${error.message}`);
    }

    if (!aiResult || aiResult.status === 'FAILED' || aiResult.status === 'FAILED_VALIDATION') {
      throw new Error(aiResult?.error || 'Content generation failed');
    }

    // Extract content from Go engine response
    const rawContent = aiResult.content || aiResult;
    const title = rawContent.title || rawContent.Title || '';
    const bodyContent = rawContent.body || rawContent.Body || '';
    const metaTitle = rawContent.metaTitle || rawContent.MetaTitle || title;
    const metaDescription = rawContent.metaDesc || rawContent.MetaDesc || '';

    // 🔧 STEP 2: NORMALIZER (deterministik - memaksa patuh)
    console.log('[SCHEDULER-WORKER] Applying normalizer...');
    const normalized = normalizeContent({
      title,
      body: bodyContent,
      metaTitle,
      metaDescription,
    });

    // 🔧 STEP 3: VALIDATOR (SEO & kualitas)
    console.log('[SCHEDULER-WORKER] Running validator...');
    const validation = validateContent({
      title: normalized.title,
      body: normalized.body,
      metaTitle: normalized.metaTitle,
      metaDescription: normalized.metaDescription,
    });

    if (!validation.valid) {
      console.error('[SCHEDULER-WORKER] Validation failed:', validation.errors);
      throw new Error(`Content validation failed: ${validation.errors.join(', ')}`);
    }

    // 🔧 STEP 4: PERSIST (Save to database)
    console.log('[SCHEDULER-WORKER] Saving to database...');
    const savedContent = await persistContent({
      type: type as ContentType,
      title: normalized.title,
      body: normalized.body,
      excerpt: metaDescription.substring(0, 200) || normalized.title,
      seo: {
        title: normalized.metaTitle || normalized.title,
        description: metaDescription || normalized.title.substring(0, 160),
        keywords: [], // STEP 1: Keyword TIDAK di-extract dari konten - hanya dari input scheduler
      },
      categoryId: categoryId,
      source: 'ai',
      brandId,
      localeId,
      publishMode: publishMode || 'DRAFT_ONLY', // M-08
      keywordId: keywordId || null, // M-08
    });

    const duration = Date.now() - startTime;
    console.log(`[SCHEDULER-WORKER] Success: ${type} created in ${duration}ms, id=${savedContent.id}, status=${savedContent.status}`);

    return NextResponse.json({
      success: true,
      content: savedContent,
      status: savedContent.status,
      duration,
      message: `Content generated and saved as ${savedContent.status}`,
    });
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error('[SCHEDULER-WORKER] Error:', error);

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error.message || 'An error occurred',
        duration,
      },
      { status: 500 }
    );
  }
}

/**
 * Call Go engine hub for AI generation
 */
async function callGoEngine(data: { type: string; topic: string; language: string; categoryId?: string | null }) {
  // Map type to Go engine contentType
  const contentType = 'DERIVATIVE';
  
  // Generate a simple outline from topic
  const outline = generateSimpleOutline(data.topic);

  const requestBody = {
    contentType,
    category: data.categoryId || 'K1',
    outline,
    language: data.language || 'id',
  };

  console.log(`[SCHEDULER-WORKER] Calling Go engine: ${ENGINE_HUB_URL}/api/engine/ai/generate`);

  const response = await fetch(`${ENGINE_HUB_URL}/api/engine/ai/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
    signal: AbortSignal.timeout(5 * 60 * 1000), // 5 minutes timeout
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Go engine error (${response.status}): ${errorText}`);
  }

  const result = await response.json();
  return result;
}

/**
 * Generate simple outline from topic
 */
function generateSimpleOutline(topic: string): string {
  return `### H2 — Pengenalan ${topic}
Pengenalan singkat tentang ${topic} dan pentingnya dalam pertanian.

### H2 — Manfaat dan Keuntungan
Manfaat utama dari ${topic} dan bagaimana hal ini dapat membantu petani.

### H2 — Cara Menggunakan atau Menerapkan
Panduan praktis tentang cara menggunakan atau menerapkan ${topic}.

### H2 — Tips dan Rekomendasi
Tips praktis dan rekomendasi untuk mendapatkan hasil terbaik dengan ${topic}.

### H2 — Kesimpulan
Ringkasan poin-poin penting tentang ${topic}.`;
}

/**
 * Persist content to database
 */
async function persistContent(data: {
  type: ContentType;
  title: string;
  body: string;
  excerpt: string;
  seo: { title: string; description: string; keywords: string[] };
  categoryId?: string | null;
  source: 'ai' | 'manual';
  brandId: string;
  localeId: string;
  publishMode?: 'AUTO_PUBLISH' | 'DRAFT_ONLY' | 'QC_REQUIRED'; // M-08
  keywordId?: string | null; // M-08
}) {
  const slug = normalizeSlug(data.title);

  // M-12: GUARD DUPLIKASI - Check if keyword's content is already published
  if (data.keywordId && data.publishMode === 'AUTO_PUBLISH') {
    const keyword = await prisma.scheduleKeyword.findUnique({
      where: { id: data.keywordId },
      select: { contentId: true, contentType: true },
    });

    if (keyword?.contentId) {
      // Check if content is already published
      if (data.type === 'blog') {
        const existingPublished = await prisma.blogPost.findUnique({
          where: { id: keyword.contentId },
          select: { publishedAt: true, status: true },
        });
        if (existingPublished?.publishedAt) {
          console.log(`[SCHEDULER] Skipped (already published) - keywordId: ${data.keywordId}, contentId: ${keyword.contentId}`);
          throw new Error(`Content for keyword ${data.keywordId} is already published (publishedAt: ${existingPublished.publishedAt})`);
        }
      } else {
        const existingPublished = await prisma.product.findUnique({
          where: { id: keyword.contentId },
          select: { publishedAt: true, status: true },
        });
        if (existingPublished?.publishedAt) {
          console.log(`[SCHEDULER] Skipped (already published) - keywordId: ${data.keywordId}, contentId: ${keyword.contentId}`);
          throw new Error(`Content for keyword ${data.keywordId} is already published (publishedAt: ${existingPublished.publishedAt})`);
        }
      }
    }
  }

  if (data.type === 'blog') {
    // slug is not unique alone, need brandId
    const existing = await prisma.blogPost.findFirst({
      where: { 
        slug,
        brandId: data.brandId,
      },
    });

    // M-08: Determine status based on publishMode
    const finalStatus = data.publishMode === 'AUTO_PUBLISH' ? 'PUBLISHED' : 'DRAFT';
    
    // M-12: Set publishedAt BEFORE saving (prevents race condition)
    const publishedAt = finalStatus === 'PUBLISHED' ? new Date() : null;
    
    if (existing) {
      const uniqueSlug = `${slug}-${Date.now()}`;
      const created = await prisma.blogPost.create({
        data: {
          title: data.title,
          slug: uniqueSlug,
          brandId: data.brandId, // Required field
          excerpt: data.excerpt,
          content: data.body,
          status: finalStatus,
          seoTitle: data.seo.title,
          seoDescription: data.seo.description,
          seoKeywords: data.seo.keywords.join(', '),
          categoryId: data.categoryId,
          publishSource: 'SCHEDULER', // M-08
          schedulerKeywordId: data.keywordId || null, // M-08
          ...(publishedAt && { publishedAt }), // M-12: Set publishedAt BEFORE save
        },
      });
      
      // M-12: Log publish success
      if (publishedAt) {
        console.log(`[SCHEDULER] Published successfully - blogId: ${created.id}, keywordId: ${data.keywordId || 'N/A'}, publishedAt: ${publishedAt.toISOString()}`);
      }
      
      // M-08: Update ScheduleKeyword with contentId
      if (data.keywordId) {
        await prisma.scheduleKeyword.update({
          where: { id: data.keywordId },
          data: { contentId: created.id, contentType: 'BLOG' },
        }).catch(err => console.error('[SCHEDULER] Failed to update keyword:', err));
      }
      
      return created;
    }
    
    const created = await prisma.blogPost.create({
      data: {
        title: data.title,
        slug,
        brandId: data.brandId, // Required field
        excerpt: data.excerpt,
        content: data.body,
        status: finalStatus,
        seoTitle: data.seo.title,
        seoDescription: data.seo.description,
        seoKeywords: data.seo.keywords.join(', '),
        categoryId: data.categoryId,
        publishSource: 'SCHEDULER', // M-08
        schedulerKeywordId: data.keywordId || null, // M-08
        ...(publishedAt && { publishedAt }), // M-12: Set publishedAt BEFORE save
      },
    });
    
    // M-12: Log publish success
    if (publishedAt) {
      console.log(`[SCHEDULER] Published successfully - blogId: ${created.id}, keywordId: ${data.keywordId || 'N/A'}, publishedAt: ${publishedAt.toISOString()}`);
    }
    
    // M-08: Update ScheduleKeyword with contentId
    if (data.keywordId) {
      await prisma.scheduleKeyword.update({
        where: { id: data.keywordId },
        data: { contentId: created.id, contentType: 'BLOG' },
      }).catch(err => console.error('[SCHEDULER] Failed to update keyword:', err));
    }
    
    return created;
  } else {
    if (!data.categoryId) {
      const firstCategory = await prisma.productCategory.findFirst({
        where: { brandId: data.brandId },
        orderBy: { name: 'asc' },
      });
      
      if (!firstCategory) {
        throw new Error('No product category available. Please create a category first.');
      }
      
      data.categoryId = firstCategory.id;
    }

    const existing = await prisma.product.findFirst({
      where: { slug, brandId: data.brandId, localeId: data.localeId },
    });

    // M-08: Determine status based on publishMode
    const finalStatus = data.publishMode === 'AUTO_PUBLISH' ? 'PUBLISHED' : 'DRAFT';
    
    // M-12: Set publishedAt BEFORE saving (prevents race condition)
    const publishedAt = finalStatus === 'PUBLISHED' ? new Date() : null;
    
    // M-09: Get category name for ensureProductExtraInfo
    const category = await prisma.productCategory.findUnique({
      where: { id: data.categoryId },
      select: { name: true },
    });
    const categoryName = category?.name || null;

    // M-09: Ensure all extra info fields are filled
    const ensuredExtraInfo = ensureProductExtraInfo(
      {
        specifications: null,
        problemSolution: null,
        applicationMethod: null,
        dosage: null,
        advantages: null,
        safetyNotes: null,
      },
      data.title,
      categoryName
    );
    
    if (existing) {
      const uniqueSlug = `${slug}-${Date.now()}`;
      const created = await prisma.product.create({
        data: {
          name: data.title,
          slug: uniqueSlug,
          brandId: data.brandId,
          localeId: data.localeId,
          description: data.body,
          shortDescription: data.excerpt,
          price: 0,
          stock: 0,
          unit: 'pcs',
          categoryId: data.categoryId,
          status: finalStatus,
          metaTitle: data.seo.title,
          metaDescription: data.seo.description,
          metaKeywords: JSON.stringify(data.seo.keywords),
          isActive: false,
          publishSource: 'SCHEDULER', // M-08
          schedulerKeywordId: data.keywordId || null, // M-08
          // M-09: Set all extra info fields
          specifications: ensuredExtraInfo.specifications,
          problemSolution: ensuredExtraInfo.problemSolution,
          applicationMethod: ensuredExtraInfo.applicationMethod,
          dosage: ensuredExtraInfo.dosage,
          advantages: ensuredExtraInfo.advantages,
          safetyNotes: ensuredExtraInfo.safetyNotes,
          ...(publishedAt && { publishedAt }), // M-12: Set publishedAt BEFORE save
        },
      });
      
      // M-12: Log publish success
      if (publishedAt) {
        console.log(`[SCHEDULER] Published successfully - productId: ${created.id}, keywordId: ${data.keywordId || 'N/A'}, publishedAt: ${publishedAt.toISOString()}`);
      }
      
      // M-08: Update ScheduleKeyword with contentId
      if (data.keywordId) {
        await prisma.scheduleKeyword.update({
          where: { id: data.keywordId },
          data: { contentId: created.id, contentType: 'PRODUCT' },
        }).catch(err => console.error('[SCHEDULER] Failed to update keyword:', err));
      }
      
      return created;
    }

    const created = await prisma.product.create({
      data: {
        name: data.title,
        slug,
        brandId: data.brandId,
        localeId: data.localeId,
        description: data.body,
        shortDescription: data.excerpt,
        price: 0,
        stock: 0,
        unit: 'pcs',
        categoryId: data.categoryId,
        status: finalStatus,
        metaTitle: data.seo.title,
        metaDescription: data.seo.description,
        metaKeywords: JSON.stringify(data.seo.keywords),
        isActive: false,
        publishSource: 'SCHEDULER', // M-08
        schedulerKeywordId: data.keywordId || null, // M-08
        // M-09: Set all extra info fields
        specifications: ensuredExtraInfo.specifications,
        problemSolution: ensuredExtraInfo.problemSolution,
        applicationMethod: ensuredExtraInfo.applicationMethod,
        dosage: ensuredExtraInfo.dosage,
        advantages: ensuredExtraInfo.advantages,
        safetyNotes: ensuredExtraInfo.safetyNotes,
        ...(publishedAt && { publishedAt }), // M-12: Set publishedAt BEFORE save
      },
    });
    
    // M-12: Log publish success
    if (publishedAt) {
      console.log(`[SCHEDULER] Published successfully - productId: ${created.id}, keywordId: ${data.keywordId || 'N/A'}, publishedAt: ${publishedAt.toISOString()}`);
    }
    
    // M-08: Update ScheduleKeyword with contentId
    if (data.keywordId) {
      await prisma.scheduleKeyword.update({
        where: { id: data.keywordId },
        data: { contentId: created.id, contentType: 'PRODUCT' },
      }).catch(err => console.error('[SCHEDULER] Failed to update keyword:', err));
    }
    
    return created;
  }
}

// STEP 1: REMOVED extractKeywords - Keyword TIDAK BOLEH dihasilkan AI
// Keywords hanya dari input scheduler (riset SEO manual)
