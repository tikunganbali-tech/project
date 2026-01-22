'use client';

import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Calendar, User, Search, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { useState, useMemo } from 'react';
import { normalizeImageSrc } from '@/lib/normalizeImageSrc';

interface BlogClientProps {
  blogs: any[];
  categories: any[];
  selectedCategory?: string;
}

export default function BlogClient({
  blogs,
  categories,
  selectedCategory,
}: BlogClientProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredBlogs = useMemo(() => {
    return blogs.filter((blog) => {
      const matchesSearch = blog.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (blog.excerpt || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = !selectedCategory || blog.category?.slug === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [searchQuery, selectedCategory, blogs]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-green-700 text-white py-8 sm:py-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl sm:text-4xl font-bold mb-3 sm:mb-4">Blog & Artikel</h1>
          <p className="text-sm sm:text-base md:text-lg text-green-100">
            Tips, panduan, dan informasi terkini seputar pertanian
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="flex flex-col lg:flex-row gap-4 sm:gap-6 lg:gap-8">
          {/* Sidebar */}
          <div className="lg:w-64 flex-shrink-0">
            <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 sticky top-20">
              <h3 className="font-semibold text-base sm:text-lg mb-3 sm:mb-4">Filter Artikel</h3>
              
              {/* Search */}
              <div className="mb-4 sm:mb-6">
                <label className="text-xs sm:text-sm font-medium mb-2 block">Cari Artikel</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Cari artikel..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-700"
                  />
                </div>
              </div>

              {/* Categories */}
              <div>
                <label className="text-xs sm:text-sm font-medium mb-3 block">Kategori</label>
                <div className="space-y-1.5 sm:space-y-2">
                  <Link
                    href="/blog"
                    className={`block w-full text-left px-4 py-2 rounded-lg transition ${
                      !selectedCategory
                        ? 'bg-green-700 text-white hover:bg-green-800'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Semua
                    <span className="ml-auto float-right bg-white/20 text-xs px-2 py-1 rounded">
                      {blogs.length}
                    </span>
                  </Link>
                  {categories.map((category) => {
                    const categoryCount = blogs.filter((b) => b.category?.slug === category.slug).length;
                    return (
                      <Link
                        key={category.id}
                        href={`/blog?category=${category.slug}`}
                        className={`block w-full text-left px-4 py-2 rounded-lg transition ${
                          selectedCategory === category.slug
                            ? 'bg-green-700 text-white hover:bg-green-800'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {category.name}
                        <span className="ml-auto float-right bg-white/20 text-xs px-2 py-1 rounded">
                          {categoryCount}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Blog Grid */}
          <div className="flex-1">
            <div className="mb-4 sm:mb-6 flex items-center justify-between">
              <p className="text-sm sm:text-base text-gray-600">
                Menampilkan <span className="font-semibold">{filteredBlogs.length}</span> artikel
              </p>
            </div>

            {filteredBlogs.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {filteredBlogs.map((blog, idx) => (
                  <Link key={blog.id} href={`/blog/${blog.slug}`} className="group">
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      whileHover={{ y: -5 }}
                      className="bg-white rounded-lg shadow-md overflow-hidden h-full flex flex-col hover:shadow-xl transition-all duration-300"
                    >
                      {blog.imageUrl && (
                        <div className="relative h-40 sm:h-48 bg-gray-100 overflow-hidden">
                          <Image
                            src={normalizeImageSrc(blog.imageUrl)}
                            alt={blog.title}
                            fill
                            className="object-cover group-hover:scale-110 transition-transform duration-300"
                            loading="lazy"
                            priority={false}
                          />
                          <span className="absolute top-2 left-2 bg-green-700 text-white text-xs font-semibold px-2 sm:px-3 py-1 rounded-lg">
                            {blog.category?.name || 'Artikel'}
                          </span>
                        </div>
                      )}
                      <div className="p-3 sm:p-4 flex-1 flex flex-col">
                        <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm text-gray-600 mb-2 sm:mb-3">
                          <div className="flex items-center space-x-1">
                            <Calendar className="h-3 w-3 sm:h-4 sm:w-4" />
                            <span>
                              {blog.publishedAt ? format(new Date(blog.publishedAt), 'd MMM yyyy', { locale: id }) : 'Baru'}
                            </span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <User className="h-3 w-3 sm:h-4 sm:w-4" />
                            <span>{blog.author || 'Admin'}</span>
                          </div>
                        </div>
                        <h3 className="font-semibold text-base sm:text-lg mb-2 line-clamp-2 group-hover:text-green-700 transition">
                          {blog.title}
                        </h3>
                        <p className="text-gray-600 text-xs sm:text-sm mb-3 sm:mb-4 line-clamp-3 flex-1">
                          {blog.excerpt}
                        </p>
                        <button className="text-green-700 hover:text-green-800 font-medium text-xs sm:text-sm flex items-center gap-1 mt-auto">
                          Baca Selengkapnya
                          <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4 group-hover:translate-x-1 transition-transform" />
                        </button>
                      </div>
                    </motion.div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-sm p-8 sm:p-12 text-center">
                <div className="max-w-md mx-auto space-y-4">
                  <p className="text-gray-700 font-medium text-lg">
                    Tidak ada artikel yang ditemukan
                  </p>
                  <p className="text-sm text-gray-500 leading-relaxed">
                    {searchQuery || selectedCategory
                      ? 'Coba ubah kata kunci pencarian atau pilih kategori lain untuk menemukan artikel yang sesuai.'
                      : 'Belum ada artikel yang tersedia. Silakan kembali lagi nanti.'}
                  </p>
                  {(searchQuery || selectedCategory) && (
                    <button
                      onClick={() => {
                        setSearchQuery('');
                        window.location.href = '/blog';
                      }}
                      className="mt-4 px-6 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 text-sm font-medium transition-colors"
                    >
                      Reset Filter
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}



