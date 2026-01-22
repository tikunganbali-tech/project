/**
 * STEP 13E - Role-Based Visibility & Safety Mode
 * Central configuration for admin capabilities and safety mode
 * 
 * PRINSIP BESAR:
 * - Jangan sembunyikan informasi
 * - Batasi aksi
 * - Semua engine powerful → OFF atau READ-ONLY by default
 * - Progressive disclosure
 */

export type AdminRole = "super_admin" | "admin";

// SAFE MODE: true = semua aksi dibatasi, false = full control
export const SAFE_MODE = true;

// FEATURE FREEZE: true = production freeze, non-super_admin read-only
export const FEATURE_FREEZE = true;

// AI COPY ASSIST: true = enable AI copy generation for products, false = disabled
export const AI_COPY_ASSIST_ENABLED = false;

// AI CONTENT ASSIST: true = enable AI content draft generation for blog posts, false = disabled
export const AI_CONTENT_ASSIST_ENABLED = false;

export interface RoleCapabilities {
  canRunJob: boolean;
  canControlEngine: boolean;
  canViewLogs: boolean;
}

export const ROLE_CAPABILITIES: Record<AdminRole, RoleCapabilities> = {
  admin: {
    canRunJob: false,
    canControlEngine: false,
    canViewLogs: true,
  },
  super_admin: {
    canRunJob: true,
    canControlEngine: true,
    canViewLogs: true,
  },
};

/**
 * Get capabilities for a role, respecting SAFE_MODE and FEATURE_FREEZE
 * Maps content_admin and marketing_admin to "admin" role
 */
export function getCapabilities(role: string | undefined | null): RoleCapabilities {
  // Map roles: only "super_admin" gets super_admin capabilities, everything else is "admin"
  // This includes: content_admin, marketing_admin, and any other role
  const normalizedRole: AdminRole = (role === "super_admin" ? "super_admin" : "admin");
  const baseCapabilities = ROLE_CAPABILITIES[normalizedRole];

  // If FEATURE_FREEZE is enabled, non-super_admin is read-only
  if (FEATURE_FREEZE && normalizedRole !== "super_admin") {
    return {
      canRunJob: false,
      canControlEngine: false,
      canViewLogs: true, // Viewing logs is still allowed (read-only)
    };
  }

  // If SAFE_MODE is enabled, restrict all actions
  if (SAFE_MODE) {
    return {
      canRunJob: false,
      canControlEngine: false,
      canViewLogs: baseCapabilities.canViewLogs, // Viewing logs is still allowed
    };
  }

  return baseCapabilities;
}

