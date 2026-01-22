/**
 * STEP 20 - AI ADVISOR (READ-ONLY, NON-EXECUTING)
 * 
 * Catatan penting: AI TIDAK mengeksekusi, TIDAK menulis DB, TIDAK memodifikasi state.
 * Perannya penasihat, bukan pengambil keputusan.
 * 
 * Memberi second opinion berbasis data yang sudah ada (WHY + WHAT IF),
 * bukan AI spekulatif.
 */

import { ExecutionSummary } from './execution-summary';

export interface AIAdvice {
  summary: string;
  considerations: string[];
  confidence: 'LOW' | 'MEDIUM' | 'HIGH';
  disclaimers: string[];
}

/**
 * Generate AI advice based on ExecutionSummary
 * 
 * Input: ExecutionSummary (WHY + WHAT IF)
 * Output: AIAdvice
 * 
 * Sumber: existing data only
 * ❌ No DB write
 * ❌ No engine trigger
 */
export function generateAdvice(summary: ExecutionSummary): AIAdvice {
  const considerations: string[] = [];
  const disclaimers: string[] = [];
  let confidenceScore = 0;
  let confidence: 'LOW' | 'MEDIUM' | 'HIGH' = 'MEDIUM';

  // Analyze WHY (traces/reasons)
  const whyCount = summary.why.length;
  if (whyCount === 0) {
    considerations.push('No trace data available - action lacks clear justification');
    confidenceScore -= 20;
  } else if (whyCount >= 3) {
    considerations.push(`Strong justification: ${whyCount} data-driven reasons support this action`);
    confidenceScore += 15;
  } else if (whyCount >= 1) {
    considerations.push(`Moderate justification: ${whyCount} reason(s) support this action`);
    confidenceScore += 5;
  }

  // Analyze WHAT IF (simulation)
  if (!summary.simulation) {
    considerations.push('No simulation data available - cannot predict impact');
    confidenceScore -= 15;
    disclaimers.push('Impact prediction unavailable');
  } else {
    const sim = summary.simulation;
    
    // Analyze affected entities
    if (sim.affectedEntities === 0) {
      considerations.push('No entities will be affected - action may be ineffective');
      confidenceScore -= 10;
    } else if (sim.affectedEntities === 1) {
      considerations.push(`Single entity affected - low risk, targeted action`);
      confidenceScore += 10;
    } else {
      considerations.push(`${sim.affectedEntities} entities will be affected - verify scope is correct`);
      confidenceScore -= 5;
    }

    // Analyze estimated impact
    if (sim.estimatedImpact.length > 0) {
      const positiveImpacts = sim.estimatedImpact.filter(imp => imp.delta > 0);
      const negativeImpacts = sim.estimatedImpact.filter(imp => imp.delta < 0);
      const neutralImpacts = sim.estimatedImpact.filter(imp => imp.delta === 0);

      if (positiveImpacts.length > 0) {
        considerations.push(`Expected positive impact on ${positiveImpacts.length} metric(s)`);
        confidenceScore += 10;
      }

      if (negativeImpacts.length > 0) {
        considerations.push(`Warning: negative impact expected on ${negativeImpacts.length} metric(s)`);
        confidenceScore -= 15;
      }

      if (neutralImpacts.length === sim.estimatedImpact.length) {
        considerations.push('No significant impact predicted - action may be unnecessary');
        confidenceScore -= 10;
      }

      // Check for significant deltas
      const significantDeltas = sim.estimatedImpact.filter(imp => Math.abs(imp.delta) > 10);
      if (significantDeltas.length > 0) {
        considerations.push(`${significantDeltas.length} metric(s) will change significantly - review carefully`);
      }
    } else {
      considerations.push('No impact metrics available');
      confidenceScore -= 5;
    }

    // Analyze risks
    if (sim.risks.length === 0) {
      considerations.push('No risks identified - action appears safe');
      confidenceScore += 5;
    } else if (sim.risks.length <= 2) {
      considerations.push(`${sim.risks.length} risk(s) identified - manageable concerns`);
      confidenceScore -= 5;
    } else {
      considerations.push(`${sim.risks.length} risks identified - significant concerns require attention`);
      confidenceScore -= 20;
    }
  }

  // Analyze execution readiness
  if (!summary.canExecute) {
    considerations.push('Action cannot be executed - review reasons');
    confidenceScore -= 25;
  }

  // Determine confidence level
  if (confidenceScore >= 20) {
    confidence = 'HIGH';
  } else if (confidenceScore >= 0) {
    confidence = 'MEDIUM';
  } else {
    confidence = 'LOW';
  }

  // Generate summary
  let summaryText = '';
  if (confidence === 'HIGH') {
    summaryText = `This action appears well-justified with ${whyCount} supporting reason(s) and clear positive impact predictions. `;
    if (summary.simulation && summary.simulation.risks.length === 0) {
      summaryText += 'No significant risks identified.';
    } else if (summary.simulation && summary.simulation.risks.length > 0) {
      summaryText += `However, ${summary.simulation.risks.length} risk(s) should be reviewed.`;
    }
  } else if (confidence === 'MEDIUM') {
    summaryText = `This action has moderate justification with ${whyCount} reason(s). `;
    if (summary.simulation) {
      summaryText += `Impact predictions are available but ${summary.simulation.risks.length > 0 ? `there are ${summary.simulation.risks.length} risk(s) to consider.` : 'review recommended before execution.'}`;
    } else {
      summaryText += 'Impact prediction unavailable - proceed with caution.';
    }
  } else {
    summaryText = `This action has low confidence due to ${whyCount === 0 ? 'lack of justification' : 'limited justification'}. `;
    if (summary.simulation && summary.simulation.risks.length > 0) {
      summaryText += `${summary.simulation.risks.length} risk(s) identified. `;
    }
    summaryText += 'Strongly recommend reviewing all considerations before execution.';
  }

  // Add standard disclaimers
  disclaimers.push('This advice is based on available data only - real-world results may vary');
  disclaimers.push('Human judgment should always override automated recommendations');
  disclaimers.push('Review all risks and considerations before making final decision');

  if (!summary.simulation) {
    disclaimers.push('Simulation data unavailable - impact predictions are estimates only');
  }

  return {
    summary: summaryText,
    considerations,
    confidence,
    disclaimers,
  };
}

