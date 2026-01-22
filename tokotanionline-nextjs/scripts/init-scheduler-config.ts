#!/usr/bin/env tsx
/**
 * FASE 4 — INITIALIZE SCHEDULER CONFIG
 * 
 * Script untuk initialize default scheduler config
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔧 Initializing Scheduler Config...\n');

  try {
    // Check if config exists
    const existing = await prisma.schedulerConfig.findFirst();
    
    if (existing) {
      console.log('✅ SchedulerConfig already exists:');
      console.log(`   - Enabled: ${existing.enabled}`);
      console.log(`   - Daily Quota: ${existing.dailyQuota}`);
      console.log(`   - Timezone: ${existing.timezone}`);
      console.log(`   - Run Windows: ${existing.runWindows.join(', ')}`);
      console.log('\n💡 To update, use admin panel at /admin/scheduler\n');
      return;
    }

    // Create default config
    const config = await prisma.schedulerConfig.create({
      data: {
        enabled: false, // Default: disabled (admin must enable manually)
        timezone: 'Asia/Jakarta',
        dailyQuota: 3,
        runWindows: ['09:00-21:00'],
        contentMix: JSON.stringify({ blog: 3, product: 2 }),
      },
    });

    console.log('✅ SchedulerConfig created successfully:');
    console.log(`   - ID: ${config.id}`);
    console.log(`   - Enabled: ${config.enabled} (disabled by default)`);
    console.log(`   - Daily Quota: ${config.dailyQuota}`);
    console.log(`   - Timezone: ${config.timezone}`);
    console.log(`   - Run Windows: ${config.runWindows.join(', ')}`);
    console.log(`   - Content Mix: ${config.contentMix}`);
    console.log('\n💡 Enable scheduler from admin panel: /admin/scheduler\n');
  } catch (error: any) {
    if (error.message?.includes('does not exist') || error.message?.includes('Unknown table')) {
      console.error('❌ ERROR: SchedulerConfig table does not exist');
      console.error('   Run: npx prisma db push\n');
      process.exit(1);
    } else {
      console.error('❌ ERROR:', error.message);
      process.exit(1);
    }
  }
}

main()
  .catch((error) => {
    console.error('Failed to initialize config:', error);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });
