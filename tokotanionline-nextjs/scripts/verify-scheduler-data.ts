/**
 * Verify Scheduler Data Script
 * Checks if there are ACTIVE schedules and PENDING keywords ready to be processed
 * 
 * Usage: npx tsx scripts/verify-scheduler-data.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifySchedulerData() {
  console.log('🔍 Checking scheduler data...\n');

  try {
    // Check ACTIVE schedules
    const activeSchedules = await prisma.contentSchedule.findMany({
      where: { status: 'ACTIVE' },
      include: {
        keywords: {
          where: { status: 'PENDING' },
          select: {
            id: true,
            primaryKeyword: true,
            status: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    console.log(`📋 Active Schedules: ${activeSchedules.length}`);
    
    if (activeSchedules.length === 0) {
      console.log('❌ NO ACTIVE SCHEDULES FOUND');
      console.log('   → Worker will not process anything without ACTIVE schedules');
      console.log('   → Create a schedule with status = ACTIVE first\n');
    } else {
      activeSchedules.forEach((schedule, idx) => {
        const now = new Date();
        const startDate = new Date(schedule.startDate);
        const endDate = schedule.endDate ? new Date(schedule.endDate) : null;
        
        const isInDateRange = now >= startDate && (!endDate || now <= endDate);
        const pendingCount = schedule.keywords.length;

        console.log(`\n${idx + 1}. ${schedule.name}`);
        console.log(`   Mode: ${schedule.mode}`);
        console.log(`   Status: ${schedule.status}`);
        console.log(`   Production/Day: ${schedule.productionPerDay}`);
        console.log(`   Time Window: ${schedule.timeWindowStart} - ${schedule.timeWindowEnd}`);
        console.log(`   Publish Mode: ${schedule.publishMode}`);
        console.log(`   Start Date: ${startDate.toISOString()}`);
        if (endDate) {
          console.log(`   End Date: ${endDate.toISOString()}`);
        }
        console.log(`   Date Range: ${isInDateRange ? '✅ IN RANGE' : '❌ OUT OF RANGE'}`);
        console.log(`   PENDING Keywords: ${pendingCount}`);

        if (pendingCount === 0) {
          console.log('   ⚠️  No PENDING keywords - worker cannot generate content');
        } else {
          console.log('   ✅ Has PENDING keywords - ready to process');
          if (pendingCount > 0 && pendingCount <= 5) {
            console.log('   Keywords:');
            schedule.keywords.forEach(kw => {
              console.log(`     - ${kw.primaryKeyword} (created: ${new Date(kw.createdAt).toISOString()})`);
            });
          }
        }
      });
    }

    // Summary
    const totalPending = await prisma.scheduleKeyword.count({
      where: { status: 'PENDING' },
    });

    const totalProcessing = await prisma.scheduleKeyword.count({
      where: { status: 'PROCESSING' },
    });

    const totalDone = await prisma.scheduleKeyword.count({
      where: { status: 'DONE' },
    });

    const totalFailed = await prisma.scheduleKeyword.count({
      where: { status: 'FAILED' },
    });

    console.log('\n📊 Keyword Status Summary:');
    console.log(`   PENDING: ${totalPending}`);
    console.log(`   PROCESSING: ${totalProcessing}`);
    console.log(`   DONE: ${totalDone}`);
    console.log(`   FAILED: ${totalFailed}`);

    // Check today's production
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayEnd.getDate() + 1);

    const doneToday = await prisma.scheduleKeyword.count({
      where: {
        status: 'DONE',
        updatedAt: {
          gte: todayStart,
          lt: todayEnd,
        },
      },
    });

    console.log(`\n📅 Today's Production: ${doneToday} keyword(s) processed`);

    // Recommendations
    console.log('\n💡 Recommendations:');
    
    if (activeSchedules.length === 0) {
      console.log('   1. Create a ContentSchedule with status = ACTIVE');
      console.log('   2. Add ScheduleKeyword records with status = PENDING');
    } else if (totalPending === 0) {
      console.log('   1. Add ScheduleKeyword records with status = PENDING');
      console.log('   2. Worker will process them automatically');
    } else {
      console.log('   ✅ Ready to process! Worker should pick up PENDING keywords');
      console.log('   → Check worker logs for processing activity');
    }

    if (activeSchedules.length > 0 && totalPending > 0) {
      console.log('\n✅ SCHEDULER DATA READY');
      console.log('   Worker can now process PENDING keywords');
    } else {
      console.log('\n❌ SCHEDULER DATA NOT READY');
      console.log('   Fix the issues above before worker can process');
    }

  } catch (error: any) {
    console.error('❌ Error checking scheduler data:', error.message);
    if (error.message.includes('does not exist')) {
      console.error('\n💡 Solution:');
      console.error('   Run: npx prisma db push');
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

verifySchedulerData();
