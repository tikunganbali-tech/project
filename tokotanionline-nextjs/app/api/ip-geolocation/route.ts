import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// GET /api/ip-geolocation - Get location from IP address
export async function GET(request: NextRequest) {
  try {
    // Get IP address from headers
    const forwarded = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');
    const ip = forwarded?.split(',')[0] || realIp || request.ip || 'unknown';

    // Skip localhost/private IPs
    if (ip === 'unknown' || ip.startsWith('127.') || ip.startsWith('192.168.') || ip.startsWith('10.')) {
      // Return default location for development
      return NextResponse.json({
        success: true,
        ip,
        location: {
          city: 'Jakarta',
          region: 'Jakarta',
          country: 'ID',
          latitude: -6.2088,
          longitude: 106.8456,
        },
        source: 'default',
      });
    }

    // Use free IP geolocation service (ip-api.com - free tier: 45 requests/minute)
    // Alternative: ipapi.co, geojs.io, ipgeolocation.io
    try {
      const geoResponse = await fetch(`http://ip-api.com/json/${ip}?fields=status,message,country,countryCode,region,regionName,city,lat,lon,query`, {
        headers: {
          'Accept': 'application/json',
        },
        next: { revalidate: 3600 }, // Cache for 1 hour
      });

      if (geoResponse.ok) {
        const geoData = await geoResponse.json();
        
        if (geoData.status === 'success') {
          const location = {
            city: geoData.city || geoData.regionName || 'Unknown',
            region: geoData.regionName || geoData.region || 'Unknown',
            country: geoData.countryCode || 'ID',
            latitude: geoData.lat || -6.2088,
            longitude: geoData.lon || 106.8456,
            ip: geoData.query || ip,
          };

          // Auto-create location in database if not exists
          await autoCreateLocation(location);

          // Find nearby locations within 30km radius
          const nearbyLocations = await findNearbyLocations(location.latitude, location.longitude, 30);

          return NextResponse.json({
            success: true,
            ip: location.ip,
            location,
            nearbyLocations: nearbyLocations.slice(0, 15),
            source: 'ip-api',
          });
        }
      }
    } catch (error) {
      console.error('IP geolocation API error:', error);
    }

    // Fallback: Try alternative service (geojs.io)
    try {
      const geoResponse = await fetch(`https://get.geojs.io/v1/ip/geo/${ip}.json`, {
        next: { revalidate: 3600 },
      });

      if (geoResponse.ok) {
        const geoData = await geoResponse.json();
        
        if (geoData.latitude && geoData.longitude) {
          const location = {
            city: geoData.city || geoData.region || 'Unknown',
            region: geoData.region || geoData.country || 'Unknown',
            country: geoData.country_code || 'ID',
            latitude: parseFloat(geoData.latitude),
            longitude: parseFloat(geoData.longitude),
            ip: geoData.ip || ip,
          };

          await autoCreateLocation(location);
          const nearbyLocations = await findNearbyLocations(location.latitude, location.longitude, 30);

          return NextResponse.json({
            success: true,
            ip: location.ip,
            location,
            nearbyLocations: nearbyLocations.slice(0, 15),
            source: 'geojs',
          });
        }
      }
    } catch (error) {
      console.error('Alternative geolocation API error:', error);
    }

    // Final fallback: return default Jakarta location
    const defaultLocation = {
      city: 'Jakarta',
      region: 'DKI Jakarta',
      country: 'ID',
      latitude: -6.2088,
      longitude: 106.8456,
    };

    // Try to find nearby locations even for fallback
    const nearbyLocations = await findNearbyLocations(defaultLocation.latitude, defaultLocation.longitude, 30);

    return NextResponse.json({
      success: true,
      ip,
      location: defaultLocation,
      nearbyLocations: nearbyLocations.slice(0, 15),
      source: 'fallback',
    });
  } catch (error: any) {
    console.error('Geolocation error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to detect location',
        location: {
          city: 'Unknown',
          region: 'Unknown',
          country: 'ID',
          latitude: -6.2088,
          longitude: 106.8456,
        },
        nearbyLocations: []
      },
      { status: 500 }
    );
  }
}

// Auto-create location in database if not exists
// Skip auto-creation for major urban cities
async function autoCreateLocation(locationData: {
  city: string;
  region: string;
  country: string;
  latitude: number;
  longitude: number;
}) {
  try {
    // Skip auto-creation for major urban cities (not agricultural areas)
    const urbanCities = ['Jakarta', 'Bandung', 'Surabaya', 'Medan', 'Makassar', 'Denpasar', 'Cimahi', 'Cikarang', 'Sidoarjo'];
    const cityName = locationData.city || '';
    if (urbanCities.some(city => cityName.includes(city))) {
      console.log(`⏭️ Skipping auto-creation for urban city: ${cityName}`);
      return;
    }

    // Check if location already exists (within 1km radius)
    const existing = await prisma.location.findFirst({
      where: {
        latitude: {
          gte: locationData.latitude - 0.01,
          lte: locationData.latitude + 0.01,
        },
        longitude: {
          gte: locationData.longitude - 0.01,
          lte: locationData.longitude + 0.01,
        },
      },
    });

    if (!existing) {
      // Determine location type
      let locationType = 'city';
      if (cityName.includes('Kecamatan') || cityName.includes('Kelurahan')) {
        locationType = 'subdistrict';
      } else if (cityName === locationData.region) {
        locationType = 'district';
      }

      await prisma.location.create({
        data: {
          name: cityName,
          type: locationType,
          latitude: locationData.latitude,
          longitude: locationData.longitude,
          province: locationData.region,
          isActive: true,
          displayOrder: 0,
        },
      });

      console.log(`✅ Auto-created location: ${cityName}`);
    }
  } catch (error) {
    console.error('Error auto-creating location:', error);
  }
}

// Find nearby locations within radius (Haversine formula)
// Excludes major urban cities
async function findNearbyLocations(
  centerLat: number,
  centerLng: number,
  radiusKm: number
) {
  const allLocations = await prisma.location.findMany({
    where: { 
      isActive: true,
      // Exclude urban cities
      name: {
        not: {
          in: ['Jakarta', 'Jakarta Pusat', 'Jakarta Selatan', 'Jakarta Barat', 'Jakarta Utara', 'Jakarta Timur', 'Bandung', 'Surabaya', 'Medan', 'Makassar', 'Denpasar', 'Cimahi', 'Cikarang', 'Sidoarjo'],
        },
      },
    },
  });

  const nearbyLocations = allLocations
    .map((loc) => {
      const distance = calculateDistance(centerLat, centerLng, loc.latitude, loc.longitude);
      return { ...loc, distance };
    })
    .filter((loc) => loc.distance <= radiusKm)
    .sort((a, b) => a.distance - b.distance);

  return nearbyLocations;
}

// Calculate distance between two coordinates (Haversine formula)
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}



