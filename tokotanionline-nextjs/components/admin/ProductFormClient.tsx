/**
 * FASE 2.1 — ADMIN PRODUCT FORM (GENERAL + AI COPY ASSIST)
 * 
 * Features:
 * - General form (lintas niche)
 * - Sections: Identitas, Deskripsi & Konten, Media, Harga & Inventori, SEO
 * - AI Copy Assist (manual, preview-only, guarded)
 * - Manual Publish button (separate from Save DRAFT)
 */

'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Save, Upload, X, Sparkles, Check, XCircle, Code2, FileText, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { PRODUCT_STATUS } from '@/lib/product-rules';
import { hasPermission } from '@/lib/permissions';
import { ensureProductExtraInfo } from '@/lib/product-extra-info';
import { useNotification } from '@/lib/notification-context';
import { validateProductPhaseA, generateSlugFromTitle } from '@/lib/product-validation-phase-a';
// PHASE S+: Legacy AI_COPY_ASSIST_ENABLED removed - using Product v2 AI Generator instead
import dynamic from 'next/dynamic';
import { useEngineState } from '@/lib/hooks/useEngineState';
// M-10: Generate UUID for idempotency (browser-compatible)
const generateIdempotencyKey = () => {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.randomUUID) {
    return window.crypto.randomUUID();
  }
  // Fallback for older browsers
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}-${Math.random().toString(36).substring(2, 15)}`;
};

// Dynamic import untuk Quill (client-side only)
const ReactQuill = dynamic(() => import('react-quill'), { ssr: false });
import 'react-quill/dist/quill.snow.css';

const productSchema = z.object({
  name: z.string().min(1, 'Nama produk diperlukan'),
  slug: z.string().min(1, 'Slug diperlukan'),
  categoryId: z.string().min(1, 'Kategori diperlukan'),
  subCategoryId: z.string().nullable().optional(),
  status: z.enum([PRODUCT_STATUS.DRAFT, PRODUCT_STATUS.PUBLISHED, PRODUCT_STATUS.ARCHIVED]).optional(),
  description: z.string().min(1, 'Deskripsi diperlukan'),
  shortDescription: z.string().optional(),
  specifications: z.string().optional(), // FITUR 4: Rich text specifications
  sku: z.string().optional(), // FITUR 4: Stock Keeping Unit
  problemSolution: z.string().optional(),
  applicationMethod: z.string().optional(),
  dosage: z.string().optional(),
  advantages: z.string().optional(),
  safetyNotes: z.string().optional(),
  price: z.number().min(0, 'Harga harus positif'),
  discountPrice: z.number().optional().nullable(),
  stock: z.number().min(0, 'Stok harus positif'),
  unit: z.string().min(1, 'Unit diperlukan'),
  imageUrl: z.string().optional(),
  images: z.array(z.string()).optional(),
  isFeatured: z.boolean(),
  isActive: z.boolean(),
  badge: z.string().optional(),
  salesWeight: z.number().optional(),
  metaTitle: z.string().optional(),
  metaDescription: z.string().optional(),
  seoSchema: z.string().optional(), // QC status and SEO data stored as JSON string
  shopeeUrl: z.string().url().optional().or(z.literal('')),
  tokopediaUrl: z.string().url().optional().or(z.literal('')),
  whatsappCta: z.string().optional(),
  marketplaceCta: z.string().optional(),
  scarcityText: z.string().optional(),
  features: z.array(z.string()).optional(),
  cropType: z.string().optional(),
  pestTargets: z.array(z.string()).optional(),
  activeIngredients: z.array(z.string()).optional(),
  packagingVariants: z.array(z.string()).optional(),
  usageStage: z.string().optional(),
});

type ProductFormData = z.infer<typeof productSchema>;

interface Category {
  id: string;
  name: string;
  slug: string;
  parentId?: string | null;
  parent?: Category | null;
  children?: Category[];
}

interface ProductFormClientProps {
  categories: Category[];
  product?: any;
  userRole?: string;
}

export default function ProductFormClient({
  categories,
  product,
  userRole,
}: ProductFormClientProps) {
  const router = useRouter();
  const { showNotification } = useNotification();
  const { canRunAI, getAIDisableReason } = useEngineState();
  const [loading, setLoading] = useState(false);
  const [publishing, setPublishing] = useState(false);
  // M-10: Single submit guard untuk mencegah double click
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(''); // Keep for form validation errors
  const [success, setSuccess] = useState<string | null>(null); // Keep for compatibility
  const [uploadingMainImage, setUploadingMainImage] = useState(false);
  // PHASE S: Scheduling state
  const [scheduledAt, setScheduledAt] = useState<string>(
    product?.scheduledAt ? new Date(product.scheduledAt).toISOString().slice(0, 16) : ''
  );
  
  // PHASE S+: Legacy AI Copy Assist removed - using Product v2 AI Generator instead

  // PHASE B: AI Generator State Machine (WAJIB DITERAPKAN)
  type AIState = 'AI_IDLE' | 'AI_GENERATING' | 'AI_FAILED' | 'AI_READY';
  const [aiState, setAiState] = useState<AIState>('AI_IDLE');
  const [aiError, setAiError] = useState<string>(''); // Clear error reason for AI_FAILED
  const [aiInputSnapshot, setAiInputSnapshot] = useState<any>(null); // For audit
  const [aiOutputSnapshot, setAiOutputSnapshot] = useState<any>(null); // For audit

  // PHASE C: Image Pipeline State Machine (WAJIB DITERAPKAN)
  type ImageState = 'IMAGE_IDLE' | 'IMAGE_GENERATING' | 'IMAGE_FAILED' | 'IMAGE_READY';
  const [imageState, setImageState] = useState<ImageState>('IMAGE_IDLE');
  const [imageError, setImageError] = useState<string>(''); // Clear error reason for IMAGE_FAILED
  const [imageInputSnapshot, setImageInputSnapshot] = useState<any>(null); // For audit
  const [imageOutputSnapshot, setImageOutputSnapshot] = useState<any>(null); // For audit

  // PHASE C1: Editor mode state - Default Visual (Rich Text Editor)
  const [descriptionMode, setDescriptionMode] = useState<'visual' | 'html'>('visual');
  const [specificationsMode, setSpecificationsMode] = useState<'visual' | 'html'>('visual');
  const [isMounted, setIsMounted] = useState(false);

  // M-09: Track which fields are manually edited vs auto-filled
  const [fieldSource, setFieldSource] = useState<{
    specifications: 'AUTO' | 'MANUAL';
    problemSolution: 'AUTO' | 'MANUAL';
    applicationMethod: 'AUTO' | 'MANUAL';
    dosage: 'AUTO' | 'MANUAL';
    advantages: 'AUTO' | 'MANUAL';
    safetyNotes: 'AUTO' | 'MANUAL';
  }>({
    specifications: product?.specifications ? 'MANUAL' : 'AUTO',
    problemSolution: product?.problemSolution ? 'MANUAL' : 'AUTO',
    applicationMethod: product?.applicationMethod ? 'MANUAL' : 'AUTO',
    dosage: product?.dosage ? 'MANUAL' : 'AUTO',
    advantages: product?.advantages ? 'MANUAL' : 'AUTO',
    safetyNotes: product?.safetyNotes ? 'MANUAL' : 'AUTO',
  });

  // Notification Modal State (Popup Tengah)
  const [notificationModal, setNotificationModal] = useState<{
    show: boolean;
    type: 'success' | 'error' | 'info' | 'warning';
    title: string;
    message: string;
  }>({
    show: false,
    type: 'info',
    title: '',
    message: '',
  });

  // Client-side only mount check
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Helper function untuk parse JSON (harus didefinisikan sebelum useForm)
  const parseJSON = (value: any, defaultValue: any[] = []) => {
    if (!value) return defaultValue;
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        return defaultValue;
      }
    }
    if (Array.isArray(value)) return value;
    return defaultValue;
  };

  // Initialize form hook FIRST (before any useEffect that uses watch/setValue)
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: product
      ? {
          ...product,
          status: product.status || PRODUCT_STATUS.DRAFT,
          subCategoryId: product.subCategoryId || null,
          discountPrice: product.discountPrice || null,
          features: parseJSON(product.features, []),
          pestTargets: parseJSON(product.pestTargets, []),
          activeIngredients: parseJSON(product.activeIngredients, []),
          packagingVariants: parseJSON(product.packagingVariants, []),
          images: parseJSON(product.images, []),
          specifications: product.specifications || '',
          sku: product.sku || '',
          salesWeight: product.salesWeight || 0,
          badge: product.badge || 'none',
        }
      : {
          unit: 'pcs',
          isFeatured: false,
          isActive: true,
          status: PRODUCT_STATUS.DRAFT,
          badge: 'none',
          salesWeight: 0,
          images: [],
          specifications: '',
          sku: '',
        },
  });

  // Watch form values AFTER useForm initialization
  const name = watch('name');
  const slug = watch('slug');
  const categoryId = watch('categoryId');
  const subCategoryId = watch('subCategoryId');
  const price = watch('price');
  const discountPrice = watch('discountPrice');
  const status = watch('status') || PRODUCT_STATUS.DRAFT;
  const mainImageUrl = watch('imageUrl');
  const problemSolution = watch('problemSolution');
  const applicationMethod = watch('applicationMethod');
  const dosage = watch('dosage');
  const advantages = watch('advantages');
  const safetyNotes = watch('safetyNotes');

  // M-09: Auto-fill empty extra info fields on edit load
  // FIX: Moved AFTER watch() calls to ensure variables are initialized
  useEffect(() => {
    if (product?.id && name && categoryId) {
      const selectedCategory = categories.find((cat) => cat.id === categoryId);
      const categoryName = selectedCategory?.name || null;

      // Check if any extra info field is empty
      const hasEmptyFields = 
        !problemSolution?.trim() ||
        !applicationMethod?.trim() ||
        !dosage?.trim() ||
        !advantages?.trim() ||
        !safetyNotes?.trim() ||
        !watch('specifications')?.trim();

      if (hasEmptyFields) {
        // Auto-fill using ensureProductExtraInfo
        const ensured = ensureProductExtraInfo(
          {
            specifications: watch('specifications'),
            problemSolution: problemSolution,
            applicationMethod: applicationMethod,
            dosage: dosage,
            advantages: advantages,
            safetyNotes: safetyNotes,
          },
          name,
          categoryName
        );

        // Only set fields that are currently empty (preserve manual edits)
        if (!watch('specifications')?.trim()) {
          setValue('specifications', ensured.specifications, { shouldValidate: false });
          setFieldSource(prev => ({ ...prev, specifications: 'AUTO' }));
        }
        if (!problemSolution?.trim()) {
          setValue('problemSolution', ensured.problemSolution, { shouldValidate: false });
          setFieldSource(prev => ({ ...prev, problemSolution: 'AUTO' }));
        }
        if (!applicationMethod?.trim()) {
          setValue('applicationMethod', ensured.applicationMethod, { shouldValidate: false });
          setFieldSource(prev => ({ ...prev, applicationMethod: 'AUTO' }));
        }
        if (!dosage?.trim()) {
          setValue('dosage', ensured.dosage, { shouldValidate: false });
          setFieldSource(prev => ({ ...prev, dosage: 'AUTO' }));
        }
        if (!advantages?.trim()) {
          setValue('advantages', ensured.advantages, { shouldValidate: false });
          setFieldSource(prev => ({ ...prev, advantages: 'AUTO' }));
        }
        if (!safetyNotes?.trim()) {
          setValue('safetyNotes', ensured.safetyNotes, { shouldValidate: false });
          setFieldSource(prev => ({ ...prev, safetyNotes: 'AUTO' }));
        }
      }
    }
  }, [product?.id, name, categoryId, problemSolution, applicationMethod, dosage, advantages, safetyNotes, categories, setValue, watch]);

  // PHASE S+: Auto-generate slug from title (slugify dengan strict mode)
  // PHASE A: Enhanced dengan validasi minimal 3 karakter
  const generateSlug = (text: string) => {
    if (!text || text.trim() === '') {
      return '';
    }
    // slugify dengan strict: lower case, replace non-alphanumeric dengan dash, trim dashes
    let slug = text
      .toLowerCase()
      .normalize('NFD') // Normalize diacritics
      .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
      .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric with dash
      .replace(/(^-|-$)/g, '') // Trim leading/trailing dashes
      .substring(0, 100); // Limit length
    
    // PHASE A: Ensure minimal 3 karakter
    if (slug.length < 3) {
      slug = slug + '-product';
    }
    
    return slug;
  };

  // Flatten categories for dropdown (parent > child format)
  const flattenedCategories = useMemo(() => {
    const flat: Array<{ id: string; name: string; level: number }> = [];
    categories.forEach((cat) => {
      if (!cat.parentId) {
        flat.push({ id: cat.id, name: cat.name, level: 0 });
        if (cat.children && cat.children.length > 0) {
          cat.children.forEach((child) => {
            flat.push({ id: child.id, name: `  └ ${child.name}`, level: 1 });
          });
        }
      }
    });
    return flat;
  }, [categories]);

  // Get available subcategories for selected category
  const availableSubcategories = useMemo(() => {
    if (!categoryId) return [];
    const selectedCategory = categories.find((cat) => cat.id === categoryId);
    if (!selectedCategory || !selectedCategory.children) return [];
    return selectedCategory.children;
  }, [categoryId, categories]);

  // Clear subcategory if parent changes
  const handleCategoryChange = (newCategoryId: string) => {
    setValue('categoryId', newCategoryId);
    // Clear subcategory if it's not a child of new parent
    if (subCategoryId) {
      const selectedCategory = categories.find((cat) => cat.id === newCategoryId);
      const isChildOfNewParent =
        selectedCategory?.children?.some((child) => child.id === subCategoryId);
      if (!isChildOfNewParent) {
        setValue('subCategoryId', null);
      }
    }
  };

  // Format price to IDR
  const formatIDR = (value: number | undefined | null) => {
    if (!value) return 'Rp 0';
    return `Rp ${value.toLocaleString('id-ID')}`;
  };

  // Check if Additional Info sections should be shown (defensive)
  const hasAdditionalInfo =
    problemSolution?.trim() ||
    applicationMethod?.trim() ||
    dosage?.trim() ||
    advantages?.trim() ||
    safetyNotes?.trim();

  // FITUR 4: Final Fix - Save as DRAFT
  // M-10: Enhanced dengan single submit guard, idempotency, dan status sync
  // PHASE A: Data Contract & Validation - Validasi keras sebelum submit
  const onSaveDraft = async (data: ProductFormData) => {
    // M-10 STEP 1: Single submit guard
    if (isSubmitting) {
      return;
    }
    setIsSubmitting(true);
    setLoading(true);
    setError('');
    setSuccess(null);

    try {
      // PHASE A: Validasi keras sebelum submit
      const phaseAValidation = validateProductPhaseA({
        slug: data.slug,
        shortDescription: data.shortDescription,
        specifications: data.specifications,
        seoSchema: data.seoSchema,
        status: PRODUCT_STATUS.DRAFT,
        publishedAt: null,
        name: data.name,
      });

      if (!phaseAValidation.valid) {
        // Apply fixes jika ada
        if (phaseAValidation.fixes?.slug) {
          setValue('slug', phaseAValidation.fixes.slug, { shouldValidate: false });
        }
        if (phaseAValidation.fixes?.shortDescription) {
          setValue('shortDescription', phaseAValidation.fixes.shortDescription, { shouldValidate: false });
        }

        // Tampilkan error dengan detail
        const errorMessage = `Validasi gagal (PHASE A):\n${phaseAValidation.errors.join('\n')}`;
        showNotification(errorMessage, 'error', {
          title: 'Validasi Gagal',
          duration: 8000,
        });
        setError(errorMessage);
        setTimeout(() => setError(''), 8000);
        setIsSubmitting(false);
        setLoading(false);
        return;
      }

      // M-10 STEP 5: Generate idempotency key
      const idempotencyKey = generateIdempotencyKey();

      const payload = {
        ...data,
        status: PRODUCT_STATUS.DRAFT, // Always save as DRAFT
        id: product?.id,
        // Apply fixes jika ada
        slug: phaseAValidation.fixes?.slug || data.slug,
        shortDescription: phaseAValidation.fixes?.shortDescription || data.shortDescription,
      };

      const response = await fetch('/api/admin/products/save', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-idempotency-key': idempotencyKey, // M-10: Idempotency key
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        // PHASE A: Handle validation error dengan detail
        if (response.status === 422 && result.issues) {
          const errorMessage = `Validasi gagal (PHASE A):\n${result.issues.join('\n')}`;
          throw new Error(errorMessage);
        }
        throw new Error(result.error || result.message || 'Terjadi kesalahan');
      }

      // M-10 STEP 4: Status sync - update status real-time
      if (result.product) {
        setValue('status', result.product.status || PRODUCT_STATUS.DRAFT, { shouldValidate: false });
      }

      // PHASE S+: Notifikasi sukses (real-time popup)
      showNotification('Produk berhasil disimpan sebagai DRAFT', 'success', {
        title: 'Berhasil',
        duration: 2000,
      });
      
      // M-10: Update success state untuk UI feedback
      setSuccess('Produk berhasil disimpan sebagai DRAFT');
      
      setTimeout(() => {
        router.push('/admin/products');
        router.refresh();
      }, 1500);
    } catch (err: any) {
      // M-10 STEP 3: Proper error handling
      showNotification(err.message || 'Gagal menyimpan produk', 'error', {
        title: 'Error',
        duration: 5000,
      });
      setError(err.message || 'Gagal menyimpan produk');
      setTimeout(() => setError(''), 5000);
    } finally {
      // M-10: Reset semua loading states
      setLoading(false);
      setIsSubmitting(false);
    }
  };

  // FITUR 4: Final Fix - Manual Publish dengan validasi & dedicated endpoint
  // M-10: Enhanced dengan single submit guard, idempotency, dan status sync
  // PHASE A: Data Contract & Validation - Validasi keras sebelum publish
  const onPublish = async (data: ProductFormData) => {
    // M-10 STEP 1: Single submit guard
    if (isSubmitting) {
      return;
    }

    if (!hasPermission(userRole, 'product.publish')) {
      setError('Hanya super_admin yang dapat mempublish produk');
      setTimeout(() => setError(''), 5000);
      return;
    }

    // FITUR 4: Final Fix - Validasi sebelum publish
    if (!data.categoryId || data.categoryId.trim() === '') {
      setError('Kategori harus diisi untuk publish produk');
      setTimeout(() => setError(''), 5000);
      return;
    }

    if (!data.description || data.description.trim() === '') {
      setError('Deskripsi lengkap harus diisi untuk publish produk');
      setTimeout(() => setError(''), 5000);
      return;
    }

    if (!data.metaTitle || data.metaTitle.trim() === '') {
      setError('SEO Title harus diisi untuk publish produk');
      setTimeout(() => setError(''), 5000);
      return;
    }

    // PHASE A: Validasi keras sebelum publish
    const phaseAValidation = validateProductPhaseA({
      slug: data.slug,
      shortDescription: data.shortDescription,
      specifications: data.specifications,
      seoSchema: data.seoSchema,
      status: PRODUCT_STATUS.PUBLISHED,
      publishedAt: new Date(),
      name: data.name,
    });

    if (!phaseAValidation.valid) {
      // Apply fixes jika ada
      if (phaseAValidation.fixes?.slug) {
        setValue('slug', phaseAValidation.fixes.slug, { shouldValidate: false });
      }
      if (phaseAValidation.fixes?.shortDescription) {
        setValue('shortDescription', phaseAValidation.fixes.shortDescription, { shouldValidate: false });
      }

      // Tampilkan error dengan detail
      const errorMessage = `Validasi gagal (PHASE A):\n${phaseAValidation.errors.join('\n')}`;
      showNotification(errorMessage, 'error', {
        title: 'Validasi Gagal - Tidak Bisa Publish',
        duration: 8000,
      });
      setError(errorMessage);
      setTimeout(() => setError(''), 8000);
      return;
    }

    if (!confirm('Yakin ingin mempublish produk ini? Pastikan semua data sudah lengkap.')) {
      return;
    }

    setIsSubmitting(true);
    setPublishing(true);
    setError('');
    setSuccess(null);

    try {
      // M-10 STEP 5: Generate idempotency key menggunakan UUID
      const idempotencyKey = generateIdempotencyKey();
      
      // FITUR 4: Final Fix - Gunakan dedicated publish endpoint
      if (product?.id) {
        // Existing product - use dedicated publish endpoint (better validation)
        const response = await fetch(`/api/admin/products/${product.id}/publish`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'x-idempotency-key': idempotencyKey, // M-10: UUID-based idempotency
          },
        });

        const result = await response.json();

        if (!response.ok) {
          // PHASE A: Handle validation error dengan detail
          if (response.status === 422 && result.issues) {
            const errorMessage = `Validasi gagal (PHASE A):\n${result.issues.join('\n')}`;
            throw new Error(errorMessage);
          }
          throw new Error(result.error || result.message || 'Gagal mempublish produk');
        }

        // M-10 STEP 4: Status sync - update status real-time
        if (result.product) {
          setValue('status', result.product.status || PRODUCT_STATUS.PUBLISHED, { shouldValidate: false });
        }

        showNotification('Produk berhasil dipublish', 'success', {
          title: 'Berhasil',
          duration: 3000,
        });
        setSuccess('Produk berhasil dipublish');
        setTimeout(() => {
          router.push('/admin/products');
          router.refresh();
        }, 1500);
      } else {
        // New product - must save first, then publish
        // Step 1: Save as DRAFT first
        const saveIdempotencyKey = generateIdempotencyKey();
        const savePayload = {
          ...data,
          status: PRODUCT_STATUS.DRAFT,
        };

        const saveResponse = await fetch('/api/admin/products/save', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'x-idempotency-key': saveIdempotencyKey, // M-10: Idempotency untuk save
          },
          body: JSON.stringify(savePayload),
        });

        const saveResult = await saveResponse.json();

        if (!saveResponse.ok) {
          throw new Error(saveResult.error || saveResult.message || 'Gagal menyimpan produk');
        }

        const savedProductId = saveResult.product?.id;
        if (!savedProductId) {
          throw new Error('Produk berhasil disimpan tetapi ID tidak ditemukan');
        }

        // Step 2: Publish using dedicated endpoint
        const publishIdempotencyKey = generateIdempotencyKey();
        const publishResponse = await fetch(`/api/admin/products/${savedProductId}/publish`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'x-idempotency-key': publishIdempotencyKey, // M-10: UUID-based idempotency
          },
        });

        const publishResult = await publishResponse.json();

        if (!publishResponse.ok) {
          throw new Error(publishResult.error || publishResult.message || 'Gagal mempublish produk');
        }

        // M-10 STEP 4: Status sync - update status real-time
        if (publishResult.product) {
          setValue('status', publishResult.product.status || PRODUCT_STATUS.PUBLISHED, { shouldValidate: false });
        }

        showNotification('Produk berhasil dipublish', 'success', {
          title: 'Berhasil',
          duration: 3000,
        });
        setSuccess('Produk berhasil dipublish');
        setTimeout(() => {
          router.push('/admin/products');
          router.refresh();
        }, 1500);
      }
    } catch (err: any) {
      // M-10 STEP 3: Proper error handling
      showNotification(err.message || 'Gagal mempublish produk', 'error', {
        title: 'Error',
        duration: 5000,
      });
      setError(err.message || 'Gagal mempublish produk');
      setTimeout(() => setError(''), 5000);
    } finally {
      // M-10: Reset semua loading states
      setPublishing(false);
      setIsSubmitting(false);
    }
  };

  // PHASE S: Schedule product
  const handleSchedule = async () => {
    if (!product?.id) {
      setError('Produk harus disimpan terlebih dahulu');
      setTimeout(() => setError(''), 5000);
      return;
    }

    if (!scheduledAt) {
      setError('Tanggal dan jam jadwal harus diisi');
      setTimeout(() => setError(''), 5000);
      return;
    }

    const currentStatus = product.status || PRODUCT_STATUS.DRAFT;
    if (currentStatus !== PRODUCT_STATUS.DRAFT) {
      setError('Hanya produk dengan status DRAFT yang bisa dijadwalkan');
      setTimeout(() => setError(''), 5000);
      return;
    }

    setLoading(true);
    setError('');
    setSuccess(null);

    try {
      const response = await fetch(`/api/admin/products/${product.id}/schedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scheduledAt: new Date(scheduledAt).toISOString(),
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Gagal menjadwalkan produk');
      }

      setSuccess('Produk berhasil dijadwalkan. Produk akan ditandai sebagai READY_TO_PUBLISH saat waktu tiba, tetapi tetap memerlukan approval manual untuk publish.');
      setTimeout(() => {
        router.refresh();
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan');
      setLoading(false);
    }
  };

  // PHASE S: Approve product
  const handleApprove = async () => {
    if (!product?.id) {
      setError('Produk harus disimpan terlebih dahulu');
      setTimeout(() => setError(''), 5000);
      return;
    }

    const currentStatus = product.status || PRODUCT_STATUS.DRAFT;
    if (currentStatus !== 'SCHEDULED' && currentStatus !== 'READY_TO_PUBLISH') {
      setError('Hanya produk dengan status SCHEDULED atau READY_TO_PUBLISH yang bisa disetujui');
      setTimeout(() => setError(''), 5000);
      return;
    }

    if (!confirm('Yakin ingin menyetujui produk ini untuk publish? Produk akan ditandai sebagai READY_TO_PUBLISH. Publish masih harus dilakukan manual.')) {
      return;
    }

    setLoading(true);
    setError('');
    setSuccess(null);

    try {
      const response = await fetch(`/api/admin/products/${product.id}/approve`, {
        method: 'POST',
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Gagal menyetujui produk');
      }

      setSuccess('Produk berhasil disetujui dan siap untuk publish. Gunakan tombol Publish untuk mempublish produk ini.');
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
    if (!product?.id) {
      setError('Produk harus disimpan terlebih dahulu');
      setTimeout(() => setError(''), 5000);
      return;
    }

    const currentStatus = product.status || PRODUCT_STATUS.DRAFT;
    if (currentStatus !== 'SCHEDULED' && currentStatus !== 'READY_TO_PUBLISH') {
      setError('Hanya produk dengan status SCHEDULED atau READY_TO_PUBLISH yang bisa dibatalkan jadwalnya');
      setTimeout(() => setError(''), 5000);
      return;
    }

    if (!confirm('Yakin ingin membatalkan jadwal produk ini? Status akan berubah menjadi CANCELLED.')) {
      return;
    }

    setLoading(true);
    setError('');
    setSuccess(null);

    try {
      const response = await fetch(`/api/admin/products/${product.id}/cancel-schedule`, {
        method: 'POST',
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Gagal membatalkan jadwal');
      }

      setSuccess('Jadwal berhasil dibatalkan. Status produk berubah menjadi CANCELLED.');
      setTimeout(() => {
        router.refresh();
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan');
      setLoading(false);
    }
  };

  // PHASE C: Handle main image upload with validation
  const handleMainImageUpload = async (file: File) => {
    try {
      setUploadingMainImage(true);
      setError('');
      setSuccess(null);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('category', 'products');

      const response = await fetch('/api/upload/image', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok || !data.url) {
        throw new Error(data.error || 'Upload gagal');
      }

      // PHASE C: Validate uploaded image path
      const imageUrl = data.url || '';
      if (imageUrl.includes('###') || imageUrl.includes('PLACEHOLDER') || imageUrl.includes('placeholder')) {
        throw new Error('Image path contains placeholder - upload failed');
      }
      
      if (!imageUrl.startsWith('/images/') && !imageUrl.startsWith('http://') && !imageUrl.startsWith('https://')) {
        throw new Error(`Invalid image path format: ${imageUrl}. Must start with /images/ or be a valid URL`);
      }

      setValue('imageUrl', imageUrl, { shouldValidate: true });
      
      // PHASE C: Set image state to READY after successful manual upload
      setImageState('IMAGE_READY');
      setImageError('');
      
      setSuccess('Gambar utama berhasil diupload!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (error: any) {
      // PHASE C: Set image state to FAILED on error
      setImageState('IMAGE_FAILED');
      setImageError(error.message || 'Upload gagal');
      
      setError(`Error: ${error.message || 'Upload gagal'}`);
      setTimeout(() => setError(''), 5000);
    } finally {
      setUploadingMainImage(false);
    }
  };

  const canPublish = hasPermission(userRole, 'product.publish');
  const canApprove = hasPermission(userRole || '', 'product.manage'); // PHASE S: Any admin can approve
  const currentStatus = product?.status || PRODUCT_STATUS.DRAFT;
  const isScheduled = currentStatus === 'SCHEDULED';
  const isReadyToPublish = currentStatus === 'READY_TO_PUBLISH';
  const isCancelled = currentStatus === 'CANCELLED';
  const isDraft = currentStatus === PRODUCT_STATUS.DRAFT;

  // PHASE S+: Legacy AI Copy Assist removed - using Product v2 AI Generator instead
  const isNewProduct = !product;

  // PHASE B: Handle AI Product Generation (direct form population)
  // State-driven, deterministik, bisa dihentikan, bisa diaudit
  const handleAiProductGenerate = async () => {
    // PHASE B: INPUT VALIDATION (WAJIB SEBELUM AI CALL)
    // 1. Title WAJIB
    if (!name || name.trim().length === 0) {
      setAiState('AI_FAILED');
      setAiError('Title wajib diisi sebelum generate AI content.');
      setError('Title wajib diisi sebelum generate AI content.');
      setTimeout(() => setError(''), 5000);
      return;
    }

    // 2. Category valid (jika ada)
    if (categoryId) {
      const selectedCategory = categories.find((cat) => cat.id === categoryId);
      if (!selectedCategory) {
        setAiState('AI_FAILED');
        setAiError('Category tidak valid. Pilih category yang valid atau kosongkan.');
        setError('Category tidak valid.');
        setTimeout(() => setError(''), 5000);
        return;
      }
    }

    // 3. Context minimum (title sudah cukup untuk product generation)
    // Title sudah divalidasi di atas

    // PHASE B: Set state to GENERATING
    setAiState('AI_GENERATING');
    setAiError('');
    setError('');
    setSuccess(null);

    // PHASE C: Set image state to GENERATING
    setImageState('IMAGE_GENERATING');
    setImageError('');

    // PHASE B: Save input snapshot for audit
    const inputSnapshot = {
      product_name: name,
      category: categoryId ? categories.find((cat) => cat.id === categoryId)?.name : undefined,
      timestamp: new Date().toISOString(),
    };
    setAiInputSnapshot(inputSnapshot);

    // PHASE S+: Background notification untuk proses AI generate
    const bgNotifId = showNotification('Sedang generate konten produk dengan AI...', 'info', {
      title: 'AI Generation',
      isBackground: true,
    });

    try {
      // Get form values for AI generation
      const selectedCategory = categories.find((cat) => cat.id === categoryId);
      const categoryName = selectedCategory?.name || '';
      // Get variant text (handle both array and string formats)
      const packagingVariants = watch('packagingVariants');
      let variantText = '';
      if (packagingVariants) {
        if (Array.isArray(packagingVariants)) {
          variantText = packagingVariants.join(', ');
        } else if (typeof packagingVariants === 'string') {
          try {
            const parsed = JSON.parse(packagingVariants);
            variantText = Array.isArray(parsed) ? parsed.join(', ') : packagingVariants;
          } catch {
            variantText = packagingVariants;
          }
        }
      }

      const priceValue = price || 0;

      const payload = {
        product_name: name,
        category: categoryName || undefined,
        variant: variantText || undefined,
        price_range: priceValue > 0 ? priceValue.toString() : undefined,
        intent: 'commercial' as const,
      };

      const response = await fetch('/api/admin/ai/product-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        // PHASE B: AI_FAILED state dengan error reason
        const errorMessage = result.message || result.error || 'Gagal generate AI content. Silakan coba lagi.';
        if (process.env.NODE_ENV === 'development') {
          console.error('[AI-GENERATE] Error response:', {
            status: response.status,
            error: result.error,
            message: result.message,
          });
        }
        
        // PHASE B: Save output snapshot (error case)
        setAiOutputSnapshot({
          error: errorMessage,
          status: 'FAILED',
          timestamp: new Date().toISOString(),
        });
        
        setAiState('AI_FAILED');
        setAiError(errorMessage);
        
        // PHASE S+: Update background notification dengan error
        showNotification(`AI generation gagal: ${errorMessage}`, 'error', {
          title: 'AI Generation Error',
          isBackground: true,
        });
        throw new Error(errorMessage);
      }

      // PHASE B: OUTPUT VERIFICATION (WAJIB SETELAH AI RETURN)
      // Save raw output snapshot for audit
      setAiOutputSnapshot({
        ...result,
        timestamp: new Date().toISOString(),
      });

      // 1. Judul: tidak kosong
      const productTitle = result.product_title || name;
      if (!productTitle || productTitle.trim() === '') {
        setAiState('AI_FAILED');
        setAiError('AI gagal menghasilkan judul produk.');
        setError('AI gagal menghasilkan judul produk.');
        setTimeout(() => setError(''), 8000);
        return;
      }

      // 2. Deskripsi singkat: lolos PHASE A
      const shortDesc = result.short_description || result.shortDescription || result.short_copy;
      if (shortDesc) {
        const { validateShortDescription } = await import('@/lib/product-validation-phase-a');
        const shortDescValidation = validateShortDescription(shortDesc);
        if (!shortDescValidation.valid) {
          setAiState('AI_FAILED');
          setAiError(`Deskripsi singkat tidak valid: ${shortDescValidation.error}`);
          setError(`Deskripsi singkat tidak valid: ${shortDescValidation.error}`);
          setTimeout(() => setError(''), 8000);
          return;
        }
      }

      // 3. Spesifikasi: struktur list, ≥ 3 poin
      const specs = result.specifications_html || result.specifications;
      if (specs) {
        const { validateSpecifications } = await import('@/lib/product-validation-phase-a');
        const specsValidation = validateSpecifications(specs);
        if (!specsValidation.valid) {
          setAiState('AI_FAILED');
          setAiError(`Spesifikasi tidak valid: ${specsValidation.error}`);
          setError(`Spesifikasi tidak valid: ${specsValidation.error}`);
          setTimeout(() => setError(''), 8000);
          return;
        }
      }

      // 4. SEO keyword: primary ada
      const primaryKeyword = result.seo?.primary_keyword || '';
      if (!primaryKeyword || primaryKeyword.trim() === '') {
        setAiState('AI_FAILED');
        setAiError('SEO primary keyword wajib ada.');
        setError('SEO primary keyword wajib ada.');
        setTimeout(() => setError(''), 8000);
        return;
      }

      // 5. Image prompt: tidak mengandung placeholder (###) - PHASE C: Moved to image validation
      // Image validation is now handled separately in image state machine

      // PHASE B: POST-PROCESSING sudah dilakukan di backend
      // Frontend hanya perlu menggunakan hasil yang sudah di-post-process
      // (Backend sudah melakukan: trim whitespace, normalize bullets, remove empty HTML, enforce structure)

      // Product v2: Handle v2 payload structure
      // Response format v2: { short_description, long_description_html, specifications_html, image_map, seo, qc_status }
      // PHASE B: Semua content sudah di-post-process di backend
      
      // Product title (support backward compatibility)
      if (result.product_title) {
        setValue('name', result.product_title.trim(), { shouldValidate: false });
      }
      
      // Short description - v2 format: short_description (<p>...</p>) - POST-PROCESSED by backend
      if (shortDesc) {
        setValue('shortDescription', shortDesc, { shouldValidate: false });
      }
      
      // Long description - v2 format: long_description_html (<section>...</section>) - WAJIB ADA - POST-PROCESSED by backend
      const longDesc = result.long_description_html || result.longDescription || result.description;
      if (!longDesc || longDesc.trim() === '' || longDesc === '<p></p>' || longDesc === '<section></section>') {
        setAiState('AI_FAILED');
        setAiError('AI gagal menghasilkan long_description_html yang valid.');
        setError('AI gagal menghasilkan long_description_html. Publish dinonaktifkan.');
        setTimeout(() => setError(''), 8000);
        return;
      } else {
        setValue('description', longDesc, { shouldValidate: false });
      }
      
      // Specifications - v2 format: specifications_html (<ul>...</ul>) - POST-PROCESSED by backend
      if (specs) {
        setValue('specifications', specs, { shouldValidate: false });
      }
      
      // Benefits/Features (optional)
      if (result.benefits && Array.isArray(result.benefits) && result.benefits.length > 0) {
        setValue('features', result.benefits, { shouldValidate: false });
      }
      
      // SEO - v2 format: seo.title, seo.description, seo.primary_keyword, seo.secondary_keywords
      const seoTitle = result.seo?.title || result.seoTitle;
      const seoDesc = result.seo?.description || result.seo?.meta_description || result.seoDescription;
      
      if (seoTitle) {
        setValue('metaTitle', seoTitle, { shouldValidate: false });
      }
      
      if (seoDesc) {
        setValue('metaDescription', seoDesc, { shouldValidate: false });
      }

      // Store QC status and SEO data in seoSchema for publish validation
      const qcStatus = result.qc_status || 'PASS';
      const seoSchema = JSON.stringify({
        qc_status: qcStatus,
        primary_keyword: result.seo?.primary_keyword || '',
        secondary_keywords: result.seo?.secondary_keywords || [],
      });
      setValue('seoSchema', seoSchema, { shouldValidate: false });

      // PHASE C: Handle image_map from AI generation with state management
      // Transform image_map to products.images array format
      // Structure: hero image first, then detail images
      if (result.image_map && Array.isArray(result.image_map) && result.image_map.length > 0) {
        // PHASE C: Validate image paths (reject ###, PLACEHOLDER, empty)
        const validImages: any[] = [];
        const invalidImages: string[] = [];

        for (const img of result.image_map) {
          const url = img.url || img.URL || '';
          
          // PHASE C: Validation - reject placeholder
          if (!url || url.trim() === '') {
            invalidImages.push('Empty image URL');
            continue;
          }
          
          if (url.includes('###') || url.includes('PLACEHOLDER') || url.includes('placeholder')) {
            invalidImages.push(`Placeholder detected: ${url}`);
            continue;
          }

          // PHASE C: Validate path format (must start with /images/)
          if (!url.startsWith('/images/') && !url.startsWith('http')) {
            invalidImages.push(`Invalid path format: ${url}`);
            continue;
          }

          validImages.push(img);
        }

        // PHASE C: Set image state based on validation
        if (invalidImages.length > 0) {
          setImageState('IMAGE_FAILED');
          setImageError(`Image validation failed: ${invalidImages.join('; ')}`);
          if (process.env.NODE_ENV === 'development') {
            console.error('[PRODUCT-FORM PHASE C] Image validation failed:', invalidImages);
          }
        } else if (validImages.length > 0) {
          // Sort: hero first, then detail images
          const sortedImages = [...validImages].sort((a, b) => {
            if (a.role === 'hero' || a.role === 'Hero') return -1;
            if (b.role === 'hero' || b.role === 'Hero') return 1;
            return 0;
          });

          // Extract URLs from valid images
          const imageUrls = sortedImages
            .map((img: any) => img.url || img.URL || '')
            .filter((url: string) => url && url.trim() !== '');

          if (imageUrls.length > 0) {
            // Set hero image as imageUrl (first image)
            setValue('imageUrl', imageUrls[0], { shouldValidate: false });
            
            // Set all images (including hero) in images array
            setValue('images', imageUrls, { shouldValidate: false });
            
            // PHASE C: Set image state to READY
            setImageState('IMAGE_READY');
            setImageError('');
            
            // PHASE C: Save image output snapshot for audit
            setImageOutputSnapshot({
              images: imageUrls,
              count: imageUrls.length,
              timestamp: new Date().toISOString(),
            });
            
          } else {
            setImageState('IMAGE_FAILED');
            setImageError('No valid image URLs found after validation');
          }
        } else {
          setImageState('IMAGE_FAILED');
          setImageError('No valid images in image_map');
        }
      } else {
        // PHASE C: No images from AI - set to FAILED (user can use manual fallback)
        setImageState('IMAGE_FAILED');
        setImageError('AI did not generate any images');
      }

      // PHASE S+: Auto-populate Info Tambahan Produk (WAJIB AUTO-GENERATE)
      const additionalInfo = result.additional_info || {
        problemSolution: result.problemSolution,
        applicationMethod: result.applicationMethod,
        dosage: result.dosage,
        advantages: result.advantages,
        safetyNotes: result.safetyNotes,
      };

      if (additionalInfo) {
        if (additionalInfo.problemSolution) {
          setValue('problemSolution', additionalInfo.problemSolution, { shouldValidate: false });
        }
        if (additionalInfo.applicationMethod) {
          setValue('applicationMethod', additionalInfo.applicationMethod, { shouldValidate: false });
        }
        if (additionalInfo.dosage) {
          setValue('dosage', additionalInfo.dosage, { shouldValidate: false });
        }
        if (additionalInfo.advantages) {
          setValue('advantages', additionalInfo.advantages, { shouldValidate: false });
        }
        if (additionalInfo.safetyNotes) {
          setValue('safetyNotes', additionalInfo.safetyNotes, { shouldValidate: false });
        }
      }

      // B1: Auto-save DRAFT after generation (Product v2 requirement)
      const formDataForSave = {
        name: result.product_title || name,
        slug: watch('slug') || generateSlug(result.product_title || name),
        categoryId: categoryId || watch('categoryId'),
        shortDescription: shortDesc,
        description: longDesc,
        specifications: specs,
        metaTitle: seoTitle,
        metaDescription: seoDesc,
        seoSchema: seoSchema,
        status: PRODUCT_STATUS.DRAFT, // Always save as DRAFT
        price: price || watch('price') || 0,
        stock: watch('stock') || 0,
        unit: watch('unit') || 'pcs',
        isFeatured: watch('isFeatured') || false,
        isActive: watch('isActive') !== false,
      };
      
      try {
        if (product?.id) {
          // Update existing product
          const saveResponse = await fetch('/api/admin/products/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...formDataForSave, id: product.id }),
          });
          
          if (saveResponse.ok) {
          }
        } else {
          // Create new product as DRAFT
          const saveResponse = await fetch('/api/admin/products/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formDataForSave),
          });
          
          const saveResult = await saveResponse.json();
          if (saveResponse.ok && saveResult.product?.id) {
            // Update URL to edit mode for newly created product
            router.replace(`/admin/products/${saveResult.product.id}/edit`);
          }
        }
      } catch (saveError) {
        if (process.env.NODE_ENV === 'development') {
          console.error('[PRODUCT-FORM v2] Auto-save failed (non-blocking):', saveError);
        }
        // Non-blocking error - form fields are already populated
      }

      // PHASE B: Set state to AI_READY setelah semua verifikasi dan post-processing berhasil
      setAiState('AI_READY');
      setAiError('');

      // PHASE C: Set image state from response (if provided)
      if (result.image_status) {
        setImageState(result.image_status as ImageState);
        if (result.image_error) {
          setImageError(result.image_error);
        }
      }

      // Success notification - Popup Tengah (B1: Show QC status)
      const successMessage = qcStatus === 'PASS' 
        ? 'AI content berhasil di-generate dan tersimpan sebagai DRAFT. Produk telah auto-saved. Silakan review sebelum publish.'
        : `AI content berhasil di-generate, namun QC status: ${qcStatus}. Silakan review long_description_html sebelum publish.`;
      
      // PHASE S+: Success notification (real-time popup)
      showNotification(successMessage, qcStatus === 'PASS' ? 'success' : 'warning', {
        title: `AI Generation Berhasil (QC: ${qcStatus})`,
        duration: 4000,
      });
      
      // Keep notification modal untuk detail QC (optional)
      setNotificationModal({
        show: true,
        type: qcStatus === 'PASS' ? 'success' : 'warning',
        title: `AI Generation Berhasil (QC: ${qcStatus})`,
        message: successMessage,
      });
    } catch (err: any) {
      // PHASE B: AI_FAILED state dengan error reason
      const errorMessage = err.message || 'Gagal generate AI content. Silakan coba lagi atau tulis manual.';
      setAiState('AI_FAILED');
      setAiError(errorMessage);
      
      // PHASE S+: Background notification untuk error
      showNotification(`AI generation gagal: ${errorMessage}`, 'error', {
        title: 'AI Generation Error',
        isBackground: true,
      });
      setNotificationModal({
        show: true,
        type: 'error',
        title: 'AI Generation Gagal',
        message: errorMessage,
      });
    } finally {
      // PHASE B: State sudah di-set di atas, tidak perlu set loading lagi
    }
  };

  // Close notification modal
  const closeNotificationModal = () => {
    setNotificationModal({ show: false, type: 'info', title: '', message: '' });
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/products" className="text-gray-600 hover:text-gray-900">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">
            {product ? 'Edit Produk' : 'Tambah Produk'}
          </h1>
        </div>
      </div>

      {/* Success/Error Messages (Legacy - kept for backward compatibility) */}
      {success && !notificationModal.show && (
        <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg">
          {success}
        </div>
      )}
      {error && !notificationModal.show && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit(onSaveDraft)} className="bg-white rounded-lg shadow p-6 space-y-8">
        {/* ============================================
            A. IDENTITAS
        ============================================ */}
        <div className="border-b pb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Identitas</h2>
          
          <div className="space-y-4">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nama Produk *
              </label>
              <input
                {...register('name')}
                onChange={(e) => {
                  register('name').onChange(e);
                  if (!product && !slug) {
                    const generatedSlug = generateSlug(e.target.value);
                    setValue('slug', generatedSlug);
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
              />
              {errors.name && <p className="text-red-600 text-sm mt-1">{errors.name.message}</p>}
            </div>

            {/* Slug with manual override */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Slug * (Auto-generate, bisa diubah manual)
              </label>
              <input
                {...register('slug')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
              />
              {errors.slug && <p className="text-red-600 text-sm mt-1">{errors.slug.message}</p>}
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                {...register('status')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
              >
                <option value={PRODUCT_STATUS.DRAFT}>DRAFT</option>
                <option value={PRODUCT_STATUS.PUBLISHED}>PUBLISHED</option>
                <option value={PRODUCT_STATUS.ARCHIVED}>ARCHIVED</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Status hanya berubah saat Save. Untuk publish, gunakan tombol Publish terpisah.
              </p>
            </div>

            {/* Featured */}
            <div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  {...register('isFeatured')}
                  className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
                />
                <span className="text-sm font-medium text-gray-700">Featured Product</span>
              </label>
            </div>
          </div>
        </div>

        {/* ============================================
            B. KATEGORI
        ============================================ */}
        <div className="border-b pb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Kategori</h2>
          
          <div className="space-y-4">
            {/* Category (Parent) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Kategori (Parent) *
              </label>
              <select
                {...register('categoryId')}
                onChange={(e) => handleCategoryChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
              >
                <option value="">Pilih Kategori</option>
                {flattenedCategories
                  .filter((cat) => cat.level === 0)
                  .map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
              </select>
              {errors.categoryId && (
                <p className="text-red-600 text-sm mt-1">{errors.categoryId.message}</p>
              )}
            </div>

            {/* Subcategory (Child) */}
            {availableSubcategories.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Subkategori (Opsional)
                </label>
                <select
                  {...register('subCategoryId')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                >
                  <option value="">Tidak ada subkategori</option>
                  {availableSubcategories.map((sub) => (
                    <option key={sub.id} value={sub.id}>
                      {sub.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* ============================================
            C. HARGA & INVENTORI
        ============================================ */}
        <div className="border-b pb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Harga & Inventori</h2>
          
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Price */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Harga *
                </label>
                <input
                  type="number"
                  step="0.01"
                  {...register('price', { valueAsNumber: true })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                />
                {errors.price && <p className="text-red-600 text-sm mt-1">{errors.price.message}</p>}
                {price && (
                  <p className="text-sm text-green-600 mt-1 font-medium">
                    Preview: {formatIDR(price)}
                  </p>
                )}
              </div>

              {/* Discount Price */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Harga Diskon (Opsional)
                </label>
                <input
                  type="number"
                  step="0.01"
                  {...register('discountPrice', { valueAsNumber: true })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                />
                {discountPrice && (
                  <p className="text-sm text-green-600 mt-1 font-medium">
                    Preview: {formatIDR(discountPrice)}
                  </p>
                )}
              </div>
            </div>

            {/* Stock & Unit & SKU */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Stok *</label>
                <input
                  type="number"
                  {...register('stock', { valueAsNumber: true })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                />
                {errors.stock && <p className="text-red-600 text-sm mt-1">{errors.stock.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Unit *</label>
                <input
                  {...register('unit')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  placeholder="pcs, kg, liter, dll"
                />
                {errors.unit && <p className="text-red-600 text-sm mt-1">{errors.unit.message}</p>}
              </div>

              {/* FITUR 4: SKU Field */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">SKU (Opsional)</label>
                <input
                  {...register('sku')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  placeholder="Stock Keeping Unit"
                />
              </div>
            </div>
          </div>
        </div>

        {/* ============================================
            D. DESKRIPSI & KONTEN
        ============================================ */}
        <div className="border-b pb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Deskripsi & Konten</h2>
            <div className="flex items-center gap-2">
              {/* PHASE B: AI Product Generator Button (State-driven) */}
              <button
                type="button"
                onClick={handleAiProductGenerate}
                disabled={aiState === 'AI_GENERATING' || !name || name.trim().length === 0 || !canRunAI}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                title={!canRunAI ? getAIDisableReason() || 'AI Engine tidak aktif' : undefined}
              >
                <Sparkles className="h-4 w-4" />
                {aiState === 'AI_GENERATING' 
                  ? 'Generating...' 
                  : aiState === 'AI_READY'
                  ? '✓ AI Ready'
                  : aiState === 'AI_FAILED'
                  ? '✗ AI Failed'
                  : 'Generate Deskripsi Produk (AI)'}
              </button>
              {/* PHASE B: AI State Indicator */}
              {aiState === 'AI_FAILED' && aiError && (
                <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-800">
                  <strong>AI Failed:</strong> {aiError}
                </div>
              )}
              {aiState === 'AI_READY' && (
                <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-sm text-green-800">
                  ✓ AI content siap digunakan. Anda dapat Save atau Publish.
                </div>
              )}
              {/* PHASE S+: Legacy AI Copy Assist removed - using Product v2 AI Generator instead */}
            </div>
          </div>
          
          <div className="space-y-4">
            {/* Short Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Deskripsi Singkat (Opsional)
              </label>
              <textarea
                {...register('shortDescription')}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                placeholder="Deskripsi singkat untuk listing..."
              />
            </div>

            {/* FITUR 4: Long Description dengan Rich Text Editor & Toggle */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-gray-700">
                  Deskripsi Lengkap * (HTML/Text)
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setDescriptionMode(descriptionMode === 'visual' ? 'html' : 'visual')}
                    className={`flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                      descriptionMode === 'visual'
                        ? 'bg-green-50 border-green-300 text-green-700'
                        : 'bg-gray-50 border-gray-300 text-gray-700 hover:bg-gray-100'
                    }`}
                    title={descriptionMode === 'visual' ? 'Switch to HTML Source' : 'Switch to Visual Editor'}
                  >
                    {descriptionMode === 'visual' ? (
                      <>
                        <Code2 className="h-3.5 w-3.5" />
                        HTML
                      </>
                    ) : (
                      <>
                        <FileText className="h-3.5 w-3.5" />
                        Visual
                      </>
                    )}
                  </button>
                </div>
              </div>
              
              {descriptionMode === 'visual' && isMounted && ReactQuill ? (
                <div className="bg-white border border-gray-300 rounded-lg">
                  <ReactQuill
                    theme="snow"
                    value={watch('description') || ''}
                    onChange={(value) => setValue('description', value, { shouldValidate: true })}
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
                    placeholder="Tulis deskripsi lengkap produk di sini..."
                    className="bg-white"
                    style={{ minHeight: '300px' }}
                  />
                </div>
              ) : (
                <textarea
                  {...register('description')}
                  rows={12}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 font-mono text-sm"
                  placeholder="Deskripsi lengkap produk. HTML didukung. Whitespace akan dipertahankan."
                  style={{ whiteSpace: 'pre-wrap' }}
                />
              )}
              {errors.description && (
                <p className="text-red-600 text-sm mt-1">{errors.description.message}</p>
              )}
              {!isMounted && descriptionMode === 'visual' && (
                <div className="w-full min-h-[300px] px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 flex items-center justify-center">
                  <p className="text-gray-500">Loading editor...</p>
                </div>
              )}
            </div>

            {/* FITUR 4: Specifications Field dengan Rich Text Editor & Toggle */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Spesifikasi Produk (Opsional - HTML didukung)
                  </label>
                  <span className={`text-xs px-2 py-0.5 rounded ${
                    fieldSource.specifications === 'AUTO' 
                      ? 'bg-blue-100 text-blue-700' 
                      : 'bg-green-100 text-green-700'
                  }`}>
                    {fieldSource.specifications}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSpecificationsMode(specificationsMode === 'visual' ? 'html' : 'visual')}
                    className={`flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                      specificationsMode === 'visual'
                        ? 'bg-green-50 border-green-300 text-green-700'
                        : 'bg-gray-50 border-gray-300 text-gray-700 hover:bg-gray-100'
                    }`}
                    title={specificationsMode === 'visual' ? 'Switch to HTML Source' : 'Switch to Visual Editor'}
                  >
                    {specificationsMode === 'visual' ? (
                      <>
                        <Code2 className="h-3.5 w-3.5" />
                        HTML
                      </>
                    ) : (
                      <>
                        <FileText className="h-3.5 w-3.5" />
                        Visual
                      </>
                    )}
                  </button>
                </div>
              </div>
              
              {specificationsMode === 'visual' && isMounted && ReactQuill ? (
                <div className="bg-white border border-gray-300 rounded-lg">
                  <ReactQuill
                    theme="snow"
                    value={watch('specifications') || ''}
                    onChange={(value) => {
                      setValue('specifications', value, { shouldValidate: false });
                      setFieldSource(prev => ({ ...prev, specifications: 'MANUAL' }));
                    }}
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
                    placeholder="Tulis spesifikasi produk di sini (HTML table, list, dll)..."
                    className="bg-white"
                    style={{ minHeight: '200px' }}
                  />
                </div>
              ) : (
                <textarea
                  {...register('specifications')}
                  rows={8}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 font-mono text-sm"
                  placeholder="Spesifikasi produk (HTML table, list, dll). Contoh: &lt;table&gt;&lt;tr&gt;&lt;td&gt;Label&lt;/td&gt;&lt;td&gt;Value&lt;/td&gt;&lt;/tr&gt;&lt;/table&gt;"
                  style={{ whiteSpace: 'pre-wrap' }}
                  onChange={(e) => {
                    setValue('specifications', e.target.value, { shouldValidate: false });
                    setFieldSource(prev => ({ ...prev, specifications: 'MANUAL' }));
                  }}
                />
              )}
              <p className="text-xs text-gray-500 mt-1">
                Tips: Gunakan HTML untuk tabel, list, atau formatting. AI Generator akan otomatis membuat tabel spesifikasi.
              </p>
              {!isMounted && specificationsMode === 'visual' && (
                <div className="w-full min-h-[200px] px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 flex items-center justify-center">
                  <p className="text-gray-500">Loading editor...</p>
                </div>
              )}
            </div>

            {/* Key Features */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fitur Utama (Opsional)
              </label>
              <div className="space-y-2">
                {(watch('features') || []).map((feature, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={feature}
                      onChange={(e) => {
                        const newFeatures = [...(watch('features') || [])];
                        newFeatures[index] = e.target.value;
                        setValue('features', newFeatures);
                      }}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                      placeholder={`Fitur ${index + 1}`}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const newFeatures = [...(watch('features') || [])];
                        newFeatures.splice(index, 1);
                        setValue('features', newFeatures);
                      }}
                      className="px-2 py-2 text-red-600 hover:bg-red-50 rounded-lg"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    const newFeatures = [...(watch('features') || []), ''];
                    setValue('features', newFeatures);
                  }}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  + Tambah Fitur
                </button>
              </div>
            </div>

          </div>
        </div>

        {/* ============================================
            E. MEDIA
        ============================================ */}
        <div className="border-b pb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Media</h2>
          
          <div className="space-y-4">
            {/* Main Image */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Gambar Utama (Opsional)
              </label>
              {mainImageUrl && (
                <div className="mb-2">
                  <img
                    src={mainImageUrl}
                    alt="Preview"
                    className="h-32 w-32 object-cover border border-gray-200 rounded-lg"
                  />
                </div>
              )}
              <div className="flex gap-2">
                <input
                  {...register('imageUrl')}
                  type="text"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  placeholder="URL gambar"
                />
                <label className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-200">
                  <Upload className="h-4 w-4" />
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleMainImageUpload(file);
                    }}
                    disabled={uploadingMainImage}
                  />
                  {uploadingMainImage ? 'Uploading...' : 'Upload'}
                </label>
                {mainImageUrl && (
                  <button
                    type="button"
                    onClick={() => setValue('imageUrl', '')}
                    className="px-3 py-2 text-sm text-red-600 border border-red-300 rounded-lg hover:bg-red-50"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ============================================
            F. SEO (OPSIONAL)
        ============================================ */}
        <details className="border-b pb-6">
          <summary className="cursor-pointer text-lg font-semibold text-gray-700 mb-4">
            SEO (Klik untuk expand)
          </summary>
          
          <div className="space-y-4 mt-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Meta Title (Opsional)
              </label>
              <input
                {...register('metaTitle')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                placeholder="Meta title untuk SEO..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Meta Description (Opsional)
              </label>
              <textarea
                {...register('metaDescription')}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                placeholder="Meta description untuk SEO..."
              />
            </div>
          </div>
        </details>

        {/* ============================================
            G. INFO TAMBAHAN (CONDITIONAL)
        ============================================ */}
        {hasAdditionalInfo && (
          <div className="border-b pb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Info Tambahan</h2>
            
            <div className="space-y-4">
              {problemSolution?.trim() && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Masalah & Solusi
                  </label>
                  <textarea
                    {...register('problemSolution')}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    style={{ whiteSpace: 'pre-wrap' }}
                  />
                </div>
              )}

              {applicationMethod?.trim() && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cara Aplikasi
                  </label>
                  <textarea
                    {...register('applicationMethod')}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    style={{ whiteSpace: 'pre-wrap' }}
                  />
                </div>
              )}

              {dosage?.trim() && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Dosis</label>
                  <textarea
                    {...register('dosage')}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    style={{ whiteSpace: 'pre-wrap' }}
                  />
                </div>
              )}

              {advantages?.trim() && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Keunggulan</label>
                  <textarea
                    {...register('advantages')}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    style={{ whiteSpace: 'pre-wrap' }}
                  />
                </div>
              )}

              {safetyNotes?.trim() && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Catatan Keamanan
                  </label>
                  <textarea
                    {...register('safetyNotes')}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    style={{ whiteSpace: 'pre-wrap' }}
                  />
                </div>
              )}
            </div>

            {/* Edit Additional Info Link */}
            <div className="mt-4 pt-4 border-t">
              <p className="text-sm text-gray-600">
                💡 Tip: Isi field Additional Info di bawah jika ingin menampilkannya di section ini.
              </p>
            </div>
          </div>
        )}

        {/* Info Tambahan Input Fields (Always Available, Hidden by Default) */}
        <details className="border-b pb-6">
          <summary className="cursor-pointer text-lg font-semibold text-gray-700 mb-4">
            Info Tambahan (Klik untuk expand)
          </summary>
          
          <div className="space-y-4 mt-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <label className="block text-sm font-medium text-gray-700">
                  Masalah & Solusi
                </label>
                <span className={`text-xs px-2 py-0.5 rounded ${
                  fieldSource.problemSolution === 'AUTO' 
                    ? 'bg-blue-100 text-blue-700' 
                    : 'bg-green-100 text-green-700'
                }`}>
                  {fieldSource.problemSolution}
                </span>
              </div>
              <textarea
                {...register('problemSolution')}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                placeholder="Masalah yang dihadapi dan solusi yang ditawarkan..."
                onChange={(e) => {
                  setValue('problemSolution', e.target.value, { shouldValidate: false });
                  setFieldSource(prev => ({ ...prev, problemSolution: 'MANUAL' }));
                }}
              />
            </div>

            <div>
              <div className="flex items-center gap-2 mb-1">
                <label className="block text-sm font-medium text-gray-700">Cara Aplikasi</label>
                <span className={`text-xs px-2 py-0.5 rounded ${
                  fieldSource.applicationMethod === 'AUTO' 
                    ? 'bg-blue-100 text-blue-700' 
                    : 'bg-green-100 text-green-700'
                }`}>
                  {fieldSource.applicationMethod}
                </span>
              </div>
              <textarea
                {...register('applicationMethod')}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                placeholder="Cara penggunaan produk..."
                onChange={(e) => {
                  setValue('applicationMethod', e.target.value, { shouldValidate: false });
                  setFieldSource(prev => ({ ...prev, applicationMethod: 'MANUAL' }));
                }}
              />
            </div>

            <div>
              <div className="flex items-center gap-2 mb-1">
                <label className="block text-sm font-medium text-gray-700">Dosis</label>
                <span className={`text-xs px-2 py-0.5 rounded ${
                  fieldSource.dosage === 'AUTO' 
                    ? 'bg-blue-100 text-blue-700' 
                    : 'bg-green-100 text-green-700'
                }`}>
                  {fieldSource.dosage}
                </span>
              </div>
              <textarea
                {...register('dosage')}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                placeholder="Dosis anjuran..."
                onChange={(e) => {
                  setValue('dosage', e.target.value, { shouldValidate: false });
                  setFieldSource(prev => ({ ...prev, dosage: 'MANUAL' }));
                }}
              />
            </div>

            <div>
              <div className="flex items-center gap-2 mb-1">
                <label className="block text-sm font-medium text-gray-700">Keunggulan</label>
                <span className={`text-xs px-2 py-0.5 rounded ${
                  fieldSource.advantages === 'AUTO' 
                    ? 'bg-blue-100 text-blue-700' 
                    : 'bg-green-100 text-green-700'
                }`}>
                  {fieldSource.advantages}
                </span>
              </div>
              <textarea
                {...register('advantages')}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                placeholder="Keunggulan produk dibanding kompetitor..."
                onChange={(e) => {
                  setValue('advantages', e.target.value, { shouldValidate: false });
                  setFieldSource(prev => ({ ...prev, advantages: 'MANUAL' }));
                }}
              />
            </div>

            <div>
              <div className="flex items-center gap-2 mb-1">
                <label className="block text-sm font-medium text-gray-700">
                  Catatan Keamanan
                </label>
                <span className={`text-xs px-2 py-0.5 rounded ${
                  fieldSource.safetyNotes === 'AUTO' 
                    ? 'bg-blue-100 text-blue-700' 
                    : 'bg-green-100 text-green-700'
                }`}>
                  {fieldSource.safetyNotes}
                </span>
              </div>
              <textarea
                {...register('safetyNotes')}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                placeholder="APD, interval panen, peringatan keamanan, dll..."
                onChange={(e) => {
                  setValue('safetyNotes', e.target.value, { shouldValidate: false });
                  setFieldSource(prev => ({ ...prev, safetyNotes: 'MANUAL' }));
                }}
              />
            </div>
          </div>
        </details>

        {/* ============================================
            PHASE S: JADWAL & APPROVAL
        ============================================ */}
        <div className="border-t pt-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">PHASE S: Jadwal & Approval</h3>
          
          <div className="space-y-4">
            {/* Status Labels */}
            {product && (
              <div className="space-y-2">
                {isScheduled && (
                  <div className="px-3 py-2 bg-blue-100 text-blue-800 rounded text-sm font-medium">
                    ⏰ Menunggu waktu ({product.scheduledAt ? new Date(product.scheduledAt).toLocaleString('id-ID') : ''})
                  </div>
                )}
                {isReadyToPublish && (
                  <div className="px-3 py-2 bg-yellow-100 text-yellow-800 rounded text-sm font-medium">
                    ✅ Siap dipublish {product.approvedAt && `(disetujui ${new Date(product.approvedAt).toLocaleString('id-ID')})`}
                  </div>
                )}
                {isCancelled && (
                  <div className="px-3 py-2 bg-red-100 text-red-800 rounded text-sm font-medium">
                    ❌ Dibatalkan
                  </div>
                )}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tanggal & Jam Publish
              </label>
              <input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                disabled={!product || !isDraft}
              />
              {!product && (
                <p className="text-xs text-gray-500 mt-1">
                  Simpan produk terlebih dahulu untuk mengatur jadwal
                </p>
              )}
              {product && !isDraft && (
                <p className="text-xs text-gray-500 mt-1">
                  Hanya produk dengan status DRAFT yang bisa dijadwalkan
                </p>
              )}
              {scheduledAt && product && isDraft && (
                <p className="text-xs text-blue-600 mt-1">
                  📅 Akan dijadwalkan: {new Date(scheduledAt).toLocaleString('id-ID')}
                </p>
              )}
            </div>

            {/* PHASE S: Schedule Button */}
            {product && isDraft && scheduledAt && (
              <button
                onClick={handleSchedule}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                📅 Schedule
              </button>
            )}

            {/* PHASE S: Approve Button */}
            {product && (isScheduled || isReadyToPublish) && canApprove && (
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
                    type="button"
                    onClick={handleSubmit(onPublish)}
                    disabled={isSubmitting || loading || publishing || status === PRODUCT_STATUS.PUBLISHED}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {/* M-10 STEP 2: Loading state dengan label jelas */}
                    {publishing || isSubmitting ? 'Publishing...' : '🚀 Publish Now'}
                  </button>
                )}
              </div>
            )}

            {/* PHASE S: Cancel Schedule Button */}
            {product && (isScheduled || isReadyToPublish) && (
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

        {/* ============================================
            ACTION BUTTONS
        ============================================ */}
        <div className="flex justify-end gap-4 pt-6 border-t">
          {/* PHASE F: "Lihat di Website" button (hanya jika PUBLISHED dan ada slug) */}
          {product && status === PRODUCT_STATUS.PUBLISHED && watch('slug') && (
            <a
              href={`/produk/${watch('slug')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <ExternalLink className="h-4 w-4" />
              Lihat di Website
            </a>
          )}
          <Link href="/admin/products" className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
            Batal
          </Link>
          
          {/* PHASE B: Save as DRAFT - Gated by AI state */}
          {/* M-10 STEP 6: Disable jika isSubmitting atau status PUBLISHED (opsional) */}
          {/* PHASE B: TIDAK boleh submit jika AI sedang generate atau AI_FAILED (manual input tetap bisa) */}
          <button
            type="submit"
            disabled={
              isSubmitting || 
              loading || 
              publishing || 
              status === PRODUCT_STATUS.PUBLISHED ||
              aiState === 'AI_GENERATING' || // PHASE B: Hanya block saat generating
              (imageState !== 'IMAGE_READY' && imageState !== 'IMAGE_IDLE' && !mainImageUrl) // PHASE C: Block jika image failed dan tidak ada manual image
            }
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            title={
              aiState === 'AI_GENERATING' 
                ? 'Tunggu AI selesai generate' 
                : aiState === 'AI_FAILED'
                ? `AI gagal: ${aiError || 'Silakan generate ulang atau input manual'}`
                : imageState === 'IMAGE_FAILED' && !mainImageUrl
                ? `Image gagal: ${imageError || 'Silakan upload image manual'}`
                : undefined
            }
          >
            <Save className="h-4 w-4" />
            {/* M-10 STEP 2: Loading state dengan label jelas */}
            {loading || isSubmitting ? 'Menyimpan...' : 'Simpan sebagai DRAFT'}
          </button>

          {/* PHASE B + C: Manual Publish - Gated by AI and Image state */}
          {/* M-10 STEP 6: Disable jika status sudah PUBLISHED atau isSubmitting */}
          {/* PHASE B: TIDAK boleh submit jika AI sedang generate (manual input tetap bisa) */}
          {/* PHASE C: TIDAK boleh submit jika image state ≠ IMAGE_READY (kecuali manual upload) */}
          {canPublish && !isReadyToPublish && (
            <button
              type="button"
              onClick={handleSubmit(onPublish)}
              disabled={
                isSubmitting || 
                loading || 
                publishing || 
                status === PRODUCT_STATUS.PUBLISHED ||
                aiState === 'AI_GENERATING' || // PHASE B: Hanya block saat generating
                (imageState !== 'IMAGE_READY' && imageState !== 'IMAGE_IDLE' && !mainImageUrl) // PHASE C: Block jika image failed dan tidak ada manual image
              }
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              title={
                aiState === 'AI_GENERATING' 
                  ? 'Tunggu AI selesai generate' 
                  : aiState === 'AI_FAILED'
                  ? `AI gagal: ${aiError || 'Silakan generate ulang atau input manual'}`
                  : imageState === 'IMAGE_FAILED' && !mainImageUrl
                  ? `Image gagal: ${imageError || 'Silakan upload image manual'}`
                  : undefined
              }
            >
              {/* M-10 STEP 2: Loading state dengan label jelas */}
              {publishing || isSubmitting ? 'Publishing...' : 'Publish'}
            </button>
          )}
        </div>
      </form>

      {/* AI Preview Modal */}
      {/* PHASE S+: Legacy AI Copy Preview Modal removed - using Product v2 AI Generator instead */}

      {/* Notification Modal - Popup Tengah */}
      {notificationModal.show && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className={`p-6 ${notificationModal.type === 'success' ? 'border-t-4 border-green-500' : notificationModal.type === 'error' ? 'border-t-4 border-red-500' : 'border-t-4 border-blue-500'}`}>
              <div className="flex items-start">
                <div className={`flex-shrink-0 ${notificationModal.type === 'success' ? 'text-green-500' : notificationModal.type === 'error' ? 'text-red-500' : 'text-blue-500'}`}>
                  {notificationModal.type === 'success' ? (
                    <Check className="h-6 w-6" />
                  ) : notificationModal.type === 'error' ? (
                    <XCircle className="h-6 w-6" />
                  ) : (
                    <Sparkles className="h-6 w-6" />
                  )}
                </div>
                <div className="ml-4 flex-1">
                  <h3 className={`text-lg font-semibold ${notificationModal.type === 'success' ? 'text-green-800' : notificationModal.type === 'error' ? 'text-red-800' : 'text-blue-800'}`}>
                    {notificationModal.title}
                  </h3>
                  <p className={`mt-2 text-sm ${notificationModal.type === 'success' ? 'text-green-700' : notificationModal.type === 'error' ? 'text-red-700' : 'text-blue-700'}`}>
                    {notificationModal.message}
                  </p>
                </div>
                <button
                  onClick={closeNotificationModal}
                  className="ml-4 flex-shrink-0 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="mt-6 flex justify-end">
                <button
                  onClick={closeNotificationModal}
                  className={`px-4 py-2 rounded-lg font-medium ${
                    notificationModal.type === 'success'
                      ? 'bg-green-600 text-white hover:bg-green-700'
                      : notificationModal.type === 'error'
                      ? 'bg-red-600 text-white hover:bg-red-700'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
