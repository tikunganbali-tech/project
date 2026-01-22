/**
 * Script to add export const dynamic = 'force-dynamic'; to all admin API routes
 */

import * as fs from 'fs';
import * as path from 'path';

const adminApiDir = path.join(process.cwd(), 'app', 'api', 'admin');

function findRouteFiles(dir: string): string[] {
  const files: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...findRouteFiles(fullPath));
    } else if (entry.name === 'route.ts') {
      files.push(fullPath);
    }
  }

  return files;
}

function addDynamicExport(filePath: string): boolean {
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Skip if already has dynamic export
  if (content.includes("export const dynamic = 'force-dynamic'")) {
    return false;
  }

  const lines = content.split('\n');
  let insertIndex = 0;
  let foundImport = false;

  // Find first import statement
  for (let i = 0; i < Math.min(30, lines.length); i++) {
    if (lines[i].trim().startsWith('import ')) {
      insertIndex = i;
      foundImport = true;
      break;
    }
  }

  // Insert dynamic export before imports
  const newLines = [
    ...lines.slice(0, insertIndex),
    "export const dynamic = 'force-dynamic';",
    '',
    ...lines.slice(insertIndex),
  ];

  fs.writeFileSync(filePath, newLines.join('\n'), 'utf8');
  return true;
}

async function main() {
  console.log('Adding export const dynamic = "force-dynamic" to admin API routes...\n');

  const routeFiles = findRouteFiles(adminApiDir);
  let added = 0;
  let skipped = 0;

  for (const file of routeFiles) {
    if (addDynamicExport(file)) {
      console.log(`✅ Added: ${path.relative(process.cwd(), file)}`);
      added++;
    } else {
      skipped++;
    }
  }

  console.log(`\n✅ Complete: ${added} files updated, ${skipped} files already had dynamic export`);
}

main().catch(console.error);
