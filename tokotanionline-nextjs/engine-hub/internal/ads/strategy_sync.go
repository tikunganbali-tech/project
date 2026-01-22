package ads

import (
	"fmt"
	"log"
	"time"
	
	v2 "engine-hub/internal/ai/v2"
)

// PHASE 8B.3: Strategy Sync
// Gabungkan: SEO_QC_REPORT + ADS_STRATEGY_REPORT
// Hasilkan CONTENT_STRATEGY_BRIEF (read-only)

// ContentStrategyBrief represents combined strategy from SEO and Ads
// PHASE 8B.3: Read-only strategy brief
type ContentStrategyBrief struct {
	BrandID        string    `json:"brandId"`        // PHASE 8B: Brand isolation
	LocaleID       string    `json:"localeId"`      // PHASE 8B: Locale isolation
	PageID         string    `json:"pageId,omitempty"` // Optional: specific page
	GeneratedAt    time.Time `json:"generatedAt"`
	
	// Combined insights
	SEOInsights    SEOInsights    `json:"seoInsights"`
	AdsInsights    AdsInsights    `json:"adsInsights"`
	
	// Unified strategy
	ContentIntent  *ContentIntent `json:"contentIntent,omitempty"`
	Recommendations []StrategyRecommendation `json:"recommendations"`
	Priority       int            `json:"priority"` // 1-10
	
	// Read-only flag
	ReadOnly       bool           `json:"readOnly"` // PHASE 8B.3: Always true
}

// SEOInsights represents insights from SEO QC Report
type SEOInsights struct {
	Score           int      `json:"score"`           // 0-100 SEO score
	Issues          []string `json:"issues"`          // Key issues
	Recommendations []string `json:"recommendations"`  // SEO recommendations
	Strengths       []string `json:"strengths"`       // What's working
	Metadata        map[string]interface{} `json:"metadata,omitempty"`
}

// AdsInsights represents insights from Ads Strategy Report
type AdsInsights struct {
	WhatWorks      []string `json:"whatWorks"`      // What's performing well
	WhatStagnant   []string `json:"whatStagnant"`   // What's not performing
	Recommendations []string `json:"recommendations"` // Ads recommendations
	TopPerformers   []string `json:"topPerformers"`  // Top performing elements
	IntentSignals   []IntentSignal `json:"intentSignals,omitempty"` // Normalized intent signals
}

// StrategyRecommendation represents a unified strategy recommendation
type StrategyRecommendation struct {
	Type        string `json:"type"`        // "CONTENT_TYPE" | "TOPIC" | "ANGLE" | "CTA" | "REVISION"
	Priority    string `json:"priority"`    // "HIGH" | "MEDIUM" | "LOW"
	Message     string `json:"message"`
	Action      string `json:"action"`     // Recommended action (read-only, no auto-execute)
	Source      string `json:"source"`     // "SEO" | "ADS" | "COMBINED"
	Confidence  float64 `json:"confidence"` // 0.0 - 1.0
}

// StrategySync synchronizes SEO and Ads strategies
// PHASE 8B.3: Read-only strategy brief generation
type StrategySync struct {
	normalizer *InsightNormalizer
	mapper     *InsightMapper
}

// NewStrategySync creates a new strategy sync
func NewStrategySync() *StrategySync {
	return &StrategySync{
		normalizer: NewInsightNormalizer(),
		mapper:     NewInsightMapper(),
	}
}

// SyncStrategies combines SEO QC Report and Ads Strategy Report
// PHASE 8B.3: Generate CONTENT_STRATEGY_BRIEF (read-only)
func (s *StrategySync) SyncStrategies(
	seoReport *v2.SEOQCReport,
	adsReport *StrategyReport,
	brandID string,
	localeID string,
) (*ContentStrategyBrief, error) {
	log.Printf("[STRATEGY SYNC] Syncing strategies: brandId=%s, localeId=%s", brandID, localeID)
	
	// PHASE 8B.3: Guardrail - brand and locale are required
	if brandID == "" {
		return nil, fmt.Errorf("PHASE 8B.3 GUARDRAIL: brandId is required")
	}
	if localeID == "" {
		return nil, fmt.Errorf("PHASE 8B.3 GUARDRAIL: localeId is required")
	}
	
	// Extract SEO insights
	seoInsights := s.extractSEOInsights(seoReport)
	
	// Extract Ads insights
	adsInsights := s.extractAdsInsights(adsReport)
	
	// Normalize Ads metrics to intent signals
	intentSignals := []IntentSignal{}
	if adsReport != nil && adsReport.Insights != nil {
		// Extract performance metrics from ads report
		// Note: This is a simplified extraction - in production, you'd query actual performance data
		metrics := PerformanceMetrics{
			CTR:         0.03, // Placeholder - would come from actual performance data
			CVR:         0.05, // Placeholder
			CPC:         1.50, // Placeholder
			Engagement:  0.02, // Placeholder
			Conversions: 10,   // Placeholder
			Impressions: 1000, // Placeholder
			Clicks:      30,   // Placeholder
		}
		
		signal, err := s.normalizer.Normalize(metrics, brandID, localeID)
		if err == nil {
			intentSignals = append(intentSignals, *signal)
			adsInsights.IntentSignals = intentSignals
		}
	}
	
	// Map intent signals to content intent
	var contentIntent *ContentIntent
	if len(intentSignals) > 0 {
		intent, err := s.mapper.MapToContentIntent(intentSignals[0], brandID, localeID)
		if err == nil {
			contentIntent = intent
		}
	}
	
	// Generate unified recommendations
	recommendations := s.generateUnifiedRecommendations(seoInsights, adsInsights, contentIntent)
	
	// Calculate priority
	priority := s.calculatePriority(seoInsights, adsInsights)
	
	log.Printf("[STRATEGY SYNC] Strategy brief generated: priority=%d, recommendations=%d", 
		priority, len(recommendations))
	
	return &ContentStrategyBrief{
		BrandID:        brandID,
		LocaleID:       localeID,
		PageID:         seoReport.PageID,
		GeneratedAt:    time.Now(),
		SEOInsights:    seoInsights,
		AdsInsights:    adsInsights,
		ContentIntent:  contentIntent,
		Recommendations: recommendations,
		Priority:       priority,
		ReadOnly:       true, // PHASE 8B.3: Always read-only
	}, nil
}

// extractSEOInsights extracts insights from SEO QC Report
func (s *StrategySync) extractSEOInsights(seoReport *v2.SEOQCReport) SEOInsights {
	if seoReport == nil {
		return SEOInsights{
			Score: 0,
			Issues: []string{},
			Recommendations: []string{},
			Strengths: []string{},
		}
	}
	
	issues := []string{}
	for _, issue := range seoReport.Issues {
		issues = append(issues, issue.Message)
	}
	
	recommendations := []string{}
	for _, rec := range seoReport.Recommendations {
		recommendations = append(recommendations, rec.Message)
	}
	
	strengths := []string{}
	if seoReport.Score >= 80 {
		strengths = append(strengths, "High SEO score", "Good metadata coverage")
	}
	if len(seoReport.Issues) == 0 {
		strengths = append(strengths, "No critical issues")
	}
	
	return SEOInsights{
		Score:          seoReport.Score,
		Issues:         issues,
		Recommendations: recommendations,
		Strengths:      strengths,
	}
}

// extractAdsInsights extracts insights from Ads Strategy Report
func (s *StrategySync) extractAdsInsights(adsReport *StrategyReport) AdsInsights {
	if adsReport == nil || adsReport.Insights == nil {
		return AdsInsights{
			WhatWorks:      []string{},
			WhatStagnant:   []string{},
			Recommendations: []string{},
			TopPerformers:   []string{},
		}
	}
	
	whatWorks := []string{}
	if adsReport.Insights.WhatWorks != nil {
		for _, item := range adsReport.Insights.WhatWorks {
			whatWorks = append(whatWorks, fmt.Sprintf("%s: %s", item.Name, item.Reason))
		}
	}
	
	whatStagnant := []string{}
	if adsReport.Insights.WhatStagnant != nil {
		for _, item := range adsReport.Insights.WhatStagnant {
			whatStagnant = append(whatStagnant, fmt.Sprintf("%s: %s", item.Name, item.Reason))
		}
	}
	
	recommendations := []string{}
	if adsReport.Insights.Recommendations != nil {
		for _, rec := range adsReport.Insights.Recommendations {
			recommendations = append(recommendations, rec.Title+": "+rec.Description)
		}
	}
	
	topPerformers := []string{}
	if adsReport.Insights.TopPerformers != nil {
		for _, perf := range adsReport.Insights.TopPerformers {
			topPerformers = append(topPerformers, perf.Name)
		}
	}
	
	return AdsInsights{
		WhatWorks:      whatWorks,
		WhatStagnant:   whatStagnant,
		Recommendations: recommendations,
		TopPerformers:   topPerformers,
	}
}

// generateUnifiedRecommendations generates unified recommendations from SEO and Ads insights
// PHASE 8B.3: Read-only recommendations (no auto-execute)
func (s *StrategySync) generateUnifiedRecommendations(
	seoInsights SEOInsights,
	adsInsights AdsInsights,
	contentIntent *ContentIntent,
) []StrategyRecommendation {
	recommendations := []StrategyRecommendation{}
	
	// SEO-based recommendations
	if seoInsights.Score < 60 {
		recommendations = append(recommendations, StrategyRecommendation{
			Type:       "REVISION",
			Priority:   "HIGH",
			Message:    "SEO score is below threshold",
			Action:     "Review and improve SEO elements (manual action required)",
			Source:     "SEO",
			Confidence: 0.9,
		})
	}
	
	// Ads-based recommendations
	if len(adsInsights.WhatStagnant) > 0 {
		recommendations = append(recommendations, StrategyRecommendation{
			Type:       "ANGLE",
			Priority:   "MEDIUM",
			Message:    "Some ads angles are underperforming",
			Action:     "Consider revising content angles based on ads performance (manual action required)",
			Source:     "ADS",
			Confidence: 0.7,
		})
	}
	
	// Content intent-based recommendations
	if contentIntent != nil {
		if len(contentIntent.ContentTypes) > 0 {
			recommendations = append(recommendations, StrategyRecommendation{
				Type:       "CONTENT_TYPE",
				Priority:   "MEDIUM",
				Message:    fmt.Sprintf("Recommended content types: %v", contentIntent.ContentTypes),
				Action:     "Consider creating content in these types (manual action required)",
				Source:     "COMBINED",
				Confidence: contentIntent.Confidence,
			})
		}
		
		if len(contentIntent.Topics) > 0 {
			recommendations = append(recommendations, StrategyRecommendation{
				Type:       "TOPIC",
				Priority:   "MEDIUM",
				Message:    fmt.Sprintf("Recommended topics: %v", contentIntent.Topics),
				Action:     "Consider covering these topics (manual action required)",
				Source:     "COMBINED",
				Confidence: contentIntent.Confidence,
			})
		}
	}
	
	// Combined recommendations
	if seoInsights.Score < 60 && len(adsInsights.WhatStagnant) > 0 {
		recommendations = append(recommendations, StrategyRecommendation{
			Type:       "REVISION",
			Priority:   "HIGH",
			Message:    "Both SEO and Ads indicate need for content revision",
			Action:     "Review content strategy and consider revision (manual action required)",
			Source:     "COMBINED",
			Confidence: 0.95,
		})
	}
	
	return recommendations
}

// calculatePriority calculates overall priority (1-10)
func (s *StrategySync) calculatePriority(seoInsights SEOInsights, adsInsights AdsInsights) int {
	priority := 5 // Base priority
	
	// SEO score influence
	if seoInsights.Score < 60 {
		priority += 3 // High priority if SEO is low
	} else if seoInsights.Score >= 80 {
		priority -= 1 // Lower priority if SEO is good
	}
	
	// Ads performance influence
	if len(adsInsights.WhatStagnant) > len(adsInsights.WhatWorks) {
		priority += 2 // Higher priority if more stagnant than working
	}
	
	// Clamp to 1-10
	if priority < 1 {
		priority = 1
	}
	if priority > 10 {
		priority = 10
	}
	
	return priority
}
