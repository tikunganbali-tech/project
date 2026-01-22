-- FITUR 4: Add specifications, sku, and publishedAt fields to Product table
-- Run this SQL directly on your database if migration fails

-- Add specifications field (nullable text)
ALTER TABLE "Product" 
ADD COLUMN IF NOT EXISTS "specifications" TEXT;

-- Add sku field (nullable string)
ALTER TABLE "Product" 
ADD COLUMN IF NOT EXISTS "sku" TEXT;

-- Add publishedAt field (nullable timestamp)
ALTER TABLE "Product" 
ADD COLUMN IF NOT EXISTS "publishedAt" TIMESTAMP(3);

-- Add index for sku + brandId (for unique SKU per brand queries)
CREATE INDEX IF NOT EXISTS "Product_sku_brandId_idx" ON "Product"("sku", "brandId");

-- Add index for status + publishedAt (for published products queries)
CREATE INDEX IF NOT EXISTS "Product_status_publishedAt_idx" ON "Product"("status", "publishedAt");
