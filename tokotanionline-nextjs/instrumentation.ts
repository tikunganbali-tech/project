/**
 * Next.js Instrumentation Hook
 * This file runs once when the server starts (not during build)
 * Perfect place to initialize cron jobs and SEO Titan
 * 
 * FASE 6.2: Added config validation on startup
 */

export async function register() {
  // FASE 7.1: Validate production ENV variables (FAIL-FAST in production)
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const isProduction = process.env.NODE_ENV === 'production';
    
    try {
      // FASE 7.1: Production ENV validation - FAIL FAST if critical vars missing
      if (isProduction) {
        const { validateProductionEnv } = await import('./scripts/validate-production-env');
        const result = validateProductionEnv();
        
        if (result.warnings.length > 0) {
          console.warn('⚠️ [FASE 7.1] Production ENV warnings:');
          result.warnings.forEach(w => console.warn(`  ${w}`));
        }
        
        if (result.errors.length > 0) {
          console.error('❌ [FASE 7.1] CRITICAL: Production ENV validation failed:');
          result.errors.forEach(e => console.error(`  ${e}`));
          console.error('\n💡 Server will not start. Set missing environment variables in OS environment.');
          console.error('   Linux: export VAR_NAME="value"');
          console.error('   Windows: setx VAR_NAME "value"');
          process.exit(1); // FAIL-FAST in production
        }
        
        console.log('✅ [FASE 7.1] Production ENV validation passed');
      }
      
      // FASE 6.2: Validate production configuration (non-blocking)
      try {
        const { logConfigValidation } = await import('@/lib/config-validator');
        logConfigValidation();
      } catch (error) {
        // Non-blocking: don't fail startup if validation fails
        console.warn('⚠️ [instrumentation] Config validation failed:', error);
      }
    } catch (error) {
      if (isProduction) {
        // In production, fail fast on validation errors
        console.error('❌ [FASE 7.1] Failed to validate production ENV:', error);
        process.exit(1);
      } else {
        // In development, warn but continue
        console.warn('⚠️ [instrumentation] ENV validation failed:', error);
      }
    }
  }

  // ============================================
  // E1.2: HARD DISABLE - NO AUTO INIT
  // ============================================
  // Admin UI harus hidup TANPA ENGINE
  // Comment out auto-initialization
  console.log('⛔ E1.2 MODE: Auto-initialization DISABLED');
  return;
  
  // ❌ BELOW CODE DISABLED FOR E1.2
  /*
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Only run on Node.js runtime (server-side)
    // Initialize in background to prevent blocking server startup
    import('./lib/init')
      .then(({ initializeServer }) => {
        // Run initialization without blocking
        initializeServer().catch((error) => {
          console.error('⚠️ Server initialization error (non-blocking):', error);
        });
      })
      .catch((error) => {
        console.error('⚠️ Failed to load initialization module (non-blocking):', error);
      });
  }
  */
}






