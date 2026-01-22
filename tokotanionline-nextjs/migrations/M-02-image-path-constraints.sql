-- M-02: Image Path Normalization - Database Constraints
-- 
-- IMPORTANT: BACKUP DATABASE BEFORE RUNNING THIS SCRIPT
-- 
-- This script adds CHECK constraints to enforce image path format: /images/...
-- Database will reject any path that doesn't start with /images/
--
-- Run this script ONCE after verifying backup

-- Product.imageUrl
ALTER TABLE "Product"
ADD CONSTRAINT product_imageurl_must_be_public
CHECK ("imageUrl" IS NULL OR "imageUrl" LIKE '/images/%');

-- ProductCategory.imageUrl
ALTER TABLE "ProductCategory"
ADD CONSTRAINT productcategory_imageurl_must_be_public
CHECK ("imageUrl" IS NULL OR "imageUrl" LIKE '/images/%');

-- Blog.imageUrl
ALTER TABLE "Blog"
ADD CONSTRAINT blog_imageurl_must_be_public
CHECK ("imageUrl" IS NULL OR "imageUrl" LIKE '/images/%');

-- BlogPost.featuredImageUrl
ALTER TABLE "BlogPost"
ADD CONSTRAINT blogpost_featuredimageurl_must_be_public
CHECK ("featuredImageUrl" IS NULL OR "featuredImageUrl" LIKE '/images/%');

-- ProductImage.url
ALTER TABLE "ProductImage"
ADD CONSTRAINT productimage_url_must_be_public
CHECK ("url" LIKE '/images/%');

-- SeoImageIntelligence.imagePath
ALTER TABLE "SeoImageIntelligence"
ADD CONSTRAINT seoimageintelligence_imagepath_must_be_public
CHECK ("imagePath" LIKE '/images/%');

-- Verification queries (run after adding constraints to verify)
-- SELECT COUNT(*) FROM "Product" WHERE "imageUrl" IS NOT NULL AND "imageUrl" NOT LIKE '/images/%';
-- SELECT COUNT(*) FROM "Blog" WHERE "imageUrl" IS NOT NULL AND "imageUrl" NOT LIKE '/images/%';
-- SELECT COUNT(*) FROM "BlogPost" WHERE "featuredImageUrl" IS NOT NULL AND "featuredImageUrl" NOT LIKE '/images/%';
-- SELECT COUNT(*) FROM "ProductImage" WHERE "url" NOT LIKE '/images/%';
-- SELECT COUNT(*) FROM "SeoImageIntelligence" WHERE "imagePath" NOT LIKE '/images/%';
