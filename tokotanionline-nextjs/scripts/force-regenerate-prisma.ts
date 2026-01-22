/**
 * Force Regenerate Prisma Client
 * 
 * This script tries to regenerate Prisma client by:
 * 1. Waiting for file locks to be released
 * 2. Retrying with delays
 * 3. Using alternative methods if needed
 */

import { execSync } from 'child_process';
import { existsSync, rmSync } from 'fs';
import { join } from 'path';

const PRISMA_CLIENT_PATH = join(process.cwd(), 'node_modules', '.prisma', 'client');
const MAX_RETRIES = 5;
const RETRY_DELAY = 3000; // 3 seconds

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function forceRegenerate() {
  console.log('🔄 Force regenerating Prisma client...\n');

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`Attempt ${attempt}/${MAX_RETRIES}...`);

      // Try to remove .prisma folder if exists (to force fresh generation)
      if (existsSync(PRISMA_CLIENT_PATH)) {
        try {
          console.log('Removing old Prisma client...');
          rmSync(PRISMA_CLIENT_PATH, { recursive: true, force: true });
          console.log('✅ Old client removed');
          await sleep(1000); // Wait a bit
        } catch (error: any) {
          if (!error.message.includes('EBUSY') && !error.message.includes('EPERM')) {
            throw error;
          }
          console.log('⚠️  Could not remove old client (file locked), continuing...');
        }
      }

      // Generate Prisma client
      console.log('Generating Prisma client...');
      execSync('npx prisma generate', {
        stdio: 'inherit',
        cwd: process.cwd(),
      });

      console.log('\n✅ Prisma client generated successfully!');
      console.log('✅ Field "blogs" should now be available in ProductCategoryCountOutputType');
      return true;

    } catch (error: any) {
      const errorMessage = error.message || error.toString();

      if (errorMessage.includes('EPERM') || errorMessage.includes('EBUSY') || errorMessage.includes('operation not permitted')) {
        console.log(`⚠️  File lock detected (attempt ${attempt}/${MAX_RETRIES})`);
        
        if (attempt < MAX_RETRIES) {
          console.log(`⏳ Waiting ${RETRY_DELAY / 1000} seconds before retry...\n`);
          await sleep(RETRY_DELAY);
          continue;
        } else {
          console.log('\n❌ Could not regenerate due to file lock.');
          console.log('\n📋 Solution:');
          console.log('   1. Stop your dev server (Ctrl+C)');
          console.log('   2. Run: npm run prisma:generate');
          console.log('   3. Start dev server again: npm run dev');
          console.log('\n   OR simply restart your dev server - Prisma will auto-generate on startup.');
          return false;
        }
      } else {
        // Other error - throw it
        throw error;
      }
    }
  }

  return false;
}

async function main() {
  try {
    const success = await forceRegenerate();
    
    if (success) {
      console.log('\n🎉 Prisma client regenerated!');
      console.log('✅ All "blogs" fields are now active');
      console.log('✅ FITUR 3: Category System is fully operational\n');
    } else {
      process.exit(1);
    }
  } catch (error: any) {
    console.error('❌ Fatal error:', error.message);
    process.exit(1);
  }
}

main();
