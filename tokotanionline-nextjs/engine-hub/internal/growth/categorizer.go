package growth

import (
	"fmt"
	"log"
)

// PHASE 8C.4: Insight Categorization
// Kategori minimal: Opportunity, Risk, Stable
// Terikat brand + locale
// ❌ Tidak ada rekomendasi rewrite otomatis

// InsightCategory represents a categorized insight
type InsightCategory struct {
	Category    string  `json:"category"`    // "OPPORTUNITY" | "RISK" | "STABLE"
	BrandID     string  `json:"brandId"`     // PHASE 8C: Brand isolation
	LocaleID    string  `json:"localeId"`    // PHASE 8C: Locale isolation
	PageType    string  `json:"pageType"`    // blog, product, category, etc
	PageID      string  `json:"pageId,omitempty"` // Optional: specific page
	
	// Category details
	Confidence  float64 `json:"confidence"`  // 0.0-1.0
	Reason      string  `json:"reason"`      // Why this category
	Indicators  []string `json:"indicators"` // Supporting indicators
	
	// Read-only flag
	ReadOnly    bool    `json:"readOnly"`    // PHASE 8C.4: Always true
}

// InsightCategorizer categorizes growth insights
// PHASE 8C.4: Brand + locale bound, no auto-rewrite recommendations
type InsightCategorizer struct {
	// Category thresholds
	opportunityThreshold float64 // Combined index >= 0.7
	riskThreshold       float64 // Combined index <= 0.3
}

// NewInsightCategorizer creates a new insight categorizer
func NewInsightCategorizer() *InsightCategorizer {
	return &InsightCategorizer{
		opportunityThreshold: 0.7,
		riskThreshold:       0.3,
	}
}

// Categorize categorizes a growth insight report
// PHASE 8C.4: Brand + locale bound, no auto-rewrite
func (c *InsightCategorizer) Categorize(
	report *GrowthInsightReport,
) (*InsightCategory, error) {
	log.Printf("[INSIGHT CATEGORIZER] Categorizing insight: brandId=%s, localeId=%s", 
		report.BrandID, report.LocaleID)
	
	// PHASE 8C.4: Guardrail - brand and locale are required
	if report.BrandID == "" {
		return nil, fmt.Errorf("PHASE 8C.4 GUARDRAIL: brandId is required")
	}
	if report.LocaleID == "" {
		return nil, fmt.Errorf("PHASE 8C.4 GUARDRAIL: localeId is required")
	}
	
	// Calculate average combined index
	avgIndex := 0.0
	if len(report.SignalIndices) > 0 {
		for _, idx := range report.SignalIndices {
			avgIndex += idx.CombinedIndex
		}
		avgIndex /= float64(len(report.SignalIndices))
	} else {
		avgIndex = 0.5 // Default if no indices
	}
	
	// Determine category
	category := "STABLE"
	reason := "Performance is within normal range"
	confidence := 0.5
	indicators := []string{}
	
	if avgIndex >= c.opportunityThreshold {
		category = "OPPORTUNITY"
		reason = "High performance across channels indicates growth opportunity"
		confidence = avgIndex
		indicators = append(indicators, fmt.Sprintf("Combined index: %.2f (above threshold)", avgIndex))
		
		// Add growth status indicators
		if report.GrowthStatus.Status == "ACCELERATING" {
			indicators = append(indicators, "Growth status: ACCELERATING")
		}
		if report.IntentConsistency.Score >= 0.7 {
			indicators = append(indicators, "High intent consistency across channels")
		}
	} else if avgIndex <= c.riskThreshold {
		category = "RISK"
		reason = "Low performance across channels indicates potential risk"
		confidence = 1.0 - avgIndex
		indicators = append(indicators, fmt.Sprintf("Combined index: %.2f (below threshold)", avgIndex))
		
		// Add risk indicators
		if report.GrowthStatus.Status == "DECLINING" || report.GrowthStatus.Status == "STAGNATING" {
			indicators = append(indicators, fmt.Sprintf("Growth status: %s", report.GrowthStatus.Status))
		}
		if len(report.FunnelGaps) > 0 {
			indicators = append(indicators, fmt.Sprintf("%d funnel gaps detected", len(report.FunnelGaps)))
		}
		if report.IntentConsistency.Score < 0.4 {
			indicators = append(indicators, "Low intent consistency across channels")
		}
	} else {
		category = "STABLE"
		reason = "Performance is stable across channels"
		confidence = 0.5
		indicators = append(indicators, fmt.Sprintf("Combined index: %.2f (within normal range)", avgIndex))
		
		// Add stability indicators
		if report.GrowthStatus.Status == "STABLE" {
			indicators = append(indicators, "Growth status: STABLE")
		}
		if report.IntentConsistency.Score >= 0.4 && report.IntentConsistency.Score < 0.7 {
			indicators = append(indicators, "Moderate intent consistency")
		}
	}
	
	log.Printf("[INSIGHT CATEGORIZER] Category: %s, confidence: %.2f", category, confidence)
	
	return &InsightCategory{
		Category:   category,
		BrandID:    report.BrandID,
		LocaleID:   report.LocaleID,
		PageType:   report.PageType,
		PageID:     report.PageID,
		Confidence: confidence,
		Reason:     reason,
		Indicators: indicators,
		ReadOnly:   true, // PHASE 8C.4: Always read-only
	}, nil
}

// CategorizeBatch categorizes multiple insights
// PHASE 8C.4: Batch categorization
func (c *InsightCategorizer) CategorizeBatch(reports []GrowthInsightReport) ([]InsightCategory, error) {
	categories := []InsightCategory{}
	
	for _, report := range reports {
		category, err := c.Categorize(&report)
		if err != nil {
			log.Printf("[INSIGHT CATEGORIZER] Failed to categorize: %v", err)
			continue
		}
		categories = append(categories, *category)
	}
	
	return categories, nil
}
