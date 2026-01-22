/**
 * FASE 2.2: Content Factory - Blog Post Form Component
 * 
 * Features:
 * - Keyword intake (optional, UI-level)
 * - Quality guard warnings
 * - AI content assist (manual, preview-only)
 * - Status flow: DRAFT → REVIEW → PUBLISHED
 * - Scheduling (manual, no auto)
 * - Audit logging
 */

'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, Eye, Send, Archive, Sparkles, AlertTriangle, CheckCircle, X, Code2, FileText, Upload, ExternalLink } from 'lucide-react';
import { isSuperAdmin, hasPermission } from '@/lib/permissions';
import { AI_CONTENT_ASSIST_ENABLED } from '@/lib/admin-config';
import { useNotification } from '@/lib/notification-context';
import dynamic from 'next/dynamic';
import AIBlogControlPanel from './AIBlogControlPanel';
import SEOIntelligencePanel from './SEOIntelligencePanel';

// Dynamic import untuk Quill (client-side only)
const ReactQuill = dynamic(() => import('react-quill'), { ssr: false });
import 'react-quill/dist/quill.snow.css';

interface Author {
  id: string;
  name: string;
  email: string;
}

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  content: string;
  contentMode?: 'TEXT' | 'HTML' | null; // M-07
  excerpt: string | null;
  status: 'DRAFT' | 'SCHEDULED' | 'READY_TO_PUBLISH' | 'PUBLISHED' | 'CANCELLED' | 'REVIEW' | 'ARCHIVED'; // PHASE S: New statuses
  seoTitle: string | null;
  seoDescription: string | null;
  seoKeywords: string | null;
  primaryKeyword: string | null;
  secondaryKeywords: string[];
  publishedAt: string | null;
  scheduledAt: string | null;
  approvedBy: string | null; // PHASE S
  approvedAt: string | null; // PHASE S
  author: Author | null;
  approver?: Author | null; // PHASE S
}

interface BlogPostFormClientProps {
  post?: BlogPost;
  userRole?: string;
}

// REMOVED: SearchIntent type - not used (intent_type from category is used instead)

export default function BlogPostFormClient({
  post,
  userRole,
}: BlogPostFormClientProps) {
  const router = useRouter();
  const { showNotification } = useNotification();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState<string | null>(null);
  const [showSeoPanel, setShowSeoPanel] = useState(false);
  const [showKeywordPanel, setShowKeywordPanel] = useState(false);
  const [showReviewChecklist, setShowReviewChecklist] = useState(false);
  const [aiPreview, setAiPreview] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  // M-06: Track if SEO was manually edited
  const [seoManual, setSeoManual] = useState(false);
  // PHASE B: Validation state for scheduler unlock
  const [validationStatus, setValidationStatus] = useState<'READY' | 'INVALID' | null>(null);

  // LAST LOCK: category_id and intent_type are REQUIRED
  const [formData, setFormData] = useState({
    title: post?.title || '',
    slug: post?.slug || '',
    content: post?.content || '',
    excerpt: post?.excerpt || '',
    seoTitle: post?.seoTitle || '',
    seoDescription: post?.seoDescription || '',
    // seoKeywords removed - not used by engine (only primaryKeyword & secondaryKeywords are used)
    primaryKeyword: post?.primaryKeyword || '',
    secondaryKeywords: post?.secondaryKeywords?.join(', ') || '',
    // FASE 2.2: Scheduling
    scheduledAt: post?.scheduledAt ? new Date(post.scheduledAt).toISOString().slice(0, 16) : '',
    // PHASE B2-R: Featured image
    featuredImageUrl: '',
    // QC and image mapping
    seoSchema: (post as any)?.seoSchema || {},
    imageMap: [] as Array<{ section_index: number; image_url: string; alt: string }>,
    // LAST LOCK: Required fields
    category_id: (post as any)?.unifiedCategoryId || '',
    intent_type: (post as any)?.intentType || '',
  });

  // LAST LOCK: Fetch leaf categories (non-structural)
  const [categories, setCategories] = useState<Array<{ id: string; name: string; path: string; level: number }>>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [aiConfirmationChecked, setAiConfirmationChecked] = useState(false);
  const [articleStatus, setArticleStatus] = useState<'DRAFT' | 'GENERATED' | 'VALIDATED'>(
    (post as any)?.articleStatus || 'DRAFT'
  );

  useEffect(() => {
    fetchLeafCategories();
  }, []);

  const fetchLeafCategories = async () => {
    try {
      setLoadingCategories(true);
      const response = await fetch('/api/admin/categories?context=blog');
      if (response.ok) {
        const data = await response.json();
        // Filter: only leaf categories (level 2 or 3), non-structural
        // Use flat list which has path already built
        const leafCategories = (data.flat || [])
          .filter((cat: any) => cat.level >= 2 && !cat.isStructural)
          .map((cat: any) => ({
            id: cat.id,
            name: cat.name,
            path: cat.path || cat.name,
            level: cat.level,
          }));
        setCategories(leafCategories);
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error fetching categories:', error);
      }
    } finally {
      setLoadingCategories(false);
    }
  };

  // Quill editor ref
  const quillRef = useRef<any>(null);

  const isEdit = !!post;
  const isPublished = post?.status === 'PUBLISHED';
  const isDraft = post?.status === 'DRAFT' || !post;
  const isReview = post?.status === 'REVIEW';
  const isScheduled = post?.status === 'SCHEDULED'; // PHASE S
  const isReadyToPublish = post?.status === 'READY_TO_PUBLISH'; // PHASE S
  const isCancelled = post?.status === 'CANCELLED'; // PHASE S
  const slugLocked = isPublished;
  const canPublish = isSuperAdmin(userRole || '');
  const canApprove = hasPermission(userRole || '', 'content.manage'); // PHASE S: Any admin can approve

  // PHASE B2-R: Client-side mount state untuk Quill (prevent hydration error)
  const [isMounted, setIsMounted] = useState(false);
  // M-07: TEXT ↔ HTML toggle (deterministic, not visual/html)
  // Infer from post.contentMode or default to HTML for backward compatibility
  const inferModeFromContent = (content: string, savedMode?: 'TEXT' | 'HTML' | null): 'TEXT' | 'HTML' => {
    if (savedMode === 'TEXT' || savedMode === 'HTML') {
      return savedMode;
    }
    // Backward compatibility: infer from content
    const hasHTMLTags = /<[a-z][\s\S]*>/i.test(content);
    return hasHTMLTags ? 'HTML' : 'TEXT';
  };
  const [contentMode, setContentMode] = useState<'TEXT' | 'HTML'>(() => {
    if (post?.contentMode) {
      return post.contentMode as 'TEXT' | 'HTML';
    }
    return inferModeFromContent(post?.content || '');
  });
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Quality guard calculations
  const qualityWarnings = useMemo(() => {
    const warnings: string[] = [];
    const titleLength = formData.title.trim().length;
    
    // PHASE B2-R: Word count untuk HTML content (strip tags)
    const textContent = formData.content.replace(/<[^>]*>/g, ' ').trim();
    const contentWords = textContent.split(/\s+/).filter(Boolean).length;

    if (titleLength > 0 && titleLength < 20) {
      warnings.push(`Judul terlalu pendek (${titleLength} karakter, minimum 20 karakter)`);
    }

    if (contentWords > 0 && contentWords < 300) {
      warnings.push(`Konten terlalu pendek (${contentWords} kata, minimum 300 kata)`);
    }

    if (!formData.seoTitle && !formData.seoDescription) {
      warnings.push('SEO Title dan Description kosong');
    } else if (!formData.seoTitle) {
      warnings.push('SEO Title kosong');
    } else if (!formData.seoDescription) {
      warnings.push('SEO Description kosong');
    }

    return warnings;
  }, [formData.title, formData.content, formData.seoTitle, formData.seoDescription]);

  // Review checklist validation
  const reviewChecklist = useMemo(() => {
    return {
      titleClear: formData.title.trim().length >= 20,
      contentNotPlaceholder: formData.content.trim().length > 0 && 
        !formData.content.toLowerCase().includes('placeholder') &&
        !formData.content.toLowerCase().includes('lorem ipsum'),
    };
  }, [formData.title, formData.content]);

  const canSubmitForReview = reviewChecklist.titleClear && reviewChecklist.contentNotPlaceholder;

  // Auto-generate slug from title
  useEffect(() => {
    if (!isEdit || !isPublished) {
      const generatedSlug = formData.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      setFormData((prev) => ({ ...prev, slug: generatedSlug }));
    }
  }, [formData.title, isEdit, isPublished]);

  // M-06: Auto-fill SEO on load if empty
  useEffect(() => {
    // Only auto-fill if SEO is empty and not manually edited
    if (!seoManual) {
      const hasSeo = formData.seoTitle && formData.seoDescription;
      if (!hasSeo) {
        const kw = formData.primaryKeyword || '';
        if (kw) {
          const autoSeoTitle = `${kw} — Panduan Lengkap`;
          const autoSeoDescription = `Pelajari ${kw} secara lengkap, praktis, dan mudah dipahami. Dapatkan tips, panduan, dan rekomendasi terbaik.`;
          
          setFormData((prev) => ({
            ...prev,
            seoTitle: prev.seoTitle || autoSeoTitle,
            seoDescription: prev.seoDescription || autoSeoDescription,
          }));
        }
      }
    }
  }, [formData.primaryKeyword, formData.seoTitle, formData.seoDescription, seoManual]);

  // Handle input change
  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    
    // M-06: Track manual SEO edits
    if (field === 'seoTitle' || field === 'seoDescription') {
      setSeoManual(true);
    }
  };

  // FITUR 5: Featured Image Upload
  const handleImageUpload = async (file: File) => {
    try {
      setUploadingImage(true);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('category', 'blog');

      const response = await fetch('/api/upload/image', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok || !data.url) {
        throw new Error(data.error || 'Upload gagal');
      }

      handleChange('featuredImageUrl', data.url);
      setSuccess('Gambar berhasil diupload!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (error: any) {
      setError(error.message || 'Upload gambar gagal');
      setTimeout(() => setError(''), 5000);
    } finally {
      setUploadingImage(false);
    }
  };

  // LAST LOCK: Validation helpers
  const isFormValidForSave = () => {
    // Can save draft even without category/intent (for backward compatibility with existing posts)
    return true;
  };

  const isFormValidForGenerate = () => {
    if (!formData.category_id) {
      setError('Kategori WAJIB dipilih untuk generate artikel');
      setTimeout(() => setError(''), 5000);
      return false;
    }
    if (!formData.intent_type) {
      setError('Intent Type WAJIB dipilih untuk generate artikel');
      setTimeout(() => setError(''), 5000);
      return false;
    }
    if (!aiConfirmationChecked) {
      setError('Anda harus menyetujui fokus konten & produk pendukung sebelum generate');
      setTimeout(() => setError(''), 5000);
      return false;
    }
    return true;
  };

  const isFormValidForReview = () => {
    if (!formData.category_id) {
      setError('Kategori WAJIB dipilih untuk submit review');
      setTimeout(() => setError(''), 5000);
      return false;
    }
    if (!formData.intent_type) {
      setError('Intent Type WAJIB dipilih untuk submit review');
      setTimeout(() => setError(''), 5000);
      return false;
    }
    if (articleStatus === 'GENERATED') {
      setError('Artikel harus divalidasi terlebih dahulu sebelum submit review');
      setTimeout(() => setError(''), 5000);
      return false;
    }
    return true;
  };

  // PHASE B2: AI Blog Generator - Generate Artikel (AI)
  const handleAIGenerate = async () => {
    // LAST LOCK: Validate required fields
    if (!isFormValidForGenerate()) {
      return;
    }

    // Validate: title or primary keyword must be provided
    // REMOVED: formData.keyword - not used
    if (!formData.title && !formData.primaryKeyword) {
      setError('Title atau Primary Keyword harus diisi untuk generate artikel');
      setTimeout(() => setError(''), 5000);
      return;
    }

    setAiLoading(true);
    setError('');
    setSuccess(null);
    
    try {
      // Prepare business data payload (NO prompts)
      // REMOVED: keyword, searchIntent - not used in engine
      const title = formData.title || formData.primaryKeyword || '';
      const primaryKeyword = formData.primaryKeyword || title;
      const secondaryKeywords = formData.secondaryKeywords
        ? formData.secondaryKeywords.split(',').map(k => k.trim()).filter(Boolean)
        : [];

      const response = await fetch('/api/admin/blog/posts/ai-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title,
          category: '', // Deprecated, use category_id
          audience: '', // TODO: Get from form if available
          language: 'id',
          brand_voice: '', // TODO: Get from form if available
          primary_keyword: primaryKeyword, // For backward compatibility
          category_id: formData.category_id, // LAST LOCK: Required
        }),
      });

      let result;
      try {
        result = await response.json();
      } catch (parseError: any) {
        throw new Error(`Failed to parse server response: ${parseError.message}`);
      }

      if (!response.ok) {
        // TASK 8: Honest error handling - show step and error
        const errorStep = result?.step || 'unknown';
        const errorMsg = result?.message || result?.error || `Server error: ${response.status} ${response.statusText}`;
        
        // TASK 8: Format: `${res.step}: ${res.error}`
        let honestErrorMessage = `${errorStep}: ${errorMsg}`;
        
        throw new Error(honestErrorMessage);
      }

      // TASK 8: Honest error handling per step
      const steps = result?.steps || [];
      const warnings = result?.warnings || [];
      const successMessages: string[] = [];
      const warningMessages: string[] = [];

      // TASK 8: Check for image failure specifically
      const imageStep = steps.find((s: any) => s.step === 'image' && !s.ok);
      if (imageStep) {
        // TASK 8: Show warning that article & SEO succeeded but image failed
        warningMessages.push('Artikel & SEO berhasil. Image gagal.');
      }

      // Build success/warning messages from steps array (jujur per-step)
      if (steps.length > 0) {
        steps.forEach((step: any) => {
          if (step.ok) {
            if (step.step === 'text') {
              successMessages.push('✅ Artikel berhasil di-generate');
            } else if (step.step === 'seo') {
              successMessages.push('✅ SEO metadata berhasil di-generate');
            } else if (step.step === 'image') {
              successMessages.push('✅ Images berhasil di-generate');
            }
          } else {
            // TASK 8: Show step-specific error
            if (step.step === 'image') {
              // Already handled above with specific message
            } else {
              // Text/SEO failure should have been caught above, but handle gracefully
              warningMessages.push(`⚠️ ${step.step} gagal: ${step.error || 'Step failed'}`);
            }
          }
        });
      } else {
        // LEGACY: Build from warnings array
        if (result.title && result.content) {
          successMessages.push('✅ Article generated successfully');
        }
        if (result.seo?.title && result.seo?.meta_description) {
          successMessages.push('✅ SEO metadata generated successfully');
        }
        if (result.images?.featured?.url) {
          successMessages.push('✅ Images generated successfully');
        }

        warnings.forEach((warning: any) => {
          if (warning.step === 'image_generation' || warning.step === 'image') {
            warningMessages.push(`⚠️ Image generation failed: ${warning.message}`);
          } else {
            warningMessages.push(`⚠️ ${warning.step}: ${warning.message}`);
          }
        });
      }

      // AI Generator v2: Handle question-answer structure
      // Check if v2 format (has sections) or legacy format
      const isV2Format = result.sections && Array.isArray(result.sections);
      
      let contentToUse = '';
      if (isV2Format) {
        // v2: Content already assembled from sections
        contentToUse = result.content || '';
        
        // Show sections in preview
        const sectionsPreview = result.sections.map((s: any, idx: number) => {
          const statusIcon = s.qc_status === 'PASS' ? '✅' : '❌';
          return `${statusIcon} Q${idx + 1}: ${s.question}\n${s.answer_html.substring(0, 200)}...`;
        }).join('\n\n');
        setAiPreview(`=== AI Generator v2 ===\nIntent: ${result.intent}\n\n${sectionsPreview}`);
      } else {
        // Legacy format: Use content_html if available, otherwise use content
        contentToUse = result.content_html || result.content || result.data?.content_html || result.data?.content || '';
        setAiPreview(contentToUse);
      }
      
      // Store QC status in seoSchema for publish validation
      let seoSchema: any = {};
      if (isV2Format && result.sections) {
        const qcStatus = result.sections.every((s: any) => s.qc_status === 'PASS') ? 'PASS' : 'FAIL';
        const qcFailedSections = result.sections.filter((s: any) => s.qc_status === 'FAIL').length;
        seoSchema = {
          qc_status: qcStatus,
          qc_failed_sections: qcFailedSections,
          sections: result.sections.map((s: any) => ({
            question: s.question,
            qc_status: s.qc_status,
            failure_reason: s.failure_reason,
          })),
        };
      }

      // LAST LOCK: Set status to GENERATED after AI generation
      setArticleStatus('GENERATED');

      // LAST LOCK: Update category_id and intent_type from AI response if available
      setFormData((prev) => {
        const newCategoryId = result.product_aware?.category?.id || prev.category_id;
        const newIntentType = result.product_aware?.intent_type || prev.intent_type;
        
        return {
          ...prev,
          title: result.title || result.data?.title || prev.title,
          slug: result.slug || prev.slug,
          excerpt: result.excerpt || prev.excerpt,
          content: contentToUse || prev.content,
          seoTitle: result.seo?.title || result.data?.seo?.title || prev.seoTitle,
          seoDescription: result.seo?.meta_description || result.data?.seo?.meta_description || prev.seoDescription,
          primaryKeyword: result.seo?.primary_keyword || result.data?.seo?.primary_keyword || primaryKeyword,
          secondaryKeywords: result.seo?.secondary_keywords?.join(', ') || result.data?.seo?.secondary_keywords?.join(', ') || prev.secondaryKeywords,
          featuredImageUrl: result.images?.featured?.url || result.data?.images?.featured || prev.featuredImageUrl,
          // EKSEKUSI B: Store image_map for rendering
          imageMap: result.image_map || result.data?.image_map || [],
          seoSchema: Object.keys(seoSchema).length > 0 ? seoSchema : prev.seoSchema,
          // LAST LOCK: Store product-aware metadata
          category_id: newCategoryId,
          intent_type: newIntentType,
        };
      });

      // B3: Auto-save draft after generation
      if (isEdit && post?.id) {
        // Auto-save existing post as draft
        try {
          const savePayload: any = {
            title: result.title || result.data?.title || formData.title,
            content: contentToUse || formData.content,
            excerpt: result.excerpt || formData.excerpt,
            seoTitle: result.seo?.title || result.data?.seo?.title || formData.seoTitle,
            seoDescription: result.seo?.meta_description || result.data?.seo?.meta_description || formData.seoDescription,
            seoSchema: Object.keys(seoSchema).length > 0 ? seoSchema : formData.seoSchema,
            status: 'DRAFT', // Keep as draft
            // LAST LOCK: Save category and intent
            unifiedCategoryId: result.product_aware?.category?.id || formData.category_id,
            intentType: result.product_aware?.intent_type || formData.intent_type,
          };
          
          await fetch(`/api/admin/blog/posts/${post.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(savePayload),
          });
          // EKSEKUSI: Trigger re-validation after AI generate
          try {
            const recheckResponse = await fetch('/api/admin/validate/recheck', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                entity: 'blog',
                id: post.id,
              }),
            });
            
            if (recheckResponse.ok) {
              const recheckData = await recheckResponse.json().catch(() => ({}));
              const status = recheckData.status || 'INVALID';
              
              // PHASE B: Update validation status
              setValidationStatus(status as 'READY' | 'INVALID');
              
              // PHASE B: Clear validation error if status is READY
              if (status === 'READY') {
                setError('');
              }
            }
          } catch (recheckError) {
            if (process.env.NODE_ENV === 'development') {
              console.error('[BLOG-FORM] Recheck validation failed (non-blocking):', recheckError);
            }
          }
        } catch (saveError) {
          if (process.env.NODE_ENV === 'development') {
            console.error('[BLOG-FORM] Auto-save failed (non-blocking):', saveError);
          }
        }
      }

      // AI Generator v2: Show QC status warnings
      if (isV2Format && result.sections) {
        const failedSections = result.sections.filter((s: any) => s.qc_status === 'FAIL');
        if (failedSections.length > 0) {
          const failedQuestions = failedSections.map((s: any) => s.question).join(', ');
          warningMessages.push(`⚠️ ${failedSections.length} section(s) gagal quality check: ${failedQuestions.substring(0, 100)}...`);
          setError(`⚠️ ${failedSections.length} section(s) gagal quality check. Silakan review dan regenerate section yang gagal.`);
          setTimeout(() => setError(''), 10000);
        }
        
        // Show success for passed sections
        const passedSections = result.sections.filter((s: any) => s.qc_status === 'PASS');
        if (passedSections.length > 0) {
          successMessages.push(`✅ ${passedSections.length} section(s) lulus quality check`);
        }
      }

      // PARTIAL-SAFE: Show honest success/warning message (jujur per-step)
      if (warningMessages.length > 0) {
        // Partial success: show both success and warnings
        const message = `${successMessages.join(' | ')}\n${warningMessages.join('\n')}`;
        setSuccess(message);
        // Also show warning in error area (non-blocking)
        setError(warningMessages.join(' | '));
        setTimeout(() => setError(''), 8000);
      } else {
        // Full success
        setSuccess('Artikel berhasil di-generate. Silakan review dan edit jika diperlukan sebelum save.');
      }
      setTimeout(() => setSuccess(null), 8000);
    } catch (err: any) {
      if (process.env.NODE_ENV === 'development') {
        console.error('[BLOG-FORM] AI Generate error:', err);
      }
      
      // PARTIAL-SAFE: Extract explicit error info (jujur, tidak generic)
      // NO GENERIC "AI generation failed" - use step-specific error
      let errorMessage = err.message || 'Gagal generate artikel';
      
      // Check if error message contains step info
      if (!errorMessage.includes('Gagal di') && !errorMessage.includes('failed')) {
        // If no step info, try to extract from error structure
        if (err.step) {
          errorMessage = `Gagal di ${err.step}: ${errorMessage}`;
        }
      }
      
      // Show honest error message (tidak generic "AI generation failed")
      setError(errorMessage);
      if (process.env.NODE_ENV === 'development') {
        console.error('[BLOG-FORM] Full error:', {
          message: err.message,
          step: err.step,
          stack: err.stack,
          error: err,
        });
      }
      
      setTimeout(() => setError(''), 10000); // Show error for 10 seconds
    } finally {
      setAiLoading(false);
    }
  };

  // PHASE B2: Accept AI Content (fields already populated, just clear preview)
  const handleAcceptAI = () => {
    setAiPreview(null);
    setSuccess('Konten AI telah diterima. Silakan edit jika diperlukan sebelum save.');
    setTimeout(() => setSuccess(null), 5000);
  };

  // Handle save (create or update)
  const handleSave = async (targetStatus?: 'DRAFT' | 'REVIEW') => {
    // LAST LOCK: Validate before save
    if (targetStatus === 'REVIEW' && !isFormValidForReview()) {
      return;
    }

    setLoading(true);
    setError('');
    setSuccess(null);

    try {
      const payload: any = {
        title: formData.title,
        slug: formData.slug,
        content: formData.content,
        contentMode: contentMode, // M-07: Always send contentMode
        excerpt: formData.excerpt || null,
        seoTitle: formData.seoTitle || null,
        seoDescription: formData.seoDescription || null,
        // seoKeywords removed - not used by engine (only primaryKeyword & secondaryKeywords are used)
        primaryKeyword: formData.primaryKeyword || null,
        secondaryKeywords: formData.secondaryKeywords
          ? formData.secondaryKeywords.split(',').map((k) => k.trim()).filter(Boolean)
          : [],
        scheduledAt: formData.scheduledAt ? new Date(formData.scheduledAt).toISOString() : null,
        // LAST LOCK: Required fields
        unifiedCategoryId: formData.category_id || null,
        intentType: formData.intent_type || null,
        articleStatus: articleStatus, // GENERATED / VALIDATED
      };

      if (targetStatus) {
        payload.status = targetStatus;
      }

      const url = isEdit
        ? `/api/admin/blog/posts/${post.id}`
        : '/api/admin/blog/posts';
      const method = isEdit ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Gagal menyimpan post');
      }

      // PHASE F: Notification untuk save success
      showNotification('Post berhasil disimpan', 'success', {
        title: 'Berhasil',
        duration: 2000,
      });
      setSuccess('Post berhasil disimpan');
      setTimeout(() => {
        router.push('/admin/blog/posts');
        router.refresh();
      }, 1500);
    } catch (err: any) {
      // PHASE F: Notification untuk error
      showNotification(err.message || 'Terjadi kesalahan', 'error', {
        title: 'Error',
        duration: 5000,
      });
      setError(err.message || 'Terjadi kesalahan');
    } finally {
      setLoading(false);
    }
  };

  // FASE 2.2: Submit for Review (with checklist)
  const handleSubmitForReview = async () => {
    // LAST LOCK: Validate required fields
    if (!isFormValidForReview()) {
      return;
    }

    if (!canSubmitForReview) {
      setShowReviewChecklist(true);
      setError('Silakan lengkapi checklist sebelum submit untuk review');
      setTimeout(() => setError(''), 5000);
      return;
    }

    await handleSave('REVIEW');
  };

  // LAST LOCK: Validate article (set status to VALIDATED)
  const handleValidateArticle = async () => {
    setArticleStatus('VALIDATED');
    setSuccess('Artikel telah divalidasi. Sekarang bisa submit untuk review.');
    setTimeout(() => setSuccess(null), 5000);
  };

  // FASE 2.2: Publish (from REVIEW or READY_TO_PUBLISH)
  const handlePublish = async () => {
    if (!isEdit) {
      setError('Post harus disimpan terlebih dahulu sebelum publish');
      setTimeout(() => setError(''), 5000);
      return;
    }

    // PHASE S: Can publish from READY_TO_PUBLISH (after approval)
    // Also backward compatible: can publish from REVIEW
    if (post.status === 'DRAFT') {
      setError('Post harus dalam status REVIEW atau READY_TO_PUBLISH sebelum publish. Silakan submit untuk review atau approve terlebih dahulu.');
      setTimeout(() => setError(''), 5000);
      return;
    }

    if (post.status !== 'REVIEW' && post.status !== 'READY_TO_PUBLISH') {
      setError('Post hanya bisa di-publish dari status REVIEW atau READY_TO_PUBLISH');
      setTimeout(() => setError(''), 5000);
      return;
    }

    if (!confirm('Yakin ingin publish post ini? Slug tidak bisa diubah setelah publish.')) {
      return;
    }

    setLoading(true);
    setError('');
    setSuccess(null);

    // M-08: Generate idempotency key for double-click protection
    const idempotencyKey = `publish-${post.id}-${Date.now()}`;

    try {
      const response = await fetch(`/api/admin/blog/posts/${post.id}/publish`, {
        method: 'POST',
        headers: {
          'x-idempotency-key': idempotencyKey, // M-08
        },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Gagal publish post');
      }

      // PHASE F: Notification untuk publish success
      showNotification('Post berhasil dipublish', 'success', {
        title: 'Berhasil',
        duration: 2000,
      });
      setSuccess('Post berhasil dipublish');
      setTimeout(() => {
        router.push('/admin/blog/posts');
        router.refresh();
      }, 1500);
    } catch (err: any) {
      // PHASE F: Notification untuk error
      showNotification(err.message || 'Terjadi kesalahan', 'error', {
        title: 'Error',
        duration: 5000,
      });
      setError(err.message || 'Terjadi kesalahan');
      setLoading(false);
    }
  };

  // FASE 2.2: Archive
  const handleArchive = async () => {
    if (!confirm('Yakin ingin archive post ini? Post tidak akan dihapus, hanya diarsipkan.')) {
      return;
    }

    if (!isEdit) {
      setError('Post harus disimpan terlebih dahulu');
      setTimeout(() => setError(''), 5000);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/admin/blog/posts/${post.id}/archive`, {
        method: 'POST',
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Gagal archive post');
      }

      // PHASE F: Notification untuk archive success
      showNotification('Post berhasil diarchive', 'success', {
        title: 'Berhasil',
        duration: 2000,
      });
      router.push('/admin/blog/posts');
      router.refresh();
    } catch (err: any) {
      // PHASE F: Notification untuk error
      showNotification(err.message || 'Terjadi kesalahan', 'error', {
        title: 'Error',
        duration: 5000,
      });
      setError(err.message || 'Terjadi kesalahan');
      setLoading(false);
    }
  };

  // PHASE S: Schedule post
  const handleSchedule = async () => {
    if (!isEdit) {
      setError('Post harus disimpan terlebih dahulu');
      setTimeout(() => setError(''), 5000);
      return;
    }

    if (!formData.scheduledAt) {
      setError('Tanggal dan jam jadwal harus diisi');
      setTimeout(() => setError(''), 5000);
      return;
    }

    // EKSEKUSI: Allow scheduling for DRAFT, REVIEW, READY_TO_PUBLISH
    if (post.status !== 'DRAFT' && post.status !== 'REVIEW' && post.status !== 'READY_TO_PUBLISH') {
      setError('Hanya post dengan status DRAFT, REVIEW, atau READY_TO_PUBLISH yang bisa dijadwalkan');
      setTimeout(() => setError(''), 5000);
      return;
    }

    setLoading(true);
    setError('');
    setSuccess(null);

    try {
      const response = await fetch(`/api/admin/blog/posts/${post.id}/schedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scheduledAt: new Date(formData.scheduledAt).toISOString(),
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Gagal menjadwalkan post');
      }

      setSuccess('Post berhasil dijadwalkan. Post akan ditandai sebagai READY_TO_PUBLISH saat waktu tiba, tetapi tetap memerlukan approval manual untuk publish.');
      setTimeout(() => {
        router.refresh();
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan');
      setLoading(false);
    }
  };

  // PHASE S: Approve post
  const handleApprove = async () => {
    if (!isEdit) {
      setError('Post harus disimpan terlebih dahulu');
      setTimeout(() => setError(''), 5000);
      return;
    }

    if (post.status !== 'SCHEDULED' && post.status !== 'READY_TO_PUBLISH') {
      setError('Hanya post dengan status SCHEDULED atau READY_TO_PUBLISH yang bisa disetujui');
      setTimeout(() => setError(''), 5000);
      return;
    }

    if (!confirm('Yakin ingin menyetujui post ini untuk publish? Post akan ditandai sebagai READY_TO_PUBLISH. Publish masih harus dilakukan manual.')) {
      return;
    }

    setLoading(true);
    setError('');
    setSuccess(null);

    try {
      const response = await fetch(`/api/admin/blog/posts/${post.id}/approve`, {
        method: 'POST',
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Gagal menyetujui post');
      }

      setSuccess('Post berhasil disetujui dan siap untuk publish. Gunakan tombol Publish untuk mempublish post ini.');
      setTimeout(() => {
        router.refresh();
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan');
      setLoading(false);
    }
  };

  // PHASE S: Cancel schedule
  const handleCancelSchedule = async () => {
    if (!isEdit) {
      setError('Post harus disimpan terlebih dahulu');
      setTimeout(() => setError(''), 5000);
      return;
    }

    if (post.status !== 'SCHEDULED' && post.status !== 'READY_TO_PUBLISH') {
      setError('Hanya post dengan status SCHEDULED atau READY_TO_PUBLISH yang bisa dibatalkan jadwalnya');
      setTimeout(() => setError(''), 5000);
      return;
    }

    if (!confirm('Yakin ingin membatalkan jadwal post ini? Status akan berubah menjadi CANCELLED.')) {
      return;
    }

    setLoading(true);
    setError('');
    setSuccess(null);

    try {
      const response = await fetch(`/api/admin/blog/posts/${post.id}/cancel-schedule`, {
        method: 'POST',
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Gagal membatalkan jadwal');
      }

      setSuccess('Jadwal berhasil dibatalkan. Status post berubah menjadi CANCELLED.');
      setTimeout(() => {
        router.refresh();
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan');
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Success/Error Messages */}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg">
          {success}
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/admin/blog/posts"
            className="text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {isEdit ? 'Edit Blog Post' : 'Buat Blog Post Baru'}
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              {isEdit && isPublished && '⚠️ Post sudah published. Slug tidak bisa diubah.'}
              {/* PHASE S: Status labels */}
              {isEdit && isScheduled && (
                <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                  ⏰ Menunggu waktu ({post.scheduledAt ? new Date(post.scheduledAt).toLocaleString('id-ID') : ''})
                </span>
              )}
              {isEdit && isReadyToPublish && (
                <span className="ml-2 px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs font-medium">
                  ✅ Siap dipublish {post.approvedAt && `(disetujui ${new Date(post.approvedAt).toLocaleString('id-ID')} oleh ${post.approver?.name || 'admin'})`}
                </span>
              )}
              {isEdit && isCancelled && (
                <span className="ml-2 px-2 py-1 bg-red-100 text-red-800 rounded text-xs font-medium">
                  ❌ Dibatalkan
                </span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Error Display (legacy - keeping for compatibility) */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Quality Guard Warnings */}
      {qualityWarnings.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-5 w-5 mt-0.5" />
            <div>
              <p className="font-medium mb-1">Quality Guard Warnings:</p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                {qualityWarnings.map((warning, idx) => (
                  <li key={idx}>{warning}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* EKSEKUSI 1: AI Blog Control Panel & SEO Intelligence */}
      {isEdit && post?.id && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <AIBlogControlPanel 
            blogId={post.id} 
            categoryId={formData.category_id}
            intentType={formData.intent_type}
            onConfirmationChange={(confirmed) => setAiConfirmationChecked(confirmed)}
          />
          <SEOIntelligencePanel blogId={post.id} />
        </div>
      )}

      {/* Form */}
      <div className="bg-white rounded-lg shadow p-6 space-y-6">
        {/* REMOVED: Keyword Intake Panel - Field tidak dipakai engine, hanya UI-level dummy */}
        {/* Field yang dihapus: keyword, searchIntent, notes - tidak dipakai dalam logic generate */}

        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Judul * (min. 20 karakter)
          </label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => handleChange('title', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
            placeholder="Judul post..."
            required
          />
          <p className="text-xs text-gray-500 mt-1">
            {formData.title.length} karakter {formData.title.length >= 20 ? '✓' : '(min. 20)'}
          </p>
        </div>

        {/* Slug */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Slug * {slugLocked && '(Terkunci setelah publish)'}
          </label>
          <input
            type="text"
            value={formData.slug}
            onChange={(e) => !slugLocked && handleChange('slug', e.target.value)}
            disabled={slugLocked}
            className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 ${
              slugLocked ? 'bg-gray-100 cursor-not-allowed' : ''
            }`}
            placeholder="slug-post"
            required
          />
        </div>

        {/* LAST LOCK: Category & Intent Type (Required) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Kategori * (Leaf Category)
            </label>
            <select
              value={formData.category_id}
              onChange={(e) => handleChange('category_id', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
              required
            >
              <option value="">Pilih Kategori</option>
              {loadingCategories ? (
                <option disabled>Loading...</option>
              ) : (
                categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.path} (Level {cat.level})
                  </option>
                ))
              )}
            </select>
            {!formData.category_id && (
              <p className="text-xs text-red-600 mt-1">Kategori wajib dipilih</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Intent Type *
            </label>
            <select
              value={formData.intent_type}
              onChange={(e) => handleChange('intent_type', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
              required
            >
              <option value="">Pilih Intent</option>
              <option value="cara">Cara</option>
              <option value="panduan">Panduan</option>
              <option value="tips">Tips</option>
              <option value="rekomendasi">Rekomendasi</option>
              <option value="perbandingan">Perbandingan</option>
              <option value="solusi">Solusi</option>
            </select>
            {!formData.intent_type && (
              <p className="text-xs text-red-600 mt-1">Intent Type wajib dipilih</p>
            )}
          </div>
        </div>

        {/* LAST LOCK: Article Status Indicator */}
        {articleStatus === 'GENERATED' && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-yellow-900">Artikel Status: GENERATED</p>
                <p className="text-sm text-yellow-700 mt-1">
                  Artikel telah di-generate oleh AI. Silakan validasi sebelum submit review.
                </p>
              </div>
              <button
                type="button"
                onClick={handleValidateArticle}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium"
              >
                Validasi Artikel
              </button>
            </div>
          </div>
        )}

        {/* Excerpt */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Excerpt (Opsional)
          </label>
          <textarea
            value={formData.excerpt}
            onChange={(e) => handleChange('excerpt', e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
            placeholder="Ringkasan singkat post..."
          />
        </div>

        {/* FITUR 5: Featured Image Upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Featured Image (Opsional)
          </label>
          <div className="space-y-3">
            {formData.featuredImageUrl && (
              <div className="relative inline-block">
                <img
                  src={formData.featuredImageUrl}
                  alt="Featured"
                  className="max-w-md h-48 object-cover rounded-lg border border-gray-300"
                />
                <button
                  type="button"
                  onClick={() => setFormData((prev) => ({ ...prev, featuredImageUrl: '' }))}
                  className="absolute top-2 right-2 bg-red-600 text-white rounded-full p-1 hover:bg-red-700"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
            <div className="flex gap-3">
              <label className="flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      handleImageUpload(file);
                    }
                  }}
                  className="hidden"
                  disabled={uploadingImage}
                />
                <Upload className="h-4 w-4" />
                <span className="text-sm text-gray-700">
                  {uploadingImage ? 'Uploading...' : 'Upload Gambar'}
                </span>
              </label>
              <input
                type="text"
                value={formData.featuredImageUrl}
                onChange={(e) => handleChange('featuredImageUrl', e.target.value)}
                placeholder="Atau masukkan URL gambar"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
              />
            </div>
            <p className="text-xs text-gray-500">
              Upload gambar atau masukkan URL. Format yang didukung: JPG, PNG, GIF, WebP. Maksimal 5MB.
            </p>
          </div>
        </div>

        {/* Content */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-sm font-medium text-gray-700">
              Konten * (min. 300 kata)
            </label>
            <div className="flex items-center gap-2">
              {/* M-07: TEXT ↔ HTML Toggle (deterministic) */}
              <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                <button
                  type="button"
                  onClick={() => setContentMode('TEXT')}
                  className={`flex items-center gap-1 px-3 py-1.5 text-xs rounded transition-colors ${
                    contentMode === 'TEXT'
                      ? 'bg-white text-gray-900 shadow-sm font-medium'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                  title="Teks polos, aman"
                >
                  <FileText className="h-3.5 w-3.5" />
                  TEXT
                </button>
                <button
                  type="button"
                  onClick={() => setContentMode('HTML')}
                  className={`flex items-center gap-1 px-3 py-1.5 text-xs rounded transition-colors ${
                    contentMode === 'HTML'
                      ? 'bg-white text-gray-900 shadow-sm font-medium'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                  title="Konten HTML terformat"
                >
                  <Code2 className="h-3.5 w-3.5" />
                  HTML
                </button>
              </div>
              {/* PHASE B2: Generate Artikel (AI) Button */}
              <button
                type="button"
                onClick={handleAIGenerate}
                disabled={aiLoading || (!formData.title && !formData.primaryKeyword)}
                className="text-sm px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium"
              >
                <Sparkles className="h-4 w-4" />
                {aiLoading ? 'Generating...' : 'Generate Artikel (AI)'}
              </button>
            </div>
          </div>
          {/* M-07: TEXT ↔ HTML Editor (deterministic rendering) */}
          {contentMode === 'TEXT' ? (
            <textarea
              value={formData.content}
              onChange={(e) => handleChange('content', e.target.value)}
              rows={20}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 text-sm"
              placeholder="Tulis konten post sebagai teks polos (tanpa tag HTML)..."
              style={{ whiteSpace: 'pre-wrap', minHeight: '400px' }}
            />
          ) : contentMode === 'HTML' && isMounted && ReactQuill ? (
            <div className="bg-white border border-gray-300 rounded-lg">
              <ReactQuill
                theme="snow"
                value={formData.content}
                onChange={(value) => handleChange('content', value)}
                modules={{
                  toolbar: [
                    [{ 'header': [2, 3, false] }],
                    ['bold', 'italic', 'underline'],
                    [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                    ['link', 'image'],
                    ['clean']
                  ],
                }}
                formats={['header', 'bold', 'italic', 'underline', 'list', 'bullet', 'link', 'image']}
                placeholder="Tulis konten post dalam format HTML..."
                className="bg-white"
                style={{ minHeight: '400px' }}
              />
            </div>
          ) : (
            <div className="w-full min-h-[400px] px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 flex items-center justify-center">
              <p className="text-gray-500">Loading editor...</p>
            </div>
          )}
          <p className="text-xs text-gray-500 mt-1">
            {/* AI Generator v2: No word count requirement - focus on quality answers */}
            {(() => {
              const textContent = formData.content.replace(/<[^>]*>/g, ' ').trim();
              const wordCount = textContent.split(/\s+/).filter(Boolean).length;
              return `${wordCount} kata (AI Generator v2: Quality over quantity)`;
            })()}
          </p>

          {/* PHASE B2: AI Generated Content Preview */}
          {aiPreview && (
            <div className="mt-4 p-4 bg-purple-50 border border-purple-200 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-purple-900">Konten AI Generated</p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleAcceptAI}
                    className="text-xs px-3 py-1 bg-purple-600 text-white rounded hover:bg-purple-700"
                  >
                    Tutup Preview
                  </button>
                  <button
                    type="button"
                    onClick={() => setAiPreview(null)}
                    className="text-xs px-3 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                  >
                    Tutup
                  </button>
                </div>
              </div>
              <div className="text-sm text-gray-700 whitespace-pre-wrap bg-white p-3 rounded border max-h-96 overflow-y-auto">
                {aiPreview}
              </div>
              <p className="text-xs text-gray-500 mt-2">
                💡 Konten sudah terisi ke form. Silakan edit jika diperlukan sebelum save.
              </p>
            </div>
          )}
        </div>

        {/* PHASE S: Scheduling Section */}
        <div className="border-t pt-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">PHASE S: Jadwal & Approval</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tanggal & Jam Publish
              </label>
              <input
                type="datetime-local"
                value={formData.scheduledAt}
                onChange={(e) => handleChange('scheduledAt', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                disabled={
                  !isEdit || 
                  (post?.status !== 'REVIEW' && post?.status !== 'READY_TO_PUBLISH' && post?.status !== 'DRAFT') ||
                  (validationStatus !== null && validationStatus !== 'READY')
                }
              />
              {!isEdit && (
                <p className="text-xs text-gray-500 mt-1">
                  Simpan post terlebih dahulu untuk mengatur jadwal
                </p>
              )}
              {isEdit && post?.status !== 'REVIEW' && post?.status !== 'READY_TO_PUBLISH' && post?.status !== 'DRAFT' && (
                <p className="text-xs text-gray-500 mt-1">
                  Calendar aktif hanya untuk status DRAFT, REVIEW, atau READY_TO_PUBLISH
                </p>
              )}
              {formData.scheduledAt && isEdit && isDraft && (
                <p className="text-xs text-blue-600 mt-1">
                  📅 Akan dijadwalkan: {new Date(formData.scheduledAt).toLocaleString('id-ID')}
                </p>
              )}
            </div>

            {/* PHASE S: Schedule Button */}
            {/* EKSEKUSI: Allow scheduling for DRAFT, REVIEW, READY_TO_PUBLISH */}
            {isEdit && (isDraft || isReadyToPublish || post?.status === 'REVIEW') && formData.scheduledAt && (
              <button
                onClick={handleSchedule}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                📅 Schedule
              </button>
            )}

            {/* PHASE S: Approve & Publish Button */}
            {isEdit && (isScheduled || isReadyToPublish) && canApprove && (
              <div className="flex gap-2">
                <button
                  onClick={handleApprove}
                  disabled={loading}
                  className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  ✅ Approve & Mark Ready
                </button>
                {isReadyToPublish && canPublish && (
                  <button
                    onClick={handlePublish}
                    disabled={loading}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    🚀 Publish Now
                  </button>
                )}
              </div>
            )}

            {/* PHASE S: Cancel Schedule Button */}
            {isEdit && (isScheduled || isReadyToPublish) && (
              <button
                onClick={handleCancelSchedule}
                disabled={loading}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                ❌ Cancel Schedule
              </button>
            )}

            {/* PHASE S: Warning */}
            <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg text-sm">
              <p className="font-medium mb-1">⚠️ PRINSIP KERAS PHASE S:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>TIDAK ADA AUTO-PUBLISH</li>
                <li>Publish tetap lewat approval manusia</li>
                <li>Scheduler hanya menandai "siap publish"</li>
              </ul>
            </div>
          </div>
        </div>

        {/* SEO Panel (Collapsed by default) */}
        <div className="border-t pt-6">
          <button
            type="button"
            onClick={() => setShowSeoPanel(!showSeoPanel)}
            className="flex items-center justify-between w-full text-left text-sm font-medium text-gray-700 mb-4"
          >
            <span>SEO Panel {showSeoPanel ? '▼' : '▶'}</span>
          </button>

          {showSeoPanel && (
            <div className="space-y-4 pl-4 border-l-2 border-gray-200">
              {/* M-06: SEO Source Indicator */}
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-medium text-gray-600">Sumber SEO:</span>
                {seoManual ? (
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                    MANUAL
                  </span>
                ) : (
                  <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium">
                    AUTO
                  </span>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  SEO Title
                </label>
                <input
                  type="text"
                  value={formData.seoTitle}
                  onChange={(e) => handleChange('seoTitle', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  placeholder="SEO title..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  SEO Description
                </label>
                <textarea
                  value={formData.seoDescription}
                  onChange={(e) => handleChange('seoDescription', e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  placeholder="SEO description..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Primary Keyword
                </label>
                <input
                  type="text"
                  value={formData.primaryKeyword}
                  onChange={(e) => handleChange('primaryKeyword', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  placeholder="Primary keyword..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Secondary Keywords (comma-separated)
                </label>
                <input
                  type="text"
                  value={formData.secondaryKeywords}
                  onChange={(e) => handleChange('secondaryKeywords', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  placeholder="keyword1, keyword2, keyword3"
                />
              </div>
            </div>
          )}
        </div>

        {/* FASE 2.2: Review Checklist */}
        {showReviewChecklist && (
          <div className="border-t pt-4">
            <p className="text-sm font-medium text-gray-700 mb-2">Review Checklist:</p>
            <div className="space-y-2 pl-4">
              <div className="flex items-center gap-2">
                {reviewChecklist.titleClear ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                )}
                <span className="text-sm text-gray-700">Judul jelas (min. 20 karakter)</span>
              </div>
              <div className="flex items-center gap-2">
                {reviewChecklist.contentNotPlaceholder ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                )}
                <span className="text-sm text-gray-700">Konten tidak placeholder</span>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-4 pt-4 border-t">
          {/* PHASE F: "Lihat di Website" button (hanya jika PUBLISHED dan ada slug) */}
          {isEdit && post?.status === 'PUBLISHED' && post?.slug && (
            <a
              href={`/blog/${post.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <ExternalLink className="h-4 w-4" />
              Lihat di Website
            </a>
          )}
          <Link
            href="/admin/blog/posts"
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Batal
          </Link>
          <button
            onClick={() => handleSave('DRAFT')}
            disabled={loading || !formData.title || !formData.slug || !formData.content}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Save className="h-4 w-4" />
            {loading ? 'Menyimpan...' : 'Save Draft'}
          </button>
          <button
            onClick={handleSubmitForReview}
            disabled={loading || !formData.title || !formData.slug || !formData.content || articleStatus === 'GENERATED'}
            className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            title={articleStatus === 'GENERATED' ? 'Artikel harus divalidasi terlebih dahulu' : ''}
          >
            <Eye className="h-4 w-4" />
            Submit for Review
          </button>
          {canPublish && isReview && (
            <button
              onClick={handlePublish}
              disabled={loading}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Send className="h-4 w-4" />
              Publish
            </button>
          )}
          {isEdit && post.status !== 'ARCHIVED' && (
            <button
              onClick={handleArchive}
              disabled={loading}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Archive className="h-4 w-4" />
              Archive
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
