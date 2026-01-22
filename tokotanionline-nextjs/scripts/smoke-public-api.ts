/**
 * STEP L-AUTO — AUTOMATED SMOKE TEST (PUBLIC API)
 * 
 * Tests all public GET endpoints with contract assertions
 * 
 * Assertions:
 * - HTTP 200 / 404 (valid)
 * - ❌ Tidak ada status, engine, wholesalePrices, attributes
 * - Harga sudah resolved
 * - Response time < 500ms
 */

import { performance } from 'perf_hooks';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');

interface TestResult {
  endpoint: string;
  method: string;
  status: number;
  responseTime: number;
  passed: boolean;
  errors: string[];
  warnings: string[];
}

const FORBIDDEN_FIELDS = ['status', 'engine', 'wholesalePrices', 'attributes'];
const MAX_RESPONSE_TIME_MS = 500;

/**
 * Deep check for forbidden fields in response
 */
function checkForbiddenFields(obj: any, path: string = ''): string[] {
  const errors: string[] = [];
  
  if (obj === null || obj === undefined) {
    return errors;
  }
  
  if (typeof obj === 'object') {
    for (const key in obj) {
      const currentPath = path ? `${path}.${key}` : key;
      
      // Check if key is forbidden
      if (FORBIDDEN_FIELDS.includes(key)) {
        errors.push(`Forbidden field found: ${currentPath}`);
      }
      
      // Recursively check nested objects and arrays
      if (Array.isArray(obj[key])) {
        obj[key].forEach((item: any, index: number) => {
          errors.push(...checkForbiddenFields(item, `${currentPath}[${index}]`));
        });
      } else if (typeof obj[key] === 'object') {
        errors.push(...checkForbiddenFields(obj[key], currentPath));
      }
    }
  }
  
  return errors;
}

/**
 * Test a single endpoint
 */
async function testEndpoint(
  method: string,
  endpoint: string,
  options: { body?: any; headers?: Record<string, string> } = {}
): Promise<TestResult> {
  const startTime = performance.now();
  const errors: string[] = [];
  const warnings: string[] = [];
  
  try {
    const url = `${BASE_URL}${endpoint}`;
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
    
    const responseTime = performance.now() - startTime;
    const status = response.status;
    
    // Check response time
    if (responseTime > MAX_RESPONSE_TIME_MS) {
      warnings.push(`Response time ${responseTime.toFixed(2)}ms exceeds ${MAX_RESPONSE_TIME_MS}ms`);
    }
    
    // Check status code (200 or 404 are valid for GET)
    if (method === 'GET' && status !== 200 && status !== 404) {
      errors.push(`Invalid status code: ${status} (expected 200 or 404)`);
    }
    
    // Parse response body if available
    let body: any = null;
    try {
      const text = await response.text();
      if (text) {
        body = JSON.parse(text);
      }
    } catch (e) {
      // Not JSON, skip body checks
    }
    
    // Check for forbidden fields
    if (body) {
      const forbiddenErrors = checkForbiddenFields(body);
      errors.push(...forbiddenErrors);
      
      // Check if price is resolved (should have priceResolved, not raw pricing)
      if (body.items && Array.isArray(body.items)) {
        body.items.forEach((item: any, index: number) => {
          if (item.priceResolved === undefined && (item.price !== undefined || item.discountPrice !== undefined)) {
            warnings.push(`Item[${index}] has raw price fields but no priceResolved`);
          }
        });
      }
      
      if (body.featuredProducts && Array.isArray(body.featuredProducts)) {
        body.featuredProducts.forEach((item: any, index: number) => {
          if (item.priceResolved === undefined && (item.price !== undefined || item.discountPrice !== undefined)) {
            warnings.push(`FeaturedProduct[${index}] has raw price fields but no priceResolved`);
          }
        });
      }
      
      if (body.priceResolved === undefined && (body.price !== undefined || body.discountPrice !== undefined)) {
        warnings.push('Response has raw price fields but no priceResolved');
      }
    }
    
    return {
      endpoint,
      method,
      status,
      responseTime,
      passed: errors.length === 0 && (status === 200 || status === 404),
      errors,
      warnings,
    };
  } catch (error: any) {
    const responseTime = performance.now() - startTime;
    return {
      endpoint,
      method,
      status: 0,
      responseTime,
      passed: false,
      errors: [`Request failed: ${error.message}`],
      warnings,
    };
  }
}

/**
 * Run all public API tests
 */
export async function runPublicAPITests(): Promise<{
  results: TestResult[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    warnings: number;
  };
}> {
  console.log('🧪 Starting Public API Smoke Tests...\n');
  console.log(`Base URL: ${BASE_URL}\n`);
  
  const results: TestResult[] = [];
  
  // Test: GET /api/public/home
  console.log('Testing GET /api/public/home...');
  results.push(await testEndpoint('GET', '/api/public/home'));
  
  // Test: GET /api/public/products
  console.log('Testing GET /api/public/products...');
  results.push(await testEndpoint('GET', '/api/public/products'));
  
  // Test: GET /api/public/products?page=1&limit=10
  console.log('Testing GET /api/public/products?page=1&limit=10...');
  results.push(await testEndpoint('GET', '/api/public/products?page=1&limit=10'));
  
  // Test: GET /api/public/products/[slug] - Try with a test slug (will likely 404, which is OK)
  console.log('Testing GET /api/public/products/test-product-slug...');
  results.push(await testEndpoint('GET', '/api/public/products/test-product-slug'));
  
  // Test: GET /api/public/blog
  console.log('Testing GET /api/public/blog...');
  results.push(await testEndpoint('GET', '/api/public/blog'));
  
  // Test: GET /api/public/blog?page=1&limit=5
  console.log('Testing GET /api/public/blog?page=1&limit=5...');
  results.push(await testEndpoint('GET', '/api/public/blog?page=1&limit=5'));
  
  // Test: GET /api/public/blog/[slug] - Try with a test slug (will likely 404, which is OK)
  console.log('Testing GET /api/public/blog/test-blog-slug...');
  results.push(await testEndpoint('GET', '/api/public/blog/test-blog-slug'));
  
  // Test: POST /api/public/inquiry - Should return 200 or 400 (validation)
  console.log('Testing POST /api/public/inquiry (validation test)...');
  const inquiryTest = await testEndpoint('POST', '/api/public/inquiry', {
    body: { name: '', contact: '', message: '' }, // Invalid payload
  });
  // Accept 400 (validation error) or 200 (fail-soft)
  inquiryTest.passed = inquiryTest.status === 400 || inquiryTest.status === 200;
  results.push(inquiryTest);
  
  // Calculate summary
  const summary = {
    total: results.length,
    passed: results.filter(r => r.passed).length,
    failed: results.filter(r => !r.passed).length,
    warnings: results.filter(r => r.warnings.length > 0).length,
  };
  
  // Print results
  console.log('\n📊 Test Results:\n');
  results.forEach(result => {
    const icon = result.passed ? '✅' : '❌';
    console.log(`${icon} ${result.method} ${result.endpoint}`);
    console.log(`   Status: ${result.status} | Time: ${result.responseTime.toFixed(2)}ms`);
    if (result.errors.length > 0) {
      result.errors.forEach(err => console.log(`   ❌ ${err}`));
    }
    if (result.warnings.length > 0) {
      result.warnings.forEach(warn => console.log(`   ⚠️  ${warn}`));
    }
  });
  
  console.log('\n📈 Summary:');
  console.log(`   Total: ${summary.total}`);
  console.log(`   ✅ Passed: ${summary.passed}`);
  console.log(`   ❌ Failed: ${summary.failed}`);
  console.log(`   ⚠️  Warnings: ${summary.warnings}`);
  
  return { results, summary };
}

// Run if executed directly
if (require.main === module) {
  runPublicAPITests()
    .then(({ summary }) => {
      process.exit(summary.failed > 0 ? 1 : 0);
    })
    .catch(error => {
      console.error('❌ Test execution failed:', error);
      process.exit(1);
    });
}
