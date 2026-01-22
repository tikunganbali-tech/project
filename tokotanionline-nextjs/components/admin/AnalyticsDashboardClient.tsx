'use client';

import { useState, useEffect } from 'react';

function notify(message: string) {
  console.log('[Notification]:', message);
}

import {
  BarChart3,
  Globe,
  Smartphone,
  Monitor,
  Tablet,
  MapPin,
  TrendingUp,
  Users,
  Eye,
  Clock,
  MousePointerClick,
  Calendar,
  Filter,
  Download,
  RefreshCw,
  Brain,
  Zap,
  AlertCircle,
  CheckCircle,
  Play,
} from 'lucide-react';

interface AnalyticsData {
  stats: {
    totalVisits: number;
    uniqueVisitors: number;
    totalSessions: number;
    avgTimeOnPage: number;
    bounceRate: number;
  };
  locationBreakdown: {
    byCountry: Array<{ name: string; count: number }>;
    byCity: Array<{ name: string; count: number }>;
    byDistrict: Array<{ name: string; count: number }>;
  };
  deviceBreakdown: {
    byDeviceType: Array<{ name: string; count: number }>;
    byOS: Array<{ name: string; count: number }>;
    byBrowser: Array<{ name: string; count: number }>;
    byDeviceModel: Array<{ name: string; count: number }>;
  };
  sourceBreakdown: {
    byReferrer: Array<{ name: string; count: number }>;
    byUtmSource: Array<{ name: string; count: number }>;
    bySearchEngine: Array<{ name: string; count: number }>;
  };
  pageBreakdown: {
    byPageType: Array<{ name: string; count: number }>;
    topPages: Array<{ url: string; title?: string; count: number; avgTime: number }>;
  };
  timeSeries: Array<{ date: string; visits: number }>;
  period: {
    from: string;
    to: string;
  };
}

interface DataQualitySummary {
  totalVisits: number;
  trustedVisits: number;
  botVisits: number;
  unknownVisits: number;
  avgConfidenceScore: number;
  anomalyCount: number;
  dataTrustStatus: 'TRUSTED' | 'DEGRADED' | 'INVALID';
}

export default function AnalyticsDashboardClient() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [insights, setInsights] = useState<any[]>([]);
  const [processingInsights, setProcessingInsights] = useState(false);
  const [realtimeMetrics, setRealtimeMetrics] = useState<any>(null);
  const [dataQuality, setDataQuality] = useState<DataQualitySummary | null>(null);
  const [truthScoreData, setTruthScoreData] = useState<any>(null);
  const [intentSegmentationData, setIntentSegmentationData] = useState<any>(null);
  const [contentImprovements, setContentImprovements] = useState<any>(null);
  
  // Filters
  const [period, setPeriod] = useState('7d');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [country, setCountry] = useState('');
  const [city, setCity] = useState('');
  const [district, setDistrict] = useState('');
  const [deviceType, setDeviceType] = useState('');
  const [os, setOS] = useState('');
  const [browser, setBrowser] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        period: period === 'custom' ? 'custom' : period,
        ...(period === 'custom' && startDate && { startDate }),
        ...(period === 'custom' && endDate && { endDate }),
        ...(country && { country }),
        ...(city && { city }),
        ...(district && { district }),
        ...(deviceType && { deviceType }),
        ...(os && { os }),
        ...(browser && { browser }),
      });

      const response = await fetch(`/api/admin/analytics/query?${params}`);
      const result = await response.json();
      
      if (response.ok) {
        // Ensure result has all required fields
        const safeData: AnalyticsData = {
          stats: result.stats || {
            totalVisits: 0,
            uniqueVisitors: 0,
            totalSessions: 0,
            avgTimeOnPage: 0,
            bounceRate: 0,
          },
          locationBreakdown: result.locationBreakdown || {
            byCountry: [],
            byCity: [],
            byDistrict: [],
          },
          deviceBreakdown: result.deviceBreakdown || {
            byDeviceType: [],
            byOS: [],
            byBrowser: [],
            byDeviceModel: [],
          },
          sourceBreakdown: result.sourceBreakdown || {
            byReferrer: [],
            byUtmSource: [],
            bySearchEngine: [],
          },
          pageBreakdown: result.pageBreakdown || {
            byPageType: [],
            topPages: [],
          },
          timeSeries: result.timeSeries || [],
          period: result.period || {
            from: new Date().toISOString(),
            to: new Date().toISOString(),
          },
        };
        
        setData(safeData);
        
        // Show message if tables don't exist
        if (result.message) {
          console.warn(result.message);
        }
      } else {
        // Try to parse error, but don't fail if it's not JSON
        let errorData;
        try {
          errorData = await response.json();
        } catch {
          errorData = { error: `HTTP ${response.status}: ${response.statusText}` };
        }
        console.error('Error fetching analytics:', errorData);
        
        // Show user-friendly error
        if (errorData.message) {
          notify(`⚠️ ${errorData.message}`);
        } else {
          notify(`❌ Error loading analytics data`);
        }
        
        // Set empty data structure
        setData({
          stats: {
            totalVisits: 0,
            uniqueVisitors: 0,
            totalSessions: 0,
            avgTimeOnPage: 0,
            bounceRate: 0,
          },
          locationBreakdown: { byCountry: [], byCity: [], byDistrict: [] },
          deviceBreakdown: { byDeviceType: [], byOS: [], byBrowser: [], byDeviceModel: [] },
          sourceBreakdown: { byReferrer: [], byUtmSource: [], bySearchEngine: [] },
          pageBreakdown: { byPageType: [], topPages: [] },
          timeSeries: [],
          period: { from: new Date().toISOString(), to: new Date().toISOString() },
        });
      }
    } catch (error: any) {
      console.error('Error fetching analytics:', error);
      
      // Show user-friendly error
      const errorMessage = error?.message || error?.toString() || 'Unknown error';
      notify(`❌ Error: ${errorMessage}`);
      
      // Set empty data structure on error
      setData({
        stats: {
          totalVisits: 0,
          uniqueVisitors: 0,
          totalSessions: 0,
          avgTimeOnPage: 0,
          bounceRate: 0,
        },
        locationBreakdown: { byCountry: [], byCity: [], byDistrict: [] },
        deviceBreakdown: { byDeviceType: [], byOS: [], byBrowser: [], byDeviceModel: [] },
        sourceBreakdown: { byReferrer: [], byUtmSource: [], bySearchEngine: [] },
        pageBreakdown: { byPageType: [], topPages: [] },
        timeSeries: [],
        period: { from: new Date().toISOString(), to: new Date().toISOString() },
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchInsights = async () => {
    try {
      const response = await fetch('/api/admin/analytics/insights?type=insights&days=7');
      if (response.ok) {
        const result = await response.json();
        setInsights(result.insights || []);
      } else {
        // If insights fail, just set empty array - don't block dashboard
        console.warn('Insights API failed, continuing without insights');
        setInsights([]);
      }
    } catch (error) {
      console.error('Error fetching insights:', error);
      setInsights([]); // Set empty array on error
    }
  };

  const fetchRealtimeMetrics = async () => {
    try {
      const response = await fetch('/api/admin/analytics/realtime');
      if (response.ok) {
        const result = await response.json();
        setRealtimeMetrics(result);
      } else {
        // Silent fail - realtime metrics are optional
        setRealtimeMetrics(null);
      }
    } catch (error) {
      // Silent fail - realtime metrics are optional
      console.warn('Realtime metrics not available');
      setRealtimeMetrics(null);
    }
  };

  const fetchDataQuality = async () => {
    try {
      const params = new URLSearchParams({
        period: period === 'custom' ? 'custom' : period,
      });
      const response = await fetch(`/api/admin/analytics/data-quality?${params}`);
      if (response.ok) {
        const result = await response.json();
        setDataQuality(result);
      } else {
        // Silent fail
        setDataQuality(null);
      }
    } catch (error) {
      // Silent fail
      console.warn('Data quality metrics not available');
      setDataQuality(null);
    }
  };

  const fetchTruthScoreData = async () => {
    try {
      const params = new URLSearchParams();
      if (period === 'custom' && startDate && endDate) {
        params.append('startDate', startDate);
        params.append('endDate', endDate);
      } else {
        // Calculate date range based on period
        const end = new Date();
        const start = new Date();
        if (period === '1d') {
          start.setDate(start.getDate() - 1);
        } else if (period === '7d') {
          start.setDate(start.getDate() - 7);
        } else if (period === '30d') {
          start.setDate(start.getDate() - 30);
        } else if (period === '90d') {
          start.setDate(start.getDate() - 90);
        }
        params.append('startDate', start.toISOString());
        params.append('endDate', end.toISOString());
      }

      const response = await fetch(`/api/admin/analytics/truth-score?${params}`);
      if (response.ok) {
        const result = await response.json();
        setTruthScoreData(result);
      } else {
        // Silent fail
        setTruthScoreData(null);
      }
    } catch (error) {
      // Silent fail
      console.warn('Truth score data not available');
      setTruthScoreData(null);
    }
  };

  const fetchIntentSegmentationData = async () => {
    try {
      const params = new URLSearchParams();
      if (period === 'custom' && startDate && endDate) {
        params.append('startDate', startDate);
        params.append('endDate', endDate);
      } else {
        // Calculate date range based on period
        const end = new Date();
        const start = new Date();
        if (period === '1d') {
          start.setDate(start.getDate() - 1);
        } else if (period === '7d') {
          start.setDate(start.getDate() - 7);
        } else if (period === '30d') {
          start.setDate(start.getDate() - 30);
        } else if (period === '90d') {
          start.setDate(start.getDate() - 90);
        }
        params.append('startDate', start.toISOString());
        params.append('endDate', end.toISOString());
      }

      const response = await fetch(`/api/admin/analytics/intent-segmentation?${params}`);
      if (response.ok) {
        const result = await response.json();
        setIntentSegmentationData(result);
      } else {
        // Silent fail
        setIntentSegmentationData(null);
      }
    } catch (error) {
      // Silent fail
      console.warn('Intent segmentation data not available');
      setIntentSegmentationData(null);
    }
  };

  const fetchContentImprovements = async () => {
    try {
      const response = await fetch('/api/admin/content/improvements');
      if (response.ok) {
        const result = await response.json();
        setContentImprovements(result);
      } else {
        // Silent fail
        setContentImprovements(null);
      }
    } catch (error) {
      // Silent fail
      console.warn('Content improvements data not available');
      setContentImprovements(null);
    }
  };

  const processInsights = async () => {
    setProcessingInsights(true);
    try {
      const response = await fetch('/api/admin/analytics/insights', {
        method: 'POST',
      });
      if (response.ok) {
        const result = await response.json();
        const message = `✅ Processed ${result.processed} insights, executed ${result.actions.filter((a: any) => a.success).length} SEO engine actions`;
        notify(message);
        setTimeout(() => {
          fetchInsights();
          fetchData();
        }, 2000);
      } else {
        const errorData = await response.json().catch(() => ({}));
        notify(`❌ Error: ${errorData.error || 'Failed to process insights'}`);
      }
    } catch (error: any) {
      console.error('Error processing insights:', error);
      notify('❌ Error processing insights');
    } finally {
      setProcessingInsights(false);
    }
  };

  useEffect(() => {
    fetchData();
    fetchInsights();
    fetchRealtimeMetrics();
    fetchDataQuality();
    fetchTruthScoreData();
    fetchIntentSegmentationData();
    fetchContentImprovements();
  }, [period, startDate, endDate, country, city, district, deviceType, os, browser]);

  // Auto-refresh real-time metrics every 60 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchRealtimeMetrics();
    }, 60000); // 60 seconds

    return () => clearInterval(interval);
  }, []);

  if (loading && !data) {
    return (
      <div className="p-6 flex items-center justify-center min-h-screen">
        <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600 font-semibold mb-2">Failed to load analytics data</p>
          <p className="text-sm text-red-700">
            Please check if analytics tables exist. Run: <code className="bg-red-100 px-2 py-1 rounded">npx prisma migrate dev</code>
          </p>
        </div>
      </div>
    );
  }

  // Check if data is empty (tables might not exist)
  const hasNoData = data.stats.totalVisits === 0 && data.timeSeries.length === 0;
  const dataAny = data as any; // Type assertion for optional message field
  const hasTablesError = dataAny?.message?.includes('tables not found') || dataAny?.message?.includes('Analytics tables');
  const isTableMissing = hasTablesError;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <BarChart3 className="w-8 h-8 text-blue-500" />
            Analytics Dashboard
          </h1>
          <p className="text-gray-600 mt-1">Detailed visitor analytics & insights</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchData}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={() => {
              if (!data) {
                alert('No data to export');
                return;
              }
              
              // Prepare export data
              const exportData = {
                exportDate: new Date().toISOString(),
                period: data.period,
                stats: data.stats,
                locationBreakdown: data.locationBreakdown,
                deviceBreakdown: data.deviceBreakdown,
                sourceBreakdown: data.sourceBreakdown,
                pageBreakdown: data.pageBreakdown,
                timeSeries: data.timeSeries,
              };
              
              // Create CSV content
              let csvContent = 'Analytics Export\n';
              csvContent += `Period: ${data.period.from} to ${data.period.to}\n\n`;
              
              // Stats section
              csvContent += 'Statistics\n';
              csvContent += `Total Visits,${data.stats.totalVisits}\n`;
              csvContent += `Unique Visitors,${data.stats.uniqueVisitors}\n`;
              csvContent += `Total Sessions,${data.stats.totalSessions}\n`;
              csvContent += `Avg Time on Page,${data.stats.avgTimeOnPage.toFixed(2)}s\n`;
              csvContent += `Bounce Rate,${data.stats.bounceRate.toFixed(2)}%\n\n`;
              
              // Location breakdown
              csvContent += 'Location Breakdown - By Country\n';
              csvContent += 'Country,Visits\n';
              data.locationBreakdown.byCountry.forEach(item => {
                csvContent += `${item.name},${item.count}\n`;
              });
              csvContent += '\n';
              
              csvContent += 'Location Breakdown - By City\n';
              csvContent += 'City,Visits\n';
              data.locationBreakdown.byCity.forEach(item => {
                csvContent += `${item.name},${item.count}\n`;
              });
              csvContent += '\n';
              
              // Device breakdown
              csvContent += 'Device Breakdown - By Device Type\n';
              csvContent += 'Device Type,Count\n';
              data.deviceBreakdown.byDeviceType.forEach(item => {
                csvContent += `${item.name},${item.count}\n`;
              });
              csvContent += '\n';
              
              // Top pages
              csvContent += 'Top Pages\n';
              csvContent += 'URL,Title,Visits,Avg Time (s)\n';
              data.pageBreakdown.topPages.forEach(page => {
                csvContent += `${page.url},${page.title || 'N/A'},${page.count},${page.avgTime.toFixed(2)}\n`;
              });
              
              // Download CSV
              const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `analytics-export-${new Date().toISOString().split('T')[0]}.csv`;
              a.click();
              URL.revokeObjectURL(url);
              
              // Also download JSON for detailed data
              const jsonBlob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
              const jsonUrl = URL.createObjectURL(jsonBlob);
              const jsonA = document.createElement('a');
              jsonA.href = jsonUrl;
              jsonA.download = `analytics-export-${new Date().toISOString().split('T')[0]}.json`;
              jsonA.click();
              URL.revokeObjectURL(jsonUrl);
            }}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Export
          </button>
        </div>
      </div>

      {/* Migration Warning - Only show if tables are actually missing */}
      {isTableMissing && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
            <div>
              <p className="font-semibold text-yellow-800 mb-1">Analytics Tables Not Found</p>
              <p className="text-sm text-yellow-700 mb-2">
                The analytics database tables have not been created yet. Please run the migration to enable analytics tracking.
              </p>
              <code className="block bg-yellow-100 px-3 py-2 rounded text-sm text-yellow-900 mt-2">
                npx prisma db push
              </code>
              <p className="text-xs text-yellow-600 mt-2">
                After migration, the PageViewTracker will automatically start tracking visits and data will appear here.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Data Quality & Trust Status */}
      {dataQuality && (
        <div className={`rounded-lg shadow p-4 border-2 ${
          dataQuality.dataTrustStatus === 'TRUSTED' 
            ? 'bg-green-50 border-green-200' 
            : dataQuality.dataTrustStatus === 'DEGRADED'
            ? 'bg-yellow-50 border-yellow-200'
            : 'bg-red-50 border-red-200'
        }`}>
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3 flex-1">
              {dataQuality.dataTrustStatus === 'TRUSTED' ? (
                <CheckCircle className="h-6 w-6 text-green-600 mt-0.5" />
              ) : dataQuality.dataTrustStatus === 'DEGRADED' ? (
                <AlertCircle className="h-6 w-6 text-yellow-600 mt-0.5" />
              ) : (
                <AlertCircle className="h-6 w-6 text-red-600 mt-0.5" />
              )}
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-semibold text-lg">
                    Data Trust Status: 
                    <span className={`ml-2 ${
                      dataQuality.dataTrustStatus === 'TRUSTED' 
                        ? 'text-green-700' 
                        : dataQuality.dataTrustStatus === 'DEGRADED'
                        ? 'text-yellow-700'
                        : 'text-red-700'
                    }`}>
                      {dataQuality.dataTrustStatus === 'TRUSTED' ? '✅ TRUSTED' : 
                       dataQuality.dataTrustStatus === 'DEGRADED' ? '⚠️ DEGRADED' : 
                       '❌ INVALID'}
                    </span>
                  </h3>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3">
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Total Visits</p>
                    <p className="text-lg font-bold text-gray-900">{dataQuality.totalVisits.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Trusted Visits</p>
                    <p className="text-lg font-bold text-green-700">
                      {dataQuality.trustedVisits.toLocaleString()} 
                      <span className="text-xs text-gray-500 ml-1">
                        ({dataQuality.totalVisits > 0 ? Math.round((dataQuality.trustedVisits / dataQuality.totalVisits) * 100) : 0}%)
                      </span>
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Bot Visits</p>
                    <p className="text-lg font-bold text-red-700">
                      {dataQuality.botVisits.toLocaleString()}
                      <span className="text-xs text-gray-500 ml-1">
                        ({dataQuality.totalVisits > 0 ? Math.round((dataQuality.botVisits / dataQuality.totalVisits) * 100) : 0}%)
                      </span>
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Avg Confidence</p>
                    <p className="text-lg font-bold text-gray-900">
                      {dataQuality.avgConfidenceScore.toFixed(1)}%
                    </p>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-gray-600">
                      Unknown/Invalid: <span className="font-semibold text-gray-900">{dataQuality.unknownVisits}</span>
                    </span>
                    <span className="text-gray-600">
                      Anomalies: <span className="font-semibold text-gray-900">{dataQuality.anomalyCount}</span>
                    </span>
                  </div>
                  {dataQuality.dataTrustStatus !== 'TRUSTED' && (
                    <p className="text-xs mt-2 text-gray-600">
                      {dataQuality.dataTrustStatus === 'DEGRADED' 
                        ? '⚠️ Data quality is degraded. Some engines may exclude low-confidence data.'
                        : '❌ Data quality is invalid. AI engines will NOT consume this data.'}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* No Data Warning - Show when tables exist but no data yet */}
      {hasNoData && !isTableMissing && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <p className="font-semibold text-blue-800 mb-1">No Analytics Data Yet</p>
              <p className="text-sm text-blue-700 mb-2">
                Analytics tables are ready, but no visitor data has been tracked yet. Data will appear here once visitors start browsing your website.
              </p>
              <p className="text-xs text-blue-600 mt-2">
                Make sure your website has the PageViewTracker component enabled to start collecting analytics data.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="h-5 w-5 text-gray-500" />
          <h2 className="font-semibold">Filters</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Date Period */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Period
            </label>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="1d">Today</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>

          {period === 'custom' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </>
          )}

          {/* Location Filters */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Country
            </label>
            <input
              type="text"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              placeholder="Filter by country"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              City
            </label>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Filter by city"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              District (Kecamatan)
            </label>
            <input
              type="text"
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
              placeholder="Filter by district"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Device Filters */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Device Type
            </label>
            <select
              value={deviceType}
              onChange={(e) => setDeviceType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Devices</option>
              <option value="desktop">Desktop</option>
              <option value="mobile">Mobile</option>
              <option value="tablet">Tablet</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              OS
            </label>
            <input
              type="text"
              value={os}
              onChange={(e) => setOS(e.target.value)}
              placeholder="Filter by OS"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Browser
            </label>
            <input
              type="text"
              value={browser}
              onChange={(e) => setBrowser(e.target.value)}
              placeholder="Filter by browser"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Clear Filters */}
        {(country || city || district || deviceType || os || browser) && (
          <button
            onClick={() => {
              setCountry('');
              setCity('');
              setDistrict('');
              setDeviceType('');
              setOS('');
              setBrowser('');
            }}
            className="mt-4 text-sm text-blue-600 hover:text-blue-800"
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Visits</p>
              <p className="text-2xl font-bold text-gray-900">{data.stats.totalVisits.toLocaleString()}</p>
            </div>
            <Eye className="w-8 h-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Unique Visitors</p>
              <p className="text-2xl font-bold text-gray-900">{data.stats.uniqueVisitors.toLocaleString()}</p>
            </div>
            <Users className="w-8 h-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Sessions</p>
              <p className="text-2xl font-bold text-gray-900">{data.stats.totalSessions.toLocaleString()}</p>
            </div>
            <MousePointerClick className="w-8 h-8 text-purple-500" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Avg. Time</p>
              <p className="text-2xl font-bold text-gray-900">
                {Math.floor(data.stats.avgTimeOnPage)}s
              </p>
            </div>
            <Clock className="w-8 h-8 text-yellow-500" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Bounce Rate</p>
              <p className="text-2xl font-bold text-gray-900">
                {data.stats.bounceRate.toFixed(1)}%
              </p>
            </div>
            <TrendingUp className="w-8 h-8 text-red-500" />
          </div>
        </div>
      </div>

      {/* Time Series Chart */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <TrendingUp className="w-6 h-6 text-blue-500" />
          Traffic Over Time
        </h2>
        <div className="h-64 flex items-end justify-between gap-2">
          {data.timeSeries.map((item, idx) => {
            const maxVisits = Math.max(...data.timeSeries.map(t => t.visits));
            const height = maxVisits > 0 ? (item.visits / maxVisits) * 100 : 0;
            
            return (
              <div key={idx} className="flex-1 flex flex-col items-center">
                <div
                  className="w-full bg-blue-500 rounded-t hover:bg-blue-600 transition"
                  style={{ height: `${height}%` }}
                  title={`${item.date}: ${item.visits} visits`}
                />
                <span className="text-xs text-gray-500 mt-2 transform -rotate-45 origin-top-left whitespace-nowrap">
                  {new Date(item.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Location Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Globe className="w-5 h-5 text-blue-500" />
            Top Countries
          </h2>
          <div className="space-y-2">
            {data.locationBreakdown.byCountry.slice(0, 10).map((item, idx) => (
              <div key={idx} className="flex items-center justify-between">
                <span className="text-sm text-gray-700">{item.name || 'Unknown'}</span>
                <span className="font-semibold">{item.count.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-green-500" />
            Top Cities
          </h2>
          <div className="space-y-2">
            {data.locationBreakdown.byCity.slice(0, 10).map((item, idx) => (
              <div key={idx} className="flex items-center justify-between">
                <span className="text-sm text-gray-700">{item.name || 'Unknown'}</span>
                <span className="font-semibold">{item.count.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-purple-500" />
            Top Districts
          </h2>
          <div className="space-y-2">
            {data.locationBreakdown.byDistrict.slice(0, 10).map((item, idx) => (
              <div key={idx} className="flex items-center justify-between">
                <span className="text-sm text-gray-700">{item.name || 'Unknown'}</span>
                <span className="font-semibold">{item.count.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Device Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-blue-500" />
            Device Type
          </h2>
          <div className="space-y-3">
            {data.deviceBreakdown.byDeviceType.map((item, idx) => {
              const total = data.deviceBreakdown.byDeviceType.reduce((sum, i) => sum + i.count, 0);
              const percentage = total > 0 ? (item.count / total) * 100 : 0;
              const icon = item.name === 'desktop' ? Monitor : item.name === 'tablet' ? Tablet : Smartphone;
              const Icon = icon;
              
              return (
                <div key={idx}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <Icon className="w-4 h-4 text-gray-500" />
                      <span className="text-sm font-medium capitalize">{item.name || 'Unknown'}</span>
                    </div>
                    <span className="text-sm font-semibold">{item.count.toLocaleString()}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-500">{percentage.toFixed(1)}%</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-bold mb-4">Top OS</h2>
          <div className="space-y-2">
            {data.deviceBreakdown.byOS.slice(0, 8).map((item, idx) => (
              <div key={idx} className="flex items-center justify-between">
                <span className="text-sm text-gray-700">{item.name || 'Unknown'}</span>
                <span className="font-semibold">{item.count.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-bold mb-4">Top Browsers</h2>
          <div className="space-y-2">
            {data.deviceBreakdown.byBrowser.slice(0, 8).map((item, idx) => (
              <div key={idx} className="flex items-center justify-between">
                <span className="text-sm text-gray-700">{item.name || 'Unknown'}</span>
                <span className="font-semibold">{item.count.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-bold mb-4">Top Devices</h2>
          <div className="space-y-2">
            {data.deviceBreakdown.byDeviceModel.slice(0, 8).map((item, idx) => (
              <div key={idx} className="flex items-center justify-between">
                <span className="text-sm text-gray-700">{item.name || 'Unknown'}</span>
                <span className="font-semibold">{item.count.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* SEO Insights & Recommendations */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Brain className="w-6 h-6 text-purple-500" />
            SEO Insights & Recommendations
          </h2>
          <button
            onClick={processInsights}
            disabled={processingInsights}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 flex items-center gap-2"
          >
            {processingInsights ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Zap className="h-4 w-4" />
                Apply Insights
              </>
            )}
          </button>
        </div>
        
        {insights.length > 0 ? (
          <div className="space-y-3">
            {insights.slice(0, 10).map((insight, idx) => (
              <div
                key={idx}
                className={`p-4 rounded-lg border-l-4 ${
                  insight.priority === 'high'
                    ? 'border-red-500 bg-red-50'
                    : insight.priority === 'medium'
                    ? 'border-yellow-500 bg-yellow-50'
                    : 'border-blue-500 bg-blue-50'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {insight.priority === 'high' ? (
                        <AlertCircle className="h-5 w-5 text-red-500" />
                      ) : (
                        <CheckCircle className="h-5 w-5 text-blue-500" />
                      )}
                      <span className="font-semibold text-gray-900 capitalize">
                        {insight.type} - {insight.priority} Priority
                      </span>
                      <span className="text-xs text-gray-500">
                        ({insight.dataPoints} data points, {insight.confidence}% confidence)
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 mb-2">{insight.insight}</p>
                    <p className="text-sm text-gray-600">
                      <strong>Recommendation:</strong> {insight.recommendation}
                    </p>
                    <div className="mt-2 text-xs text-gray-500">
                      Action: {insight.actionType}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {insights.length > 10 && (
              <p className="text-sm text-gray-500 text-center">
                +{insights.length - 10} more insights available
              </p>
            )}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <Brain className="h-12 w-12 mx-auto mb-2 text-gray-400" />
            <p>No insights available yet. Analytics data will generate insights automatically.</p>
          </div>
        )}
      </div>

      {/* Truth Score Analytics */}
      {truthScoreData && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-2 mb-4">
              <Zap className="w-6 h-6 text-yellow-500" />
              <h2 className="text-xl font-bold">Truth Score Analytics</h2>
              <span className="text-sm text-gray-500">Real Buyer Intent Measurement</span>
            </div>

            {/* Overall Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-blue-50 rounded-lg p-4">
                <p className="text-sm text-gray-600 mb-1">Average Truth Score</p>
                <p className="text-2xl font-bold text-blue-700">
                  {truthScoreData.overallStats.avgTruthScore.toFixed(1)}
                </p>
                <p className="text-xs text-gray-500 mt-1">out of 100</p>
              </div>
              <div className="bg-green-50 rounded-lg p-4">
                <p className="text-sm text-gray-600 mb-1">Total Visits Tracked</p>
                <p className="text-2xl font-bold text-green-700">
                  {truthScoreData.overallStats.totalVisits.toLocaleString()}
                </p>
              </div>
              <div className="bg-yellow-50 rounded-lg p-4">
                <p className="text-sm text-gray-600 mb-1">Min Truth Score</p>
                <p className="text-2xl font-bold text-yellow-700">
                  {truthScoreData.overallStats.minTruthScore}
                </p>
              </div>
              <div className="bg-purple-50 rounded-lg p-4">
                <p className="text-sm text-gray-600 mb-1">Max Truth Score</p>
                <p className="text-2xl font-bold text-purple-700">
                  {truthScoreData.overallStats.maxTruthScore}
                </p>
              </div>
            </div>

            {/* Buyer Intent Pages */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                Buyer-Intent Pages (Truth Score ≥ 70)
              </h3>
              {truthScoreData.buyerIntentPages.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">Page</th>
                        <th className="text-right p-2">Avg Truth Score</th>
                        <th className="text-right p-2">Visits</th>
                      </tr>
                    </thead>
                    <tbody>
                      {truthScoreData.buyerIntentPages.slice(0, 10).map((page: any, idx: number) => (
                        <tr key={idx} className="border-b hover:bg-green-50">
                          <td className="p-2">
                            <div>
                              <p className="font-medium">{page.pageTitle || page.pagePath}</p>
                              <p className="text-xs text-gray-500">{page.pagePath}</p>
                            </div>
                          </td>
                          <td className="p-2 text-right">
                            <span className="font-bold text-green-700">
                              {page.avgTruthScore.toFixed(1)}
                            </span>
                          </td>
                          <td className="p-2 text-right text-gray-600">
                            {page.visitCount.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">No buyer-intent pages yet</p>
              )}
            </div>

            {/* Non-Performing Pages */}
            <div>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-500" />
                Non-Performing Pages (Truth Score = 0 or ≤ 15)
              </h3>
              {truthScoreData.nonPerformingPages.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">Page</th>
                        <th className="text-right p-2">Avg Truth Score</th>
                        <th className="text-right p-2">Visits</th>
                      </tr>
                    </thead>
                    <tbody>
                      {truthScoreData.nonPerformingPages.slice(0, 10).map((page: any, idx: number) => (
                        <tr key={idx} className="border-b hover:bg-red-50">
                          <td className="p-2">
                            <div>
                              <p className="font-medium">{page.pageTitle || page.pagePath}</p>
                              <p className="text-xs text-gray-500">{page.pagePath}</p>
                            </div>
                          </td>
                          <td className="p-2 text-right">
                            <span className="font-bold text-red-700">
                              {page.avgTruthScore.toFixed(1)}
                            </span>
                          </td>
                          <td className="p-2 text-right text-gray-600">
                            {page.visitCount.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">No non-performing pages</p>
              )}
            </div>

            {/* Average Truth Score by Page */}
            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-3">Average Truth Score by Page</h3>
              {truthScoreData.avgTruthScoreByPage.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">Page</th>
                        <th className="text-right p-2">Avg Truth Score</th>
                        <th className="text-right p-2">Visits</th>
                      </tr>
                    </thead>
                    <tbody>
                      {truthScoreData.avgTruthScoreByPage.slice(0, 20).map((page: any, idx: number) => (
                        <tr key={idx} className="border-b hover:bg-gray-50">
                          <td className="p-2">
                            <div>
                              <p className="font-medium">{page.pageTitle || page.pagePath}</p>
                              <p className="text-xs text-gray-500">{page.pagePath}</p>
                            </div>
                          </td>
                          <td className="p-2 text-right">
                            <span className={`font-bold ${
                              page.avgTruthScore >= 70 ? 'text-green-700' :
                              page.avgTruthScore >= 40 ? 'text-yellow-700' :
                              'text-red-700'
                            }`}>
                              {page.avgTruthScore.toFixed(1)}
                            </span>
                          </td>
                          <td className="p-2 text-right text-gray-600">
                            {page.visitCount.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">No truth score data available</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Intent Segmentation Analytics */}
      {intentSegmentationData && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-6 h-6 text-purple-500" />
              <h2 className="text-xl font-bold">Intent Segmentation</h2>
              <span className="text-sm text-gray-500">Based on Truth Score + Behavior</span>
            </div>

            {/* Overall Stats */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-3">Overall Intent Distribution</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-green-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-1">Buyer Intent</p>
                  <p className="text-2xl font-bold text-green-700">
                    {intentSegmentationData.overallStats.BUYER_INTENT.toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {intentSegmentationData.overallStats.percentages.BUYER_INTENT.toFixed(1)}%
                  </p>
                </div>
                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-1">Research Intent</p>
                  <p className="text-2xl font-bold text-blue-700">
                    {intentSegmentationData.overallStats.RESEARCH_INTENT.toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {intentSegmentationData.overallStats.percentages.RESEARCH_INTENT.toFixed(1)}%
                  </p>
                </div>
                <div className="bg-yellow-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-1">Info Only</p>
                  <p className="text-2xl font-bold text-yellow-700">
                    {intentSegmentationData.overallStats.INFO_ONLY.toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {intentSegmentationData.overallStats.percentages.INFO_ONLY.toFixed(1)}%
                  </p>
                </div>
                <div className="bg-red-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-1">Noise</p>
                  <p className="text-2xl font-bold text-red-700">
                    {intentSegmentationData.overallStats.NOISE.toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {intentSegmentationData.overallStats.percentages.NOISE.toFixed(1)}%
                  </p>
                </div>
              </div>
            </div>

            {/* Buyer Intent Pages (SEO Priority) */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                Buyer Intent Pages (SEO Priority - Truth Score ≥ 60 + Product/CTA Click)
              </h3>
              {intentSegmentationData.buyerIntentPages.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">Page</th>
                        <th className="text-right p-2">Buyer Intent %</th>
                        <th className="text-right p-2">Research %</th>
                        <th className="text-right p-2">Info %</th>
                        <th className="text-right p-2">Noise %</th>
                        <th className="text-right p-2">Total Visits</th>
                      </tr>
                    </thead>
                    <tbody>
                      {intentSegmentationData.buyerIntentPages.slice(0, 20).map((page: any, idx: number) => (
                        <tr key={idx} className="border-b hover:bg-green-50">
                          <td className="p-2">
                            <div>
                              <p className="font-medium">{page.pageTitle || page.pagePath}</p>
                              <p className="text-xs text-gray-500">{page.pagePath}</p>
                            </div>
                          </td>
                          <td className="p-2 text-right">
                            <span className="font-bold text-green-700">
                              {page.percentages.BUYER_INTENT.toFixed(1)}%
                            </span>
                          </td>
                          <td className="p-2 text-right text-blue-600">
                            {page.percentages.RESEARCH_INTENT.toFixed(1)}%
                          </td>
                          <td className="p-2 text-right text-yellow-600">
                            {page.percentages.INFO_ONLY.toFixed(1)}%
                          </td>
                          <td className="p-2 text-right text-red-600">
                            {page.percentages.NOISE.toFixed(1)}%
                          </td>
                          <td className="p-2 text-right text-gray-600">
                            {page.total.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">No buyer-intent pages yet</p>
              )}
            </div>

            {/* Intent Distribution by Page */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Intent Distribution by Page</h3>
              {intentSegmentationData.pageIntentDistribution.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">Page</th>
                        <th className="text-right p-2">Buyer %</th>
                        <th className="text-right p-2">Research %</th>
                        <th className="text-right p-2">Info %</th>
                        <th className="text-right p-2">Noise %</th>
                        <th className="text-right p-2">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {intentSegmentationData.pageIntentDistribution.slice(0, 30).map((page: any, idx: number) => (
                        <tr key={idx} className="border-b hover:bg-gray-50">
                          <td className="p-2">
                            <div>
                              <p className="font-medium">{page.pageTitle || page.pagePath}</p>
                              <p className="text-xs text-gray-500">{page.pagePath}</p>
                            </div>
                          </td>
                          <td className="p-2 text-right">
                            <span className={`font-semibold ${
                              page.percentages.BUYER_INTENT >= 50 ? 'text-green-700' : 
                              page.percentages.BUYER_INTENT >= 20 ? 'text-green-600' : 'text-gray-600'
                            }`}>
                              {page.percentages.BUYER_INTENT.toFixed(1)}%
                            </span>
                          </td>
                          <td className="p-2 text-right text-blue-600">
                            {page.percentages.RESEARCH_INTENT.toFixed(1)}%
                          </td>
                          <td className="p-2 text-right text-yellow-600">
                            {page.percentages.INFO_ONLY.toFixed(1)}%
                          </td>
                          <td className="p-2 text-right text-red-600">
                            {page.percentages.NOISE.toFixed(1)}%
                          </td>
                          <td className="p-2 text-right text-gray-600">
                            {page.total.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">No intent segmentation data available</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Content Improvements */}
      {contentImprovements && contentImprovements.pages && contentImprovements.pages.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="w-6 h-6 text-purple-500" />
            <h2 className="text-xl font-bold">Content Improvements (Intent-Based)</h2>
            <span className="text-sm text-gray-500">Auto-improve based on buyer intent</span>
          </div>

          <div className="mb-4 p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>SEO Priority Rule:</strong> Only BUYER_INTENT pages are improved. 
              Pages with high buyer intent percentage will be automatically improved to strengthen conversion.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Page</th>
                  <th className="text-right p-2">Buyer Intent %</th>
                  <th className="text-right p-2">Research %</th>
                  <th className="text-right p-2">Total Visits</th>
                  <th className="text-center p-2">Improvement Status</th>
                  <th className="text-center p-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {contentImprovements.pages.slice(0, 30).map((page: any, idx: number) => (
                  <tr key={idx} className="border-b hover:bg-gray-50">
                    <td className="p-2">
                      <div>
                        <p className="font-medium">{page.pageTitle || page.pagePath}</p>
                        <p className="text-xs text-gray-500">{page.pagePath}</p>
                      </div>
                    </td>
                    <td className="p-2 text-right">
                      <span className={`font-semibold ${
                        page.intentDistribution.BUYER_INTENT >= 50 ? 'text-green-700' : 
                        page.intentDistribution.BUYER_INTENT >= 20 ? 'text-green-600' : 'text-gray-600'
                      }`}>
                        {page.intentDistribution.BUYER_INTENT.toFixed(1)}%
                      </span>
                    </td>
                    <td className="p-2 text-right text-blue-600">
                      {page.intentDistribution.RESEARCH_INTENT.toFixed(1)}%
                    </td>
                    <td className="p-2 text-right text-gray-600">
                      {page.totalVisits.toLocaleString()}
                    </td>
                    <td className="p-2 text-center">
                      {page.hasImprovement ? (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Improved
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          <AlertCircle className="w-3 h-3 mr-1" />
                          Pending
                        </span>
                      )}
                    </td>
                    <td className="p-2 text-center">
                      {!page.hasImprovement && page.intentDistribution.BUYER_INTENT >= 20 && (
                        <button
                          onClick={async () => {
                            try {
                              const response = await fetch('/api/admin/content/improve-by-intent', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  entityType: page.pageType,
                                  entityId: page.pageId,
                                }),
                              });
                              if (response.ok) {
                                notify('✅ Content improvement initiated');
                                setTimeout(() => fetchContentImprovements(), 2000);
                              } else {
                                const error = await response.json();
                                notify(`❌ Error: ${error.error || 'Failed to improve content'}`);
                              }
                            } catch (error: any) {
                              notify(`❌ Error: ${error.message || 'Failed to improve content'}`);
                            }
                          }}
                          className="px-3 py-1 bg-purple-600 text-white text-xs rounded hover:bg-purple-700"
                        >
                          Improve Now
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Top Pages */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-4">Top Pages</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left p-2">Page</th>
                <th className="text-right p-2">Visits</th>
                <th className="text-right p-2">Avg. Time</th>
              </tr>
            </thead>
            <tbody>
              {data.pageBreakdown.topPages.slice(0, 20).map((page, idx) => (
                <tr key={idx} className="border-b hover:bg-gray-50">
                  <td className="p-2">
                    <div>
                      <p className="font-medium">{page.title || page.url}</p>
                      <p className="text-xs text-gray-500">{page.url}</p>
                    </div>
                  </td>
                  <td className="p-2 text-right font-semibold">{page.count.toLocaleString()}</td>
                  <td className="p-2 text-right text-gray-600">{Math.floor(page.avgTime)}s</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

