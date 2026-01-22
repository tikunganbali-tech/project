import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';
import { prisma } from "@/lib/db";
// Request timing removed - non-core feature

export async function GET() {
  const start = Date.now();
  try {
    const snapshot = await prisma.analyticsSnapshot.findUnique({
      where: { id: 1 },
    });

    return NextResponse.json(
      snapshot || {
        totalVisits: 0,
        uniqueVisitors: 0,
        generatedAt: null,
      }
    );
  } catch (error) {
    console.error('[ANALYTICS_API]', error);
    return NextResponse.json({
      totalVisits: 0,
      uniqueVisitors: 0,
      generatedAt: null,
    });
  } finally {
    // Request timing removed - non-core feature
  }
}

