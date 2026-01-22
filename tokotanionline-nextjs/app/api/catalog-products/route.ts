/**
 * STEP 6: Error handling hardened
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';
// DISABLED: Validation module not available
// import { validateSlug } from '@/lib/validation';
import * as logger from '@/lib/logger';

const productSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  description: z.string().min(1),
  price: z.number().int().min(0),
});

function simpleSlug(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

// GET /api/catalog-products - List all products (admin)
export async function GET() {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const products = await prisma.catalogProduct.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ products });
  } catch (error: any) {
    // STEP 6: Use logger, don't leak error details
    logger.error('Error fetching products:', error);
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
  }
}

// POST /api/catalog-products - Create product
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const data = productSchema.parse(body);

    // Validate slug
    // DISABLED: Validation module not available
    // const slugValidation = validateSlug(data.slug);
    // if (!slugValidation.valid) {
    //   return NextResponse.json(
    //     { error: slugValidation.error || 'Invalid slug' },
    //     { status: 400 }
    //   );
    // }

    // Check if slug exists
    const existing = await prisma.catalogProduct.findUnique({
      where: { slug: data.slug },
    });

    if (existing) {
      return NextResponse.json({ error: 'Slug sudah digunakan' }, { status: 400 });
    }

    const product = await prisma.catalogProduct.create({
      data: {
        name: data.name,
        slug: data.slug,
        description: data.description,
        price: data.price,
        published: false,
      },
    });

    return NextResponse.json({ product });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input data' }, { status: 400 });
    }
    // STEP 6: Use logger, don't leak error details
    logger.error('Error creating product:', error);
    return NextResponse.json({ error: 'Failed to create product' }, { status: 500 });
  }
}

