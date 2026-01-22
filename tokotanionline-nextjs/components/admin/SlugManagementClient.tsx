'use client';

import { useState } from 'react';

export default function SlugManagementClient() {
  const [previewData, setPreviewData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [numericSlugs, setNumericSlugs] = useState<any[]>([]);
  const [redirects, setRedirects] = useState<any[]>([]);

  const handlePreviewSlug = async (title: string, keyword?: string, categoryId?: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        action: 'preview',
        title,
        ...(keyword && { keyword }),
        ...(categoryId && { categoryId }),
      });

      const response = await fetch(`/api/admin/slug-management?${params}`);
      const data = await response.json();
      setPreviewData(data);
    } catch (error) {
      console.error('Error previewing slug:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckNumeric = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/slug-management?action=check-numeric');
      const data = await response.json();
      setNumericSlugs(data.blogs || []);
    } catch (error) {
      console.error('Error checking numeric slugs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFixAll = async () => {
    if (!confirm('Fix all numeric slugs? This will create redirects for old URLs.')) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/admin/slug-management', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'fix-all' }),
      });

      const result = await response.json();
      alert(`Fixed: ${result.fixed}, Skipped: ${result.skipped}, Errors: ${result.errors}`);
      await handleCheckNumeric();
    } catch (error) {
      console.error('Error fixing slugs:', error);
      alert('Error fixing slugs');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6">Slug Management</h2>

      <div className="space-y-6">
        {/* Slug Preview */}
        <div className="border rounded-lg p-4">
          <h3 className="text-lg font-semibold mb-4">Slug Preview</h3>
          <div className="space-y-2">
            <input
              type="text"
              placeholder="Blog title"
              className="w-full px-3 py-2 border rounded"
              id="preview-title"
            />
            <input
              type="text"
              placeholder="Primary keyword (optional)"
              className="w-full px-3 py-2 border rounded"
              id="preview-keyword"
            />
            <button
              onClick={() => {
                const title = (document.getElementById('preview-title') as HTMLInputElement).value;
                const keyword = (document.getElementById('preview-keyword') as HTMLInputElement).value;
                if (title) handlePreviewSlug(title, keyword);
              }}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Preview Slug
            </button>
            {previewData && (
              <div className="mt-4 p-4 bg-gray-50 rounded">
                <div className="font-mono text-lg">{previewData.slug}</div>
                <div className="mt-2 text-sm text-gray-600">
                  Quality Score: {previewData.qualityScore}/100
                </div>
                {previewData.validation && (
                  <div className="mt-2">
                    {previewData.validation.valid ? (
                      <span className="text-green-600">✓ Valid slug</span>
                    ) : (
                      <div>
                        <span className="text-red-600">Issues:</span>
                        <ul className="list-disc list-inside text-sm">
                          {previewData.validation.issues.map((issue: string, i: number) => (
                            <li key={i}>{issue}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Numeric Slug Checker */}
        <div className="border rounded-lg p-4">
          <h3 className="text-lg font-semibold mb-4">Numeric Slug Checker</h3>
          <button
            onClick={handleCheckNumeric}
            disabled={loading}
            className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 mb-4"
          >
            Check for Numeric Slugs
          </button>
          {numericSlugs.length > 0 && (
            <div>
              <p className="mb-2">Found {numericSlugs.length} blogs with numeric slugs:</p>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {numericSlugs.map((blog) => (
                  <div key={blog.id} className="p-2 bg-gray-50 rounded text-sm">
                    <div className="font-semibold">{blog.title}</div>
                    <div className="font-mono text-red-600">{blog.slug}</div>
                  </div>
                ))}
              </div>
              <button
                onClick={handleFixAll}
                disabled={loading}
                className="mt-4 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                Fix All Numeric Slugs
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

















