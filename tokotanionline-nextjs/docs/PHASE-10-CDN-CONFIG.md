# PHASE 10 - CDN & Caching Configuration Guide

**Last Updated:** 2026-01-XX  
**Status:** Production Ready

---

## Overview

This document provides guidance for configuring CDN and caching for the TokoTani Online system in production.

---

## 1. CDN Setup

### 1.1 Recommended CDN Providers

- **Cloudflare** (Recommended - Free tier available)
- **AWS CloudFront**
- **Vercel Edge Network** (if using Vercel)

### 1.2 CDN Configuration

#### Static Assets

**Cache Rules:**
- **Path:** `/_next/static/*`, `/images/*`, `/fonts/*`
- **Cache Duration:** 1 year (immutable)
- **Headers:** `Cache-Control: public, max-age=31536000, immutable`

#### Public Pages

**Cache Rules:**
- **Path:** `/`, `/produk`, `/blog`, `/tentang-kami`, `/kontak`
- **Cache Duration:** 1 hour
- **Headers:** `Cache-Control: public, max-age=3600, s-maxage=3600`
- **Revalidation:** Stale-while-revalidate

#### Dynamic Content

**Cache Rules:**
- **Path:** `/api/*`, `/admin/*`
- **Cache Duration:** No cache
- **Headers:** `Cache-Control: no-store, no-cache, must-revalidate`

---

## 2. Next.js Cache Headers

The application automatically sets appropriate cache headers:

### 2.1 Static Assets

```typescript
// Automatically handled by Next.js
Cache-Control: public, max-age=31536000, immutable
```

### 2.2 API Routes

```typescript
// Set in API routes
Cache-Control: no-store, no-cache, must-revalidate
```

### 2.3 Public Pages

```typescript
// Set in page components
Cache-Control: public, max-age=3600, s-maxage=3600
```

---

## 3. Cloudflare Configuration (Example)

### 3.1 Page Rules

1. **Static Assets:**
   - URL Pattern: `*your-domain.com/_next/static/*`
   - Cache Level: Cache Everything
   - Edge Cache TTL: 1 year

2. **Public Pages:**
   - URL Pattern: `*your-domain.com/produk*` or `*your-domain.com/blog*`
   - Cache Level: Cache Everything
   - Edge Cache TTL: 1 hour
   - Browser Cache TTL: Respect Existing Headers

3. **Admin/API:**
   - URL Pattern: `*your-domain.com/admin/*` or `*your-domain.com/api/*`
   - Cache Level: Bypass

### 3.2 Cache Purge

**Via Admin (if implemented):**
```bash
POST /api/admin/cache/purge
Authorization: Bearer <token>
```

**Via Cloudflare API:**
```bash
curl -X POST "https://api.cloudflare.com/client/v4/zones/{zone_id}/purge_cache" \
  -H "Authorization: Bearer {api_token}" \
  -H "Content-Type: application/json" \
  --data '{"purge_everything":true}'
```

---

## 4. Vercel Edge Network (if using Vercel)

### 4.1 Automatic Configuration

Vercel automatically configures:
- Edge caching for static assets
- ISR (Incremental Static Regeneration) for pages
- API route caching based on headers

### 4.2 Custom Configuration

Add to `vercel.json`:
```json
{
  "headers": [
    {
      "source": "/_next/static/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    },
    {
      "source": "/api/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "no-store, no-cache, must-revalidate"
        }
      ]
    }
  ]
}
```

---

## 5. Cache Bypass Rules

### 5.1 Admin Routes

**Always bypass cache:**
- `/admin/*` - All admin routes
- `/api/admin/*` - Admin API routes

### 5.2 Sensitive API Routes

**Always bypass cache:**
- `/api/auth/*` - Authentication
- `/api/admin/*` - Admin operations
- `/api/health` - Health checks (optional, can cache for 30s)

### 5.3 Internal Scheduler

**Bypass cache:**
- Requests with `Authorization: Bearer <SCHEDULER_SERVICE_TOKEN>`

---

## 6. Cache Purge Strategy

### 6.1 When to Purge

- After content updates (products, blogs)
- After configuration changes
- After deployment (optional, depends on strategy)

### 6.2 Purge Methods

1. **Selective Purge:**
   - Purge specific URLs
   - Purge by path pattern

2. **Full Purge:**
   - Purge entire cache
   - Use only when necessary

### 6.3 Implementation

**Admin Cache Purge API:**
```typescript
POST /api/admin/cache/purge
{
  "paths": ["/produk", "/blog"], // Optional: specific paths
  "full": false // Optional: full purge
}
```

---

## 7. Monitoring

### 7.1 Cache Hit Rate

Monitor CDN cache hit rate:
- Target: > 80% for static assets
- Target: > 60% for public pages

### 7.2 Cache Performance

Monitor:
- Response times from CDN
- Origin server load
- Bandwidth usage

---

## 8. Best Practices

### 8.1 Static Assets

- ✅ Use immutable cache headers
- ✅ Version assets (Next.js handles this)
- ✅ Enable compression (gzip/brotli)

### 8.2 Dynamic Content

- ✅ Use stale-while-revalidate for public pages
- ✅ Set appropriate TTL based on update frequency
- ✅ Always bypass cache for authenticated content

### 8.3 API Routes

- ✅ Never cache authentication endpoints
- ✅ Cache public API responses when appropriate
- ✅ Use ETags for conditional requests

---

## 9. Testing

### 9.1 Cache Verification

```bash
# Check cache headers
curl -I https://your-domain.com/_next/static/chunks/main.js

# Expected:
# Cache-Control: public, max-age=31536000, immutable
```

### 9.2 Cache Bypass Verification

```bash
# Check admin route (should not cache)
curl -I https://your-domain.com/admin/dashboard

# Expected:
# Cache-Control: no-store, no-cache, must-revalidate
```

---

## 10. Troubleshooting

### 10.1 Stale Content

**Issue:** Content not updating after changes

**Solution:**
1. Purge cache for affected paths
2. Verify cache headers are correct
3. Check CDN configuration

### 10.2 Cache Not Working

**Issue:** CDN not caching content

**Solution:**
1. Verify CDN is properly configured
2. Check cache headers are set correctly
3. Verify CDN is in front of origin

---

**Document Owner:** DevOps Team  
**Review Date:** Quarterly  
**Next Review:** [Date]
