import PostsManagerClient from '@/components/admin/PostsManagerClient';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export default async function AdminPostsPage() {
  const posts = await prisma.post.findMany({
    orderBy: {
      createdAt: 'desc',
    },
  });

  return (
    <PostsManagerClient
      posts={JSON.parse(JSON.stringify(posts))}
    />
  );
}

