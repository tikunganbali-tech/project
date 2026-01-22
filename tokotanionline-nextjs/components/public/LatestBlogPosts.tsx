/**
 * LatestBlogPosts - Pure presentational component
 * 
 * Displays grid of latest blog posts
 * Server component only - no client logic
 */

import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight } from 'lucide-react';

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  publishedAt: Date | string;
}

interface LatestBlogPostsProps {
  items: BlogPost[];
}

export default function LatestBlogPosts({ items }: LatestBlogPostsProps) {
  if (items.length === 0) {
    return null;
  }

  const formatDate = (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-5 lg:gap-6">
        {items.map((post) => (
          <Link key={post.id} href={`/blog/${post.slug}`} className="group">
            <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100 hover:shadow-md transition-shadow h-full flex flex-col">
              <div className="relative h-36 sm:h-40 md:h-44 bg-gray-100">
                <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs sm:text-sm">
                  Artikel
                </div>
              </div>
              <div className="p-3 sm:p-3.5 md:p-4 space-y-1.5 sm:space-y-2 flex-1 flex flex-col">
                <span className="text-xs uppercase tracking-wide text-green-600">
                  Artikel
                </span>
                <h3 className="text-sm sm:text-base md:text-lg font-semibold text-gray-900 group-hover:text-green-600 line-clamp-2 transition">
                  {post.title}
                </h3>
                {post.excerpt && (
                  <p className="text-xs sm:text-sm text-gray-600 line-clamp-2 flex-1">
                    {post.excerpt}
                  </p>
                )}
                <p className="text-xs text-gray-500 mt-auto">
                  {formatDate(post.publishedAt)}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="text-center mt-6 sm:mt-7 md:mt-8">
        <Link href="/blog">
          <button className="border-green-700 text-green-700 hover:bg-green-50 font-semibold px-4 sm:px-5 md:px-6 py-2 sm:py-2.5 md:py-3 rounded-lg border-2 flex items-center gap-2 mx-auto text-xs sm:text-sm md:text-base transition-colors">
            Lihat Semua Artikel
            <ArrowRight className="h-4 w-4 sm:h-4.5 md:h-5 sm:w-4 md:w-5" />
          </button>
        </Link>
      </div>
    </>
  );
}
