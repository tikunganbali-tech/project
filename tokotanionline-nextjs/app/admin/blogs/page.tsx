import BlogsManagerClient from '@/components/admin/BlogsManagerClient';
import { prisma } from '@/lib/db';
import { enforceAdminPageGuard } from '@/lib/admin-page-guard';

// This page depends on live DB state; do not prerender at build time.
export const dynamic = 'force-dynamic';

export default async function AdminBlogsPage() {
  // 🔒 SECURITY: Check authentication and permissions
  const guardResult = await enforceAdminPageGuard({
    requireAuth: true,
    requirePermission: 'content.manage',
  });

  // If dev mode shows status component, return it
  if (guardResult.statusComponent) {
    return guardResult.statusComponent;
  }

  const blogs = await prisma.blog.findMany({
    include: {
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  const categories = await prisma.blogCategory.findMany({
    orderBy: { name: 'asc' },
  });

  return (
    <BlogsManagerClient
      blogs={JSON.parse(JSON.stringify(blogs))}
      categories={JSON.parse(JSON.stringify(categories))}
    />
  );
}
