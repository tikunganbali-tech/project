/**
 * M-02: Image Path Normalization Test Script
 * 
 * Tests the normalization functions to ensure invalid paths are rejected
 * and valid paths are normalized correctly.
 */

import { normalizeImagePath, normalizeImagePathSafe, normalizeImagePaths } from '@/lib/normalizeImagePath';

console.log('🧪 M-02: Testing Image Path Normalization\n');

// Test cases: [input, expectedOutput, shouldThrow]
const testCases: Array<[string, string | null, boolean]> = [
  // Valid paths (should pass)
  ['/images/products/x.png', '/images/products/x.png', false],
  ['/images/blog/article.jpg', '/images/blog/article.jpg', false],
  ['/images/articles/slug/image.webp', '/images/articles/slug/image.webp', false],
  
  // Paths with /public/ prefix (should be normalized)
  ['/public/images/products/x.png', '/images/products/x.png', false],
  ['/public/images/blog/article.jpg', '/images/blog/article.jpg', false],
  
  // Invalid paths (should throw or return null)
  ['/uploads/x.png', null, true],
  ['/public/uploads/x.png', null, true],
  ['images/products/x.png', null, true], // Missing leading slash
  ['/images', null, true], // Too short
  ['', null, true], // Empty
];

console.log('📋 Testing normalizeImagePath (strict):');
let passed = 0;
let failed = 0;

for (const [input, expected, shouldThrow] of testCases) {
  try {
    const result = normalizeImagePath(input);
    if (shouldThrow) {
      console.log(`❌ FAIL: "${input}" should throw but returned: ${result}`);
      failed++;
    } else if (result === expected) {
      console.log(`✅ PASS: "${input}" → "${result}"`);
      passed++;
    } else {
      console.log(`❌ FAIL: "${input}" → "${result}" (expected: "${expected}")`);
      failed++;
    }
  } catch (error: any) {
    if (shouldThrow) {
      console.log(`✅ PASS: "${input}" correctly threw: ${error.message}`);
      passed++;
    } else {
      console.log(`❌ FAIL: "${input}" should not throw but did: ${error.message}`);
      failed++;
    }
  }
}

console.log(`\n📊 Strict tests: ${passed} passed, ${failed} failed\n`);

console.log('📋 Testing normalizeImagePathSafe (safe):');
passed = 0;
failed = 0;

for (const [input, expected, shouldThrow] of testCases) {
  const result = normalizeImagePathSafe(input);
  if (shouldThrow && result === null) {
    console.log(`✅ PASS: "${input}" correctly returned null`);
    passed++;
  } else if (!shouldThrow && result === expected) {
    console.log(`✅ PASS: "${input}" → "${result}"`);
    passed++;
  } else {
    console.log(`❌ FAIL: "${input}" → "${result}" (expected: ${expected === null ? 'null' : `"${expected}"`})`);
    failed++;
  }
}

console.log(`\n📊 Safe tests: ${passed} passed, ${failed} failed\n`);

console.log('📋 Testing normalizeImagePaths (array):');
const arrayTests: Array<[string[], string[]]> = [
  [['/images/a.png', '/images/b.jpg'], ['/images/a.png', '/images/b.jpg']],
  [['/public/images/a.png', '/images/b.jpg'], ['/images/a.png', '/images/b.jpg']],
  [['/images/a.png', '/uploads/invalid.jpg'], ['/images/a.png']], // Invalid filtered out
  [['/public/images/a.png', '/public/images/b.jpg'], ['/images/a.png', '/images/b.jpg']],
  [[], []],
];

passed = 0;
failed = 0;

for (const [input, expected] of arrayTests) {
  const result = normalizeImagePaths(input);
  const match = JSON.stringify(result) === JSON.stringify(expected);
  if (match) {
    console.log(`✅ PASS: [${input.map(s => `"${s}"`).join(', ')}] → [${result.map(s => `"${s}"`).join(', ')}]`);
    passed++;
  } else {
    console.log(`❌ FAIL: [${input.map(s => `"${s}"`).join(', ')}] → [${result.map(s => `"${s}"`).join(', ')}] (expected: [${expected.map(s => `"${s}"`).join(', ')}])`);
    failed++;
  }
}

console.log(`\n📊 Array tests: ${passed} passed, ${failed} failed\n`);

const totalPassed = passed;
const totalFailed = failed;

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`📈 SUMMARY: ${totalPassed} passed, ${totalFailed} failed`);
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

if (totalFailed === 0) {
  console.log('✅ M-02 Normalization: ALL TESTS PASSED');
  process.exit(0);
} else {
  console.log('❌ M-02 Normalization: SOME TESTS FAILED');
  process.exit(1);
}
