'use client';

// TEMPORARY: Remove SessionProvider from root layout to avoid NextAuth bundling for public pages
// SessionProvider is now only in admin layout
// This fixes the "Cannot find module './vendor-chunks/@auth.js'" error for public routes

export function Providers({ children }: { children: React.ReactNode }) {
  // Public routes: no SessionProvider to avoid NextAuth vendor chunk issues
  // SessionProvider is handled in app/admin/layout.tsx for admin routes only
  return <>{children}</>;
}



