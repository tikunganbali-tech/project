/**
 * STEP 22A-4 - MARKETING INTEGRATIONS CONFIG PANEL
 * 
 * Admin UI for configuring marketing integrations and event mappings
 * - Shows integration status (Active / Not Configured)
 * - Shows event mapping table
 * - Non-technical language
 * - No long forms
 * - No global spinner
 * - Lightweight skeleton per section
 */

'use client';

import { useState, useEffect } from 'react';
import { 
  Facebook, 
  Globe, 
  Music, 
  CheckCircle2, 
  XCircle, 
  Loader2,
  Settings,
  Save
} from 'lucide-react';

interface Integration {
  id: string;
  type: string;
  name: string;
  isActive: boolean;
  credentials: string | null;
  createdAt: string;
  eventMaps: EventMap[];
}

interface EventMap {
  id: string;
  integrationId: string;
  eventKey: string;
  externalEventName: string;
  enabled: boolean;
  createdAt: string;
}

const INTEGRATION_TYPES = {
  FACEBOOK: { label: 'Facebook Pixel', icon: Facebook, color: 'text-blue-600' },
  GOOGLE: { label: 'Google Analytics', icon: Globe, color: 'text-green-600' },
  TIKTOK: { label: 'TikTok Pixel', icon: Music, color: 'text-black' },
};

const DEFAULT_EVENTS = [
  { key: 'page_view', fb: 'PageView', google: 'page_view', tiktok: 'ViewPage' },
  { key: 'view_product', fb: 'ViewContent', google: 'view_item', tiktok: 'ViewContent' },
  { key: 'add_to_cart', fb: 'AddToCart', google: 'add_to_cart', tiktok: 'AddToCart' },
  { key: 'purchase', fb: 'Purchase', google: 'purchase', tiktok: 'CompletePayment' },
  { key: 'search', fb: 'Search', google: 'search', tiktok: 'Search' },
];

export default function MarketingIntegrationsClient() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [events, setEvents] = useState<EventMap[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [integrationsRes, eventsRes] = await Promise.all([
        fetch('/api/admin/marketing/integrations'),
        fetch('/api/admin/marketing/events'),
      ]);

      if (integrationsRes.ok) {
        const data = await integrationsRes.json();
        setIntegrations(data.integrations || []);
      }

      if (eventsRes.ok) {
        const data = await eventsRes.json();
        setEvents(data.events || []);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleIntegration = async (integrationId: string, currentActive: boolean) => {
    try {
      setSaving(integrationId);
      const integration = integrations.find(i => i.id === integrationId);
      if (!integration) return;

      const response = await fetch(`/api/admin/marketing/integrations/${integrationId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentActive }),
      });

      if (response.ok) {
        await loadData();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to update integration');
      }
    } catch (error) {
      alert('Error updating integration');
    } finally {
      setSaving(null);
    }
  };

  const toggleEvent = async (eventId: string, currentEnabled: boolean) => {
    try {
      setSaving(eventId);
      const response = await fetch(`/api/admin/marketing/events/${eventId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !currentEnabled }),
      });

      if (response.ok) {
        await loadData();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to update event');
      }
    } catch (error) {
      alert('Error updating event');
    } finally {
      setSaving(null);
    }
  };

  const getIntegrationStatus = (type: string) => {
    const integration = integrations.find(i => i.type === type);
    if (!integration) {
      return { status: 'not_configured', integration: null };
    }
    return {
      status: integration.isActive ? 'active' : 'inactive',
      integration,
    };
  };

  const getEventForIntegration = (integrationId: string, eventKey: string) => {
    return events.find(
      e => e.integrationId === integrationId && e.eventKey === eventKey
    );
  };

  const renderIntegrationStatus = (type: string) => {
    const { status, integration } = getIntegrationStatus(type);
    const config = INTEGRATION_TYPES[type as keyof typeof INTEGRATION_TYPES];
    if (!config) return null;

    const Icon = config.icon;

    if (status === 'not_configured') {
      return (
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Icon className={`h-5 w-5 ${config.color}`} />
              <div>
                <h3 className="font-medium text-gray-900">{config.label}</h3>
                <p className="text-sm text-gray-500">Belum dikonfigurasi</p>
              </div>
            </div>
            <span className="px-3 py-1 bg-gray-200 text-gray-600 text-sm rounded-full">
              Belum dikonfigurasi
            </span>
          </div>
        </div>
      );
    }

    const isSaving = saving === integration!.id;

    return (
      <div className={`rounded-lg p-4 border ${
        status === 'active' 
          ? 'bg-green-50 border-green-200' 
          : 'bg-gray-50 border-gray-200'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Icon className={`h-5 w-5 ${config.color}`} />
            <div>
              <h3 className="font-medium text-gray-900">{integration!.name}</h3>
              <p className="text-sm text-gray-500">
                {status === 'active' ? 'Aktif dan siap digunakan' : 'Dinonaktifkan'}
              </p>
            </div>
          </div>
          <button
            onClick={() => toggleIntegration(integration!.id, integration!.isActive)}
            disabled={isSaving}
            className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 ${
              status === 'active'
                ? 'bg-red-100 text-red-700 hover:bg-red-200'
                : 'bg-green-100 text-green-700 hover:bg-green-200'
            } disabled:opacity-50`}
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : status === 'active' ? (
              <>
                <XCircle className="h-4 w-4" />
                Nonaktifkan
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" />
                Aktifkan
              </>
            )}
          </button>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <div className="h-8 bg-gray-200 rounded w-64 animate-pulse"></div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-gray-100 rounded-lg animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  // Group events by integration
  const eventsByIntegration = integrations.reduce((acc, integration) => {
    acc[integration.id] = events.filter(e => e.integrationId === integration.id);
    return acc;
  }, {} as Record<string, EventMap[]>);

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Integrasi Marketing</h1>
        <p className="text-sm text-gray-500 mt-1">
          Kelola integrasi pixel dan pemetaan event untuk tracking marketing
        </p>
      </div>

      {/* Integration Status Cards */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Status Integrasi</h2>
        {Object.keys(INTEGRATION_TYPES).map((type) => (
          <div key={type}>
            {renderIntegrationStatus(type)}
          </div>
        ))}
      </div>

      {/* Event Mapping Table */}
      <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <h2 className="text-lg font-semibold text-gray-900">Pemetaan Event</h2>
          <p className="text-sm text-gray-500 mt-1">
            Tabel ini menampilkan pemetaan event internal ke event eksternal platform
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                  Event Internal
                </th>
                {integrations
                  .filter(i => i.isActive)
                  .map((integration) => {
                    const config = INTEGRATION_TYPES[integration.type as keyof typeof INTEGRATION_TYPES];
                    const Icon = config?.icon || Settings;
                    return (
                      <th
                        key={integration.id}
                        className="px-4 py-3 text-center text-sm font-medium text-gray-700"
                      >
                        <div className="flex items-center justify-center gap-2">
                          <Icon className={`h-4 w-4 ${config?.color || 'text-gray-600'}`} />
                          {config?.label || integration.type}
                        </div>
                      </th>
                    );
                  })}
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {DEFAULT_EVENTS.map((defaultEvent) => {
                const activeIntegrations = integrations.filter(i => i.isActive);
                
                // Get events for each active integration
                const integrationEvents = activeIntegrations.map((integration) => {
                  const eventMap = getEventForIntegration(integration.id, defaultEvent.key);
                  return {
                    integration,
                    eventMap,
                    externalName: eventMap?.externalEventName || getDefaultExternalName(integration.type, defaultEvent),
                  };
                });

                const allEnabled = integrationEvents.every(ie => ie.eventMap?.enabled ?? false);
                const anyEnabled = integrationEvents.some(ie => ie.eventMap?.enabled ?? false);

                return (
                  <tr key={defaultEvent.key} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {formatEventKey(defaultEvent.key)}
                    </td>
                    {integrationEvents.map(({ integration, externalName }) => (
                      <td key={integration.id} className="px-4 py-3 text-center text-sm text-gray-600">
                        {externalName}
                      </td>
                    ))}
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {activeIntegrations.length === 0 ? (
                          <span className="text-xs text-gray-400">Tidak ada integrasi aktif</span>
                        ) : (
                          <>
                            <span
                              className={`px-2 py-1 text-xs rounded-full ${
                                allEnabled
                                  ? 'bg-green-100 text-green-700'
                                  : anyEnabled
                                  ? 'bg-yellow-100 text-yellow-700'
                                  : 'bg-gray-100 text-gray-500'
                              }`}
                            >
                              {allEnabled ? 'ON' : anyEnabled ? 'PARIAL' : 'OFF'}
                            </span>
                            {integrationEvents.map(({ integration, eventMap }) => {
                              if (!eventMap) return null;
                              const isSaving = saving === eventMap.id;
                              return (
                                <button
                                  key={integration.id}
                                  onClick={() => toggleEvent(eventMap.id, eventMap.enabled)}
                                  disabled={isSaving}
                                  className={`ml-2 p-1 rounded ${
                                    eventMap.enabled
                                      ? 'text-green-600 hover:bg-green-50'
                                      : 'text-gray-400 hover:bg-gray-50'
                                  } disabled:opacity-50`}
                                  title={`Toggle ${integration.name}`}
                                >
                                  {isSaving ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : eventMap.enabled ? (
                                    <CheckCircle2 className="h-3 w-3" />
                                  ) : (
                                    <XCircle className="h-3 w-3" />
                                  )}
                                </button>
                              );
                            })}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function formatEventKey(key: string): string {
  return key
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function getDefaultExternalName(integrationType: string, defaultEvent: any): string {
  switch (integrationType) {
    case 'FACEBOOK':
      return defaultEvent.fb;
    case 'GOOGLE':
      return defaultEvent.google;
    case 'TIKTOK':
      return defaultEvent.tiktok;
    default:
      return defaultEvent.key;
  }
}

