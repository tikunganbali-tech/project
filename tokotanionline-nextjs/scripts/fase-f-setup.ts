/**
 * FASE F — Setup Script
 * 
 * Run: npx tsx scripts/fase-f-setup.ts
 * 
 * Purpose:
 * 1. Enable feature flags (salesEnabled, phaseFSocialProofEnabled)
 * 2. Create initial SalesAdmin
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function setupFaseF() {
  try {
    console.log('🚀 Starting FASE F setup...\n');

    // 1. Enable Feature Flags
    console.log('📌 Step 1: Enabling feature flags...');
    const settings = await prisma.siteSettings.findFirst();

    if (!settings) {
      console.log('❌ No SiteSettings found. Creating one...');
      await prisma.siteSettings.create({
        data: {
          salesEnabled: true,
          phaseFSocialProofEnabled: true,
          primaryColor: '#16a34a',
          secondaryColor: '#15803d',
          fontFamily: 'Inter',
          heroEnabled: true,
          ctaEnabled: true,
          testimonialsEnabled: true,
          socialProofEnabled: true,
          showFeaturedProducts: true,
          showLatestPosts: true,
        },
      });
      console.log('✅ SiteSettings created with feature flags enabled');
    } else {
      await prisma.siteSettings.update({
        where: { id: settings.id },
        data: {
          salesEnabled: true,
          phaseFSocialProofEnabled: true,
        },
      });
      console.log('✅ Feature flags enabled:');
      console.log('  - salesEnabled: true');
      console.log('  - phaseFSocialProofEnabled: true');
    }

    // 2. Create Initial SalesAdmin
    console.log('\n📌 Step 2: Creating initial SalesAdmin...');
    
    // Check if SalesAdmin already exists
    const existingAdmins = await prisma.salesAdmin.findMany();
    
    if (existingAdmins.length > 0) {
      console.log(`ℹ️  ${existingAdmins.length} SalesAdmin(s) already exist(s)`);
      console.log('   Skipping initial SalesAdmin creation');
    } else {
      // Create default SalesAdmin (you should replace with actual data)
      const defaultAdmin = await prisma.salesAdmin.create({
        data: {
          name: 'Sales Admin',
          whatsapp: '6281234567890', // REPLACE WITH ACTUAL WHATSAPP NUMBER
          shopeeLink: null, // Optional: Add Shopee link if available
          tokopediaLink: null, // Optional: Add Tokopedia link if available
          isActive: true,
          activeHours: null, // Optional: e.g., "08:00-17:00"
          sortOrder: 0,
          clickCount: 0,
        },
      });

      console.log('✅ Initial SalesAdmin created:');
      console.log(`   ID: ${defaultAdmin.id}`);
      console.log(`   Name: ${defaultAdmin.name}`);
      console.log(`   WhatsApp: ${defaultAdmin.whatsapp}`);
      console.log('   ⚠️  IMPORTANT: Update WhatsApp number with actual number!');
    }

    console.log('\n✅ FASE F setup completed successfully!');
    console.log('\n📋 Next steps:');
    console.log('   1. Update SalesAdmin WhatsApp number with actual number');
    console.log('   2. Add Shopee/Tokopedia links if available');
    console.log('   3. Create additional SalesAdmins via API or admin UI');
    console.log('   4. Test buy flow on product page');
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    if (error.code) {
      console.error(`   Code: ${error.code}`);
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

setupFaseF();
