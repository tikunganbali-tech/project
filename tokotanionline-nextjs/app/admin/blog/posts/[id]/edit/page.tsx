/**
 * PHASE 3.2.3: Admin Blog Post Edit Page
 * 
 * Server component untuk edit existing blog post
 */

import BlogPostFormClient from '@/components/admin/BlogPostFormClient';
import { prisma } from '@/lib/db';
import { getServerSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { hasPermission } from '@/lib/permissions';
import { Prisma } from '@prisma/client';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function EditBlogPostPage({
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
  if (!hasPermission(userRole, 'content.manage')) {
    redirect('/admin');
  }

  // Fetch blog post (defensive: return null if not found)
  let post: Prisma.BlogPostGetPayload<{
    include: {
      author: {
        select: {
          id: true;
          name: true;
          email: true;
        };
      };
    };
  }> | null = null;
  try {
    post = await prisma.blogPost.findUnique({
      where: { id: params.id },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  } catch (error: any) {
    console.error('Error fetching blog post:', error);
    post = null;
  }

  if (!post) {
    redirect('/admin/blog/posts');
  }

  return (
    <BlogPostFormClient
      post={JSON.parse(JSON.stringify(post))}
      userRole={userRole}
    />
  );
}
