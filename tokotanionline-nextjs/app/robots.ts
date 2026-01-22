import { MetadataRoute } from 'next';

// FASE 6.1: Robots.txt - Allow publik, block admin & API admin
export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://tokotanionline.com';

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin', '/api/admin', '/_next', '/engine'],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
