/**
 * PHASE 3.2.3: Admin Blog Posts Manager Component
 * 
 * Features:
 * - Dense table (not cards)
 * - Status badges
 * - Filter: Status, Search title
 * - Actions: Edit, Publish (super_admin only), Archive
 */

'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Plus, Edit, Archive } from 'lucide-react';
import { isSuperAdmin } from '@/lib/permissions';

interface Author {
  id: string;
  name: string;
  email: string;
}

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  status: 'DRAFT' | 'SCHEDULED' | 'READY_TO_PUBLISH' | 'PUBLISHED' | 'CANCELLED' | 'REVIEW' | 'ARCHIVED'; // PHASE S
  updatedAt: string;
  scheduledAt: string | null;
  approvedAt: string | null; // PHASE S
  approvedBy: string | null; // PHASE S
  author: Author | null;
  approver?: Author | null; // PHASE S
  // Category is optional - not in schema yet, but prepared for future
  category?: string | null;
}

interface BlogPostsManagerClientProps {
  initialPosts: BlogPost[];
  userRole?: string;
}

type StatusFilter = 'all' | 'DRAFT' | 'SCHEDULED' | 'READY_TO_PUBLISH' | 'PUBLISHED' | 'CANCELLED' | 'REVIEW' | 'ARCHIVED'; // PHASE S
type CategoryFilter = 'all' | string;
type AuthorFilter = 'all' | string;

export default function BlogPostsManagerClient({
  initialPosts,
  userRole,
}: BlogPostsManagerClientProps) {
  const router = useRouter();
  const [posts, setPosts] = useState<BlogPost[]>(initialPosts);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [authorFilter, setAuthorFilter] = useState<AuthorFilter>('all');
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Get unique categories and authors for filters
  const categories = useMemo(() => {
    const cats = new Set<string>();
    posts.forEach((post) => {
      if (post.category) cats.add(post.category);
    });
    return Array.from(cats).sort();
  }, [posts]);

  const authors = useMemo(() => {
    const auths = new Map<string, string>();
    posts.forEach((post) => {
      if (post.author) {
        auths.set(post.author.id, post.author.name || post.author.email);
      }
    });
    return Array.from(auths.entries()).map(([id, name]) => ({ id, name }));
  }, [posts]);

  // Filter posts
  const filteredPosts = useMemo(() => {
    let filtered = [...posts];

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter((post) =>
        post.title.toLowerCase().includes(term)
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter((post) => post.status === statusFilter);
    }

    // Category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter((post) => post.category === categoryFilter);
    }

    // Author filter
    if (authorFilter !== 'all') {
      filtered = filtered.filter((post) => post.author?.id === authorFilter);
    }

    return filtered;
  }, [posts, searchTerm, statusFilter, categoryFilter, authorFilter]);

  // FASE 2.2: No publish CTA in list - removed

  // Handle archive
  const handleArchive = async (postId: string) => {
    if (!confirm('Yakin ingin archive post ini?')) {
      return;
    }

    setActionLoading(postId);
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch(`/api/admin/blog/posts/${postId}/archive`, {
        method: 'POST',
      });

      if (!response.ok) {
        const result = await response.json();
        setError(result.error || 'Gagal archive post');
        setTimeout(() => setError(null), 5000);
        return;
      }

      setSuccess('Post berhasil di-archive');
      setTimeout(() => setSuccess(null), 3000);
      router.refresh();
    } catch (error: any) {
      setError(`Error: ${error.message}`);
      setTimeout(() => setError(null), 5000);
    } finally {
      setActionLoading(null);
    }
  };

  // PHASE S: Status text with visual indicators
  const getStatusText = (status: string) => {
    const statusMap: Record<string, { text: string; color: string }> = {
      'DRAFT': { text: 'DRAFT', color: 'text-gray-600' },
      'SCHEDULED': { text: '⏰ SCHEDULED (Menunggu waktu)', color: 'text-blue-600' },
      'READY_TO_PUBLISH': { text: '✅ READY_TO_PUBLISH (Siap dipublish)', color: 'text-yellow-600' },
      'PUBLISHED': { text: '🚀 PUBLISHED', color: 'text-green-600' },
      'CANCELLED': { text: '❌ CANCELLED', color: 'text-red-600' },
      'REVIEW': { text: 'REVIEW', color: 'text-orange-600' },
      'ARCHIVED': { text: 'ARCHIVED', color: 'text-gray-500' },
    };
    return statusMap[status] || { text: status, color: 'text-gray-600' };
  };

  const canPublish = isSuperAdmin(userRole || '');

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
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Blog Posts</h1>
          <p className="text-sm text-gray-600 mt-1">
            Kelola konten blog (DRAFT → REVIEW → PUBLISHED → ARCHIVED)
          </p>
        </div>
        <Link
          href="/admin/blog/posts/new"
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="h-5 w-5" />
          Buat Post Baru
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Cari Judul
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari post..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
            />
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Filter Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
            >
              <option value="all">Semua Status</option>
              <option value="DRAFT">DRAFT</option>
              <option value="SCHEDULED">SCHEDULED</option>
              <option value="READY_TO_PUBLISH">READY_TO_PUBLISH</option>
              <option value="PUBLISHED">PUBLISHED</option>
              <option value="CANCELLED">CANCELLED</option>
              <option value="REVIEW">REVIEW</option>
              <option value="ARCHIVED">ARCHIVED</option>
            </select>
          </div>

          {/* Category Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Filter Category
            </label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as CategoryFilter)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
            >
              <option value="all">Semua Category</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Author Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Filter Author
            </label>
            <select
              value={authorFilter}
              onChange={(e) => setAuthorFilter(e.target.value as AuthorFilter)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
            >
              <option value="all">Semua Author</option>
              {authors.map((author) => (
                <option key={author.id} value={author.id}>
                  {author.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Dense Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Title
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Author
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Updated At
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Scheduled At
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredPosts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <p className="text-gray-600 font-medium">
                        {posts.length === 0
                          ? 'Belum ada blog post'
                          : 'Tidak ada post yang sesuai dengan filter'}
                      </p>
                      <p className="text-sm text-gray-500">
                        {posts.length === 0
                          ? 'Klik "Buat Post Baru" untuk membuat post pertama.'
                          : 'Coba ubah filter atau hapus pencarian untuk melihat semua post.'}
                      </p>
                      {posts.length === 0 ? (
                        <Link
                          href="/admin/blog/posts/new"
                          className="mt-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 text-sm"
                        >
                          Buat Post Baru
                        </Link>
                      ) : (
                        <button
                          onClick={() => {
                            setSearchTerm('');
                            setStatusFilter('all');
                            setCategoryFilter('all');
                            setAuthorFilter('all');
                          }}
                          className="mt-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm"
                        >
                          Reset Filter
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredPosts.map((post) => (
                  <tr key={post.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {post.title}
                      </div>
                      <div className="text-xs text-gray-500 font-mono">
                        {post.slug}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={getStatusText(post.status).color}>
                        {getStatusText(post.status).text}
                      </span>
                      {/* PHASE S: Show approval info */}
                      {post.status === 'READY_TO_PUBLISH' && post.approvedAt && (
                        <div className="text-xs text-gray-500 mt-1">
                          Disetujui: {new Date(post.approvedAt).toLocaleDateString('id-ID')}
                          {post.approver && ` oleh ${post.approver.name}`}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {post.category || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {post.author?.name || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(post.updatedAt).toLocaleDateString('id-ID', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {post.scheduledAt
                        ? new Date(post.scheduledAt).toLocaleDateString('id-ID', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/admin/blog/posts/${post.id}/edit`}
                          className="text-blue-600 hover:text-blue-900"
                          title="Edit"
                        >
                          <Edit className="h-4 w-4" />
                        </Link>
                        {post.status !== 'ARCHIVED' && (
                          <button
                            onClick={() => handleArchive(post.id)}
                            disabled={actionLoading === post.id}
                            className="text-red-600 hover:text-red-900 disabled:opacity-50"
                            title="Archive"
                          >
                            <Archive className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
