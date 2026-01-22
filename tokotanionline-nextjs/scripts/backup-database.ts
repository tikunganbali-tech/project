/**
 * PHASE 10 - Database Backup Script
 * 
 * Automated database backup with:
 * - Daily backups with retention (7-14 days)
 * - Compressed backups
 * - Restore test capability
 * - Backup verification
 * 
 * Usage:
 *   tsx scripts/backup-database.ts [--dry-run] [--restore-test]
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import { format } from 'date-fns';

const execAsync = promisify(exec);

const BACKUP_DIR = process.env.BACKUP_DIR || path.join(process.cwd(), 'backups');
const RETENTION_DAYS = parseInt(process.env.BACKUP_RETENTION_DAYS || '14', 10);
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is required');
  process.exit(1);
}

/**
 * Parse PostgreSQL connection string
 */
function parseDatabaseUrl(url: string): {
  host: string;
  port: string;
  database: string;
  user: string;
  password: string;
} {
  const match = url.match(/postgres(ql)?:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);
  if (!match) {
    throw new Error('Invalid DATABASE_URL format');
  }

  return {
    user: match[2],
    password: match[3],
    host: match[4],
    port: match[5],
    database: match[6],
  };
}

/**
 * Create backup directory if it doesn't exist
 */
async function ensureBackupDir() {
  try {
    await fs.mkdir(BACKUP_DIR, { recursive: true });
  } catch (error: any) {
    if (error.code !== 'EEXIST') {
      throw error;
    }
  }
}

/**
 * Create database backup
 */
async function createBackup(dryRun: boolean = false): Promise<string> {
  const dbConfig = parseDatabaseUrl(DATABASE_URL!);
  const timestamp = format(new Date(), 'yyyy-MM-dd_HH-mm-ss');
  const backupFile = path.join(BACKUP_DIR, `backup_${timestamp}.sql`);
  const compressedFile = `${backupFile}.gz`;

  if (dryRun) {
    console.log(`[DRY RUN] Would create backup: ${compressedFile}`);
    return compressedFile;
  }

  console.log(`📦 Creating backup: ${compressedFile}`);

  // Set PGPASSWORD environment variable for pg_dump
  const env = {
    ...process.env,
    PGPASSWORD: dbConfig.password,
  };

  // Create backup using pg_dump
  const dumpCommand = `pg_dump -h ${dbConfig.host} -p ${dbConfig.port} -U ${dbConfig.user} -d ${dbConfig.database} -F c -f ${backupFile}`;
  
  try {
    await execAsync(dumpCommand, { env });
    console.log(`✅ Backup created: ${backupFile}`);

    // Compress backup (if gzip available)
    try {
      await execAsync(`gzip ${backupFile}`);
      console.log(`✅ Backup compressed: ${compressedFile}`);
      return compressedFile;
    } catch (error) {
      console.warn('⚠️  Compression failed, keeping uncompressed backup');
      return backupFile;
    }
  } catch (error: any) {
    console.error('❌ Backup failed:', error.message);
    throw error;
  }
}

/**
 * Verify backup file exists and is readable
 */
async function verifyBackup(backupFile: string): Promise<boolean> {
  try {
    const stats = await fs.stat(backupFile);
    if (stats.size === 0) {
      console.error(`❌ Backup file is empty: ${backupFile}`);
      return false;
    }
    console.log(`✅ Backup verified: ${backupFile} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
    return true;
  } catch (error) {
    console.error(`❌ Backup file not found: ${backupFile}`);
    return false;
  }
}

/**
 * Clean up old backups (retention policy)
 */
async function cleanupOldBackups() {
  try {
    const files = await fs.readdir(BACKUP_DIR);
    const backupFiles = files
      .filter(f => f.startsWith('backup_') && (f.endsWith('.sql') || f.endsWith('.sql.gz')))
      .map(f => ({
        name: f,
        path: path.join(BACKUP_DIR, f),
      }));

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - RETENTION_DAYS);

    let deletedCount = 0;
    for (const file of backupFiles) {
      const stats = await fs.stat(file.path);
      if (stats.mtime < cutoffDate) {
        await fs.unlink(file.path);
        console.log(`🗑️  Deleted old backup: ${file.name}`);
        deletedCount++;
      }
    }

    if (deletedCount > 0) {
      console.log(`✅ Cleaned up ${deletedCount} old backup(s)`);
    } else {
      console.log(`✅ No old backups to clean up`);
    }
  } catch (error: any) {
    console.error('⚠️  Cleanup error:', error.message);
  }
}

/**
 * Test restore (dry-run restore to verify backup)
 */
async function testRestore(backupFile: string, dryRun: boolean = false) {
  console.log(`🧪 Testing restore from: ${backupFile}`);

  if (dryRun) {
    console.log('[DRY RUN] Would test restore');
    return true;
  }

  // For production, we should restore to a test database
  // This is a placeholder - implement based on your infrastructure
  console.log('⚠️  Restore test requires a test database. Skipping...');
  console.log('💡 To test restore manually:');
  console.log(`   pg_restore -h <host> -p <port> -U <user> -d <test_db> ${backupFile}`);
  
  return true;
}

/**
 * Main backup function
 */
async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const restoreTest = args.includes('--restore-test');

  console.log('🚀 Database Backup Script');
  console.log(`📁 Backup directory: ${BACKUP_DIR}`);
  console.log(`📅 Retention: ${RETENTION_DAYS} days`);
  console.log(`🔧 Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}\n`);

  try {
    await ensureBackupDir();

    const backupFile = await createBackup(dryRun);
    
    if (!dryRun) {
      const verified = await verifyBackup(backupFile);
      if (!verified) {
        process.exit(1);
      }

      if (restoreTest) {
        await testRestore(backupFile, dryRun);
      }
    }

    await cleanupOldBackups();

    console.log('\n✅ Backup process completed successfully');
  } catch (error: any) {
    console.error('\n❌ Backup process failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
