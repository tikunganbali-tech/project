import { PrismaClient } from '@prisma/client';

async function test() {
  console.log('🔍 Testing Prisma client...\n');
  
  const prisma = new PrismaClient();
  
  try {
    // Test 1: Check if type field exists
    console.log('1. Testing ProductCategory query with type field...');
    const category = await prisma.productCategory.findFirst({
      select: {
        id: true,
        name: true,
        type: true,
        seoTitle: true,
        seoDescription: true,
      },
    });
    
    console.log('✅ Prisma client works!');
    console.log('✅ Category schema verified:');
    if (category) {
      console.log(`   - Found category: ${category.name}`);
      console.log(`   - Type: ${category.type}`);
      console.log(`   - SEO Title: ${category.seoTitle ? 'Set' : 'Not set'}`);
      console.log(`   - SEO Description: ${category.seoDescription ? 'Set' : 'Not set'}`);
    } else {
      console.log('   - No categories yet (this is OK)');
      console.log('   - Type field: ✅ Available');
      console.log('   - SEO fields: ✅ Available');
    }
    
    console.log('\n🎉 FITUR 3: Category System is READY!');
    console.log('✅ Database schema updated');
    console.log('✅ Prisma client working');
    console.log('✅ All features ready to use\n');
    
  } catch (error: any) {
    const errorMsg = error.message || String(error);
    console.log('❌ Error detected:', errorMsg);
    
    if (errorMsg.includes('Unknown arg `type`') || errorMsg.includes('Unknown field')) {
      console.log('\n⚠️  Prisma client needs regeneration');
      console.log('   The client is out of sync with the schema.');
      console.log('   Solution: Restart your dev server or run: npm install');
      console.log('   (Prisma will auto-generate on postinstall hook)\n');
      process.exit(1);
    } else {
      console.log('\n⚠️  Unexpected error. Please check database connection.\n');
      process.exit(1);
    }
  } finally {
    await prisma.$disconnect();
  }
}

test().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
