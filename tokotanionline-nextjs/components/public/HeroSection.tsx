/**
 * HeroSection - Pure presentational component
 * 
 * Displays hero banner with title and subtitle
 * Server component only - no client logic
 */

import Link from 'next/link';
import { ShoppingBag, ArrowRight } from 'lucide-react';

interface HeroSectionProps {
  title: string;
  subtitle: string;
}

export default function HeroSection({ title, subtitle }: HeroSectionProps) {
  return (
    <section className="relative h-[400px] sm:h-[450px] md:h-[500px] lg:h-[600px] flex items-center bg-gradient-to-r from-green-700 to-green-800">
      <div className="container mx-auto px-4 sm:px-5 md:px-6 lg:px-8 z-10 text-white">
        <div className="max-w-2xl">
          <h1 className="text-3xl sm:text-3.5xl md:text-4xl lg:text-5xl font-bold mb-3 sm:mb-3.5 md:mb-4 leading-tight">
            {title}
          </h1>
          <p className="text-sm sm:text-base md:text-lg lg:text-xl mb-5 sm:mb-6 md:mb-8">
            {subtitle}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-3.5 md:gap-4">
            <Link href="/produk" className="w-full sm:w-auto">
              <button className="w-full sm:w-auto bg-white hover:bg-gray-100 text-green-700 font-semibold px-3.5 sm:px-4 md:px-6 py-2 sm:py-2.5 md:py-3 rounded-lg flex items-center justify-center gap-2 text-xs sm:text-sm md:text-base transition-colors">
                <ShoppingBag className="h-3.5 w-3.5 sm:h-4 md:h-5 sm:w-4 md:w-5" />
                Lihat Produk
              </button>
            </Link>
            <Link href="/kontak" className="w-full sm:w-auto">
              <button className="w-full sm:w-auto bg-white/10 backdrop-blur-sm text-white border border-white hover:bg-white/20 font-semibold px-3.5 sm:px-4 md:px-6 py-2 sm:py-2.5 md:py-3 rounded-lg flex items-center justify-center gap-2 text-xs sm:text-sm md:text-base transition-colors">
                Hubungi Kami
                <ArrowRight className="h-3.5 w-3.5 sm:h-4 md:h-5 sm:w-4 md:w-5" />
              </button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
