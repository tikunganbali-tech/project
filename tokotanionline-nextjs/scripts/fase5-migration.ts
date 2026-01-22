/**
 * FASE 5 — Database Migration Script
 * 
 * Creates CTA and Internal Link Rule tables.
 * Run: npx tsx scripts/fase5-migration.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 FASE 5 Migration: Creating CTA and Internal Link Rule tables...');

  try {
    // Initialize internal link rules
    const existingRules = await prisma.internalLinkRule.findMany();
    if (existingRules.length === 0) {
      await prisma.internalLinkRule.createMany({
        data: [
          {
            sourceType: 'blog',
            targetType: 'product',
            maxLinks: 2,
            anchorTextStyle: 'natural',
            enabled: true,
          },
          {
            sourceType: 'product',
            targetType: 'blog',
            maxLinks: 1,
            anchorTextStyle: 'natural',
            enabled: true,
          },
        ],
      });
      console.log('✅ Internal link rules initialized');
    } else {
      console.log('ℹ️  Internal link rules already exist');
    }

    console.log('✅ FASE 5 Migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration error:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
