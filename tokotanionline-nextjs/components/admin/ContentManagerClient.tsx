'use client';

import { useState, useEffect } from 'react';
import { Save, Plus, X, Edit2, Upload, Image as ImageIcon, Sparkles } from 'lucide-react';
// Notification utility removed - using simple alerts
// Default copywriting removed - non-core feature

interface ContentManagerClientProps {
  siteSettings: any;
}

export default function ContentManagerClient({ siteSettings }: ContentManagerClientProps) {
  const [loading, setLoading] = useState(false);
  const [activeSection, setActiveSection] = useState<string>('hero');
  const [uploadingHeroImage, setUploadingHeroImage] = useState(false);

  // Hero Section
  const [heroTitle, setHeroTitle] = useState('');
  const [heroSubtitle, setHeroSubtitle] = useState('');
  const [heroBackgroundImage, setHeroBackgroundImage] = useState('');
  const [heroCtaText, setHeroCtaText] = useState('');
  const [heroCta2Text, setHeroCta2Text] = useState('');

  // Features Section
  const [featuresTitle, setFeaturesTitle] = useState('');
  const [features, setFeatures] = useState<any[]>([]);

  // Featured Products
  const [featuredProductsTitle, setFeaturedProductsTitle] = useState('');
  const [featuredProductsSubtitle, setFeaturedProductsSubtitle] = useState('');

  // Problem-Solution
  const [problemTitle, setProblemTitle] = useState('');
  const [problemSubtitle, setProblemSubtitle] = useState('');
  const [problemContent, setProblemContent] = useState('');
  const [problemItems, setProblemItems] = useState<any[]>([]);

  // Trust Section
  const [trustItems, setTrustItems] = useState<any[]>([]);

  // Blog Section
  const [blogTitle, setBlogTitle] = useState('');
  const [blogSubtitle, setBlogSubtitle] = useState('');

  // CTA Section
  const [ctaTitle, setCtaTitle] = useState('');
  const [ctaSubtitle, setCtaSubtitle] = useState('');
  const [ctaButtonText, setCtaButtonText] = useState('');

  // Marketplace
  const [marketplaceTitle, setMarketplaceTitle] = useState('');
  const [marketplaceSubtitle, setMarketplaceSubtitle] = useState('');
  const [shopeeUrl, setShopeeUrl] = useState('');
  const [tokopediaUrl, setTokopediaUrl] = useState('');

  // Footer
  const [footerAbout, setFooterAbout] = useState('');
  const [footerAddress, setFooterAddress] = useState('');
  const [footerPhone, setFooterPhone] = useState('');
  const [footerEmail, setFooterEmail] = useState('');
  const [footerSocialMedia, setFooterSocialMedia] = useState({
    facebook: '',
    instagram: '',
    youtube: '',
  });

  // About Page
  const [aboutTitle, setAboutTitle] = useState('');
  const [aboutSubtitle, setAboutSubtitle] = useState('');
  const [aboutStory, setAboutStory] = useState('');
  const [aboutValues, setAboutValues] = useState<any[]>([]);
  const [aboutStats, setAboutStats] = useState<any[]>([]);
  const [aboutMission, setAboutMission] = useState('');

  // Contact Page
  const [contactTitle, setContactTitle] = useState('');
  const [contactSubtitle, setContactSubtitle] = useState('');
  const [contactAddress, setContactAddress] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactHours, setContactHours] = useState('');

  const parseJSON = (value: any, defaultValue: any = null) => {
    if (!value) return defaultValue;
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        return defaultValue;
      }
    }
    if (typeof value === 'object') return value;
    return defaultValue;
  };

  useEffect(() => {
    if (siteSettings) {
      // Hero
      setHeroTitle(siteSettings.heroTitle || '');
      setHeroSubtitle(siteSettings.heroSubtitle || '');
      setHeroBackgroundImage(siteSettings.heroBackgroundImage || '');
      setHeroCtaText(siteSettings.heroCtaText || '');
      setHeroCta2Text(siteSettings.heroCta2Text || '');
      
      // Features
      setFeaturesTitle(siteSettings.featuresTitle || '');
      setFeatures(parseJSON(siteSettings.features, []));
      
      // Featured Products
      setFeaturedProductsTitle(siteSettings.featuredProductsTitle || '');
      setFeaturedProductsSubtitle(siteSettings.featuredProductsSubtitle || '');
      
      // Problem-Solution
      setProblemTitle(siteSettings.problemTitle || '');
      setProblemSubtitle(siteSettings.problemSubtitle || '');
      setProblemContent(siteSettings.problemContent || '');
      setProblemItems(parseJSON(siteSettings.problemItems, []));
      
      // Trust
      setTrustItems(parseJSON(siteSettings.trustItems, []));
      
      // Blog
      setBlogTitle(siteSettings.blogTitle || '');
      setBlogSubtitle(siteSettings.blogSubtitle || '');
      
      // CTA
      setCtaTitle(siteSettings.ctaTitle || '');
      setCtaSubtitle(siteSettings.ctaSubtitle || '');
      setCtaButtonText(siteSettings.ctaButtonText || '');
      
      // Marketplace
      setMarketplaceTitle(siteSettings.marketplaceTitle || '');
      setMarketplaceSubtitle(siteSettings.marketplaceSubtitle || '');
      setShopeeUrl(siteSettings.shopeeUrl || '');
      setTokopediaUrl(siteSettings.tokopediaUrl || '');
      
      // Footer
      setFooterAbout(siteSettings.footerAbout || '');
      setFooterAddress(siteSettings.footerAddress || '');
      setFooterPhone(siteSettings.footerPhone || '');
      setFooterEmail(siteSettings.footerEmail || '');
      setFooterSocialMedia(parseJSON(siteSettings.footerSocialMedia, { facebook: '', instagram: '', youtube: '' }));
      
      // About
      setAboutTitle(siteSettings.aboutTitle || '');
      setAboutSubtitle(siteSettings.aboutSubtitle || '');
      setAboutStory(siteSettings.aboutStory || '');
      setAboutValues(parseJSON(siteSettings.aboutValues, []));
      setAboutStats(parseJSON(siteSettings.aboutStats, []));
      setAboutMission(siteSettings.aboutMission || '');
      
      // Contact
      setContactTitle(siteSettings.contactTitle || '');
      setContactSubtitle(siteSettings.contactSubtitle || '');
      setContactAddress(siteSettings.contactAddress || '');
      setContactPhone(siteSettings.contactPhone || '');
      setContactEmail(siteSettings.contactEmail || '');
      setContactHours(siteSettings.contactHours || '');
    }
  }, [siteSettings]);

  // Default copywriting feature removed - non-core
  const fillWithDefaultCopywriting = () => {
    alert('Default copywriting feature has been removed. Please fill in content manually.');
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          heroTitle,
          heroSubtitle,
          heroBackgroundImage,
          heroCtaText,
          heroCta2Text,
          featuresTitle,
          features,
          featuredProductsTitle,
          featuredProductsSubtitle,
          problemTitle,
          problemSubtitle,
          problemContent,
          problemItems,
          trustItems,
          blogTitle,
          blogSubtitle,
          ctaTitle,
          ctaSubtitle,
          ctaButtonText,
          marketplaceTitle,
          marketplaceSubtitle,
          shopeeUrl,
          tokopediaUrl,
          footerAbout,
          footerAddress,
          footerPhone,
          footerEmail,
          footerSocialMedia,
          aboutTitle,
          aboutSubtitle,
          aboutStory,
          aboutValues,
          aboutStats,
          aboutMission,
          contactTitle,
          contactSubtitle,
          contactAddress,
          contactPhone,
          contactEmail,
          contactHours,
        }),
      });

      if (response.ok) {
        alert('Content saved successfully!');
      } else {
        alert('Failed to save content');
      }
    } catch (error) {
      alert('Error saving content');
    } finally {
      setLoading(false);
    }
  };

  const addFeature = () => {
    setFeatures([...features, { title: '', description: '', icon: 'ShoppingBag' }]);
  };

  const removeFeature = (index: number) => {
    setFeatures(features.filter((_, i) => i !== index));
  };

  const updateFeature = (index: number, field: string, value: string) => {
    const updated = [...features];
    updated[index] = { ...updated[index], [field]: value };
    setFeatures(updated);
  };

  const addProblemItem = () => {
    setProblemItems([...problemItems, { title: '', description: '', icon: 'Leaf' }]);
  };

  const removeProblemItem = (index: number) => {
    setProblemItems(problemItems.filter((_, i) => i !== index));
  };

  const updateProblemItem = (index: number, field: string, value: string) => {
    const updated = [...problemItems];
    updated[index] = { ...updated[index], [field]: value };
    setProblemItems(updated);
  };

  const addTrustItem = () => {
    setTrustItems([...trustItems, { title: '', description: '', icon: 'CheckCircle', value: '' }]);
  };

  const removeTrustItem = (index: number) => {
    setTrustItems(trustItems.filter((_, i) => i !== index));
  };

  const updateTrustItem = (index: number, field: string, value: string) => {
    const updated = [...trustItems];
    updated[index] = { ...updated[index], [field]: value };
    setTrustItems(updated);
  };

  const addAboutValue = () => {
    setAboutValues([...aboutValues, { title: '', description: '', icon: 'Target' }]);
  };

  const removeAboutValue = (index: number) => {
    setAboutValues(aboutValues.filter((_, i) => i !== index));
  };

  const updateAboutValue = (index: number, field: string, value: string) => {
    const updated = [...aboutValues];
    updated[index] = { ...updated[index], [field]: value };
    setAboutValues(updated);
  };

  const addAboutStat = () => {
    setAboutStats([...aboutStats, { label: '', value: '' }]);
  };

  const removeAboutStat = (index: number) => {
    setAboutStats(aboutStats.filter((_, i) => i !== index));
  };

  const updateAboutStat = (index: number, field: string, value: string) => {
    const updated = [...aboutStats];
    updated[index] = { ...updated[index], [field]: value };
    setAboutStats(updated);
  };

  const sections = [
    { id: 'hero', label: 'Hero Section' },
    { id: 'features', label: 'Features Section' },
    { id: 'featured', label: 'Featured Products' },
    { id: 'problem', label: 'Problem-Solution' },
    { id: 'trust', label: 'Trust Section' },
    { id: 'blog', label: 'Blog Section' },
    { id: 'cta', label: 'CTA Section' },
    { id: 'marketplace', label: 'Marketplace' },
    { id: 'footer', label: 'Footer' },
    { id: 'about', label: 'About Page' },
    { id: 'contact', label: 'Contact Page' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Content Management</h2>
        <div className="flex gap-3">
          <button
            onClick={fillWithDefaultCopywriting}
            className="btn-secondary flex items-center gap-2"
            title="Isi semua field kosong dengan copywriting profesional"
          >
            <Sparkles className="h-4 w-4" />
            Isi Copywriting Profesional
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="btn-primary flex items-center gap-2"
          >
            <Save className="h-4 w-4" />
            {loading ? 'Saving...' : 'Save All Content'}
          </button>
        </div>
      </div>

      {/* Section Navigation */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-wrap gap-2">
          {sections.map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                activeSection === section.id
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {section.label}
            </button>
          ))}
        </div>
      </div>

      {/* Hero Section */}
      {activeSection === 'hero' && (
        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <h3 className="text-xl font-bold">Hero Section</h3>
          <div>
            <label className="block text-sm font-medium mb-1">Hero Title</label>
            <input
              type="text"
              value={heroTitle}
              onChange={(e) => setHeroTitle(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
              placeholder="Solusi Lengkap Kebutuhan Pertanian Anda"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Hero Subtitle</label>
            <textarea
              value={heroSubtitle}
              onChange={(e) => setHeroSubtitle(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border rounded-lg"
              placeholder="Benih berkualitas, fungisida efektif, pupuk bernutrisi..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Background Image</label>
            <div className="space-y-3">
              {heroBackgroundImage && (
                <div className="relative inline-block">
                  <img 
                    src={heroBackgroundImage} 
                    alt="Hero Background Preview" 
                    className="h-48 w-full object-cover border border-gray-200 rounded-lg p-2 bg-gray-50"
                  />
                </div>
              )}
              <div className="flex gap-3">
                <label className="flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        try {
                          setUploadingHeroImage(true);
                          const formData = new FormData();
                          formData.append('file', file);
                          formData.append('category', 'settings');

                          const response = await fetch('/api/upload/image', {
                            method: 'POST',
                            body: formData,
                          });

                          const data = await response.json();

                          if (!response.ok || !data.url) {
                            throw new Error(data.error || 'Upload gagal');
                          }

                          setHeroBackgroundImage(data.url);
                          alert('Gambar background berhasil diupload!');
                        } catch (error: any) {
                          alert(`Error: ${error.message || 'Upload gagal'}`);
                        } finally {
                          setUploadingHeroImage(false);
                        }
                      }
                    }}
                    className="hidden"
                    disabled={uploadingHeroImage}
                  />
                  <Upload className="h-4 w-4" />
                  <span className="text-sm text-gray-700">
                    {uploadingHeroImage ? 'Uploading...' : 'Upload Gambar'}
                  </span>
                </label>
                <input
                  type="text"
                  value={heroBackgroundImage}
                  onChange={(e) => setHeroBackgroundImage(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="Atau masukkan URL gambar (contoh: /images/HybridChiliCultivation.jpg)"
                />
                {heroBackgroundImage && (
                  <button
                    type="button"
                    onClick={() => setHeroBackgroundImage('')}
                    className="flex items-center gap-1 px-3 py-2 text-sm text-red-600 border border-red-300 rounded-lg hover:bg-red-50 transition-colors"
                  >
                    <X className="h-4 w-4" />
                    Hapus
                  </button>
                )}
              </div>
              <p className="text-xs text-gray-500">
                Upload gambar atau masukkan URL. Format yang didukung: JPG, PNG, GIF, WebP. Maksimal 5MB.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Primary CTA Text</label>
              <input
                type="text"
                value={heroCtaText}
                onChange={(e) => setHeroCtaText(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg"
                placeholder="Lihat Produk"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Secondary CTA Text</label>
              <input
                type="text"
                value={heroCta2Text}
                onChange={(e) => setHeroCta2Text(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg"
                placeholder="Hubungi Kami"
              />
            </div>
          </div>
        </div>
      )}

      {/* Features Section */}
      {activeSection === 'features' && (
        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <h3 className="text-xl font-bold">Features Section</h3>
          <div>
            <label className="block text-sm font-medium mb-1">Section Title</label>
            <input
              type="text"
              value={featuresTitle}
              onChange={(e) => setFeaturesTitle(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium">Features</label>
              <button
                onClick={addFeature}
                className="text-sm text-green-600 hover:text-green-700 flex items-center gap-1"
              >
                <Plus className="h-4 w-4" />
                Add Feature
              </button>
            </div>
            <div className="space-y-3">
              {features.map((feature, index) => (
                <div key={index} className="border rounded-lg p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Feature {index + 1}</span>
                    <button
                      onClick={() => removeFeature(index)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <input
                    type="text"
                    value={feature.title || ''}
                    onChange={(e) => updateFeature(index, 'title', e.target.value)}
                    placeholder="Feature Title"
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                  <textarea
                    value={feature.description || ''}
                    onChange={(e) => updateFeature(index, 'description', e.target.value)}
                    placeholder="Feature Description"
                    rows={2}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                  <input
                    type="text"
                    value={feature.icon || ''}
                    onChange={(e) => updateFeature(index, 'icon', e.target.value)}
                    placeholder="Icon name (e.g., ShoppingBag)"
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Featured Products */}
      {activeSection === 'featured' && (
        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <h3 className="text-xl font-bold">Featured Products Section</h3>
          <div>
            <label className="block text-sm font-medium mb-1">Section Title</label>
            <input
              type="text"
              value={featuredProductsTitle}
              onChange={(e) => setFeaturedProductsTitle(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
              placeholder="Produk Unggulan"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Section Subtitle</label>
            <textarea
              value={featuredProductsSubtitle}
              onChange={(e) => setFeaturedProductsSubtitle(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border rounded-lg"
              placeholder="Pilihan terbaik dari kami..."
            />
          </div>
        </div>
      )}

      {/* Problem-Solution */}
      {activeSection === 'problem' && (
        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <h3 className="text-xl font-bold">Problem-Solution Section</h3>
          <div>
            <label className="block text-sm font-medium mb-1">Section Title</label>
            <input
              type="text"
              value={problemTitle}
              onChange={(e) => setProblemTitle(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Section Subtitle</label>
            <input
              type="text"
              value={problemSubtitle}
              onChange={(e) => setProblemSubtitle(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Main Content</label>
            <textarea
              value={problemContent}
              onChange={(e) => setProblemContent(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium">Problem Items</label>
              <button
                onClick={addProblemItem}
                className="text-sm text-green-600 hover:text-green-700 flex items-center gap-1"
              >
                <Plus className="h-4 w-4" />
                Add Item
              </button>
            </div>
            <div className="space-y-3">
              {problemItems.map((item, index) => (
                <div key={index} className="border rounded-lg p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Item {index + 1}</span>
                    <button
                      onClick={() => removeProblemItem(index)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <input
                    type="text"
                    value={item.title || ''}
                    onChange={(e) => updateProblemItem(index, 'title', e.target.value)}
                    placeholder="Title"
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                  <textarea
                    value={item.description || ''}
                    onChange={(e) => updateProblemItem(index, 'description', e.target.value)}
                    placeholder="Description"
                    rows={2}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                  <input
                    type="text"
                    value={item.icon || ''}
                    onChange={(e) => updateProblemItem(index, 'icon', e.target.value)}
                    placeholder="Icon name"
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Trust Section */}
      {activeSection === 'trust' && (
        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <h3 className="text-xl font-bold">Trust Section</h3>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium">Trust Items</label>
              <button
                onClick={addTrustItem}
                className="text-sm text-green-600 hover:text-green-700 flex items-center gap-1"
              >
                <Plus className="h-4 w-4" />
                Add Item
              </button>
            </div>
            <div className="space-y-3">
              {trustItems.map((item, index) => (
                <div key={index} className="border rounded-lg p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Item {index + 1}</span>
                    <button
                      onClick={() => removeTrustItem(index)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <input
                    type="text"
                    value={item.title || ''}
                    onChange={(e) => updateTrustItem(index, 'title', e.target.value)}
                    placeholder="Title"
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                  <textarea
                    value={item.description || ''}
                    onChange={(e) => updateTrustItem(index, 'description', e.target.value)}
                    placeholder="Description"
                    rows={2}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={item.icon || ''}
                      onChange={(e) => updateTrustItem(index, 'icon', e.target.value)}
                      placeholder="Icon name"
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                    <input
                      type="text"
                      value={item.value || ''}
                      onChange={(e) => updateTrustItem(index, 'value', e.target.value)}
                      placeholder="Value (optional)"
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Blog Section */}
      {activeSection === 'blog' && (
        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <h3 className="text-xl font-bold">Blog Section</h3>
          <div>
            <label className="block text-sm font-medium mb-1">Section Title</label>
            <input
              type="text"
              value={blogTitle}
              onChange={(e) => setBlogTitle(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
              placeholder="Tips & Artikel Pertanian"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Section Subtitle</label>
            <textarea
              value={blogSubtitle}
              onChange={(e) => setBlogSubtitle(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border rounded-lg"
              placeholder="Pelajari tips dan trik bertani..."
            />
          </div>
        </div>
      )}

      {/* CTA Section */}
      {activeSection === 'cta' && (
        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <h3 className="text-xl font-bold">Final CTA Section</h3>
          <div>
            <label className="block text-sm font-medium mb-1">CTA Title</label>
            <input
              type="text"
              value={ctaTitle}
              onChange={(e) => setCtaTitle(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
              placeholder="Butuh Konsultasi Produk Pertanian?"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">CTA Subtitle</label>
            <textarea
              value={ctaSubtitle}
              onChange={(e) => setCtaSubtitle(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border rounded-lg"
              placeholder="Tim ahli kami siap membantu..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Button Text</label>
            <input
              type="text"
              value={ctaButtonText}
              onChange={(e) => setCtaButtonText(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
              placeholder="Konsultasi Gratis via WhatsApp"
            />
          </div>
        </div>
      )}

      {/* Marketplace */}
      {activeSection === 'marketplace' && (
        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <h3 className="text-xl font-bold">Marketplace Section</h3>
          <div>
            <label className="block text-sm font-medium mb-1">Section Title</label>
            <input
              type="text"
              value={marketplaceTitle}
              onChange={(e) => setMarketplaceTitle(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
              placeholder="Belanja di Marketplace Favorit Anda"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Section Subtitle</label>
            <textarea
              value={marketplaceSubtitle}
              onChange={(e) => setMarketplaceSubtitle(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Shopee Store URL</label>
              <input
                type="url"
                value={shopeeUrl}
                onChange={(e) => setShopeeUrl(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg"
                placeholder="https://shopee.co.id/tokotanionline"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Tokopedia Store URL</label>
              <input
                type="url"
                value={tokopediaUrl}
                onChange={(e) => setTokopediaUrl(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg"
                placeholder="https://tokopedia.com/tokotanionline"
              />
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      {activeSection === 'footer' && (
        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <h3 className="text-xl font-bold">Footer Content</h3>
          <div>
            <label className="block text-sm font-medium mb-1">About Text</label>
            <textarea
              value={footerAbout}
              onChange={(e) => setFooterAbout(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Address</label>
              <input
                type="text"
                value={footerAddress}
                onChange={(e) => setFooterAddress(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Phone</label>
              <input
                type="text"
                value={footerPhone}
                onChange={(e) => setFooterPhone(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <input
                type="email"
                value={footerEmail}
                onChange={(e) => setFooterEmail(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Social Media URLs</label>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs text-gray-600 mb-1">Facebook</label>
                <input
                  type="url"
                  value={footerSocialMedia.facebook || ''}
                  onChange={(e) => setFooterSocialMedia({ ...footerSocialMedia, facebook: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Instagram</label>
                <input
                  type="url"
                  value={footerSocialMedia.instagram || ''}
                  onChange={(e) => setFooterSocialMedia({ ...footerSocialMedia, instagram: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">YouTube</label>
                <input
                  type="url"
                  value={footerSocialMedia.youtube || ''}
                  onChange={(e) => setFooterSocialMedia({ ...footerSocialMedia, youtube: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* About Page */}
      {activeSection === 'about' && (
        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <h3 className="text-xl font-bold">About Page Content</h3>
          <div>
            <label className="block text-sm font-medium mb-1">Page Title</label>
            <input
              type="text"
              value={aboutTitle}
              onChange={(e) => setAboutTitle(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Page Subtitle</label>
            <input
              type="text"
              value={aboutSubtitle}
              onChange={(e) => setAboutSubtitle(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Story Content (HTML allowed)</label>
            <textarea
              value={aboutStory}
              onChange={(e) => setAboutStory(e.target.value)}
              rows={8}
              className="w-full px-3 py-2 border rounded-lg font-mono text-sm"
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium">Values</label>
              <button
                onClick={addAboutValue}
                className="text-sm text-green-600 hover:text-green-700 flex items-center gap-1"
              >
                <Plus className="h-4 w-4" />
                Add Value
              </button>
            </div>
            <div className="space-y-3">
              {aboutValues.map((value, index) => (
                <div key={index} className="border rounded-lg p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Value {index + 1}</span>
                    <button
                      onClick={() => removeAboutValue(index)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <input
                    type="text"
                    value={value.title || ''}
                    onChange={(e) => updateAboutValue(index, 'title', e.target.value)}
                    placeholder="Title"
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                  <textarea
                    value={value.description || ''}
                    onChange={(e) => updateAboutValue(index, 'description', e.target.value)}
                    placeholder="Description"
                    rows={2}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                  <input
                    type="text"
                    value={value.icon || ''}
                    onChange={(e) => updateAboutValue(index, 'icon', e.target.value)}
                    placeholder="Icon name"
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
              ))}
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium">Stats</label>
              <button
                onClick={addAboutStat}
                className="text-sm text-green-600 hover:text-green-700 flex items-center gap-1"
              >
                <Plus className="h-4 w-4" />
                Add Stat
              </button>
            </div>
            <div className="space-y-3">
              {aboutStats.map((stat, index) => (
                <div key={index} className="border rounded-lg p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Stat {index + 1}</span>
                    <button
                      onClick={() => removeAboutStat(index)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={stat.value || ''}
                      onChange={(e) => updateAboutStat(index, 'value', e.target.value)}
                      placeholder="Value (e.g., 4+)"
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                    <input
                      type="text"
                      value={stat.label || ''}
                      onChange={(e) => updateAboutStat(index, 'label', e.target.value)}
                      placeholder="Label (e.g., Tahun Berpengalaman)"
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Mission Statement</label>
            <textarea
              value={aboutMission}
              onChange={(e) => setAboutMission(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
        </div>
      )}

      {/* Contact Page */}
      {activeSection === 'contact' && (
        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <h3 className="text-xl font-bold">Contact Page Content</h3>
          <div>
            <label className="block text-sm font-medium mb-1">Page Title</label>
            <input
              type="text"
              value={contactTitle}
              onChange={(e) => setContactTitle(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Page Subtitle</label>
            <input
              type="text"
              value={contactSubtitle}
              onChange={(e) => setContactSubtitle(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Address</label>
            <input
              type="text"
              value={contactAddress}
              onChange={(e) => setContactAddress(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Phone</label>
              <input
                type="text"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Operating Hours</label>
            <textarea
              value={contactHours}
              onChange={(e) => setContactHours(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border rounded-lg"
              placeholder="Senin - Jumat: 08.00 - 17.00 WIB&#10;Sabtu: 08.00 - 14.00 WIB&#10;Minggu: Tutup"
            />
          </div>
        </div>
      )}
    </div>
  );
}

















