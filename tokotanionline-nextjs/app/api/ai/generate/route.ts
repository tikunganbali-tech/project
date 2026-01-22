/**
 * FASE 3 — AI GENERATE ENDPOINT (SERVER-SIDE)
 * 
 * POST /api/ai/generate
 * 
 * Pipeline wajib (tidak boleh diubah):
 * AI Generate → Normalizer → Validator → Persist
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import { normalizeContent } from '@/lib/content-normalizer';
import { validateContent } from '@/lib/content-validator';
import { normalizeSlug, ContentRecord, ContentType } from '@/lib/content-contract';

// Fail-fast ENV check
const ENGINE_HUB_URL = process.env.ENGINE_HUB_URL || process.env.GO_ENGINE_API_URL || 'http://localhost:8090';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || process.env.AI_API_KEY;

// Validate API key on module load (fail-fast)
if (!OPENAI_API_KEY && typeof window === 'undefined') {
  console.error('[FATAL] OPENAI_API_KEY or AI_API_KEY is not set. AI generation will fail.');
}

const generateSchema = z.object({
  type: z.enum(['blog', 'product']),
  topic: z.string().min(1, 'Topic/keyword is required'),
  language: z.string().default('id'),
  categoryId: z.string().optional().nullable(),
});

async function resolveBrandIdForPersist(request: NextRequest, session: any): Promise<string> {
  const headerBrandId = request.headers.get('x-brand-id');
  if (headerBrandId) return headerBrandId;

  if (session?.user?.email) {
    const admin = await prisma.admin.findUnique({
      where: { email: session.user.email },
      select: { brandId: true, role: true },
    });
    if (admin?.brandId) return admin.brandId;
  }

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

async function resolveLocaleIdForPersist(request: NextRequest, brandId: string): Promise<string> {
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
 * POST /api/ai/generate
 * 
 * Input:
 * - type: 'blog' | 'product'
 * - topic: keyword/topic untuk generate
 * - language: default 'id'
 * - categoryId: optional
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // 🔐 AUTHENTICATION CHECK
    const session = await getServerSession();
    if (!session || (session.user as any).role === 'marketing_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 📥 PARSE & VALIDATE INPUT
    const body = await request.json();
    const data = generateSchema.parse(body);

    console.log(`[AI-GENERATE] Starting generation: type=${data.type}, topic=${data.topic}`);

    // PHASE 7A/7B: Resolve brand+locale context for persistence
    const brandId = await resolveBrandIdForPersist(request, session);
    const localeId = await resolveLocaleIdForPersist(request, brandId);

    // 🔧 STEP 1: AI GENERATE (via Go engine hub)
    let aiResult;
    try {
      aiResult = await callGoEngine(data);
    } catch (error: any) {
      console.error('[AI-GENERATE] Go engine call failed:', error.message);
      
      // If Go engine fails, return error (don't fallback to direct OpenAI)
      return NextResponse.json(
        {
          error: 'AI generation failed',
          message: error.message || 'Failed to generate content',
          status: 'FAILED',
        },
        { status: 500 }
      );
    }

    if (!aiResult || aiResult.status === 'FAILED' || aiResult.status === 'FAILED_VALIDATION') {
      return NextResponse.json(
        {
          error: 'AI generation failed',
          message: aiResult.error || 'Content generation failed',
          status: aiResult.status || 'FAILED',
        },
        { status: 400 }
      );
    }

    // Extract content from Go engine response
    const rawContent = aiResult.content || aiResult;
    const title = rawContent.title || rawContent.Title || '';
    const bodyContent = rawContent.body || rawContent.Body || '';
    const metaTitle = rawContent.metaTitle || rawContent.MetaTitle || title;
    const metaDescription = rawContent.metaDesc || rawContent.MetaDesc || '';

    // 🔧 STEP 2: NORMALIZER (deterministik - memaksa patuh)
    console.log('[AI-GENERATE] Applying normalizer...');
    const normalized = normalizeContent({
      title,
      body: bodyContent,
      metaTitle,
      metaDescription,
    });

    // 🔧 STEP 3: VALIDATOR (SEO & kualitas)
    console.log('[AI-GENERATE] Running validator...');
    const validation = validateContent({
      title: normalized.title,
      body: normalized.body,
      metaTitle: normalized.metaTitle,
      metaDescription: normalized.metaDescription,
    });

    if (!validation.valid) {
      console.error('[AI-GENERATE] Validation failed:', validation.errors);
      return NextResponse.json(
        {
          error: 'Content validation failed',
          message: 'Generated content did not pass quality checks',
          validationErrors: validation.errors,
          status: 'FAILED_VALIDATION',
        },
        { status: 400 }
      );
    }

    // 🔧 STEP 4: PERSIST (Save to database)
    console.log('[AI-GENERATE] Saving to database...');
    const savedContent = await persistContent({
      type: data.type,
      title: normalized.title,
      body: normalized.body,
      excerpt: metaDescription.substring(0, 200) || normalized.title,
      seo: {
        title: normalized.metaTitle || normalized.title,
        description: metaDescription || normalized.title.substring(0, 160),
        keywords: extractKeywords(normalized.title, normalized.body),
      },
      categoryId: data.categoryId,
      source: 'ai',
      brandId,
      localeId,
    });

    const duration = Date.now() - startTime;
    console.log(`[AI-GENERATE] Success: ${data.type} created in ${duration}ms, id=${savedContent.id}`);

    // 📊 LOGGING
    await logGeneration({
      type: data.type,
      topic: data.topic,
      contentId: savedContent.id,
      duration,
      status: 'success',
    });

    return NextResponse.json({
      success: true,
      content: savedContent,
      status: 'DRAFT',
      message: 'Content generated and saved as draft',
    });
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error('[AI-GENERATE] Error:', error);

    // Log error
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Invalid input',
          issues: error.issues,
          status: 'FAILED',
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? error.message : 'An error occurred',
        status: 'FAILED',
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
  // For FASE 3, we use DERIVATIVE as default (can be extended later)
  const contentType = 'DERIVATIVE';
  
  // Generate a simple outline from topic
  const outline = generateSimpleOutline(data.topic);

  const requestBody = {
    contentType,
    category: data.categoryId || 'K1', // Default category
    outline,
    language: data.language || 'id',
  };

  console.log(`[AI-GENERATE] Calling Go engine: ${ENGINE_HUB_URL}/api/engine/ai/generate`);

  const response = await fetch(`${ENGINE_HUB_URL}/api/engine/ai/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
    // Timeout: 5 minutes for AI generation
    signal: AbortSignal.timeout(5 * 60 * 1000),
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
}) {
  const slug = normalizeSlug(data.title);

  // Check if slug exists
  if (data.type === 'blog') {
    // Use BlogPost model (matches frontend and admin)
    // slug is not unique alone, need brandId
    const existing = await prisma.blogPost.findFirst({
      where: { 
        slug,
        brandId: data.brandId,
      },
    });

    if (existing) {
      // Append timestamp to make unique
      const uniqueSlug = `${slug}-${Date.now()}`;
      return await prisma.blogPost.create({
        data: {
          title: data.title,
          slug: uniqueSlug,
          brandId: data.brandId, // Required field
          excerpt: data.excerpt,
          content: data.body,
          status: 'DRAFT',
          seoTitle: data.seo.title,
          seoDescription: data.seo.description,
          seoKeywords: data.seo.keywords.join(', '),
          categoryId: data.categoryId,
        },
      });
    }

    return await prisma.blogPost.create({
      data: {
        title: data.title,
        slug,
        brandId: data.brandId, // Required field
        excerpt: data.excerpt,
        content: data.body,
        status: 'DRAFT',
        seoTitle: data.seo.title,
        seoDescription: data.seo.description,
        seoKeywords: data.seo.keywords.join(', '),
        categoryId: data.categoryId,
      },
    });
  } else {
    // Product type - categoryId is required
    if (!data.categoryId) {
      // Try to get first available category
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

    if (existing) {
      const uniqueSlug = `${slug}-${Date.now()}`;
      return await prisma.product.create({
        data: {
          name: data.title,
          slug: uniqueSlug,
          brandId: data.brandId,
          localeId: data.localeId,
          description: data.body,
          shortDescription: data.excerpt,
          price: 0, // Default price, should be set manually
          stock: 0,
          unit: 'pcs',
          categoryId: data.categoryId,
          status: 'DRAFT',
          metaTitle: data.seo.title,
          metaDescription: data.seo.description,
          metaKeywords: JSON.stringify(data.seo.keywords),
          isActive: false,
        },
      });
    }

    return await prisma.product.create({
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
        status: 'DRAFT',
        metaTitle: data.seo.title,
        metaDescription: data.seo.description,
        metaKeywords: JSON.stringify(data.seo.keywords),
        isActive: false,
      },
    });
  }
}

/**
 * Extract keywords from title and body
 */
function extractKeywords(title: string, body: string): string[] {
  const keywords: string[] = [];
  
  // Add title words (max 3)
  const titleWords = title
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 3)
    .slice(0, 3);
  keywords.push(...titleWords);

  // Add common words from body (max 5)
  const bodyWords = body
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 4)
    .filter((w, i, arr) => arr.indexOf(w) === i) // unique
    .slice(0, 5);
  keywords.push(...bodyWords);

  return keywords.slice(0, 8); // Max 8 keywords
}

/**
 * Log generation event
 */
async function logGeneration(data: {
  type: string;
  topic: string;
  contentId: string;
  duration: number;
  status: string;
}) {
  try {
    // Log to console (server-side)
    console.log(`[AI-GENERATE-LOG] ${data.status}: ${data.type} | topic=${data.topic} | id=${data.contentId} | duration=${data.duration}ms`);
    
    // Optionally save to database log table if exists
    // await prisma.aIContentGenerationLog.create({ ... });
  } catch (error) {
    // Don't fail if logging fails
    console.error('[AI-GENERATE-LOG] Failed to log:', error);
  }
}
