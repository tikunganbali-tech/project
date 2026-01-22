/**
 * PHASE 8A.6: Ads Intelligence Client Component (READ-ONLY)
 * 
 * Displays ads performance, creative versions, and strategy reports.
 * NO edit buttons, NO publish buttons, NO rewrite buttons.
 */

'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Eye, 
  MousePointerClick, 
  Target,
  DollarSign,
  FileText,
  AlertCircle
} from 'lucide-react';

interface Campaign {
  id: string;
  campaignName: string;
  platform: string;
  objective: string;
  status: string;
  brandId: string;
  localeId: string;
  createdAt: string;
  creativeCount: number;
  performanceCount: number;
  latestCreatives: Creative[];
}

interface Creative {
  id: string;
  version: number;
  headline: string;
  primaryText: string;
  ctaText: string;
  status: string;
  generatedAt: string;
}

interface Summary {
  totalCampaigns: number;
  totalCreatives: number;
  totalImpressions: number;
  totalClicks: number;
  avgCTR: number;
  totalConversions: number;
  totalSpend: number;
}

interface StrategyReport {
  id: string;
  brandId: string;
  localeId: string | null;
  periodStart: string;
  periodEnd: string;
  generatedAt: string;
  insights: any;
}

interface AdsIntelligenceData {
  campaigns: Campaign[];
  summary: Summary;
  strategyReports: StrategyReport[];
  readOnly: boolean;
  warning: string;
}

export default function AdsIntelligenceClient() {
  const { data: session } = useSession();
  const [data, setData] = useState<AdsIntelligenceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedBrand, setSelectedBrand] = useState<string>('');
  const [selectedLocale, setSelectedLocale] = useState<string>('');
  const [selectedPlatform, setSelectedPlatform] = useState<string>('');

  useEffect(() => {
    loadData();
  }, [selectedBrand, selectedLocale, selectedPlatform]);

  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (selectedBrand) params.set('brandId', selectedBrand);
      if (selectedLocale) params.set('localeId', selectedLocale);
      if (selectedPlatform) params.set('platform', selectedPlatform);
      params.set('period', '30'); // Last 30 days

      const response = await fetch(`/api/admin/ads-intelligence?${params}`);
      if (!response.ok) {
        throw new Error('Failed to load ads intelligence data');
      }

      const result = await response.json();
      setData(result);
    } catch (err: any) {
      setError(err.message || 'Failed to load ads intelligence data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white p-4 rounded-lg shadow animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-2/3 mb-2"></div>
              <div className="h-8 bg-gray-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center gap-2 text-red-800">
          <AlertCircle className="w-5 h-5" />
          <span className="font-semibold">Error</span>
        </div>
        <p className="text-red-600 mt-2">{error}</p>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const { summary, campaigns, strategyReports } = data;

  return (
    <div className="space-y-6">
      {/* PHASE 8A: Read-only warning */}
      {data.readOnly && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-yellow-800">
            <AlertCircle className="w-5 h-5" />
            <span className="font-semibold">Read-Only Dashboard</span>
          </div>
          <p className="text-yellow-700 mt-1 text-sm">{data.warning}</p>
        </div>
      )}

      {/* Summary KPIs */}
      <section>
        <h2 className="text-lg font-semibold text-gray-700 mb-4">Performance Summary</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center gap-2 text-gray-600 mb-2">
              <Eye className="w-4 h-4" />
              <span className="text-sm font-medium">Impressions</span>
            </div>
            <div className="text-2xl font-bold text-gray-800">
              {summary.totalImpressions.toLocaleString()}
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center gap-2 text-gray-600 mb-2">
              <MousePointerClick className="w-4 h-4" />
              <span className="text-sm font-medium">Clicks</span>
            </div>
            <div className="text-2xl font-bold text-gray-800">
              {summary.totalClicks.toLocaleString()}
            </div>
            <div className="text-sm text-gray-500 mt-1">
              CTR: {(summary.avgCTR * 100).toFixed(2)}%
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center gap-2 text-gray-600 mb-2">
              <Target className="w-4 h-4" />
              <span className="text-sm font-medium">Conversions</span>
            </div>
            <div className="text-2xl font-bold text-gray-800">
              {summary.totalConversions.toLocaleString()}
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center gap-2 text-gray-600 mb-2">
              <DollarSign className="w-4 h-4" />
              <span className="text-sm font-medium">Spend</span>
            </div>
            <div className="text-2xl font-bold text-gray-800">
              ${summary.totalSpend.toFixed(2)}
            </div>
          </div>
        </div>
      </section>

      {/* Campaigns */}
      <section>
        <h2 className="text-lg font-semibold text-gray-700 mb-4">
          Campaigns ({summary.totalCampaigns})
        </h2>
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Campaign</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Platform</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Objective</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Creatives</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {campaigns.map((campaign) => (
                  <tr key={campaign.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{campaign.campaignName}</div>
                      <div className="text-sm text-gray-500">
                        {new Date(campaign.createdAt).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {campaign.platform}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{campaign.objective}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        campaign.status === 'ACTIVE' ? 'bg-green-100 text-green-800' :
                        campaign.status === 'PAUSED' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {campaign.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {campaign.creativeCount} versions
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Strategy Reports */}
      {strategyReports.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-gray-700 mb-4">
            Strategy Reports ({strategyReports.length})
          </h2>
          <div className="space-y-4">
            {strategyReports.map((report) => (
              <div key={report.id} className="bg-white p-6 rounded-lg shadow">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-gray-800">Strategy Report</h3>
                    <p className="text-sm text-gray-500">
                      {new Date(report.periodStart).toLocaleDateString()} - {new Date(report.periodEnd).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-sm text-gray-500">
                    Generated: {new Date(report.generatedAt).toLocaleDateString()}
                  </div>
                </div>
                
                {report.insights && (
                  <div className="space-y-3">
                    {report.insights.whatWorks && report.insights.whatWorks.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-green-700 mb-2">What's Working</h4>
                        <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                          {report.insights.whatWorks.slice(0, 3).map((item: any, idx: number) => (
                            <li key={idx}>{item.name}: {item.reason}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {report.insights.recommendations && report.insights.recommendations.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-blue-700 mb-2">Recommendations</h4>
                        <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                          {report.insights.recommendations.slice(0, 3).map((rec: any, idx: number) => (
                            <li key={idx}>{rec.title}: {rec.description}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
