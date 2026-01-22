/**
 * STEP 17B - EXECUTE ACTION ENDPOINT
 * 
 * POST /api/admin/actions/[id]/execute
 * 
 * 🔒 SECURITY:
 * - super_admin only
 * - SAFE_MODE guard active
 * - Idempotent (cannot execute twice)
 * - Only APPROVED actions can be executed
 */

export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { SAFE_MODE } from "@/lib/admin-config";
import { requireSuperAdmin, getServerSession } from "@/lib/auth";
import { executeAction } from "@/lib/engine-executor";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    await requireSuperAdmin();
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Unauthorized" },
      { status: error.message?.includes("Forbidden") ? 403 : 401 }
    );
  }

  // STEP 21-3: Rate limit for execute endpoint (strict limit)
  try {
    const session = await getServerSession();
    const userId = (session?.user as any)?.id || (session?.user as any)?.email || 'unknown';
    const rateLimit = checkRateLimit(userId, 'execute');

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { 
          error: "Rate limit exceeded. Please wait before executing another action.",
          retryAfter: Math.ceil((rateLimit.resetTime - Date.now()) / 1000),
        },
        { 
          status: 429,
          headers: {
            'Retry-After': Math.ceil((rateLimit.resetTime - Date.now()) / 1000).toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': new Date(rateLimit.resetTime).toISOString(),
          },
        }
      );
    }
  } catch (error) {
    // If rate limit check fails, continue (don't block execution)
    console.error('Rate limit check error:', error);
  }

  if (SAFE_MODE) {
    return NextResponse.json(
      { error: "SAFE_MODE active" },
      { status: 403 }
    );
  }

  const action = await prisma.actionApproval.findUnique({
    where: { id: params.id },
  });

  if (!action || action.status !== "APPROVED") {
    return NextResponse.json(
      { error: "Action not executable" },
      { status: 400 }
    );
  }

  // idempotent guard
  if (action.executedAt) {
    return NextResponse.json(
      { error: "Already executed" },
      { status: 409 }
    );
  }

  // Get optional note from request body (for audit trail)
  let executionNote: string | undefined;
  try {
    const body = await req.json().catch(() => ({}));
    executionNote = body.note;
  } catch {
    // Ignore if body parsing fails
  }

  // Log execution note if provided (for audit)
  if (executionNote) {
    console.log(`[ACTION EXECUTE] Note for action ${action.id}:`, executionNote);
  }

  try {
    await executeAction(action.id);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Execution failed" },
      { status: 500 }
    );
  }

  // Update status (executeAction already updates it, but following spec)
  await prisma.actionApproval.update({
    where: { id: action.id },
    data: {
      status: "EXECUTED",
      executedAt: new Date(),
    },
  });

  return NextResponse.json({ success: true });
}

