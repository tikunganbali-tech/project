'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Save, Calendar, Upload, X, Image as ImageIcon } from 'lucide-react';
import Link from 'next/link';
import { normalizeImageSrc } from '@/lib/normalizeImageSrc';
// Author pseudonyms removed - non-core feature
// Notification utility removed - using simple alerts

const blogSchema = z.object({
  title: z.string().min(1, 'Judul diperlukan'),
  slug: z.string().min(1, 'Slug diperlukan'),
  excerpt: z.string().min(1, 'Excerpt diperlukan'),
  content: z.string().min(1, 'Konten diperlukan'),
  author: z.string().min(1, 'Author diperlukan'),
  categoryId: z.string().min(1, 'Kategori diperlukan'), // EKSEKUSI 3: Wajib pilih kategori
  imageUrl: z.string().optional(),
  status: z.enum(['draft', 'published', 'scheduled']),
  scheduledAt: z.string().optional().nullable(),
  metaTitle: z.string().optional(),
  metaDescription: z.string().optional(),
  relatedProductIds: z.array(z.string()).optional(),
});

type BlogFormData = z.infer<typeof blogSchema>;

interface BlogFormClientProps {
  categories: any[];
  products: any[];
  blog?: any;
}

export default function BlogFormClient({
  categories,
  products,
  blog,
}: BlogFormClientProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<string[]>(
    blog?.blogProducts?.map((bp: any) => bp.productId) || []
  );

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm<BlogFormData>({
    resolver: zodResolver(blogSchema),
    defaultValues: blog
      ? {
          ...blog,
          author: blog.author || 'Admin',
          categoryId: blog.categoryId || null,
          scheduledAt: blog.scheduledAt
            ? new Date(blog.scheduledAt).toISOString().slice(0, 16)
            : null,
          relatedProductIds: blog.blogProducts?.map((bp: any) => bp.productId) || [],
        }
      : {
          status: 'draft',
          author: 'Admin',
        },
  });

  const status = watch('status');
  const imageUrl = watch('imageUrl');

  const generateSlug = (text: string) => {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  const onSubmit = async (data: BlogFormData) => {
    setLoading(true);
    setError('');

    try {
      const payload = {
        ...data,
        categoryId: null, // Legacy field - not used when using unified Category
        unifiedCategoryId: data.categoryId || null, // EKSEKUSI 3: Use unified Category ID
        scheduledAt: data.status === 'scheduled' && data.scheduledAt ? data.scheduledAt : null,
        publishedAt: data.status === 'published' && !blog?.publishedAt ? new Date().toISOString() : blog?.publishedAt,
        relatedProductIds: selectedProducts,
      };

      const url = blog ? `/api/blogs/${blog.id}` : '/api/blogs';
      const method = blog ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Terjadi kesalahan');
      }

      router.push('/admin/blogs');
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleProduct = (productId: string) => {
    setSelectedProducts((prev) =>
      prev.includes(productId)
        ? prev.filter((id) => id !== productId)
        : [...prev, productId]
    );
  };

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

      setValue('imageUrl', data.url);
      alert('Gambar berhasil diupload!');
    } catch (error: any) {
      alert(`Error: ${error.message || 'Upload gagal'}`);
    } finally {
      setUploadingImage(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/blogs" className="text-gray-600 hover:text-gray-900">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">
            {blog ? 'Edit Artikel' : 'Tambah Artikel'}
          </h1>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="bg-white rounded-lg shadow p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Judul *</label>
            <input
              {...register('title')}
              onChange={(e) => {
                register('title').onChange(e);
                if (!blog) {
                  setValue('slug', generateSlug(e.target.value));
                }
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
            />
            {errors.title && <p className="text-red-600 text-sm mt-1">{errors.title.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Slug *</label>
            <input
              {...register('slug')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
            />
            {errors.slug && <p className="text-red-600 text-sm mt-1">{errors.slug.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Kategori *</label>
            <select
              {...register('categoryId')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
            >
              <option value="">Pilih Kategori</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
            {errors.categoryId && (
              <p className="text-red-600 text-sm mt-1">{errors.categoryId.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Author</label>
            <input
              {...register('author')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Excerpt *</label>
          <textarea
            {...register('excerpt')}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
            placeholder="Ringkasan artikel..."
          />
          {errors.excerpt && (
            <p className="text-red-600 text-sm mt-1">{errors.excerpt.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Konten *</label>
          <textarea
            {...register('content')}
            rows={15}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 font-mono text-sm"
            placeholder="Konten artikel dalam format HTML..."
          />
          {errors.content && (
            <p className="text-red-600 text-sm mt-1">{errors.content.message}</p>
          )}
          <p className="text-xs text-gray-500 mt-1">
            Gunakan HTML untuk formatting. Contoh: &lt;p&gt;Paragraf&lt;/p&gt;, &lt;h2&gt;Heading&lt;/h2&gt;
          </p>
        </div>

        {/* Featured Image Upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Featured Image</label>
          <div className="space-y-3">
            {imageUrl && (
              <div className="relative inline-block">
                <img 
                  src={normalizeImageSrc(imageUrl)} 
                  alt="Featured Image Preview" 
                  className="h-48 object-cover border border-gray-200 rounded-lg p-2 bg-gray-50"
                />
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
                {...register('imageUrl')}
                type="text"
                placeholder="Atau masukkan URL gambar"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
              />
              {imageUrl && (
                <button
                  type="button"
                  onClick={() => setValue('imageUrl', '')}
                  className="flex items-center gap-1 px-3 py-2 text-sm text-red-600 border border-red-300 rounded-lg hover:bg-red-50 transition-colors"
                >
                  <X className="h-4 w-4" />
                  Hapus
                </button>
              )}
            </div>
            <p className="text-xs text-gray-500">
              Upload gambar atau masukkan URL. Format yang didukung: JPG, PNG, GIF, WebP. Maksimal 5MB.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              {...register('status')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
            >
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="scheduled">Scheduled</option>
            </select>
          </div>
        </div>

        {status === 'scheduled' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Jadwal Publish
            </label>
            <input
              {...register('scheduledAt')}
              type="datetime-local"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
            />
          </div>
        )}

        {/* Related Products */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Produk Terkait (untuk ditampilkan di artikel)
          </label>
          <div className="border border-gray-300 rounded-lg p-4 max-h-60 overflow-y-auto">
            {products.length > 0 ? (
              <div className="space-y-2">
                {products.map((product) => (
                  <label
                    key={product.id}
                    className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedProducts.includes(product.id)}
                      onChange={() => toggleProduct(product.id)}
                      className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
                    />
                    <span className="text-sm">{product.name}</span>
                  </label>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">Tidak ada produk tersedia</p>
            )}
          </div>
        </div>

        {/* SEO */}
        <div className="border-t pt-6">
          <h3 className="text-lg font-semibold mb-4">SEO Settings</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Meta Title</label>
              <input
                {...register('metaTitle')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Meta Description
              </label>
              <textarea
                {...register('metaDescription')}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-4 pt-6 border-t">
          <Link href="/admin/blogs" className="btn-secondary">
            Batal
          </Link>
          <button type="submit" disabled={loading} className="btn-primary flex items-center gap-2">
            <Save className="h-4 w-4" />
            {loading ? 'Menyimpan...' : 'Simpan Artikel'}
          </button>
        </div>
      </form>
    </div>
  );
}


