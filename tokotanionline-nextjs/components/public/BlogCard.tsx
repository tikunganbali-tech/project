/**
 * BlogCard - Pure presentational component
 * 
 * Displays a single blog post card
 * Server component only - no client logic
 */

import Link from 'next/link';

interface BlogCardProps {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  publishedAt: string | Date;
}

export default function BlogCard({
  title,
  slug,
  excerpt,
  publishedAt,
}: BlogCardProps) {
  const formatDate = (date: string | Date) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <Link href={`/blog/${slug}`} className="group">
      <article className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100 hover:shadow-md transition-shadow h-full flex flex-col">
        <div className="p-4 sm:p-5 md:p-6 space-y-3 flex-1 flex flex-col">
          <h2 className="text-lg sm:text-xl md:text-2xl font-semibold text-gray-900 group-hover:text-green-700 line-clamp-2 transition">
            {title}
          </h2>
          
          {excerpt && (
            <p className="text-sm sm:text-base text-gray-600 line-clamp-3 flex-1">
              {excerpt}
            </p>
          )}

          <div className="flex items-center justify-between pt-2 border-t border-gray-100">
            <time className="text-xs sm:text-sm text-gray-500">
              {formatDate(publishedAt)}
            </time>
            <span className="text-xs sm:text-sm text-green-700 font-medium group-hover:underline">
              Baca selengkapnya →
            </span>
          </div>
        </div>
      </article>
    </Link>
  );
}
