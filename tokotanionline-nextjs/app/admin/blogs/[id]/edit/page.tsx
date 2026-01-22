import BlogFormClient from '@/components/admin/BlogFormClient';
import { prisma } from '@/lib/db';
import { notFound } from 'next/navigation';

export default async function EditBlogPage({ params }: { params: { id: string } }) {
  const blog = await prisma.blog.findUnique({
    where: { id: params.id },
    include: {
      blogProducts: {
        include: {
          product: true,
        },
      },
    },
  });

  if (!blog) {
    notFound();
  }

  const categories = await prisma.blogCategory.findMany({
    orderBy: { name: 'asc' },
  });

  const products = await prisma.product.findMany({
    where: { isActive: true },
    select: { id: true, name: true, slug: true },
    orderBy: { name: 'asc' },
  });

  return (
    <BlogFormClient
      blog={JSON.parse(JSON.stringify(blog))}
      categories={JSON.parse(JSON.stringify(categories))}
      products={JSON.parse(JSON.stringify(products))}
    />
  );
}



