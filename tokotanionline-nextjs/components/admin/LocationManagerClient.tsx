'use client';

import { useState, useEffect } from 'react';
import { Save, Plus, X, MapPin, Edit2, Trash2, RefreshCw, Globe } from 'lucide-react';
// Notification utility removed - using simple alerts

export default function LocationManagerClient() {
  const [locations, setLocations] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [autoDetecting, setAutoDetecting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    type: 'city',
    latitude: '',
    longitude: '',
    province: '',
    isActive: true,
    displayOrder: 0,
  });

  useEffect(() => {
    fetchLocations();
  }, []);

  const fetchLocations = async () => {
    try {
      setLoading(true);
      // Fetch all locations from database (not filtered by IP)
      const res = await fetch('/api/social-proof/locations?useIp=false');
      
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      
      const data = await res.json();
      
      if (data.locations && Array.isArray(data.locations)) {
        setLocations(data.locations);
      } else if (data.error) {
        throw new Error(data.error);
      } else {
        setLocations([]);
      }
    } catch (error: any) {
      console.error('Error fetching locations:', error);
      alert(`Error fetching locations: ${error.message || 'Unknown error'}. Please refresh the page.`);
      setLocations([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAutoDetect = async () => {
    setAutoDetecting(true);
    try {
      const res = await fetch('/api/ip-geolocation');
      
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      
      const data = await res.json();

      if (data.success && data.location) {
        // Auto-fill form with detected location
        setFormData({
          name: data.location.city || 'Unknown Location',
          type: 'city',
          latitude: data.location.latitude?.toString() || '',
          longitude: data.location.longitude?.toString() || '',
          province: data.location.region || '',
          isActive: true,
          displayOrder: 0,
        });

        // Show nearby locations
        if (data.nearbyLocations && data.nearbyLocations.length > 0) {
          alert(`Detected location: ${data.location.city}. Found ${data.nearbyLocations.length} nearby locations in database.`);
        } else {
          alert(`Detected location: ${data.location.city}. Coordinates: ${data.location.latitude}, ${data.location.longitude}. You can now save this location.`);
        }
      } else {
        alert(`Failed to detect location from IP. Error: ${data.error || 'Unknown error'}`);
      }
    } catch (error: any) {
      console.error('Auto-detect error:', error);
      alert(`Error detecting location: ${error.message || 'Network error. Please check your connection.'}`);
    } finally {
      setAutoDetecting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!formData.name || !formData.latitude || !formData.longitude) {
      alert('Please fill in all required fields (Name, Latitude, Longitude)');
      return;
    }

    // Validate coordinates
    const lat = parseFloat(formData.latitude);
    const lng = parseFloat(formData.longitude);
    if (isNaN(lat) || isNaN(lng)) {
      alert('Please enter valid coordinates (numbers only)');
      return;
    }
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      alert('Please enter valid coordinates (Latitude: -90 to 90, Longitude: -180 to 180)');
      return;
    }

    setLoading(true);

    try {
      const payload = {
        name: formData.name.trim(),
        type: formData.type,
        latitude: lat,
        longitude: lng,
        province: formData.province.trim() || null,
        isActive: formData.isActive,
        displayOrder: parseInt(formData.displayOrder.toString()) || 0,
      };

      if (editingId) {
        // Update existing
        const res = await fetch(`/api/social-proof/locations?id=${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        const data = await res.json();

        if (res.ok && data.location) {
          alert('Location updated successfully!');
          resetForm();
          fetchLocations();
        } else {
          alert(`Failed to update location: ${data.error || 'Unknown error'}`);
        }
      } else {
        // Create new
        const res = await fetch('/api/social-proof/locations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        const data = await res.json();

        if (res.ok && data.location) {
          alert('Location created successfully!');
          resetForm();
          fetchLocations();
        } else {
          alert(`Failed to create location: ${data.error || 'Unknown error'}`);
        }
      }
    } catch (error: any) {
      console.error('Save location error:', error);
      alert(`Error saving location: ${error.message || 'Network error. Please check your connection.'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (location: any) => {
    setEditingId(location.id);
    setFormData({
      name: location.name,
      type: location.type,
      latitude: location.latitude.toString(),
      longitude: location.longitude.toString(),
      province: location.province || '',
      isActive: location.isActive,
      displayOrder: location.displayOrder,
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this location? This action cannot be undone.')) return;

    try {
      const res = await fetch(`/api/social-proof/locations?id=${id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        alert('Location deleted successfully!');
        fetchLocations();
      } else {
        const data = await res.json();
        alert(`Failed to delete location: ${data.error || 'Unknown error'}`);
      }
    } catch (error: any) {
      alert(`Error deleting location: ${error.message || 'Unknown error'}`);
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({
      name: '',
      type: 'city',
      latitude: '',
      longitude: '',
      province: '',
      isActive: true,
      displayOrder: 0,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Location Management</h2>
          <p className="text-sm text-gray-600 mt-1">
            Locations are automatically detected from visitor IP addresses. You can also manually add locations.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleAutoDetect}
            disabled={autoDetecting}
            className="btn-secondary flex items-center gap-2"
          >
            <Globe className="h-4 w-4" />
            {autoDetecting ? 'Detecting...' : 'Auto-Detect from IP'}
          </button>
          <button
            onClick={resetForm}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Add New Location
          </button>
        </div>
      </div>

      {/* Form */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">
          {editingId ? 'Edit Location' : 'Add New Location'}
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Location Name *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
                placeholder="Jakarta, Bandung, Kecamatan Cikarang, etc."
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Type *</label>
              <select
                required
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="city">City</option>
                <option value="district">District</option>
                <option value="subdistrict">Subdistrict</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Latitude *</label>
              <input
                type="number"
                step="any"
                required
                value={formData.latitude}
                onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
                placeholder="-6.2088"
              />
              <p className="text-xs text-gray-500 mt-1">
                Get coordinates from <a href="https://www.google.com/maps" target="_blank" rel="noopener noreferrer" className="text-green-600 hover:underline">Google Maps</a> or use Auto-Detect
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Longitude *</label>
              <input
                type="number"
                step="any"
                required
                value={formData.longitude}
                onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
                placeholder="106.8456"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Province</label>
              <input
                type="text"
                value={formData.province}
                onChange={(e) => setFormData({ ...formData, province: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
                placeholder="Jawa Barat, DKI Jakarta, etc."
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Display Order</label>
              <input
                type="number"
                value={formData.displayOrder}
                onChange={(e) => setFormData({ ...formData, displayOrder: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              className="w-4 h-4 text-green-600 rounded"
            />
            <label className="text-sm font-medium">Active</label>
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={loading}
              className="btn-primary flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              {loading ? 'Saving...' : editingId ? 'Update' : 'Create'} Location
            </button>
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="btn-secondary"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Globe className="h-5 w-5 text-blue-600 mt-0.5" />
          <div>
            <h4 className="font-semibold text-blue-900 mb-1">Automatic Location Detection</h4>
            <p className="text-sm text-blue-800">
              The system automatically detects visitor locations from their IP addresses and creates locations in the database. 
              Locations within 30km radius are used for social proof messages. You can manually add or edit locations as needed.
            </p>
          </div>
        </div>
      </div>

      {/* Locations List */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">All Locations ({locations.length})</h3>
            <button
              onClick={fetchLocations}
              className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3 text-sm font-semibold">Name</th>
                  <th className="text-left p-3 text-sm font-semibold">Type</th>
                  <th className="text-left p-3 text-sm font-semibold">Coordinates</th>
                  <th className="text-left p-3 text-sm font-semibold">Province</th>
                  <th className="text-left p-3 text-sm font-semibold">Order</th>
                  <th className="text-left p-3 text-sm font-semibold">Status</th>
                  <th className="text-left p-3 text-sm font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {locations.map((loc) => (
                  <tr key={loc.id} className="border-b hover:bg-gray-50">
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-green-600" />
                        <span className="font-medium">{loc.name}</span>
                      </div>
                    </td>
                    <td className="p-3 text-sm text-gray-600 capitalize">{loc.type}</td>
                    <td className="p-3 text-xs text-gray-500">
                      {loc.latitude.toFixed(4)}, {loc.longitude.toFixed(4)}
                    </td>
                    <td className="p-3 text-sm text-gray-600">{loc.province || '-'}</td>
                    <td className="p-3 text-sm">{loc.displayOrder}</td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          loc.isActive
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {loc.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(loc)}
                          className="text-blue-600 hover:text-blue-700"
                          title="Edit"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(loc.id)}
                          className="text-red-600 hover:text-red-700"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {locations.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-6 text-center text-gray-500">
                      No locations found. Use Auto-Detect or add your first location manually.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
