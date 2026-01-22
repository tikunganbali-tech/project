'use client';

import Link from 'next/link';
import { Calendar, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

interface PostDetailClientProps {
  post: any;
  relatedPosts: any[];
}

export default function PostDetailClient({ post, relatedPosts }: PostDetailClientProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link
          href="/blog"
          className="inline-flex items-center text-green-600 hover:text-green-700 mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Kembali ke Blog
        </Link>

        <article className="bg-white rounded-lg shadow-md p-6 sm:p-8 lg:p-12 max-w-4xl mx-auto">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            {post.title}
          </h1>
          
          <div className="flex items-center text-sm text-gray-500 mb-6">
            <Calendar className="h-4 w-4 mr-2" />
            {format(new Date(post.createdAt), 'dd MMMM yyyy', { locale: id })}
          </div>

          <div
            className="prose prose-lg max-w-none"
            dangerouslySetInnerHTML={{ __html: post.content }}
          />
        </article>

        {relatedPosts.length > 0 && (
          <div className="mt-12 max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Artikel Terkait</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {relatedPosts.map((relatedPost) => (
                <Link
                  key={relatedPost.id}
                  href={`/blog/${relatedPost.slug}`}
                  className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
                >
                  <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2">
                    {relatedPost.title}
                  </h3>
                  <div className="text-gray-500 text-sm">
                    {format(new Date(relatedPost.createdAt), 'dd MMM yyyy', { locale: id })}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

