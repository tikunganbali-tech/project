import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { cmsStorage, WhatsAppAdmin } from '@/lib/cms-storage';
import { ArrowLeft, Plus, Pencil, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

export default function AdminWhatsApp() {
  const navigate = useNavigate();
  const [admins, setAdmins] = useState<WhatsAppAdmin[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    phone: '',
    name: '',
    isActive: true,
  });

  useEffect(() => {
    if (localStorage.getItem('admin_logged_in') !== 'true') {
      navigate('/admin/login');
      return;
    }
    loadAdmins();
  }, [navigate]);

  const loadAdmins = () => {
    setAdmins(cmsStorage.getWhatsAppAdmins());
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (editingId) {
      cmsStorage.updateWhatsAppAdmin(editingId, formData);
    } else {
      const maxOrder = Math.max(...admins.map(a => a.rotationOrder), 0);
      cmsStorage.saveWhatsAppAdmin({
        ...formData,
        rotationOrder: maxOrder + 1,
      });
    }

    setIsDialogOpen(false);
    setEditingId(null);
    setFormData({ phone: '', name: '', isActive: true });
    loadAdmins();
  };

  const handleEdit = (admin: WhatsAppAdmin) => {
    setEditingId(admin.id);
    setFormData({
      phone: admin.phone,
      name: admin.name,
      isActive: admin.isActive,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Apakah Anda yakin ingin menghapus admin WhatsApp ini?')) {
      cmsStorage.deleteWhatsAppAdmin(id);
      loadAdmins();
    }
  };

  const toggleActive = (id: string, currentStatus: boolean) => {
    cmsStorage.updateWhatsAppAdmin(id, { isActive: !currentStatus });
    loadAdmins();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" onClick={() => navigate('/admin/dashboard')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Kembali
              </Button>
              <h1 className="text-2xl font-bold">WhatsApp Admin</h1>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-emerald-600 hover:bg-emerald-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Tambah Admin
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editingId ? 'Edit Admin WhatsApp' : 'Tambah Admin WhatsApp'}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nama Admin *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Nomor WhatsApp *</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="6281234567890"
                      required
                    />
                    <p className="text-sm text-muted-foreground">
                      Format: 62xxx (tanpa + atau spasi)
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="active"
                      checked={formData.isActive}
                      onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                    />
                    <Label htmlFor="active">Aktif</Label>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setIsDialogOpen(false);
                        setEditingId(null);
                        setFormData({ phone: '', name: '', isActive: true });
                      }}
                      className="flex-1"
                    >
                      Batal
                    </Button>
                    <Button type="submit" className="flex-1 bg-emerald-600 hover:bg-emerald-700">
                      {editingId ? 'Update' : 'Simpan'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Sistem Rotasi WhatsApp</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Sistem akan merotasi nomor WhatsApp secara otomatis untuk distribusi customer yang merata.
              Admin yang aktif akan menerima customer secara bergiliran sesuai urutan rotasi.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{admins.length} Admin WhatsApp</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Urutan</TableHead>
                  <TableHead>Nama</TableHead>
                  <TableHead>Nomor WhatsApp</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {admins
                  .sort((a, b) => a.rotationOrder - b.rotationOrder)
                  .map((admin) => (
                    <TableRow key={admin.id}>
                      <TableCell className="font-medium">#{admin.rotationOrder}</TableCell>
                      <TableCell>{admin.name}</TableCell>
                      <TableCell className="font-mono">{admin.phone}</TableCell>
                      <TableCell>
                        <Switch
                          checked={admin.isActive}
                          onCheckedChange={() => toggleActive(admin.id, admin.isActive)}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(admin)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDelete(admin.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
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