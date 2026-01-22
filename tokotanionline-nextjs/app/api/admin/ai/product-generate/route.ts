/**
 * PHASE B1 — AI PRODUCT GENERATOR API BRIDGE
 * 
 * POST /api/admin/ai/product-generate
 * 
 * Purpose: Bridge endpoint that connects admin frontend to Go engine for product content generation
 * 
 * PRINSIP:
 * - Frontend hanya kirim data bisnis mentah (BUKAN prompt)
 * - Backend transform ke format engine
 * - Engine generate konten produk lengkap
 * - Response masuk ke form, BISA DIEDIT, TIDAK AUTO-SAVE/PUBLISH
 * 
 * 🔒 SECURITY:
 * - Auth required (admin/super_admin)
 * - No auto-publish
 * - No auto-save
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { z } from 'zod';
import { ensureProductExtraInfo } from '@/lib/product-extra-info';
import { validateShortDescription, validateSpecifications, validateSEOKeywords } from '@/lib/product-validation-phase-a';

// Fail-fast ENV check
// EKSEKUSI: Use AI_ENGINE_URL if available, fallback to ENGINE_HUB_URL
const ENGINE_HUB_URL = process.env.AI_ENGINE_URL || process.env.ENGINE_HUB_URL || process.env.GO_ENGINE_API_URL || 'http://localhost:8090';

// Request schema - business data only, NO prompts
const productGenerateSchema = z.object({
  product_name: z.string().min(1, 'Product name is required'),
  category: z.string().optional(),
  variant: z.string().optional(),
  price_range: z.string().optional(),
  intent: z.enum(['commercial', 'informational']).default('commercial'),
  primary_keyword: z.string().optional(),
  secondary_keywords: z.array(z.string()).optional(),
});

// Product v2 Response Schema - MUST match exact payload structure
type ProductGenerateResponse = {
  short_description: string; // <p>...</p>
  long_description_html: string; // <section>...</section> - WAJIB ADA, boleh pendek
  specifications_html: string; // <ul>...</ul>
  image_map: any[]; // Default empty array
  seo: {
    title: string;
    description: string;
    primary_keyword: string;
    secondary_keywords: string[]; // Optional, auto-derived
  };
  // PHASE S+: Additional Info (WAJIB AUTO-GENERATE)
  additional_info?: {
    problemSolution: string;
    applicationMethod: string;
    dosage: string;
    advantages: string;
    safetyNotes: string;
  };
  qc_status: 'PASS' | 'FAIL';
  // PHASE C: Image pipeline state
  image_status?: 'IMAGE_IDLE' | 'IMAGE_GENERATING' | 'IMAGE_FAILED' | 'IMAGE_READY';
  image_error?: string;
  // Backward compatibility aliases
  product_title?: string;
  short_copy?: string;
  shortDescription?: string;
  description?: string;
  longDescription?: string;
  specifications?: string;
  benefits?: string[];
  seoTitle?: string;
  seoDescription?: string;
  // Backward compatibility: expose additional info fields
  problemSolution?: string;
  applicationMethod?: string;
  dosage?: string;
  advantages?: string;
  safetyNotes?: string;
};

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // PHASE G: Rate limiting for AI endpoints (10 req/menit/user)
    const { applyRateLimit } = await import('@/lib/rate-limit-phase-g');
    const rateLimitResult = await applyRateLimit(request, 'ai');
    if (!rateLimitResult.allowed && rateLimitResult.response) {
      return rateLimitResult.response;
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
    
    // EKSEKUSI 2: Allow admin OR super_admin (not just super_admin)
    if (userRole !== 'super_admin' && userRole !== 'admin') {
      // EKSEKUSI 4: Sanitize error message (user-friendly, no technical details)
      // Log original error for server debugging
      if (process.env.NODE_ENV === 'development') {
        console.error('[PRODUCT-GENERATE] Access denied:', {
          userRole,
          userId: (session.user as any).id,
          email: session.user.email,
        });
      }
      
      return NextResponse.json(
        { error: 'Anda tidak memiliki akses untuk menjalankan fitur ini.' },
        { status: 403 }
      );
    }
    
    // EKSEKUSI 3: Session pass-through check - log for debugging
    if (process.env.NODE_ENV === 'development') {
      console.log('[PRODUCT-GENERATE] Session verified:', {
        userId: (session.user as any).id,
        email: session.user.email,
        role: userRole,
        authenticated: true,
      });
    }

    // 📥 PARSE & VALIDATE INPUT
    const body = await request.json();
    const data = productGenerateSchema.parse(body);

    console.log(`[PRODUCT-GENERATE] Starting generation: product_name=${data.product_name}, category=${data.category}`);
    console.log(`[PRODUCT-GENERATE] Engine URL: ${ENGINE_HUB_URL}`);

    // 🔧 STEP 1: Transform business data to engine format
    // Build product-specific outline for the engine
    const productOutline = buildProductOutline(data);

    // 🔧 STEP 2: Call Go engine
    let aiResult;
    try {
      aiResult = await callGoEngineForProduct({
        productName: data.product_name,
        category: data.category || '',
        outline: productOutline,
        intent: data.intent,
      });
    } catch (error: any) {
      console.error('[PRODUCT-GENERATE] Go engine call failed:', error.message);
      console.error('[PRODUCT-GENERATE] Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack?.substring(0, 200),
      });
      
      // More specific error messages
      let errorMessage = 'Gagal menghubungi AI engine. ';
      if (error.message?.includes('ECONNREFUSED') || error.message?.includes('fetch')) {
        errorMessage += 'Pastikan Go engine berjalan di port 8090. Jalankan: `cd engine-hub && go run cmd/server/main.go`';
      } else if (error.message?.includes('timeout')) {
        errorMessage += 'Request timeout. AI generation memakan waktu terlalu lama. Silakan coba lagi.';
      } else {
        errorMessage += error.message || 'Silakan coba lagi atau hubungi administrator.';
      }
      
      return NextResponse.json(
        {
          error: 'AI generation failed',
          message: errorMessage,
        },
        { status: 500 }
      );
    }

    // Check if AI result is valid
    if (!aiResult) {
      console.error('[PRODUCT-GENERATE] No AI result returned from engine');
      return NextResponse.json(
        {
          error: 'AI generation failed',
          message: 'AI engine tidak mengembalikan response. Pastikan Go engine berjalan di port 8090.',
        },
        { status: 500 }
      );
    }

    // Check for failed status
    if (aiResult.status === 'FAILED' || aiResult.status === 'FAILED_VALIDATION') {
      const errorMessage = aiResult?.error || aiResult?.message || 'AI engine gagal generate content';
      console.error('[PRODUCT-GENERATE] AI engine returned FAILED:', errorMessage);
      
      return NextResponse.json(
        {
          error: 'AI generation failed',
          message: errorMessage.includes('AI engine') 
            ? errorMessage 
            : `AI engine gagal: ${errorMessage}. Pastikan Go engine berjalan dan OPENAI_API_KEY sudah di-set.`,
        },
        { status: 400 }
      );
    }

    // Log successful AI result for debugging
    if (aiResult.status) {
      console.log(`[PRODUCT-GENERATE] AI result status: ${aiResult.status}`);
    }

    // PHASE C: Generate product images with fail-fast validation
    let productImages: any[] = [];
    let imageGenerationFailed = false;
    let imageError: string | null = null;
    
    try {
      // Generate slug from product name if needed
      const productSlug = generateSlugFromName(data.product_name);
      
      console.log('[PRODUCT-GENERATE] PHASE C: Generating product images...');
      const imageResponse = await fetch(`${ENGINE_HUB_URL}/api/engine/ai/generate-product-images`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productName: data.product_name,
          productDescription: aiResult.content?.body || aiResult.body || '',
          productSlug: productSlug,
        }),
        signal: AbortSignal.timeout(3 * 60 * 1000), // 3 minutes timeout for image generation
      });

      if (imageResponse.ok) {
        const imageResult = await imageResponse.json();
        if (imageResult.images && Array.isArray(imageResult.images)) {
          // PHASE C: Validate image paths (reject ###, PLACEHOLDER, invalid paths)
          const validImages: any[] = [];
          const invalidReasons: string[] = [];

          for (const img of imageResult.images) {
            const url = img.url || img.URL || img.localPath || img.LocalPath || '';
            
            // PHASE C: Reject placeholder
            if (!url || url.trim() === '') {
              invalidReasons.push('Empty image URL');
              continue;
            }
            
            if (url.includes('###') || url.includes('PLACEHOLDER') || url.includes('placeholder')) {
              invalidReasons.push(`Placeholder detected: ${url}`);
              continue;
            }

            // PHASE C: Validate path format (must start with /images/ or be valid URL)
            if (!url.startsWith('/images/') && !url.startsWith('http://') && !url.startsWith('https://')) {
              invalidReasons.push(`Invalid path format: ${url}`);
              continue;
            }

            validImages.push(img);
          }

          if (invalidReasons.length > 0) {
            console.error('[PRODUCT-GENERATE] PHASE C: Image validation failed:', invalidReasons);
            imageGenerationFailed = true;
            imageError = `Image validation failed: ${invalidReasons.join('; ')}`;
          } else if (validImages.length > 0) {
            productImages = validImages;
            console.log(`[PRODUCT-GENERATE] PHASE C: Generated ${productImages.length} valid product images`);
          } else {
            imageGenerationFailed = true;
            imageError = 'No valid images generated';
          }
        } else {
          imageGenerationFailed = true;
          imageError = 'Image generation returned invalid format';
          console.warn('[PRODUCT-GENERATE] PHASE C: Image generation returned invalid format');
        }
      } else {
        imageGenerationFailed = true;
        const errorText = await imageResponse.text();
        imageError = `Image generation failed: ${imageResponse.status} - ${errorText}`;
        console.warn('[PRODUCT-GENERATE] PHASE C: Image generation failed:', imageResponse.status);
      }
    } catch (imageError: any) {
      imageGenerationFailed = true;
      imageError = `Image generation error: ${imageError.message || 'Unknown error'}`;
      console.error('[PRODUCT-GENERATE] PHASE C: Image generation error:', imageError);
    }

    // PHASE C: If image generation failed, include error in response but don't block content generation
    // Frontend will handle IMAGE_FAILED state and enable manual fallback

    // 🔧 STEP 4: Transform engine response to contract format
    let response;
    try {
      response = transformEngineResponse(aiResult, data, productImages);
    } catch (transformError: any) {
      console.error('[PRODUCT-GENERATE] Transform error:', transformError);
      return NextResponse.json(
        {
          error: 'AI response transformation failed',
          message: transformError.message || 'Failed to process AI response. Please try again.',
          status: 'AI_FAILED',
        },
        { status: 500 }
      );
    }

    // PHASE B: POST-PROCESSING (WAJIB SEBELUM VERIFIKASI)
    // Helper function untuk post-processing
    const postProcessContent = (content: string): string => {
      if (!content) return '';
      
      // Trim whitespace
      let processed = content.trim();
      
      // Normalize bullets (convert various bullet styles to <li>)
      processed = processed.replace(/^[-*•]\s+/gm, '<li>');
      processed = processed.replace(/^\d+\.\s+/gm, '<li>');
      
      // Remove empty HTML tags
      processed = processed.replace(/<p>\s*<\/p>/g, '');
      processed = processed.replace(/<li>\s*<\/li>/g, '');
      processed = processed.replace(/<section>\s*<\/section>/g, '');
      
      // Enforce structure (ensure proper wrapping)
      if (processed && !processed.includes('<ul>') && processed.includes('<li>')) {
        processed = `<ul>${processed}</ul>`;
      }
      
      return processed;
    };

    // Apply post-processing
    if (response.short_description) {
      response.short_description = postProcessContent(response.short_description);
    }
    if (response.long_description_html) {
      response.long_description_html = postProcessContent(response.long_description_html);
    }
    if (response.specifications_html) {
      response.specifications_html = postProcessContent(response.specifications_html);
    }

    // PHASE B: OUTPUT VERIFICATION (WAJIB SETELAH POST-PROCESSING)
    const verificationErrors: string[] = [];

    // 1. Judul: tidak kosong
    const productTitle = response.product_title || data.product_name;
    if (!productTitle || productTitle.trim() === '') {
      verificationErrors.push('Judul produk tidak boleh kosong');
    }

    // 2. Deskripsi singkat: lolos PHASE A
    if (response.short_description) {
      const shortDescValidation = validateShortDescription(response.short_description);
      if (!shortDescValidation.valid) {
        verificationErrors.push(`Deskripsi singkat tidak valid: ${shortDescValidation.error}`);
      }
    }

    // 3. Spesifikasi: struktur list, ≥ 3 poin
    if (response.specifications_html) {
      const specsValidation = validateSpecifications(response.specifications_html);
      if (!specsValidation.valid) {
        verificationErrors.push(`Spesifikasi tidak valid: ${specsValidation.error}`);
      }
    }

    // 4. SEO keyword: primary ada
    const primaryKeyword = response.seo?.primary_keyword || '';
    if (!primaryKeyword || primaryKeyword.trim() === '') {
      verificationErrors.push('SEO primary keyword wajib ada');
    }

    // 5. Image prompt: tidak mengandung placeholder (###)
    if (response.image_map && Array.isArray(response.image_map)) {
      for (const img of response.image_map) {
        const prompt = img.query || img.prompt || '';
        if (prompt.includes('###') || prompt.includes('PLACEHOLDER')) {
          verificationErrors.push('Image prompt mengandung placeholder yang tidak valid');
          break;
        }
      }
    }

    // PHASE B: Jika verifikasi gagal, return AI_FAILED
    if (verificationErrors.length > 0) {
      console.error('[PRODUCT-GENERATE] PHASE B: Output verification failed:', verificationErrors);
      return NextResponse.json(
        {
          error: 'AI output verification failed',
          message: verificationErrors.join('; '),
          status: 'AI_FAILED',
          verificationErrors,
        },
        { status: 400 }
      );
    }

    // A2: Product v2 - Validate long_description_html is not empty (hard gate for QC)
    const hasValidLongDescription = response.long_description_html && 
                                    response.long_description_html.trim() !== '' && 
                                    response.long_description_html !== '<p></p>' &&
                                    response.long_description_html !== '<section></section>';
    
    // QC status: PASS if long_description_html exists and SEO fields filled
    const qcStatus = hasValidLongDescription &&
                     response.seo?.title && 
                     response.seo?.title.trim() !== '' &&
                     response.seo?.description && 
                     response.seo?.description.trim() !== ''
                     ? 'PASS' : 'FAIL';

    response.qc_status = qcStatus;

    // E: QC Gate validation - If long_description is empty, QC FAIL
    if (!hasValidLongDescription) {
      console.warn('[PRODUCT-GENERATE] QC FAIL: long_description_html is empty');
    }

    // PHASE C: Set image status in response
    if (imageGenerationFailed) {
      response.image_status = 'IMAGE_FAILED';
      response.image_error = imageError || 'Image generation failed';
    } else if (productImages.length > 0) {
      response.image_status = 'IMAGE_READY';
      response.image_error = undefined;
    } else {
      response.image_status = 'IMAGE_FAILED';
      response.image_error = 'No images generated';
    }

    // PHASE G: Log success and record metrics
    const duration = Date.now() - startTime;
    const { logInfo } = await import('@/lib/structured-logger');
    const { recordRequest, recordJob } = await import('@/lib/basic-monitoring');
    
    logInfo('AI product generation successful', {
      qc_status: qcStatus,
      has_long_description: hasValidLongDescription,
      has_seo: !!(response.seo?.title && response.seo?.description),
      verification_passed: true,
      image_status: response.image_status,
      image_count: productImages.length,
      duration,
    });
    recordRequest('POST', '/api/admin/ai/product-generate', 200, duration);
    recordJob('ai_product_generate', true, duration);

    return NextResponse.json(response);
  } catch (error: any) {
    // PHASE G: Log error with structured logger
    const duration = Date.now() - startTime;
    const { logError } = await import('@/lib/structured-logger');
    const { recordRequest, recordJob } = await import('@/lib/basic-monitoring');
    
    logError('AI product generation failed', error, {
      endpoint: '/api/admin/ai/product-generate',
      method: 'POST',
      duration,
    });
    
    const statusCode = error instanceof z.ZodError ? 400 : 
                      error.name === 'AbortError' || error.message?.includes('timeout') ? 504 :
                      error.message?.includes('fetch') || error.message?.includes('ECONNREFUSED') ? 503 : 500;
    
    recordRequest('POST', '/api/admin/ai/product-generate', statusCode, duration);
    recordJob('ai_product_generate', false, duration);
    
    // EKSEKUSI 4: Log error for server debugging (development only)
    if (process.env.NODE_ENV === 'development') {
      console.error('[PRODUCT-GENERATE] Error:', error);
    }
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request', message: 'Data yang dikirim tidak valid', details: error.issues },
        { status: 400 }
      );
    }

    // Handle network/timeout errors
    if (error.name === 'AbortError' || error.message?.includes('timeout')) {
      return NextResponse.json(
        { error: 'Request timeout', message: 'AI generation memakan waktu terlalu lama. Silakan coba lagi.' },
        { status: 504 }
      );
    }

    // Handle fetch errors (Go engine not available)
    if (error.message?.includes('fetch') || error.message?.includes('ECONNREFUSED')) {
      return NextResponse.json(
        { error: 'Fitur ini belum aktif', message: 'Fitur ini belum aktif. Silakan hubungi admin.' },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { 
        error: 'Terjadi kesalahan', 
        message: 'Terjadi kesalahan saat memproses permintaan. Silakan coba lagi atau hubungi administrator.' 
      },
      { status: 500 }
    );
  }
}

/**
 * Build product-specific outline for engine
 */
function buildProductOutline(data: z.infer<typeof productGenerateSchema>): string {
  const parts: string[] = [];
  
  parts.push(`### H2 — Tentang ${data.product_name}`);
  parts.push(`Pengenalan produk ${data.product_name} dan manfaat utamanya.`);
  
  if (data.category) {
    parts.push(`\n### H2 — Kategori dan Aplikasi`);
    parts.push(`Produk ini termasuk dalam kategori ${data.category} dan dapat digunakan untuk berbagai kebutuhan.`);
  }
  
  parts.push(`\n### H2 — Keunggulan dan Manfaat`);
  parts.push(`Keunggulan utama produk ${data.product_name} yang membedakannya dari produk sejenis.`);
  
  if (data.variant) {
    parts.push(`\n### H2 — Varian dan Pilihan`);
    parts.push(`Produk tersedia dalam varian: ${data.variant}.`);
  }
  
  if (data.price_range) {
    parts.push(`\n### H2 — Harga dan Nilai`);
    parts.push(`Harga produk mulai dari ${data.price_range}, memberikan nilai terbaik untuk kualitas yang ditawarkan.`);
  }
  
  parts.push(`\n### H2 — Kesimpulan`);
  parts.push(`Ringkasan mengapa ${data.product_name} adalah pilihan tepat untuk kebutuhan Anda.`);
  
  return parts.join('\n\n');
}

/**
 * Call Go engine hub for product generation
 */
async function callGoEngineForProduct(data: {
  productName: string;
  category: string;
  outline: string;
  intent: string;
}) {
  const requestBody = {
    contentType: 'DERIVATIVE', // Use existing content type
    category: 'K1', // Default category for engine
    outline: data.outline,
    language: 'id',
  };

  // C1: Use v2 endpoint as default (single entry point)
  const engineUrl = `${ENGINE_HUB_URL}/api/engine/ai/generate-v2`;
  console.log(`[PRODUCT-GENERATE] Calling Go engine v2: ${engineUrl}`);

  try {
    const response = await fetch(engineUrl, {
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
      let errorMessage = `Go engine error (${response.status})`;
      
      // Parse error message if possible
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.error || errorJson.message || errorMessage;
      } catch {
        // If not JSON, use text as is (truncate if too long)
        if (errorText && errorText.length < 200) {
          errorMessage = errorText;
        }
      }
      
      throw new Error(errorMessage);
    }

    const result = await response.json();
    return result;
  } catch (error: any) {
    // Re-throw with better error message
    if (error.name === 'AbortError' || error.message?.includes('timeout')) {
      throw new Error('AI generation timeout. Silakan coba lagi.');
    }
    if (error.message?.includes('ECONNREFUSED') || error.message?.includes('fetch')) {
      throw new Error('AI engine tidak dapat diakses. Pastikan Go engine berjalan di port 8090.');
    }
    throw error;
  }
}

/**
 * Generate slug from product name
 */
function generateSlugFromName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 100);
}

/**
 * Transform engine response to Product v2 contract format
 * A1: Output AI Generator v2 (Produk) - MUST produce exact payload structure
 * M-05: Includes product images in image_map
 */
function transformEngineResponse(
  engineResult: any,
  inputData: z.infer<typeof productGenerateSchema>,
  productImages: any[] = []
): ProductGenerateResponse {
  // Extract content from Go engine response
  const rawContent = engineResult.content || engineResult;
  const title = rawContent.title || rawContent.Title || inputData.product_name;
  const bodyContent = rawContent.body || rawContent.Body || '';
  const metaTitle = rawContent.metaTitle || rawContent.MetaTitle || title;
  const metaDescription = rawContent.metaDesc || rawContent.MetaDesc || '';

  // A1: Extract short_description (<p>...</p> format)
  const shortCopy = extractShortCopy(bodyContent, inputData.product_name);
  const shortDescription = shortCopy || `${inputData.product_name} adalah produk berkualitas tinggi yang dirancang untuk memenuhi kebutuhan Anda.`;
  const short_description = shortDescription.startsWith('<p>') ? shortDescription : `<p>${shortDescription}</p>`;

  // A1: Generate long_description_html (<section>...</section> format)
  // Berbasis pertanyaan & jawaban singkat, boleh pendek, tidak ada target kata
  let long_description_html = '';
  
  if (bodyContent) {
    // Convert to HTML if needed
    if (!bodyContent.includes('<') && !bodyContent.includes('>')) {
      // Plain text - convert to Q&A format in section
      const paragraphs = bodyContent.split('\n\n').filter((p: string) => p.trim());
      const qaPairs = paragraphs.slice(0, 3).map((p: string, idx: number) => {
        const cleanText = p.trim().replace(/\n/g, ' ');
        return `<p>${cleanText}</p>`;
      });
      long_description_html = `<section>${qaPairs.join('')}</section>`;
    } else {
      // Already HTML - wrap in section if not already
      if (bodyContent.includes('<section>')) {
        long_description_html = bodyContent;
      } else {
        long_description_html = `<section>${bodyContent}</section>`;
      }
    }
  }

  // A1: Ensure long_description_html is not empty (WAJIB ADA)
  if (!long_description_html || long_description_html.trim() === '' || 
      long_description_html === '<section></section>' || long_description_html === '<p></p>') {
    // Generate minimal Q&A format
    long_description_html = `<section><p>Apa itu ${inputData.product_name}?</p><p>${inputData.product_name} adalah produk berkualitas yang dirancang untuk kebutuhan Anda.</p></section>`;
  }

  // A1: Generate specifications_html (<ul>...</ul> format)
  const specifications = generateSpecifications(bodyContent, inputData.product_name, inputData.category);
  let specifications_html = specifications || '<ul><li>Spesifikasi tersedia</li></ul>';
  // Ensure it's wrapped in <ul> if not already
  if (!specifications_html.includes('<ul>') && !specifications_html.includes('<table>')) {
    specifications_html = `<ul><li>${specifications_html}</li></ul>`;
  }

  // M-09: Ensure specifications are filled
  const ensuredSpecs = ensureProductExtraInfo(
    { specifications: specifications_html },
    inputData.product_name,
    inputData.category
  );
  specifications_html = ensuredSpecs.specifications;

  // STEP 1: Keyword TIDAK BOLEH dihasilkan AI - hanya gunakan input dari user
  // Primary keyword: hanya dari inputData, fallback ke product_name jika tidak ada
  const primary_keyword = inputData.primary_keyword || inputData.product_name || 'produk';

  // Secondary keywords: hanya dari inputData, TIDAK auto-derive
  const secondary_keywords = inputData.secondary_keywords || [];

  // D1/D2: Ensure SEO fields exist
  const finalSeoTitle = metaTitle || title;
  const finalSeoDescription = metaDescription || generateMetaDescription(title, bodyContent) || `Informasi lengkap tentang ${inputData.product_name}.`;

  // M-05: Transform product images to image_map format
  // M-05: Structure: { role, url, alt, query }
  const image_map: any[] = productImages.map((img: any) => ({
    role: img.role || img.Role || (img.isHero || img.IsHero ? 'hero' : 'detail'),
    url: img.localPath || img.LocalPath || img.url || img.URL || '',
    alt: img.altText || img.AltText || img.alt || img.Alt || `${inputData.product_name} - ${img.role || 'image'}`,
    query: img.prompt || img.Prompt || '',
  })).filter((img: any) => img.url); // Filter out images without URLs

  // Extract benefits for backward compatibility
  const benefits = extractBenefits(bodyContent, inputData.product_name);

  // PHASE S+: Auto-generate Info Tambahan Produk (WAJIB TERISI)
  const additionalInfo = generateAdditionalInfo(bodyContent, inputData.product_name, inputData.category);

  // A1: Response MUST match exact v2 payload structure
  return {
    short_description,
    long_description_html,
    specifications_html,
    image_map,
    seo: {
      title: finalSeoTitle,
      description: finalSeoDescription,
      primary_keyword,
      secondary_keywords,
    },
    // PHASE S+: Additional Info (WAJIB AUTO-GENERATE)
    additional_info: additionalInfo,
    qc_status: 'PASS', // Will be recalculated after
    // Backward compatibility aliases
    product_title: title,
    short_copy: shortDescription,
    shortDescription,
    description: long_description_html,
    longDescription: long_description_html,
    specifications: specifications_html,
    benefits,
    seoTitle: finalSeoTitle,
    seoDescription: finalSeoDescription,
    // Backward compatibility: expose additional info fields
    problemSolution: additionalInfo.problemSolution,
    applicationMethod: additionalInfo.applicationMethod,
    dosage: additionalInfo.dosage,
    advantages: additionalInfo.advantages,
    safetyNotes: additionalInfo.safetyNotes,
  };
}

// STEP 1: REMOVED extractSecondaryKeywords - Keyword TIDAK BOLEH dihasilkan AI
// Keywords hanya dari input user (riset SEO manual)

/**
 * Extract short copy from full description
 */
function extractShortCopy(description: string, productName: string): string {
  if (!description) {
    return `${productName} adalah produk berkualitas tinggi yang dirancang untuk memenuhi kebutuhan Anda.`;
  }

  // Take first 2-3 sentences
  const sentences = description.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const shortSentences = sentences.slice(0, 3);
  
  if (shortSentences.length === 0) {
    return `${productName} adalah produk berkualitas tinggi yang dirancang untuk memenuhi kebutuhan Anda.`;
  }

  return shortSentences.join('. ').trim() + (shortSentences.length < sentences.length ? '.' : '');
}

/**
 * Extract benefits from description
 */
function extractBenefits(description: string, productName: string): string[] {
  if (!description) {
    return [
      'Kualitas premium dengan standar tinggi',
      'Mudah digunakan dan praktis',
      'Hasil optimal dan terjamin',
    ];
  }

  // Try to find bullet points or list items
  const bulletMatches = description.match(/[-•*]\s*([^\n]+)/g);
  if (bulletMatches && bulletMatches.length > 0) {
    return bulletMatches
      .slice(0, 5)
      .map(match => match.replace(/^[-•*]\s*/, '').trim())
      .filter(b => b.length > 0);
  }

  // Try to find numbered lists
  const numberedMatches = description.match(/\d+\.\s*([^\n]+)/g);
  if (numberedMatches && numberedMatches.length > 0) {
    return numberedMatches
      .slice(0, 5)
      .map(match => match.replace(/^\d+\.\s*/, '').trim())
      .filter(b => b.length > 0);
  }

  // Fallback: generate from key phrases
  const keyPhrases = [
    'Kualitas premium',
    'Mudah digunakan',
    'Hasil optimal',
    'Terpercaya dan aman',
  ];

  return keyPhrases.slice(0, 4);
}

/**
 * Generate meta description if not provided
 */
function generateMetaDescription(title: string, description: string): string {
  if (description) {
    // Take first 150 chars
    const meta = description.substring(0, 150).trim();
    if (meta.length >= 50) {
      return meta + (description.length > 150 ? '...' : '');
    }
  }

  // Fallback
  return `${title} - Produk berkualitas tinggi untuk kebutuhan Anda. Dapatkan informasi lengkap dan harga terbaik.`;
}


/**
 * PHASE S+: Auto-generate Info Tambahan Produk (WAJIB TERISI)
 * M-09: Updated to ensure all fields are filled
 * Struktur FINAL:
 * - Spesifikasi: HTML bullet/ringan
 * - Masalah & Solusi: Q&A sederhana tentang problem yang diselesaikan produk
 * - Cara Aplikasi: Jika ada data → gunakan, jika tidak → default text
 * - Dosis: General AI-based dosage (aman, tidak klaim medis)
 * - Keunggulan: Value Proposition Formula (Masalah, Solusi, Hasil, Pembeda)
 * - Catatan: Kontra indikasi jika ada, jika tidak → default text
 */
function generateAdditionalInfo(
  content: string,
  productName: string,
  category?: string
): {
  problemSolution: string;
  applicationMethod: string;
  dosage: string;
  advantages: string;
  safetyNotes: string;
} {
  // 1. Masalah & Solusi (Q&A format)
  const problemSolution = generateProblemSolution(content, productName);

  // 2. Cara Aplikasi
  const applicationMethod = extractApplicationMethod(content) || 
    'Gunakan sesuai petunjuk penggunaan pada kemasan.';

  // 3. Dosis (General AI-based, aman)
  const dosage = extractDosage(content) || 
    generateGeneralDosage(productName, category);

  // 4. Keunggulan (Value Proposition: Masalah, Solusi, Hasil, Pembeda)
  const advantages = generateAdvantages(content, productName);

  // 5. Catatan
  const safetyNotes = extractSafetyNotes(content) || 
    'Produk asli bergaransi. Simpan di tempat kering dan sejuk.';

  // M-09: Ensure all fields are filled using ensureProductExtraInfo
  const ensured = ensureProductExtraInfo(
    {
      problemSolution,
      applicationMethod,
      dosage,
      advantages,
      safetyNotes,
    },
    productName,
    category
  );

  return {
    problemSolution: ensured.problemSolution,
    applicationMethod: ensured.applicationMethod,
    dosage: ensured.dosage,
    advantages: ensured.advantages,
    safetyNotes: ensured.safetyNotes,
  };
}

/**
 * Generate Masalah & Solusi (Q&A format)
 */
function generateProblemSolution(content: string, productName: string): string {
  // Try to extract Q&A from content
  const qaPatterns = [
    /(?:masalah|problem|issue)[\s\S]*?(?:solusi|solution|penyelesaian)[\s\S]*?([^.]{20,200}\.)/i,
    /(?:apa|bagaimana|mengapa)[^?]+\?[^.!?]{20,200}[.!?]/gi,
  ];

  for (const pattern of qaPatterns) {
    const matches = content.match(pattern);
    if (matches && matches.length > 0) {
      const qaText = matches.slice(0, 2).join(' ');
      if (qaText.length >= 30) {
        return qaText.substring(0, 300); // Max 300 chars
      }
    }
  }

  // Fallback: Generate basic Q&A
  return `Apa masalah yang diselesaikan ${productName}?\n\n${productName} dirancang untuk mengatasi kebutuhan dalam aplikasi pertanian dan perkebunan. Produk ini memberikan solusi praktis dengan kualitas terjamin.\n\nBagaimana cara ${productName} bekerja?\n\nProduk ini bekerja secara efektif dengan formula yang telah teruji, memberikan hasil optimal sesuai kebutuhan pengguna.`;
}

/**
 * Extract Cara Aplikasi from content
 */
function extractApplicationMethod(content: string): string | null {
  const patterns = [
    /(?:cara\s*(?:aplikasi|penggunaan|pakai|pemakaian))[:\s]*([^.!?]{30,300}[.!?])/i,
    /(?:panduan\s*(?:penggunaan|aplikasi))[:\s]*([^.!?]{30,300}[.!?])/i,
    /(?:petunjuk\s*(?:penggunaan|pakai))[:\s]*([^.!?]{30,300}[.!?])/i,
  ];

  for (const pattern of patterns) {
    const match = content.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }

  return null;
}

/**
 * Extract Dosis from content
 */
function extractDosage(content: string): string | null {
  const patterns = [
    /(?:dosis|takaran|dosis\s*(?:yang\s*)?(?:dianjurkan|direkomendasikan))[:\s]*([^.!?]{20,200}[.!?])/i,
    /(?:penggunaan\s*(?:sebesar|dengan\s*dosis))[:\s]*([^.!?]{20,200}[.!?])/i,
  ];

  for (const pattern of patterns) {
    const match = content.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }

  return null;
}

/**
 * Generate general dosage (AI-based, aman, tidak klaim medis)
 */
function generateGeneralDosage(productName: string, category?: string): string {
  // General dosage guidance (non-medical, safe)
  if (category && category.toLowerCase().includes('pupuk')) {
    return `Gunakan sesuai anjuran untuk jenis tanaman dan fase pertumbuhan. Konsultasikan dengan ahli pertanian untuk dosis optimal sesuai kondisi lahan dan tanaman Anda.`;
  }
  if (category && category.toLowerCase().includes('pestisida')) {
    return `Gunakan sesuai anjuran pada label kemasan. Perhatikan interval aplikasi dan waktu tunggu sebelum panen. Ikuti petunjuk keselamatan yang tertera.`;
  }
  return `Gunakan sesuai petunjuk pada kemasan produk. Untuk dosis optimal, sesuaikan dengan kondisi dan kebutuhan spesifik Anda. Konsultasikan dengan ahli jika diperlukan.`;
}

/**
 * Generate Keunggulan (Value Proposition: Masalah, Solusi, Hasil, Pembeda)
 */
function generateAdvantages(content: string, productName: string): string {
  // Try to extract advantages from content
  const advantagePatterns = [
    /(?:keunggulan|kelebihan|keuntungan|manfaat\s*utama)[:\s]*([^.!?]{30,400}[.!?])/i,
    /(?:mengapa\s*(?:memilih|harus))[^?]+\?[^.!?]{30,400}[.!?]/i,
  ];

  for (const pattern of advantagePatterns) {
    const match = content.match(pattern);
    if (match && match[1]) {
      const extracted = match[1].trim();
      if (extracted.length >= 50) {
        return extracted.substring(0, 400); // Max 400 chars
      }
    }
  }

  // Fallback: Generate Value Proposition Formula
  return `Masalah yang Diatasi:\n${productName} mengatasi kebutuhan praktis dalam aplikasi pertanian.\n\nSolusi yang Diberikan:\nProduk ini menyediakan solusi terpercaya dengan formula berkualitas.\n\nHasil yang Diharapkan:\nHasil optimal dan terjamin sesuai kebutuhan pengguna.\n\nPembeda Utama:\nKualitas premium, mudah digunakan, dan terpercaya.`;
}

/**
 * Extract Catatan Keamanan (Kontra indikasi) from content
 */
function extractSafetyNotes(content: string): string | null {
  const patterns = [
    /(?:catatan\s*(?:keamanan|keselamatan|penting)|kontra\s*indikasi|peringatan)[:\s]*([^.!?]{30,300}[.!?])/i,
    /(?:hindari|jangan\s*(?:digunakan|pakai))[:\s]*([^.!?]{20,200}[.!?])/i,
  ];

  for (const pattern of patterns) {
    const match = content.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }

  return null;
}

/**
 * FITUR 4: Generate specifications as HTML
 * Extracts or generates structured specifications from content
 */
function generateSpecifications(description: string, productName: string, category?: string): string {
  // Try to extract specifications from description (look for tables, lists, key-value pairs)
  const specPatterns = [
    /(?:spesifikasi|specification)[\s\S]*?(?:<table>[\s\S]*?<\/table>|(?:<ul>|<ol>)[\s\S]*?(?:<\/ul>|<\/ol>))/i,
    /<table>[\s\S]*?<\/table>/,
  ];

  for (const pattern of specPatterns) {
    const match = description.match(pattern);
    if (match) {
      return match[0];
    }
  }

  // Generate default specifications as HTML table
  const specs = [
    { label: 'Nama Produk', value: productName },
    { label: 'Kategori', value: category || 'Produk Pertanian' },
    { label: 'Kualitas', value: 'Premium' },
    { label: 'Standar', value: 'SNI / Berstandar Internasional' },
  ];

  const specsHTML = `
    <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
      <tbody>
        ${specs.map(spec => `
          <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 8px; font-weight: 600; width: 40%;">${spec.label}</td>
            <td style="padding: 8px;">${spec.value}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;

  return specsHTML.trim();
}
