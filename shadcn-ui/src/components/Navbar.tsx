import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X, ShoppingCart, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [cartCount, setCartCount] = useState(0);

  return (
    <nav className="bg-white shadow-md sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <div className="w-10 h-10 bg-green-700 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">T</span>
            </div>
            <span className="text-xl font-bold text-green-700">TOKOTANIONLINE</span>
          </Link>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center space-x-8">
            <Link to="/" className="text-gray-700 hover:text-green-700 font-medium transition">
              Beranda
            </Link>
            <Link to="/produk" className="text-gray-700 hover:text-green-700 font-medium transition">
              Produk
            </Link>
            <Link to="/blog" className="text-gray-700 hover:text-green-700 font-medium transition">
              Blog
            </Link>
            <Link to="/tentang-kami" className="text-gray-700 hover:text-green-700 font-medium transition">
              Tentang Kami
            </Link>
            <Link to="/kontak" className="text-gray-700 hover:text-green-700 font-medium transition">
              Kontak
            </Link>
          </div>

          {/* Right Side */}
          <div className="hidden md:flex items-center space-x-4">
            <Button variant="ghost" size="icon">
              <Search className="h-5 w-5" />
            </Button>
            <Link to="/keranjang">
              <Button variant="ghost" size="icon" className="relative">
                <ShoppingCart className="h-5 w-5" />
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {cartCount}
                  </span>
                )}
              </Button>
            </Link>
            <Button className="bg-green-700 hover:bg-green-800">
              Hubungi Kami
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden"
            onClick={() => setIsOpen(!isOpen)}
          >
            {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isOpen && (
          <div className="md:hidden py-4 border-t">
            <div className="flex flex-col space-y-4">
              <Link
                to="/"
                className="text-gray-700 hover:text-green-700 font-medium"
                onClick={() => setIsOpen(false)}
              >
                Beranda
              </Link>
              <Link
                to="/produk"
                className="text-gray-700 hover:text-green-700 font-medium"
                onClick={() => setIsOpen(false)}
              >
                Produk
              </Link>
              <Link
                to="/blog"
                className="text-gray-700 hover:text-green-700 font-medium"
                onClick={() => setIsOpen(false)}
              >
                Blog
              </Link>
              <Link
                to="/tentang-kami"
                className="text-gray-700 hover:text-green-700 font-medium"
                onClick={() => setIsOpen(false)}
              >
                Tentang Kami
              </Link>
              <Link
                to="/kontak"
                className="text-gray-700 hover:text-green-700 font-medium"
                onClick={() => setIsOpen(false)}
              >
                Kontak
              </Link>
              <Link to="/keranjang" onClick={() => setIsOpen(false)}>
                <Button variant="outline" className="w-full">
                  <ShoppingCart className="h-5 w-5 mr-2" />
                  Keranjang ({cartCount})
                </Button>
              </Link>
              <Button className="bg-green-700 hover:bg-green-800 w-full">
                Hubungi Kami
              </Button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}