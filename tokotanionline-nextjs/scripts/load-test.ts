/**
 * PHASE 10 - Load & Smoke Test Script
 * 
 * Automated testing for:
 * - Smoke test (basic functionality)
 * - Light load test (baseline performance)
 * - Endpoint availability
 * 
 * Usage:
 *   tsx scripts/load-test.ts [--smoke] [--load] [--url <base-url>]
 */

import * as https from 'https';
import * as http from 'http';

interface TestResult {
  name: string;
  url: string;
  status: 'pass' | 'fail' | 'skip';
  responseTime?: number;
  statusCode?: number;
  error?: string;
}

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';
const CONCURRENT_REQUESTS = 10;
const TOTAL_REQUESTS = 50;

/**
 * Make HTTP request
 */
function makeRequest(url: string): Promise<{ statusCode: number; responseTime: number }> {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    const client = url.startsWith('https') ? https : http;

    const req = client.get(url, (res) => {
      const responseTime = Date.now() - startTime;
      resolve({ statusCode: res.statusCode || 0, responseTime });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

/**
 * Smoke test - basic functionality check
 */
async function smokeTest(): Promise<TestResult[]> {
  console.log('🧪 Running smoke tests...\n');

  const tests: Array<{ name: string; url: string }> = [
    { name: 'Homepage', url: `${BASE_URL}/` },
    { name: 'Health Check', url: `${BASE_URL}/api/health` },
    { name: 'Products Page', url: `${BASE_URL}/produk` },
    { name: 'Blog Page', url: `${BASE_URL}/blog` },
    { name: 'Metrics Endpoint', url: `${BASE_URL}/api/metrics` },
  ];

  const results: TestResult[] = [];

  for (const test of tests) {
    try {
      const { statusCode, responseTime } = await makeRequest(test.url);
      const passed = statusCode >= 200 && statusCode < 400;
      
      results.push({
        name: test.name,
        url: test.url,
        status: passed ? 'pass' : 'fail',
        statusCode,
        responseTime,
      });

      console.log(
        `${passed ? '✅' : '❌'} ${test.name}: ${statusCode} (${responseTime}ms)`
      );
    } catch (error: any) {
      results.push({
        name: test.name,
        url: test.url,
        status: 'fail',
        error: error.message,
      });

      console.log(`❌ ${test.name}: ${error.message}`);
    }
  }

  return results;
}

/**
 * Load test - baseline performance
 */
async function loadTest(): Promise<TestResult[]> {
  console.log('\n📊 Running load test...\n');

  const testUrl = `${BASE_URL}/api/health`;
  const results: TestResult[] = [];
  const responseTimes: number[] = [];
  let successCount = 0;
  let failCount = 0;

  console.log(`Testing ${TOTAL_REQUESTS} requests to ${testUrl}...`);

  // Create batches of concurrent requests
  const batches = Math.ceil(TOTAL_REQUESTS / CONCURRENT_REQUESTS);

  for (let batch = 0; batch < batches; batch++) {
    const batchPromises: Promise<void>[] = [];

    for (let i = 0; i < CONCURRENT_REQUESTS && (batch * CONCURRENT_REQUESTS + i) < TOTAL_REQUESTS; i++) {
      const promise = makeRequest(testUrl)
        .then(({ statusCode, responseTime }) => {
          if (statusCode >= 200 && statusCode < 400) {
            successCount++;
            responseTimes.push(responseTime);
          } else {
            failCount++;
          }
        })
        .catch(() => {
          failCount++;
        });

      batchPromises.push(promise);
    }

    await Promise.all(batchPromises);
    process.stdout.write(`\rProgress: ${Math.min((batch + 1) * CONCURRENT_REQUESTS, TOTAL_REQUESTS)}/${TOTAL_REQUESTS}`);
  }

  console.log('\n');

  // Calculate statistics
  if (responseTimes.length > 0) {
    const avg = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
    const min = Math.min(...responseTimes);
    const max = Math.max(...responseTimes);
    const sorted = [...responseTimes].sort((a, b) => a - b);
    const p95 = sorted[Math.floor(sorted.length * 0.95)];

    results.push({
      name: 'Load Test Summary',
      url: testUrl,
      status: failCount === 0 ? 'pass' : 'fail',
      responseTime: avg,
    });

    console.log(`✅ Success: ${successCount}`);
    console.log(`❌ Failed: ${failCount}`);
    console.log(`📊 Average response time: ${avg.toFixed(2)}ms`);
    console.log(`📊 Min: ${min}ms, Max: ${max}ms`);
    console.log(`📊 P95: ${p95}ms`);
  }

  return results;
}

/**
 * Main test runner
 */
async function main() {
  const args = process.argv.slice(2);
  const smokeOnly = args.includes('--smoke');
  const loadOnly = args.includes('--load');
  const urlArg = args.find(arg => arg.startsWith('--url='));
  
  if (urlArg) {
    const url = urlArg.split('=')[1];
    process.env.TEST_BASE_URL = url;
  }

  console.log(`🚀 Load & Smoke Test`);
  console.log(`📍 Base URL: ${BASE_URL}\n`);

  const allResults: TestResult[] = [];

  try {
    if (!loadOnly) {
      const smokeResults = await smokeTest();
      allResults.push(...smokeResults);
    }

    if (!smokeOnly) {
      const loadResults = await loadTest();
      allResults.push(...loadResults);
    }

    // Summary
    const passed = allResults.filter(r => r.status === 'pass').length;
    const failed = allResults.filter(r => r.status === 'fail').length;

    console.log('\n📋 Test Summary:');
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);

    if (failed > 0) {
      process.exit(1);
    }
  } catch (error: any) {
    console.error('\n❌ Test execution failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
