/**
 * ENGINE DISABLED STUB MODULE
 * 
 * This module is used as a safe replacement for engine-related imports
 * when the engine is disabled by design. It prevents build failures
 * while ensuring the engine cannot be accidentally executed.
 * 
 * All engine imports are aliased to this module via next.config.mjs
 * to maintain App Router buildability while keeping the engine OFF.
 */

export function engineDisabled(): never {
  throw new Error('ENGINE IS DISABLED BY DESIGN');
}

// Export default to handle default imports
export default {
  engineDisabled,
};

// Export common engine-related exports as stubs
export const seoEngineController = engineDisabled;
export const seoEngineExecutor = engineDisabled;
export const seoEngineScheduler = engineDisabled;
export const registerAllEngines = engineDisabled;
export const initializeScheduledTasks = engineDisabled;
