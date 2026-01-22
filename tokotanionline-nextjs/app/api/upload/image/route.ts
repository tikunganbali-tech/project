import { NextRequest, NextResponse } from 'next/server';
// DISABLED: Supabase module not available
// import { supabaseServer } from '@/lib/supabaseServer';
import fs from 'fs';
import path from 'path';
import { createHash } from 'crypto';
import { normalizeImagePath } from '@/lib/normalizeImagePath';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    // Security: Check authentication
    const { getServerSession } = await import('@/lib/auth');
    const session = await getServerSession();
    if (!session || (session.user as any).role !== 'super_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const category = (formData.get('category') as string) || 'products'; // products, settings, blog, etc.

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    // PHASE G: Validate file type (MIME whitelist)
    const validImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'image/x-icon', 'image/vnd.microsoft.icon'];
    if (!validImageTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file type. Only images are allowed.' }, { status: 400 });
    }

    // PHASE G: Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return NextResponse.json({ error: 'File size too large. Maximum size is 5MB.' }, { status: 400 });
    }

    // PHASE G: Reject double extension (e.g., file.jpg.exe)
    const filename = file.name.toLowerCase();
    const parts = filename.split('.');
    if (parts.length > 2) {
      // Check if there are multiple extensions
      const lastExt = parts[parts.length - 1];
      const secondLastExt = parts[parts.length - 2];
      const dangerousExtensions = ['exe', 'bat', 'cmd', 'com', 'pif', 'scr', 'vbs', 'js', 'jar', 'sh'];
      
      if (dangerousExtensions.includes(lastExt) || dangerousExtensions.includes(secondLastExt)) {
        return NextResponse.json({ error: 'File with double extension detected. Upload rejected for security.' }, { status: 400 });
      }
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';

    // Use local storage for settings/images/blog/products, Supabase fallback (if configured)
    if (category === 'settings' || category === 'favicon' || category === 'logo' || category === 'blog' || category === 'products') {
      // Determine directory based on category
      const dirName = category === 'blog' ? 'blog' : (category === 'products' ? 'products' : 'settings');
      const uploadDir = path.join(process.cwd(), 'public', 'images', dirName);
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      // Generate unique filename
      const hash = createHash('md5')
        .update(`${category}-${Date.now()}-${Math.random()}`)
        .digest('hex')
        .substring(0, 8);
      
      const filename = category === 'blog' 
        ? `blog-${hash}.${ext}` 
        : category === 'products'
        ? `product-${hash}.${ext}`
        : `${category}-${hash}.${ext}`;
      const filePath = path.join(uploadDir, filename);
      const relativePath = `/images/${dirName}/${filename}`;

      // Save file
      fs.writeFileSync(filePath, buffer);

      // Verify file was saved
      if (!fs.existsSync(filePath)) {
        return NextResponse.json({ error: 'Failed to save file' }, { status: 500 });
      }

      // M-02: Normalize path before returning
      const normalizedPath = normalizeImagePath(relativePath);

      return NextResponse.json({ 
        url: normalizedPath,
        localPath: normalizedPath,
        category,
      });
    } else {
      // Use Supabase for products and other categories (if configured)
      // DISABLED: Supabase module not available
      const supabaseServer = null;
      if (!supabaseServer) {
        // Fallback to local storage if Supabase not configured
        const fallbackDir = path.join(process.cwd(), 'public', 'images', category);
        if (!fs.existsSync(fallbackDir)) {
          fs.mkdirSync(fallbackDir, { recursive: true });
        }

        const hash = createHash('md5')
          .update(`${category}-${Date.now()}-${Math.random()}`)
          .digest('hex')
          .substring(0, 8);
        
        const filename = `${category}-${hash}.${ext}`;
        const filePath = path.join(fallbackDir, filename);
        const relativePath = `/images/${category}/${filename}`;

        fs.writeFileSync(filePath, buffer);

        // M-02: Normalize path before returning
        const normalizedPath = normalizeImagePath(relativePath);

        return NextResponse.json({ 
          url: normalizedPath,
          localPath: normalizedPath,
          category,
        });
      }

      // DISABLED: Supabase upload not available
      // const filename = `${category}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

      // const { data, error } = await supabaseServer.storage.from('products').upload(filename, buffer, {
      //   contentType: file.type,
      //   upsert: false,
      // });

      // if (error) {
      //   console.error('Supabase upload error', error);
      //   return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
      // }

      // const { data: publicUrl } = supabaseServer.storage.from('products').getPublicUrl(data.path);

      // return NextResponse.json({ 
      //   url: publicUrl.publicUrl,
      //   category,
      // });
      
      // Fallback: use local storage
      const fallbackDir = path.join(process.cwd(), 'public', 'images', category);
      if (!fs.existsSync(fallbackDir)) {
        fs.mkdirSync(fallbackDir, { recursive: true });
      }

      const hash = createHash('md5')
        .update(`${category}-${Date.now()}-${Math.random()}`)
        .digest('hex')
        .substring(0, 8);
      
      const filename = `${category}-${hash}.${ext}`;
      const filePath = path.join(fallbackDir, filename);
      const relativePath = `/images/${category}/${filename}`;

      fs.writeFileSync(filePath, buffer);

      // M-02: Normalize path before returning
      const normalizedPath = normalizeImagePath(relativePath);

      return NextResponse.json({ 
        url: normalizedPath,
        localPath: normalizedPath,
        category,
      });
    }
  } catch (err: any) {
    console.error('Upload error:', err);
    return NextResponse.json({ error: err.message || 'Upload failed' }, { status: 500 });
  }
}



















