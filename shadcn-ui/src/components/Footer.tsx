import { Link } from 'react-router-dom';
import { Facebook, Instagram, Youtube, Mail, Phone, MapPin } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-white">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* About */}
          <div>
            <h3 className="text-xl font-bold mb-4">TOKOTANIONLINE</h3>
            <p className="text-gray-400 mb-4">
              Toko pertanian online terpercaya menyediakan benih, fungisida, pupuk, dan alat pertanian berkualitas untuk petani Indonesia.
            </p>
            <div className="flex space-x-4">
              <a href="#" className="text-gray-400 hover:text-white transition">
                <Facebook className="h-5 w-5" />
              </a>
              <a href="#" className="text-gray-400 hover:text-white transition">
                <Instagram className="h-5 w-5" />
              </a>
              <a href="#" className="text-gray-400 hover:text-white transition">
                <Youtube className="h-5 w-5" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Link Cepat</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/" className="text-gray-400 hover:text-white transition">
                  Beranda
                </Link>
              </li>
              <li>
                <Link to="/produk" className="text-gray-400 hover:text-white transition">
                  Produk
                </Link>
              </li>
              <li>
                <Link to="/blog" className="text-gray-400 hover:text-white transition">
                  Blog
                </Link>
              </li>
              <li>
                <Link to="/tentang-kami" className="text-gray-400 hover:text-white transition">
                  Tentang Kami
                </Link>
              </li>
              <li>
                <Link to="/kontak" className="text-gray-400 hover:text-white transition">
                  Kontak
                </Link>
              </li>
            </ul>
          </div>

          {/* Categories */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Kategori Produk</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/produk?category=Benih" className="text-gray-400 hover:text-white transition">
                  Benih
                </Link>
              </li>
              <li>
                <Link to="/produk?category=Fungisida" className="text-gray-400 hover:text-white transition">
                  Fungisida
                </Link>
              </li>
              <li>
                <Link to="/produk?category=Pupuk" className="text-gray-400 hover:text-white transition">
                  Pupuk
                </Link>
              </li>
              <li>
                <Link to="/produk?category=Alat" className="text-gray-400 hover:text-white transition">
                  Alat Pertanian
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Kontak Kami</h3>
            <ul className="space-y-3">
              <li className="flex items-start space-x-3">
                <MapPin className="h-5 w-5 text-green-500 mt-1 flex-shrink-0" />
                <span className="text-gray-400">Jl. Pertanian No. 123, Jakarta</span>
              </li>
              <li className="flex items-center space-x-3">
                <Phone className="h-5 w-5 text-green-500 flex-shrink-0" />
                <a href="tel:+6281234567890" className="text-gray-400 hover:text-white transition">
                  +62 812-3456-7890
                </a>
              </li>
              <li className="flex items-center space-x-3">
                <Mail className="h-5 w-5 text-green-500 flex-shrink-0" />
                <a href="mailto:info@tokotanionline.com" className="text-gray-400 hover:text-white transition">
                  info@tokotanionline.com
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-8 pt-8 text-center">
          <p className="text-gray-400">
            &copy; {new Date().getFullYear()} TOKOTANIONLINE. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}