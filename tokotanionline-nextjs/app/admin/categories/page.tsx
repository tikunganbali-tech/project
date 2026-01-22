/**
 * STEP 3.1.3: Admin Category Management Page
 * 
 * Server component untuk fetch categories dengan hierarchy
 */

import CategoryManagerClient from '@/components/admin/CategoryManagerClient';
import { prisma } from '@/lib/db';
import { getServerSession } from '@/lib/auth';
import { enforceAdminPageGuard } from '@/lib/admin-page-guard';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function AdminCategoriesPage() {
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

  // PHASE 1: Fetch unified categories with hierarchy and context
  const categories = await prisma.category.findMany({
    include: {
      children: {
        orderBy: { name: 'asc' },
        include: {
          contexts: true,
          _count: {
            select: {
              products: true,
              blogs: true,
              blogPosts: true,
              children: true,
            },
          },
        },
      },
      parent: {
        select: {
          id: true,
          name: true,
          slug: true,
          type: true,
        },
      },
      contexts: true,
      _count: {
        select: {
          products: true,
          blogs: true,
          blogPosts: true,
          children: true,
        },
      },
    },
    orderBy: [
      { parentId: 'asc' }, // Root categories first
      { name: 'asc' },
    ],
  });

  // Build tree structure with product, blog counts
  const rootCategories = categories.filter((cat) => !cat.parentId);
  const subcategories = categories.filter((cat) => cat.parentId);

  const categoryTree = rootCategories.map((root) => {
    const children = subcategories.filter((sub) => sub.parentId === root.id);
    
    return {
      ...root,
      productCount: root._count?.products || 0,
      blogCount: (root._count?.blogs || 0) + (root._count?.blogPosts || 0),
      contentCount: 0, // Not applicable for unified categories
      children: children.map((child) => ({
        ...child,
        productCount: child._count?.products || 0,
        blogCount: (child._count?.blogs || 0) + (child._count?.blogPosts || 0),
        contentCount: 0,
      })),
    };
  });

  return (
    <CategoryManagerClient
      categories={JSON.parse(JSON.stringify(categoryTree))}
      userRole={userRole}
    />
  );
}
