/**
 * BlogList - Pure presentational component
 * 
 * Displays grid of blog posts
 * Server component only - no client logic
 */

import BlogCard from './BlogCard';
import type { PublicBlogItem } from '@/lib/public-api';

interface BlogListProps {
  items: PublicBlogItem[];
}

export default function BlogList({ items }: BlogListProps) {
  if (items.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-8 sm:p-12 text-center">
        <div className="max-w-md mx-auto space-y-4">
          <p className="text-gray-700 font-medium text-lg">
            Belum ada artikel yang tersedia
          </p>
          <p className="text-sm text-gray-500 leading-relaxed">
            Kami sedang menyiapkan konten berkualitas untuk Anda. Silakan kembali lagi nanti.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5 md:gap-6">
      {items.map((post) => (
        <BlogCard key={post.id} {...post} />
      ))}
    </div>
  );
}
