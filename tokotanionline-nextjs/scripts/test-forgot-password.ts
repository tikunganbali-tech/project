/**
 * Test script for forgot password endpoint
 * Run: npx tsx scripts/test-forgot-password.ts
 */

const BASE_URL = process.env.NEXTAUTH_URL || 'http://localhost:3000';

async function testForgotPassword() {
  const testEmail = process.argv[2] || 'test@example.com';
  
  console.log(`\n🧪 Testing forgot password endpoint...`);
  console.log(`📧 Email: ${testEmail}`);
  console.log(`🌐 URL: ${BASE_URL}/api/admin/auth/forgot-password\n`);

  try {
    const response = await fetch(`${BASE_URL}/api/admin/auth/forgot-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email: testEmail }),
    });

    console.log(`📊 Status: ${response.status} ${response.statusText}`);
    console.log(`📋 Headers:`, Object.fromEntries(response.headers.entries()));

    const data = await response.json();
    console.log(`📦 Response:`, JSON.stringify(data, null, 2));

    if (response.ok && data.success) {
      console.log(`\n✅ Test PASSED - Endpoint responded successfully`);
    } else {
      console.log(`\n❌ Test FAILED - Endpoint returned error`);
    }
  } catch (error: any) {
    console.error(`\n❌ Test ERROR:`, error.message);
    console.error(`Stack:`, error.stack);
  }
}

testForgotPassword();
