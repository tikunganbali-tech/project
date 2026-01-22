/**
 * UI-C3 — CONTENT HEALTH DASHBOARD CLIENT COMPONENT
 * 
 * Features:
 * - Ringkasan kesehatan konten
 * - Total konten
 * - READY % / WARNING % / RISK %
 * - Visual indicators
 * - Quick links ke Media Monitor & SEO Monitor
 */

'use client';

import { useState, useEffect } from 'react';
import { Loader2, AlertCircle, CheckCircle, AlertTriangle, XCircle, FileText, Image, Search, ArrowRight } from 'lucide-react';
import Link from 'next/link';

interface ContentHealthStats {
  total: number;
  ready: number;
  warning: number;
  risk: number;
  readyPercent: number;
  warningPercent: number;
  riskPercent: number;
}

interface ContentHealthResponse {
  success: boolean;
  stats: ContentHealthStats;
  error?: string;
}

interface MediaStats {
  total: number;
  used: number;
  orphan: number;
}

interface MediaStatsResponse {
  success: boolean;
  stats: MediaStats;
  error?: string;
}

interface ContentHealthClientProps {
  userRole: string;
}

export default function ContentHealthClient({ userRole }: ContentHealthClientProps) {
  const [seoStats, setSeoStats] = useState<ContentHealthStats | null>(null);
  const [mediaStats, setMediaStats] = useState<MediaStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Fetch SEO stats
      const seoResponse = await fetch('/api/admin/seo/monitor');
      const seoData: ContentHealthResponse = await seoResponse.json();
      
      if (!seoResponse.ok || !seoData.success) {
        throw new Error(seoData.error || 'Failed to fetch SEO stats');
      }
      
      setSeoStats(seoData.stats);
      
      // Fetch Media stats
      const mediaResponse = await fetch('/api/admin/media/monitor');
      const mediaData: MediaStatsResponse = await mediaResponse.json();
      
      if (!mediaResponse.ok || !mediaData.success) {
        // Media stats failure is non-critical
        console.warn('Failed to fetch media stats:', mediaData.error);
      } else {
        setMediaStats(mediaData.stats);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load health data');
      console.error('Error fetching health data:', err);
    } finally {
      setLoading(false);
    }
  };

  const getOverallHealth = (): { status: 'healthy' | 'warning' | 'risk'; message: string } => {
    if (!seoStats) return { status: 'risk', message: 'No data' };
    
    if (seoStats.riskPercent > 20) {
      return { status: 'risk', message: 'High risk content detected' };
    }
    if (seoStats.warningPercent > 30 || seoStats.riskPercent > 10) {
      return { status: 'warning', message: 'Some content needs attention' };
    }
    return { status: 'healthy', message: 'Content is healthy' };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-600" />
          <div>
            <p className="font-medium text-red-900">Error loading health data</p>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  const overallHealth = getOverallHealth();

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Content Health Dashboard</h1>
        <p className="text-gray-600">Ringkasan kesehatan konten dan media website</p>
      </div>

      {/* Overall Health Status */}
      <div className={`mb-6 p-6 rounded-lg border-2 ${
        overallHealth.status === 'healthy'
          ? 'bg-green-50 border-green-300'
          : overallHealth.status === 'warning'
          ? 'bg-orange-50 border-orange-300'
          : 'bg-red-50 border-red-300'
      }`}>
        <div className="flex items-center gap-4">
          {overallHealth.status === 'healthy' ? (
            <CheckCircle className="w-12 h-12 text-green-600" />
          ) : overallHealth.status === 'warning' ? (
            <AlertTriangle className="w-12 h-12 text-orange-600" />
          ) : (
            <XCircle className="w-12 h-12 text-red-600" />
          )}
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-1">
              {overallHealth.status === 'healthy' ? 'Situs Sehat' : overallHealth.status === 'warning' ? 'Perlu Perhatian' : 'Berisiko'}
            </h2>
            <p className="text-gray-700">{overallHealth.message}</p>
          </div>
        </div>
      </div>

      {/* SEO Content Health */}
      {seoStats && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">SEO Content Health</h2>
            <Link
              href="/admin/seo/monitor"
              className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1"
            >
              Lihat detail <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-gray-600">Total Konten</p>
                <FileText className="w-5 h-5 text-gray-400" />
              </div>
              <p className="text-3xl font-bold text-gray-900">{seoStats.total}</p>
            </div>
            
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-green-700">READY</p>
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <p className="text-3xl font-bold text-green-900">{seoStats.ready}</p>
              <p className="text-sm text-green-600 mt-1">{seoStats.readyPercent}%</p>
            </div>
            
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-orange-700">WARNING</p>
                <AlertTriangle className="w-5 h-5 text-orange-600" />
              </div>
              <p className="text-3xl font-bold text-orange-900">{seoStats.warning}</p>
              <p className="text-sm text-orange-600 mt-1">{seoStats.warningPercent}%</p>
            </div>
            
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-red-700">RISK</p>
                <XCircle className="w-5 h-5 text-red-600" />
              </div>
              <p className="text-3xl font-bold text-red-900">{seoStats.risk}</p>
              <p className="text-sm text-red-600 mt-1">{seoStats.riskPercent}%</p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-4 bg-gray-200 rounded-full h-4 overflow-hidden">
            <div className="h-full flex">
              <div
                className="bg-green-600"
                style={{ width: `${seoStats.readyPercent}%` }}
              />
              <div
                className="bg-orange-500"
                style={{ width: `${seoStats.warningPercent}%` }}
              />
              <div
                className="bg-red-600"
                style={{ width: `${seoStats.riskPercent}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Media Health */}
      {mediaStats && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Media Health</h2>
            <Link
              href="/admin/media/monitor"
              className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1"
            >
              Lihat detail <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-gray-600">Total Media</p>
                <Image className="w-5 h-5 text-gray-400" />
              </div>
              <p className="text-3xl font-bold text-gray-900">{mediaStats.total}</p>
            </div>
            
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-green-700">USED</p>
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <p className="text-3xl font-bold text-green-900">{mediaStats.used}</p>
              <p className="text-sm text-green-600 mt-1">
                {mediaStats.total > 0 ? Math.round((mediaStats.used / mediaStats.total) * 100) : 0}%
              </p>
            </div>
            
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-orange-700">ORPHAN</p>
                <AlertTriangle className="w-5 h-5 text-orange-600" />
              </div>
              <p className="text-3xl font-bold text-orange-900">{mediaStats.orphan}</p>
              <p className="text-sm text-orange-600 mt-1">
                {mediaStats.total > 0 ? Math.round((mediaStats.orphan / mediaStats.total) * 100) : 0}%
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link
            href="/admin/seo/monitor"
            className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
          >
            <div className="flex items-center gap-3">
              <Search className="w-5 h-5 text-gray-600" />
              <div>
                <p className="font-medium text-gray-900">SEO Monitor</p>
                <p className="text-sm text-gray-600">Lihat detail status SEO konten</p>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-gray-400" />
          </Link>
          
          <Link
            href="/admin/media/monitor"
            className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
          >
            <div className="flex items-center gap-3">
              <Image className="w-5 h-5 text-gray-600" />
              <div>
                <p className="font-medium text-gray-900">Media Monitor</p>
                <p className="text-sm text-gray-600">Lihat detail status media</p>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-gray-400" />
          </Link>
        </div>
      </div>
    </div>
  );
}
