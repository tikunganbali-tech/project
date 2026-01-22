/**
 * PHASE C2-A — MEDIA LIBRARY CLIENT COMPONENT
 * 
 * Features:
 * - List semua media files
 * - Status USED/UNUSED
 * - Safe delete (hanya UNUSED)
 * - Loading, empty, error states
 * - Production-grade UX
 */

'use client';

import { useState, useEffect } from 'react';
import { Trash2, Eye, Loader2, AlertCircle, Image as ImageIcon, Trash2 as BulkDeleteIcon, RefreshCw } from 'lucide-react';
import Image from 'next/image';
import { useNotification } from '@/lib/notification-context';
import { normalizeImageSrc } from '@/lib/normalizeImageSrc';

interface MediaItem {
  id: string;
  url: string;
  filename: string;
  size: number;
  createdAt: string;
  isUsed: boolean;
  usedIn?: string[];
}

interface MediaLibraryResponse {
  success: boolean;
  media: MediaItem[];
  total: number;
  used: number;
  unused: number;
  error?: string;
}

interface MediaLibraryClientProps {
  userRole: string;
}

type FilterOption = 'all' | 'used' | 'unused';

export default function MediaLibraryClient({ userRole }: MediaLibraryClientProps) {
  const { showNotification } = useNotification();
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterOption>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<{ url: string; filename: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [stats, setStats] = useState({ total: 0, used: 0, unused: 0 });
  const [bulkCleaning, setBulkCleaning] = useState(false);
  const [bulkCleanupConfirm, setBulkCleanupConfirm] = useState(false);

  // Fetch media on mount
  useEffect(() => {
    fetchMedia();
  }, []);

  const fetchMedia = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/admin/media');
      const data: MediaLibraryResponse = await response.json();
      
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to fetch media');
      }
      
      // PHASE S+: Backend sudah melakukan file existence check yang ketat
      // Jangan filter lagi di frontend karena bisa menghapus file yang valid
      // Frontend verification di-disable karena:
      // 1. Backend sudah check dengan fs.existsSync (reliable)
      // 2. HEAD request bisa gagal karena CORS, auth, atau network issues
      // 3. File yang ada di backend tapi gagal HEAD request tetap harus ditampilkan
      
      setMedia(data.media);
      setStats({
        total: data.total,
        used: data.used,
        unused: data.unused,
      });
    } catch (err: any) {
      setError(err.message || 'Failed to load media');
      console.error('Error fetching media:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (url: string, filename: string) => {
    setDeleteConfirm({ url, filename });
  };

  const confirmDelete = async () => {
    if (!deleteConfirm) return;
    
    setDeleting(true);
    try {
      const encodedUrl = encodeURIComponent(deleteConfirm.url);
      const response = await fetch(`/api/admin/media/delete?url=${encodedUrl}`, {
        method: 'DELETE',
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete media');
      }
      
      // PHASE S+: Notification
      showNotification('Media berhasil dihapus', 'success', {
        title: 'Berhasil',
        duration: 2000,
      });
      
      // Refresh media list
      await fetchMedia();
      setDeleteConfirm(null);
    } catch (err: any) {
      showNotification(err.message || 'Failed to delete media', 'error', {
        title: 'Error',
        duration: 5000,
      });
      console.error('Error deleting media:', err);
    } finally {
      setDeleting(false);
    }
  };

  // PHASE S+: Bulk cleanup unused media
  const handleBulkCleanup = async () => {
    if (!bulkCleanupConfirm) {
      setBulkCleanupConfirm(true);
      return;
    }

    setBulkCleaning(true);
    setBulkCleanupConfirm(false);
    
    // Background notification
    const bgNotifId = showNotification('Sedang membersihkan media tidak terpakai...', 'info', {
      title: 'Media Cleanup',
      isBackground: true,
    });

    try {
      const response = await fetch('/api/admin/media/cleanup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dryRun: false }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to cleanup media');
      }
      
      // Success notification
      showNotification(
        `Berhasil menghapus ${data.summary.deleted} file tidak terpakai (${data.summary.totalSizeMB} MB)`,
        'success',
        {
          title: 'Media Cleanup Selesai',
          duration: 5000,
        }
      );
      
      // Background notification update
      showNotification(
        `Media cleanup selesai: ${data.summary.deleted} file dihapus, ${data.summary.failed} gagal`,
        'success',
        {
          title: 'Media Cleanup',
          isBackground: true,
        }
      );
      
      // Refresh media list dengan delay untuk memastikan file benar-benar terhapus dari filesystem
      await new Promise(resolve => setTimeout(resolve, 1000));
      await fetchMedia();
    } catch (err: any) {
      showNotification(err.message || 'Failed to cleanup media', 'error', {
        title: 'Media Cleanup Error',
        duration: 5000,
      });
      
      // Background notification update
      showNotification(`Media cleanup gagal: ${err.message}`, 'error', {
        title: 'Media Cleanup',
        isBackground: true,
      });
      
      console.error('Error bulk cleanup:', err);
    } finally {
      setBulkCleaning(false);
    }
  };

  // Filter and search media
  const filteredMedia = media.filter((item) => {
    // Filter by status
    if (filter === 'used' && !item.isUsed) return false;
    if (filter === 'unused' && item.isUsed) return false;
    
    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      return (
        item.filename.toLowerCase().includes(searchLower) ||
        item.url.toLowerCase().includes(searchLower)
      );
    }
    
    return true;
  });

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Format date
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Media Library</h1>
          <p className="text-sm text-gray-600 mt-1">
            Kelola semua file media. Hanya file yang tidak digunakan dapat dihapus.
          </p>
        </div>
        
        {/* PHASE S+: Bulk Cleanup Button (super_admin only) */}
        {userRole === 'super_admin' && stats.unused > 0 && (
          <button
            onClick={handleBulkCleanup}
            disabled={bulkCleaning}
            className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {bulkCleaning ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Membersihkan...
              </>
            ) : (
              <>
                <BulkDeleteIcon className="w-4 h-4" />
                Hapus Semua Tidak Terpakai ({stats.unused})
              </>
            )}
          </button>
        )}
      </div>

      {/* Stats */}
      {!loading && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white border rounded-lg p-4">
            <div className="text-sm text-gray-600">Total Media</div>
            <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
          </div>
          <div className="bg-white border rounded-lg p-4">
            <div className="text-sm text-gray-600">Digunakan</div>
            <div className="text-2xl font-bold text-green-600">{stats.used}</div>
          </div>
          <div className="bg-white border rounded-lg p-4">
            <div className="text-sm text-gray-600">Tidak Digunakan</div>
            <div className="text-2xl font-bold text-orange-600">{stats.unused}</div>
          </div>
        </div>
      )}

      {/* Filters & Search */}
      <div className="bg-white border rounded-lg p-4 space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <input
              type="text"
              placeholder="Cari nama file atau URL..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
            />
          </div>
          
          {/* Filter */}
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                filter === 'all'
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Semua ({stats.total})
            </button>
            <button
              onClick={() => setFilter('used')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                filter === 'used'
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Digunakan ({stats.used})
            </button>
            <button
              onClick={() => setFilter('unused')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                filter === 'unused'
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Tidak Digunakan ({stats.unused})
            </button>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
          <span className="ml-3 text-gray-600">Memuat media...</span>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <div className="font-medium text-red-900">Error</div>
            <div className="text-sm text-red-700 mt-1">{error}</div>
            <button
              onClick={fetchMedia}
              className="mt-3 text-sm text-red-600 hover:text-red-800 underline"
            >
              Coba lagi
            </button>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && filteredMedia.length === 0 && (
        <div className="bg-white border rounded-lg p-12 text-center">
          <ImageIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <div className="text-gray-600 font-medium">
            {searchTerm || filter !== 'all' ? 'Tidak ada media yang sesuai filter' : 'Belum ada media'}
          </div>
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="mt-2 text-sm text-gray-500 hover:text-gray-700 underline"
            >
              Hapus filter
            </button>
          )}
        </div>
      )}

      {/* PHASE D: Media Grid - Only render valid media */}
      {!loading && !error && filteredMedia.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredMedia.map((item) => {
            // PHASE D: Ensure React key is unique (use media.id which is already unique)
            // item.id is generated from URL using generateMediaId helper
            const uniqueKey = item.id || `media-${item.url}`;
            
            return (
            <div
              key={uniqueKey}
              className="bg-white border rounded-lg overflow-hidden hover:shadow-md transition"
            >
              {/* Thumbnail */}
              <div className="relative w-full h-48 bg-gray-100 overflow-hidden flex items-center justify-center">
                {/* PHASE S+: Fallback placeholder jika image error */}
                <Image
                  src={normalizeImageSrc(item.url)}
                  alt={item.filename}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                  unoptimized
                  onError={(e) => {
                    // PHASE S+: Handle image load error - hide image dan show placeholder
                    console.warn(`[MEDIA-LIBRARY] Failed to load image: ${item.url}`);
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    
                    // Show placeholder in parent
                    const parent = target.parentElement;
                    if (parent) {
                      parent.innerHTML = `
                        <div class="w-full h-full flex items-center justify-center bg-gray-200 text-gray-400">
                          <div class="text-center">
                            <svg class="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                            </svg>
                            <p class="text-xs">File tidak ditemukan</p>
                          </div>
                        </div>
                      `;
                    }
                  }}
                />
                {/* Status Badge */}
                <div className="absolute top-2 right-2 z-10">
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium ${
                      item.isUsed
                        ? 'bg-green-100 text-green-800'
                        : 'bg-orange-100 text-orange-800'
                    }`}
                  >
                    {item.isUsed ? 'DIGUNAKAN' : 'TIDAK DIGUNAKAN'}
                  </span>
                </div>
              </div>

              {/* Info */}
              <div className="p-4 space-y-2">
                <div className="text-sm font-medium text-gray-900 truncate" title={item.filename}>
                  {item.filename}
                </div>
                <div className="text-xs text-gray-500 truncate" title={item.url}>
                  {item.url}
                </div>
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>{formatFileSize(item.size)}</span>
                  <span>{formatDate(item.createdAt)}</span>
                </div>
                
                {/* Used In */}
                {item.isUsed && item.usedIn && item.usedIn.length > 0 && (
                  <div className="text-xs text-gray-600">
                    Digunakan di: {item.usedIn.join(', ')}
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-2 border-t">
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm text-gray-700 bg-gray-100 rounded hover:bg-gray-200 transition"
                  >
                    <Eye className="w-4 h-4" />
                    Lihat
                  </a>
                  <button
                    onClick={() => handleDelete(item.url, item.filename)}
                    disabled={item.isUsed || deleting}
                    className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm rounded transition ${
                      item.isUsed
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-red-100 text-red-700 hover:bg-red-200'
                    }`}
                    title={item.isUsed ? 'Dipakai di konten' : 'Hapus media'}
                  >
                    <Trash2 className="w-4 h-4" />
                    Hapus
                  </button>
                </div>
              </div>
            </div>
            );
          })}
        </div>
      )}

      {/* PHASE S+: Bulk Cleanup Confirmation Modal */}
      {bulkCleanupConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Konfirmasi Bulk Cleanup</h3>
            <p className="text-sm text-gray-600 mb-4">
              Anda akan menghapus <strong>{stats.unused} file media</strong> yang tidak terpakai.
              Tindakan ini tidak dapat dibatalkan.
            </p>
            <div className="bg-orange-50 border border-orange-200 rounded p-3 mb-4">
              <div className="text-sm text-orange-900">
                <strong>Perhatian:</strong> Pastikan semua file yang akan dihapus benar-benar tidak digunakan.
                Hanya super_admin yang dapat melakukan operasi ini.
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setBulkCleanupConfirm(false)}
                disabled={bulkCleaning}
                className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded hover:bg-gray-200 transition disabled:opacity-50"
              >
                Batal
              </button>
              <button
                onClick={handleBulkCleanup}
                disabled={bulkCleaning}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-orange-600 rounded hover:bg-orange-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {bulkCleaning ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Membersihkan...
                  </>
                ) : (
                  <>
                    <BulkDeleteIcon className="w-4 h-4" />
                    Ya, Hapus Semua
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Konfirmasi Hapus</h3>
            <p className="text-sm text-gray-600 mb-4">
              File ini akan dihapus permanen. Lanjutkan?
            </p>
            <div className="bg-gray-50 rounded p-3 mb-4">
              <div className="text-sm font-medium text-gray-900">{deleteConfirm.filename}</div>
              <div className="text-xs text-gray-500 mt-1 truncate">{deleteConfirm.url}</div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                disabled={deleting}
                className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded hover:bg-gray-200 transition disabled:opacity-50"
              >
                Batal
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleting}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded hover:bg-red-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {deleting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Menghapus...
                  </>
                ) : (
                  'Hapus'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
