import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cmsStorage, AnalyticsData } from '@/lib/cms-storage';
import { ArrowLeft, MessageCircle, ShoppingCart, TrendingUp } from 'lucide-react';

export default function AdminAnalytics() {
  const navigate = useNavigate();
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    whatsappClicks: [],
    marketplaceClicks: [],
  });

  useEffect(() => {
    if (localStorage.getItem('admin_logged_in') !== 'true') {
      navigate('/admin/login');
      return;
    }
    setAnalytics(cmsStorage.getAnalytics());
  }, [navigate]);

  const whatsappStats = analytics.whatsappClicks.reduce((acc, click) => {
    acc[click.adminName] = (acc[click.adminName] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const marketplaceStats = analytics.marketplaceClicks.reduce((acc, click) => {
    acc[click.marketplace] = (acc[click.marketplace] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
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
            <h1 className="text-2xl font-bold">Analytics Dashboard</h1>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total WhatsApp Clicks</CardTitle>
              <MessageCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.whatsappClicks.length}</div>
              <p className="text-xs text-muted-foreground">Klik tombol WhatsApp</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Marketplace Clicks</CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.marketplaceClicks.length}</div>
              <p className="text-xs text-muted-foreground">Shopee + Tokopedia</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {analytics.whatsappClicks.length + analytics.marketplaceClicks.length}
              </div>
              <p className="text-xs text-muted-foreground">Total interaksi customer</p>
            </CardContent>
          </Card>
        </div>

        {/* WhatsApp Stats */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>WhatsApp Admin Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Admin Name</TableHead>
                  <TableHead className="text-right">Total Clicks</TableHead>
                  <TableHead className="text-right">Percentage</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(whatsappStats).map(([name, count]) => (
                  <TableRow key={name}>
                    <TableCell className="font-medium">{name}</TableCell>
                    <TableCell className="text-right">{count}</TableCell>
                    <TableCell className="text-right">
                      {((count / analytics.whatsappClicks.length) * 100).toFixed(1)}%
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Marketplace Stats */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Marketplace Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Marketplace</TableHead>
                  <TableHead className="text-right">Total Clicks</TableHead>
                  <TableHead className="text-right">Percentage</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(marketplaceStats).map(([marketplace, count]) => (
                  <TableRow key={marketplace}>
                    <TableCell className="font-medium capitalize">{marketplace}</TableCell>
                    <TableCell className="text-right">{count}</TableCell>
                    <TableCell className="text-right">
                      {((count / analytics.marketplaceClicks.length) * 100).toFixed(1)}%
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Recent WhatsApp Clicks */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Recent WhatsApp Clicks</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Admin</TableHead>
                  <TableHead>Produk</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {analytics.whatsappClicks
                  .slice(-10)
                  .reverse()
                  .map((click) => (
                    <TableRow key={click.id}>
                      <TableCell>{formatDate(click.clickedAt)}</TableCell>
                      <TableCell>{click.adminName}</TableCell>
                      <TableCell>{click.productName}</TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Recent Marketplace Clicks */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Marketplace Clicks</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Marketplace</TableHead>
                  <TableHead>Produk</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {analytics.marketplaceClicks
                  .slice(-10)
                  .reverse()
                  .map((click) => (
                    <TableRow key={click.id}>
                      <TableCell>{formatDate(click.clickedAt)}</TableCell>
                      <TableCell className="capitalize">{click.marketplace}</TableCell>
                      <TableCell>{click.productName}</TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}