import CatalogProductsManagerClient from '@/components/admin/CatalogProductsManagerClient';
import { prisma } from '@/lib/db';

export default async function AdminCatalogProductsPage() {
  const products = await prisma.catalogProduct.findMany({
    orderBy: {
      createdAt: 'desc',
    },
  });

  return (
    <CatalogProductsManagerClient products={JSON.parse(JSON.stringify(products))} />
  );
}

