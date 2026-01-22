/**
 * STEP 2C — PUBLIC INQUIRY ADMIN VIEWER (UI - READ-ONLY)
 * 
 * Page: /admin/inquiries
 * 
 * Purpose: Admin viewer untuk public inquiries (READ-ONLY)
 * 
 * 🔒 GUARDS:
 * - Auth check (session required)
 * - Role check (role ≥ admin)
 * 
 * ❌ DILARANG DI UI:
 * - Button: "Mark as read", "Assign", "Reply", "Export", "Follow up"
 * - Action: onClick mutation, optimistic update, silent fetch POST
 * - UI harus secara visual pun terasa pasif
 * 
 * ✅ BOLEH DI UI:
 * - Table / list
 * - Pagination
 * - Filter tanggal
 * - Search text
 * - Detail modal (READ)
 */

import { Suspense } from 'react';
import InquiryListClient from './InquiryListClient';
import { enforceAdminPageGuard } from '@/lib/admin-page-guard';

// Loading skeleton
function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-8 bg-gray-200 rounded w-1/4 animate-pulse"></div>
      <div className="border rounded-lg">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="p-4 border-b last:border-b-0">
            <div className="flex items-center justify-between">
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-1/4 animate-pulse"></div>
                <div className="h-3 bg-gray-200 rounded w-1/3 animate-pulse"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Main page component (server-side guard)
export default async function InquiriesPage() {
  // 🔒 GUARD: Use consistent guard pattern
  const guardResult = await enforceAdminPageGuard({
    requireAuth: true,
    requirePermission: 'admin.read',
  });

  // If dev mode shows status component, return it
  if (guardResult.statusComponent) {
    return guardResult.statusComponent;
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-gray-900">Public Inquiries</h1>
        <p className="text-gray-600 mt-2">
          View public inquiries submitted through the website (Read-only)
        </p>
      </div>

      {/* Inquiry List */}
      <Suspense fallback={<LoadingSkeleton />}>
        <InquiryListClient />
      </Suspense>
    </div>
  );
}
