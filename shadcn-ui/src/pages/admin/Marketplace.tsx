import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { cmsStorage, MarketplaceLink } from '@/lib/cms-storage';
import { ArrowLeft, Save } from 'lucide-react';

export default function AdminMarketplace() {
  const navigate = useNavigate();
  const [links, setLinks] = useState<MarketplaceLink[]>([]);
  const [shopeeUrl, setShopeeUrl] = useState('');
  const [tokopediaUrl, setTokopediaUrl] = useState('');
  const [shopeeActive, setShopeeActive] = useState(true);
  const [tokopediaActive, setTokopediaActive] = useState(true);

  useEffect(() => {
    if (localStorage.getItem('admin_logged_in') !== 'true') {
      navigate('/admin/login');
      return;
    }
    loadLinks();
  }, [navigate]);

  const loadLinks = () => {
    const allLinks = cmsStorage.getMarketplaceLinks();
    setLinks(allLinks);

    const shopee = allLinks.find(l => l.marketplace === 'shopee');
    const tokopedia = allLinks.find(l => l.marketplace === 'tokopedia');

    if (shopee) {
      setShopeeUrl(shopee.url);
      setShopeeActive(shopee.isActive);
    }
    if (tokopedia) {
      setTokopediaUrl(tokopedia.url);
      setTokopediaActive(tokopedia.isActive);
    }
  };

  const handleSave = () => {
    const shopee = links.find(l => l.marketplace === 'shopee');
    const tokopedia = links.find(l => l.marketplace === 'tokopedia');

    if (shopee) {
      cmsStorage.updateMarketplaceLink(shopee.id, {
        url: shopeeUrl,
        isActive: shopeeActive,
      });
    } else {
      cmsStorage.saveMarketplaceLink({
        marketplace: 'shopee',
        url: shopeeUrl,
        isActive: shopeeActive,
      });
    }

    if (tokopedia) {
      cmsStorage.updateMarketplaceLink(tokopedia.id, {
        url: tokopediaUrl,
        isActive: tokopediaActive,
      });
    } else {
      cmsStorage.saveMarketplaceLink({
        marketplace: 'tokopedia',
        url: tokopediaUrl,
        isActive: tokopediaActive,
      });
    }

    alert('Marketplace links berhasil disimpan!');
    loadLinks();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate('/admin/dashboard')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Kembali
            </Button>
            <h1 className="text-2xl font-bold">Marketplace Links</h1>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Shopee</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="shopee">URL Toko Shopee</Label>
              <Input
                id="shopee"
                value={shopeeUrl}
                onChange={(e) => setShopeeUrl(e.target.value)}
                placeholder="https://shopee.co.id/tokotanionline"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="shopee-active"
                checked={shopeeActive}
                onCheckedChange={setShopeeActive}
              />
              <Label htmlFor="shopee-active">Aktifkan link Shopee</Label>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Tokopedia</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="tokopedia">URL Toko Tokopedia</Label>
              <Input
                id="tokopedia"
                value={tokopediaUrl}
                onChange={(e) => setTokopediaUrl(e.target.value)}
                placeholder="https://www.tokopedia.com/tokotanionline"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="tokopedia-active"
                checked={tokopediaActive}
                onCheckedChange={setTokopediaActive}
              />
              <Label htmlFor="tokopedia-active">Aktifkan link Tokopedia</Label>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6 bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle className="text-blue-900">💡 Tips</CardTitle>
          </CardHeader>
          <CardContent className="text-blue-800">
            <ul className="list-disc list-inside space-y-2">
              <li>Pastikan URL toko Anda benar dan aktif</li>
              <li>Link akan muncul di halaman detail produk</li>
              <li>Nonaktifkan link jika toko sedang maintenance</li>
              <li>Sistem akan tracking jumlah klik ke setiap marketplace</li>
            </ul>
          </CardContent>
        </Card>

        <Button onClick={handleSave} className="w-full bg-orange-600 hover:bg-orange-700">
          <Save className="h-4 w-4 mr-2" />
          Simpan Perubahan
        </Button>
      </div>
    </div>
  );
}