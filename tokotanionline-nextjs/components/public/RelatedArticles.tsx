/**
 * EKSEKUSI 2 - RELATED ARTICLES COMPONENT
 * 
 * Menampilkan artikel terkait untuk produk
 */

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { FileText, Calendar } from 'lucide-react';
import { normalizeImageSrc } from '@/lib/normalizeImageSrc';

interface Article {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  publishedAt: string;
  featuredImageUrl: string | null;
}

interface RelatedArticlesProps {
  productSlug: string;
}

export default function RelatedArticles({ productSlug }: RelatedArticlesProps) {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRelatedArticles();
  }, [productSlug]);

  const fetchRelatedArticles = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/public/produk/${productSlug}/related-articles`);
      
      if (response.ok) {
        const data = await response.json();
        setArticles(data.articles || []);
      }
    } catch (error) {
      console.error('Error fetching related articles:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="mt-12 bg-white rounded-xl shadow-sm p-6">
        <p className="text-gray-500">Memuat artikel terkait...</p>
      </div>
    );
  }

  if (articles.length === 0) {
    return null; // Don't show section if no articles
  }

  return (
    <div className="mt-12 bg-white rounded-xl shadow-sm p-6 sm:p-8 md:p-10">
      <div className="flex items-center gap-2 mb-6">
        <FileText className="h-5 w-5 text-green-600" />
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">
          Artikel Terkait
        </h2>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {articles.map((article) => (
          <Link
            key={article.id}
            href={`/blog/${article.slug}`}
            className="group bg-gray-50 rounded-lg overflow-hidden hover:shadow-lg transition-shadow"
          >
            <div className="relative h-48 bg-gray-200">
              {article.featuredImageUrl ? (
                <Image
                  src={normalizeImageSrc(article.featuredImageUrl)}
                  alt={article.title}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  <FileText className="h-12 w-12" />
                </div>
              )}
            </div>
            <div className="p-4">
              <h3 className="text-base font-semibold text-gray-900 mb-2 line-clamp-2 group-hover:text-green-600 transition-colors">
                {article.title}
              </h3>
              {article.excerpt && (
                <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                  {article.excerpt}
                </p>
              )}
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Calendar className="h-3 w-3" />
                <span>
                  {new Date(article.publishedAt).toLocaleDateString('id-ID', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
