/**
 * PHASE 10 - Rollback Deployment Script
 * 
 * Rollback to previous deployment version
 * 
 * Usage:
 *   tsx scripts/rollback-deploy.ts [--version <version>] [--confirm]
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as readline from 'readline';

const execAsync = promisify(exec);

const DEPLOY_DIR = process.env.DEPLOY_DIR || process.cwd();
const BACKUP_DIR = path.join(DEPLOY_DIR, '.deploy-backups');

/**
 * Get current version
 */
async function getCurrentVersion(): Promise<string> {
  try {
    const packageJson = JSON.parse(
      await fs.readFile(path.join(DEPLOY_DIR, 'package.json'), 'utf-8')
    );
    return packageJson.version || 'unknown';
  } catch {
    return 'unknown';
  }
}

/**
 * List available backup versions
 */
async function listBackupVersions(): Promise<string[]> {
  try {
    const files = await fs.readdir(BACKUP_DIR);
    return files
      .filter(f => f.startsWith('backup_'))
      .map(f => f.replace('backup_', '').replace('.tar.gz', ''))
      .sort()
      .reverse();
  } catch {
    return [];
  }
}

/**
 * Create backup before rollback
 */
async function createPreRollbackBackup(): Promise<string> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFile = path.join(BACKUP_DIR, `prerollback_${timestamp}.tar.gz`);

  console.log('📦 Creating pre-rollback backup...');

  try {
    await fs.mkdir(BACKUP_DIR, { recursive: true });

    // Create backup of current deployment
    const excludePatterns = [
      'node_modules',
      '.next',
      '.git',
      'backups',
      '.deploy-backups',
    ].map(p => `--exclude=${p}`).join(' ');

    await execAsync(
      `tar -czf ${backupFile} ${excludePatterns} -C ${DEPLOY_DIR} .`
    );

    console.log(`✅ Pre-rollback backup created: ${backupFile}`);
    return backupFile;
  } catch (error: any) {
    console.error('❌ Failed to create pre-rollback backup:', error.message);
    throw error;
  }
}

/**
 * Restore from backup version
 */
async function restoreFromBackup(version: string, confirmed: boolean = false) {
  if (!confirmed) {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const answer = await new Promise<string>((resolve) => {
      rl.question(
        `⚠️  WARNING: This will restore version ${version}. Continue? (yes/no): `,
        resolve
      );
    });
    rl.close();

    if (answer.toLowerCase() !== 'yes') {
      console.log('❌ Rollback cancelled');
      process.exit(0);
    }
  }

  const backupFile = path.join(BACKUP_DIR, `backup_${version}.tar.gz`);

  try {
    await fs.access(backupFile);
  } catch {
    console.error(`❌ Backup file not found: ${backupFile}`);
    process.exit(1);
  }

  console.log(`🔄 Restoring version ${version}...`);

  try {
    // Extract backup
    await execAsync(`tar -xzf ${backupFile} -C ${DEPLOY_DIR}`);

    // Reinstall dependencies
    console.log('📦 Reinstalling dependencies...');
    await execAsync('npm install', { cwd: DEPLOY_DIR });

    // Rebuild if needed
    if (await fs.access(path.join(DEPLOY_DIR, '.next')).then(() => true).catch(() => false)) {
      console.log('🔨 Rebuilding application...');
      await execAsync('npm run build', { cwd: DEPLOY_DIR });
    }

    console.log('✅ Rollback completed successfully');
    console.log('💡 Restart the application to apply changes');
  } catch (error: any) {
    console.error('❌ Rollback failed:', error.message);
    process.exit(1);
  }
}

/**
 * Main rollback function
 */
async function main() {
  const args = process.argv.slice(2);
  const versionArg = args.find(arg => arg.startsWith('--version='));
  const confirmed = args.includes('--confirm');

  const currentVersion = await getCurrentVersion();
  console.log(`🚀 Rollback Deployment Script`);
  console.log(`📍 Current version: ${currentVersion}\n`);

  const availableVersions = await listBackupVersions();

  if (availableVersions.length === 0) {
    console.error('❌ No backup versions found');
    console.log('💡 Create a backup first using your deployment process');
    process.exit(1);
  }

  let targetVersion: string;

  if (versionArg) {
    targetVersion = versionArg.split('=')[1];
  } else {
    // Use most recent backup
    targetVersion = availableVersions[0];
    console.log(`📋 Available versions: ${availableVersions.join(', ')}`);
    console.log(`🎯 Rolling back to: ${targetVersion}\n`);
  }

  // Create pre-rollback backup
  await createPreRollbackBackup();

  // Restore from backup
  await restoreFromBackup(targetVersion, confirmed);
}

if (require.main === module) {
  main();
}
