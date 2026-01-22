/**
 * STEP 3.1.2: New Product Page
 * 
 * Fetches category hierarchy for parent/subcategory selection
 */

import ProductFormClient from '@/components/admin/ProductFormClient';
import { prisma } from '@/lib/db';
import { getServerSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { hasPermission } from '@/lib/permissions';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function NewProductPage() {
  // Authentication & permission check
  const session = await getServerSession();
  if (!session || !session.user) {
    redirect('/admin/login');
  }

  const userRole = (session.user as any).role;
  if (!hasPermission(userRole, 'product.manage')) {
    redirect('/admin');
  }

  // EKSEKUSI 2: Fetch categories from unified Category table
  // Filter: isActive = true, context = 'product'
  const categories = await prisma.category.findMany({
    where: {
      isActive: true,
      contexts: {
        some: {
          context: 'product',
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

  return (
    <ProductFormClient
      categories={JSON.parse(JSON.stringify(categories))}
      userRole={userRole}
    />
  );
}
