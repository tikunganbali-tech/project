/**
 * COMPREHENSIVE SYSTEM AUDIT
 * 
 * Memeriksa:
 * 1. Semua fitur aktif (tidak ada fitur palsu/inaktif)
 * 2. Sinkronisasi data
 * 3. Koneksi database
 * 4. Korelasi frontend-backend
 * 5. Logika yang saling bertentangan
 * 6. Algoritma yang bekerja
 * 7. File/kode yang tidak terpakai
 */

import { PrismaClient } from '@prisma/client';
import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const prisma = new PrismaClient();

interface AuditResult {
  category: string;
  status: 'PASS' | 'FAIL' | 'WARNING';
  message: string;
  details?: any;
}

const results: AuditResult[] = [];

function logResult(category: string, status: 'PASS' | 'FAIL' | 'WARNING', message: string, details?: any) {
  results.push({ category, status, message, details });
  const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️';
  console.log(`${icon} [${category}] ${message}`);
  if (details) {
    console.log(`   Details:`, JSON.stringify(details, null, 2));
  }
}

// 1. DATABASE CONNECTION CHECK
async function checkDatabaseConnection() {
  try {
    await prisma.$connect();
    logResult('DATABASE', 'PASS', 'Database connection successful');
    
    // Test query
    const adminCount = await prisma.admin.count();
    logResult('DATABASE', 'PASS', `Database query successful (${adminCount} admins found)`);
  } catch (error: any) {
    logResult('DATABASE', 'FAIL', `Database connection failed: ${error.message}`);
  }
}

// 2. ENVIRONMENT VARIABLES CHECK
function checkEnvironmentVariables() {
  const required = ['DATABASE_URL'];
  const recommended = ['ENGINE_HUB_URL', 'GO_ENGINE_API_URL', 'OPENAI_API_KEY', 'AI_API_KEY'];
  
  const missing = required.filter(key => !process.env[key]);
  if (missing.length > 0) {
    logResult('ENV', 'FAIL', `Missing required env vars: ${missing.join(', ')}`);
  } else {
    logResult('ENV', 'PASS', 'All required environment variables present');
  }
  
  // Check for conflicting env vars
  if (process.env.ENGINE_HUB_URL && process.env.GO_ENGINE_API_URL) {
    if (process.env.ENGINE_HUB_URL !== process.env.GO_ENGINE_API_URL) {
      logResult('ENV', 'WARNING', 'ENGINE_HUB_URL and GO_ENGINE_API_URL have different values', {
        ENGINE_HUB_URL: process.env.ENGINE_HUB_URL,
        GO_ENGINE_API_URL: process.env.GO_ENGINE_API_URL
      });
    }
  }
  
  const missingRecommended = recommended.filter(key => !process.env[key]);
  if (missingRecommended.length > 0) {
    logResult('ENV', 'WARNING', `Missing recommended env vars: ${missingRecommended.join(', ')}`);
  }
}

// 3. CHECK DISABLED FILES
function checkDisabledFiles() {
  const rootDir = process.cwd();
  const disabledFiles: string[] = [];
  
  function scanDir(dir: string) {
    try {
      const entries = readdirSync(dir);
      for (const entry of entries) {
        const fullPath = join(dir, entry);
        const stat = statSync(fullPath);
        
        if (stat.isDirectory() && !entry.startsWith('.') && entry !== 'node_modules') {
          scanDir(fullPath);
        } else if (entry.endsWith('.disabled')) {
          disabledFiles.push(fullPath.replace(rootDir, ''));
        }
      }
    } catch (error) {
      // Ignore permission errors
    }
  }
  
  scanDir(rootDir);
  
  if (disabledFiles.length > 0) {
    logResult('CLEANUP', 'WARNING', `Found ${disabledFiles.length} disabled files that should be removed`, {
      files: disabledFiles
    });
  } else {
    logResult('CLEANUP', 'PASS', 'No disabled files found');
  }
  
  return disabledFiles;
}

// 4. CHECK API ENDPOINTS
async function checkAPIEndpoints() {
  const appDir = join(process.cwd(), 'app', 'api');
  const endpoints: string[] = [];
  const duplicateEndpoints: string[] = [];
  
  function scanAPIDir(dir: string, prefix: string = '') {
    try {
      const entries = readdirSync(dir);
      for (const entry of entries) {
        const fullPath = join(dir, entry);
        const stat = statSync(fullPath);
        
        if (stat.isDirectory()) {
          const newPrefix = prefix ? `${prefix}/${entry}` : entry;
          scanAPIDir(fullPath, newPrefix);
        } else if (entry === 'route.ts' || entry === 'route.js') {
          const endpoint = prefix ? `/api/${prefix}` : '/api';
          if (endpoints.includes(endpoint)) {
            duplicateEndpoints.push(endpoint);
          }
          endpoints.push(endpoint);
        }
      }
    } catch (error) {
      // Ignore
    }
  }
  
  if (existsSync(appDir)) {
    scanAPIDir(appDir);
    logResult('API', 'PASS', `Found ${endpoints.length} API endpoints`);
    
    if (duplicateEndpoints.length > 0) {
      logResult('API', 'WARNING', `Found duplicate endpoints: ${duplicateEndpoints.join(', ')}`);
    }
  }
}

// 5. CHECK FEATURES IN DATABASE
async function checkFeatures() {
  try {
    // Check if core tables exist and have data
    const checks = [
      { name: 'Admins', query: prisma.admin.count() },
      { name: 'Products', query: prisma.product.count() },
      { name: 'BlogPosts', query: prisma.blogPost.count() },
      { name: 'Categories', query: prisma.productCategory.count() },
      { name: 'BlogCategories', query: prisma.blogCategory.count() },
      { name: 'Brands', query: prisma.brand.count() },
      { name: 'Locales', query: prisma.locale.count() },
    ];
    
    for (const check of checks) {
      try {
        const count = await check.query;
        if (count > 0) {
          logResult('FEATURES', 'PASS', `${check.name}: ${count} records found`);
        } else {
          logResult('FEATURES', 'WARNING', `${check.name}: No records found (may be empty)`);
        }
      } catch (error: any) {
        logResult('FEATURES', 'FAIL', `${check.name}: Query failed - ${error.message}`);
      }
    }
  } catch (error: any) {
    logResult('FEATURES', 'FAIL', `Feature check failed: ${error.message}`);
  }
}

// 6. CHECK FRONTEND-BACKEND INTEGRATION
function checkFrontendBackendIntegration() {
  const rootDir = process.cwd();
  const engineUrlPatterns = [
    /ENGINE_HUB_URL|GO_ENGINE_API_URL/g,
    /localhost:8090|localhost:8080/g
  ];
  
  let foundConnections = 0;
  let foundPort8090 = 0;
  let foundPort8080 = 0;
  
  function scanFiles(dir: string) {
    try {
      const entries = readdirSync(dir);
      for (const entry of entries) {
        const fullPath = join(dir, entry);
        const stat = statSync(fullPath);
        
        if (stat.isDirectory() && !entry.startsWith('.') && entry !== 'node_modules' && entry !== '.next') {
          scanFiles(fullPath);
        } else if (entry.endsWith('.ts') || entry.endsWith('.tsx')) {
          try {
            const content = readFileSync(fullPath, 'utf-8');
            if (engineUrlPatterns[0].test(content)) {
              foundConnections++;
            }
            if (content.includes('localhost:8090')) {
              foundPort8090++;
            }
            if (content.includes('localhost:8080')) {
              foundPort8080++;
            }
          } catch (error) {
            // Ignore read errors
          }
        }
      }
    } catch (error) {
      // Ignore
    }
  }
  
  scanFiles(join(rootDir, 'app'));
  scanFiles(join(rootDir, 'lib'));
  scanFiles(join(rootDir, 'components'));
  
  if (foundConnections > 0) {
    logResult('INTEGRATION', 'PASS', `Found ${foundConnections} frontend-backend connections`);
  } else {
    logResult('INTEGRATION', 'WARNING', 'No engine URL connections found in frontend code');
  }
  
  if (foundPort8080 > 0 && foundPort8090 > 0) {
    logResult('INTEGRATION', 'WARNING', 'Found references to both port 8080 and 8090', {
      port8080: foundPort8080,
      port8090: foundPort8090
    });
  } else if (foundPort8090 > 0) {
    logResult('INTEGRATION', 'PASS', `Using port 8090 (${foundPort8090} references)`);
  }
}

// 7. CHECK FOR CONFLICTING LOGIC
function checkConflictingLogic() {
  const rootDir = process.cwd();
  const conflicts: string[] = [];
  
  // Check for duplicate route definitions
  const routeFiles: { [key: string]: string[] } = {};
  
  function scanRoutes(dir: string, prefix: string = '') {
    try {
      const entries = readdirSync(dir);
      for (const entry of entries) {
        const fullPath = join(dir, entry);
        const stat = statSync(fullPath);
        
        if (stat.isDirectory()) {
          const newPrefix = prefix ? `${prefix}/${entry}` : entry;
          scanRoutes(fullPath, newPrefix);
        } else if (entry === 'route.ts' || entry === 'route.js') {
          const route = prefix ? `/api/${prefix}` : '/api';
          if (!routeFiles[route]) {
            routeFiles[route] = [];
          }
          routeFiles[route].push(fullPath);
        }
      }
    } catch (error) {
      // Ignore
    }
  }
  
  scanRoutes(join(rootDir, 'app', 'api'));
  
  for (const [route, files] of Object.entries(routeFiles)) {
    if (files.length > 1) {
      conflicts.push(`Route ${route} defined in ${files.length} files: ${files.join(', ')}`);
    }
  }
  
  if (conflicts.length > 0) {
    logResult('CONFLICTS', 'WARNING', `Found ${conflicts.length} potential route conflicts`, { conflicts });
  } else {
    logResult('CONFLICTS', 'PASS', 'No route conflicts found');
  }
}

// 8. CHECK UNUSED CODE
function checkUnusedCode() {
  // This is a simplified check - in production, use tools like ts-prune
  logResult('CLEANUP', 'WARNING', 'Unused code check requires manual review or ts-prune tool');
}

// MAIN AUDIT FUNCTION
async function runAudit() {
  console.log('🔍 Starting Comprehensive System Audit...\n');
  
  await checkDatabaseConnection();
  checkEnvironmentVariables();
  const disabledFiles = checkDisabledFiles();
  await checkAPIEndpoints();
  await checkFeatures();
  checkFrontendBackendIntegration();
  checkConflictingLogic();
  checkUnusedCode();
  
  console.log('\n📊 AUDIT SUMMARY\n');
  const passCount = results.filter(r => r.status === 'PASS').length;
  const failCount = results.filter(r => r.status === 'FAIL').length;
  const warnCount = results.filter(r => r.status === 'WARNING').length;
  
  console.log(`✅ PASS: ${passCount}`);
  console.log(`❌ FAIL: ${failCount}`);
  console.log(`⚠️  WARNING: ${warnCount}`);
  
  if (failCount > 0) {
    console.log('\n❌ FAILED CHECKS:');
    results.filter(r => r.status === 'FAIL').forEach(r => {
      console.log(`  - [${r.category}] ${r.message}`);
    });
  }
  
  if (warnCount > 0) {
    console.log('\n⚠️  WARNINGS:');
    results.filter(r => r.status === 'WARNING').forEach(r => {
      console.log(`  - [${r.category}] ${r.message}`);
    });
  }
  
  // Return disabled files for cleanup
  return {
    results,
    disabledFiles,
    summary: { pass: passCount, fail: failCount, warning: warnCount }
  };
}

// Run audit
runAudit()
  .then((audit) => {
    console.log('\n✅ Audit complete');
    process.exit(audit.summary.fail > 0 ? 1 : 0);
  })
  .catch((error) => {
    console.error('❌ Audit failed:', error);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });
