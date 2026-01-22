/**
 * STEP 24A - ROLE & PERMISSION MATRIX (SOURCE OF TRUTH)
 * 
 * Tujuan:
 * - Menetapkan aturan akses eksplisit (bukan asumsi)
 * - Single source of truth untuk:
 *   - Backend (Next.js API)
 *   - UI guard (read-only vs write)
 *   - Engine safety (tidak bisa dipicu UI)
 * 
 * Prinsip:
 * - Tidak ada implicit permission
 * - Tidak ada auto-upgrade role
 * - Tidak ada wildcard
 * - Tidak ada inheritance implisit
 * 
 * Guard Philosophy:
 * - ❌ UI tidak menentukan boleh/tidak
 * - ❌ Engine tidak percaya UI
 * - ✅ Backend selalu cek permission
 * - ✅ UI hanya menyembunyikan, bukan mengizinkan
 * 
 * Keamanan & Konsistensi:
 * - Tidak ada DB call
 * - Tidak ada engine call
 * - Tidak ada session mutation
 * - Tidak ada side effect
 * 
 * Bisa dipakai di:
 * - API routes
 * - Server Components
 * - Middleware
 * - Engine policy check (read-only mirror)
 */

/**
 * 🔐 Definisi Role (FINAL)
 * 
 * Makna Role (non-teknis):
 * - super_admin → Pemilik sistem (eksekusi nyata)
 * - admin → Operator (kelola data, TIDAK eksekusi berbahaya)
 * - viewer → Pengamat (read-only)
 * - partner_readonly → Mitra eksternal (read-only, scope-bound) - PHASE 9A
 */
export type AdminRole =
  | 'super_admin'
  | 'admin'
  | 'viewer'
  | 'partner_readonly';

/**
 * 🧱 Permission Keys (EKSPLISIT)
 * 
 * ❗ Tidak ada wildcard.
 * ❗ Tidak ada inheritance implisit.
 */
export type PermissionKey =
  | 'admin.read'
  | 'admin.write'
  | 'admin.execute'
  | 'product.manage'
  | 'product.publish'
  | 'content.manage'
  | 'content.publish'
  | 'engine.view'
  | 'engine.control'
  | 'insight.view'
  | 'marketing.config'
  | 'marketing.view'
  | 'system.manage'
  | 'system.view'
  // PHASE 9A: Partner read-only permissions
  | 'partner.insights.read'
  | 'partner.analytics.read'
  | 'partner.seo.read';

/**
 * 📊 ROLE → PERMISSION MATRIX
 * 
 * Definisi eksplisit untuk setiap role
 */
const ROLE_PERMISSIONS: Record<AdminRole, PermissionKey[]> = {
  super_admin: [
    'admin.read',
    'admin.write',
    'admin.execute',

    'product.manage',
    'product.publish',

    'content.manage',
    'content.publish',

    'engine.view',
    'engine.control',

    'insight.view',

    'marketing.view',
    'marketing.config',

    'system.view',
    'system.manage',
  ],

  admin: [
    'admin.read',
    'admin.write',
    // ❌ admin.execute TIDAK boleh

    'product.manage',
    // ❌ product.publish TIDAK boleh

    'content.manage',
    // ❌ content.publish TIDAK boleh

    'engine.view',
    // ❌ engine.control TIDAK boleh

    'insight.view',

    'marketing.view',
    // ❌ marketing.config TIDAK boleh

    'system.view',
    // ❌ system.manage TIDAK boleh
  ],

  viewer: [
    'admin.read',
    // ❌ admin.write TIDAK boleh
    // ❌ admin.execute TIDAK boleh

    // ❌ product.manage TIDAK boleh
    // ❌ product.publish TIDAK boleh

    // ❌ content.manage TIDAK boleh
    // ❌ content.publish TIDAK boleh

    'engine.view',
    // ❌ engine.control TIDAK boleh

    'insight.view',

    'marketing.view',
    // ❌ marketing.config TIDAK boleh

    'system.view',
    // ❌ system.manage TIDAK boleh
  ],

  // PHASE 9A: Partner Read-Only Role
  // HANYA boleh akses insights, agregasi, ringkasan performa
  // ❌ TIDAK boleh akses: konten mentah, API key, konfigurasi, event write
  partner_readonly: [
    // ❌ admin.read TIDAK boleh (bukan admin)
    // ❌ admin.write TIDAK boleh
    // ❌ admin.execute TIDAK boleh

    // ❌ product.manage TIDAK boleh
    // ❌ product.publish TIDAK boleh

    // ❌ content.manage TIDAK boleh
    // ❌ content.publish TIDAK boleh

    // ❌ engine.view TIDAK boleh
    // ❌ engine.control TIDAK boleh

    // ❌ marketing.config TIDAK boleh
    // ❌ marketing.view TIDAK boleh (terpisah dari partner permissions)

    // ❌ system.manage TIDAK boleh
    // ❌ system.view TIDAK boleh

    // ✅ Partner-specific read-only permissions
    'partner.insights.read',   // Growth insights, performance summaries
    'partner.analytics.read',   // Analytics aggregations
    'partner.seo.read',         // SEO summaries (not raw content)
  ],
};

/**
 * 🧠 Helper Functions (PURE LOGIC)
 * 
 * Semua functions ini adalah pure functions:
 * - Tidak ada side effects
 * - Tidak ada DB calls
 * - Tidak ada engine calls
 * - Tidak ada session mutation
 * - Deterministic output
 */

/**
 * Check if a role has a specific permission
 * 
 * @param role - Admin role to check
 * @param permission - Permission key to check
 * @returns true if role has permission, false otherwise
 * 
 * @example
 * hasPermission('admin', 'product.manage') // true
 * hasPermission('admin', 'product.publish') // false
 * hasPermission('viewer', 'admin.write') // false
 */
export function hasPermission(
  role: AdminRole | string | undefined | null,
  permission: PermissionKey
): boolean {
  // Normalize role
  const normalizedRole: AdminRole = 
    role === 'super_admin' 
      ? 'super_admin' 
      : role === 'viewer' 
        ? 'viewer' 
        : role === 'partner_readonly'
          ? 'partner_readonly'
          : 'admin';

  const permissions = ROLE_PERMISSIONS[normalizedRole];
  return permissions.includes(permission);
}

/**
 * Assert that a role has a specific permission
 * Throws 403 Forbidden error if permission is missing
 * 
 * Used in API routes to enforce permissions
 * 
 * @param role - Admin role to check
 * @param permission - Permission key to check
 * @throws {Error} 403 Forbidden if permission is missing
 * 
 * @example
 * assertPermission('admin', 'product.publish') // throws 403
 * assertPermission('super_admin', 'product.publish') // OK
 */
export function assertPermission(
  role: AdminRole | string | undefined | null,
  permission: PermissionKey
): void {
  if (!hasPermission(role, permission)) {
    const error = new Error('Forbidden: Insufficient permissions') as any;
    error.status = 403;
    error.statusCode = 403;
    throw error;
  }
}

/**
 * Check if a role can execute actions (execute actions, control engine)
 * 
 * Shortcut untuk:
 * - action execute
 * - engine control
 * 
 * Hanya true untuk super_admin
 * 
 * @param role - Admin role to check
 * @returns true if role can execute, false otherwise
 * 
 * @example
 * canExecute('super_admin') // true
 * canExecute('admin') // false
 * canExecute('viewer') // false
 */
export function canExecute(
  role: AdminRole | string | undefined | null
): boolean {
  return hasPermission(role, 'admin.execute') && 
         hasPermission(role, 'engine.control');
}

/**
 * Get all permissions for a role
 * 
 * @param role - Admin role
 * @returns Array of permission keys for the role
 * 
 * @example
 * getRolePermissions('admin') // ['admin.read', 'admin.write', ...]
 */
export function getRolePermissions(
  role: AdminRole | string | undefined | null
): PermissionKey[] {
  const normalizedRole: AdminRole = 
    role === 'super_admin' 
      ? 'super_admin' 
      : role === 'viewer' 
        ? 'viewer' 
        : role === 'partner_readonly'
          ? 'partner_readonly'
          : 'admin';

  return [...ROLE_PERMISSIONS[normalizedRole]];
}

/**
 * Normalize role string to AdminRole type
 * 
 * Maps unknown roles to 'admin' (safe default)
 * 
 * @param role - Role string (can be any string)
 * @returns Normalized AdminRole
 * 
 * @example
 * normalizeRole('super_admin') // 'super_admin'
 * normalizeRole('content_admin') // 'admin'
 * normalizeRole('unknown') // 'admin'
 */
export function normalizeRole(
  role: string | undefined | null
): AdminRole {
  if (role === 'super_admin') {
    return 'super_admin';
  }
  if (role === 'viewer') {
    return 'viewer';
  }
  if (role === 'partner_readonly') {
    return 'partner_readonly';
  }
  // Default: map everything else to 'admin'
  return 'admin';
}

/**
 * Check if role is super_admin
 * 
 * @param role - Role to check
 * @returns true if role is super_admin
 */
export function isSuperAdmin(
  role: AdminRole | string | undefined | null
): boolean {
  return normalizeRole(role) === 'super_admin';
}

/**
 * Check if role is admin (not super_admin, not viewer)
 * 
 * @param role - Role to check
 * @returns true if role is admin
 */
export function isAdmin(
  role: AdminRole | string | undefined | null
): boolean {
  const normalized = normalizeRole(role);
  return normalized === 'admin';
}

/**
 * Check if role is viewer
 * 
 * @param role - Role to check
 * @returns true if role is viewer
 */
export function isViewer(
  role: AdminRole | string | undefined | null
): boolean {
  return normalizeRole(role) === 'viewer';
}

/**
 * Check if role is partner_readonly (PHASE 9A)
 * 
 * @param role - Role to check
 * @returns true if role is partner_readonly
 */
export function isPartnerReadonly(
  role: AdminRole | string | undefined | null
): boolean {
  return normalizeRole(role) === 'partner_readonly';
}

/**
 * Check if role can write (admin.write permission)
 * 
 * @param role - Role to check
 * @returns true if role can write
 */
export function canWrite(
  role: AdminRole | string | undefined | null
): boolean {
  return hasPermission(role, 'admin.write');
}

/**
 * Check if role can read (admin.read permission)
 * 
 * @param role - Role to check
 * @returns true if role can read
 */
export function canRead(
  role: AdminRole | string | undefined | null
): boolean {
  return hasPermission(role, 'admin.read');
}
