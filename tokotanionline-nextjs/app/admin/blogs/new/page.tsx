import BlogFormClient from '@/components/admin/BlogFormClient';
import { prisma } from '@/lib/db';

// This page depends on live DB state; do not prerender at build time.
export const dynamic = 'force-dynamic';

export default async function NewBlogPage() {
  // EKSEKUSI 3: Fetch categories from unified Category table
  // Filter: isActive = true, context = 'blog'
  const categories = await prisma.category.findMany({
    where: {
      isActive: true,
      contexts: {
        some: {
          context: 'blog',
        },
      },
    },
    include: {
      parent: true,
      children: {
        where: {
          isActive: true,
        },
        orderBy: { name: 'asc' },
      },
    },
    orderBy: { name: 'asc' },
  });

  const products = await prisma.product.findMany({
    where: { isActive: true },
    select: { id: true, name: true, slug: true },
    orderBy: { name: 'asc' },
  });

  return (
    <BlogFormClient
      categories={JSON.parse(JSON.stringify(categories))}
      products={JSON.parse(JSON.stringify(products))}
    />
  );
}
