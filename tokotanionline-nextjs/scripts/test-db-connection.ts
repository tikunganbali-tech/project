/**
 * Test Database Connection Script
 * Run: npx tsx scripts/test-db-connection.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testConnection() {
  console.log('🔍 Testing database connection...');
  console.log('DATABASE_URL:', process.env.DATABASE_URL?.replace(/:[^:@]+@/, ':****@') || 'not set');
  
  try {
    await prisma.$connect();
    console.log('✅ Database connection successful!');
    
    // Test query
    const adminCount = await prisma.admin.count();
    console.log(`✅ Admin users in database: ${adminCount}`);
    
    if (adminCount === 0) {
      console.log('⚠️  No admin users found. Run: npm run seed');
    } else {
      const admins = await prisma.admin.findMany({
        select: { email: true, name: true, role: true }
      });
      console.log('📋 Admin users:');
      admins.forEach(admin => {
        console.log(`   - ${admin.email} (${admin.name}, ${admin.role})`);
      });
    }
    
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Database connection failed!');
    console.error('Error:', error.message);
    
    if (error.message.includes('Authentication failed')) {
      console.error('\n💡 Solution:');
      console.error('   1. Check PostgreSQL is running');
      console.error('   2. Verify password in DATABASE_URL is correct');
      console.error('   3. Update .env.local with correct credentials');
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

testConnection();

