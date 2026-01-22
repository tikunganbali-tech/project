# PHASE 1: UNIVERSAL CATEGORY CORE - Implementation Summary

## Overview

This document summarizes the implementation of the Universal Category Core system that scales to any niche without structural changes. The system replaces separate `ProductCategory`, `BlogCategory`, and `ContentCategory` tables with a unified `Category` table controlled by `CategoryContext`.

## Database Schema

### New Models

#### Category Model
```prisma
model Category {
  id        String            @id @default(cuid())
  name      String
  slug      String            @unique // Globally unique, lowercase, hyphenated
  parentId  String?           // FK -> categories.id, nullable (null = root)
  level     Int               // 1, 2, or 3 (auto-calculated)
  type      String            // Flexible string for any niche
  isActive  Boolean           @default(true)
  brandId   String?           // Optional: for multi-brand support (null = global)
  createdAt DateTime          @default(now())
  updatedAt DateTime          @updatedAt
  
  // Relationships
  brand     Brand?            @relation(...)
  parent    Category?         @relation("CategoryHierarchy", ...)
  children  Category[]        @relation("CategoryHierarchy")
  contexts  CategoryContext[]
  products  Product[]         @relation("ProductToCategory")
  blogs     Blog[]            @relation("BlogToCategory")
  blogPosts BlogPost[]        @relation("BlogPostToCategory")
}
```

#### CategoryContext Model
```prisma
model CategoryContext {
  id         String   @id @default(cuid())
  categoryId String
  context    CategoryContextType // 'product', 'blog', 'ai'
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
  
  category   Category @relation(...)
  
  @@unique([categoryId, context])
}
```

### Updated Models

- **Product**: Added `unifiedCategoryId` (optional during migration)
- **Blog**: Added `unifiedCategoryId` (optional during migration)
- **BlogPost**: Added `unifiedCategoryId` (optional during migration)
- **Brand**: Added `categories` relation

## Key Features

### 1. Validation Rules
- ✅ Slug globally unique
- ✅ ParentId valid (if provided)
- ✅ No orphan categories
- ✅ Level auto-calculated (1, 2, or 3)
- ✅ Maximum depth: 3 levels
- ✅ No circular references

### 2. Context-Based Behavior
- **Product UI**: Filters by `context='product'`
- **Blog UI**: Filters by `context='blog'`
- **AI Generator**: Uses `context='ai'` and enforces niche lock

### 3. Idempotent Operations
- Category insert skips if exists (by slug)
- Auto-creates context rows (product, blog, ai) for each category
- Safe to run migration multiple times

## Migration Strategy

### Phase 1: Schema Creation
1. ✅ Added `Category` and `CategoryContext` models to schema
2. ✅ Added optional `unifiedCategoryId` fields to Product, Blog, BlogPost
3. ✅ Created migration script: `scripts/migrate-to-unified-categories.ts`

### Phase 2: Data Migration
1. Run migration script to migrate existing data:
   ```bash
   npx tsx scripts/migrate-to-unified-categories.ts
   ```
2. Script migrates:
   - `ProductCategory` → `Category` (with context='product')
   - `BlogCategory` → `Category` (with context='blog')
   - `ContentCategory` → `Category` (with context='blog' and 'ai')
3. Updates Product/Blog/BlogPost references

### Phase 3: Category Tree Insertion
1. Edit `scripts/insert-category-tree.ts` with your category tree
2. Run script:
   ```bash
   npx tsx scripts/insert-category-tree.ts
   ```
3. Script automatically:
   - Creates categories with hierarchy
   - Auto-calculates levels
   - Creates context rows (product, blog, ai) for each category

## API Updates

### Admin API: `/api/admin/categories`
- **GET**: List categories with `context` filter (product/blog/ai)
- **POST**: Create category with auto slug generation and context creation

### Public API: `/api/public/categories`
- **GET**: List categories with `context` filter (default: product)

### Public API: `/api/public/home`
- Updated to fetch categories with `context='product'`

### AI Generator: `/api/admin/blog/posts/ai-generate`
- **REQUIRED**: `category_id` parameter
- Validates category has 'blog' context
- Validates category level (2 or 3, level 1 only for editorial)
- Builds keyword cluster from category tree
- Enforces niche lock (AI must stay within category tree)

## Frontend Updates

### Components
- All category lists are fetched from APIs (no hard-coded lists)
- Components receive categories as props
- Filtering by context handled at API level

### Pages
- `/produk`: Uses categories with `context='product'`
- `/blog`: Uses categories with `context='blog'`
- Homepage: Uses categories with `context='product'`

## Utility Functions

### `lib/unified-category-utils.ts`
- `calculateCategoryLevel()`: Auto-calculate level from parent
- `generateUnifiedCategorySlug()`: Generate unique slug
- `validateCategory()`: Validate before insert/update
- `upsertCategory()`: Idempotent category insert
- `insertCategoryTree()`: Insert category tree with hierarchy
- `getCategoryWithParentChain()`: Get category with full parent chain (for AI)
- `getCategoriesByContext()`: Get categories filtered by context

## AI Generator Niche Lock

### Requirements
1. **category_id REQUIRED**: AI generator now requires `category_id`
2. **Context Validation**: Category must have 'blog' context
3. **Level Validation**: Only level 2 or 3 allowed (level 1 for editorial only)
4. **Keyword Cluster**: Built from category tree (category name + all parent names)
5. **Niche Lock**: AI is forbidden to:
   - Discuss other categories
   - Generate general topics
   - Escape niche
   - Invent taxonomy

### Implementation
- Category chain loaded: `getCategoryWithParentChain(category_id)`
- Keyword cluster built: `[category, ...parents].join(', ')`
- Passed to Go engine with `nicheLock: true` and `allowedTopics`

## Next Steps

1. **Run Migration**:
   ```bash
   npx tsx scripts/migrate-to-unified-categories.ts
   ```

2. **Insert Category Tree** (when provided):
   - Edit `scripts/insert-category-tree.ts`
   - Add your category tree structure
   - Run: `npx tsx scripts/insert-category-tree.ts`

3. **Update Prisma Schema**:
   ```bash
   npx prisma migrate dev --name unified-category-core
   npx prisma generate
   ```

4. **Verify**:
   - Check categories in admin UI
   - Verify product/blog filtering works
   - Test AI generator with category_id

5. **Gradual Migration** (Optional):
   - Keep old category tables during transition
   - Update Product/Blog/BlogPost to use `unifiedCategoryId`
   - Remove old tables once migration complete

## Files Modified

### Schema
- `prisma/schema.prisma`: Added Category, CategoryContext models

### Utilities
- `lib/unified-category-utils.ts`: New utility functions

### Scripts
- `scripts/migrate-to-unified-categories.ts`: Migration script
- `scripts/insert-category-tree.ts`: Category tree insertion script

### API Routes
- `app/api/admin/categories/route.ts`: Updated to use unified Category
- `app/api/public/categories/route.ts`: Updated to use unified Category
- `app/api/public/home/route.ts`: Updated to use unified Category
- `app/api/admin/blog/posts/ai-generate/route.ts`: Added category_id requirement and niche lock

## Notes

- Old category tables (`ProductCategory`, `BlogCategory`, `ContentCategory`) remain in schema for backward compatibility during migration
- `unifiedCategoryId` fields are optional to allow gradual migration
- All validation rules enforced at utility level
- Context rows (product, blog, ai) auto-created for each category
- System is idempotent - safe to run multiple times
