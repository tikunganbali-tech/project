// CMS Storage Layer - localStorage implementation
// This can be easily replaced with Supabase/Firebase later

export interface Product {
  id: string;
  name: string;
  slug: string;
  category: string;
  price: number;
  discountPrice?: number;
  stock: number;
  unit: string;
  description: string;
  features: string[];
  image: string;
  images?: string[];
  isFeatured: boolean;
  meta: {
    title: string;
    description: string;
    keywords: string[];
  };
  createdAt: string;
  updatedAt: string;
}

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  author: string;
  category: string;
  tags: string[];
  image: string;
  publishedAt?: string;
  meta: {
    title: string;
    description: string;
    keywords: string[];
  };
  createdAt: string;
  updatedAt: string;
}

export interface WhatsAppAdmin {
  id: string;
  phone: string;
  name: string;
  isActive: boolean;
  rotationOrder: number;
}

export interface MarketplaceLink {
  id: string;
  marketplace: 'shopee' | 'tokopedia';
  url: string;
  isActive: boolean;
}

export interface AnalyticsData {
  whatsappClicks: Array<{
    id: string;
    adminId: string;
    adminName: string;
    productName: string;
    clickedAt: string;
  }>;
  marketplaceClicks: Array<{
    id: string;
    marketplace: string;
    productName: string;
    clickedAt: string;
  }>;
}

interface LegacyProduct {
  name: string;
  slug: string;
  category: string;
  price: number;
  discountPrice?: number;
  stock: number;
  unit: string;
  description: string;
  features: string[];
  image: string;
  images?: string[];
  isFeatured?: boolean;
  meta: {
    title: string;
    description: string;
    keywords: string[];
  };
}

interface LegacyBlog {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  author: string;
  category: string;
  tags: string[];
  image: string;
  meta: {
    title: string;
    description: string;
    keywords: string[];
  };
}

interface LegacyWhatsAppAdmin {
  phone: string;
  name: string;
}

interface LegacyMarketplace {
  shopee: string;
  tokopedia: string;
}

class CMSStorage {
  private readonly PRODUCTS_KEY = 'cms_products';
  private readonly BLOGS_KEY = 'cms_blogs';
  private readonly WA_ADMINS_KEY = 'cms_wa_admins';
  private readonly MARKETPLACE_KEY = 'cms_marketplace';
  private readonly ANALYTICS_KEY = 'cms_analytics';

  // Products
  getProducts(): Product[] {
    const data = localStorage.getItem(this.PRODUCTS_KEY);
    return data ? JSON.parse(data) : [];
  }

  getProduct(id: string): Product | null {
    const products = this.getProducts();
    return products.find(p => p.id === id) || null;
  }

  saveProduct(product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Product {
    const products = this.getProducts();
    const newProduct: Product = {
      ...product,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    products.push(newProduct);
    localStorage.setItem(this.PRODUCTS_KEY, JSON.stringify(products));
    return newProduct;
  }

  updateProduct(id: string, updates: Partial<Product>): Product | null {
    const products = this.getProducts();
    const index = products.findIndex(p => p.id === id);
    if (index === -1) return null;

    products[index] = {
      ...products[index],
      ...updates,
      id: products[index].id,
      createdAt: products[index].createdAt,
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem(this.PRODUCTS_KEY, JSON.stringify(products));
    return products[index];
  }

  deleteProduct(id: string): boolean {
    const products = this.getProducts();
    const filtered = products.filter(p => p.id !== id);
    if (filtered.length === products.length) return false;
    localStorage.setItem(this.PRODUCTS_KEY, JSON.stringify(filtered));
    return true;
  }

  // Blogs
  getBlogs(): BlogPost[] {
    const data = localStorage.getItem(this.BLOGS_KEY);
    return data ? JSON.parse(data) : [];
  }

  getBlog(id: string): BlogPost | null {
    const blogs = this.getBlogs();
    return blogs.find(b => b.id === id) || null;
  }

  saveBlog(blog: Omit<BlogPost, 'id' | 'createdAt' | 'updatedAt'>): BlogPost {
    const blogs = this.getBlogs();
    const newBlog: BlogPost = {
      ...blog,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    blogs.push(newBlog);
    localStorage.setItem(this.BLOGS_KEY, JSON.stringify(blogs));
    return newBlog;
  }

  updateBlog(id: string, updates: Partial<BlogPost>): BlogPost | null {
    const blogs = this.getBlogs();
    const index = blogs.findIndex(b => b.id === id);
    if (index === -1) return null;

    blogs[index] = {
      ...blogs[index],
      ...updates,
      id: blogs[index].id,
      createdAt: blogs[index].createdAt,
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem(this.BLOGS_KEY, JSON.stringify(blogs));
    return blogs[index];
  }

  deleteBlog(id: string): boolean {
    const blogs = this.getBlogs();
    const filtered = blogs.filter(b => b.id !== id);
    if (filtered.length === blogs.length) return false;
    localStorage.setItem(this.BLOGS_KEY, JSON.stringify(filtered));
    return true;
  }

  // WhatsApp Admins
  getWhatsAppAdmins(): WhatsAppAdmin[] {
    const data = localStorage.getItem(this.WA_ADMINS_KEY);
    return data ? JSON.parse(data) : [];
  }

  saveWhatsAppAdmin(admin: Omit<WhatsAppAdmin, 'id'>): WhatsAppAdmin {
    const admins = this.getWhatsAppAdmins();
    const newAdmin: WhatsAppAdmin = {
      ...admin,
      id: Date.now().toString(),
    };
    admins.push(newAdmin);
    localStorage.setItem(this.WA_ADMINS_KEY, JSON.stringify(admins));
    return newAdmin;
  }

  updateWhatsAppAdmin(id: string, updates: Partial<WhatsAppAdmin>): WhatsAppAdmin | null {
    const admins = this.getWhatsAppAdmins();
    const index = admins.findIndex(a => a.id === id);
    if (index === -1) return null;

    admins[index] = { ...admins[index], ...updates, id: admins[index].id };
    localStorage.setItem(this.WA_ADMINS_KEY, JSON.stringify(admins));
    return admins[index];
  }

  deleteWhatsAppAdmin(id: string): boolean {
    const admins = this.getWhatsAppAdmins();
    const filtered = admins.filter(a => a.id !== id);
    if (filtered.length === admins.length) return false;
    localStorage.setItem(this.WA_ADMINS_KEY, JSON.stringify(filtered));
    return true;
  }

  // Marketplace Links
  getMarketplaceLinks(): MarketplaceLink[] {
    const data = localStorage.getItem(this.MARKETPLACE_KEY);
    return data ? JSON.parse(data) : [];
  }

  saveMarketplaceLink(link: Omit<MarketplaceLink, 'id'>): MarketplaceLink {
    const links = this.getMarketplaceLinks();
    const newLink: MarketplaceLink = {
      ...link,
      id: Date.now().toString(),
    };
    links.push(newLink);
    localStorage.setItem(this.MARKETPLACE_KEY, JSON.stringify(links));
    return newLink;
  }

  updateMarketplaceLink(id: string, updates: Partial<MarketplaceLink>): MarketplaceLink | null {
    const links = this.getMarketplaceLinks();
    const index = links.findIndex(l => l.id === id);
    if (index === -1) return null;

    links[index] = { ...links[index], ...updates, id: links[index].id };
    localStorage.setItem(this.MARKETPLACE_KEY, JSON.stringify(links));
    return links[index];
  }

  deleteMarketplaceLink(id: string): boolean {
    const links = this.getMarketplaceLinks();
    const filtered = links.filter(l => l.id !== id);
    if (filtered.length === links.length) return false;
    localStorage.setItem(this.MARKETPLACE_KEY, JSON.stringify(filtered));
    return true;
  }

  // Analytics
  getAnalytics(): AnalyticsData {
    const data = localStorage.getItem(this.ANALYTICS_KEY);
    return data ? JSON.parse(data) : { whatsappClicks: [], marketplaceClicks: [] };
  }

  logWhatsAppClick(adminId: string, adminName: string, productName: string): void {
    const analytics = this.getAnalytics();
    analytics.whatsappClicks.push({
      id: Date.now().toString(),
      adminId,
      adminName,
      productName,
      clickedAt: new Date().toISOString(),
    });
    localStorage.setItem(this.ANALYTICS_KEY, JSON.stringify(analytics));
  }

  logMarketplaceClick(marketplace: string, productName: string): void {
    const analytics = this.getAnalytics();
    analytics.marketplaceClicks.push({
      id: Date.now().toString(),
      marketplace,
      productName,
      clickedAt: new Date().toISOString(),
    });
    localStorage.setItem(this.ANALYTICS_KEY, JSON.stringify(analytics));
  }

  // Initialize with existing data from data.ts
  initializeFromExistingData(
    products: LegacyProduct[],
    blogs: LegacyBlog[],
    waAdmins: LegacyWhatsAppAdmin[],
    marketplace: LegacyMarketplace
  ): void {
    // Only initialize if storage is empty
    if (this.getProducts().length === 0) {
      const transformedProducts: Product[] = products.map((p, index) => ({
        id: (index + 1).toString(),
        name: p.name,
        slug: p.slug,
        category: p.category,
        price: p.price,
        discountPrice: p.discountPrice,
        stock: p.stock,
        unit: p.unit,
        description: p.description,
        features: p.features,
        image: p.image,
        images: p.images,
        isFeatured: p.isFeatured || false,
        meta: p.meta,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));
      localStorage.setItem(this.PRODUCTS_KEY, JSON.stringify(transformedProducts));
    }

    if (this.getBlogs().length === 0) {
      const transformedBlogs: BlogPost[] = blogs.map((b, index) => ({
        id: (index + 1).toString(),
        title: b.title,
        slug: b.slug,
        excerpt: b.excerpt,
        content: b.content,
        author: b.author,
        category: b.category,
        tags: b.tags,
        image: b.image,
        publishedAt: new Date().toISOString(),
        meta: b.meta,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));
      localStorage.setItem(this.BLOGS_KEY, JSON.stringify(transformedBlogs));
    }

    if (this.getWhatsAppAdmins().length === 0) {
      const transformedWA: WhatsAppAdmin[] = waAdmins.map((wa, index) => ({
        id: (index + 1).toString(),
        phone: wa.phone,
        name: wa.name,
        isActive: true,
        rotationOrder: index + 1,
      }));
      localStorage.setItem(this.WA_ADMINS_KEY, JSON.stringify(transformedWA));
    }

    if (this.getMarketplaceLinks().length === 0) {
      const transformedMarketplace: MarketplaceLink[] = [
        {
          id: '1',
          marketplace: 'shopee',
          url: marketplace.shopee,
          isActive: true,
        },
        {
          id: '2',
          marketplace: 'tokopedia',
          url: marketplace.tokopedia,
          isActive: true,
        },
      ];
      localStorage.setItem(this.MARKETPLACE_KEY, JSON.stringify(transformedMarketplace));
    }
  }
}

export const cmsStorage = new CMSStorage();