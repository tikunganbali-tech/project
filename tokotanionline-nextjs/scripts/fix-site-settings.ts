/**
 * Fix SiteSettings NULL fields
 * Run: npx tsx scripts/fix-site-settings.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixSiteSettings() {
  try {
    const settings = await prisma.siteSettings.findFirst();
    
    if (!settings) {
      console.log('❌ No SiteSettings found');
      return;
    }

    console.log('🔍 Current SiteSettings:');
    console.log(`  logoDark: ${settings.logoDark === null ? 'NULL' : settings.logoDark}`);
    console.log(`  favicon: ${settings.favicon === null ? 'NULL' : settings.favicon}`);

    const updates: any = {};
    
    if (settings.logoDark === null) {
      updates.logoDark = '';
    }
    if (settings.favicon === null) {
      updates.favicon = '';
    }

    if (Object.keys(updates).length > 0) {
      await prisma.siteSettings.update({
        where: { id: settings.id },
        data: updates,
      });
      console.log('✅ SiteSettings updated:');
      Object.keys(updates).forEach((key) => {
        console.log(`  ${key}: '' (empty string)`);
      });
    } else {
      console.log('✅ No updates needed');
    }
  } catch (error: any) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

fixSiteSettings();
