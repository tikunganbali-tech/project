/**
 * API Key Management for Image Services
 * Allows admin to configure API keys for:
 * - Pexels
 * - Pixabay
 * - Unsplash
 * - Stable Diffusion
 * - Leonardo AI
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { prisma } from '@/lib/db';

// GET /api/admin/image-api-keys
export async function GET() {
  try {
    const session = await getServerSession();
    if (!session || (session.user as any).role !== 'super_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const apiKeys = await prisma.imageServiceAPIKey.findMany({
      orderBy: { serviceName: 'asc' },
    });

    // Mask API keys for security (show only last 4 chars)
    const maskedKeys = apiKeys.map((key) => ({
      ...key,
      apiKey: key.apiKey.length > 4 
        ? `••••${key.apiKey.slice(-4)}` 
        : '••••',
    }));

    return NextResponse.json({ apiKeys: maskedKeys });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT /api/admin/image-api-keys
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session || (session.user as any).role !== 'super_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { serviceName, apiKey, isActive } = body;

    if (!serviceName) {
      return NextResponse.json({ error: 'Service name is required' }, { status: 400 });
    }

    // Validate service name
    const validServices = ['pexels', 'pixabay', 'unsplash', 'stable_diffusion', 'leonardo'];
    if (!validServices.includes(serviceName)) {
      return NextResponse.json({ error: 'Invalid service name' }, { status: 400 });
    }

    // If updating existing key, check if we should preserve the existing key
    const existing = await prisma.imageServiceAPIKey.findUnique({
      where: { serviceName },
    });

    const finalApiKey = apiKey || existing?.apiKey;

    if (!finalApiKey) {
      return NextResponse.json({ error: 'API key is required' }, { status: 400 });
    }

    const updated = await prisma.imageServiceAPIKey.upsert({
      where: { serviceName },
      create: {
        serviceName,
        apiKey: finalApiKey,
        isActive: isActive !== undefined ? isActive : true,
      },
      update: {
        ...(apiKey && { apiKey }),
        ...(isActive !== undefined && { isActive }),
        updatedAt: new Date(),
      },
    });

    // Update environment variable (for immediate use)
    if (apiKey) {
      const envVarName = getEnvVarName(serviceName);
      // Note: In production, update .env file or use environment variable management system
      process.env[envVarName] = apiKey;
    }

    return NextResponse.json({ 
      success: true,
      apiKey: {
        ...updated,
        apiKey: updated.apiKey.length > 4 
          ? `••••${updated.apiKey.slice(-4)}` 
          : '••••',
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE /api/admin/image-api-keys/:serviceName
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session || (session.user as any).role !== 'super_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const serviceName = searchParams.get('serviceName');

    if (!serviceName) {
      return NextResponse.json({ error: 'Service name is required' }, { status: 400 });
    }

    await prisma.imageServiceAPIKey.delete({
      where: { serviceName },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * Get environment variable name for service
 */
function getEnvVarName(serviceName: string): string {
  const mapping: Record<string, string> = {
    pexels: 'PEXELS_API_KEY',
    pixabay: 'PIXABAY_API_KEY',
    unsplash: 'UNSPLASH_ACCESS_KEY',
    stable_diffusion: 'STABLE_DIFFUSION_API_KEY',
    leonardo: 'LEONARDO_API_KEY',
  };
  return mapping[serviceName] || '';
}

















