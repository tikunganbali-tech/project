/**
 * FASE 7.1 — PRODUCTION ENV VALIDATION
 * 
 * Validasi ENV variables yang CRITICAL untuk production
 * Server HARUS FAIL-FAST jika ENV critical hilang
 * 
 * Usage:
 *   - Run before server start: tsx scripts/validate-production-env.ts
 *   - Or import in server startup code
 */

const REQUIRED_ENV_VARS = {
  // Database - CRITICAL
  DATABASE_URL: {
    required: true,
    description: 'PostgreSQL connection string',
    validate: (value: string) => {
      if (!value) return 'DATABASE_URL is required';
      if (!value.startsWith('postgresql://') && !value.startsWith('postgres://')) {
        return 'DATABASE_URL must start with postgresql:// or postgres://';
      }
      return null;
    },
  },
  
  // AI API Key - CRITICAL (for engine-hub)
  OPENAI_API_KEY: {
    required: true,
    description: 'OpenAI API key for AI content generation',
    validate: (value: string) => {
      if (!value) return 'OPENAI_API_KEY is required';
      if (value.length <= 100) {
        return 'OPENAI_API_KEY is too short (expected > 100 characters)';
      }
      if (value.trim() !== value) {
        return 'OPENAI_API_KEY contains leading/trailing spaces';
      }
      return null;
    },
  },
  
  // Auth - CRITICAL
  NEXTAUTH_SECRET: {
    required: true,
    description: 'NextAuth secret for session encryption',
    validate: (value: string) => {
      if (!value) return 'NEXTAUTH_SECRET is required';
      if (value.length < 32) {
        return 'NEXTAUTH_SECRET must be at least 32 characters';
      }
      return null;
    },
  },
  
  // Scheduler - CRITICAL (if scheduler enabled)
  SCHEDULER_SERVICE_TOKEN: {
    required: false, // Only required if scheduler is enabled
    description: 'Service token for internal scheduler API',
    validate: (value: string) => {
      if (value && value.length < 16) {
        return 'SCHEDULER_SERVICE_TOKEN must be at least 16 characters';
      }
      return null;
    },
  },
  
  // Engine Hub URL - CRITICAL (if using engine)
  ENGINE_HUB_URL: {
    required: false, // Only required if using engine-hub
    description: 'Engine Hub API URL',
    validate: (value: string) => {
      if (value && !value.startsWith('http://') && !value.startsWith('https://')) {
        return 'ENGINE_HUB_URL must be a valid HTTP/HTTPS URL';
      }
      return null;
    },
  },
} as const;

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateProductionEnv(): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const isProduction = process.env.NODE_ENV === 'production';
  
  // Check each required ENV var
  for (const [key, config] of Object.entries(REQUIRED_ENV_VARS)) {
    const value = process.env[key];
    
    if (config.required) {
      if (!value) {
        errors.push(`❌ ${key}: ${config.description} - MISSING`);
        continue;
      }
      
      // Run validation
      const validationError = config.validate(value);
      if (validationError) {
        errors.push(`❌ ${key}: ${validationError}`);
      }
    } else {
      // Optional but validate if present
      if (value) {
        const validationError = config.validate(value);
        if (validationError) {
          warnings.push(`⚠️ ${key}: ${validationError}`);
        }
      } else if (isProduction) {
        // Warn if optional but might be needed
        warnings.push(`⚠️ ${key}: ${config.description} - Not set (may be required for some features)`);
      }
    }
  }
  
  // Additional production checks
  if (isProduction) {
    // Check for development-only ENV vars
    if (process.env.TEST_ADMIN_EMAIL || process.env.TEST_ADMIN_PASSWORD) {
      warnings.push('⚠️ TEST_ADMIN_EMAIL or TEST_ADMIN_PASSWORD detected in production - Remove these!');
    }
    
    // Check for .env file usage warning
    if (process.env.ENV === 'development') {
      warnings.push('⚠️ ENV=development detected in production - Should be "production"');
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

// CLI execution
if (require.main === module) {
  const result = validateProductionEnv();
  
  if (result.warnings.length > 0) {
    console.log('\n⚠️  WARNINGS:');
    result.warnings.forEach(w => console.log(`  ${w}`));
  }
  
  if (result.errors.length > 0) {
    console.error('\n❌ VALIDATION FAILED:');
    result.errors.forEach(e => console.error(`  ${e}`));
    console.error('\n💡 FIX: Set missing environment variables in OS environment (not .env file for production)');
    console.error('   Linux: export VAR_NAME="value"');
    console.error('   Windows: setx VAR_NAME "value"');
    process.exit(1);
  }
  
  console.log('\n✅ All required environment variables are valid');
  process.exit(0);
}
