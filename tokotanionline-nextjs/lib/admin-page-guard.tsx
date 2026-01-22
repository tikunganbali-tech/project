/**
 * ADMIN PAGE GUARD HELPER
 * 
 * Provides consistent guard logic for admin pages with dev mode support.
 * In dev mode: pages render with status instead of redirecting.
 */

import { redirect } from 'next/navigation';
import { getServerSession } from '@/lib/auth';
import { hasPermission, PermissionKey } from '@/lib/permissions';
import { isAdminDevMode } from './admin-dev-mode';
import ComingSoon from '@/components/admin/ComingSoon';

interface GuardOptions {
  requireAuth?: boolean;
  requirePermission?: PermissionKey;
  requireRole?: 'super_admin' | 'admin' | 'viewer';
  devModeStatus?: 'read-only' | 'locked' | 'coming-soon' | 'disabled';
  devModeNote?: string;
}

interface GuardResult {
  shouldRedirect: boolean;
  redirectPath?: string;
  statusComponent?: React.ReactElement;
}

/**
 * Check if user role meets requirement (with hierarchy support)
 * Role hierarchy: super_admin > admin > viewer
 */
function checkRoleAccess(requireRole: string, userRole?: string): boolean {
  if (!userRole) return false;
  
  const roleHierarchy: Record<string, string[]> = {
    'super_admin': ['super_admin', 'admin', 'viewer'],
    'admin': ['admin', 'viewer'],
    'viewer': ['viewer'],
  };
  
  const allowedRoles = roleHierarchy[requireRole] || [requireRole];
  return allowedRoles.includes(userRole);
}

/**
 * Check if user should be allowed access to the page
 * Returns guard result with redirect info or status component
 */
export async function checkAdminPageGuard(
  options: GuardOptions = {}
): Promise<GuardResult> {
  const {
    requireAuth = true,
    requirePermission,
    requireRole,
    devModeStatus = 'read-only',
    devModeNote,
  } = options;

  const devMode = isAdminDevMode();
  const isProduction = process.env.NODE_ENV === 'production';

  // Get session with error handling
  let session;
  try {
    session = await getServerSession();
  } catch (error: any) {
    // If getServerSession fails (e.g., database error), treat as no session
    console.error('[checkAdminPageGuard] getServerSession error:', error?.message || error);
    session = null;
  }
  
  const hasSession = !!(session && session.user);
  const userRole = (session?.user as any)?.role;

  // SECURITY: In production, always enforce auth regardless of dev mode flag
  // Dev mode only affects development environment
  if (isProduction) {
    // Production: Always enforce guards with redirects (NO dev mode bypass)
    if (requireAuth && !hasSession) {
      return {
        shouldRedirect: true,
        redirectPath: '/admin/login',
      };
    }

    if (requirePermission && userRole && !hasPermission(userRole, requirePermission)) {
      return {
        shouldRedirect: true,
        redirectPath: '/admin',
      };
    }

    if (requireRole && !checkRoleAccess(requireRole, userRole)) {
      return {
        shouldRedirect: true,
        redirectPath: '/admin/login',
      };
    }

    // All checks passed in production
    return { shouldRedirect: false };
  }

  // Development: Check if dev mode is enabled
  // If dev mode is NOT enabled, enforce same rules as production
  if (!devMode) {
    // Development without dev mode: Enforce guards with redirects (same as production)
    if (requireAuth && !hasSession) {
      return {
        shouldRedirect: true,
        redirectPath: '/admin/login',
      };
    }

    if (requirePermission && userRole && !hasPermission(userRole, requirePermission)) {
      return {
        shouldRedirect: true,
        redirectPath: '/admin',
      };
    }

    if (requireRole && !checkRoleAccess(requireRole, userRole)) {
      return {
        shouldRedirect: true,
        redirectPath: '/admin/login',
      };
    }

    // All checks passed
    return { shouldRedirect: false };
  }

  // Development mode with ADMIN_DEV_MODE=true: Allow dev mode behavior
  // This only applies in development environment with explicit flag
  if (devMode && !isProduction) {
    // If no session and auth is required, show status instead of redirect
    if (requireAuth && !hasSession) {
      return {
        shouldRedirect: false,
        statusComponent: (
          <ComingSoon
            status={devModeStatus}
            title="Authentication Required"
            note={devModeNote || "This page requires authentication. In dev mode, you can view the page structure."}
          />
        ),
      };
    }

    // If permission/role required but not met, show status
    if (requirePermission && userRole && !hasPermission(userRole, requirePermission)) {
      return {
        shouldRedirect: false,
        statusComponent: (
          <ComingSoon
            status={devModeStatus}
            title="Permission Required"
            note={devModeNote || `This page requires permission: ${requirePermission}`}
          />
        ),
      };
    }

    if (requireRole && !checkRoleAccess(requireRole, userRole)) {
      return {
        shouldRedirect: false,
        statusComponent: (
          <ComingSoon
            status={devModeStatus}
            title="Role Required"
            note={devModeNote || `This page requires role: ${requireRole}`}
          />
        ),
      };
    }

    // Dev mode: allow access (only in development)
    return { shouldRedirect: false };
  }

  // Fallback: Should not reach here, but enforce guards just in case
  if (requireAuth && !hasSession) {
    return {
      shouldRedirect: true,
      redirectPath: '/admin/login',
    };
  }

  if (requirePermission && userRole && !hasPermission(userRole, requirePermission)) {
    return {
      shouldRedirect: true,
      redirectPath: '/admin',
    };
  }

  if (requireRole && !checkRoleAccess(requireRole, userRole)) {
    return {
      shouldRedirect: true,
      redirectPath: '/admin/login',
    };
  }

  // All checks passed
  return { shouldRedirect: false };
}

/**
 * Execute guard check and redirect if needed
 * Use this in page components
 */
export async function enforceAdminPageGuard(options: GuardOptions = {}) {
  const result = await checkAdminPageGuard(options);
  
  if (result.shouldRedirect && result.redirectPath) {
    redirect(result.redirectPath);
  }
  
  return result;
}
