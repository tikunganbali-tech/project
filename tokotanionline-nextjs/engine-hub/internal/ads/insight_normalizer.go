package ads

import (
	"fmt"
	"log"
)

// PHASE 8B.1: Ads→Insight Normalizer
// Normalisasi metrik Ads (CTR, CVR, CPC) → intent signals
// Output tanpa teks iklan mentah

// IntentSignal represents normalized intent signal from ads metrics
type IntentSignal struct {
	IntentType    string  `json:"intentType"`    // "AWARENESS" | "CONSIDERATION" | "PURCHASE" | "RETENTION"
	IntentStrength float64 `json:"intentStrength"` // 0.0 - 1.0
	FunnelStage   string  `json:"funnelStage"`   // "TOP" | "MID" | "BOTTOM"
	Confidence    float64 `json:"confidence"`     // 0.0 - 1.0
	Signals       []SignalMetric `json:"signals"` // Individual signal metrics
}

// SignalMetric represents a single signal metric
type SignalMetric struct {
	MetricType  string  `json:"metricType"`  // "CTR" | "CVR" | "CPC" | "ENGAGEMENT"
	Value       float64 `json:"value"`
	Normalized  float64 `json:"normalized"`  // 0.0 - 1.0
	Weight      float64 `json:"weight"`      // Importance weight
}

// PerformanceMetrics represents raw ads performance metrics
type PerformanceMetrics struct {
	CTR         float64 `json:"ctr"`         // Click-through rate
	CVR         float64 `json:"cvr"`         // Conversion rate
	CPC         float64 `json:"cpc"`        // Cost per click
	CPM         float64 `json:"cpm"`         // Cost per 1000 impressions
	Engagement  float64 `json:"engagement"`  // Engagement rate (clicks/impressions)
	Conversions int     `json:"conversions"`
	Impressions int     `json:"impressions"`
	Clicks      int     `json:"clicks"`
}

// InsightNormalizer normalizes ads metrics to intent signals
// PHASE 8B.1: No raw ad text in output
type InsightNormalizer struct {
	// Normalization thresholds (can be configured)
	highCTRThreshold    float64 // e.g., 0.05 (5%)
	highCVRThreshold    float64 // e.g., 0.10 (10%)
	lowCPCThreshold    float64 // e.g., 0.50 (lower is better)
	highEngagementThreshold float64 // e.g., 0.03 (3%)
}

// NewInsightNormalizer creates a new insight normalizer
func NewInsightNormalizer() *InsightNormalizer {
	return &InsightNormalizer{
		highCTRThreshold:    0.05,  // 5% CTR is considered high
		highCVRThreshold:    0.10,  // 10% CVR is considered high
		lowCPCThreshold:     0.50,   // $0.50 CPC is considered low
		highEngagementThreshold: 0.03, // 3% engagement is considered high
	}
}

// Normalize converts ads performance metrics to intent signals
// PHASE 8B.1: Output intent signals, no raw ad text
func (n *InsightNormalizer) Normalize(metrics PerformanceMetrics, brandID string, localeID string) (*IntentSignal, error) {
	log.Printf("[INSIGHT NORMALIZER] Normalizing metrics: CTR=%.2f%%, CVR=%.2f%%, CPC=%.2f", 
		metrics.CTR*100, metrics.CVR*100, metrics.CPC)
	
	// Calculate normalized values for each metric
	signals := []SignalMetric{}
	
	// Normalize CTR (0-1 scale, higher is better)
	ctrNormalized := n.normalizeCTR(metrics.CTR)
	signals = append(signals, SignalMetric{
		MetricType: "CTR",
		Value:      metrics.CTR,
		Normalized: ctrNormalized,
		Weight:     0.3, // CTR is important but not the only factor
	})
	
	// Normalize CVR (0-1 scale, higher is better)
	cvrNormalized := n.normalizeCVR(metrics.CVR)
	signals = append(signals, SignalMetric{
		MetricType: "CVR",
		Value:      metrics.CVR,
		Normalized: cvrNormalized,
		Weight:     0.4, // CVR is most important for intent
	})
	
	// Normalize CPC (0-1 scale, lower is better, so invert)
	cpcNormalized := n.normalizeCPC(metrics.CPC)
	signals = append(signals, SignalMetric{
		MetricType: "CPC",
		Value:      metrics.CPC,
		Normalized: cpcNormalized,
		Weight:     0.2, // CPC is important for efficiency
	})
	
	// Normalize Engagement
	engagementNormalized := n.normalizeEngagement(metrics.Engagement)
	signals = append(signals, SignalMetric{
		MetricType: "ENGAGEMENT",
		Value:      metrics.Engagement,
		Normalized: engagementNormalized,
		Weight:     0.1, // Engagement is supplementary
	})
	
	// Calculate weighted intent strength
	intentStrength := 0.0
	for _, signal := range signals {
		intentStrength += signal.Normalized * signal.Weight
	}
	
	// Determine intent type based on metrics
	intentType := n.determineIntentType(metrics, signals)
	
	// Determine funnel stage
	funnelStage := n.determineFunnelStage(intentType, metrics)
	
	// Calculate confidence based on data quality
	confidence := n.calculateConfidence(metrics)
	
	log.Printf("[INSIGHT NORMALIZER] Intent signal: type=%s, strength=%.2f, stage=%s, confidence=%.2f", 
		intentType, intentStrength, funnelStage, confidence)
	
	return &IntentSignal{
		IntentType:    intentType,
		IntentStrength: intentStrength,
		FunnelStage:   funnelStage,
		Confidence:    confidence,
		Signals:       signals,
	}, nil
}

// normalizeCTR normalizes CTR to 0-1 scale
func (n *InsightNormalizer) normalizeCTR(ctr float64) float64 {
	// CTR typically ranges from 0% to 10%
	// Normalize: 0% = 0.0, 5% = 0.5, 10%+ = 1.0
	if ctr >= 0.10 {
		return 1.0
	}
	if ctr <= 0 {
		return 0.0
	}
	// Linear interpolation: 0% -> 0.0, 10% -> 1.0
	return ctr / 0.10
}

// normalizeCVR normalizes CVR to 0-1 scale
func (n *InsightNormalizer) normalizeCVR(cvr float64) float64 {
	// CVR typically ranges from 0% to 20%
	// Normalize: 0% = 0.0, 10% = 0.5, 20%+ = 1.0
	if cvr >= 0.20 {
		return 1.0
	}
	if cvr <= 0 {
		return 0.0
	}
	// Linear interpolation: 0% -> 0.0, 20% -> 1.0
	return cvr / 0.20
}

// normalizeCPC normalizes CPC to 0-1 scale (inverted: lower is better)
func (n *InsightNormalizer) normalizeCPC(cpc float64) float64 {
	// CPC typically ranges from $0.10 to $5.00
	// Lower CPC is better, so we invert: $0.10 = 1.0, $5.00 = 0.0
	if cpc <= 0.10 {
		return 1.0
	}
	if cpc >= 5.00 {
		return 0.0
	}
	// Linear interpolation (inverted): $0.10 -> 1.0, $5.00 -> 0.0
	return 1.0 - ((cpc - 0.10) / (5.00 - 0.10))
}

// normalizeEngagement normalizes engagement rate to 0-1 scale
func (n *InsightNormalizer) normalizeEngagement(engagement float64) float64 {
	// Engagement typically ranges from 0% to 5%
	// Normalize: 0% = 0.0, 2.5% = 0.5, 5%+ = 1.0
	if engagement >= 0.05 {
		return 1.0
	}
	if engagement <= 0 {
		return 0.0
	}
	// Linear interpolation: 0% -> 0.0, 5% -> 1.0
	return engagement / 0.05
}

// determineIntentType determines intent type based on metrics
func (n *InsightNormalizer) determineIntentType(metrics PerformanceMetrics, signals []SignalMetric) string {
	// High CVR suggests purchase intent
	if metrics.CVR >= n.highCVRThreshold {
		return "PURCHASE"
	}
	
	// High CTR with moderate CVR suggests consideration
	if metrics.CTR >= n.highCTRThreshold && metrics.CVR > 0 {
		return "CONSIDERATION"
	}
	
	// High impressions with low CTR suggests awareness
	if metrics.Impressions > 1000 && metrics.CTR < n.highCTRThreshold {
		return "AWARENESS"
	}
	
	// Default to consideration
	return "CONSIDERATION"
}

// determineFunnelStage determines funnel stage based on intent type and metrics
func (n *InsightNormalizer) determineFunnelStage(intentType string, metrics PerformanceMetrics) string {
	switch intentType {
	case "AWARENESS":
		return "TOP"
	case "CONSIDERATION":
		return "MID"
	case "PURCHASE":
		return "BOTTOM"
	case "RETENTION":
		return "BOTTOM"
	default:
		return "MID"
	}
}

// calculateConfidence calculates confidence based on data quality
func (n *InsightNormalizer) calculateConfidence(metrics PerformanceMetrics) float64 {
	confidence := 0.5 // Base confidence
	
	// More impressions = higher confidence
	if metrics.Impressions > 1000 {
		confidence += 0.2
	} else if metrics.Impressions > 100 {
		confidence += 0.1
	}
	
	// More clicks = higher confidence
	if metrics.Clicks > 50 {
		confidence += 0.2
	} else if metrics.Clicks > 10 {
		confidence += 0.1
	}
	
	// Conversions = highest confidence
	if metrics.Conversions > 0 {
		confidence += 0.1
	}
	
	// Cap at 1.0
	if confidence > 1.0 {
		confidence = 1.0
	}
	
	return confidence
}

// NormalizeBatch normalizes multiple performance metrics
// PHASE 8B.1: Batch normalization for multiple campaigns/creatives
func (n *InsightNormalizer) NormalizeBatch(metricsList []PerformanceMetrics, brandID string, localeID string) ([]IntentSignal, error) {
	signals := []IntentSignal{}
	
	for _, metrics := range metricsList {
		signal, err := n.Normalize(metrics, brandID, localeID)
		if err != nil {
			log.Printf("[INSIGHT NORMALIZER] Failed to normalize metrics: %v", err)
			continue
		}
		signals = append(signals, *signal)
	}
	
	return signals, nil
}
