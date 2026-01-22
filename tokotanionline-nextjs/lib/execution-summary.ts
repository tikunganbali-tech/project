/**
 * STEP 19C - EXECUTION SUMMARY BUILDER
 * 
 * Gabungkan:
 * - Action info
 * - ActionTrace (WHY)
 * - Simulation result (WHAT IF)
 * 
 * Menjadi satu object ExecutionSummary
 */

import { prisma } from '@/lib/db';
import { simulateAction, ActionSimulationResult } from '@/lib/action-simulator';

export interface ExecutionSummary {
  actionType: string;
  action: string;
  target: {
    id: string | null;
    type: string;
  };
  why: Array<{
    insightKey: string;
    metricKey: string;
    metricValue: number;
    explanation: string;
  }>;
  simulation: ActionSimulationResult | null;
  risks: string[];
  canExecute: boolean;
  reasons: string[]; // Reasons why can/cannot execute
}

/**
 * Build execution summary for an action
 * Combines action info, traces (WHY), and simulation (WHAT IF)
 */
export async function buildExecutionSummary(
  actionId: string
): Promise<ExecutionSummary> {
  // Fetch action
  const action = await prisma.actionApproval.findUnique({
    where: { id: actionId },
    include: {
      traces: {
        orderBy: {
          createdAt: 'desc',
        },
      },
    },
  });

  if (!action) {
    throw new Error('Action not found');
  }

  // Build WHY from traces
  const why = action.traces.map((trace) => ({
    insightKey: trace.insightKey,
    metricKey: trace.metricKey,
    metricValue: trace.metricValue,
    explanation: trace.explanation,
  }));

  // Build WHAT IF from simulation (only for APPROVED actions)
  let simulation: ActionSimulationResult | null = null;
  if (action.status === 'APPROVED') {
    try {
      simulation = await simulateAction(
        action.actionType,
        action.action,
        action.targetId
      );
    } catch (error) {
      console.error('Simulation error:', error);
      // Continue without simulation if it fails
    }
  }

  // Combine risks from simulation
  const risks = simulation?.risks || [];

  // Determine if can execute
  const canExecute = action.status === 'APPROVED' && !action.executedAt;
  const reasons: string[] = [];

  if (action.status !== 'APPROVED') {
    reasons.push(`Action status is ${action.status}, must be APPROVED`);
  }
  if (action.executedAt) {
    reasons.push('Action has already been executed');
  }
  if (canExecute) {
    reasons.push('Action is ready for execution');
  }

  return {
    actionType: action.actionType,
    action: action.action,
    target: {
      id: action.targetId,
      type: action.actionType,
    },
    why,
    simulation,
    risks,
    canExecute,
    reasons,
  };
}

