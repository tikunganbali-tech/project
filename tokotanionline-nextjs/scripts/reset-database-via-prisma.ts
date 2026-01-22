/**
 * Reset Database via Prisma
 * Run: npx tsx scripts/reset-database-via-prisma.ts
 */

import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'fs';
import { join } from 'path';

// Get scripts directory - use process.cwd() since we run from project root
const scriptsDir = process.cwd().endsWith('scripts') 
  ? process.cwd() 
  : process.cwd() + '/scripts';

const prisma = new PrismaClient();

async function resetDatabase() {
  console.log('🔴 RESET DATABASE TO VIRGIN STATE');
  console.log('=====================================\n');

  try {
    // Test connection
    console.log('🔍 Testing database connection...');
    await prisma.$connect();
    console.log('✅ Database connected\n');

    // Read SQL file
    const sqlFile = join(scriptsDir, 'reset-to-virgin.sql');
    console.log(`📖 Reading SQL file: ${sqlFile}`);
    const sqlContent = readFileSync(sqlFile, 'utf-8');
    console.log('✅ SQL file loaded\n');

    // Execute SQL - use $executeRawUnsafe for the entire script
    console.log('⚙️  Executing SQL reset...');
    console.log('   This may take a few moments...\n');

    let executedCount = 0;
    try {
      // Execute the entire SQL script at once
      await prisma.$executeRawUnsafe(sqlContent);
      console.log('✅ SQL script executed successfully\n');
      executedCount = 1;
    } catch (error: any) {
      // If batch execution fails, try executing statement by statement
      console.log('   Batch execution failed, trying statement by statement...\n');
      
      // Split by semicolon and execute each statement
      const statements = sqlContent
        .split(';')
        .map(s => s.trim())
        .filter(s => {
          // Filter out comments and empty statements
          const clean = s.replace(/--.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '').trim();
          return clean.length > 10 && !clean.match(/^(BEGIN|COMMIT|SET|SELECT)/i);
        });

      executedCount = 0;
      for (const statement of statements) {
        if (statement.length > 10) {
          try {
            await prisma.$executeRawUnsafe(statement);
            executedCount++;
          } catch (err: any) {
            // Some statements might fail (like SET session_replication_role)
            // which is okay, continue
            if (!err.message.includes('session_replication_role') && 
                !err.message.includes('unrecognized configuration parameter') &&
                !err.message.includes('does not exist')) {
              console.warn(`⚠️  Warning: ${err.message.substring(0, 100)}`);
            }
          }
        }
      }
      console.log(`✅ Executed ${executedCount} SQL statements\n`);
    }

    // Verify reset
    console.log('🔍 Verifying reset...');
    const blogCount = await prisma.blog.count();
    const productCount = await prisma.product.count();
    const aiLogCount = await prisma.aIContentGenerationLog.count();

    console.log(`   Blog count: ${blogCount} (expected: 0)`);
    console.log(`   Product count: ${productCount} (expected: 0)`);
    console.log(`   AI Log count: ${aiLogCount} (expected: 0)`);

    if (blogCount === 0 && productCount === 0 && aiLogCount === 0) {
      console.log('\n✅ Database reset successful!');
      console.log('   All data has been cleared.');
    } else {
      console.log('\n⚠️  Warning: Some tables still contain data.');
      console.log('   You may need to run the reset again or check for constraints.');
    }

    process.exit(0);
  } catch (error: any) {
    console.error('\n❌ Error during database reset!');
    console.error('Error:', error.message);
    
    if (error.message.includes('Authentication failed')) {
      console.error('\n💡 Solution:');
      console.error('   Check DATABASE_URL in .env.local');
    } else if (error.message.includes('does not exist')) {
      console.error('\n💡 Solution:');
      console.error('   Create database: CREATE DATABASE tokotanionline;');
    } else if (error.message.includes('ECONNREFUSED')) {
      console.error('\n💡 Solution:');
      console.error('   PostgreSQL is not running. Start PostgreSQL service.');
    }
    
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

resetDatabase();
