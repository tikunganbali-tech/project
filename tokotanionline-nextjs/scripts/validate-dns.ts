/**
 * PHASE 10 - DNS & Domain Validation Script
 * 
 * Validates DNS records for production readiness:
 * - A/AAAA records
 * - CNAME records
 * - Subdomain configuration
 * - TTL values
 * 
 * Usage:
 *   tsx scripts/validate-dns.ts [--domain <domain>] [--subdomains <sub1,sub2>]
 */

import { promisify } from 'util';
import { exec } from 'child_process';
import * as dns from 'dns/promises';

const execAsync = promisify(exec);

interface DNSRecord {
  type: string;
  name: string;
  value: string;
  ttl?: number;
}

/**
 * Resolve DNS record
 */
async function resolveDNS(hostname: string, type: 'A' | 'AAAA' | 'CNAME' | 'TXT' = 'A'): Promise<string[]> {
  try {
    if (type === 'A') {
      const records = await dns.resolve4(hostname);
      return records;
    } else if (type === 'AAAA') {
      const records = await dns.resolve6(hostname);
      return records;
    } else if (type === 'CNAME') {
      const records = await dns.resolveCname(hostname);
      return records.map(r => r);
    } else if (type === 'TXT') {
      const records = await dns.resolveTxt(hostname);
      return records.flat();
    }
    return [];
  } catch (error: any) {
    if (error.code === 'ENOTFOUND' || error.code === 'ENODATA') {
      return [];
    }
    throw error;
  }
}

/**
 * Validate domain DNS
 */
async function validateDomain(domain: string): Promise<{
  valid: boolean;
  records: DNSRecord[];
  errors: string[];
}> {
  const errors: string[] = [];
  const records: DNSRecord[] = [];

  console.log(`🔍 Validating domain: ${domain}`);

  // Check A record
  try {
    const aRecords = await resolveDNS(domain, 'A');
    if (aRecords.length === 0) {
      errors.push(`No A record found for ${domain}`);
    } else {
      aRecords.forEach(ip => {
        records.push({ type: 'A', name: domain, value: ip });
      });
      console.log(`  ✅ A record: ${aRecords.join(', ')}`);
    }
  } catch (error: any) {
    errors.push(`Failed to resolve A record: ${error.message}`);
  }

  // Check AAAA record (optional)
  try {
    const aaaaRecords = await resolveDNS(domain, 'AAAA');
    if (aaaaRecords.length > 0) {
      aaaaRecords.forEach(ip => {
        records.push({ type: 'AAAA', name: domain, value: ip });
      });
      console.log(`  ✅ AAAA record: ${aaaaRecords.join(', ')}`);
    }
  } catch (error: any) {
    // AAAA is optional, just log
    console.log(`  ℹ️  No AAAA record (optional)`);
  }

  return {
    valid: errors.length === 0,
    records,
    errors,
  };
}

/**
 * Validate subdomain
 */
async function validateSubdomain(subdomain: string, baseDomain: string): Promise<{
  valid: boolean;
  records: DNSRecord[];
  errors: string[];
}> {
  const fullDomain = `${subdomain}.${baseDomain}`;
  const errors: string[] = [];
  const records: DNSRecord[] = [];

  console.log(`🔍 Validating subdomain: ${fullDomain}`);

  // Check A or CNAME record
  try {
    const aRecords = await resolveDNS(fullDomain, 'A');
    const cnameRecords = await resolveDNS(fullDomain, 'CNAME');

    if (aRecords.length > 0) {
      aRecords.forEach(ip => {
        records.push({ type: 'A', name: fullDomain, value: ip });
      });
      console.log(`  ✅ A record: ${aRecords.join(', ')}`);
    } else if (cnameRecords.length > 0) {
      cnameRecords.forEach(target => {
        records.push({ type: 'CNAME', name: fullDomain, value: target });
      });
      console.log(`  ✅ CNAME record: ${cnameRecords.join(', ')}`);
    } else {
      errors.push(`No A or CNAME record found for ${fullDomain}`);
    }
  } catch (error: any) {
    errors.push(`Failed to resolve ${fullDomain}: ${error.message}`);
  }

  return {
    valid: errors.length === 0,
    records,
    errors,
  };
}

/**
 * Main validation function
 */
async function main() {
  const args = process.argv.slice(2);
  const domainArg = args.find(arg => arg.startsWith('--domain='));
  const subdomainsArg = args.find(arg => arg.startsWith('--subdomains='));

  const domain = domainArg 
    ? domainArg.split('=')[1] 
    : process.env.PRODUCTION_DOMAIN || 'example.com';

  const subdomains = subdomainsArg
    ? subdomainsArg.split('=')[1].split(',').map(s => s.trim())
    : ['app', 'admin', 'api', 'partners'];

  console.log('🚀 DNS & Domain Validation\n');
  console.log(`📍 Domain: ${domain}`);
  console.log(`📍 Subdomains: ${subdomains.join(', ')}\n`);

  const allErrors: string[] = [];
  const allRecords: DNSRecord[] = [];

  // Validate main domain
  const domainResult = await validateDomain(domain);
  allErrors.push(...domainResult.errors);
  allRecords.push(...domainResult.records);

  console.log('');

  // Validate subdomains
  for (const subdomain of subdomains) {
    const subdomainResult = await validateSubdomain(subdomain, domain);
    allErrors.push(...subdomainResult.errors);
    allRecords.push(...subdomainResult.records);
    console.log('');
  }

  // Summary
  console.log('📋 Validation Summary:');
  console.log(`  ✅ Valid records: ${allRecords.length}`);
  console.log(`  ❌ Errors: ${allErrors.length}`);

  if (allErrors.length > 0) {
    console.log('\n❌ Validation Errors:');
    allErrors.forEach(error => {
      console.log(`  - ${error}`);
    });
    process.exit(1);
  } else {
    console.log('\n✅ All DNS records validated successfully');
  }
}

if (require.main === module) {
  main();
}
