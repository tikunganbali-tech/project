/**
 * F7-A — ADMIN ROOT PAGE (AUTH RECOVERY)
 * 
 * KONTRAK TEKNIS:
 * - F7-A: MUST check auth before redirect
 * - If not authenticated → redirect to /admin/login
 * - If authenticated → redirect to /admin/dashboard
 * - No bypass, no blank page
 * - Use enforceAdminPageGuard for consistency
 */

import { redirect } from 'next/navigation';
import { enforceAdminPageGuard } from '@/lib/admin-page-guard';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  try {
    // SECURITY: Use consistent guard pattern
    // This will automatically redirect to login if not authenticated
    await enforceAdminPageGuard({
      requireAuth: true,
    });

    // If we reach here, user is authenticated
    // Redirect to dashboard
    redirect('/admin/dashboard');
  } catch (error: any) {
    // Fallback: If guard fails (e.g., database error), redirect to login
    // This prevents 500 error and allows user to retry login
    console.error('[AdminPage] Error:', error?.message || error);
    redirect('/admin/login');
  }
}

