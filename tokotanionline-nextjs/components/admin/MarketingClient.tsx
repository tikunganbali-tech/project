'use client';

import { useState, useEffect } from 'react';
import { Save, Facebook, ShoppingBag, BarChart3, Music, CheckCircle, Copy } from 'lucide-react';

export default function MarketingClient() {
  const [loading, setLoading] = useState(false);
  const [showEnvModal, setShowEnvModal] = useState(false);
  const [envContent, setEnvContent] = useState('');
  const [copied, setCopied] = useState(false);
  const [settings, setSettings] = useState({
    facebookPixelId: '',
    googleAdsId: '',
    googleAnalyticsId: '',
    tiktokPixelId: '',
  });

  useEffect(() => {
    // Load settings on mount
    fetch('/api/marketing/settings')
      .then((res) => res.json())
      .then((data) => {
        if (data.settings) {
          setSettings({
            facebookPixelId: data.settings.facebookPixelId || '',
            googleAdsId: data.settings.googleAdsId || '',
            googleAnalyticsId: data.settings.googleAnalyticsId || '',
            tiktokPixelId: data.settings.tiktokPixelId || '',
          });
        }
      })
      .catch(() => {});
  }, []);

  const handleSave = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/marketing/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      const result = await response.json();
      if (response.ok) {
        // Show success message with .env content
        if (result.envContent) {
          setEnvContent(result.envContent);
          setShowEnvModal(true);
        } else {
          alert(result.message || 'Settings saved successfully!');
        }
      } else {
        alert(result.error || 'Failed to save settings');
      }
    } catch (error) {
      alert('Error saving settings');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Marketing & Tracking</h1>

      <div className="bg-white rounded-lg shadow p-6 space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
            <Facebook className="h-4 w-4" />
            Facebook Pixel ID
          </label>
          <input
            type="text"
            value={settings.facebookPixelId}
            onChange={(e) => setSettings({ ...settings, facebookPixelId: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            placeholder="123456789012345"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
            <ShoppingBag className="h-4 w-4" />
            Google Ads ID
          </label>
          <input
            type="text"
            value={settings.googleAdsId}
            onChange={(e) => setSettings({ ...settings, googleAdsId: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            placeholder="AW-123456789"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Google Analytics 4 ID
          </label>
          <input
            type="text"
            value={settings.googleAnalyticsId}
            onChange={(e) => setSettings({ ...settings, googleAnalyticsId: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            placeholder="G-XXXXXXXXXX"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
            <Music className="h-4 w-4" />
            TikTok Pixel ID
          </label>
          <input
            type="text"
            value={settings.tiktokPixelId}
            onChange={(e) => setSettings({ ...settings, tiktokPixelId: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            placeholder="C1234567890ABCDEF"
          />
        </div>

        <button
          onClick={handleSave}
          disabled={loading}
          className="btn-primary flex items-center gap-2"
        >
          <Save className="h-4 w-4" />
          {loading ? 'Saving...' : 'Save Marketing Settings'}
        </button>
      </div>

      {/* Env Content Modal */}
      {showEnvModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b">
              <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <CheckCircle className="h-6 w-6 text-green-500" />
                Settings Saved Successfully!
              </h2>
              <p className="text-gray-600 mt-2">
                Marketing settings have been saved to database. For production deployment, copy these values to your <code className="bg-gray-100 px-2 py-1 rounded">.env.local</code> file:
              </p>
            </div>
            
            <div className="p-6 overflow-auto flex-1">
              <div className="bg-gray-900 text-gray-100 p-4 rounded-lg font-mono text-sm relative">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(envContent);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className="absolute top-2 right-2 bg-gray-700 hover:bg-gray-600 text-white px-3 py-1 rounded flex items-center gap-2 text-xs"
                >
                  <Copy className="h-3 w-3" />
                  {copied ? 'Copied!' : 'Copy'}
                </button>
                <pre className="whitespace-pre-wrap">{envContent}</pre>
              </div>
            </div>
            
            <div className="p-6 border-t bg-gray-50">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  <strong>Note:</strong> Settings are already saved to database and will be used immediately. 
                  The .env.local file is only needed for production builds where environment variables are required at build time.
                </p>
              </div>
            </div>
            
            <div className="p-6 border-t flex justify-end">
              <button
                onClick={() => setShowEnvModal(false)}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Got it!
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

