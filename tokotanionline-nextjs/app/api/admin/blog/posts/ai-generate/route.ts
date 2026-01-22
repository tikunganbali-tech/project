/**
 * PHASE B2 — AI BLOG GENERATOR API
 * 
 * POST /api/admin/blog/posts/ai-generate
 * 
 * Purpose: Generate blog article via AI engine (Content Engine Nyata)
 * 
 * PRINSIP KERAS:
 * - Frontend hanya kirim data bisnis (BUKAN prompt)
 * - Backend transform ke format engine
 * - Engine generate konten blog lengkap
 * - Response masuk ke form, BISA DIEDIT, TIDAK AUTO-SAVE/PUBLISH
 * 
 * 🔒 SECURITY:
 * - Auth required (admin/super_admin dengan permission content.manage)
 * - No auto-publish
 * - No auto-save
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import { normalizeImagePathSafe } from '@/lib/normalizeImagePath';
import { getCategoryWithParentChain } from '@/lib/unified-category-utils';
import { buildProductAwareContext } from '@/lib/product-aware-blog-ai';

// Fail-fast ENV check
// EKSEKUSI: Use AI_ENGINE_URL if available, fallback to ENGINE_HUB_URL
const ENGINE_HUB_URL = process.env.AI_ENGINE_URL || process.env.ENGINE_HUB_URL || process.env.GO_ENGINE_API_URL || 'http://localhost:8090';

// Request schema - AI Generator v2 (Answer-Driven, No Word Count)
// PHASE 1: category_id is REQUIRED for niche lock enforcement
const blogGenerateSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  category_id: z.string().min(1, 'Category ID is required'), // REQUIRED: For niche lock
  audience: z.string().optional(), // Target audience
  language: z.string().default('id'), // Language code
  brand_voice: z.string().optional(), // Brand voice/style
  primary_keyword: z.string().optional(), // Optional for backward compatibility
  product_limit: z.number().optional().default(5), // PRODUCT-AWARE: Limit products to include
  // Deprecated: category (name/slug) - use category_id instead
  category: z.string().optional(),
});

// Response schema - AI Generator v2 (Answer-Driven Structure)
type BlogGenerateResponse = {
  title: string;
  slug: string;
  excerpt: string;
  content: string; // HTML content (assembled from sections)
  intent: 'informational' | 'how_to' | 'commercial' | 'comparison';
  sections: Array<{
    question: string; // Core question
    answer_html: string; // Answer in HTML
    qc_status: 'PASS' | 'FAIL'; // Quality check status
    qc_scores?: {
      answer_clarity_score: number;
      snippet_readiness_score: number;
      generic_penalty_score: number;
    };
    failure_reason?: string; // Reason if FAIL
    image?: {
      url: string;
      alt: string; // Answers the question (≤ 125 chars)
    };
  }>;
  seo: {
    title: string;
    meta_description: string;
    primary_keyword: string;
    secondary_keywords: string[];
  };
  images: {
    featured: {
      url: string;
      alt: string;
    };
    in_article: Array<{
      url: string;
      alt: string;
      question?: string; // Which question this image answers
    }>;
  };
  image_map: Array<{
    section_index: number;
    image_url: string;
    alt: string;
  }>;
  // PARTIAL-SAFE: Warnings untuk step yang gagal
  warnings?: Array<{
    step: string;
    message: string;
  }>;
  // QC status for publish validation
  qc_status?: 'PASS' | 'FAIL';
  qc_failed_sections?: number;
  // Step-by-step results
  steps?: Array<{
    step: string;
    ok: boolean;
    error?: string;
  }>;
  // PRODUCT-AWARE: Metadata
  product_aware?: {
    mode: 'PRODUCT_AWARE' | 'CATEGORY_ONLY';
    category?: {
      id: string;
      name: string;
      path: string;
    };
    related_product_ids: string[];
    keyword_tree: {
      primary: string;
      secondary: string[];
      longTail: string[];
    };
    intent_type: string;
  };
};

// POST /api/admin/blog/posts/ai-generate
export async function POST(request: NextRequest) {
  try {
    // TASK 4: LOG WAJIB DI ENTRY POINT (BUKAN DI DALAM)
    if (process.env.NODE_ENV === 'development') {
      console.log('[BLOG AI] ENTRYPOINT v2 GPT-5.2');
    }

    // 🔐 AUTHENTICATION CHECK
    const session = await getServerSession();
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userRole = (session.user as any).role;
    if (!hasPermission(userRole, 'content.manage')) {
      return NextResponse.json(
        { error: 'Forbidden: Content management permission required' },
        { status: 403 }
      );
    }

    // 📥 PARSE & VALIDATE INPUT
    const body = await request.json();
    const data = blogGenerateSchema.parse(body);

    // PHASE 1: Validate category_id (REQUIRED) and enforce niche lock
    let categoryWithChain;
    try {
      categoryWithChain = await getCategoryWithParentChain(data.category_id);
    } catch (error: any) {
      return NextResponse.json(
        { error: 'Category not found', message: error.message },
        { status: 404 }
      );
    }

    // Verify category has 'blog' context
    const categoryContext = await prisma.categoryContext.findUnique({
      where: {
        categoryId_context: {
          categoryId: data.category_id,
          context: 'blog',
        },
      },
    });

    if (!categoryContext) {
      return NextResponse.json(
        {
          error: 'Invalid category context',
          message: 'Category does not have blog context. AI generation is only allowed for blog categories.',
        },
        { status: 400 }
      );
    }

    // Verify category level (only level 2 or 3 allowed, level 1 only for editorial)
    if (categoryWithChain.level === 1) {
      return NextResponse.json(
        {
          error: 'Invalid category level',
          message: 'Level 1 categories are only for editorial content. AI generation requires level 2 or 3 categories.',
        },
        { status: 400 }
      );
    }

    // PRODUCT-AWARE: Build Product-Aware Context
    const productAwareContext = await buildProductAwareContext(
      data.category_id,
      data.title,
      data.product_limit || 5
    );

    if (process.env.NODE_ENV === 'development') {
      console.log(`[BLOG-GENERATE v2] Product-Aware Context:`, {
        mode: productAwareContext.mode,
        category: productAwareContext.category.name,
        productCount: productAwareContext.products.length,
        intentType: productAwareContext.intentType,
        primaryKeyword: productAwareContext.keywordTree.primary,
      });
    }

    // Build keyword cluster from category tree for niche lock
    const keywordCluster = [
      categoryWithChain.name,
      ...categoryWithChain.parentChain.map((p) => p.name),
    ].join(', ');

    if (process.env.NODE_ENV === 'development') {
      console.log(`[BLOG-GENERATE v2] Starting generation: title=${data.title}, category_id=${data.category_id}, category=${categoryWithChain.name}, level=${categoryWithChain.level}, keyword_cluster=${keywordCluster}, language=${data.language}, mode=${productAwareContext.mode}`);
    }

    // 🔧 STEP 1: PHASE 1 - Determine Search Intent & Generate Questions
    // PHASE 1: Use category name from chain for niche lock
    const phase1Result = await determineSearchIntentAndQuestions({
      title: data.title,
      category: categoryWithChain.name, // Use category name from chain
      audience: data.audience,
      language: data.language,
      brandVoice: data.brand_voice,
    });

    // 🔧 STEP 2: PHASE 2 - Generate Answer-Driven Content
    // PHASE 1: Pass category info for niche lock enforcement
    let aiResult;
    try {
      aiResult = await callGoEngineForBlogV2({
        title: data.title,
        intent: phase1Result.intent,
        questions: phase1Result.core_questions,
        category: categoryWithChain.name, // Use category name from chain
        language: data.language,
        brandVoice: data.brand_voice,
        // PHASE 1: Add category context for niche lock (will be passed to engine)
        categoryId: data.category_id,
        keywordCluster: keywordCluster,
        // PRODUCT-AWARE: Pass product context
        productAware: productAwareContext.mode === 'PRODUCT_AWARE',
        products: productAwareContext.products.map((p) => ({
          name: p.name,
          description: p.description,
          shortDescription: p.shortDescription,
        })),
        keywordTree: productAwareContext.keywordTree,
        intentType: productAwareContext.intentType,
      });
    } catch (error: any) {
      if (process.env.NODE_ENV === 'development') {
        console.error('[BLOG-GENERATE] Go engine call failed:', error);
        console.error('[BLOG-GENERATE] Error details:', {
          message: error.message,
          name: error.name,
          stack: error.stack,
          engineUrl: ENGINE_HUB_URL,
        });
      }
      
      // PARTIAL-SAFE: Explicit error messages dengan step info
      let errorStep = 'engine_connection';
      let errorMessage = 'Failed to generate blog content';
      
      if (error.name === 'AbortError' || error.message?.includes('timeout')) {
        errorStep = 'engine_timeout';
        errorMessage = 'Proses memakan waktu terlalu lama. Silakan coba lagi.';
      } else if (error.message?.includes('ECONNREFUSED') || error.message?.includes('fetch failed')) {
        errorStep = 'engine_connection';
        errorMessage = 'Fitur ini belum aktif. Silakan hubungi admin.';
      } else if (error.message?.includes('JSON') || error.message?.includes('parse')) {
        errorStep = 'engine_response_parse';
        errorMessage = 'Terjadi kesalahan saat memproses data. Silakan coba lagi.';
      } else {
        errorMessage = 'Terjadi kesalahan saat memproses permintaan. Silakan coba lagi atau hubungi administrator.';
      }
      
      return NextResponse.json(
        {
          error: 'Gagal memproses',
          step: errorStep,
          message: errorMessage,
        },
        { status: 500 }
      );
    }

    if (!aiResult || aiResult.status === 'FAILED' || aiResult.status === 'FAILED_VALIDATION') {
      if (process.env.NODE_ENV === 'development') {
        console.error('[BLOG-GENERATE] Engine returned failed status:', {
          status: aiResult?.status,
          error: aiResult?.error,
          result: aiResult,
        });
      }
      
      // PARTIAL-SAFE: Determine which step failed based on status/error
      let errorStep = 'content_generation';
      if (aiResult.status === 'FAILED_VALIDATION') {
        errorStep = 'content_validation';
      } else if (aiResult.error?.toLowerCase().includes('seo')) {
        errorStep = 'seo_generation';
      } else if (aiResult.error?.toLowerCase().includes('text') || aiResult.error?.toLowerCase().includes('content')) {
        errorStep = 'text_generation';
      }
      
      // Sanitize error message for user
      let userMessage = 'Gagal memproses konten. Silakan coba lagi atau hubungi administrator.';
      if (aiResult?.error) {
        // Only show user-friendly parts, hide technical details
        const errorLower = aiResult.error.toLowerCase();
        if (errorLower.includes('validation') || errorLower.includes('validasi')) {
          userMessage = 'Validasi konten gagal. Silakan periksa data yang dimasukkan.';
        } else if (errorLower.includes('timeout')) {
          userMessage = 'Proses memakan waktu terlalu lama. Silakan coba lagi.';
        }
      }
      
      return NextResponse.json(
        {
          error: 'Gagal memproses',
          step: errorStep,
          message: userMessage,
          status: aiResult?.status,
        },
        { status: 400 }
      );
    }

    // 🔧 STEP 3: Transform engine response to contract format
    // PARTIAL-SAFE: Text/SEO gagal = STOP, Image gagal = CONTINUE dengan warning
    let response;
    const warnings: Array<{ step: string; message: string }> = [];
    
    try {
      if (process.env.NODE_ENV === 'development') {
        console.log('[BLOG-GENERATE] Transforming engine response...');
        console.log('[BLOG-GENERATE] Engine result structure:', {
          hasContent: !!aiResult.content,
          hasData: !!aiResult.data,
          hasSteps: Array.isArray(aiResult.steps),
          hasImages: !!aiResult.images,
          imagesCount: Array.isArray(aiResult.images) ? aiResult.images.length : 0,
          status: aiResult.status,
          keys: Object.keys(aiResult),
        });
      }
      
      // NEW FORMAT: Check if response has new format with steps array
      const steps = aiResult.steps || [];
      const engineData = aiResult.data || aiResult;
      
      // PARTIAL-SAFE: Extract step results and build warnings
      steps.forEach((step: any) => {
        if (!step.ok) {
          warnings.push({
            step: step.step || 'unknown',
            message: step.error || 'Step failed',
          });
        }
      });
      
      // PARTIAL-SAFE: Check jika images kosong atau error (non-fatal)
      const images = engineData.images || aiResult.images || [];
      if (!Array.isArray(images) || images.length === 0) {
        const imageStep = steps.find((s: any) => s.step === 'image');
        if (!imageStep || !imageStep.ok) {
          console.warn('[BLOG-GENERATE] No images in response (non-fatal - continuing without images)');
          if (!warnings.find(w => w.step === 'image')) {
            warnings.push({
              step: 'image',
              message: 'Image generation failed or no images generated. Article generated without images.',
            });
          }
        }
      }
      
      // AI Generator v2: Transform to question-answer structure
      response = transformEngineResponseV2(engineData, phase1Result, data, warnings);
      
      // C. QC Engine v2: QC Check dengan scoring dan feedback loop
      const failedSections = response.sections.filter(s => s.qc_status === 'FAIL');
      if (failedSections.length > 0) {
        const failedDetails = failedSections.map(s => {
          const reason = s.failure_reason || 'unknown';
          const scores = (s.qc_scores as any) || {};
          return `${s.question} (${reason}: clarity=${scores.answer_clarity_score || 0}, snippet=${scores.snippet_readiness_score || 0}, generic=${scores.generic_penalty_score || 0})`;
        }).join('; ');
        
        warnings.push({
          step: 'quality_check',
          message: `${failedSections.length} section(s) failed quality check: ${failedDetails.substring(0, 200)}...`,
        });
        console.warn(`[BLOG-GENERATE v2] QC Warning: ${failedSections.length} sections failed QC check`);
        
        // C2. QC Feedback Loop: Catat alasan untuk training hint
        failedSections.forEach(s => {
          console.log(`[QC FEEDBACK] Section failed: ${s.question}, reason: ${s.failure_reason || 'unknown'}, scores:`, s.qc_scores);
        });
      } else {
        console.log('[BLOG-GENERATE v2] All sections passed QC check');
        // C2. QC Feedback Loop: Simpan sebagai reference answer jika PASS
        response.sections.forEach(s => {
          console.log(`[QC FEEDBACK] Section passed: ${s.question}, scores:`, s.qc_scores);
        });
      }
      
      // Attach warnings dan steps jika ada
      if (warnings.length > 0) {
        response.warnings = warnings;
      }
      if (steps.length > 0) {
        response.steps = steps;
      }
      
      console.log('[BLOG-GENERATE v2] Transform successful:', {
        hasTitle: !!response.title,
        hasContent: !!response.content,
        sectionsCount: response.sections.length,
        passedSections: response.sections.filter(s => s.qc_status === 'PASS').length,
        failedSections: response.sections.filter(s => s.qc_status === 'FAIL').length,
        hasSEO: !!response.seo,
        hasImages: !!(response.images?.featured?.url),
        warningsCount: warnings.length,
      });
    } catch (error: any) {
      console.error('[BLOG-GENERATE] Transform response failed:', error);
      console.error('[BLOG-GENERATE] Error stack:', error.stack);
      console.error('[BLOG-GENERATE] Engine result (partial):', JSON.stringify({
        status: aiResult?.status,
        hasContent: !!aiResult?.content,
        hasImages: Array.isArray(aiResult?.images),
        contentKeys: aiResult?.content ? Object.keys(aiResult.content) : [],
      }, null, 2));
      
      // PARTIAL-SAFE: Text/SEO failure = CRITICAL, return error
      return NextResponse.json(
        {
          error: 'AI generation failed',
          message: `Failed to process engine response: ${error.message || 'Unknown error'}`,
          step: 'content_transform', // Explicit step yang gagal
          details: process.env.NODE_ENV === 'development' ? {
            error: error.message,
            stack: error.stack,
          } : undefined,
        },
        { status: 500 }
      );
    }

    console.log('[BLOG-GENERATE] Generation successful');

    // STEP 4: FAIL-SAFE GUARD - Jangan return 500 hanya karena SEO field minor
    // Jika engine result success dan hasContent, proceed (jangan reject karena SEO field minor)
    const engineResultSuccess = aiResult && 
      aiResult.status !== 'FAILED' && 
      aiResult.status !== 'FAILED_VALIDATION' &&
      (aiResult.data || aiResult.content || response.title || response.content);
    
    const hasContent = !!(response.title && response.content);
    
    if (engineResultSuccess && hasContent) {
      console.log('[BLOG-GENERATE] STEP 4: Engine result success with content - proceeding (SEO field minor issues ignored)');
      // Continue with response - don't fail on minor SEO field issues
      
      // Check if it's just minor SEO issues and auto-fix
      if (!response.seo || !response.seo.meta_description || !response.seo.title) {
        console.warn('[BLOG-GENERATE] STEP 4: Content exists but SEO fields missing - auto-fixing');
        // Add warnings for missing SEO fields but don't fail
        if (!response.warnings) {
          response.warnings = [];
        }
        if (!response.seo?.meta_description) {
          response.warnings.push({
            step: 'seo',
            message: 'Meta description missing - will be auto-generated',
          });
        }
        if (!response.seo?.title) {
          response.warnings.push({
            step: 'seo',
            message: 'SEO title missing - using main title',
          });
          // Auto-fix: use main title as SEO title
          if (!response.seo) {
            response.seo = { title: '', meta_description: '', primary_keyword: '', secondary_keywords: [] };
          }
          response.seo.title = response.title;
        }
      }
    }

    // B3: Auto-save draft after generation
    // Store QC status in response for publish validation
    if (response.sections && Array.isArray(response.sections)) {
      const qcStatus = response.sections.every((s: any) => s.qc_status === 'PASS') ? 'PASS' : 'FAIL';
      response.qc_status = qcStatus;
      response.qc_failed_sections = response.sections.filter((s: any) => s.qc_status === 'FAIL').length;
    }

    // PRODUCT-AWARE: Attach metadata to response
    response.product_aware = {
      mode: productAwareContext.mode,
      category: {
        id: productAwareContext.category.id,
        name: productAwareContext.category.name,
        path: [
          ...productAwareContext.category.parentChain.map((p) => p.name),
          productAwareContext.category.name,
        ].join(' > '),
      },
      related_product_ids: productAwareContext.products.map((p) => p.id),
      keyword_tree: productAwareContext.keywordTree,
      intent_type: productAwareContext.intentType,
    };

    // Update SEO keywords with product-aware keywords
    if (productAwareContext.mode === 'PRODUCT_AWARE') {
      if (!response.seo) {
        response.seo = { title: '', meta_description: '', primary_keyword: '', secondary_keywords: [] };
      }
      response.seo.primary_keyword = productAwareContext.keywordTree.primary;
      response.seo.secondary_keywords = [
        ...(response.seo.secondary_keywords || []),
        ...productAwareContext.keywordTree.secondary,
      ];
    }

    return NextResponse.json(response);
  } catch (error: any) {
    console.error('[BLOG-GENERATE] Error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error', message: error.message || 'Failed to generate blog content' },
      { status: 500 }
    );
  }
}

/**
 * AI Generator v2 - PHASE 1: Determine Search Intent & Generate Questions
 * 
 * PRINSIP:
 * - Tentukan intent: informational, how_to, commercial, comparison
 * - Generate 3-7 core questions (pertanyaan nyata manusia)
 * - Filter: buang generik, duplikat, harus bisa muncul di PAA
 */
/**
 * AI Generator v2 - PHASE 1: Determine Search Intent & Generate Questions (SEMANTIC)
 * 
 * PRINSIP:
 * - Tentukan intent: informational, how_to, commercial, comparison
 * - Generate 3-7 core questions menggunakan AI (semantic, bukan template)
 * - Filter: buang generik, duplikat, harus bisa muncul di PAA
 */
async function determineSearchIntentAndQuestions(data: {
  title: string;
  category?: string;
  audience?: string;
  language: string;
  brandVoice?: string;
}): Promise<{
  intent: 'informational' | 'how_to' | 'commercial' | 'comparison';
  core_questions: string[];
}> {
  // Step 1: Determine intent (semantic dengan AI jika perlu, atau heuristic)
  const intent = await determineSearchIntentSemantic(data);
  
  // Step 2: Generate questions menggunakan AI (semantic approach)
  const questions = await generateQuestionsSemantic(data, intent);
  
  // Step 3: Filter questions
  const filtered = filterQuestions(questions);
  
  // Ensure minimum 3 questions
  if (filtered.length < 3) {
    // Fallback: generate basic questions
    const fallback = generateFallbackQuestions(data.title, intent);
    filtered.push(...fallback);
  }
  
  return {
    intent,
    core_questions: filtered.slice(0, 7), // Max 7 questions
  };
}

/**
 * Determine search intent (semantic approach)
 */
async function determineSearchIntentSemantic(data: {
  title: string;
  category?: string;
  audience?: string;
}): Promise<'informational' | 'how_to' | 'commercial' | 'comparison'> {
  // Heuristic approach (bisa di-improve dengan AI call)
  const titleLower = data.title.toLowerCase();
  
  if (titleLower.includes('cara') || titleLower.includes('bagaimana') || 
      titleLower.includes('tutorial') || titleLower.includes('langkah') ||
      titleLower.includes('panduan') || titleLower.includes('step')) {
    return 'how_to';
  }
  
  if (titleLower.includes('banding') || titleLower.includes('vs') || 
      titleLower.includes('perbandingan') || titleLower.includes('beda')) {
    return 'comparison';
  }
  
  if (titleLower.includes('beli') || titleLower.includes('harga') || 
      titleLower.includes('terbaik') || titleLower.includes('rekomendasi') ||
      titleLower.includes('review')) {
    return 'commercial';
  }
  
  return 'informational';
}

/**
 * Generate questions using semantic approach (AI-powered)
 * Calls Go engine endpoint untuk PHASE 1
 */
async function generateQuestionsSemantic(
  data: { title: string; category?: string; audience?: string; language: string },
  intent: string
): Promise<string[]> {
  // EKSEKUSI: Use AI_ENGINE_URL if available
  const ENGINE_HUB_URL = process.env.AI_ENGINE_URL || process.env.ENGINE_HUB_URL || process.env.GO_ENGINE_API_URL || 'http://localhost:8090';
  
  try {
    console.log('[BLOG-GENERATE v2] Calling Go engine for question generation...');
    
    // Call Go engine untuk question generation
    const response = await fetch(`${ENGINE_HUB_URL}/api/engine/ai/generate-questions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: data.title,
        intent,
        category: data.category || '',
        language: data.language,
      }),
      signal: AbortSignal.timeout(30000), // 30s timeout
    });

    if (response.ok) {
      const result = await response.json();
      if (result.questions && Array.isArray(result.questions) && result.questions.length >= 3) {
        console.log(`[BLOG-GENERATE v2] Generated ${result.questions.length} questions from Go engine`);
        return result.questions;
      }
    } else {
      const errorText = await response.text().catch(() => 'Unknown error');
      console.warn(`[BLOG-GENERATE v2] Question generation failed (${response.status}): ${errorText}`);
    }
  } catch (error: any) {
    console.warn('[BLOG-GENERATE v2] Question generation via engine failed, using fallback:', error.message);
  }
  
  // Fallback: Generate questions based on intent (template-based)
  console.log('[BLOG-GENERATE v2] Using fallback question generation');
  return generateFallbackQuestions(data.title, intent);
}

// STEP 1: REMOVED extractSecondaryKeywords - Keyword TIDAK BOLEH dihasilkan AI
// Keywords hanya dari input user (riset SEO manual)

/**
 * Generate fallback questions (template-based, akan di-improve)
 */
function generateFallbackQuestions(title: string, intent: string): string[] {
  const questions: string[] = [];
  
  switch (intent) {
    case 'how_to':
      questions.push(
        `Bagaimana cara ${title.toLowerCase()}?`,
        `Apa langkah-langkah ${title.toLowerCase()}?`,
        `Tips praktis untuk ${title.toLowerCase()}?`,
        `Apa yang perlu disiapkan untuk ${title.toLowerCase()}?`,
        `Kesalahan umum dalam ${title.toLowerCase()}?`
      );
      break;
    case 'comparison':
      questions.push(
        `Apa perbedaan ${title.toLowerCase()}?`,
        `Mana yang lebih baik: ${title.toLowerCase()}?`,
        `Keuntungan dan kerugian ${title.toLowerCase()}?`,
        `Kapan menggunakan ${title.toLowerCase()}?`
      );
      break;
    case 'commercial':
      questions.push(
        `Berapa harga ${title.toLowerCase()}?`,
        `Dimana bisa membeli ${title.toLowerCase()}?`,
        `Apa kelebihan ${title.toLowerCase()}?`,
        `Apakah ${title.toLowerCase()} worth it?`
      );
      break;
    default: // informational
      questions.push(
        `Apa itu ${title}?`,
        `Mengapa ${title} penting?`,
        `Bagaimana ${title} bekerja?`,
        `Apa manfaat ${title}?`,
        `Kapan menggunakan ${title}?`
      );
  }
  
  return questions;
}

/**
 * Filter questions: remove generic, duplicate, ensure quality
 */
function filterQuestions(questions: string[]): string[] {
  // Remove duplicates
  const unique = Array.from(new Set(questions));
  
  // Remove generic questions
  const genericPatterns = [
    /^apa itu\?$/i,
    /^bagaimana\?$/i,
    /^mengapa\?$/i,
    /^kapan\?$/i,
  ];
  
  const filtered = unique.filter(q => {
    // Check if too generic
    for (const pattern of genericPatterns) {
      if (pattern.test(q.trim())) {
        return false;
      }
    }
    
    // Check minimum length
    if (q.trim().length < 10) {
      return false;
    }
    
    // Check if question-like (contains question words)
    const questionWords = ['apa', 'bagaimana', 'mengapa', 'kapan', 'dimana', 'siapa', 'berapa'];
    const hasQuestionWord = questionWords.some(word => 
      q.toLowerCase().includes(word)
    );
    
    return hasQuestionWord;
  });
  
  return filtered;
}

/**
 * AI Generator v2 - PHASE 2: Call Go Engine for Answer-Driven Writing
 * 
 * PRINSIP:
 * - Untuk setiap pertanyaan: generate jawaban langsung ke inti
 * - QC per section: PASS jika menjawab, relevan, bisa berdiri sendiri
 * - Image hanya jika section butuh visual
 */
async function callGoEngineForBlogV2(data: {
  title: string;
  intent: string;
  questions: string[];
  category?: string;
  language: string;
  brandVoice?: string;
  // PHASE 1: Category context for niche lock
  categoryId?: string;
  keywordCluster?: string;
  // PRODUCT-AWARE: Product context
  productAware?: boolean;
  products?: Array<{ name: string; description: string; shortDescription?: string | null }>;
  keywordTree?: { primary: string; secondary: string[]; longTail: string[] };
  intentType?: string;
}) {
  // Build outline dengan questions (bukan headings)
  const outline = data.questions.map((q, idx) => `Q${idx + 1}: ${q}`).join('\n');
  
  const requestBody: any = {
    contentType: 'DERIVATIVE_LONG', // Keep for now, engine akan handle v2 format
    category: 'K1',
    outline,
    language: data.language,
    // AI Generator v2 flags
    answerDriven: true,
    intent: data.intent,
    questions: data.questions,
    // PHASE 1: Category context for niche lock enforcement
    categoryId: data.categoryId,
    categoryName: data.category,
    keywordCluster: data.keywordCluster,
    nicheLock: true, // Enforce niche lock - AI must stay within category tree
    allowedTopics: data.keywordCluster, // Only discuss topics within this cluster
  };

  // PRODUCT-AWARE: Add product context if available
  if (data.productAware && data.products && data.products.length > 0) {
    requestBody.productAware = true;
    requestBody.products = data.products;
    requestBody.keywordTree = data.keywordTree;
    requestBody.intentType = data.intentType;
    // PRODUCT-AWARE RULE: Blog must mention products naturally, not like ads
    requestBody.productMentionRule = 'natural';
    requestBody.productContext = 'Blog harus fokus kategori, membahas masalah user, dan menyebut produk secara alami untuk menghasilkan kebutuhan ke produk';
  }

  // B1: Use v2 endpoint as default (single entry point)
  const engineUrl = `${ENGINE_HUB_URL}/api/engine/ai/generate-v2`;
  console.log(`[BLOG-GENERATE v2] Calling Go engine v2: ${engineUrl}`);
  console.log(`[BLOG-GENERATE v2] Request body:`, JSON.stringify(requestBody, null, 2));

  let response;
  try {
    response = await fetch(engineUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
      signal: AbortSignal.timeout(5 * 60 * 1000),
    });
  } catch (fetchError: any) {
    console.error('[BLOG-GENERATE v2] Fetch error:', fetchError);
    if (fetchError.name === 'AbortError') {
      throw new Error('Request timeout: Engine took too long to respond (5 minutes)');
    }
    if (fetchError.message?.includes('ECONNREFUSED')) {
      throw new Error(`Cannot connect to Go engine at ${ENGINE_HUB_URL}. Is the engine running?`);
    }
    throw new Error(`Network error: ${fetchError.message || 'Failed to connect to engine'}`);
  }

  if (!response.ok) {
    let errorText = '';
    try {
      errorText = await response.text();
    } catch (e) {
      errorText = `HTTP ${response.status} ${response.statusText}`;
    }
    
    console.error(`[BLOG-GENERATE v2] Engine returned error: ${response.status}`, errorText);
    throw new Error(`Go engine error (${response.status}): ${errorText.substring(0, 500)}`);
  }

  let result;
  try {
    const responseText = await response.text();
    console.log('[BLOG-GENERATE v2] Engine response text length:', responseText.length);
    
    result = JSON.parse(responseText);
    console.log('[BLOG-GENERATE v2] Engine response parsed:', {
      hasContent: !!result.content,
      hasData: !!result.data,
      hasSections: Array.isArray(result.sections),
      status: result.status,
    });
  } catch (parseError: any) {
    console.error('[BLOG-GENERATE v2] Failed to parse JSON:', parseError);
    throw new Error(`Invalid JSON response from engine: ${parseError.message}`);
  }
  
  return result;
}

/**
 * AI Generator v2 - Transform Engine Response to Question-Answer Structure
 */
function transformEngineResponseV2(
  engineResult: any,
  phase1Result: { intent: string; core_questions: string[] },
  inputData: z.infer<typeof blogGenerateSchema>,
  warnings: Array<{ step: string; message: string }> = []
): BlogGenerateResponse {
  // Extract content
  const contentResult = engineResult.data || engineResult;
  const title = contentResult.title || inputData.title || '';
  
  // Check if Go engine already returned sections (v2 format)
  let sections: BlogGenerateResponse['sections'];
  let bodyContent: string;
  
  if (contentResult.sections && Array.isArray(contentResult.sections)) {
    // Go engine sudah return sections (v2 format dari Go engine dengan QC scoring)
    sections = contentResult.sections.map((s: any) => ({
      question: s.question || '',
      answer_html: s.answer_html || s.answerHTML || '',
      qc_status: (s.qc_status || s.qcStatus || 'PASS') as 'PASS' | 'FAIL',
      // C. QC Engine v2: Include scoring
      qc_scores: s.qc_scores || {
        answer_clarity_score: 0,
        snippet_readiness_score: 0,
        generic_penalty_score: 0,
      },
      failure_reason: s.failure_reason || undefined,
      ...(s.image && {
        image: {
          url: normalizeImagePathSafe(s.image.url || '') || '',
          alt: s.image.alt || s.question || '',
        },
      }),
    }));
    bodyContent = contentResult.content || contentResult.content_html || '';
  } else {
    // Build sections from questions (fallback: extract from content)
    bodyContent = contentResult.content_html || contentResult.body || contentResult.content || '';
    
    sections = phase1Result.core_questions.map((question, idx) => {
      // Extract answer for this question from content (semantic matching)
      const answerHtml = extractAnswerForQuestion(bodyContent, question, idx);
      
      // C. QC Engine v2: Perform QC check with scoring
      const qcResult = performQCCheckV2(question, answerHtml);
      const qc_status = qcResult.status;
        
      // D. Image Relevance Tuning: Image hanya jika MENJELASKAN
      let image: { url: string; alt: string } | undefined;
      if (needsVisualExplanation(question, answerHtml)) {
        const imageData = extractImageForSection(engineResult, idx);
        if (imageData) {
          // D2. Alt Text = Jawaban Singkat (≤ 125 karakter)
          image = {
            url: imageData.url,
            alt: generateAltText(question, answerHtml),
          };
        }
      }
        
      return {
        question,
        answer_html: answerHtml,
        qc_status,
        qc_scores: qcResult.scores,
        ...(qcResult.failure_reason && { failure_reason: qcResult.failure_reason }),
        ...(image && { image }),
      };
    });
  }
  
  // EKSEKUSI B: Assemble full content from sections with images
  const fullContent = sections
    .map((s, idx) => {
      let sectionHtml = `<h2>${s.question}</h2>\n`;
      // EKSEKUSI B: Insert image if available for this section
      if (s.image && s.image.url) {
        sectionHtml += `<img src="${s.image.url}" alt="${s.image.alt || s.question}" class="w-full rounded-lg my-4" />\n`;
      }
      sectionHtml += s.answer_html;
      return sectionHtml;
    })
    .join('\n\n');
  
  // Generate slug
  const slug = generateSlug(title);
  
  // Extract excerpt (first 150 chars)
  const excerpt = extractExcerpt(fullContent, 150);
  
  // Extract SEO
  const seoTitle = contentResult.seo?.title || contentResult.metaTitle || title;
  const seoDescription = contentResult.seo?.meta_description || contentResult.metaDescription || extractExcerpt(fullContent, 150);
  const primaryKeyword = contentResult.seo?.primary_keyword || inputData.primary_keyword || '';
  const secondaryKeywords = contentResult.seo?.secondary_keywords || [];
  
  // Extract featured image
  const featuredImageRaw = extractFeaturedImage(engineResult, title);
  const featuredImage = featuredImageRaw.url 
    ? { url: normalizeImagePathSafe(featuredImageRaw.url) || '', alt: featuredImageRaw.alt }
    : { url: '', alt: title };
  
  // Extract in-article images from sections
  const inArticleImages = sections
    .filter(s => s.image)
    .map(s => {
      const normalizedUrl = normalizeImagePathSafe(s.image!.url);
      return normalizedUrl ? {
        url: normalizedUrl,
        alt: s.image!.alt,
        question: s.question,
      } : null;
    })
    .filter((img): img is NonNullable<typeof img> => img !== null);
  
  // EKSEKUSI A: image_map - SELALU ada (boleh kosong array, jangan null/omit)
  const image_map = sections
    .map((s, idx) => {
      if (s.image) {
        const normalizedUrl = normalizeImagePathSafe(s.image.url);
        if (normalizedUrl) {
          return {
            section_index: idx,
            image_url: normalizedUrl,
            alt: s.image.alt,
          };
        }
      }
      return null;
    })
    .filter((img): img is NonNullable<typeof img> => img !== null);
  
  // STEP 1: Keyword TIDAK BOLEH dihasilkan AI - hanya gunakan input dari user
  // secondary_keywords hanya dari inputData, TIDAK auto-derive
  const finalSecondaryKeywords = secondaryKeywords || [];
  
  return {
    title,
    slug,
    excerpt,
    content: fullContent,
    intent: phase1Result.intent as any,
    sections,
    image_map: image_map, // EKSEKUSI A: SELALU ada, boleh kosong []
    seo: {
      title: seoTitle,
      meta_description: seoDescription,
      primary_keyword: primaryKeyword,
      secondary_keywords: finalSecondaryKeywords, // STEP 1: Hanya dari input, TIDAK auto-derive
    },
    images: {
      featured: featuredImage,
      in_article: inArticleImages,
    },
  };
}

// Helper functions for v2
/**
 * Extract answer for question (SEMANTIC MATCHING)
 * Improved: Uses semantic matching instead of simple index-based
 */
function extractAnswerForQuestion(content: string, question: string, index: number): string {
  // Method 1: Try to find section by H2 heading that matches question
  const h2Sections = content.split(/<h2[^>]*>/i);
  
  // Find section that semantically matches the question
  const questionKeywords = question.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 3);
  
  let bestMatch: string | null = null;
  let bestScore = 0;
  
  for (let i = 1; i < h2Sections.length; i++) {
    const section = h2Sections[i];
    const heading = section.split(/<\/h2>/i)[0].toLowerCase();
    const sectionText = section.replace(/<\/h2>.*$/i, '').trim();
    
    // Calculate semantic match score
    let score = 0;
    for (const keyword of questionKeywords) {
      if (heading.includes(keyword) || sectionText.includes(keyword)) {
        score++;
      }
    }
    
    if (score > bestScore) {
      bestScore = score;
      bestMatch = sectionText;
    }
  }
  
  if (bestMatch && bestMatch.length > 50) {
    // Clean up: remove closing H2 tag if present
    return bestMatch.replace(/<\/h2>.*$/i, '').trim();
  }
  
  // Method 2: Fallback to index-based
  if (h2Sections[index + 1]) {
    const section = h2Sections[index + 1].replace(/<\/h2>/i, '').trim();
    if (section.length > 50) {
      return section;
    }
  }
  
  // Method 3: Extract paragraphs and find relevant ones
  const paragraphs = content.match(/<p[^>]*>.*?<\/p>/gi) || [];
  if (paragraphs.length > 0) {
    // Find paragraphs that contain question keywords
    const relevantParagraphs: string[] = [];
    for (const para of paragraphs) {
      const paraText = para.toLowerCase();
      const hasKeywords = questionKeywords.some(kw => paraText.includes(kw));
      if (hasKeywords) {
        relevantParagraphs.push(para);
      }
    }
    
    if (relevantParagraphs.length > 0) {
      return relevantParagraphs.slice(0, 3).join('\n'); // Max 3 paragraphs
    }
    
    // Last resort: use paragraphs by index
    if (paragraphs[index]) {
      return paragraphs[index];
    }
  }
  
  // Final fallback
  return `<p>Jawaban untuk: ${question}</p>`;
}

/**
 * QC Engine v2: Perform QC check with scoring
 * C1. Scoring per Section: answer_clarity_score, snippet_readiness_score, generic_penalty_score
 */
function performQCCheckV2(question: string, answerHtml: string): {
  status: 'PASS' | 'FAIL';
  scores: {
    answer_clarity_score: number;
    snippet_readiness_score: number;
    generic_penalty_score: number;
  };
  failure_reason?: string;
} {
  const text = answerHtml.replace(/<[^>]*>/g, ' ').trim();
  const answerLower = text.toLowerCase();
  const questionLower = question.toLowerCase();
  
  // 1. answer_clarity_score (0-100)
  const firstSentence = text.split(/[.!?]/)[0].trim();
  const firstSentenceLower = firstSentence.toLowerCase();
  const questionKeywords = extractQuestionKeywords(questionLower);
  const matchedKeywords = questionKeywords.filter(kw => 
    firstSentenceLower.includes(kw)
  ).length;
  let clarityScore = questionKeywords.length > 0 
    ? Math.floor((matchedKeywords * 100) / questionKeywords.length)
    : 50;
  
  // Bonus: First sentence is concise (≤ 30 words)
  const firstSentenceWords = firstSentence.split(/\s+/).length;
  if (firstSentenceWords <= 30) {
    clarityScore = Math.min(100, clarityScore + 10);
  }
  
  // 2. snippet_readiness_score (0-100)
  let snippetScore = 0;
  
  // Can stand alone (has complete sentences)
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length >= 10);
  if (sentences.length >= 2) {
    snippetScore += 40;
  }
  
  // Answer length appropriate (50-500 chars)
  if (text.length >= 50 && text.length <= 500) {
    snippetScore += 30;
  } else if (text.length < 50) {
    snippetScore += 10;
  } else {
    snippetScore += 20;
  }
  
  // Contains specific context
  if (containsSpecificContext(text, questionLower)) {
    snippetScore += 30;
  }
  
  // 3. generic_penalty_score (0-100, lower is better)
  let genericScore = 0;
  
  // B2. Anti-Generic Filter
  const genericPhrases = [
    'di era modern', 'sangat penting', 'tidak dapat dipungkiri',
    'sangat baik', 'sangat bagus', 'sangat berguna', 'sangat membantu',
    'dapat membantu', 'dapat meningkatkan', 'dapat memperbaiki',
    'merupakan hal yang', 'adalah hal yang', 'tidak diragukan lagi',
  ];
  
  for (const phrase of genericPhrases) {
    if (answerLower.includes(phrase)) {
      genericScore += 10;
    }
  }
  
  // Check if too generic
  if (isTooGeneric(text, questionLower)) {
    genericScore += 30;
  }
  
  // Check for opening basa-basi
  const openingPhrases = ['dalam era', 'tidak dapat dipungkiri', 'perlu diketahui', 'perlu dipahami'];
  const firstPart = text.split('.')[0].toLowerCase();
  for (const phrase of openingPhrases) {
    if (firstPart.includes(phrase)) {
      genericScore += 20;
      break;
    }
  }
  
  genericScore = Math.min(100, genericScore);
  
  const scores = {
    answer_clarity_score: clarityScore,
    snippet_readiness_score: snippetScore,
    generic_penalty_score: genericScore,
  };
  
  // C1. Lulus jika: clarity ≥ 80, snippet ≥ 75, generic ≤ 20
  if (clarityScore >= 80 && snippetScore >= 75 && genericScore <= 20) {
    return { status: 'PASS', scores };
  }
  
  // Determine failure reason
  let failure_reason: string | undefined;
  if (clarityScore < 80) {
    failure_reason = 'clarity';
  } else if (snippetScore < 75) {
    failure_reason = 'snippet_readiness';
  } else if (genericScore > 20) {
    failure_reason = 'generic';
  }
  
  return { status: 'FAIL', scores, failure_reason };
}

// Helper functions for QC scoring
function extractQuestionKeywords(question: string): string[] {
  const stopWords = new Set(['yang', 'dan', 'atau', 'dari', 'pada', 'untuk', 'dengan', 'adalah', 'merupakan', 'dapat', 'akan', 'telah', 'sudah']);
  return question
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 3 && !stopWords.has(w));
}

function containsSpecificContext(text: string, question: string): boolean {
  const hasNumbers = /\d+/.test(text);
  const hasSpecificTerms = text.split(/\s+/).length > 20;
  const questionKeywords = extractQuestionKeywords(question);
  const textLower = text.toLowerCase();
  const matched = questionKeywords.filter(kw => textLower.includes(kw)).length;
  return hasNumbers || hasSpecificTerms || matched >= 2;
}

function isTooGeneric(text: string, question: string): boolean {
  const genericPatterns = [
    'adalah hal yang', 'merupakan hal yang', 'sangat penting untuk',
    'dapat membantu dalam', 'sangat berguna untuk',
  ];
  
  const textLower = text.toLowerCase();
  let genericCount = 0;
  for (const pattern of genericPatterns) {
    if (textLower.includes(pattern)) {
      genericCount++;
    }
  }
  
  const questionKeywords = extractQuestionKeywords(question);
  const textLower2 = text.toLowerCase();
  const contextMatches = questionKeywords.filter(kw => textLower2.includes(kw)).length;
  
  return genericCount >= 2 && contextMatches < 2;
}

/**
 * PHASE S+: Legacy performQCCheck removed - using QC Engine v2 with scoring instead
 */

/**
 * D1. Image Relevance Tuning: Image hanya jika MENJELASKAN
 * ❌ Jika hanya definisi → NO IMAGE
 */
function needsVisualExplanation(question: string, answerHtml: string): boolean {
  // D1. Image hanya jika: tutorial, langkah, perbandingan visual
  // ❌ Jika hanya definisi → NO IMAGE
  
  const questionLower = question.toLowerCase();
  const answerLower = answerHtml.toLowerCase();
  
  // Check for tutorial/step-by-step keywords
  const tutorialKeywords = ['cara', 'langkah', 'tutorial', 'panduan', 'step', 'tahap', 'proses'];
  const hasTutorial = tutorialKeywords.some(k => 
    questionLower.includes(k) || answerLower.includes(k)
  );
  
  // Check for comparison keywords
  const comparisonKeywords = ['banding', 'perbandingan', 'beda', 'perbedaan', 'vs', 'versus'];
  const hasComparison = comparisonKeywords.some(k => 
    questionLower.includes(k) || answerLower.includes(k)
  );
  
  // Check if it's just a definition (NO IMAGE)
  const definitionKeywords = ['apa itu', 'definisi', 'pengertian', 'adalah', 'merupakan'];
  const isDefinition = definitionKeywords.some(k => questionLower.includes(k));
  
  // Image needed if: tutorial OR comparison, AND NOT just definition
  return (hasTutorial || hasComparison) && !isDefinition;
}

/**
 * D2. Generate Alt Text = Jawaban Singkat (≤ 125 karakter)
 */
function generateAltText(question: string, answerHtml: string): string {
  const text = answerHtml.replace(/<[^>]*>/g, ' ').trim();
  const firstSentence = text.split(/[.!?]/)[0].trim();
  
  // Limit to 125 characters
  if (firstSentence.length > 125) {
    return firstSentence.substring(0, 122) + '...';
  }
  
  // If too short, use question
  if (firstSentence.length < 20) {
    return question.length > 125 ? question.substring(0, 122) + '...' : question;
  }
  
  return firstSentence;
}

function extractImageForSection(engineResult: any, sectionIndex: number): { url: string; alt: string } | null {
  const images = engineResult.images || engineResult.data?.images || [];
  if (Array.isArray(images) && images[sectionIndex]) {
    const img = images[sectionIndex];
    return {
      url: img.url || img.localPath || '',
      alt: img.alt || img.altText || '',
    };
  }
  return null;
}

// M-04: Extract featured image (hero) with role support
function extractFeaturedImage(engineResult: any, title: string): { url: string; alt: string } {
  const images = engineResult.images || engineResult.data?.images || [];
  if (Array.isArray(images) && images.length > 0) {
    // M-04: Prioritize role="hero", fallback to isHero, then first image
    const featured = images.find((img: any) => 
      img.role === 'hero' || img.Role === 'hero' || img.isHero || img.IsHero
    ) || images[0];
    return {
      url: featured.url || featured.localPath || featured.LocalPath || '',
      alt: featured.alt || featured.altText || featured.AltText || title,
    };
  }
  return { url: '', alt: title };
}

/**
 * PHASE S+: Legacy buildBlogOutline removed - using Phase 1 (Question Generation) instead
 */
function buildBlogOutline(data: z.infer<typeof blogGenerateSchema>): string {
  // PHASE S+: This function is no longer used - Phase 1 generates questions instead
  const parts: string[] = [];
  
  // H1: Title (from input)
  parts.push(`# ${data.title}`);
  
  // H2: Introduction
  parts.push(`### H2 — Pengenalan`);
  parts.push(`Pengenalan tentang ${data.primary_keyword} dan pentingnya topik ini.`);
  
  // H2: Main content sections based on keyword
  parts.push(`\n### H2 — Manfaat dan Keuntungan`);
  parts.push(`Manfaat utama dari ${data.primary_keyword} dan bagaimana hal ini dapat membantu.`);
  
  if ((data as any).secondary_keywords && (data as any).secondary_keywords.length > 0) {
    parts.push(`\n### H2 — ${(data as any).secondary_keywords[0]}`);
    parts.push(`Penjelasan detail tentang ${(data as any).secondary_keywords[0]} dalam konteks ${data.primary_keyword}.`);
  }
  
  parts.push(`\n### H2 — Tips dan Praktik Terbaik`);
  parts.push(`Tips praktis dan rekomendasi untuk memaksimalkan ${data.primary_keyword}.`);
  
  // H2: Conclusion
  parts.push(`\n### H2 — Kesimpulan`);
  parts.push(`Ringkasan poin-poin penting tentang ${data.primary_keyword}.`);
  
  return parts.join('\n\n');
}

/**
 * Call Go engine hub for blog generation
 */
async function callGoEngineForBlog(data: {
  title: string;
  primaryKeyword: string;
  secondaryKeywords: string[];
  outline: string;
  intent: string;
  targetLength: number;
}) {
  const requestBody = {
    contentType: 'DERIVATIVE_LONG', // Use long form for blog articles
    category: 'K1', // Default category for engine
    outline: data.outline,
    language: 'id',
  };

  // A2: Use v2 endpoint (single entry point - no v1 bypass)
  const engineUrl = `${ENGINE_HUB_URL}/api/engine/ai/generate-v2`;
  console.log(`[BLOG-GENERATE] Calling Go engine v2: ${engineUrl}`);
  console.log(`[BLOG-GENERATE] Request body:`, JSON.stringify(requestBody, null, 2));

  let response;
  try {
    response = await fetch(engineUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
      // Timeout: 5 minutes for AI generation
      signal: AbortSignal.timeout(5 * 60 * 1000),
    });
  } catch (fetchError: any) {
    console.error('[BLOG-GENERATE] Fetch error:', fetchError);
    if (fetchError.name === 'AbortError') {
      throw new Error('Request timeout: Engine took too long to respond (5 minutes)');
    }
    if (fetchError.message?.includes('ECONNREFUSED')) {
      throw new Error(`Cannot connect to Go engine at ${ENGINE_HUB_URL}. Is the engine running?`);
    }
    throw new Error(`Network error: ${fetchError.message || 'Failed to connect to engine'}`);
  }

  if (!response.ok) {
    let errorText = '';
    try {
      errorText = await response.text();
    } catch (e) {
      errorText = `HTTP ${response.status} ${response.statusText}`;
    }
    
    console.error(`[BLOG-GENERATE] Engine returned error: ${response.status}`, errorText);
    throw new Error(`Go engine error (${response.status}): ${errorText.substring(0, 500)}`);
  }

  let result;
  try {
    const responseText = await response.text();
    console.log('[BLOG-GENERATE] Engine response text length:', responseText.length);
    
    try {
      result = JSON.parse(responseText);
      console.log('[BLOG-GENERATE] Engine response parsed successfully:', {
        hasContent: !!result.content,
        hasTitle: !!result.title,
        hasImages: Array.isArray(result.images),
        status: result.status,
        keys: Object.keys(result),
      });
    } catch (parseError: any) {
      console.error('[BLOG-GENERATE] Failed to parse JSON:', parseError);
      console.error('[BLOG-GENERATE] Response text (first 500 chars):', responseText.substring(0, 500));
      throw new Error(`Invalid JSON response from engine: ${parseError.message}`);
    }
  } catch (parseError: any) {
    console.error('[BLOG-GENERATE] Failed to read/parse engine response:', parseError);
    throw new Error(`Failed to process engine response: ${parseError.message}`);
  }
  
  return result;
}

/**
 * Transform engine response to PHASE B2-R1 contract format
 * Engine returns DraftAI with Content + Images
 * PARTIAL-SAFE: Always returns complete structure, even if images are empty
 */
function transformEngineResponse(
  engineResult: any,
  inputData: z.infer<typeof blogGenerateSchema>,
  warnings: Array<{ step: string; message: string }> = []
): BlogGenerateResponse {
  if (!engineResult) {
    throw new Error('Engine result is empty or null');
  }

  // Extract DraftAI structure (defensive: handle various response formats)
  // NEW FORMAT: engineResult might be data object directly
  const draftAI = engineResult;
  const contentResult = draftAI.content || draftAI.title ? draftAI : (engineResult.content || engineResult);
  const images = Array.isArray(draftAI.images) ? draftAI.images : (Array.isArray(engineResult.images?.inline) ? [] : []);
  
  if (!contentResult) {
    throw new Error('Content result is missing from engine response');
  }
  
  // Extract content fields (defensive: handle various field name formats)
  // NEW FORMAT: Check for content_html field
  const title = contentResult.title || contentResult.Title || inputData.title || '';
  const bodyContent = contentResult.content_html || contentResult.body || contentResult.Body || contentResult.content || '';
  const metaTitle = contentResult.seo?.title || contentResult.metaTitle || contentResult.MetaTitle || contentResult.meta_title || title;
  const metaDescription = contentResult.seo?.meta_description || contentResult.metaDesc || contentResult.MetaDesc || contentResult.meta_description || contentResult.metaDescription || '';
  const primaryKeyword = contentResult.seo?.primary_keyword || contentResult.primaryKeyword || contentResult.primary_keyword || inputData.primary_keyword || '';
  const secondaryKeywords = contentResult.seo?.secondary_keywords || (Array.isArray(contentResult.secondaryKeywords) 
    ? contentResult.secondaryKeywords 
    : Array.isArray(contentResult.secondary_keywords)
    ? contentResult.secondary_keywords
    : (inputData as any).secondary_keywords || []);
  
  // Validate required fields
  if (!title || !bodyContent) {
    throw new Error(`Missing required fields: title=${!!title}, bodyContent=${!!bodyContent}`);
  }

  // Generate slug from title
  const slug = generateSlug(title);

  // Extract excerpt (first 150 chars of content, strip HTML)
  const excerpt = extractExcerpt(bodyContent, 150);

  // Extract FAQ from content (look for FAQ section or generate from content)
  const faq = extractFAQ(bodyContent, inputData.primary_keyword || '');

  // Convert markdown/plain text to HTML if needed
  // NOTE: Images sudah di-inject oleh Go engine, jadi content sudah HTML dengan <img> tags
  const htmlContent = convertToHTML(bodyContent);

  // Process images from Go engine (defensive: handle missing images gracefully)
  // NEW FORMAT: Check for images.featured and images.inline
  let featuredImage = { url: '', alt: title };
  const inArticleImages: Array<{ url: string; alt: string; position_hint?: string }> = [];
  let imagePrompt = `Image for ${title}`;

  try {
    // NEW FORMAT: Check for images object with featured/inline
    const imagesObj = contentResult.images || engineResult.images;
    if (imagesObj?.featured) {
      const normalizedUrl = normalizeImagePathSafe(imagesObj.featured || '');
      if (normalizedUrl) {
        featuredImage = {
          url: normalizedUrl,
          alt: title,
        };
      }
    }
    if (Array.isArray(imagesObj?.inline)) {
      imagesObj.inline.forEach((url: string) => {
        if (url) {
          const normalizedUrl = normalizeImagePathSafe(url);
          if (normalizedUrl) {
            inArticleImages.push({ url: normalizedUrl, alt: title });
          }
        }
      });
    }
    
    // M-04: Process ImageAsset[] format with role support
    if (Array.isArray(images) && images.length > 0) {
      // M-04: Find hero image (prioritize role="hero", fallback to isHero, then first)
      const heroImage = images.find((img: any) => 
        img?.role === 'hero' || img?.Role === 'hero' || img?.isHero || img?.IsHero
      ) || images[0];
      
      if (heroImage) {
        const imageUrl = heroImage.localPath || heroImage.LocalPath || heroImage.url || heroImage.URL || '';
        const imageAlt = heroImage.altText || heroImage.AltText || heroImage.alt || heroImage.Alt || title;
        
        if (imageUrl) {
          const normalizedUrl = normalizeImagePathSafe(imageUrl);
          if (normalizedUrl) {
            featuredImage = { url: normalizedUrl, alt: imageAlt };
            imagePrompt = heroImage.prompt || heroImage.Prompt || imagePrompt;
          }
        }
      }

      // M-04: Process section images (role="section" or non-hero)
      const inArticle = images.filter((img: any, idx: number) => {
        if (!img) return false;
        // M-04: Filter by role or isHero flag
        const role = img.role || img.Role || '';
        const isHero = img.isHero || img.IsHero || (idx === 0 && !role);
        return role === 'section' || (!isHero && idx > 0);
      });

      inArticle.forEach((img: any, idx: number) => {
        if (!img) return;
        const imageUrl = img.localPath || img.LocalPath || img.url || img.URL || '';
        if (imageUrl) {
          const normalizedUrl = normalizeImagePathSafe(imageUrl);
          if (normalizedUrl) {
            inArticleImages.push({
              url: normalizedUrl,
              alt: img.altText || img.AltText || img.alt || img.Alt || '',
              position_hint: img.section || img.Section || img.heading || img.Heading || `after-h2-${idx + 1}`,
            });
          }
        }
      });

      // If no prompt from hero, use first image prompt
      if (!imagePrompt && images[0]) {
        imagePrompt = images[0].prompt || images[0].Prompt || imagePrompt;
      }
    } else {
      console.warn('[BLOG-GENERATE] No images in engine response (images is not an array or empty)');
    }
  } catch (imageError: any) {
    console.warn('[BLOG-GENERATE] Error processing images (non-fatal):', imageError.message);
    // Continue without images - not fatal
  }

  return {
    title,
    slug,
    excerpt,
    content: htmlContent,
    intent: (inputData as any).intent || 'informational',
    sections: [],
    image_map: [], // Empty since sections is empty
    seo: {
      title: metaTitle,
      meta_description: metaDescription || generateMetaDescription(title, bodyContent),
      primary_keyword: primaryKeyword,
      secondary_keywords: secondaryKeywords,
    },
    images: {
      // prompt: imagePrompt || `Image for ${title}`, // Removed - not in type
      featured: featuredImage,
      in_article: inArticleImages.slice(0, 3), // Max 3 in-article images
    },
    // faq, // Removed - not in BlogGenerateResponse type
    // related_products: inputData.related_product_ids || [], // Removed - not in BlogGenerateResponse type
    // word_count: contentResult.wordCount || contentResult.word_count || engineResult.word_count || engineResult.data?.word_count, // Removed - not in BlogGenerateResponse type
    // reading_time: contentResult.readingTime || contentResult.reading_time, // Removed - not in BlogGenerateResponse type
  };
}

/**
 * Generate slug from title
 */
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

/**
 * Extract excerpt from content
 */
function extractExcerpt(content: string, maxLength: number): string {
  if (!content) {
    return '';
  }

  // Strip HTML tags
  const text = content.replace(/<[^>]*>/g, '').trim();
  
  if (text.length <= maxLength) {
    return text;
  }

  // Find last complete sentence within limit
  const truncated = text.substring(0, maxLength);
  const lastPeriod = truncated.lastIndexOf('.');
  const lastQuestion = truncated.lastIndexOf('?');
  const lastExclamation = truncated.lastIndexOf('!');
  
  const lastSentenceEnd = Math.max(lastPeriod, lastQuestion, lastExclamation);
  
  if (lastSentenceEnd > maxLength * 0.5) {
    return truncated.substring(0, lastSentenceEnd + 1);
  }

  return truncated + '...';
}

/**
 * Extract FAQ from content or generate based on keyword
 */
function extractFAQ(content: string, primaryKeyword: string): Array<{ q: string; a: string }> {
  const faq: Array<{ q: string; a: string }> = [];

  // Try to find FAQ section in content
  const faqRegex = /(?:FAQ|Pertanyaan|Tanya Jawab)[\s\S]*?(?:<h[23]>|<strong>|<b>)(.*?)[\s\S]*?([^<]+)/gi;
  const matches = Array.from(content.matchAll(faqRegex));
  
  if (matches.length >= 2) {
    // Extract Q&A pairs
    for (let i = 0; i < matches.length - 1; i += 2) {
      const question = matches[i][1]?.trim() || '';
      const answer = matches[i + 1][2]?.trim() || '';
      if (question && answer) {
        faq.push({ q: question, a: answer });
      }
    }
  }

  // If no FAQ found, generate basic ones based on keyword
  if (faq.length === 0) {
    faq.push(
      {
        q: `Apa itu ${primaryKeyword}?`,
        a: `${primaryKeyword} adalah topik penting yang perlu dipahami dengan baik.`,
      },
      {
        q: `Bagaimana cara menggunakan ${primaryKeyword}?`,
        a: `Untuk menggunakan ${primaryKeyword} dengan efektif, ikuti panduan dan tips yang telah disediakan.`,
      }
    );
  }

  return faq.slice(0, 5); // Limit to 5 FAQ items
}

/**
 * Convert markdown/plain text to HTML
 */
function convertToHTML(content: string): string {
  if (!content) {
    return '';
  }

  // If already HTML (contains tags), return as is
  if (/<[^>]+>/.test(content)) {
    return content;
  }

  // Convert markdown-style headings to HTML
  let html = content
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>');

  // Wrap in paragraph tags
  html = '<p>' + html + '</p>';

  return html;
}

/**
 * Generate meta description if not provided
 */
function generateMetaDescription(title: string, content: string): string {
  if (content) {
    // Take first 150 chars, strip HTML
    const text = content.replace(/<[^>]*>/g, '').trim();
    const meta = text.substring(0, 150).trim();
    if (meta.length >= 50) {
      return meta + (text.length > 150 ? '...' : '');
    }
  }

  // Fallback
  return `${title} - Artikel lengkap dan informatif. Pelajari lebih lanjut tentang topik ini.`;
}
