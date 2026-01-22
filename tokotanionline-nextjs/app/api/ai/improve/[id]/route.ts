/**
 * API Route: Improve Existing Blog Post
 * Uses AI Generator logic to improve published blog posts
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
// DISABLED: Engine module not available
// import { improveBlogPost, type ImproveBlogOptions } from '@/lib/ai/improve-blog-engine';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession();
    if (!session || (session.user as any).role === 'marketing_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // DISABLED: Blog improvement requires engine module that is not available
    return NextResponse.json({ 
      error: 'Blog improvement is temporarily disabled',
      reason: 'Required engine module is not available',
    }, { status: 503 });

    // let body = {};
    // try {
    //   body = await request.json();
    // } catch (error) {
    //   console.warn('Failed to parse request body, using defaults');
    // }

    // const bodyData = body as {
    //   improveContent?: boolean;
    //   improveImage?: boolean;
    //   improveSEO?: boolean;
    //   syncEngines?: boolean;
    // };
    
    // const options: ImproveBlogOptions = {
    //   blogId: params.id,
    //   improveContent: bodyData?.improveContent !== false, // Default true
    //   improveImage: bodyData?.improveImage !== false, // Default true
    //   improveSEO: bodyData?.improveSEO !== false, // Default true
    //   syncEngines: bodyData?.syncEngines !== false, // Default true
    // };

    // console.log('Starting blog improvement:', { blogId: params.id, options });

    // const result = await improveBlogPost(options);

    // DISABLED: Code below requires engine module
    /*
    console.log('Blog improvement completed:', {
      blogId: params.id,
      success: result.success,
      improvementsCount: result.improvements.length,
      errorsCount: result.errors.length,
    });

    if (!result.success && result.errors.length > 0) {
      return NextResponse.json(
        {
          ...result,
          message: 'Blog improvement completed with errors',
        },
        { status: 207 } // Multi-Status
      );
    }

    return NextResponse.json({
      ...result,
      message: 'Blog improved successfully',
    });
    */
  } catch (error: any) {
    console.error('Error improving blog:', error);
    console.error('Error stack:', error.stack);
    console.error('Error details:', {
      message: error.message,
      name: error.name,
      code: error.code,
    });
    
    return NextResponse.json(
      { 
        error: error.message || 'Failed to improve blog',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

