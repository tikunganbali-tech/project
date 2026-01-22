/**
 * CategoryHubContent - Pure presentational component
 * 
 * Displays category hub content:
 * - Cornerstone posts (if any)
 * - Regular articles grid
 * Server component only - no client logic
 */

import BlogCard from './BlogCard';
import type { PublicBlogItem } from '@/lib/public-api';

interface CategoryHubContentProps {
  cornerstone: PublicBlogItem[];
  articles: PublicBlogItem[];
}

export default function CategoryHubContent({
  cornerstone,
  articles,
}: CategoryHubContentProps) {
  if (articles.length === 0 && cornerstone.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-8 text-center">
        <p className="text-gray-500">Belum ada artikel yang tersedia di kategori ini.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5 md:gap-6">
      {articles.map((post) => (
        <BlogCard key={post.id} {...post} />
      ))}
    </div>
  );
}
