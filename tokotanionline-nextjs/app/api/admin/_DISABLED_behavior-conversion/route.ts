/**
 * Behavior → Conversion → Action Engine API
 * Phase 2 - Main API Endpoint
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // DISABLED: Behavior conversion modules not available
    return NextResponse.json({
      success: false,
      error: 'Behavior conversion API is disabled - required modules not available',
    }, { status: 503 });

    // const searchParams = request.nextUrl.searchParams;
    // const action = searchParams.get('action') || 'all';

    // switch (action) {
    //   case 'bounce': {
    //     const { processHighBouncePages } = await import('@/lib/behavior-conversion/bounce-intervention');
    //     const bounceResults = await processHighBouncePages(80, 10);
    //     return NextResponse.json({
    //       success: true,
    //       action: 'bounce_intervention',
    //       results: bounceResults,
    //       count: bounceResults.length,
    //     });
    //   }

    //   case 'layout': {
    //     const { processLayoutAdaptations } = await import('@/lib/behavior-conversion/layout-adaptation');
    //     const layoutCount = await processLayoutAdaptations(undefined, 100);
    //     return NextResponse.json({
    //       success: true,
    //       action: 'layout_adaptation',
    //       count: layoutCount,
    //     });
    //   }

    //   case 'image': {
    //     const { reactivateImageEngine, checkImageEngineHealth } = await import('@/lib/behavior-conversion/image-engine-reactivation');
    //     const imageResults = await reactivateImageEngine(undefined, 50);
    //     const imageHealth = await checkImageEngineHealth();
    //     return NextResponse.json({
    //       success: true,
    //       action: 'image_reactivation',
    //       results: imageResults,
    //       health: imageHealth,
    //     });
    //   }

    //   case 'ads-feed': {
    //     const { getAdsDataFeed } = await import('@/lib/behavior-conversion/ads-data-feed');
    //     const adsFeed = await getAdsDataFeed(30);
    //     return NextResponse.json({
    //       success: true,
    //       action: 'ads_data_feed',
    //       feed: adsFeed,
    //       ready: adsFeed.topCities.length > 0 && adsFeed.deviceTypes.length > 0,
    //     });
    //   }

    //   case 'feedback': {
    //     const { getFeedbackSummary, learnFromActions } = await import('@/lib/behavior-conversion/feedback-loop');
    //     const feedback = await getFeedbackSummary(30);
    //     const insights = await learnFromActions();
    //     return NextResponse.json({
    //       success: true,
    //       action: 'feedback_summary',
    //       summary: feedback,
    //       insights,
    //     });
    //   }

    //   case 'health': {
    //     const { checkImageEngineHealth } = await import('@/lib/behavior-conversion/image-engine-reactivation');
    //     const { getAdsDataFeed } = await import('@/lib/behavior-conversion/ads-data-feed');
    //     const { getFeedbackSummary } = await import('@/lib/behavior-conversion/feedback-loop');
    //     const imageHealthCheck = await checkImageEngineHealth();
    //     const adsFeedCheck = await getAdsDataFeed(30);
    //     const feedbackCheck = await getFeedbackSummary(30);
    //     return NextResponse.json({
    //       success: true,
    //       action: 'health_check',
    //       imageEngine: {
    //         status: imageHealthCheck.status,
    //         healthScore: imageHealthCheck.healthScore,
    //       },
    //       adsDataFeed: {
    //         ready: adsFeedCheck.topCities.length > 0 && adsFeedCheck.deviceTypes.length > 0,
    //         citiesCount: adsFeedCheck.topCities.length,
    //         devicesCount: adsFeedCheck.deviceTypes.length,
    //       },
    //       feedback: {
    //         totalActions: feedbackCheck.totalActions,
    //         avgImprovement: feedbackCheck.avgImprovement,
    //       },
    //     });
    //   }

    //   case 'all':
    //   default: {
    //     const { runPhase2BehaviorConversion } = await import('@/lib/behavior-conversion');
    //     const fullResults = await runPhase2BehaviorConversion();
    //     return NextResponse.json({
    //       success: true,
    //       action: 'full_phase2',
    //       results: fullResults,
    //     });
    //   }
    // }
  } catch (error: any) {
    console.error('Error in behavior-conversion API:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // DISABLED: Behavior conversion modules not available
    return NextResponse.json({
      success: false,
      error: 'Behavior conversion API is disabled - required modules not available',
    }, { status: 503 });

    // const body = await request.json();
    // const { action, pageId, pageType } = body;

    // switch (action) {
    //   case 'reevaluate':
    //     const { reevaluateAndAdjust } = await import('@/lib/behavior-conversion/feedback-loop');
    //     const result = await reevaluateAndAdjust(pageId, pageType, body.actionType, new Date(body.actionDate));
    //     return NextResponse.json({
    //       success: true,
    //       result,
    //     });

    //   default:
    //     return NextResponse.json(
    //       {
    //         success: false,
    //         error: 'Unknown action',
    //       },
    //       { status: 400 }
    //     );
    // }
  } catch (error: any) {
    console.error('Error in behavior-conversion POST API:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}

