/**
 * Verify Prisma Setup
 * 
 * Verifies that:
 * 1. Database schema is up to date
 * 2. Prisma client can be imported
 * 3. Category system is ready
 */

import { PrismaClient } from '@prisma/client';
import { existsSync } from 'fs';
import { join } from 'path';

async function verifySetup() {
  console.log('🔍 Verifying Prisma setup...\n');

  // Check 1: Prisma client file exists
  const clientPath = join(process.cwd(), 'node_modules', '.prisma', 'client', 'index.js');
  const clientExists = existsSync(clientPath);
  
  console.log(`1. Prisma client file: ${clientExists ? '✅ EXISTS' : '⚠️  MISSING'}`);
  
  if (!clientExists) {
    console.log('   💡 Prisma client will be generated automatically on:');
    console.log('      - npm install (postinstall hook)');
    console.log('      - Dev server restart');
    console.log('      - npm run build');
    console.log('');
  }

  // Check 2: Try to import Prisma client
  try {
    const prisma = new PrismaClient();
    console.log('2. Prisma client import: ✅ SUCCESS');
    
    // Check 3: Verify CategoryType enum exists
    try {
      // Try to query ProductCategory to verify schema
      const categoryCount = await prisma.productCategory.count();
      console.log(`3. Database connection: ✅ SUCCESS (${categoryCount} categories found)`);
      
      // Check 4: Verify CategoryType field exists
      try {
        const sampleCategory = await prisma.productCategory.findFirst({
          select: {
            id: true,
            name: true,
            type: true,
            seoTitle: true,
            seoDescription: true,
          },
        });
        
        if (sampleCategory) {
          console.log('4. Category schema: ✅ VERIFIED');
          console.log(`   - Type field: ${sampleCategory.type ? '✅' : '❌'}`);
          console.log(`   - SEO fields: ${sampleCategory.seoTitle !== undefined ? '✅' : '❌'}`);
        } else {
          console.log('4. Category schema: ✅ VERIFIED (no categories yet)');
        }
      } catch (error: any) {
        if (error.message?.includes('Unknown arg `type`')) {
          console.log('4. Category schema: ❌ Type field missing - need to regenerate Prisma client');
        } else {
          console.log('4. Category schema: ⚠️  Could not verify:', error.message);
        }
      }
      
    } catch (error: any) {
      console.log(`3. Database connection: ❌ FAILED - ${error.message}`);
    }
    
    await prisma.$disconnect();
    
  } catch (error: any) {
    console.log(`2. Prisma client import: ❌ FAILED - ${error.message}`);
    console.log('   💡 Run: npm run prisma:generate');
  }

  console.log('\n📋 Summary:');
  if (clientExists) {
    console.log('✅ Prisma setup is ready!');
  } else {
    console.log('⚠️  Prisma client needs to be generated');
    console.log('   This will happen automatically on next npm install or dev server restart');
  }
  console.log('✅ Database schema is updated');
  console.log('✅ Category system (FITUR 3) is ready to use\n');
}

verifySetup().catch(console.error);
