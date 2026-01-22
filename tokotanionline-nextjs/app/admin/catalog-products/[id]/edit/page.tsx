import CatalogProductFormClient from '@/components/admin/CatalogProductFormClient';
import { prisma } from '@/lib/db';
import { notFound } from 'next/navigation';

export default async function EditCatalogProductPage({
  params,
}: {
  params: { id: string };
}) {
  const product = await prisma.catalogProduct.findUnique({
    where: { id: params.id },
  });

  if (!product) {
    notFound();
  }

  return <CatalogProductFormClient product={JSON.parse(JSON.stringify(product))} />;
}

