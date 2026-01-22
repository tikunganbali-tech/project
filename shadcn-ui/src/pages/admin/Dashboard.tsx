import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cmsStorage } from '@/lib/cms-storage';
import { products, blogPosts, whatsappNumbers, marketplaceLinks } from '@/lib/data';
import { Package, FileText, MessageCircle, TrendingUp, ShoppingCart, LogOut, Database } from 'lucide-react';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalBlogs: 0,
    whatsappClicks: 0,
    marketplaceClicks: 0,
  });

  useEffect(() => {
    // Check if admin is logged in
    if (localStorage.getItem('admin_logged_in') !== 'true') {
      navigate('/admin/login');
      return;
    }

    // Transform data.ts format to CMS storage format
    const transformedProducts = products.map(p => ({
      name: p.name,
      slug: p.slug,
      category: p.category,
      price: p.price,
      discountPrice: p.discountPrice,
      stock: p.stock,
      unit: p.unit,
      description: p.description,
      features: p.features,
      image: p.imageUrl,
      images: p.images,
      isFeatured: p.isFeatured,
      meta: {
        title: p.metaTitle,
        description: p.metaDescription,
        keywords: p.metaKeywords,
      },
    }));

    const transformedBlogs = blogPosts.map(b => ({
      title: b.title,
      slug: b.slug,
      excerpt: b.excerpt,
      content: b.content,
      author: b.author,
      category: b.category,
      tags: b.tags,
      image: b.imageUrl,
      meta: {
        title: b.metaTitle,
        description: b.metaDescription,
        keywords: b.metaKeywords,
      },
    }));

    const transformedWA = whatsappNumbers.map(wa => ({
      phone: wa.phone,
      name: wa.name,
    }));

    // Initialize CMS storage with existing data
    cmsStorage.initializeFromExistingData(
      transformedProducts,
      transformedBlogs,
      transformedWA,
      marketplaceLinks
    );

    // Load stats
    const productsData = cmsStorage.getProducts();
    const blogsData = cmsStorage.getBlogs();
    const analytics = cmsStorage.getAnalytics();

    setStats({
      totalProducts: productsData.length,
      totalBlogs: blogsData.length,
      whatsappClicks: analytics.whatsappClicks.length,
      marketplaceClicks: analytics.marketplaceClicks.length,
    });
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('admin_logged_in');
    navigate('/admin/login');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="bg-green-700 p-2 rounded">
              <ShoppingCart className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">CMS TOKOTANIONLINE</h1>
              <p className="text-sm text-gray-500">Admin Dashboard</p>
            </div>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Produk</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalProducts}</div>
              <p className="text-xs text-muted-foreground">Produk aktif di katalog</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Artikel</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalBlogs}</div>
              <p className="text-xs text-muted-foreground">Artikel blog published</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">WhatsApp Clicks</CardTitle>
              <MessageCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.whatsappClicks}</div>
              <p className="text-xs text-muted-foreground">Total klik tombol WA</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Marketplace Clicks</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.marketplaceClicks}</div>
              <p className="text-xs text-muted-foreground">Shopee + Tokopedia</p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Kelola konten website Anda</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Button
              onClick={() => navigate('/admin/products')}
              className="h-24 flex flex-col items-center justify-center gap-2 bg-green-700 hover:bg-green-800"
            >
              <Package className="h-6 w-6" />
              <span>Kelola Produk</span>
            </Button>
            <Button
              onClick={() => navigate('/admin/blogs')}
              className="h-24 flex flex-col items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700"
            >
              <FileText className="h-6 w-6" />
              <span>Kelola Blog</span>
            </Button>
            <Button
              onClick={() => navigate('/admin/whatsapp')}
              className="h-24 flex flex-col items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700"
            >
              <MessageCircle className="h-6 w-6" />
              <span>WhatsApp Admin</span>
            </Button>
            <Button
              onClick={() => navigate('/admin/marketplace')}
              className="h-24 flex flex-col items-center justify-center gap-2 bg-orange-600 hover:bg-orange-700"
            >
              <ShoppingCart className="h-6 w-6" />
              <span>Marketplace Links</span>
            </Button>
            <Button
              onClick={() => navigate('/admin/analytics')}
              className="h-24 flex flex-col items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700"
            >
              <TrendingUp className="h-6 w-6" />
              <span>Analytics</span>
            </Button>
            <Button
              onClick={() => navigate('/admin/supabase-test')}
              className="h-24 flex flex-col items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700"
            >
              <Database className="h-6 w-6" />
              <span>Test Supabase</span>
            </Button>
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle className="text-blue-900">ℹ️ Tentang CMS Ini</CardTitle>
          </CardHeader>
          <CardContent className="text-blue-800">
            <p className="mb-2">
              Ini adalah <strong>Mock CMS</strong> yang menggunakan localStorage untuk menyimpan data.
            </p>
            <p className="mb-2">
              ✅ Semua fitur CRUD (Create, Read, Update, Delete) sudah berfungsi
            </p>
            <p className="mb-2">
              ✅ Data akan tersimpan di browser Anda
            </p>
            <p className="mb-2">
              ⚠️ Data akan hilang jika Anda clear browser cache
            </p>
            <p className="mt-4 font-semibold">
              💡 Klik tombol "Test Supabase" untuk mengecek koneksi ke database Supabase!
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}