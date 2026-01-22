/**
 * SEO Health Monitor Admin Dashboard
 * 
 * E3.1: Auth handled by middleware (VPS-friendly)
 */

import SEOHealthClient from '@/components/admin/SEOHealthClient';

export default async function SEOHealthPage() {
  // E3.1: Auth handled by middleware - no session check needed
  return (
    <SEOHealthClient />
  );
}














