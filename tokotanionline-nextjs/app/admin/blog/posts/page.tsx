/**
 * PHASE 3.2.3: Admin Blog Posts Listing Page
 * 
 * Server component untuk fetch blog posts dengan author info
 */

import BlogPostsManagerClient from '@/components/admin/BlogPostsManagerClient';
import { prisma } from '@/lib/db';
import { getServerSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { hasPermission } from '@/lib/permissions';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function AdminBlogPostsPage() {
  // Authentication & permission check
  const session = await getServerSession();
  if (!session || !session.user) {
    redirect('/admin/login');
  }

  const userRole = (session.user as any).role;
  if (!hasPermission(userRole, 'content.manage')) {
    redirect('/admin');
  }

  // Fetch blog posts with author (defensive: return empty if table doesn't exist)
  let posts: any[] = [];
  try {
    posts = await prisma.blogPost.findMany({
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        approver: { // PHASE S
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        updatedAt: 'desc', // FASE 2.2: Sort by Updated At DESC
      },
    });
  } catch (error: any) {
    // Defensive: if table doesn't exist, return empty array
    console.error('Error fetching blog posts:', error);
    posts = [];
  }

  return (
    <BlogPostsManagerClient
      initialPosts={JSON.parse(JSON.stringify(posts))}
      userRole={userRole}
    />
  );
}
