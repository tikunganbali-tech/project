import { Link } from 'react-router-dom';
import { ArrowRight, ShoppingBag, Truck, Shield, Headphones } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ProductCard from '@/components/ProductCard';
import BlogCard from '@/components/BlogCard';
import { products, blogPosts } from '@/lib/data';

export default function Home() {
  const featuredProducts = products.filter(p => p.isFeatured).slice(0, 6);
  const latestPosts = blogPosts.slice(0, 3);

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
    <div>
      {/* Hero Section */}
      <section className="relative h-[600px] flex items-center">
        <div
          className="absolute inset-0 z-0"
          style={{
            backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.5)), url('/assets/hero-farmer-field.jpg')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}
        />
        <div className="container mx-auto px-4 z-10 text-white">
          <div className="max-w-2xl">
            <h1 className="text-5xl font-bold mb-4 animate-in fade-in slide-in-from-bottom-8 duration-700">
              Solusi Lengkap Kebutuhan Pertanian Anda
            </h1>
            <p className="text-xl mb-8 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-150">
              Benih berkualitas, fungisida efektif, pupuk bernutrisi, dan alat pertanian modern untuk hasil panen maksimal
            </p>
            <div className="flex flex-wrap gap-4 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300">
              <Link to="/produk">
                <Button size="lg" className="bg-green-700 hover:bg-green-800">
                  <ShoppingBag className="mr-2 h-5 w-5" />
                  Lihat Produk
                </Button>
              </Link>
              <Button
                size="lg"
                variant="outline"
                className="bg-white/10 backdrop-blur-sm text-white border-white hover:bg-white/20"
                onClick={handleWhatsAppContact}
              >
                Hubungi Kami
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <ShoppingBag className="h-8 w-8 text-green-700" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Produk Berkualitas</h3>
              <p className="text-gray-600 text-sm">
                Semua produk dijamin original dan berkualitas tinggi
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Truck className="h-8 w-8 text-green-700" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Pengiriman Cepat</h3>
              <p className="text-gray-600 text-sm">
                Pengiriman ke seluruh Indonesia dengan cepat dan aman
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="h-8 w-8 text-green-700" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Garansi Kualitas</h3>
              <p className="text-gray-600 text-sm">
                Garansi uang kembali jika produk tidak sesuai
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Headphones className="h-8 w-8 text-green-700" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Konsultasi Gratis</h3>
              <p className="text-gray-600 text-sm">
                Tim ahli siap membantu konsultasi pertanian Anda
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Produk Unggulan</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Pilihan terbaik dari kami untuk mendukung kesuksesan pertanian Anda
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {featuredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>

          <div className="text-center">
            <Link to="/produk">
              <Button size="lg" variant="outline" className="border-green-700 text-green-700 hover:bg-green-50">
                Lihat Semua Produk
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Marketplace Section */}
      <section className="py-16 bg-green-700 text-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold mb-4">Belanja di Marketplace Favorit Anda</h2>
            <p className="text-green-100 max-w-2xl mx-auto">
              Kami juga hadir di berbagai marketplace untuk kemudahan Anda
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-4">
            <a
              href="https://shopee.co.id/tokotanionline"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button size="lg" className="bg-orange-500 hover:bg-orange-600">
                <ShoppingBag className="mr-2 h-5 w-5" />
                Shopee
              </Button>
            </a>
            <a
              href="https://www.tokopedia.com/tokotanionline"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button size="lg" className="bg-emerald-500 hover:bg-emerald-600">
                <ShoppingBag className="mr-2 h-5 w-5" />
                Tokopedia
              </Button>
            </a>
            <Button
              size="lg"
              className="bg-white text-green-700 hover:bg-gray-100"
              onClick={handleWhatsAppContact}
            >
              <svg className="mr-2 h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
              </svg>
              WhatsApp
            </Button>
          </div>
        </div>
      </section>

      {/* Blog Section */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Tips & Artikel Pertanian</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Pelajari tips dan trik bertani dari para ahli untuk hasil panen maksimal
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {latestPosts.map((post) => (
              <BlogCard key={post.id} post={post} />
            ))}
          </div>

          <div className="text-center">
            <Link to="/blog">
              <Button size="lg" variant="outline" className="border-green-700 text-green-700 hover:bg-green-50">
                Lihat Semua Artikel
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gray-900 text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">
            Butuh Konsultasi Produk Pertanian?
          </h2>
          <p className="text-gray-300 mb-8 max-w-2xl mx-auto">
            Tim ahli kami siap membantu Anda memilih produk yang tepat untuk kebutuhan pertanian Anda
          </p>
          <Button
            size="lg"
            className="bg-green-700 hover:bg-green-800"
            onClick={handleWhatsAppContact}
          >
            <svg className="mr-2 h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
            </svg>
            Konsultasi Gratis via WhatsApp
          </Button>
        </div>
      </section>
    </div>
  );
}