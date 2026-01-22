/**
 * PHASE 9A: Partner Portal (READ-ONLY)
 * 
 * Partner dashboard for viewing insights
 * - Growth insights
 * - Ads insights
 * - SEO summary
 * 
 * ❌ NO edit buttons
 * ❌ NO publish buttons
 * ❌ NO approve buttons
 * ❌ NO content access
 */

import { redirect } from 'next/navigation';
import { requirePartnerAuth } from '@/lib/partner-auth';
import PartnerPortalClient from '@/components/partner/PartnerPortalClient';

export default async function PartnerPortalPage() {
  // Note: In a real implementation, you'd get the request from Next.js
  // For now, this is a placeholder that will be handled by client component
  // The actual auth will be done via API routes

  return (
    <div className="min-h-screen bg-gray-50">
      <PartnerPortalClient />
    </div>
  );
}
