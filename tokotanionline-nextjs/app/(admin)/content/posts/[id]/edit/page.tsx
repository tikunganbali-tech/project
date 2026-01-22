import PostFormClient from '@/components/admin/PostFormClient';
import { prisma } from '@/lib/db';
import { notFound } from 'next/navigation';

export default async function EditPostPage({
  params,
}: {
  params: { id: string };
}) {
  const post = await prisma.post.findUnique({
    where: { id: params.id },
  });

  if (!post) {
    notFound();
  }

  return <PostFormClient post={JSON.parse(JSON.stringify(post))} />;
}

