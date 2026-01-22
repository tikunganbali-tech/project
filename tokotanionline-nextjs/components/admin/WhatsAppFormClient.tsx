'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save } from 'lucide-react';
import Link from 'next/link';

export default function WhatsAppFormClient({ admin }: { admin?: any }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState(admin?.name || '');
  const [phone, setPhone] = useState(admin?.phone || '');
  const [isActive, setIsActive] = useState(admin?.isActive !== false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const url = admin ? `/api/whatsapp/admins/${admin.id}` : '/api/whatsapp/admins';
      const method = admin ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone, isActive }),
      });

      if (response.ok) {
        router.push('/admin/whatsapp');
        router.refresh();
      } else {
        alert('Gagal menyimpan');
      }
    } catch (error) {
      alert('Terjadi kesalahan');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/whatsapp" className="text-gray-600 hover:text-gray-900">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">
          {admin ? 'Edit WhatsApp Admin' : 'Tambah WhatsApp Admin'}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nama *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Phone *</label>
          <input
            type="text"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
            placeholder="6281234567890"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
          />
          <p className="text-xs text-gray-500 mt-1">Format: 6281234567890 (tanpa +)</p>
        </div>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="w-4 h-4 text-green-600 rounded"
          />
          <span>Active</span>
        </label>

        <div className="flex justify-end gap-4 pt-6 border-t">
          <Link href="/admin/whatsapp" className="btn-secondary">
            Batal
          </Link>
          <button type="submit" disabled={loading} className="btn-primary flex items-center gap-2">
            <Save className="h-4 w-4" />
            {loading ? 'Menyimpan...' : 'Simpan'}
          </button>
        </div>
      </form>
    </div>
  );
}



