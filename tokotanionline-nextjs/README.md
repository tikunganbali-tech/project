# 🚀 TOKO TANI ONLINE - Next.js E-Commerce Platform

Platform e-commerce pertanian lengkap dengan CMS, AI automation, dan SEO optimization.

## 🎯 Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Auth**: NextAuth
- **Styling**: Tailwind CSS
- **State**: Zustand
- **Animations**: Framer Motion

## 📋 Prerequisites

- Node.js 18+
- PostgreSQL 14+
- npm atau yarn

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Setup Environment

Buat file `.env` di root project:

```env
DATABASE_URL="postgresql://username:password@localhost:5432/tokotanionline?schema=public"
NEXTAUTH_SECRET="your-secret-key-minimum-32-characters"
NEXTAUTH_URL="http://localhost:3000"
NEXT_PUBLIC_SITE_URL="http://localhost:3000"
```

### 3. Setup Database

```bash
# Generate Prisma Client
npm run prisma:generate

# Push schema ke database
npm run prisma:push

# Seed data awal
npm run seed
```

### 4. Start Development Server

```bash
npm run dev
```

Akses: **http://localhost:3000**

## 🔐 Admin Access

- **URL**: http://localhost:3000/admin/login
- **Email**: `admin@tokotanionline.com`
- **Password**: `admin123`

## 📁 Project Structure

```
tokotanionline-nextjs/
├── app/                    # Next.js App Router
│   ├── admin/             # Admin CMS pages
│   ├── api/               # API routes
│   ├── blog/              # Blog pages
│   └── produk/            # Product pages
├── components/            # React components
│   └── admin/             # Admin components
├── lib/                   # Utilities & helpers
├── prisma/                # Prisma schema
└── scripts/               # Utility scripts
```

## ✨ Features

### Frontend
- ✅ Homepage dengan hero, featured products, blog highlights
- ✅ Product listing & detail pages (ISR)
- ✅ Blog listing & detail pages (SSG+ISR)
- ✅ SEO optimized dengan schema markup
- ✅ Social proof overlay
- ✅ WhatsApp integration dengan rotation

### Admin CMS
- ✅ Dashboard dengan analytics
- ✅ Product management (CRUD)
- ✅ Blog management (CRUD + Scheduling)
- ✅ AI Content Generator
- ✅ Scheduler management
- ✅ WhatsApp admin management
- ✅ Marketing settings (Pixels)
- ✅ Layout settings (Logo, Colors, Homepage blocks)

### Automation (FASE 4)
- ✅ Content scheduler dengan ON/OFF control
- ✅ Automated content generation (3-5/hari)
- ✅ Rate limiting & safety guards
- ✅ Time window enforcement
- ✅ Non-overlap execution
- ✅ Comprehensive logging & monitoring
- ✅ DRY_RUN mode untuk testing
- ✅ VPS-friendly (cron/systemd ready)

### SEO
- ✅ Dynamic meta tags
- ✅ OpenGraph & Twitter Cards
- ✅ Schema markup (Product, Article, FAQ, Breadcrumb)
- ✅ Auto-generated sitemap.xml
- ✅ Robots.txt

## 🛠️ Available Scripts

### Development
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

### Database
- `npm run seed` - Seed database
- `npm run prisma:generate` - Generate Prisma Client
- `npm run prisma:push` - Push schema to database
- `npm run prisma:studio` - Open Prisma Studio

### Scheduler (FASE 4)
- `npm run scheduler:worker` - Run scheduler worker
- `npm run scheduler:worker:dry` - Run worker in DRY_RUN mode
- `npm run scheduler:verify` - Verify scheduler setup
- `npm run scheduler:init` - Initialize scheduler config

## 📝 Database Schema

Database menggunakan PostgreSQL dengan Prisma ORM. Schema lengkap ada di `prisma/schema.prisma`.

## 🔒 Security

- NextAuth untuk authentication
- Role-based access control (Super Admin, Content Admin, Marketing Admin)
- Input validation dengan Zod
- Rate limiting ready

## 🚀 Deployment

1. Build project: `npm run build`
2. Start production: `npm run start`
3. Setup environment variables di hosting platform
4. Run migrations: `npm run prisma:push`

## 📄 License

Private project

---

**🎉 Ready for Production!**
