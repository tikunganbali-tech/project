'use client';

import { useState, useEffect, useRef } from 'react';
import { Bot, Settings, Play, Clock, CheckCircle, XCircle, RefreshCw, Sparkles, FileText } from 'lucide-react';
// Notification utility removed - using simple alerts

interface AIGeneratorClientProps {
  settings: any;
  queue: any[];
  categories: any[];
  publishedBlogs?: any[];
}

import { useEngineState } from '@/lib/hooks/useEngineState';

export default function AIGeneratorClient({ settings, queue, categories, publishedBlogs = [] }: AIGeneratorClientProps) {
  // Store interval refs for cleanup
  const intervalRefs = useRef<Record<string, NodeJS.Timeout>>({});
  const { canRunAI, getAIDisableReason } = useEngineState();

  const [showSettings, setShowSettings] = useState(false);
  const [showImprove, setShowImprove] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [improving, setImproving] = useState<string | null>(null);
  const [progressLogs, setProgressLogs] = useState<Record<string, any>>({});
  const [contentType, setContentType] = useState<'blog' | 'product'>('blog');
  const [keyword, setKeyword] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [wordCount, setWordCount] = useState(settings?.wordCount || 1500);
  const [tone, setTone] = useState(settings?.tone || 'expert_farmer');
  const [improveOptions, setImproveOptions] = useState({
    improveContent: true,
    improveImage: true,
    improveSEO: true,
    syncEngines: true,
  });
  const [aiSettings, setAiSettings] = useState({
    articlesPerDay: settings?.articlesPerDay || 3,
    wordCount: settings?.wordCount || 1500,
    tone: settings?.tone || 'expert_farmer',
    keywords: settings?.keywords ? JSON.parse(settings.keywords).join(', ') : '',
    cronSchedule: settings?.cronSchedule || '0 8,14,20 * * *',
    publishTimes: settings?.publishTimes ? JSON.parse(settings.publishTimes).join(', ') : '08:00, 14:00, 20:00',
    seoSyncDelay: settings?.seoSyncDelay || 300,
    isActive: settings?.isActive !== false,
  });

  const handleGenerate = async () => {
    if (!keyword.trim()) {
      alert('Masukkan keyword/topic');
      return;
    }

    setGenerating(true);
    try {
      const response = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: contentType,
          topic: keyword,
          language: 'id',
          categoryId: categoryId || null,
        }),
      });

      const result = await response.json();
      if (response.ok) {
        alert(`${contentType === 'blog' ? 'Artikel' : 'Produk'} berhasil dibuat sebagai draft!`);
        window.location.reload();
      } else {
        // PARTIAL-SAFE: Extract step-specific error (NO GENERIC "AI generation failed")
        const errorStep = result?.step || 'unknown';
        const errorMsg = result?.message || result?.error || 'Gagal membuat konten';
        
        // Build honest error message dengan step info
        let honestErrorMessage = `Gagal di ${errorStep}: ${errorMsg}`;
        if (result?.steps) {
          // Check steps array for failed steps
          const failedSteps = result.steps.filter((s: any) => !s.ok);
          if (failedSteps.length > 0) {
            const failedStepNames = failedSteps.map((s: any) => s.step).join(', ');
            honestErrorMessage = `Gagal di ${failedStepNames}: ${errorMsg}`;
          }
        }
        
        alert(`❌ ${honestErrorMessage}`);
        if (result.validationErrors) {
          console.error('Validation errors:', result.validationErrors);
        }
      }
    } catch (error: any) {
      // NO GENERIC "AI generation failed" - use specific error
      const errorMsg = error.message || 'Terjadi kesalahan';
      alert(`❌ ${errorMsg}`);
    } finally {
      setGenerating(false);
    }
  };

  const handleImproveBlog = async (blogId: string) => {
    setImproving(blogId);
    let progressLogId: string | null = null;

    try {
      // Start improvement
      const response = await fetch(`/api/ai/improve/${blogId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(improveOptions),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        alert(`❌ Error: ${errorData.error || `HTTP ${response.status}`}`);
        setImproving(null);
        return;
      }

      const result = await response.json();
      progressLogId = result.progressLogId;

      // Start polling for progress if we have a log ID
      if (progressLogId) {
        const checkProgress = async () => {
          try {
            const progressResponse = await fetch(`/api/ai/improve/${blogId}/progress?logId=${progressLogId}`);
            
            if (!progressResponse.ok) {
              const errorData = await progressResponse.json().catch(() => ({}));
              console.error('Progress check failed:', errorData);
              return;
            }
            
            const progressData = await progressResponse.json();

            if (progressData) {
              setProgressLogs((prev) => ({
                ...prev,
                [blogId]: progressData,
              }));

              // If completed or failed, stop polling
              if (progressData.isCompleted || progressData.isFailed) {
                if (intervalRefs.current[blogId]) {
                  clearInterval(intervalRefs.current[blogId]);
                  delete intervalRefs.current[blogId];
                }

                if (progressData.isCompleted) {
                  alert(`✅ Blog berhasil diperbaiki!`);
                  setTimeout(() => {
                    window.location.reload();
                  }, 2000);
                } else {
                  alert(`❌ Gagal memperbaiki blog: ${progressData.errorMessage || 'Unknown error'}`);
                  setImproving(null);
                }
              }
            }
          } catch (error) {
            console.error('Error checking progress:', error);
          }
        };

        // Check immediately
        checkProgress();
        
        // Then poll every 2 seconds
        intervalRefs.current[blogId] = setInterval(checkProgress, 2000);
      } else {
        // Fallback to old behavior if no progress log
        if (result.success || (result.improvements && result.improvements.length > 0)) {
          alert(`✅ Blog berhasil diperbaiki! ${result.improvements?.length || 0} improvements applied`);
          
          if (result.errors && result.errors.length > 0) {
            alert(`⚠️ ${result.errors.length} warnings: ${result.errors.slice(0, 2).join(', ')}`);
          }
          
          setTimeout(() => {
            window.location.reload();
          }, 2000);
        } else {
          alert(`❌ Gagal memperbaiki blog: ${result.errors?.join(', ') || 'Unknown error'}`);
          setImproving(null);
        }
      }
    } catch (error: any) {
      alert(`❌ Error: ${error.message || 'Terjadi kesalahan'}`);
      if (intervalRefs.current[blogId]) {
        clearInterval(intervalRefs.current[blogId]);
        delete intervalRefs.current[blogId];
      }
      setImproving(null);
    }
  };

  // Cleanup intervals on unmount
  useEffect(() => {
    return () => {
      // Clear all intervals on unmount
      Object.values(intervalRefs.current).forEach((interval) => {
        if (interval) clearInterval(interval);
      });
    };
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
          <Bot className="h-8 w-8 text-purple-600" />
          AI Content Generator
        </h1>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="btn-secondary flex items-center gap-2"
        >
          <Settings className="h-4 w-4" />
          Settings
        </button>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">AI Content Settings</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Keywords (comma-separated)
              </label>
              <textarea
                value={aiSettings.keywords}
                onChange={(e) => setAiSettings({ ...aiSettings, keywords: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="pertanian, budidaya, hama tanaman"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Articles Per Day
              </label>
              <input
                type="number"
                value={aiSettings.articlesPerDay}
                onChange={(e) => setAiSettings({ ...aiSettings, articlesPerDay: parseInt(e.target.value) })}
                min={1}
                max={10}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Default Word Count
              </label>
              <input
                type="number"
                value={aiSettings.wordCount}
                onChange={(e) => setAiSettings({ ...aiSettings, wordCount: parseInt(e.target.value) })}
                min={500}
                max={3000}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Default Tone</label>
              <select
                value={aiSettings.tone}
                onChange={(e) => setAiSettings({ ...aiSettings, tone: e.target.value })}
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
                value={aiSettings.cronSchedule}
                onChange={(e) => setAiSettings({ ...aiSettings, cronSchedule: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="0 8,14,20 * * *"
              />
            </div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={aiSettings.isActive}
                onChange={(e) => setAiSettings({ ...aiSettings, isActive: e.target.checked })}
                className="w-4 h-4 text-green-600 rounded"
              />
              <span>Enable Auto-generation</span>
            </label>
            <button
              onClick={async () => {
                try {
                  const response = await fetch('/api/admin/ai-settings', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      keywords: aiSettings.keywords.split(',').map((k: string) => k.trim()).filter(Boolean),
                      articlesPerDay: aiSettings.articlesPerDay,
                      wordCount: aiSettings.wordCount,
                      tone: aiSettings.tone,
                      cronSchedule: aiSettings.cronSchedule,
                      publishTimes: aiSettings.publishTimes.split(',').map((t: string) => t.trim()).filter(Boolean),
                      seoSyncDelay: aiSettings.seoSyncDelay,
                      isActive: aiSettings.isActive,
                    }),
                  });
                  if (response.ok) {
                    alert('Settings saved!');
                    setShowSettings(false);
                  }
                } catch (error) {
                  alert('Error saving settings');
                }
              }}
              className="btn-primary"
            >
              Save Settings
            </button>
          </div>
        </div>
      )}

      {/* Manual Generation */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Generate Content Now</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Jenis Konten *</label>
            <select
              value={contentType}
              onChange={(e) => setContentType(e.target.value as 'blog' | 'product')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="blog">Blog Artikel</option>
              <option value="product">Produk</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Topic/Keyword *</label>
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Contoh: cara menanam cabe, pestisida organik, dll"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Kategori</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="">Pilih Kategori</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
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
          <button
            onClick={handleGenerate}
            disabled={generating || !canRunAI}
            className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            title={!canRunAI ? getAIDisableReason() || 'AI Engine tidak aktif' : undefined}
          >
            <Play className="h-4 w-4" />
            {generating ? 'Generating...' : 'Generate Article'}
          </button>
        </div>
      </div>

      {/* Improve Published Blogs */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-600" />
            Improve Published Blogs
          </h2>
          <button
            onClick={() => setShowImprove(!showImprove)}
            className="btn-secondary flex items-center gap-2"
          >
            {showImprove ? 'Hide' : 'Show'} Published Blogs
          </button>
        </div>

        {showImprove && (
          <>
            <div className="mb-4 p-4 bg-purple-50 rounded-lg border border-purple-200">
              <h3 className="font-medium text-purple-900 mb-2">Improvement Options</h3>
              <div className="grid grid-cols-2 gap-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={improveOptions.improveContent}
                    onChange={(e) =>
                      setImproveOptions({ ...improveOptions, improveContent: e.target.checked })
                    }
                    className="w-4 h-4 text-purple-600 rounded"
                  />
                  <span className="text-sm">Improve Content</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={improveOptions.improveImage}
                    onChange={(e) =>
                      setImproveOptions({ ...improveOptions, improveImage: e.target.checked })
                    }
                    className="w-4 h-4 text-purple-600 rounded"
                  />
                  <span className="text-sm">Improve Image</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={improveOptions.improveSEO}
                    onChange={(e) =>
                      setImproveOptions({ ...improveOptions, improveSEO: e.target.checked })
                    }
                    className="w-4 h-4 text-purple-600 rounded"
                  />
                  <span className="text-sm">Improve SEO</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={improveOptions.syncEngines}
                    onChange={(e) =>
                      setImproveOptions({ ...improveOptions, syncEngines: e.target.checked })
                    }
                    className="w-4 h-4 text-purple-600 rounded"
                  />
                  <span className="text-sm">Sync Engines</span>
                </label>
              </div>
              <p className="text-xs text-purple-700 mt-2">
                💡 Menggunakan algoritma terbaru dari AI Generator untuk memperbaiki blog yang sudah terpublish
              </p>
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {publishedBlogs.length > 0 ? (
                publishedBlogs.map((blog) => (
                  <div
                    key={blog.id}
                    className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <FileText className="h-5 w-5 text-blue-600" />
                      <div className="flex-1">
                        <p className="font-medium text-sm">{blog.title}</p>
                        <p className="text-xs text-gray-500">
                          {blog.category?.name || 'No category'} • Published:{' '}
                          {new Date(blog.publishedAt).toLocaleDateString('id-ID')}
                          {blog.updatedAt && blog.updatedAt > blog.publishedAt && (
                            <span className="text-orange-600 ml-1">
                              (Updated: {new Date(blog.updatedAt).toLocaleDateString('id-ID')})
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {improving === blog.id && progressLogs[blog.id] && (
                        <div className="flex-1 min-w-[250px]">
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-gray-700 font-medium">
                              {progressLogs[blog.id].message || 'Processing...'}
                            </span>
                            <span className="text-purple-600 font-semibold">
                              {progressLogs[blog.id].progress || 0}%
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2.5 mb-1">
                            <div
                              className="bg-purple-600 h-2.5 rounded-full transition-all duration-500 ease-out"
                              style={{ width: `${progressLogs[blog.id].progress || 0}%` }}
                            />
                          </div>
                          {progressLogs[blog.id].elapsed && (
                            <div className="text-xs text-gray-500">
                              ⏱️ {Math.floor(progressLogs[blog.id].elapsed / 60)}m {progressLogs[blog.id].elapsed % 60}s
                            </div>
                          )}
                        </div>
                      )}
                      <button
                        onClick={() => handleImproveBlog(blog.id)}
                        disabled={improving === blog.id}
                        className="btn-secondary flex items-center gap-2 text-sm px-3 py-1.5 whitespace-nowrap"
                      >
                        {improving === blog.id ? (
                          <>
                            <Clock className="h-4 w-4 animate-spin" />
                            {progressLogs[blog.id]?.isCompleted ? 'Completed!' : progressLogs[blog.id]?.isFailed ? 'Failed' : 'Improving...'}
                          </>
                        ) : (
                          <>
                            <RefreshCw className="h-4 w-4" />
                            Improve
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-center py-4">Tidak ada published blog untuk diperbaiki</p>
              )}
            </div>
          </>
        )}
      </div>

      {/* Queue */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Generation Queue</h2>
        <div className="space-y-2">
          {queue.length > 0 ? (
            queue.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-3 border border-gray-200 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  {item.status === 'completed' ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : item.status === 'failed' ? (
                    <XCircle className="h-5 w-5 text-red-600" />
                  ) : item.status === 'processing' ? (
                    <Clock className="h-5 w-5 text-yellow-600 animate-spin" />
                  ) : (
                    <Clock className="h-5 w-5 text-gray-400" />
                  )}
                  <div>
                    <p className="font-medium">{item.keyword}</p>
                    <p className="text-sm text-gray-500">
                      {new Date(item.createdAt).toLocaleString('id-ID')}
                    </p>
                  </div>
                </div>
                <span
                  className={`px-2 py-1 text-xs rounded-full ${
                    item.status === 'completed'
                      ? 'bg-green-100 text-green-800'
                      : item.status === 'failed'
                      ? 'bg-red-100 text-red-800'
                      : item.status === 'processing'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {item.status}
                </span>
              </div>
            ))
          ) : (
            <p className="text-gray-500 text-center py-4">Tidak ada item dalam queue</p>
          )}
        </div>
      </div>
    </div>
  );
}

