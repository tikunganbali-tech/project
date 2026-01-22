/**
 * Image Placeholder API
 * Returns relevant agricultural images from Unsplash (free API)
 * For testing image engine without third-party integration
 */

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const prompt = searchParams.get('prompt') || '';
    const title = searchParams.get('title') || '';
    const keyword = searchParams.get('keyword') || '';

    // Extract search term from keyword or title
    const searchTerm = keyword.toLowerCase().split(' ')[0] || 'agriculture';
    
    // Use Unsplash Source API (free, no auth required for basic usage)
    // Format: https://source.unsplash.com/featured/?{keywords}
    // Or use Unsplash API with access key for better results
    
    // For now, we'll use a simple placeholder that returns relevant agricultural images
    // In production, replace with actual image generation service
    
    const imageUrl = `https://source.unsplash.com/featured/1200x630/?${encodeURIComponent(searchTerm)},agriculture,farming`;
    
    // Alternative: Use a placeholder service that generates images
    // const imageUrl = `https://via.placeholder.com/1200x630/16a34a/ffffff?text=${encodeURIComponent(title.substring(0, 50))}`;
    
    return NextResponse.json({
      url: imageUrl,
      prompt,
      title,
      keyword,
      source: 'unsplash_placeholder',
      note: 'This is a placeholder. In production, integrate with actual image generation service.',
    });
  } catch (error) {
    console.error('Error in image placeholder:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}






