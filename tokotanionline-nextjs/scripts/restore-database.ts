/**
 * PHASE 10 - Database Restore Script
 * 
 * Restore database from backup with safety checks
 * 
 * Usage:
 *   tsx scripts/restore-database.ts <backup-file> [--confirm]
 * 
 * WARNING: This will overwrite the current database!
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as readline from 'readline';

const execAsync = promisify(exec);

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
 * Prompt for confirmation
 */
async function confirmRestore(): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question('⚠️  WARNING: This will overwrite the current database. Continue? (yes/no): ', (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'yes');
    });
  });
}

/**
 * Restore database from backup
 */
async function restoreDatabase(backupFile: string, confirmed: boolean = false) {
  if (!confirmed) {
    const confirmed = await confirmRestore();
    if (!confirmed) {
      console.log('❌ Restore cancelled');
      process.exit(0);
    }
  }

  // Verify backup file exists
  try {
    await fs.access(backupFile);
  } catch (error) {
    console.error(`❌ Backup file not found: ${backupFile}`);
    process.exit(1);
  }

  const dbConfig = parseDatabaseUrl(DATABASE_URL!);
  console.log(`🔄 Restoring database: ${dbConfig.database}`);
  console.log(`📦 From backup: ${backupFile}`);

  // Set PGPASSWORD environment variable
  const env = {
    ...process.env,
    PGPASSWORD: dbConfig.password,
  };

  // Determine if backup is compressed
  const isCompressed = backupFile.endsWith('.gz');
  let restoreFile = backupFile;

  // Decompress if needed
  if (isCompressed) {
    console.log('📦 Decompressing backup...');
    restoreFile = backupFile.replace('.gz', '');
    try {
      await execAsync(`gunzip -c ${backupFile} > ${restoreFile}`);
    } catch (error: any) {
      console.error('❌ Decompression failed:', error.message);
      process.exit(1);
    }
  }

  // Check backup format (custom format vs SQL)
  const isCustomFormat = restoreFile.endsWith('.sql') === false || 
    (await fs.readFile(restoreFile, { encoding: 'utf-8' })).slice(0, 10).startsWith('PGDMP');

  try {
    if (isCustomFormat) {
      // Custom format backup (pg_dump -F c)
      const restoreCommand = `pg_restore -h ${dbConfig.host} -p ${dbConfig.port} -U ${dbConfig.user} -d ${dbConfig.database} --clean --if-exists ${restoreFile}`;
      await execAsync(restoreCommand, { env });
    } else {
      // SQL format backup
      const restoreCommand = `psql -h ${dbConfig.host} -p ${dbConfig.port} -U ${dbConfig.user} -d ${dbConfig.database} -f ${restoreFile}`;
      await execAsync(restoreCommand, { env });
    }

    console.log('✅ Database restored successfully');

    // Clean up decompressed file if we created it
    if (isCompressed && restoreFile !== backupFile) {
      await fs.unlink(restoreFile);
    }
  } catch (error: any) {
    console.error('❌ Restore failed:', error.message);
    
    // Clean up decompressed file
    if (isCompressed && restoreFile !== backupFile) {
      await fs.unlink(restoreFile).catch(() => {});
    }
    
    process.exit(1);
  }
}

/**
 * Main restore function
 */
async function main() {
  const args = process.argv.slice(2);
  const backupFile = args[0];
  const confirmed = args.includes('--confirm');

  if (!backupFile) {
    console.error('❌ Usage: tsx scripts/restore-database.ts <backup-file> [--confirm]');
    process.exit(1);
  }

  // Resolve backup file path
  const backupPath = path.isAbsolute(backupFile) 
    ? backupFile 
    : path.join(process.cwd(), 'backups', backupFile);

  await restoreDatabase(backupPath, confirmed);
}

if (require.main === module) {
  main();
}
