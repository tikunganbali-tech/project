/** @type {import('next').NextConfig} */
const nextConfig = {
  // STEP 3 ISOLATION: Minimal config - no custom webpack, no experimental
  reactStrictMode: true,
  
  // Allow build to continue with TypeScript errors (for production deploy)
  typescript: {
    ignoreBuildErrors: false, // Keep false to catch real errors, but fix them
  },
  
  // Fix NextAuth vendor chunk issue
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Ensure NextAuth vendor chunks are properly resolved
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
      };
    }
    return config;
  },
  
  // PHASE 10: Production Hardening - Enhanced Security Headers
  async headers() {
    const isProduction = process.env.NODE_ENV === 'production';
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    // Base security headers for all routes
    const baseHeaders = [
      {
        key: 'X-Content-Type-Options',
        value: 'nosniff',
      },
      {
        key: 'X-Frame-Options',
        value: 'DENY', // PHASE G: DENY (not SAMEORIGIN)
      },
      {
        key: 'X-XSS-Protection',
        value: '1; mode=block',
      },
      {
        key: 'Referrer-Policy',
        value: 'strict-origin-when-cross-origin',
      },
      {
        key: 'Permissions-Policy',
        value: 'geolocation=(), camera=(), microphone=(), interest-cohort=()',
      },
      {
        key: 'X-DNS-Prefetch-Control',
        value: 'on',
      },
    ];

    // HSTS header (only in production with HTTPS)
    if (isProduction) {
      baseHeaders.push({
        key: 'Strict-Transport-Security',
        value: 'max-age=31536000; includeSubDomains', // 1 year, no preload initially
      });
    }

    // PHASE G: CSP header - Development: Allow unsafe-eval for React Refresh, Production: Strict
    const scriptSrc = isDevelopment
      ? "'self' 'unsafe-eval' 'unsafe-inline' https://www.googletagmanager.com https://www.google-analytics.com" // Development: Allow unsafe-eval for React Refresh
      : "'self' https://www.googletagmanager.com https://www.google-analytics.com"; // Production: Strict
    
    const cspDirectives = [
      "default-src 'self'",
      `script-src ${scriptSrc}`,
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com data:",
      "img-src 'self' data: https: blob:",
      "object-src 'self' data:",
      "connect-src 'self' https://www.google-analytics.com https://www.googletagmanager.com",
      "frame-src 'self'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'self'",
    ];

    if (isProduction) {
      cspDirectives.push("upgrade-insecure-requests");
    }

    const headers = [
      {
        source: '/(.*)',
        headers: [
          ...baseHeaders,
          {
            key: 'Content-Security-Policy',
            value: cspDirectives.join('; '),
          },
        ],
      },
      // Admin routes - stricter CSP
      {
        source: '/admin/:path*',
        headers: [
          ...baseHeaders,
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              isDevelopment
                ? "script-src 'self' 'unsafe-eval' 'unsafe-inline'" // Development: Allow unsafe-eval for React Refresh
                : "script-src 'self'", // Production: Strict
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com", // Keep unsafe-inline for styles (required for Next.js)
              "font-src 'self' https://fonts.gstatic.com data:",
              "img-src 'self' data: https: blob:",
              "object-src 'self' data:",
              "connect-src 'self'",
              "frame-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "frame-ancestors 'none'",
            ].join('; '),
          },
        ],
      },
    ];

    return headers;
  },
};

export default nextConfig;
