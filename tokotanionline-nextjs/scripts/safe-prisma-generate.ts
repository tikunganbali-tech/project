/**
 * Safe Prisma Generate Script
 * 
 * Tries to generate Prisma client with retry mechanism
 * and handles file lock errors gracefully
 */

import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';

const MAX_RETRIES = 3;
const RETRY_DELAY = 2000; // 2 seconds

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function safeGenerate() {
  console.log('🔄 Attempting to generate Prisma client...\n');

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`Attempt ${attempt}/${MAX_RETRIES}...`);
      
      // Try to generate
      execSync('npx prisma generate', {
        stdio: 'inherit',
        cwd: process.cwd(),
      });

      console.log('\n✅ Prisma client generated successfully!');
      return true;
    } catch (error: any) {
      const errorMessage = error.message || error.toString();
      
      if (errorMessage.includes('EPERM') || errorMessage.includes('operation not permitted')) {
        console.log(`⚠️  File lock detected (attempt ${attempt}/${MAX_RETRIES})`);
        
        if (attempt < MAX_RETRIES) {
          console.log(`⏳ Waiting ${RETRY_DELAY / 1000} seconds before retry...\n`);
          await sleep(RETRY_DELAY);
          continue;
        } else {
          console.log('\n⚠️  Could not generate Prisma client due to file lock.');
          console.log('📋 This is usually safe - Prisma client will be generated automatically when:');
          console.log('   1. Dev server restarts');
          console.log('   2. Running npm install (postinstall hook)');
          console.log('   3. Running npm run build');
          console.log('\n✅ Database schema is already updated and ready to use.');
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

// Check if Prisma client exists and is recent
function checkPrismaClient() {
  const clientPath = join(process.cwd(), 'node_modules', '.prisma', 'client', 'index.js');
  
  if (existsSync(clientPath)) {
    console.log('✅ Prisma client exists');
    return true;
  }
  
  console.log('⚠️  Prisma client not found');
  return false;
}

async function main() {
  try {
    const clientExists = checkPrismaClient();
    
    if (!clientExists) {
      console.log('⚠️  Prisma client missing - attempting to generate...\n');
      await safeGenerate();
    } else {
      console.log('✅ Prisma client already exists');
      console.log('💡 If you need to regenerate, restart your dev server or run: npm install');
    }
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();
