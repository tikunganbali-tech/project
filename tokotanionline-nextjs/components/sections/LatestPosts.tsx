import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

interface Post {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  publishedAt: Date | string;
  category?: string | null;
  author?: string | null;
}

interface LatestPostsProps {
  posts: Post[];
}

function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('id-ID', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(d);
}

export default function LatestPosts({ posts }: LatestPostsProps) {
  // Display 3 latest posts like reference design
  const displayPosts = posts.slice(0, 3);

  if (displayPosts.length === 0) {
    return null;
  }

  return (
    <section className="py-10 sm:py-12 md:py-14 lg:py-16 bg-white">
      <div className="container mx-auto px-4 sm:px-5 md:px-6 lg:px-8">
        <div className="text-center mb-8 sm:mb-10 md:mb-12">
          <h2 className="text-2xl sm:text-2.5xl md:text-3xl lg:text-3.5xl font-bold mb-2 sm:mb-3 text-gray-900">Tips & Artikel Pertanian</h2>
          <p className="text-sm sm:text-base text-gray-600">Panduan lengkap untuk meningkatkan hasil panen Anda</p>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6 md:gap-7 lg:gap-8">
          {displayPosts.map((post) => (
            <Link
              key={post.id}
              href={`/blog/${post.slug}`}
              className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-all duration-300 group"
            >
              <div className="relative aspect-[4/3] bg-gray-200 overflow-hidden">
                <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-sm">
                  Image: {post.title}
                </div>
              </div>
              <div className="p-4 sm:p-5 md:p-6">
                {post.category && (
                  <span className="inline-block text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded mb-2">
                    {post.category}
                  </span>
                )}
                <h3 className="font-semibold text-base sm:text-lg md:text-xl mt-2 mb-2 group-hover:text-green-700 transition-colors line-clamp-2">
                  {post.title}
                </h3>
                <p className="text-sm sm:text-base text-gray-600 mb-3 line-clamp-3">
                  {post.excerpt || ''}
                </p>
                <div className="flex items-center justify-between text-xs sm:text-sm text-gray-500 pt-2 border-t border-gray-100">
                  <span>{post.author || 'Admin'}</span>
                  <span>{formatDate(post.publishedAt)}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>

        <div className="text-center mt-10 sm:mt-12 md:mt-14">
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 bg-green-700 text-white px-6 py-3 sm:px-7 sm:py-3.5 md:px-8 md:py-4 rounded-lg font-semibold hover:bg-green-800 transition-colors text-sm sm:text-base"
          >
            Baca Artikel Lainnya
            <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5" />
          </Link>
        </div>
      </div>
    </section>
  );
}
