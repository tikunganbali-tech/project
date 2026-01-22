'use client';

import { useState, useEffect } from 'react';
import { Save, Palette, Layout, Bot, FileText, Upload, Image as ImageIcon, X } from 'lucide-react';
// Notification utility removed - using simple alerts
import ContentManagerClient from './ContentManagerClient';

interface SettingsClientProps {
  siteSettings: any;
  aiSettings: any;
}

export default function SettingsClient({ siteSettings, aiSettings }: SettingsClientProps) {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'layout' | 'content' | 'ai'>('layout');

  useEffect(() => {
    // Load settings on mount
    if (siteSettings) {
      setLogoUrl(siteSettings.logoUrl || '');
      setFaviconUrl(siteSettings.faviconUrl || '');
      setPrimaryColor(siteSettings.primaryColor || '#16a34a');
      setSecondaryColor(siteSettings.secondaryColor || '#15803d');
      setHeroEnabled(siteSettings.heroEnabled !== false);
      setCtaEnabled(siteSettings.ctaEnabled !== false);
      setTestimonialsEnabled(siteSettings.testimonialsEnabled !== false);
      setSocialProofEnabled(siteSettings.socialProofEnabled !== false);
      setHomepageBlocks(
        siteSettings.homepageBlocks
          ? JSON.parse(siteSettings.homepageBlocks)
          : ['hero', 'featured', 'trust', 'blog', 'cta']
      );
    }
    if (aiSettings) {
      setKeywords(aiSettings.keywords ? JSON.parse(aiSettings.keywords).join(', ') : '');
      setArticlesPerDay(aiSettings.articlesPerDay || 3);
      setWordCount(aiSettings.wordCount || 1500);
      setTone(aiSettings.tone || 'expert_farmer');
      setCronSchedule(aiSettings.cronSchedule || '0 8,14,20 * * *');
      setPublishTimes(aiSettings.publishTimes ? JSON.parse(aiSettings.publishTimes).join(', ') : '08:00, 14:00, 20:00');
      setSeoSyncDelay(aiSettings.seoSyncDelay || 300);
      setIsActive(aiSettings.isActive !== false);
    }
  }, [siteSettings, aiSettings]);

  // Layout settings
  const [logoUrl, setLogoUrl] = useState('');
  const [faviconUrl, setFaviconUrl] = useState('');
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingFavicon, setUploadingFavicon] = useState(false);
  const [primaryColor, setPrimaryColor] = useState('#16a34a');
  const [secondaryColor, setSecondaryColor] = useState('#15803d');
  const [heroEnabled, setHeroEnabled] = useState(true);
  const [ctaEnabled, setCtaEnabled] = useState(true);
  const [testimonialsEnabled, setTestimonialsEnabled] = useState(true);
  const [socialProofEnabled, setSocialProofEnabled] = useState(true);
  const [homepageBlocks, setHomepageBlocks] = useState<string[]>(['hero', 'featured', 'trust', 'blog', 'cta']);

  // AI settings
  const [keywords, setKeywords] = useState('');
  const [articlesPerDay, setArticlesPerDay] = useState(3);
  const [wordCount, setWordCount] = useState(1500);
  const [tone, setTone] = useState('expert_farmer');
  const [cronSchedule, setCronSchedule] = useState('0 8,14,20 * * *');
  const [publishTimes, setPublishTimes] = useState('08:00, 14:00, 20:00');
  const [seoSyncDelay, setSeoSyncDelay] = useState(300);
  const [isActive, setIsActive] = useState(true);

  const handleSaveLayout = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          logoUrl,
          faviconUrl,
          primaryColor,
          secondaryColor,
          heroEnabled,
          ctaEnabled,
          testimonialsEnabled,
          socialProofEnabled,
          homepageBlocks,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        alert('Settings saved successfully!');
      } else {
        // Extract error message from response
        let errorMessage = 'Failed to save settings';
        let hint = '';
        
        if (data.error) {
          if (typeof data.error === 'string') {
            errorMessage = data.error;
          } else if (data.error.message) {
            errorMessage = data.error.message;
          } else {
            // If error is an object, try to stringify only if needed
            errorMessage = JSON.stringify(data.error).substring(0, 200);
          }
        } else if (data.message) {
          errorMessage = data.message;
        }
        
        // Show hint if available
        if (data.hint) {
          hint = `\n\n${data.hint}`;
        }
        
        // Special handling for Prisma Client outdated error
        if (data.code === 'PRISMA_CLIENT_OUTDATED' || errorMessage.includes('Prisma Client')) {
          errorMessage = 'Prisma Client perlu di-regenerate. Silakan restart dev server dan jalankan: npx prisma generate';
        }
        
        console.error('Save settings error:', errorMessage, data);
        alert(`Failed to save settings: ${errorMessage}${hint}`);
      }
    } catch (error: any) {
      console.error('Save settings exception:', error);
      const errorMessage = error.message || 'Unknown error occurred';
      alert(`Error saving settings: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAI = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/ai-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keywords: keywords.split(',').map((k: string) => k.trim()).filter(Boolean),
          articlesPerDay,
          wordCount,
          tone,
          cronSchedule,
          publishTimes: publishTimes.split(',').map((t: string) => t.trim()).filter(Boolean),
          seoSyncDelay,
          isActive,
        }),
      });

      const data = await response.json();
      
      if (response.ok) {
        alert('AI Settings saved successfully!');
      } else {
        const errorMessage = data.error || data.message || 'Failed to save settings';
        alert(`Failed to save settings: ${errorMessage}`);
      }
    } catch (error: any) {
      console.error('Save AI settings error:', error);
      alert(`Error saving settings: ${error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const moveBlock = (index: number, direction: 'up' | 'down') => {
    const newBlocks = [...homepageBlocks];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex >= 0 && newIndex < newBlocks.length) {
      [newBlocks[index], newBlocks[newIndex]] = [newBlocks[newIndex], newBlocks[index]];
      setHomepageBlocks(newBlocks);
    }
  };

  const handleImageUpload = async (file: File, type: 'logo' | 'favicon', setUploading: (val: boolean) => void, setUrl: (url: string) => void) => {
    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('category', type === 'logo' ? 'logo' : 'favicon');

      const response = await fetch('/api/upload/image', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok || !data.url) {
        throw new Error(data.error || 'Upload gagal');
      }

      setUrl(data.url);
      alert(`${type === 'logo' ? 'Logo' : 'Favicon'} berhasil diupload!`);
    } catch (error: any) {
      alert(`Error: ${error.message || 'Upload gagal'}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Settings</h1>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-4">
          <button
            onClick={() => setActiveTab('layout')}
            className={`px-4 py-2 border-b-2 font-medium ${
              activeTab === 'layout'
                ? 'border-green-600 text-green-600'
                : 'border-transparent text-gray-500'
            }`}
          >
            <Layout className="h-4 w-4 inline mr-2" />
            Layout Settings
          </button>
          <button
            onClick={() => setActiveTab('content')}
            className={`px-4 py-2 border-b-2 font-medium ${
              activeTab === 'content'
                ? 'border-green-600 text-green-600'
                : 'border-transparent text-gray-500'
            }`}
          >
            <FileText className="h-4 w-4 inline mr-2" />
            Content Management
          </button>
          <button
            onClick={() => setActiveTab('ai')}
            className={`px-4 py-2 border-b-2 font-medium ${
              activeTab === 'ai'
                ? 'border-green-600 text-green-600'
                : 'border-transparent text-gray-500'
            }`}
          >
            <Bot className="h-4 w-4 inline mr-2" />
            AI Automation
          </button>
        </nav>
      </div>

      {/* Layout Settings */}
      {activeTab === 'layout' && (
        <div className="bg-white rounded-lg shadow p-6 space-y-6">
          {/* Logo Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Logo</label>
            <div className="space-y-3">
              {logoUrl && (
                <div className="relative inline-block">
                  <img 
                    src={logoUrl} 
                    alt="Logo Preview" 
                    className="h-20 object-contain border border-gray-200 rounded-lg p-2 bg-gray-50"
                  />
                </div>
              )}
              <div className="flex gap-3">
                <label className="flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        handleImageUpload(file, 'logo', setUploadingLogo, setLogoUrl);
                      }
                    }}
                    className="hidden"
                    disabled={uploadingLogo}
                  />
                  <Upload className="h-4 w-4" />
                  <span className="text-sm text-gray-700">
                    {uploadingLogo ? 'Uploading...' : 'Upload Logo'}
                  </span>
                </label>
                <input
                  type="url"
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="Atau masukkan URL logo"
                />
                {logoUrl && (
                  <button
                    onClick={() => setLogoUrl('')}
                    className="flex items-center gap-1 px-3 py-2 text-sm text-red-600 border border-red-300 rounded-lg hover:bg-red-50 transition-colors"
                  >
                    <X className="h-4 w-4" />
                    Hapus
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Favicon Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Favicon</label>
            <div className="space-y-3">
              {faviconUrl && (
                <div className="relative inline-block">
                  <img 
                    src={faviconUrl} 
                    alt="Favicon Preview" 
                    className="h-16 w-16 object-contain border border-gray-200 rounded-lg p-2 bg-gray-50"
                  />
                </div>
              )}
              <div className="flex gap-3">
                <label className="flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                  <input
                    type="file"
                    accept="image/x-icon,image/png,image/svg+xml"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        handleImageUpload(file, 'favicon', setUploadingFavicon, setFaviconUrl);
                      }
                    }}
                    className="hidden"
                    disabled={uploadingFavicon}
                  />
                  <Upload className="h-4 w-4" />
                  <span className="text-sm text-gray-700">
                    {uploadingFavicon ? 'Uploading...' : 'Upload Favicon'}
                  </span>
                </label>
                <input
                  type="url"
                  value={faviconUrl}
                  onChange={(e) => setFaviconUrl(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="Atau masukkan URL favicon"
                />
                {faviconUrl && (
                  <button
                    onClick={() => setFaviconUrl('')}
                    className="flex items-center gap-1 px-3 py-2 text-sm text-red-600 border border-red-300 rounded-lg hover:bg-red-50 transition-colors"
                  >
                    <X className="h-4 w-4" />
                    Hapus
                  </button>
                )}
              </div>
              <p className="text-xs text-gray-500">
                Format yang direkomendasikan: .ico, .png, atau .svg. Ukuran ideal: 32x32px atau 16x16px.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Primary Color</label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="h-10 w-20 border border-gray-300 rounded"
                />
                <input
                  type="text"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Secondary Color</label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={secondaryColor}
                  onChange={(e) => setSecondaryColor(e.target.value)}
                  className="h-10 w-20 border border-gray-300 rounded"
                />
                <input
                  type="text"
                  value={secondaryColor}
                  onChange={(e) => setSecondaryColor(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Homepage Sections</label>
            <div className="space-y-2">
              {homepageBlocks.map((block, index) => (
                <div
                  key={block}
                  className="flex items-center justify-between p-3 border border-gray-200 rounded-lg"
                >
                  <span className="capitalize">{block}</span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => moveBlock(index, 'up')}
                      disabled={index === 0}
                      className="px-2 py-1 text-sm bg-gray-100 rounded disabled:opacity-50"
                    >
                      ↑
                    </button>
                    <button
                      onClick={() => moveBlock(index, 'down')}
                      disabled={index === homepageBlocks.length - 1}
                      className="px-2 py-1 text-sm bg-gray-100 rounded disabled:opacity-50"
                    >
                      ↓
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={heroEnabled}
                onChange={(e) => setHeroEnabled(e.target.checked)}
                className="w-4 h-4 text-green-600 rounded"
              />
              <span>Enable Hero Section</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={ctaEnabled}
                onChange={(e) => setCtaEnabled(e.target.checked)}
                className="w-4 h-4 text-green-600 rounded"
              />
              <span>Enable CTA Section</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={testimonialsEnabled}
                onChange={(e) => setTestimonialsEnabled(e.target.checked)}
                className="w-4 h-4 text-green-600 rounded"
              />
              <span>Enable Testimonials</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={socialProofEnabled}
                onChange={(e) => setSocialProofEnabled(e.target.checked)}
                className="w-4 h-4 text-green-600 rounded"
              />
              <span>Enable Social Proof Overlay</span>
            </label>
          </div>

          <button
            onClick={handleSaveLayout}
            disabled={loading}
            className="btn-primary flex items-center gap-2"
          >
            <Save className="h-4 w-4" />
            {loading ? 'Saving...' : 'Save Layout Settings'}
          </button>
        </div>
      )}

      {/* Content Management */}
      {activeTab === 'content' && (
        <ContentManagerClient siteSettings={siteSettings} />
      )}

      {/* AI Settings */}
      {activeTab === 'ai' && (
        <div className="bg-white rounded-lg shadow p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Keywords (comma-separated)
            </label>
            <textarea
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              placeholder="pertanian, budidaya, hama tanaman, pestisida, benih"
            />
            <p className="text-xs text-gray-500 mt-1">
              AI will generate articles based on these keywords
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Articles Per Day
              </label>
              <input
                type="number"
                value={articlesPerDay}
                onChange={(e) => setArticlesPerDay(parseInt(e.target.value))}
                min={1}
                max={10}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Word Count</label>
              <input
                type="number"
                value={wordCount}
                onChange={(e) => setWordCount(parseInt(e.target.value))}
                min={500}
                max={3000}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tone</label>
            <select
              value={tone}
              onChange={(e) => setTone(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="expert_farmer">Expert Farmer</option>
              <option value="technical">Technical</option>
              <option value="selling">Selling</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cron Schedule</label>
            <input
              type="text"
              value={cronSchedule}
              onChange={(e) => setCronSchedule(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              placeholder="0 8,14,20 * * *"
            />
            <p className="text-xs text-gray-500 mt-1">
              Format: minute hour day month weekday (e.g., "0 8,14,20 * * *" = 8am, 2pm, 8pm daily)
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Publish Times (comma-separated, HH:mm format)
            </label>
            <input
              type="text"
              value={publishTimes}
              onChange={(e) => setPublishTimes(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              placeholder="08:00, 14:00, 20:00"
            />
            <p className="text-xs text-gray-500 mt-1">
              Waktu publish artikel yang sinkron dengan SEO (format: HH:mm, dipisah koma)
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              SEO Sync Delay (seconds)
            </label>
            <input
              type="number"
              value={seoSyncDelay}
              onChange={(e) => setSeoSyncDelay(parseInt(e.target.value) || 300)}
              min={60}
              max={3600}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
            <p className="text-xs text-gray-500 mt-1">
              Delay sebelum menjalankan SEO setup setelah publish (default: 300 detik / 5 menit)
            </p>
          </div>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="w-4 h-4 text-green-600 rounded"
            />
            <span>Enable Auto-generation</span>
          </label>

          <button
            onClick={handleSaveAI}
            disabled={loading}
            className="btn-primary flex items-center gap-2"
          >
            <Save className="h-4 w-4" />
            {loading ? 'Saving...' : 'Save AI Settings'}
          </button>
        </div>
      )}
    </div>
  );
}

