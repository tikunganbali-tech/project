/**
 * SortDropdown - Client component for sorting
 */

'use client';

import { useRouter, useSearchParams } from 'next/navigation';

interface SortDropdownProps {
  currentSort: string;
  category?: string;
}

export default function SortDropdown({ currentSort, category }: SortDropdownProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const params = new URLSearchParams(searchParams?.toString() || '');
    if (category) {
      params.set('category', category);
    }
    if (e.target.value !== 'newest') {
      params.set('sort', e.target.value);
    } else {
      params.delete('sort');
    }
    router.push(`/produk${params.toString() ? `?${params.toString()}` : ''}`);
  };

  return (
    <select 
      value={currentSort}
      onChange={handleSortChange}
      className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-700"
    >
      <option value="newest">Paling Relevan</option>
      <option value="price_asc">Harga: Terendah</option>
      <option value="price_desc">Harga: Tertinggi</option>
    </select>
  );
}
