/**
 * PHASE 6A — INTEGRATIONS CONFIGURATION (CLIENT COMPONENT)
 * 
 * Component: IntegrationsClient
 * 
 * Fungsi: Admin-managed integration configuration
 * 
 * Prinsip:
 * - SUPER ADMIN can configure
 * - All secrets encrypted at-rest
 * - Real-time health checks
 * - No page reload needed
 */

'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { hasPermission, isSuperAdmin } from '@/lib/permissions';
import { CheckCircle2, XCircle, Loader2, Settings, TestTube, Save, PowerOff, AlertCircle } from 'lucide-react';

interface Integration {
  id: string;
  name: string;
  type: 'ANALYTICS' | 'ADS_PIXEL' | 'AI_PROVIDER' | 'EMAIL_SMTP';
  status: 'CONNECTED' | 'NOT_CONFIGURED' | 'ERROR';
  lastChecked: string;
  details?: string;
  healthMessage?: string;
  isEnabled?: boolean;
  config?: any;
}

interface IntegrationConfig {
  [key: string]: any;
}

export default function IntegrationsClient() {
  const { data: session, status: sessionStatus } = useSession();
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [configuringId, setConfiguringId] = useState<string | null>(null);
  const [configForm, setConfigForm] = useState<IntegrationConfig>({});
  const [testingId, setTestingId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  const userRole = session?.user ? (session.user as any)?.role : null;
  const canView = userRole ? hasPermission(userRole, 'system.view') : false;
  const canManage = userRole ? isSuperAdmin(userRole) : false;

  // 📥 FETCH INTEGRATIONS STATUS
  const fetchIntegrations = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/system/integrations/config');
      
      if (!response.ok) {
        if (response.status === 403) {
          setError('Forbidden: Insufficient permissions');
        } else if (response.status === 401) {
          setError('Unauthorized: Please login again');
        } else {
          setError('Failed to load integrations');
        }
        return;
      }

      const data = await response.json();
      if (data.success && data.integrations) {
        setIntegrations(data.integrations);
      } else {
        setError('Invalid response format');
      }
    } catch (err: any) {
      console.error('Error fetching integrations:', err);
      setError('Failed to load integrations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (sessionStatus === 'loading') {
      return;
    }

    if (sessionStatus === 'unauthenticated' || !session) {
      setError('Unauthorized: Please login');
      setLoading(false);
      return;
    }

    if (!canView) {
      setError('Insufficient permissions');
      setLoading(false);
      return;
    }

    fetchIntegrations();
  }, [canView, sessionStatus, session]);

  // 🔧 CONFIGURE INTEGRATION
  const handleConfigure = (integration: Integration) => {
    setConfiguringId(integration.id);
    // Initialize form with existing config or defaults
    setConfigForm(integration.config || getDefaultConfig(integration.id));
  };

  // 💾 SAVE CONFIGURATION
  const handleSave = async (integrationId: string) => {
    if (!canManage) {
      alert('Only SUPER ADMIN can configure integrations');
      return;
    }

    setSavingId(integrationId);
    try {
      const response = await fetch('/api/admin/system/integrations/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          integrationId,
          config: configForm,
          isEnabled: true,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setConfiguringId(null);
        setConfigForm({});
        await fetchIntegrations();
      } else {
        alert(`Failed to save: ${data.error || 'Unknown error'}`);
      }
    } catch (err: any) {
      console.error('Error saving config:', err);
      alert(`Failed to save: ${err.message}`);
    } finally {
      setSavingId(null);
    }
  };

  // 🧪 TEST CONNECTION
  const handleTest = async (integrationId: string) => {
    if (!canManage) {
      alert('Only SUPER ADMIN can test connections');
      return;
    }

    setTestingId(integrationId);
    try {
      const response = await fetch('/api/admin/system/integrations/config/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ integrationId }),
      });

      // Check if response is OK
      if (!response.ok) {
        // Try to get error message from response
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        try {
          const errorText = await response.text();
          if (errorText) {
            try {
              const errorJson = JSON.parse(errorText);
              errorMessage = errorJson.error || errorJson.message || errorMessage;
            } catch {
              // Not JSON, use text as is (truncate if too long)
              if (errorText.length < 200) {
                errorMessage = errorText;
              }
            }
          }
        } catch {
          // Ignore parsing errors
        }
        alert(`❌ Connection test failed: ${errorMessage}`);
        await fetchIntegrations();
        return;
      }

      // Parse JSON response safely
      let data: any;
      try {
        const responseText = await response.text();
        if (!responseText || responseText.trim() === '') {
          throw new Error('Empty response from server');
        }
        data = JSON.parse(responseText);
      } catch (parseError: any) {
        console.error('Error parsing JSON response:', parseError);
        alert(`❌ Failed to parse server response: ${parseError.message || 'Invalid JSON'}`);
        await fetchIntegrations();
        return;
      }

      // Handle response
      if (data.success) {
        alert(`✅ Connection successful: ${data.message || 'Connection test passed'}`);
      } else {
        alert(`❌ Connection failed: ${data.message || data.error || 'Unknown error'}`);
      }
      await fetchIntegrations();
    } catch (err: any) {
      console.error('Error testing connection:', err);
      
      // More specific error messages for common issues
      let errorMessage = 'Failed to test connection. ';
      
      if (err.message === 'Failed to fetch') {
        errorMessage += 'Cannot connect to server. Please check if server is running and try again.';
      } else if (err.message?.includes('network') || err.message?.includes('fetch')) {
        errorMessage += 'Network error. Please check your internet connection and try again.';
      } else if (err.message?.includes('CORS')) {
        errorMessage += 'CORS error. Please check server configuration.';
      } else if (err.message) {
        errorMessage = err.message;
      } else {
        errorMessage += 'Please try again.';
      }
      
      alert(`❌ Failed to test: ${errorMessage}`);
      console.error('Full error:', err);
    } finally {
      setTestingId(null);
    }
  };

  // ⚡ DISABLE INTEGRATION
  const handleDisable = async (integrationId: string) => {
    if (!canManage) {
      alert('Only SUPER ADMIN can disable integrations');
      return;
    }

    if (!confirm('Are you sure you want to disable this integration?')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/system/integrations/config/${integrationId}`, {
        method: 'DELETE',
      });

      const data = await response.json();
      if (data.success) {
        await fetchIntegrations();
      } else {
        alert(`Failed to disable: ${data.error || 'Unknown error'}`);
      }
    } catch (err: any) {
      console.error('Error disabling integration:', err);
      alert(`Failed to disable: ${err.message}`);
    }
  };

  // Get default config for integration type
  const getDefaultConfig = (integrationId: string): IntegrationConfig => {
    switch (integrationId) {
      case 'analytics-ga4':
        return { measurementId: '', isEnabled: false };
      case 'ads-facebook':
        return { pixelId: '', isEnabled: false };
      case 'ads-google':
        return { conversionId: '', conversionLabel: '', isEnabled: false };
      case 'ads-tiktok':
        return { pixelId: '', isEnabled: false };
      case 'ai-openai':
        return { apiKey: '', model: 'gpt-4', maxTokens: 2000, temperature: 0.7, timeout: 30000, isEnabled: false };
      case 'email-smtp':
        return { host: '', port: '587', user: '', password: '', encryption: 'TLS', isEnabled: false };
      default:
        return {};
    }
  };

  // Render configuration form based on integration type
  const renderConfigForm = (integrationId: string) => {
    const integration = integrations.find((i) => i.id === integrationId);
    if (!integration) return null;

    switch (integrationId) {
      case 'analytics-ga4':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Measurement ID
              </label>
              <input
                type="text"
                value={configForm.measurementId || ''}
                onChange={(e) => setConfigForm({ ...configForm, measurementId: e.target.value })}
                placeholder="G-XXXXXXXXXX"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                id="ga4-enabled"
                checked={configForm.isEnabled ?? false}
                onChange={(e) => setConfigForm({ ...configForm, isEnabled: e.target.checked })}
                className="mr-2"
              />
              <label htmlFor="ga4-enabled" className="text-sm text-gray-700">
                Enable Google Analytics 4
              </label>
            </div>
          </div>
        );

      case 'ads-facebook':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Pixel ID
              </label>
              <input
                type="text"
                value={configForm.pixelId || ''}
                onChange={(e) => setConfigForm({ ...configForm, pixelId: e.target.value })}
                placeholder="123456789012345"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                id="fb-enabled"
                checked={configForm.isEnabled ?? false}
                onChange={(e) => setConfigForm({ ...configForm, isEnabled: e.target.checked })}
                className="mr-2"
              />
              <label htmlFor="fb-enabled" className="text-sm text-gray-700">
                Enable Facebook Pixel
              </label>
            </div>
          </div>
        );

      case 'ads-google':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Conversion ID
              </label>
              <input
                type="text"
                value={configForm.conversionId || ''}
                onChange={(e) => setConfigForm({ ...configForm, conversionId: e.target.value })}
                placeholder="AW-XXXXXXXXXX"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Conversion Label
              </label>
              <input
                type="text"
                value={configForm.conversionLabel || ''}
                onChange={(e) => setConfigForm({ ...configForm, conversionLabel: e.target.value })}
                placeholder="XXXXXXXXXX"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                id="google-ads-enabled"
                checked={configForm.isEnabled ?? false}
                onChange={(e) => setConfigForm({ ...configForm, isEnabled: e.target.checked })}
                className="mr-2"
              />
              <label htmlFor="google-ads-enabled" className="text-sm text-gray-700">
                Enable Google Ads Conversion
              </label>
            </div>
          </div>
        );

      case 'ads-tiktok':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Pixel ID
              </label>
              <input
                type="text"
                value={configForm.pixelId || ''}
                onChange={(e) => setConfigForm({ ...configForm, pixelId: e.target.value })}
                placeholder="CXXXXXXXXXXXXXXX"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                id="tiktok-enabled"
                checked={configForm.isEnabled ?? false}
                onChange={(e) => setConfigForm({ ...configForm, isEnabled: e.target.checked })}
                className="mr-2"
              />
              <label htmlFor="tiktok-enabled" className="text-sm text-gray-700">
                Enable TikTok Pixel
              </label>
            </div>
          </div>
        );

      case 'ai-openai':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                API Key (masked when saved)
              </label>
              <input
                type="password"
                value={configForm.apiKey || ''}
                onChange={(e) => setConfigForm({ ...configForm, apiKey: e.target.value })}
                placeholder="sk-..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                API key will be encrypted and masked after saving
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Model
              </label>
              <select
                value={configForm.model || 'gpt-4'}
                onChange={(e) => setConfigForm({ ...configForm, model: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="gpt-4">GPT-4</option>
                <option value="gpt-4-turbo">GPT-4 Turbo</option>
                <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Max Tokens
                </label>
                <input
                  type="number"
                  value={configForm.maxTokens || 2000}
                  onChange={(e) => setConfigForm({ ...configForm, maxTokens: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Temperature
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="2"
                  value={configForm.temperature || 0.7}
                  onChange={(e) => setConfigForm({ ...configForm, temperature: parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Timeout (ms)
              </label>
              <input
                type="number"
                value={configForm.timeout || 30000}
                onChange={(e) => setConfigForm({ ...configForm, timeout: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
          </div>
        );

      case 'email-smtp':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  SMTP Host
                </label>
                <input
                  type="text"
                  value={configForm.host || ''}
                  onChange={(e) => setConfigForm({ ...configForm, host: e.target.value })}
                  placeholder="smtp.gmail.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  SMTP Port
                </label>
                <input
                  type="text"
                  value={configForm.port || '587'}
                  onChange={(e) => setConfigForm({ ...configForm, port: e.target.value })}
                  placeholder="587"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                SMTP User
              </label>
              <input
                type="text"
                value={configForm.user || ''}
                onChange={(e) => setConfigForm({ ...configForm, user: e.target.value })}
                placeholder="user@example.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                SMTP Password (masked when saved)
              </label>
              <input
                type="password"
                value={configForm.password || ''}
                onChange={(e) => setConfigForm({ ...configForm, password: e.target.value })}
                placeholder="••••••••"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Encryption
              </label>
              <select
                value={configForm.encryption || 'TLS'}
                onChange={(e) => setConfigForm({ ...configForm, encryption: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="TLS">TLS</option>
                <option value="SSL">SSL</option>
              </select>
            </div>
          </div>
        );

      default:
        return <p className="text-gray-500">No configuration form available</p>;
    }
  };

  // Show loading while session is being checked
  if (sessionStatus === 'loading') {
    return (
      <div className="p-6">
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-1/3 animate-pulse"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2 animate-pulse"></div>
              </div>
              <div className="h-6 bg-gray-200 rounded w-20 animate-pulse"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="p-6 text-center text-red-600">
        <p>Unauthorized: Please login to continue.</p>
      </div>
    );
  }

  if (!canView) {
    return (
      <div className="p-6 text-center text-red-600">
        <p>You don't have permission to view this page.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center space-x-2 text-gray-600">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Loading integrations...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
          <button
            onClick={() => fetchIntegrations()}
            className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // 🎨 STATUS BADGE
  const getStatusBadge = (status: 'CONNECTED' | 'NOT_CONFIGURED' | 'ERROR') => {
    if (status === 'CONNECTED') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
          <CheckCircle2 className="h-3.5 w-3.5" />
          CONNECTED
        </span>
      );
    }
    if (status === 'ERROR') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
          <AlertCircle className="h-3.5 w-3.5" />
          ERROR
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
        <XCircle className="h-3.5 w-3.5" />
        NOT CONFIGURED
      </span>
    );
  };

  // 📅 FORMAT DATE
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('id-ID', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // 🎨 TYPE LABEL
  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'ANALYTICS':
        return 'Analytics';
      case 'ADS_PIXEL':
        return 'Ads Pixel';
      case 'AI_PROVIDER':
        return 'AI Provider';
      case 'EMAIL_SMTP':
        return 'Email / SMTP';
      default:
        return type;
    }
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900">
          Integrations ({integrations.length})
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          Configuration managed securely via Admin Dashboard
        </p>
      </div>

      {/* Integrations List */}
      {integrations.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p>No integrations found.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {integrations.map((integration) => (
            <div key={integration.id} className="border rounded-lg p-4 bg-white">
              {/* Integration Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-base font-medium text-gray-900">
                      {integration.name}
                    </h3>
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                      {getTypeLabel(integration.type)}
                    </span>
                    {getStatusBadge(integration.status)}
                  </div>
                  {integration.details && (
                    <p className="text-sm text-gray-600 mb-1">{integration.details}</p>
                  )}
                  {integration.healthMessage && integration.status === 'ERROR' && (
                    <p className="text-xs text-red-600 mt-1">
                      ⚠️ {integration.healthMessage}
                    </p>
                  )}
                  <p className="text-xs text-gray-500 mt-2">
                    Last checked: {formatDate(integration.lastChecked)}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              {canManage && (
                <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-gray-200">
                  <button
                    onClick={() => handleConfigure(integration)}
                    className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <Settings className="h-4 w-4" />
                    Configure
                  </button>
                  <button
                    onClick={() => handleTest(integration.id)}
                    disabled={testingId === integration.id}
                    className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    {testingId === integration.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <TestTube className="h-4 w-4" />
                    )}
                    Test Connection
                  </button>
                  {integration.isEnabled && (
                    <button
                      onClick={() => handleDisable(integration.id)}
                      className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-500"
                    >
                      <PowerOff className="h-4 w-4" />
                      Disable
                    </button>
                  )}
                </div>
              )}

              {/* Configuration Modal */}
              {configuringId === integration.id && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-gray-900 mb-3">
                      Configure {integration.name}
                    </h4>
                    {renderConfigForm(integration.id)}
                    <div className="flex gap-2 mt-4">
                      <button
                        onClick={() => handleSave(integration.id)}
                        disabled={savingId === integration.id}
                        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50"
                      >
                        {savingId === integration.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Save className="h-4 w-4" />
                        )}
                        Save Configuration
                      </button>
                      <button
                        onClick={() => {
                          setConfiguringId(null);
                          setConfigForm({});
                        }}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Info Note */}
      {!canManage && (
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            <strong>Note:</strong> Only SUPER ADMIN can configure integrations. 
            Contact your administrator to make changes.
          </p>
        </div>
      )}
    </div>
  );
}
