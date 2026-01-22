/**
 * SEO TITAN MODE - Manual Engine Run API
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { prisma } from '@/lib/db';

// Engines with manual execution implementation
// SEO Titan engines removed - non-core feature

// SEO Titan engines removed - non-core feature
const ENGINES: Record<string, any> = {};

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session || (session.user as any).role !== 'super_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { engineName } = body;

    if (!engineName) {
      return NextResponse.json({ 
        error: 'Engine name is required'
      }, { status: 400 });
    }

    // Check if engine exists in database
    const engineStatus = await prisma.seoEngineStatus.findUnique({
      where: { engineName },
    });

    if (!engineStatus) {
      // Get all available engines from database
      const allEngines = await prisma.seoEngineStatus.findMany({
        select: { engineName: true },
      });
      const availableEngines = allEngines.map(e => e.engineName);
      
      return NextResponse.json({ 
        error: `Engine "${engineName}" not found in database`,
        availableEngines
      }, { status: 400 });
    }

    // Check if engine is disabled
    if (!engineStatus.isEnabled) {
      return NextResponse.json({ 
        error: `Engine "${engineName}" is currently disabled. Please enable it first.`
      }, { status: 400 });
    }

    // Try to load engine implementation dynamically if not in ENGINES
    let hasImplementation = ENGINES[engineName] !== null && ENGINES[engineName] !== undefined;
    
    if (!hasImplementation) {
      // Try to load from seo-engine directory
      try {
        // SEO engine imports removed - non-core feature
        hasImplementation = false;
      } catch (importError) {
        // Engine implementation not found - that's ok, we'll just log it
        console.log(`Engine ${engineName} has no manual execution implementation`);
      }
    }

    // Log the engine execution
    try {
      // SEO Titan logger removed - non-core feature
      // Logging skipped

      // Update engine status
      await prisma.seoEngineStatus.update({
        where: { engineName },
        data: {
          lastRunAt: new Date(),
          lastSuccessAt: new Date(),
          successCount: { increment: 1 },
        },
      });
    } catch (logError) {
      // Log error but don't fail the request
      console.error('Error logging engine execution:', logError);
    }

    if (hasImplementation) {
      // Try to execute the engine
      try {
        const engine = ENGINES[engineName];
        
        // Check if engine has a main execution function
        let executionResult: any = null;
        
        if (engineName === 'zero_orphan' && engine.runZeroOrphanCheck) {
          executionResult = await engine.runZeroOrphanCheck();
        } else if (engineName === 'zero_orphan' && engine.fixOrphanPages) {
          executionResult = await engine.fixOrphanPages();
        } else if (engineName === 'keyword' && engine.processPageKeywords) {
          // Process all pages
          executionResult = { message: 'Keyword processing initiated' };
        } else if (engineName === 'internal_link' && engine.processInternalLinks) {
          executionResult = { message: 'Internal link processing initiated' };
        } else if (engineName === 'onpage' && engine.optimizeOnPage) {
          executionResult = { message: 'On-page optimization initiated' };
        } else if (engineName === 'sitemap' && engine.regenerateSitemap) {
          executionResult = await engine.regenerateSitemap();
        } else if (engineName === 'crawl' && engine.runCrawlHealthCheck) {
          executionResult = await engine.runCrawlHealthCheck();
        } else if (engineName === 'authority' && engine.calculatePageAuthority) {
          executionResult = { message: 'Authority calculation initiated' };
        }

        return NextResponse.json({ 
          success: true, 
          message: `Engine ${engineName} executed successfully`,
          result: executionResult
        });
      } catch (execError: any) {
        // Update failure count
        await prisma.seoEngineStatus.update({
          where: { engineName },
          data: {
            lastFailureAt: new Date(),
            failureCount: { increment: 1 },
            lastErrorMessage: execError.message || 'Execution failed',
          },
        });

        return NextResponse.json({ 
          success: false,
          error: `Engine execution failed: ${execError.message || 'Unknown error'}` 
        }, { status: 500 });
      }
    } else {
      // Engine exists but no manual execution yet - still log it
      return NextResponse.json({ 
        success: true, 
        message: `Engine ${engineName} execution logged. Manual execution for this engine is not yet implemented.`,
        note: 'Engine exists in database but manual execution is not available yet'
      });
    }
  } catch (error: any) {
    console.error('Error running engine:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}






