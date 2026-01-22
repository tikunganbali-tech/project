'use client';

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

export default function PageViewTracker() {
  // Next.js types can mark pathname as nullable
  const pathname = usePathname() ?? '';
  const searchParams = useSearchParams();

  useEffect(() => {
    // Track page view
    const trackPageView = async () => {
      try {
        const pageUrl = window.location.href;
        const pagePath = pathname;
        const pageTitle = document.title;
        
        // Detect page type and ID from pathname
        let pageType: string | undefined;
        let pageId: string | undefined;
        let categoryId: string | undefined;
        let categoryName: string | undefined;
        let tags: string[] = [];
        
        if (pathname.startsWith('/produk/')) {
          pageType = 'product';
          const slug = pathname.replace('/produk/', '');
          pageId = slug;
          
          // Fetch product data to get category and tags
          try {
            const productRes = await fetch(`/api/products/by-slug/${slug}`);
            if (productRes.ok) {
              const product = await productRes.json();
              if (product) {
                categoryId = product.categoryId;
                categoryName = product.category?.name;
                // Products don't have tags in current schema, but can add later
              }
            }
          } catch (e) {
            // Ignore errors, continue without category
          }
        } else if (pathname.startsWith('/products/')) {
          // STEP 5: Simple product catalog tracking
          pageType = 'product';
          const slug = pathname.replace('/products/', '');
          pageId = slug;
          
          // Fetch catalog product data (optional, for category/tags if needed)
          try {
            const productRes = await fetch(`/api/catalog-products/by-slug/${slug}`);
            if (productRes.ok) {
              const product = await productRes.json();
              if (product && product.product) {
                // CatalogProduct doesn't have category, but tracking still works
              }
            }
          } catch (e) {
            // Ignore errors, continue without category
          }
        } else if (pathname.startsWith('/blog/')) {
          pageType = 'blog';
          const slug = pathname.replace('/blog/', '');
          pageId = slug;
          
          // Fetch blog data to get category and tags
          try {
            const blogRes = await fetch(`/api/blogs/by-slug/${slug}`);
            if (blogRes.ok) {
              const blog = await blogRes.json();
              if (blog) {
                categoryId = blog.categoryId;
                categoryName = blog.category?.name;
                // Parse tags if exists (assuming tags are stored as JSON string or array)
                if (blog.tags) {
                  tags = Array.isArray(blog.tags) ? blog.tags : 
                         typeof blog.tags === 'string' ? JSON.parse(blog.tags) : [];
                }
              }
            }
          } catch (e) {
            // Ignore errors, continue without category
          }
        } else if (pathname === '/') {
          pageType = 'home';
        } else if (pathname.startsWith('/kategori/')) {
          pageType = 'category';
          const slug = pathname.replace('/kategori/', '');
          pageId = slug;
        }

        // Get referrer
        const referrer = document.referrer || undefined;
        
        // Get UTM parameters
        const urlParams = new URLSearchParams(searchParams?.toString() ?? '');
        const utmSource = urlParams.get('utm_source') || undefined;
        const utmMedium = urlParams.get('utm_medium') || undefined;
        const utmCampaign = urlParams.get('utm_campaign') || undefined;
        const utmTerm = urlParams.get('utm_term') || undefined;
        const utmContent = urlParams.get('utm_content') || undefined;

        // Get screen dimensions
        const screenWidth = window.screen.width;
        const screenHeight = window.screen.height;

        // Track initial visit
        await fetch('/api/analytics/track', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            pageUrl,
            pagePath,
            pageTitle,
            pageType,
            pageId,
            categoryId,
            categoryName,
            tags,
            referrer,
            utmSource,
            utmMedium,
            utmCampaign,
            utmTerm,
            utmContent,
            screenWidth,
            screenHeight,
          }),
        });

        // Track scroll depth and time on page
        let scrollDepth = 0;
        let timeOnPage = 0;
        let startTime = Date.now();
        let maxScroll = 0;
        const scrollMilestones = [25, 50, 75, 100];
        const reachedMilestones = new Set<number>();

        const updateScrollDepth = () => {
          const windowHeight = window.innerHeight;
          const documentHeight = document.documentElement.scrollHeight;
          const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
          
          const currentScroll = Math.round(
            ((scrollTop + windowHeight) / documentHeight) * 100
          );
          
          if (currentScroll > maxScroll) {
            maxScroll = currentScroll;
            
            // Track scroll milestones (25%, 50%, 75%, 100%)
            scrollMilestones.forEach(milestone => {
              if (currentScroll >= milestone && !reachedMilestones.has(milestone)) {
                reachedMilestones.add(milestone);
                // Send milestone event
                fetch('/api/analytics/scroll-milestone', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    pageUrl,
                    pagePath,
                    pageType,
                    pageId,
                    scrollDepth: milestone,
                  }),
                }).catch(() => {
                  // Ignore errors
                });
              }
            });
          }
        };

        const updateTimeOnPage = () => {
          timeOnPage = Math.floor((Date.now() - startTime) / 1000);
        };

        window.addEventListener('scroll', updateScrollDepth);
        const timeInterval = setInterval(updateTimeOnPage, 1000); // Update every second

        // Exit intent detection (mouse leaves viewport)
        let exitIntentTracked = false;
        const handleMouseLeave = (e: MouseEvent) => {
          if (e.clientY <= 0 && !exitIntentTracked) {
            exitIntentTracked = true;
            fetch('/api/analytics/exit-intent', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                pageUrl,
                pagePath,
                pageType,
                pageId,
                timeOnPage: Math.floor((Date.now() - startTime) / 1000),
                scrollDepth: maxScroll,
              }),
            }).catch(() => {
              // Ignore errors
            });
          }
        };
        document.addEventListener('mouseleave', handleMouseLeave);

        // Track before page unload
        const handleBeforeUnload = () => {
          clearInterval(timeInterval);
          
          // Send final tracking data
          fetch('/api/analytics/track', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              pageUrl,
              pagePath,
              pageTitle,
              pageType,
              pageId,
              timeOnPage,
              scrollDepth: maxScroll,
            }),
            keepalive: true, // Keep request alive even after page unload
          }).catch(() => {
            // Ignore errors on page unload
          });
        };

        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
          window.removeEventListener('scroll', updateScrollDepth);
          window.removeEventListener('beforeunload', handleBeforeUnload);
          document.removeEventListener('mouseleave', handleMouseLeave);
          clearInterval(timeInterval);
        };
      } catch (error) {
        console.error('Error tracking page view:', error);
      }
    };

    // Delay tracking slightly to ensure page is loaded
    const timeout = setTimeout(trackPageView, 500);

    return () => clearTimeout(timeout);
  }, [pathname, searchParams]);

  return null; // This component doesn't render anything
}




