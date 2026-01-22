'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { Menu, X, ShoppingCart, Phone, Search, ShoppingBag } from 'lucide-react';
import { useState, useEffect } from 'react';

interface NavbarProps {
  siteSettings?: {
    siteTitle?: string | null;
    logoLight?: string | null;
    logoUrl?: string | null; // Legacy fallback
    primaryColor?: string;
    secondaryColor?: string;
  };
}

export default function Navbar({ siteSettings }: NavbarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [settings, setSettings] = useState(siteSettings);
  const router = useRouter();
  // Next.js types can mark pathname as nullable
  const pathname = usePathname() ?? '';

  useEffect(() => {
    // Fetch settings if not provided
    if (!settings) {
      fetch('/api/admin/settings')
        .then((res) => res.json())
        .then((data) => {
          if (data.settings) setSettings(data.settings);
        })
        .catch(() => {});
    }
  }, [settings]);

  // PHASE 3.3.1: Use logoLight, fallback to logoUrl (legacy)
  const logoUrl = settings?.logoLight || settings?.logoUrl;
  const siteTitle = settings?.siteTitle || 'TOKOTANIONLINE';

  // FASE 6: Improved active state - handle exact match and nested routes
  const isActive = (path: string) => {
    if (path === '/') {
      return pathname === '/';
    }
    return pathname.startsWith(path);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
    }
  };

  const handleWhatsAppContact = () => {
    const message = 'Halo, saya ingin berkonsultasi tentang produk pertanian';
    const whatsappNumbers = [
      '6281234567890',
      '6281234567891',
      '6281234567892'
    ];
    const randomNumber = whatsappNumbers[Math.floor(Math.random() * whatsappNumbers.length)];
    window.open(`https://wa.me/${randomNumber}?text=${encodeURIComponent(message)}`, '_blank');
  };

  return (
    <nav className="bg-white text-gray-900 sticky top-0 z-50 shadow-md border-b border-gray-200">
      <div className="container mx-auto px-3 sm:px-4 md:px-6">
        <div className="flex justify-between items-center h-14 sm:h-16 md:h-18 gap-3 md:gap-4">
          {/* Logo - Left */}
          <Link href="/" className="flex items-center gap-1.5 sm:gap-2 font-bold text-base sm:text-lg md:text-xl text-blue-600 flex-shrink-0">
            {logoUrl ? (
              <div className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 rounded overflow-hidden">
                <Image
                  src={logoUrl}
                  alt={siteTitle}
                  width={32}
                  height={32}
                  className="object-contain"
                />
              </div>
            ) : (
              <ShoppingCart className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 text-blue-600" />
            )}
            <span className="hidden sm:inline">{siteTitle}</span>
            <span className="sm:hidden">{siteTitle.substring(0, 8)}</span>
          </Link>

          {/* Search Bar - Center (Desktop) */}
          <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-2xl mx-4">
            <div className="relative w-full">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Q Cari produk atau artikel..."
                className="w-full px-4 py-2.5 pl-10 pr-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white"
              />
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            </div>
          </form>

          {/* Desktop Menu - Right */}
          <div className="hidden md:flex items-center gap-2 lg:gap-4 xl:gap-6 flex-shrink-0">
            <Link 
              href="/produk" 
              className={`hover:text-blue-600 transition text-sm lg:text-base font-medium ${isActive('/produk') ? 'text-blue-600' : 'text-gray-700'}`}
            >
              Produk
            </Link>
            <Link 
              href="/blog" 
              className={`hover:text-blue-600 transition text-sm lg:text-base font-medium ${isActive('/blog') ? 'text-blue-600' : 'text-gray-700'}`}
            >
              Artikel
            </Link>
            <Link 
              href="/produk" 
              className={`hover:text-blue-600 transition text-sm lg:text-base font-medium flex items-center gap-1 ${isActive('/produk') ? 'text-blue-600' : 'text-gray-700'}`}
            >
              <ShoppingBag className="h-4 w-4" />
              Kategori
            </Link>
            <Link 
              href="/kontak" 
              className={`hover:text-blue-600 transition text-sm lg:text-base font-medium ${isActive('/kontak') ? 'text-blue-600' : 'text-gray-700'}`}
            >
              Cara Belanja
            </Link>
            <Link 
              href="/kontak" 
              className={`hover:text-blue-600 transition text-sm lg:text-base font-medium flex items-center gap-1 ${isActive('/kontak') ? 'text-blue-600' : 'text-gray-700'}`}
            >
              <Phone className="h-4 w-4" />
              Kontak
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden p-1.5 sm:p-2 hover:bg-gray-100 rounded"
          >
            {isOpen ? <X className="h-5 w-5 sm:h-6 sm:w-6" /> : <Menu className="h-5 w-5 sm:h-6 sm:w-6" />}
          </button>
        </div>

        {/* Mobile Search Bar */}
        <div className="md:hidden pb-3">
          <form onSubmit={handleSearch}>
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Q Cari produk atau artikel..."
                className="w-full px-4 py-2.5 pl-10 pr-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white"
              />
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            </div>
          </form>
        </div>

        {/* Mobile Menu */}
        {isOpen && (
          <div className="md:hidden py-4 space-y-2 border-t border-gray-200">
            <Link
              href="/"
              className="block py-2 hover:bg-gray-100 px-4 rounded text-gray-700 font-medium"
              onClick={() => setIsOpen(false)}
            >
              Beranda
            </Link>
            <Link
              href="/produk"
              className="block py-2 hover:bg-gray-100 px-4 rounded text-gray-700 font-medium"
              onClick={() => setIsOpen(false)}
            >
              Produk
            </Link>
            <Link
              href="/blog"
              className="block py-2 hover:bg-gray-100 px-4 rounded text-gray-700 font-medium"
              onClick={() => setIsOpen(false)}
            >
              Artikel
            </Link>
            <Link
              href="/tentang-kami"
              className="block py-2 hover:bg-gray-100 px-4 rounded text-gray-700 font-medium"
              onClick={() => setIsOpen(false)}
            >
              Tentang Kami
            </Link>
            <Link
              href="/kontak"
              className="block py-2 hover:bg-gray-100 px-4 rounded text-gray-700 font-medium"
              onClick={() => setIsOpen(false)}
            >
              Kontak
            </Link>
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                handleWhatsAppContact();
                setIsOpen(false);
              }}
              className="block bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 transition text-center"
            >
              WhatsApp
            </a>
          </div>
        )}
      </div>
    </nav>
  );
}
