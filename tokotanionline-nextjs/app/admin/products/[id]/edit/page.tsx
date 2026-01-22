/**
 * STEP 3.1.2: Edit Product Page
 * 
 * Fetches product with subcategory and category hierarchy
 */

import ProductFormClient from '@/components/admin/ProductFormClient';
import { prisma } from '@/lib/db';
import { notFound } from 'next/navigation';
import { getServerSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { hasPermission } from '@/lib/permissions';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function EditProductPage({
  params,
}: {
  params: { id: string };
}) {
  // Authentication & permission check
  const session = await getServerSession();
  if (!session || !session.user) {
    redirect('/admin/login');
  }

  const userRole = (session.user as any).role;
  if (!hasPermission(userRole, 'product.manage')) {
    redirect('/admin');
  }

  const product = await prisma.product.findUnique({
    where: { id: params.id },
    include: {
      category: {
        include: {
          parent: true,
        },
      },
      subCategory: true,
    },
  });

  if (!product) {
    notFound();
  }

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
    <ProductFormClient
      product={JSON.parse(JSON.stringify(product))}
      categories={JSON.parse(JSON.stringify(categories))}
      userRole={userRole}
    />
  );
}



