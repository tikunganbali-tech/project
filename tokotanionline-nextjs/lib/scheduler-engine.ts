/**
 * PHASE S: Scheduler Engine (PASIF & AMAN)
 * 
 * PRINSIP KERAS:
 * - TIDAK ADA AUTO-PUBLISH
 * - TIDAK ADA CRON YANG MENULIS DATA LANGSUNG
 * - Scheduler HANYA mengecek konten SCHEDULED
 * - Menandai "Sudah waktunya" → FLAG sebagai READY_TO_PUBLISH
 * - TIDAK MENULIS publish
 * - Publish TETAP lewat admin action manual
 * 
 * Usage:
 * - Call checkScheduledContent() secara periodik (via API endpoint atau cron job)
 * - Engine hanya update status: SCHEDULED → READY_TO_PUBLISH (jika waktu sudah tiba)
 * - Tidak ada auto-publish, tidak ada side effects lainnya
 */

import { prisma } from '@/lib/db';

interface SchedulerCheckResult {
  blogPostsChecked: number;
  blogPostsMarkedReady: number;
  productsChecked: number;
  productsMarkedReady: number;
  errors: string[];
}

/**
 * Check scheduled content and mark as READY_TO_PUBLISH if time has arrived
 * 
 * PENTING: Hanya flagging, TIDAK publish otomatis
 */
export async function checkScheduledContent(): Promise<SchedulerCheckResult> {
  const result: SchedulerCheckResult = {
    blogPostsChecked: 0,
    blogPostsMarkedReady: 0,
    productsChecked: 0,
    productsMarkedReady: 0,
    errors: [],
  };

  const now = new Date();

  try {
    // Check Blog Posts with status SCHEDULED where scheduledAt <= now
    const scheduledBlogPosts = await prisma.blogPost.findMany({
      where: {
        status: 'SCHEDULED',
        scheduledAt: {
          lte: now, // scheduledAt <= now (waktu sudah tiba)
        },
      },
      select: {
        id: true,
        title: true,
        scheduledAt: true,
      },
    });

    result.blogPostsChecked = scheduledBlogPosts.length;

    // Mark each as READY_TO_PUBLISH (HANYA flagging, tidak publish)
    for (const post of scheduledBlogPosts) {
      try {
        await prisma.blogPost.update({
          where: { id: post.id },
          data: {
            status: 'READY_TO_PUBLISH',
            // approvedBy dan approvedAt tetap null (belum disetujui manusia)
          },
        });

        // Audit log - content_ready_for_publish (flagging only)
        try {
          await prisma.eventLog.create({
            data: {
              event: 'content_ready_for_publish',
              url: `/admin/blog/posts/${post.id}`,
              meta: {
                postId: post.id,
                scheduledAt: post.scheduledAt?.toISOString() || null,
                timestamp: now.toISOString(),
                note: 'Automatically marked as READY_TO_PUBLISH by scheduler engine. Manual approval still required.',
              },
            },
          });
        } catch (logError) {
          // Non-blocking: log error but don't fail
          console.error('Failed to log ready_for_publish event:', logError);
        }

        result.blogPostsMarkedReady++;
      } catch (error: any) {
        result.errors.push(`Failed to mark blog post ${post.id} as ready: ${error.message}`);
        console.error(`Error marking blog post ${post.id} as ready:`, error);
      }
    }

    // Check Products with status SCHEDULED where scheduledAt <= now
    const scheduledProducts = await prisma.product.findMany({
      where: {
        status: 'SCHEDULED',
        scheduledAt: {
          lte: now, // scheduledAt <= now (waktu sudah tiba)
        },
      },
      select: {
        id: true,
        name: true,
        scheduledAt: true,
      },
    });

    result.productsChecked = scheduledProducts.length;

    // Mark each as READY_TO_PUBLISH (HANYA flagging, tidak publish)
    for (const product of scheduledProducts) {
      try {
        await prisma.product.update({
          where: { id: product.id },
          data: {
            status: 'READY_TO_PUBLISH',
            // approvedBy dan approvedAt tetap null (belum disetujui manusia)
          },
        });

        // Audit log - product_ready_for_publish (flagging only)
        try {
          await prisma.eventLog.create({
            data: {
              event: 'product_ready_for_publish',
              url: `/admin/products/${product.id}`,
              meta: {
                productId: product.id,
                scheduledAt: product.scheduledAt?.toISOString() || null,
                timestamp: now.toISOString(),
                note: 'Automatically marked as READY_TO_PUBLISH by scheduler engine. Manual approval still required.',
              },
            },
          });
        } catch (logError) {
          // Non-blocking: log error but don't fail
          console.error('Failed to log ready_for_publish event:', logError);
        }

        result.productsMarkedReady++;
      } catch (error: any) {
        result.errors.push(`Failed to mark product ${product.id} as ready: ${error.message}`);
        console.error(`Error marking product ${product.id} as ready:`, error);
      }
    }

    return result;
  } catch (error: any) {
    result.errors.push(`Scheduler engine error: ${error.message}`);
    console.error('Scheduler engine error:', error);
    return result;
  }
}

/**
 * Get summary of scheduled content
 * 
 * Returns counts of scheduled content for monitoring
 */
export async function getScheduledContentSummary() {
  const now = new Date();

  const [scheduledBlogPosts, readyBlogPosts, scheduledProducts, readyProducts] = await Promise.all([
    // Blog posts dengan status SCHEDULED
    prisma.blogPost.count({
      where: {
        status: 'SCHEDULED',
      },
    }),
    // Blog posts dengan status READY_TO_PUBLISH
    prisma.blogPost.count({
      where: {
        status: 'READY_TO_PUBLISH',
      },
    }),
    // Products dengan status SCHEDULED
    prisma.product.count({
      where: {
        status: 'SCHEDULED',
      },
    }),
    // Products dengan status READY_TO_PUBLISH
    prisma.product.count({
      where: {
        status: 'READY_TO_PUBLISH',
      },
    }),
  ]);

  return {
    blogPosts: {
      scheduled: scheduledBlogPosts,
      readyToPublish: readyBlogPosts,
    },
    products: {
      scheduled: scheduledProducts,
      readyToPublish: readyProducts,
    },
    lastChecked: new Date().toISOString(),
  };
}
