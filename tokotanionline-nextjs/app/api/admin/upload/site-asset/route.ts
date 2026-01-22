/**
 * PHASE 3.3.1 STEP 4C — INTERNAL ASSET UPLOAD SYSTEM
 * 
 * Endpoint: POST /api/admin/upload/site-asset
 * 
 * Fungsi: Upload logo, favicon, dll ke /public/uploads/site/
 * 
 * Validasi:
 * - Role: admin / super_admin
 * - File type: png, jpg, svg, ico
 * - Auto rename: logo-light.png, logo-dark.png, favicon.ico
 * 
 * Return: { "url": "/uploads/site/logo-light.png" }
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { assertPermission } from '@/lib/permissions';
import fs from 'fs';
import path from 'path';
import { createHash } from 'crypto';

export const runtime = 'nodejs';

// Valid file types for site assets
const VALID_TYPES = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/svg+xml': 'svg',
  'image/x-icon': 'ico',
  'image/vnd.microsoft.icon': 'ico',
};

// Asset type mapping
const ASSET_TYPES = {
  'logo-light': { allowedTypes: ['png', 'jpg', 'svg'], defaultExt: 'png' },
  'logo-dark': { allowedTypes: ['png', 'jpg', 'svg'], defaultExt: 'png' },
  'favicon': { allowedTypes: ['ico', 'png'], defaultExt: 'ico' },
};

export async function POST(req: NextRequest) {
  try {
    // 🔒 GUARD 1: AUTHENTICATION CHECK
    const session = await getServerSession();
    
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized: Not authenticated' },
        { status: 401 }
      );
    }

    // 🔒 GUARD 2: PERMISSION CHECK (admin or super_admin)
    const userRole = (session.user as any).role;
    if (userRole !== 'admin' && userRole !== 'super_admin') {
      return NextResponse.json(
        { error: 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }

    // 📥 GET FORM DATA
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const assetType = (formData.get('assetType') as string) || 'logo-light'; // logo-light, logo-dark, favicon

    if (!file) {
      return NextResponse.json(
        { error: 'No file uploaded' },
        { status: 400 }
      );
    }

    // ✅ VALIDATE FILE TYPE
    const fileType = file.type.toLowerCase();
    const ext = VALID_TYPES[fileType as keyof typeof VALID_TYPES];
    
    if (!ext) {
      return NextResponse.json(
        { error: 'Invalid file type. Only PNG, JPG, SVG, and ICO are allowed.' },
        { status: 400 }
      );
    }

    // ✅ VALIDATE ASSET TYPE SPECIFIC RULES
    const assetConfig = ASSET_TYPES[assetType as keyof typeof ASSET_TYPES];
    if (!assetConfig) {
      return NextResponse.json(
        { error: `Invalid asset type. Allowed: ${Object.keys(ASSET_TYPES).join(', ')}` },
        { status: 400 }
      );
    }

    if (!assetConfig.allowedTypes.includes(ext)) {
      return NextResponse.json(
        { error: `Invalid file type for ${assetType}. Allowed: ${assetConfig.allowedTypes.join(', ')}` },
        { status: 400 }
      );
    }

    // ✅ VALIDATE FILE SIZE (max 2MB for site assets)
    const maxSize = 2 * 1024 * 1024; // 2MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File size too large. Maximum size is 2MB.' },
        { status: 400 }
      );
    }

    // 📁 PREPARE UPLOAD DIRECTORY
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'site');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // 📝 GENERATE FILENAME (auto rename sesuai asset type)
    const finalExt = assetConfig.defaultExt || ext;
    const filename = `${assetType}.${finalExt}`;
    const filePath = path.join(uploadDir, filename);
    const relativePath = `/uploads/site/${filename}`;

    // 💾 SAVE FILE
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    fs.writeFileSync(filePath, buffer);

    // ✅ VERIFY FILE WAS SAVED
    if (!fs.existsSync(filePath)) {
      return NextResponse.json(
        { error: 'Failed to save file' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      url: relativePath,
      assetType,
      filename,
    });

  } catch (error: any) {
    console.error('❌ [POST /api/admin/upload/site-asset] Error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error.message,
      },
      { status: 500 }
    );
  }
}
