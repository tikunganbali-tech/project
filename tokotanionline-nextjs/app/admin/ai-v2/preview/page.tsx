/**
 * PHASE 1.6: Preview Internal Page
 * 
 * Preview hasil kerja AI apa adanya, tanpa polesan.
 * 
 * Aturan keras preview:
 * - Render langsung dari FRONTEND_CONTENT_PACKAGE
 * - Tidak ada edit manual
 * - Tidak ada truncate
 * - Tidak ada SEO metadata
 * - Tidak ada layout frontend lama
 * 
 * Preview = etalase pabrik, bukan toko.
 */

'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

interface FrontendContentPackage {
  pageType: string;
  title: string;
  heroCopy: string;
  sections: ContentSection[];
  cta: CTAInfo;
  microcopy: MicrocopyInfo;
  tone: ToneInfo;
  metadata: MetadataInfo;
}

interface ContentSection {
  heading: string;
  headingLevel: 2 | 3;
  body: string;
  order: number;
}

interface CTAInfo {
  text: string;
  action: string;
  placement: string;
}

interface MicrocopyInfo {
  readingTime?: string;
  lastUpdated?: string;
  author?: string;
  tags?: string[];
}

interface ToneInfo {
  style: string;
  formality: string;
  targetAudience: string;
}

interface MetadataInfo {
  version: number;
  generatedAt: string;
  contentType: string;
  wordCount: number;
  readingTime: number;
}

interface StoredContent {
  pageId: string;
  version: number;
  package: FrontendContentPackage;
  createdAt: string;
}

function AIV2PreviewPageInner() {
  const searchParams = useSearchParams();
  // Next.js types can mark searchParams as nullable in some render paths
  const pageId = searchParams?.get('pageId') || null;
  const versionParam = searchParams?.get('version') || null;

  const [content, setContent] = useState<StoredContent | null>(null);
  const [versions, setVersions] = useState<StoredContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedVersion, setSelectedVersion] = useState<number | null>(null);

  useEffect(() => {
    if (!pageId) {
      setError('pageId is required');
      setLoading(false);
      return;
    }

    loadContent();
    loadVersions();
  }, [pageId, versionParam]);

  const loadContent = async () => {
    try {
      const version = versionParam || selectedVersion;
      const url = version
        ? `/api/admin/ai-v2/preview?pageId=${pageId}&version=${version}`
        : `/api/admin/ai-v2/preview?pageId=${pageId}`;

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to load content');
      }

      const data = await response.json();
      setContent(data);
      setSelectedVersion(data.version);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadVersions = async () => {
    try {
      const response = await fetch(`/api/admin/ai-v2/versions?pageId=${pageId}`);
      if (!response.ok) {
        throw new Error('Failed to load versions');
      }

      const data = await response.json();
      setVersions(data.versions || []);
    } catch (err: any) {
      console.error('Failed to load versions:', err);
    }
  };

  const handleVersionChange = (version: number) => {
    setSelectedVersion(version);
    loadContent();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading preview...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">Error: {error}</p>
          <a href="/admin" className="text-blue-600 hover:underline">
            Back to Admin
          </a>
        </div>
      </div>
    );
  }

  if (!content) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">No content found</p>
        </div>
      </div>
    );
  }

  const pkg = content.package;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header - Version Selector */}
      <div className="bg-white border-b shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">AI Generator v2 Preview</h1>
              <p className="text-sm text-gray-600 mt-1">
                Page ID: <span className="font-mono">{content.pageId}</span>
              </p>
            </div>
            <div className="flex items-center gap-4">
              {versions.length > 0 && (
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-gray-700">Version:</label>
                  <select
                    value={selectedVersion || ''}
                    onChange={(e) => handleVersionChange(Number(e.target.value))}
                    className="border border-gray-300 rounded-md px-3 py-1 text-sm"
                  >
                    {versions.map((v) => (
                      <option key={v.version} value={v.version}>
                        V{v.version} ({new Date(v.createdAt).toLocaleDateString()})
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div className="text-sm text-gray-600">
                Word Count: {pkg.metadata.wordCount} | Reading Time: {pkg.metadata.readingTime} min
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content Preview - NO TRUNCATE, NO SEO, NO LAYOUT LAMA */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Title */}
        <h1 className="text-4xl font-bold text-gray-900 mb-4">{pkg.title}</h1>

        {/* Hero Copy */}
        <p className="text-xl text-gray-700 mb-8 leading-relaxed">{pkg.heroCopy}</p>

        {/* Sections - Render semua, tidak ada truncate */}
        <div className="space-y-8">
          {pkg.sections
            .sort((a, b) => a.order - b.order)
            .map((section, index) => (
              <div key={index} className="prose prose-lg max-w-none">
                {section.headingLevel === 2 ? (
                  <h2 className="text-3xl font-bold text-gray-900 mt-8 mb-4">
                    {section.heading}
                  </h2>
                ) : (
                  <h3 className="text-2xl font-semibold text-gray-800 mt-6 mb-3">
                    {section.heading}
                  </h3>
                )}
                <div
                  className="text-gray-700 leading-relaxed whitespace-pre-wrap"
                  dangerouslySetInnerHTML={{
                    __html: section.body.replace(/\n/g, '<br />'),
                  }}
                />
              </div>
            ))}
        </div>

        {/* CTA */}
        {pkg.cta && (
          <div className="mt-12 p-6 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-lg font-semibold text-blue-900 mb-2">{pkg.cta.text}</p>
            <p className="text-sm text-blue-700">Action: {pkg.cta.action}</p>
            <p className="text-sm text-blue-700">Placement: {pkg.cta.placement}</p>
          </div>
        )}

        {/* Microcopy */}
        {pkg.microcopy && (
          <div className="mt-8 pt-8 border-t border-gray-200">
            <div className="flex flex-wrap gap-4 text-sm text-gray-600">
              {pkg.microcopy.readingTime && (
                <span>⏱️ {pkg.microcopy.readingTime}</span>
              )}
              {pkg.microcopy.lastUpdated && (
                <span>📅 {pkg.microcopy.lastUpdated}</span>
              )}
              {pkg.microcopy.author && <span>✍️ {pkg.microcopy.author}</span>}
              {pkg.microcopy.tags && pkg.microcopy.tags.length > 0 && (
                <span>🏷️ {pkg.microcopy.tags.join(', ')}</span>
              )}
            </div>
          </div>
        )}

        {/* Tone Info (for debugging) */}
        <div className="mt-8 p-4 bg-gray-100 rounded-lg text-sm text-gray-600">
          <p>
            <strong>Tone:</strong> {pkg.tone.style} | {pkg.tone.formality} | Target: {pkg.tone.targetAudience}
          </p>
          <p className="mt-2">
            <strong>Metadata:</strong> Version {pkg.metadata.version} | Generated: {new Date(pkg.metadata.generatedAt).toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function AIV2PreviewPage() {
  // Next.js requires `useSearchParams()` to be wrapped in a Suspense boundary.
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading preview...</p>
          </div>
        </div>
      }
    >
      <AIV2PreviewPageInner />
    </Suspense>
  );
}
