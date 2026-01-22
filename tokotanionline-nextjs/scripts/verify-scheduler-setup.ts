#!/usr/bin/env tsx
/**
 * FASE 4 — SCHEDULER SETUP VERIFICATION
 * 
 * Script untuk verify bahwa scheduler setup sudah benar
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface VerificationResult {
  check: string;
  status: 'PASS' | 'FAIL' | 'WARN';
  message: string;
}

const results: VerificationResult[] = [];

async function checkDatabaseTables() {
  try {
    // Check SchedulerConfig table
    await prisma.schedulerConfig.findFirst();
    results.push({
      check: 'SchedulerConfig table exists',
      status: 'PASS',
      message: 'Table found',
    });
  } catch (error: any) {
    if (error.message?.includes('does not exist') || error.message?.includes('Unknown table')) {
      results.push({
        check: 'SchedulerConfig table exists',
        status: 'FAIL',
        message: 'Table not found. Run: npx prisma db push',
      });
    } else {
      results.push({
        check: 'SchedulerConfig table exists',
        status: 'FAIL',
        message: `Error: ${error.message}`,
      });
    }
  }

  try {
    // Check SchedulerRun table
    await prisma.schedulerRun.findFirst();
    results.push({
      check: 'SchedulerRun table exists',
      status: 'PASS',
      message: 'Table found',
    });
  } catch (error: any) {
    if (error.message?.includes('does not exist') || error.message?.includes('Unknown table')) {
      results.push({
        check: 'SchedulerRun table exists',
        status: 'FAIL',
        message: 'Table not found. Run: npx prisma db push',
      });
    } else {
      results.push({
        check: 'SchedulerRun table exists',
        status: 'FAIL',
        message: `Error: ${error.message}`,
      });
    }
  }
}

async function checkSchedulerConfig() {
  try {
    const config = await prisma.schedulerConfig.findFirst();
    if (config) {
      results.push({
        check: 'SchedulerConfig exists',
        status: 'PASS',
        message: `Config found: enabled=${config.enabled}, quota=${config.dailyQuota}`,
      });
    } else {
      results.push({
        check: 'SchedulerConfig exists',
        status: 'WARN',
        message: 'No config found. Will be created on first API call.',
      });
    }
  } catch (error: any) {
    results.push({
      check: 'SchedulerConfig exists',
      status: 'FAIL',
      message: `Error: ${error.message}`,
    });
  }
}

async function checkEnvironmentVariables() {
  const required = [
    'SCHEDULER_SERVICE_TOKEN',
    'ENGINE_HUB_URL',
    'OPENAI_API_KEY',
  ];

  const optional = [
    'NEXT_PUBLIC_API_URL',
    'API_URL',
    'GO_ENGINE_API_URL',
    'AI_API_KEY',
  ];

  for (const env of required) {
    const value = process.env[env];
    if (value) {
      results.push({
        check: `Env: ${env}`,
        status: 'PASS',
        message: 'Set',
      });
    } else {
      // Check alternatives
      if (env === 'ENGINE_HUB_URL' && process.env.GO_ENGINE_API_URL) {
        results.push({
          check: `Env: ${env}`,
          status: 'PASS',
          message: 'Using GO_ENGINE_API_URL instead',
        });
      } else if (env === 'OPENAI_API_KEY' && process.env.AI_API_KEY) {
        results.push({
          check: `Env: ${env}`,
          status: 'PASS',
          message: 'Using AI_API_KEY instead',
        });
      } else {
        results.push({
          check: `Env: ${env}`,
          status: 'FAIL',
          message: 'Not set',
        });
      }
    }
  }

  for (const env of optional) {
    const value = process.env[env];
    if (value) {
      results.push({
        check: `Env: ${env} (optional)`,
        status: 'PASS',
        message: 'Set',
      });
    } else {
      results.push({
        check: `Env: ${env} (optional)`,
        status: 'WARN',
        message: 'Not set (optional)',
      });
    }
  }
}

async function checkWorkerScript() {
  const fs = require('fs');
  const path = require('path');

  const workerPath = path.join(process.cwd(), 'scripts', 'scheduler-worker.ts');
  if (fs.existsSync(workerPath)) {
    results.push({
      check: 'Worker script exists',
      status: 'PASS',
      message: 'scripts/scheduler-worker.ts found',
    });
  } else {
    results.push({
      check: 'Worker script exists',
      status: 'FAIL',
      message: 'scripts/scheduler-worker.ts not found',
    });
  }
}

async function checkAPIRoutes() {
  const fs = require('fs');
  const path = require('path');

  const routes = [
    'app/api/admin/scheduler/config/route.ts',
    'app/api/admin/scheduler/status/route.ts',
    'app/api/admin/scheduler/runs/route.ts',
    'app/api/internal/scheduler/run/route.ts',
  ];

  for (const route of routes) {
    const routePath = path.join(process.cwd(), route);
    if (fs.existsSync(routePath)) {
      results.push({
        check: `API route: ${route}`,
        status: 'PASS',
        message: 'Found',
      });
    } else {
      results.push({
        check: `API route: ${route}`,
        status: 'FAIL',
        message: 'Not found',
      });
    }
  }
}

async function checkAdminUI() {
  const fs = require('fs');
  const path = require('path');

  const uiFiles = [
    'components/admin/SchedulerClient.tsx',
    'app/admin/scheduler/page.tsx',
  ];

  for (const file of uiFiles) {
    const filePath = path.join(process.cwd(), file);
    if (fs.existsSync(filePath)) {
      results.push({
        check: `Admin UI: ${file}`,
        status: 'PASS',
        message: 'Found',
      });
    } else {
      results.push({
        check: `Admin UI: ${file}`,
        status: 'FAIL',
        message: 'Not found',
      });
    }
  }
}

async function main() {
  console.log('🔍 FASE 4 — SCHEDULER SETUP VERIFICATION\n');

  await checkDatabaseTables();
  await checkSchedulerConfig();
  await checkEnvironmentVariables();
  await checkWorkerScript();
  await checkAPIRoutes();
  await checkAdminUI();

  // Print results
  console.log('📊 VERIFICATION RESULTS:\n');
  
  let passCount = 0;
  let failCount = 0;
  let warnCount = 0;

  for (const result of results) {
    const icon = result.status === 'PASS' ? '✅' : result.status === 'FAIL' ? '❌' : '⚠️';
    const color = result.status === 'PASS' ? '\x1b[32m' : result.status === 'FAIL' ? '\x1b[31m' : '\x1b[33m';
    const reset = '\x1b[0m';
    
    console.log(`${icon} ${color}${result.check}${reset}`);
    console.log(`   ${result.message}\n`);

    if (result.status === 'PASS') passCount++;
    else if (result.status === 'FAIL') failCount++;
    else warnCount++;
  }

  console.log('\n📈 SUMMARY:');
  console.log(`   ✅ PASS: ${passCount}`);
  console.log(`   ❌ FAIL: ${failCount}`);
  console.log(`   ⚠️  WARN: ${warnCount}\n`);

  if (failCount > 0) {
    console.log('❌ SETUP INCOMPLETE - Please fix the issues above\n');
    process.exit(1);
  } else if (warnCount > 0) {
    console.log('⚠️  SETUP COMPLETE with warnings - Review warnings above\n');
    process.exit(0);
  } else {
    console.log('✅ SETUP COMPLETE - All checks passed!\n');
    process.exit(0);
  }
}

main()
  .catch((error) => {
    console.error('Verification failed:', error);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });
