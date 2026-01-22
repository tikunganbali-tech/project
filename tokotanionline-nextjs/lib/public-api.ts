/**
 * Public API Client (Server-Side Only)
 * 
 * Purpose: Server-side functions to fetch data from public read-only APIs
 * - No client-side usage
 * - Direct fetch to internal API routes
 * - Type-safe responses
 */

export interface PublicHomeResponse {
  hero: {
    title: string;
    subtitle: string;
  };
  categories: Array<{
    id: string;
    name: string;
    slug: string;
    imageUrl: string | null;
  }>;
  featuredProducts: Array<{
    id: string;
    name: string;
    slug: string;
    imageUrl: string | null;
    priceResolved: number;
    category?: {
      name: string;
      slug: string;
    } | null;
  }>;
  latestPosts: Array<{
    id: string;
    title: string;
    slug: string;
    excerpt: string | null;
    publishedAt: Date | string;
  }>;
}

export interface PublicProduct {
  id: string;
  name: string;
  slug: string;
  imageUrl: string | null;
  priceResolved: number;
  price: number;
  discountPrice: number | null;
  stock: number;
  unit: string;
  shopeeUrl: string | null;
  tokopediaUrl: string | null;
  shortDescription: string | null;
  packagingVariants: string | null;
  category: {
    name: string;
    slug: string;
  };
}

export interface PublicProductsResponse {
  items: PublicProduct[];
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
}

export interface GetPublicProductsParams {
  category?: string;
  page?: number;
  limit?: number;
  sort?: string; // 'newest' | 'price_asc' | 'price_desc'
}

export interface PublicProductDetail {
  id: string;
  name: string;
  slug: string;
  description: string;
  imageGallery: string[];
  priceResolved: number;
  shopeeUrl: string | null;
  tokopediaUrl: string | null;
  category: {
    name: string;
    slug: string;
  };
  additionalInfo: {
    problemSolution: string | null;
    applicationMethod: string | null;
    dosage: string | null;
    advantages: string | null;
    safetyNotes: string | null;
  };
  seo: {
    title: string;
    description: string;
    schemaJson: string | null;
  };
}

export interface PublicBlogItem {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  publishedAt: string | Date;
}

export interface PublicBlogListResponse {
  items: PublicBlogItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  } | null;
}

export interface PublicBlogDetail {
  title: string;
  content: string;
  contentMode?: 'TEXT' | 'HTML'; // M-07
  excerpt?: string | null;
  publishedAt: string | Date;
  seo?: {
    title?: string;
    description?: string;
    schemaJson?: string | null;
  };
  // PHASE B2-L: FAQ and related products
  faq?: Array<{ q: string; a: string }>;
  relatedProducts?: Array<{
    id: string;
    name: string;
    slug: string;
    imageUrl: string | null;
    priceResolved: number;
  }>;
}

/**
 * Fetch public homepage data
 * 
 * Uses internal API route /api/public/home
 * Server-side only - uses Next.js internal routing
 * 
 * @returns PublicHomeResponse
 * @throws Error if fetch fails
 */
export async function getPublicHome(): Promise<PublicHomeResponse> {
  // Use absolute URL for server-side fetch
  // In production (Vercel), use VERCEL_URL
  // In development, use localhost
  // Fallback to NEXT_PUBLIC_BASE_URL if set
  let baseUrl = 'http://localhost:3000';
  
  if (process.env.NEXT_PUBLIC_BASE_URL) {
    baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
  } else if (process.env.VERCEL_URL) {
    baseUrl = `https://${process.env.VERCEL_URL}`;
  }
  
  const url = `${baseUrl}/api/public/home`;

  try {
    // Add timeout to prevent hanging
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 seconds timeout
    
    const response = await fetch(url, {
      next: { revalidate: 300 }, // ISR: 5 minutes
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);

    if (!response.ok) {
      console.error(`[getPublicHome] API returned ${response.status}: ${response.statusText}`);
      // Return default empty data instead of throwing
      return {
        hero: { title: '', subtitle: '' },
        categories: [],
        featuredProducts: [],
        latestPosts: [],
      };
    }

    const data = await response.json();
    return data;
  } catch (error: any) {
    // CRITICAL: Never throw error - return default data to prevent 500 errors
    console.error('[getPublicHome] Error fetching homepage data:', error?.message || error);
    // Return default empty data to allow page to render
    return {
      hero: { title: '', subtitle: '' },
      categories: [],
      featuredProducts: [],
      latestPosts: [],
    };
  }
}

/**
 * Fetch public products list
 * 
 * Uses internal API route /api/public/products
 * Server-side only - uses Next.js internal routing
 * 
 * @param params - Query parameters (category, page, limit)
 * @returns PublicProductsResponse
 * @throws Error if fetch fails
 */
export async function getPublicProducts(
  params: GetPublicProductsParams = {}
): Promise<PublicProductsResponse> {
  // Use absolute URL for server-side fetch
  let baseUrl = 'http://localhost:3000';
  
  if (process.env.NEXT_PUBLIC_BASE_URL) {
    baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
  } else if (process.env.VERCEL_URL) {
    baseUrl = `https://${process.env.VERCEL_URL}`;
  }
  
  // Build query string
  const queryParams = new URLSearchParams();
  if (params.category) {
    queryParams.set('category', params.category);
  }
  if (params.page) {
    queryParams.set('page', params.page.toString());
  }
  if (params.limit) {
    queryParams.set('limit', params.limit.toString());
  }
  if (params.sort) {
    queryParams.set('sort', params.sort);
  }
  
  const queryString = queryParams.toString();
  const url = `${baseUrl}/api/public/products${queryString ? `?${queryString}` : ''}`;

  try {
    const response = await fetch(url, {
      next: { revalidate: 300 }, // ISR: 5 minutes
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch products: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching public products:', error);
    throw error;
  }
}

/**
 * Fetch public product by slug
 * 
 * Uses internal API route /api/public/products/[slug]
 * Server-side only - uses Next.js internal routing
 * 
 * @param slug - Product slug
 * @param preview - If true, allows fetching draft products (requires authentication)
 * @returns PublicProductDetail or null if not found/not published
 * @throws Error if fetch fails (non-404 errors)
 */
export async function getPublicProductBySlug(
  slug: string,
  preview: boolean = false
): Promise<PublicProductDetail | null> {
  // Use absolute URL for server-side fetch
  let baseUrl = 'http://localhost:3000';
  
  if (process.env.NEXT_PUBLIC_BASE_URL) {
    baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
  } else if (process.env.VERCEL_URL) {
    baseUrl = `https://${process.env.VERCEL_URL}`;
  }
  
  // Add preview query parameter if enabled
  const url = `${baseUrl}/api/public/products/${slug}${preview ? '?preview=true' : ''}`;

  try {
    // For preview mode, we need to pass cookies for authentication
    const fetchOptions: RequestInit = {
      next: preview ? { revalidate: 0 } : { revalidate: 300 }, // No cache for preview
      signal: AbortSignal.timeout(10000), // 10 second timeout
    };
    
    // In preview mode, we need to get the session cookie
    if (preview) {
      const { cookies } = await import('next/headers');
      const cookieStore = await cookies();
      const cookieHeader = cookieStore.toString();
      
      if (cookieHeader) {
        fetchOptions.headers = {
          Cookie: cookieHeader,
        };
      }
    }
    
    const response = await fetch(url, fetchOptions);

    // 404 means product not found or not published (or not authorized for preview)
    if (response.status === 404) {
      return null;
    }
    
    // 401/403 means unauthorized for preview
    if (response.status === 401 || response.status === 403) {
      return null;
    }

    if (!response.ok) {
      // For non-404 errors, return null instead of throwing (defensive)
      console.error(`Failed to fetch product ${slug}: ${response.status} ${response.statusText}`);
      return null;
    }

    const data = await response.json();
    return data;
  } catch (error: any) {
    // Defensive: Don't throw errors, return null instead
    // This prevents build crashes and allows graceful degradation
    if (error.name === 'AbortError') {
      console.error(`Timeout fetching product ${slug}`);
    } else {
      console.error(`Error fetching public product ${slug}:`, error.message || error);
    }
    return null;
  }
}

/**
 * Fetch public blog list
 * 
 * Uses internal API route /api/public/blog
 * Server-side only - uses Next.js internal routing
 * Pagination is handled by API
 * 
 * @param page - Page number (default: 1)
 * @param limit - Items per page (default: 10)
 * @returns PublicBlogListResponse
 * @throws Error if fetch fails
 */
export async function getPublicBlogList(
  page: number = 1,
  limit: number = 10
): Promise<PublicBlogListResponse> {
  // Use absolute URL for server-side fetch
  let baseUrl = 'http://localhost:3000';
  
  if (process.env.NEXT_PUBLIC_BASE_URL) {
    baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
  } else if (process.env.VERCEL_URL) {
    baseUrl = `https://${process.env.VERCEL_URL}`;
  }
  
  // Build query string with pagination params
  const queryParams = new URLSearchParams();
  if (page > 1) {
    queryParams.set('page', page.toString());
  }
  if (limit !== 10) {
    queryParams.set('limit', limit.toString());
  }
  
  const queryString = queryParams.toString();
  const url = `${baseUrl}/api/public/blog${queryString ? `?${queryString}` : ''}`;

  try {
    const response = await fetch(url, {
      next: { revalidate: 300 }, // ISR: 5 minutes
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch blog posts: ${response.statusText}`);
    }

    const data = await response.json();
    
    // API now returns pagination info directly
    return {
      items: data.items || [],
      pagination: data.pagination || null,
    };
  } catch (error) {
    console.error('Error fetching public blog list:', error);
    throw error;
  }
}

/**
 * Fetch public blog post by slug
 * 
 * Uses internal API route /api/public/blog/[slug]
 * Server-side only - uses Next.js internal routing
 * 
 * @param slug - Blog post slug
 * @returns PublicBlogDetail or null if not found/not published
 * @throws Error if fetch fails (non-404 errors)
 */
export async function getPublicBlogBySlug(
  slug: string
): Promise<PublicBlogDetail | null> {
  // Use absolute URL for server-side fetch
  let baseUrl = 'http://localhost:3000';
  
  if (process.env.NEXT_PUBLIC_BASE_URL) {
    baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
  } else if (process.env.VERCEL_URL) {
    baseUrl = `https://${process.env.VERCEL_URL}`;
  }
  
  const url = `${baseUrl}/api/public/blog/${slug}`;

  try {
    const response = await fetch(url, {
      next: { revalidate: 300 }, // ISR: 5 minutes
    });

    // 404 means post not found or not published
    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      throw new Error(`Failed to fetch blog post: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching public blog post:', error);
    throw error;
  }
}

// FASE 7.2: Category Hub Types & Functions
export interface PublicCategory {
  id: string;
  name: string;
  slug: string;
  summary: string | null;
  type: string;
  sortOrder: number;
}

export interface PublicCategoriesResponse {
  categories: PublicCategory[];
}

export interface PublicCategoryHubResponse {
  category: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    summary: string | null;
    type: string;
  };
  cornerstone: PublicBlogItem[];
  articles: PublicBlogItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * Fetch all public categories
 * 
 * Uses internal API route /api/public/categories
 * Server-side only - uses Next.js internal routing
 * 
 * @returns PublicCategoriesResponse
 * @throws Error if fetch fails
 */
export async function getPublicCategories(): Promise<PublicCategoriesResponse> {
  let baseUrl = 'http://localhost:3000';
  
  if (process.env.NEXT_PUBLIC_BASE_URL) {
    baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
  } else if (process.env.VERCEL_URL) {
    baseUrl = `https://${process.env.VERCEL_URL}`;
  }
  
  const url = `${baseUrl}/api/public/categories`;

  try {
    const response = await fetch(url, {
      next: { revalidate: 300 }, // ISR: 5 minutes
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch categories: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching public categories:', error);
    throw error;
  }
}

/**
 * Fetch public category hub by slug
 * 
 * Uses internal API route /api/public/categories/[slug]
 * Server-side only - uses Next.js internal routing
 * 
 * @param slug - Category slug
 * @param page - Page number (default: 1)
 * @param limit - Items per page (default: 10)
 * @returns PublicCategoryHubResponse or null if not found
 * @throws Error if fetch fails (non-404 errors)
 */
export async function getPublicCategoryHub(
  slug: string,
  page: number = 1,
  limit: number = 10
): Promise<PublicCategoryHubResponse | null> {
  let baseUrl = 'http://localhost:3000';
  
  if (process.env.NEXT_PUBLIC_BASE_URL) {
    baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
  } else if (process.env.VERCEL_URL) {
    baseUrl = `https://${process.env.VERCEL_URL}`;
  }
  
  const url = `${baseUrl}/api/public/categories/${slug}?page=${page}&limit=${limit}`;

  try {
    const response = await fetch(url, {
      next: { revalidate: 300 }, // ISR: 5 minutes
    });

    // 404 means category not found
    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      throw new Error(`Failed to fetch category hub: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching public category hub:', error);
    throw error;
  }
}

// FASE FINAL: Search Types & Functions
export interface PublicSearchParams {
  q: string;
  type?: 'all' | 'products' | 'blog';
  page?: number;
  limit?: number;
}

export interface PublicSearchResponse {
  query: string;
  products: Array<{
    id: string;
    name: string;
    slug: string;
    imageUrl: string | null;
    price: number;
    discountPrice: number | null;
    category: {
      name: string;
      slug: string;
    } | null;
  }>;
  blogPosts: Array<{
    id: string;
    title: string;
    slug: string;
    excerpt: string | null;
    publishedAt: string | Date;
  }>;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    productsTotal: number;
    blogPostsTotal: number;
  };
}

/**
 * Search products and blog posts
 * 
 * Uses internal API route /api/public/search
 * Server-side only - uses Next.js internal routing
 * 
 * @param params - Search parameters (q, type, page, limit)
 * @returns PublicSearchResponse
 */
export async function searchPublic(
  params: PublicSearchParams
): Promise<PublicSearchResponse> {
  let baseUrl = 'http://localhost:3000';
  
  if (process.env.NEXT_PUBLIC_BASE_URL) {
    baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
  } else if (process.env.VERCEL_URL) {
    baseUrl = `https://${process.env.VERCEL_URL}`;
  }
  
  // Build query string
  const queryParams = new URLSearchParams();
  queryParams.set('q', params.q);
  if (params.type) {
    queryParams.set('type', params.type);
  }
  if (params.page) {
    queryParams.set('page', params.page.toString());
  }
  if (params.limit) {
    queryParams.set('limit', params.limit.toString());
  }
  
  const queryString = queryParams.toString();
  const url = `${baseUrl}/api/public/search?${queryString}`;

  try {
    const response = await fetch(url, {
      next: { revalidate: 300 }, // ISR: 5 minutes
    });

    if (!response.ok) {
      throw new Error(`Failed to search: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error searching public content:', error);
    throw error;
  }
}
