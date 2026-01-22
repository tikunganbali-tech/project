/**
 * Check Blog Posts Script
 * Queries the latest blog posts from database
 * 
 * Usage: npx tsx scripts/check-blog-posts.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkBlogPosts() {
  console.log('🔍 Checking latest blog posts...\n');

  try {
    const posts = await prisma.blogPost.findMany({
      select: {
        id: true,
        title: true,
        status: true,
        publishedAt: true,
        scheduledAt: true,
        createdAt: true,
        primaryKeyword: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 5,
    });

    console.log(`📋 Latest 5 Blog Posts:\n`);
    
    if (posts.length === 0) {
      console.log('   No blog posts found in database');
    } else {
      posts.forEach((post, idx) => {
        console.log(`${idx + 1}. ${post.title}`);
        console.log(`   ID: ${post.id}`);
        console.log(`   Status: ${post.status}`);
        console.log(`   Primary Keyword: ${post.primaryKeyword || 'N/A'}`);
        console.log(`   Created: ${post.createdAt.toISOString()}`);
        console.log(`   Published: ${post.publishedAt ? post.publishedAt.toISOString() : 'Not published'}`);
        console.log(`   Scheduled: ${post.scheduledAt ? post.scheduledAt.toISOString() : 'Not scheduled'}`);
        console.log('');
      });
    }

    // Count by status
    const statusCounts = await prisma.blogPost.groupBy({
      by: ['status'],
      _count: {
        id: true,
      },
    });

    console.log('📊 Status Summary:');
    statusCounts.forEach((stat) => {
      console.log(`   ${stat.status}: ${stat._count.id}`);
    });

  } catch (error: any) {
    console.error('❌ Error checking blog posts:', error.message);
    if (error.message.includes('does not exist')) {
      console.error('\n💡 Solution:');
      console.error('   Run: npx prisma db push');
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

checkBlogPosts();
