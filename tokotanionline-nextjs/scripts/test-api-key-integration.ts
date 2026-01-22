/**
 * Integration Test: API Key Test Endpoint
 * 
 * Test the /api/admin/system/integrations/config/test endpoint
 * to verify JSON parsing errors are fixed
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3001';

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  details?: any;
}

async function testApiKeyEndpoint(): Promise<TestResult[]> {
  const results: TestResult[] = [];

  // Test 1: Test with valid integration ID (should return JSON)
  try {
    console.log('Test 1: Testing with valid integration ID...');
    const response = await fetch(`${BASE_URL}/api/admin/system/integrations/config/test`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Note: This test requires authentication - you may need to add session cookie
      },
      body: JSON.stringify({ integrationId: 'ai-openai' }),
    });

    const responseText = await response.text();
    console.log('Response status:', response.status);
    console.log('Response text length:', responseText.length);
    console.log('Response text (first 200 chars):', responseText.substring(0, 200));

    // Try to parse JSON
    let data: any;
    try {
      if (!responseText || responseText.trim() === '') {
        throw new Error('Empty response');
      }
      data = JSON.parse(responseText);
      results.push({
        name: 'Test 1: Valid integration ID returns JSON',
        passed: true,
        details: { status: response.status, data },
      });
    } catch (parseError: any) {
      results.push({
        name: 'Test 1: Valid integration ID returns JSON',
        passed: false,
        error: `JSON parse error: ${parseError.message}`,
        details: { status: response.status, responseText: responseText.substring(0, 200) },
      });
    }
  } catch (error: any) {
    results.push({
      name: 'Test 1: Valid integration ID returns JSON',
      passed: false,
      error: error.message,
    });
  }

  // Test 2: Test with invalid integration ID (should return JSON error)
  try {
    console.log('Test 2: Testing with invalid integration ID...');
    const response = await fetch(`${BASE_URL}/api/admin/system/integrations/config/test`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ integrationId: 'invalid-integration' }),
    });

    const responseText = await response.text();
    console.log('Response status:', response.status);
    console.log('Response text:', responseText);

    // Should return JSON error
    let data: any;
    try {
      if (!responseText || responseText.trim() === '') {
        throw new Error('Empty response');
      }
      data = JSON.parse(responseText);
      results.push({
        name: 'Test 2: Invalid integration ID returns JSON error',
        passed: true,
        details: { status: response.status, data },
      });
    } catch (parseError: any) {
      results.push({
        name: 'Test 2: Invalid integration ID returns JSON error',
        passed: false,
        error: `JSON parse error: ${parseError.message}`,
        details: { status: response.status, responseText },
      });
    }
  } catch (error: any) {
    results.push({
      name: 'Test 2: Invalid integration ID returns JSON error',
      passed: false,
      error: error.message,
    });
  }

  // Test 3: Test with missing integration ID (should return JSON error)
  try {
    console.log('Test 3: Testing with missing integration ID...');
    const response = await fetch(`${BASE_URL}/api/admin/system/integrations/config/test`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });

    const responseText = await response.text();
    console.log('Response status:', response.status);
    console.log('Response text:', responseText);

    // Should return JSON error
    let data: any;
    try {
      if (!responseText || responseText.trim() === '') {
        throw new Error('Empty response');
      }
      data = JSON.parse(responseText);
      results.push({
        name: 'Test 3: Missing integration ID returns JSON error',
        passed: true,
        details: { status: response.status, data },
      });
    } catch (parseError: any) {
      results.push({
        name: 'Test 3: Missing integration ID returns JSON error',
        passed: false,
        error: `JSON parse error: ${parseError.message}`,
        details: { status: response.status, responseText },
      });
    }
  } catch (error: any) {
    results.push({
      name: 'Test 3: Missing integration ID returns JSON error',
      passed: false,
      error: error.message,
    });
  }

  return results;
}

async function main() {
  console.log('🧪 API Key Integration Test');
  console.log('============================\n');

  try {
    const results = await testApiKeyEndpoint();

    console.log('\n📊 Test Results:');
    console.log('================');
    results.forEach((result, index) => {
      const icon = result.passed ? '✅' : '❌';
      console.log(`${icon} ${result.name}`);
      if (!result.passed) {
        console.log(`   Error: ${result.error}`);
        if (result.details) {
          console.log(`   Details:`, JSON.stringify(result.details, null, 2));
        }
      } else if (result.details) {
        console.log(`   Details:`, JSON.stringify(result.details, null, 2));
      }
    });

    const passed = results.filter(r => r.passed).length;
    const total = results.length;
    console.log(`\n📈 Summary: ${passed}/${total} tests passed`);

    if (passed === total) {
      console.log('✅ All tests passed!');
      process.exit(0);
    } else {
      console.log('❌ Some tests failed');
      process.exit(1);
    }
  } catch (error: any) {
    console.error('❌ Test execution failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
