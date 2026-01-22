/**
 * PHASE 2: AI v2 Content Editor (Read-Only)
 * 
 * Admin UI untuk AI Generator v2 content
 * - READ-ONLY untuk semua field konten
 * - Admin TIDAK BOLEH mengetik ulang atau mengedit manual
 * - Admin BOLEH memilih versi (V1, V2, ...)
 * - Admin BOLEH publish / unpublish
 */

'use client';

import { useState, useEffect } from 'react';
import { Eye, Lock, CheckCircle, XCircle } from 'lucide-react';

interface FrontendContentPackage {
  pageType: string;
  title: string;
  heroCopy: string;
  sections: Array<{
    heading: string;
    headingLevel: 2 | 3;
    body: string;
    order: number;
  }>;
  cta: {
    text: string;
    action: string;
    placement: string;
  };
  microcopy: {
    readingTime?: string;
    lastUpdated?: string;
    author?: string;
    tags?: string[];
  };
  tone: {
    style: string;
    formality: string;
    targetAudience: string;
  };
  metadata: {
    version: number;
    generatedAt: string;
    contentType: string;
    wordCount: number;
    readingTime: number;
  };
}

interface AIV2ContentEditorProps {
  pageId: string;
  initialVersion?: number;
  onVersionChange?: (version: number) => void;
  onPublish?: (version: number) => void;
  onUnpublish?: () => void;
  isPublished?: boolean;
}

export default function AIV2ContentEditor({
  pageId,
  initialVersion,
  onVersionChange,
  onPublish,
  onUnpublish,
  isPublished = false,
}: AIV2ContentEditorProps) {
  const [content, setContent] = useState<FrontendContentPackage | null>(null);
  const [versions, setVersions] = useState<Array<{ version: number; createdAt: string }>>([]);
  const [selectedVersion, setSelectedVersion] = useState<number | null>(initialVersion || null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadVersions();
    if (selectedVersion) {
      loadContent(selectedVersion);
    } else {
      loadLatest();
    }
  }, [pageId, selectedVersion]);

  const loadVersions = async () => {
    try {
      const response = await fetch(`/api/admin/ai-v2/versions?pageId=${pageId}`);
      if (!response.ok) throw new Error('Failed to load versions');
      const data = await response.json();
      setVersions(data.versions || []);
    } catch (err: any) {
      console.error('Failed to load versions:', err);
    }
  };

  const loadContent = async (version: number) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/ai-v2/preview?pageId=${pageId}&version=${version}`);
      if (!response.ok) throw new Error('Failed to load content');
      const data = await response.json();
      setContent(data.package || data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadLatest = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/ai-v2/preview?pageId=${pageId}`);
      if (!response.ok) throw new Error('Failed to load content');
      const data = await response.json();
      setContent(data.package || data);
      if (data.version) {
        setSelectedVersion(data.version);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVersionSelect = (version: number) => {
    setSelectedVersion(version);
    if (onVersionChange) {
      onVersionChange(version);
    }
  };

  const handlePublish = () => {
    if (selectedVersion && onPublish) {
      onPublish(selectedVersion);
    }
  };

  const handleUnpublish = () => {
    if (onUnpublish) {
      onUnpublish();
    }
  };

  if (loading) {
    return (
      <div className="p-4 text-center text-gray-600">
        Loading content...
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-600">Error: {error}</p>
      </div>
    );
  }

  if (!content) {
    return (
      <div className="p-4 text-center text-gray-600">
        No content found
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Version Selector */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Content Version</h3>
          {isPublished && (
            <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Published
            </span>
          )}
        </div>
        
        {versions.length > 0 && (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Version:
            </label>
            <select
              value={selectedVersion || ''}
              onChange={(e) => handleVersionSelect(Number(e.target.value))}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              {versions.map((v) => (
                <option key={v.version} value={v.version}>
                  V{v.version} - {new Date(v.createdAt).toLocaleString()}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="mt-4 flex gap-2">
          {!isPublished && selectedVersion && (
            <button
              onClick={handlePublish}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium"
            >
              Publish This Version
            </button>
          )}
          {isPublished && (
            <button
              onClick={handleUnpublish}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium"
            >
              Unpublish
            </button>
          )}
        </div>
      </div>

      {/* Content Display - READ-ONLY */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center gap-2 mb-4 pb-4 border-b border-gray-200">
          <Lock className="h-5 w-5 text-gray-400" />
          <span className="text-sm font-medium text-gray-600">READ-ONLY - Content cannot be edited</span>
        </div>

        {/* Title - READ-ONLY */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
          <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-900">
            {content.title}
          </div>
        </div>

        {/* Hero Copy - READ-ONLY */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Hero Copy</label>
          <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-700">
            {content.heroCopy}
          </div>
        </div>

        {/* Sections - READ-ONLY */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Sections</label>
          <div className="space-y-4">
            {content.sections
              .sort((a, b) => a.order - b.order)
              .map((section, index) => (
                <div key={index} className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                  <div className="font-semibold text-gray-900 mb-2">
                    {section.headingLevel === 2 ? 'H2' : 'H3'}: {section.heading}
                  </div>
                  <div className="text-gray-700 whitespace-pre-wrap text-sm">
                    {section.body}
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* CTA - READ-ONLY */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">CTA</label>
          <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
            <div className="text-gray-900 font-medium">{content.cta.text}</div>
            <div className="text-sm text-gray-600 mt-1">
              Action: {content.cta.action} | Placement: {content.cta.placement}
            </div>
          </div>
        </div>

        {/* Metadata */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Word Count:</span>
              <span className="ml-2 font-medium text-gray-900">{content.metadata.wordCount}</span>
            </div>
            <div>
              <span className="text-gray-600">Reading Time:</span>
              <span className="ml-2 font-medium text-gray-900">{content.metadata.readingTime} min</span>
            </div>
            <div>
              <span className="text-gray-600">Version:</span>
              <span className="ml-2 font-medium text-gray-900">V{content.metadata.version}</span>
            </div>
            <div>
              <span className="text-gray-600">Generated:</span>
              <span className="ml-2 font-medium text-gray-900">
                {new Date(content.metadata.generatedAt).toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
