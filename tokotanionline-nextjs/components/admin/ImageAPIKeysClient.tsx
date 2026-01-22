'use client';

import { useState, useEffect } from 'react';

interface APIKey {
  id: string;
  serviceName: string;
  apiKey: string;
  isActive: boolean;
  usageCount: number;
  lastUsedAt: string | null;
}

export default function ImageAPIKeysClient() {
  const [apiKeys, setApiKeys] = useState<APIKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [newKeyValues, setNewKeyValues] = useState<Record<string, string>>({});

  const services = [
    { name: 'pexels', label: 'Pexels', description: 'Free stock photos API (unlimited)' },
    { name: 'pixabay', label: 'Pixabay', description: 'Free images API (5,000/hour)' },
    { name: 'unsplash', label: 'Unsplash', description: 'High-quality photos (50/hour free)' },
    { name: 'stable_diffusion', label: 'Stable Diffusion', description: 'AI image generation' },
    { name: 'leonardo', label: 'Leonardo AI', description: 'AI image generation (preferred)' },
  ];

  useEffect(() => {
    loadAPIKeys();
  }, []);

  const loadAPIKeys = async () => {
    try {
      const response = await fetch('/api/admin/image-api-keys');
      if (response.ok) {
        const data = await response.json();
        setApiKeys(data.apiKeys || []);
      }
    } catch (error) {
      console.error('Error loading API keys:', error);
    } finally {
      setLoading(false);
    }
  };

  const getAPIKey = (serviceName: string): APIKey | undefined => {
    return apiKeys.find((k) => k.serviceName === serviceName);
  };

  const handleSaveKey = async (serviceName: string) => {
    const apiKey = newKeyValues[serviceName];
    if (!apiKey || apiKey.length < 10) {
      alert('Please enter a valid API key');
      return;
    }

    setSaving(true);
    try {
      const existing = getAPIKey(serviceName);
      const response = await fetch('/api/admin/image-api-keys', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceName,
          apiKey,
          isActive: existing?.isActive !== false,
        }),
      });

      if (response.ok) {
        await loadAPIKeys();
        setEditingKey(null);
        setNewKeyValues({ ...newKeyValues, [serviceName]: '' });
        alert('API key saved successfully!');
      } else {
        const error = await response.json();
        alert(`Failed to save: ${error.error}`);
      }
    } catch (error) {
      alert('Error saving API key');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (serviceName: string, currentStatus: boolean) => {
    setSaving(true);
    try {
      const existing = getAPIKey(serviceName);
      const response = await fetch('/api/admin/image-api-keys', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceName,
          apiKey: existing?.apiKey || '',
          isActive: !currentStatus,
        }),
      });

      if (response.ok) {
        await loadAPIKeys();
      }
    } catch (error) {
      alert('Error updating API key status');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteKey = async (serviceName: string) => {
    if (!confirm(`Delete API key for ${serviceName}?`)) return;

    setSaving(true);
    try {
      const response = await fetch(`/api/admin/image-api-keys?serviceName=${serviceName}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await loadAPIKeys();
        alert('API key deleted');
      }
    } catch (error) {
      alert('Error deleting API key');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-6">Loading API keys...</div>;
  }

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6">Image Service API Keys</h2>
      <p className="text-gray-600 mb-6">
        Configure API keys for image services. These are used by the Image Intelligence Engine
        to find reference images and generate AI images.
      </p>

      <div className="space-y-4">
        {services.map((service) => {
          const apiKey = getAPIKey(service.name);
          const isEditing = editingKey === service.name;
          const hasKey = !!apiKey && apiKey.apiKey !== '••••';

          return (
            <div
              key={service.name}
              className="border rounded-lg p-4 bg-white shadow-sm"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold">{service.label}</h3>
                    {apiKey && (
                      <span
                        className={`px-2 py-1 text-xs rounded ${
                          apiKey.isActive
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {apiKey.isActive ? 'Active' : 'Inactive'}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mb-3">{service.description}</p>

                  {isEditing ? (
                    <div className="space-y-2">
                      <input
                        type="password"
                        placeholder={`Enter ${service.label} API key`}
                        value={newKeyValues[service.name] || ''}
                        onChange={(e) =>
                          setNewKeyValues({
                            ...newKeyValues,
                            [service.name]: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border rounded"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleSaveKey(service.name)}
                          disabled={saving}
                          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => {
                            setEditingKey(null);
                            setNewKeyValues({ ...newKeyValues, [service.name]: '' });
                          }}
                          className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        <div className="text-sm text-gray-700">
                          {hasKey ? (
                            <span className="font-mono">{apiKey!.apiKey}</span>
                          ) : (
                            <span className="text-gray-400">No API key configured</span>
                          )}
                        </div>
                        {apiKey && (
                          <div className="text-xs text-gray-500 mt-1">
                            Used {apiKey.usageCount} times
                            {apiKey.lastUsedAt && (
                              <> • Last used: {new Date(apiKey.lastUsedAt).toLocaleDateString()}</>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2">
                        {apiKey && (
                          <button
                            onClick={() => handleToggleActive(service.name, apiKey.isActive)}
                            disabled={saving}
                            className="px-3 py-1 text-sm border rounded hover:bg-gray-50 disabled:opacity-50"
                          >
                            {apiKey.isActive ? 'Disable' : 'Enable'}
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setEditingKey(service.name);
                            setNewKeyValues({
                              ...newKeyValues,
                              [service.name]: '',
                            });
                          }}
                          className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                        >
                          {hasKey ? 'Update' : 'Add Key'}
                        </button>
                        {hasKey && (
                          <button
                            onClick={() => handleDeleteKey(service.name)}
                            disabled={saving}
                            className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-8 p-4 bg-blue-50 rounded-lg">
        <h3 className="font-semibold mb-2">Getting API Keys</h3>
        <ul className="text-sm text-gray-700 space-y-1">
          <li>
            <strong>Pexels:</strong>{' '}
            <a
              href="https://www.pexels.com/api/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              https://www.pexels.com/api/
            </a>{' '}
            (Free, unlimited)
          </li>
          <li>
            <strong>Pixabay:</strong>{' '}
            <a
              href="https://pixabay.com/api/docs/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              https://pixabay.com/api/docs/
            </a>{' '}
            (Free, 5,000/hour)
          </li>
          <li>
            <strong>Unsplash:</strong>{' '}
            <a
              href="https://unsplash.com/developers"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              https://unsplash.com/developers
            </a>{' '}
            (Free, 50/hour)
          </li>
          <li>
            <strong>Stable Diffusion:</strong>{' '}
            <a
              href="https://platform.stability.ai/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              https://platform.stability.ai/
            </a>{' '}
            (Paid)
          </li>
          <li>
            <strong>Leonardo AI:</strong>{' '}
            <a
              href="https://leonardo.ai/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              https://leonardo.ai/
            </a>{' '}
            (Paid)
          </li>
        </ul>
      </div>
    </div>
  );
}

















