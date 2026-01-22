/**
 * STEP 21B: Activity API
 * GET /api/admin/activity
 * 
 * Purpose: Menggabungkan activity dari berbagai sumber untuk audit trail
 * - EventLog, ActionApproval, ContentJob, BlogPost, TrackingEvent
 * - Format manusiawi, bukan log teknis
 * - Filter & pagination
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import * as logger from '@/lib/logger';

interface ActivityItem {
  id: string;
  type: 'system' | 'content' | 'product' | 'engine';
  category: string;
  title: string;
  description: string;
  timestamp: Date;
  metadata?: any;
}

// Helper: Get admin name by ID
async function getAdminName(adminId: string): Promise<string> {
  try {
    const admin = await prisma.admin.findUnique({
      where: { id: adminId },
      select: { name: true },
    });
    return admin?.name || 'Admin';
  } catch {
    return 'Admin';
  }
}

// Helper: Get product name by ID
async function getProductName(productId: string): Promise<string> {
  try {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { name: true },
    }).catch(() => null);
    
    if (!product) {
      const catalogProduct = await prisma.catalogProduct.findUnique({
        where: { id: productId },
        select: { name: true },
      }).catch(() => null);
      return catalogProduct?.name || productId;
    }
    
    return product.name;
  } catch {
    return productId;
  }
}

// Helper: Get blog title by ID
async function getBlogTitle(blogId: string): Promise<string> {
  try {
    const blog = await prisma.blog.findUnique({
      where: { id: blogId },
      select: { title: true },
    }).catch(() => null);
    
    if (!blog) {
      const blogPost = await prisma.blogPost.findUnique({
        where: { id: blogId },
        select: { title: true },
      }).catch(() => null);
      return blogPost?.title || blogId;
    }
    
    return blog.title;
  } catch {
    return blogId;
  }
}

export async function GET(request: NextRequest) {
  try {
    // Auth check
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = (session.user as any)?.role;
    if (userRole !== 'super_admin' && userRole !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Parse query params
    const { searchParams } = new URL(request.url);
    const filter = searchParams.get('filter') || 'all'; // all, system, content, product, engine
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    const activities: ActivityItem[] = [];

    // 1. ContentJob activities
    if (filter === 'all' || filter === 'content' || filter === 'engine') {
      try {
        const jobs = await prisma.contentJob.findMany({
          take: 100, // Get more to sort later
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            type: true,
            status: true,
            requestedBy: true,
            createdAt: true,
          },
        });

        for (const job of jobs) {
          const adminName = await getAdminName(job.requestedBy);
          const typeMap: Record<string, string> = {
            GENERATE: 'Generate',
            REFRESH: 'Refresh',
            OPTIMIZE: 'Optimize',
          };
          
          activities.push({
            id: `job_${job.id}`,
            type: filter === 'engine' ? 'engine' : 'content',
            category: 'Content Job',
            title: `Content job ${typeMap[job.type] || job.type} dibuat`,
            description: `Admin ${adminName} membuat job ${typeMap[job.type] || job.type} dengan status ${job.status}`,
            timestamp: job.createdAt,
            metadata: { jobId: job.id, type: job.type, status: job.status },
          });
        }
      } catch (error) {
        logger.error('Error fetching ContentJob activities:', error);
      }
    }

    // 2. ActionApproval activities
    if (filter === 'all' || filter === 'product' || filter === 'system') {
      try {
        const approvals = await prisma.actionApproval.findMany({
          take: 100, // Get more to sort later
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            actionType: true,
            action: true,
            status: true,
            requestedBy: true,
            approvedBy: true,
            createdAt: true,
            approvedAt: true,
            executedAt: true,
          },
        });

        for (const approval of approvals) {
          const requesterName = await getAdminName(approval.requestedBy);
          const approverName = approval.approvedBy ? await getAdminName(approval.approvedBy) : null;
          
          let title = '';
          let description = '';
          
          if (approval.status === 'APPROVED' && approval.approvedAt) {
            title = `Aksi ${approval.action} disetujui`;
            description = approverName 
              ? `Admin ${approverName} menyetujui aksi ${approval.action} yang diminta oleh ${requesterName}`
              : `Aksi ${approval.action} disetujui (diminta oleh ${requesterName})`;
          } else if (approval.status === 'EXECUTED' && approval.executedAt) {
            title = `Aksi ${approval.action} dieksekusi`;
            description = `Aksi ${approval.action} telah dieksekusi`;
          } else if (approval.status === 'REJECTED') {
            title = `Aksi ${approval.action} ditolak`;
            description = approverName 
              ? `Admin ${approverName} menolak aksi ${approval.action} yang diminta oleh ${requesterName}`
              : `Aksi ${approval.action} ditolak`;
          } else {
            title = `Aksi ${approval.action} diminta`;
            description = `Admin ${requesterName} meminta aksi ${approval.action}`;
          }

          activities.push({
            id: `approval_${approval.id}`,
            type: filter === 'product' ? 'product' : 'system',
            category: 'Action Approval',
            title,
            description,
            timestamp: approval.executedAt || approval.approvedAt || approval.createdAt,
            metadata: { approvalId: approval.id, action: approval.action, status: approval.status },
          });
        }
      } catch (error) {
        logger.error('Error fetching ActionApproval activities:', error);
      }
    }

    // 3. BlogPost publish activities
    if (filter === 'all' || filter === 'content') {
      try {
        const publishedPosts = await prisma.blogPost.findMany({
          where: {
            status: 'PUBLISHED',
            publishedAt: { not: null },
          },
          take: 100, // Get more to sort later
          orderBy: { publishedAt: 'desc' },
          select: {
            id: true,
            title: true,
            publishedAt: true,
          },
        });

        for (const post of publishedPosts) {
          if (post.publishedAt) {
            activities.push({
              id: `post_${post.id}`,
              type: 'content',
              category: 'Content',
              title: `Artikel "${post.title}" dipublish`,
              description: `Artikel "${post.title}" telah dipublish`,
              timestamp: post.publishedAt,
              metadata: { postId: post.id, title: post.title },
            });
          }
        }
      } catch (error) {
        logger.error('Error fetching BlogPost activities:', error);
      }
    }

    // 4. Blog publish activities (legacy)
    if (filter === 'all' || filter === 'content') {
      try {
        const publishedBlogs = await prisma.blog.findMany({
          where: {
            status: 'published',
            publishedAt: { not: null },
          },
          take: 100, // Get more to sort later
          orderBy: { publishedAt: 'desc' },
          select: {
            id: true,
            title: true,
            publishedAt: true,
          },
        });

        for (const blog of publishedBlogs) {
          if (blog.publishedAt) {
            activities.push({
              id: `blog_${blog.id}`,
              type: 'content',
              category: 'Content',
              title: `Artikel "${blog.title}" dipublish`,
              description: `Artikel "${blog.title}" telah dipublish`,
              timestamp: blog.publishedAt,
              metadata: { blogId: blog.id, title: blog.title },
            });
          }
        }
      } catch (error) {
        logger.error('Error fetching Blog activities:', error);
      }
    }

    // Sort by timestamp (newest first)
    activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // Apply pagination after sorting
    const total = activities.length;
    const paginatedActivities = activities.slice(offset, offset + limit);

    return NextResponse.json({
      activities: paginatedActivities.map(a => ({
        ...a,
        timestamp: a.timestamp.toISOString(),
      })),
      total,
      page,
      limit,
    });
  } catch (error: any) {
    logger.error('Error fetching activities:', error);
    return NextResponse.json(
      { error: 'Failed to fetch activities' },
      { status: 500 }
    );
  }
}

