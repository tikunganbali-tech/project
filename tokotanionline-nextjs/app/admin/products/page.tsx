/**
 * STEP 3.1.1: Admin Product Listing Page
 * 
 * Server component untuk fetch products dengan:
 * - Category hierarchy (parent + children)
 * - Subcategory support
 * - Semua data untuk filtering & sorting
 */

import ProductsManagerClient from '@/components/admin/ProductsManagerClient';
import { prisma } from '@/lib/db';
import { getServerSession } from '@/lib/auth';
import { enforceAdminPageGuard } from '@/lib/admin-page-guard';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function AdminProductsPage() {
  // 🔒 SECURITY: Check authentication and permissions using guard
  const guardResult = await enforceAdminPageGuard({
    requireAuth: true,
    requirePermission: 'product.manage',
  });

  // If dev mode shows status component, return it
  if (guardResult.statusComponent) {
    return guardResult.statusComponent;
  }

  // Get session for userRole (already checked in guard)
  const session = await getServerSession();
  const userRole = (session?.user as any)?.role;

  // Fetch products with all relations
  const products = await prisma.product.findMany({
    include: {
      category: {
        include: {
          parent: true, // Include parent category
        },
      },
      subCategory: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  // Fetch categories with hierarchy
  const categories = await prisma.productCategory.findMany({
    include: {
      parent: true,
      children: {
        orderBy: { name: 'asc' },
      },
    },
    orderBy: { name: 'asc' },
  });

  return (
    <ProductsManagerClient
      products={JSON.parse(JSON.stringify(products))}
      categories={JSON.parse(JSON.stringify(categories))}
      userRole={userRole}
    />
  );
}
