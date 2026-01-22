/**
 * ADMIN DEV MODE UTILITY
 * 
 * Allows read-only access to admin pages during development/testing
 * without bypassing security entirely.
 * 
 * When ADMIN_DEV_MODE=true:
 * - Pages render even without full auth/permission
 * - No redirects to login/dashboard
 * - Shows status/coming soon instead
 * - Auth still checked but doesn't block access
 */

export function isAdminDevMode(): boolean {
  return process.env.ADMIN_DEV_MODE === 'true';
}

/**
 * Check if page should be accessible in dev mode
 * Returns true if dev mode is enabled OR if normal auth passes
 */
export function shouldAllowAccess(
  hasSession: boolean,
  hasPermission: boolean = true
): boolean {
  if (isAdminDevMode()) {
    return true; // Allow access in dev mode regardless of auth
  }
  return hasSession && hasPermission; // Normal mode: require both
}
