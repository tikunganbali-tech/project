import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { prisma } from '@/lib/db';

// GET /api/social-proof/locations - Get locations for social proof (auto-detect from IP)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const lat = searchParams.get('lat');
    const lng = searchParams.get('lng');
    const useIp = searchParams.get('useIp') !== 'false'; // Default true

    let locations;
    let visitorLocation: { lat: number; lng: number } | null = null;

    if (lat && lng) {
      // Use provided geolocation
      const visitorLat = parseFloat(lat);
      const visitorLng = parseFloat(lng);
      visitorLocation = { lat: visitorLat, lng: visitorLng };
      
      // Get all active locations, excluding major urban cities
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

      const locationsWithDistance = allLocations.map((loc) => {
        const distance = calculateDistance(visitorLat, visitorLng, loc.latitude, loc.longitude);
        return { ...loc, distance };
      });

      locations = locationsWithDistance
        .filter((loc) => loc.distance <= 30)
        .sort((a, b) => a.distance - b.distance)
        .slice(0, 15)
        .map(({ distance, ...loc }) => loc);
      
              // Ensure minimum 5 locations
              if (locations.length < 5) {
                const remainingNeeded = 5 - locations.length;
                const locationIds = locations.map((l: any) => l.id);
                const additionalLocations = allLocations
                  .filter((loc: any) => !locationIds.includes(loc.id))
                  .slice(0, remainingNeeded);
                locations = [...locations, ...additionalLocations];
              }
    } else if (useIp) {
      // Auto-detect from IP address
      try {
        const ipResponse = await fetch(`${request.nextUrl.origin}/api/ip-geolocation`, {
          headers: {
            'x-forwarded-for': request.headers.get('x-forwarded-for') || '',
            'x-real-ip': request.headers.get('x-real-ip') || '',
          },
        });

        if (ipResponse.ok) {
          const ipData = await ipResponse.json();
          
          if (ipData.success && ipData.location) {
            visitorLocation = {
              lat: ipData.location.latitude,
              lng: ipData.location.longitude,
            };

            // Use nearby locations from IP detection
            if (ipData.nearbyLocations && ipData.nearbyLocations.length > 0) {
              locations = ipData.nearbyLocations;
            } else {
              // Fallback: find nearby locations from database (exclude urban cities)
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

              const locationsWithDistance = allLocations.map((loc) => {
                const distance = calculateDistance(
                  ipData.location.latitude,
                  ipData.location.longitude,
                  loc.latitude,
                  loc.longitude
                );
                return { ...loc, distance };
              });

              locations = locationsWithDistance
                .filter((loc) => loc.distance <= 30)
                .sort((a, b) => a.distance - b.distance)
                .slice(0, 15)
                .map(({ distance, ...loc }) => loc);
              
              // Ensure minimum 5 locations
              if (locations.length < 5) {
                const remainingNeeded = 5 - locations.length;
                const locationIds = locations.map((l: any) => l.id);
                const additionalLocations = allLocations
                  .filter(loc => !locationIds.includes(loc.id))
                  .slice(0, remainingNeeded);
                locations = [...locations, ...additionalLocations];
              }
            }
          }
        }
      } catch (error) {
        console.error('IP geolocation error:', error);
      }
    }

    // Fallback: return all active locations if no filtering requested (for admin panel)
    if (!locations || locations.length === 0) {
      // If useIp=false and no lat/lng, return ALL locations (for admin panel)
      if (useIp === false && !lat && !lng) {
        locations = await prisma.location.findMany({
          where: { isActive: true },
          orderBy: { displayOrder: 'asc' },
        });
      } else {
        // For frontend: return random active locations (minimum 5)
        // Exclude major urban cities
        const allActiveLocations = await prisma.location.findMany({
          where: { 
            isActive: true,
            // Exclude urban cities
            name: {
              not: {
                in: ['Jakarta', 'Jakarta Pusat', 'Jakarta Selatan', 'Jakarta Barat', 'Jakarta Utara', 'Jakarta Timur', 'Bandung', 'Surabaya', 'Medan', 'Makassar', 'Denpasar', 'Cimahi', 'Cikarang', 'Sidoarjo'],
              },
            },
          },
          orderBy: { displayOrder: 'asc' },
        });
        
        // Shuffle and take at least 5, up to 15
        const shuffled = allActiveLocations.sort(() => 0.5 - Math.random());
        locations = shuffled.slice(0, Math.max(5, Math.min(15, shuffled.length)));
      }
    } else if (locations.length < 5 && useIp !== false) {
      // If we have some locations but less than 5, add more random ones (only for frontend)
      // Exclude urban cities
      const additionalLocations = await prisma.location.findMany({
        where: { 
          isActive: true,
          id: { notIn: locations.map((l: any) => l.id) },
          // Exclude urban cities
          name: {
            not: {
              in: ['Jakarta', 'Jakarta Pusat', 'Jakarta Selatan', 'Jakarta Barat', 'Jakarta Utara', 'Jakarta Timur', 'Bandung', 'Surabaya', 'Medan', 'Makassar', 'Denpasar', 'Cimahi', 'Cikarang', 'Sidoarjo'],
            },
          },
        },
        orderBy: { displayOrder: 'asc' },
        take: 5 - locations.length,
      });
      locations = [...locations, ...additionalLocations];
    }

    return NextResponse.json({
      locations,
      visitorLocation,
      source: lat && lng ? 'geolocation' : useIp ? 'ip' : 'database',
    });
  } catch (error: any) {
    console.error('Error fetching locations:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

// POST /api/social-proof/locations - Create new location (Admin only)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session || (session.user as any).role !== 'super_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, type, latitude, longitude, province, isActive, displayOrder } = body;

    // Validate required fields
    if (!name || !latitude || !longitude) {
      return NextResponse.json(
        { error: 'Name, latitude, and longitude are required' },
        { status: 400 }
      );
    }

    // Validate coordinates
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    if (isNaN(lat) || isNaN(lng)) {
      return NextResponse.json(
        { error: 'Invalid coordinates. Must be valid numbers' },
        { status: 400 }
      );
    }
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return NextResponse.json(
        { error: 'Invalid coordinates. Latitude must be -90 to 90, Longitude must be -180 to 180' },
        { status: 400 }
      );
    }

    const location = await prisma.location.create({
      data: {
        name: name.trim(),
        type: type || 'city',
        latitude: lat,
        longitude: lng,
        province: province ? province.trim() : null,
        isActive: isActive !== false,
        displayOrder: displayOrder || 0,
      },
    });

    return NextResponse.json({ location, success: true });
  } catch (error: any) {
    console.error('Error creating location:', error);
    // Handle unique constraint errors
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Location with these coordinates already exists' },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: error.message || 'Failed to create location' },
      { status: 500 }
    );
  }
}

// PUT /api/social-proof/locations/[id] - Update location (Admin only)
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session || (session.user as any).role !== 'super_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'ID required' }, { status: 400 });
    }

    // Check if location exists
    const existing = await prisma.location.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Location not found' }, { status: 404 });
    }

    const body = await request.json();
    const { name, type, latitude, longitude, province, isActive, displayOrder } = body;

    // Validate coordinates if provided
    if (latitude !== undefined || longitude !== undefined) {
      const lat = latitude !== undefined ? parseFloat(latitude) : existing.latitude;
      const lng = longitude !== undefined ? parseFloat(longitude) : existing.longitude;
      
      if (isNaN(lat) || isNaN(lng)) {
        return NextResponse.json(
          { error: 'Invalid coordinates. Must be valid numbers' },
          { status: 400 }
        );
      }
      if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        return NextResponse.json(
          { error: 'Invalid coordinates. Latitude must be -90 to 90, Longitude must be -180 to 180' },
          { status: 400 }
        );
      }
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name.trim();
    if (type !== undefined) updateData.type = type;
    if (latitude !== undefined) updateData.latitude = parseFloat(latitude);
    if (longitude !== undefined) updateData.longitude = parseFloat(longitude);
    if (province !== undefined) updateData.province = province ? province.trim() : null;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (displayOrder !== undefined) updateData.displayOrder = parseInt(displayOrder.toString()) || 0;

    const location = await prisma.location.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ location, success: true });
  } catch (error: any) {
    console.error('Error updating location:', error);
    // Handle unique constraint errors
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Location with these coordinates already exists' },
        { status: 400 }
      );
    }
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Location not found' },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { error: error.message || 'Failed to update location' },
      { status: 500 }
    );
  }
}

// DELETE /api/social-proof/locations/[id] - Delete location (Admin only)
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session || (session.user as any).role !== 'super_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'ID required' }, { status: 400 });
    }

    await prisma.location.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

// Helper function to calculate distance (Haversine formula)
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

