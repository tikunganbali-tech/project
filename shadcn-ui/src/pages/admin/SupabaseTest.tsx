import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { testSupabaseConnection } from '@/lib/supabase';
import { ArrowLeft, CheckCircle, XCircle, Loader2 } from 'lucide-react';

export default function SupabaseTest() {
  const navigate = useNavigate();
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message?: string; error?: string } | null>(null);

  const handleTest = async () => {
    setTesting(true);
    setResult(null);
    
    const testResult = await testSupabaseConnection();
    setResult(testResult);
    setTesting(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <Button variant="ghost" onClick={() => navigate('/admin/dashboard')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Kembali ke Dashboard
          </Button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Test Koneksi Supabase</CardTitle>
            <CardDescription>
              Cek apakah koneksi ke Supabase database sudah berfungsi dengan baik
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm text-gray-600">
                <strong>Project URL:</strong> https://ahytxsoqswtpurvtbqcr.supabase.co
              </p>
              <p className="text-sm text-gray-600">
                <strong>Project REF:</strong> ahytxsoqswtpurvtbqcr
              </p>
            </div>

            <Button 
              onClick={handleTest} 
              disabled={testing}
              className="w-full"
            >
              {testing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Testing Connection...
                </>
              ) : (
                'Test Connection'
              )}
            </Button>

            {result && (
              <Alert variant={result.success ? 'default' : 'destructive'}>
                <div className="flex items-start gap-2">
                  {result.success ? (
                    <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-600 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <AlertDescription>
                      {result.success ? (
                        <div>
                          <p className="font-semibold text-green-800">✅ Koneksi Berhasil!</p>
                          <p className="text-sm text-green-700 mt-1">{result.message}</p>
                        </div>
                      ) : (
                        <div>
                          <p className="font-semibold text-red-800">❌ Koneksi Gagal</p>
                          <p className="text-sm text-red-700 mt-1">{result.error}</p>
                        </div>
                      )}
                    </AlertDescription>
                  </div>
                </div>
              </Alert>
            )}

            <div className="border-t pt-4 mt-4">
              <h3 className="font-semibold mb-2">Informasi:</h3>
              <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                <li>Jika koneksi berhasil, CMS bisa menggunakan Supabase sebagai database</li>
                <li>Jika koneksi gagal, CMS akan tetap menggunakan localStorage</li>
                <li>Untuk migrasi dari localStorage ke Supabase, klik tombol "Migrate to Supabase" di dashboard</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}