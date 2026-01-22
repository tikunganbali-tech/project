/**
 * PHASE 3.2.3: Admin Blog Post New Page
 * 
 * Server component untuk create new blog post
 */

import BlogPostFormClient from '@/components/admin/BlogPostFormClient';
import { getServerSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { hasPermission } from '@/lib/permissions';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function NewBlogPostPage() {
  // Authentication & permission check
  const session = await getServerSession();
  if (!session || !session.user) {
    redirect('/admin/login');
  }

  const userRole = (session.user as any).role;
  if (!hasPermission(userRole, 'content.manage')) {
    redirect('/admin');
  }

  return <BlogPostFormClient userRole={userRole} />;
}
