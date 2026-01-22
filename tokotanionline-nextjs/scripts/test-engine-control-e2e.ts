/**
 * ENGINE CONTROL CENTER - End-to-End Testing Script
 * 
 * Test semua flow dari UI Cockpit Finalization
 * 
 * Usage:
 *   npx tsx scripts/test-engine-control-e2e.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
}

const tests: TestResult[] = [];

async function test(name: string, fn: () => Promise<void> | void) {
  try {
    await fn();
    tests.push({ name, passed: true });
    console.log(`✅ ${name}`);
  } catch (error: any) {
    tests.push({ name, passed: false, error: error.message });
    console.log(`❌ ${name}: ${error.message}`);
  }
}

async function main() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  ENGINE CONTROL CENTER - E2E TESTING');
  console.log('═══════════════════════════════════════════════════════\n');

  // Test 1: Database Schema
  await test('EngineState table exists', async () => {
    const result = await prisma.$queryRaw`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'EngineState'
      );
    `;
    const exists = (result as any)[0]?.exists;
    if (!exists) {
      throw new Error('EngineState table tidak ditemukan');
    }
  });

  // Test 2: Default State Creation
  await test('Can create default EngineState', async () => {
    // Delete existing if any
    await prisma.engineState.deleteMany();
    
    const state = await prisma.engineState.create({
      data: {
        aiEngineStatus: 'OFF',
        seoEngineStatus: 'OFF',
        schedulerStatus: 'OFF',
        accessModeAdmin: true,
        accessModeEditor: false,
      },
    });

    if (!state.id) {
      throw new Error('EngineState tidak berhasil dibuat');
    }
  });

  // Test 3: Update AI Engine Status
  await test('Can update AI Engine status', async () => {
    const state = await prisma.engineState.findFirst();
    if (!state) throw new Error('EngineState tidak ditemukan');

    const updated = await prisma.engineState.update({
      where: { id: state.id },
      data: { aiEngineStatus: 'ON' },
    });

    if (updated.aiEngineStatus !== 'ON') {
      throw new Error('AI Engine status tidak terupdate');
    }

    // Reset to OFF
    await prisma.engineState.update({
      where: { id: state.id },
      data: { aiEngineStatus: 'OFF' },
    });
  });

  // Test 4: Update Access Mode
  await test('Can update access mode', async () => {
    const state = await prisma.engineState.findFirst();
    if (!state) throw new Error('EngineState tidak ditemukan');

    const updated = await prisma.engineState.update({
      where: { id: state.id },
      data: { accessModeEditor: true },
    });

    if (updated.accessModeEditor !== true) {
      throw new Error('Access mode tidak terupdate');
    }

    // Reset
    await prisma.engineState.update({
      where: { id: state.id },
      data: { accessModeEditor: false },
    });
  });

  // Test 5: API Endpoint Check (via fetch)
  await test('API endpoint /api/admin/engine/state exists', async () => {
    // Note: This requires server to be running
    // We'll just check if the file exists
    const fs = require('fs');
    const path = require('path');
    const apiPath = path.join(process.cwd(), 'app', 'api', 'admin', 'engine', 'state', 'route.ts');
    
    if (!fs.existsSync(apiPath)) {
      throw new Error('API endpoint file tidak ditemukan');
    }
  });

  // Test 6: UI Component Check
  await test('UI components exist', async () => {
    const fs = require('fs');
    const path = require('path');
    
    const components = [
      'components/admin/EngineControlClient.tsx',
      'components/admin/EngineAccessIndicator.tsx',
      'components/admin/FeatureAccessBadge.tsx',
      'lib/hooks/useEngineState.ts',
    ];

    for (const comp of components) {
      const compPath = path.join(process.cwd(), comp);
      if (!fs.existsSync(compPath)) {
        throw new Error(`Component tidak ditemukan: ${comp}`);
      }
    }
  });

  // Summary
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('  TEST SUMMARY');
  console.log('═══════════════════════════════════════════════════════\n');

  const passed = tests.filter(t => t.passed).length;
  const failed = tests.filter(t => !t.passed).length;

  console.log(`Total Tests: ${tests.length}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}\n`);

  if (failed > 0) {
    console.log('Failed Tests:');
    tests.filter(t => !t.passed).forEach(t => {
      console.log(`  - ${t.name}: ${t.error}`);
    });
  }

  await prisma.$disconnect();
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error('Fatal error:', error);
  prisma.$disconnect();
  process.exit(1);
});
