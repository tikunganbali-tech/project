import AIGeneratorClient from '@/components/admin/AIGeneratorClient';
import { prisma } from '@/lib/db';
import { enforceAdminPageGuard } from '@/lib/admin-page-guard';

// This page depends on live DB state; do not prerender at build time.
export const dynamic = 'force-dynamic';

export default async function AIGeneratorPage() {
  // 🔒 SECURITY: Check authentication and permissions
  const guardResult = await enforceAdminPageGuard({
    requireAuth: true,
    requirePermission: 'content.manage',
  });

  // If dev mode shows status component, return it
  if (guardResult.statusComponent) {
    return guardResult.statusComponent;
  }
  const settings = await prisma.aIContentSettings.findFirst();
  const queue = await prisma.aIContentQueue.findMany({
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  // Get both blog and product categories
  const blogCategories = await prisma.blogCategory.findMany({
    orderBy: { name: 'asc' },
  });
  
  const productCategories = await prisma.productCategory.findMany({
    orderBy: { name: 'asc' },
  });

  // Combine categories (for now, use blog categories as default)
  const categories = blogCategories;

  // Get published blogs for improvement
  const publishedBlogs = await prisma.blog.findMany({
    where: {
      status: 'published',
    },
    orderBy: { publishedAt: 'desc' },
    take: 50,
    select: {
      id: true,
      title: true,
      slug: true,
      publishedAt: true,
      updatedAt: true,
      categoryId: true,
    },
  });

  return (
    <AIGeneratorClient
      settings={JSON.parse(JSON.stringify(settings))}
      queue={JSON.parse(JSON.stringify(queue))}
      categories={JSON.parse(JSON.stringify(categories))}
      publishedBlogs={JSON.parse(JSON.stringify(publishedBlogs))}
    />
  );
}
