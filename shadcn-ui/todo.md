# TOKOTANIONLINE - Agricultural E-Commerce Development Plan

## Design Guidelines

### Design References
- **Agricultural Professional Theme**: Clean, trustworthy, farmer-centric
- **Color Palette**: 
  - Primary: #166534 (Dark Green - agricultural theme)
  - Secondary: #15803d (Medium Green - accents)
  - Accent: #92400e (Earth Brown - CTAs)
  - Background: #ffffff (White - clean)
  - Text: #1f2937 (Dark Gray), #6b7280 (Medium Gray)
  
### Typography
- Heading1: Inter font-weight 700 (48px)
- Heading2: Inter font-weight 600 (36px)
- Heading3: Inter font-weight 600 (24px)
- Body: Inter font-weight 400 (16px)
- CTA: Inter font-weight 600 (16px)

### Key Component Styles
- Buttons: Green primary (#166534), brown accent (#92400e), rounded-lg
- Cards: White background, subtle shadow, border
- Forms: Clean inputs with focus states
- Navigation: Sticky header with green theme

### Images to Generate
1. **hero-farmer-field.jpg** - Indonesian farmer in rice/vegetable field, professional, trustworthy (Style: photorealistic)
2. **product-seeds-display.jpg** - Agricultural seeds packaging display, professional product photography (Style: photorealistic)
3. **product-pesticide-bottles.jpg** - Fungicide bottles arranged professionally (Style: photorealistic)
4. **blog-chili-plant.jpg** - Healthy chili plants in field (Style: photorealistic)
5. **blog-cabbage-harvest.jpg** - Fresh cabbage harvest (Style: photorealistic)
6. **testimonial-farmer.jpg** - Happy Indonesian farmer portrait (Style: photorealistic)
7. **about-team.jpg** - Agricultural team working together (Style: photorealistic)
8. **contact-warehouse.jpg** - Agricultural product warehouse (Style: photorealistic)

---

## Development Tasks

### Phase 1: Foundation (Tasks 1-3)
1. **Project Setup**
   - Initialize Next.js 14 with App Router
   - Install dependencies: @supabase/supabase-js, @supabase/ssr, next-themes, lucide-react
   - Configure Tailwind CSS
   - Set up project structure

2. **Database Schema**
   - Create tables: app_de23c_admins, app_de23c_admin_roles, app_de23c_products, app_de23c_product_categories
   - Create tables: app_de23c_blogs, app_de23c_blog_categories, app_de23c_blog_tags, app_de23c_blog_product_relations
   - Create tables: app_de23c_wa_admins, app_de23c_wa_logs, app_de23c_marketplace_links
   - Create tables: app_de23c_seo_meta, app_de23c_ai_content_queue, app_de23c_tracking_events
   - Set up RLS policies for all tables

3. **Authentication System**
   - Create auth middleware
   - Build login page
   - Implement role-based access control (Super Admin, Content Admin, Sales Admin)
   - Create protected admin routes

### Phase 2: Core Features (Tasks 4-6)
4. **Product System**
   - Create product listing page (/produk)
   - Create dynamic product detail pages (/produk/[slug])
   - Implement SEO optimization (meta tags, structured data)
   - Preload 14 products with complete data
   - Add WhatsApp and marketplace CTAs

5. **Blog System**
   - Create blog listing page (/blog)
   - Create category pages (/blog/kategori/[slug])
   - Create dynamic blog detail pages (/blog/[slug])
   - Implement blog CMS in admin panel
   - Preload 5 sample articles
   - Add internal product linking

6. **AI Content Automation**
   - Create AI article generator edge function
   - Build scheduling system for 360-day automation
   - Create admin interface for AI content generation
   - Implement content queue management
   - Add auto-publish functionality

### Phase 3: Checkout & Marketing (Tasks 7-9)
7. **WhatsApp Checkout System**
   - Implement fair round-robin rotation algorithm
   - Create WhatsApp admin management in CMS
   - Build logging system for tracking
   - Create analytics dashboard for admin

8. **Marketplace Integration**
   - Add Shopee checkout buttons
   - Add Tokopedia checkout buttons
   - Create marketplace link manager in CMS
   - Implement click tracking

9. **Marketing Tracking**
   - Integrate Facebook Pixel
   - Integrate Google Ads Global Tag
   - Integrate Google Analytics 4
   - Integrate TikTok Pixel
   - Set up event tracking (PageView, ViewContent, AddToCart, Contact, MarketplaceClick)

### Phase 4: Admin & SEO (Tasks 10-11)
10. **Admin CMS Panel**
    - Build admin dashboard layout
    - Create product manager module
    - Create blog manager module
    - Create AI content generator interface
    - Create blog scheduler interface
    - Create WhatsApp admin manager
    - Create WhatsApp log analytics
    - Create marketplace link manager
    - Create SEO meta manager

11. **SEO Optimization**
    - Generate sitemap.xml dynamically
    - Create robots.txt
    - Implement canonical URLs
    - Add structured data (Product & Article schema)
    - Optimize images with Next.js Image
    - Implement internal linking logic

### Phase 5: Frontend & Polish (Tasks 12-13)
12. **Frontend Pages**
    - Homepage with hero, featured products, latest blog
    - Product listing with filters
    - Product detail with complete SEO
    - Blog listing with categories
    - Blog detail with related products
    - About page (/tentang-kami)
    - Testimonials page (/testimoni)
    - Contact page (/kontak)

13. **Testing & Optimization**
    - Run lint checks
    - Fix all errors
    - Optimize performance
    - Test all routes
    - Verify SEO implementation
    - Check mobile responsiveness
    - Final production build

---

## Product List (Preload Data)
1. Benih Cabe Oriental Seed
2. Benih Kubis Greennova
3. Fungisida Mantep 80 WP
4. Fungisida Manzate 82 WP
5. Maher
6. Cabriotop
7. Raban
8. Tridex
9. Antila
10. Cadilac
11. Brofeya
12. Gracia
13. Dimodis
14. Rizotin

## Blog Categories
- Benih
- Fungisida
- Hama & Penyakit
- Tips Bertani

## Sample Articles (Preload)
1. Cara Mengatasi Penyakit Antraknosa Pada Cabe
2. Cabe Rontok Bunga? Ini Solusinya
3. Panduan Lengkap Budidaya Cabe Hybrid
4. Cara Meningkatkan Hasil Panen Kubis
5. Perbedaan Fungisida Mantep 80 WP dan Manzate 82 WP