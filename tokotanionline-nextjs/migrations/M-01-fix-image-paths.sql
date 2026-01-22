-- M-01: Fix Image Paths - Remove /public prefix
-- 
-- IMPORTANT: BACKUP DATABASE BEFORE RUNNING THIS SCRIPT
-- 
-- This script removes /public prefix from image paths in database
-- Next.js serves public/ folder from root, so paths should be /images/... not /public/images/...
--
-- Run this script ONCE after verifying backup

-- Update Product.imageUrl
UPDATE "Product"
SET "imageUrl" = REPLACE("imageUrl", '/public', '')
WHERE "imageUrl" LIKE '/public/%';

-- Update Product.images (JSON array)
-- Note: This handles JSON arrays stored as strings
UPDATE "Product"
SET "images" = REPLACE("images", '/public', '')
WHERE "images" LIKE '%/public/%';

-- Update Blog.imageUrl
UPDATE "Blog"
SET "imageUrl" = REPLACE("imageUrl", '/public', '')
WHERE "imageUrl" LIKE '/public/%';

-- Update BlogPost.featuredImageUrl
UPDATE "BlogPost"
SET "featuredImageUrl" = REPLACE("featuredImageUrl", '/public', '')
WHERE "featuredImageUrl" LIKE '/public/%';

-- Update ProductCategory.imageUrl (if exists)
-- Check if column exists first in your database
UPDATE "ProductCategory"
SET "imageUrl" = REPLACE("imageUrl", '/public', '')
WHERE "imageUrl" LIKE '/public/%';

-- Verification queries (run after update to verify)
-- SELECT COUNT(*) FROM "Product" WHERE "imageUrl" LIKE '/public/%';
-- SELECT COUNT(*) FROM "Blog" WHERE "imageUrl" LIKE '/public/%';
-- SELECT COUNT(*) FROM "BlogPost" WHERE "featuredImageUrl" LIKE '/public/%';
