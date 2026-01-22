package ads

import (
	"fmt"
	"log"
	"time"
)

// PHASE 8A.5: Ads Strategy Report Generator
// Read-only insights & recommendations
// Tidak ada rewrite otomatis

// StrategyReportRequest represents a request for strategy report generation
type StrategyReportRequest struct {
	BrandID   string    `json:"brandId"`   // Required: Brand ID
	LocaleID  *string   `json:"localeId"`   // Optional: Locale ID (null = all locales)
	StartDate time.Time `json:"startDate"`
	EndDate   time.Time `json:"endDate"`
}

// StrategyReport represents an ads strategy report
type StrategyReport struct {
	BrandID    string    `json:"brandId"`
	LocaleID   *string   `json:"localeId"`
	ReportType string    `json:"reportType"` // "ADS_STRATEGY_REPORT"
	PeriodStart time.Time `json:"periodStart"`
	PeriodEnd   time.Time `json:"periodEnd"`
	GeneratedAt time.Time `json:"generatedAt"`
	
	// PHASE 8A.5: Read-only insights (no auto-rewrite)
	Insights Insights `json:"insights"`
	
	// SEO + Ads combined insights (read-only)
	SEOInsights map[string]interface{} `json:"seoInsights,omitempty"`
}

// Insights represents strategy insights
type Insights struct {
	WhatWorks      []WorkingItem      `json:"whatWorks"`      // What's performing well
	WhatStagnant   []StagnantItem     `json:"whatStagnant"`   // What's not performing
	Recommendations []Recommendation  `json:"recommendations"` // Recommendations (angle, intent)
	TopPerformers   []TopPerformer     `json:"topPerformers"`  // Top performing creatives/campaigns
	Underperformers []Underperformer   `json:"underperformers"` // Underperforming creatives/campaigns
}

// WorkingItem represents something that's working well
type WorkingItem struct {
	Type        string  `json:"type"`        // "campaign" | "creative" | "platform" | "angle"
	ID          string  `json:"id"`
	Name        string  `json:"name"`
	Metric      string  `json:"metric"`      // "CTR" | "conversions" | "ROAS"
	Value       float64 `json:"value"`
	Improvement float64 `json:"improvement"` // % improvement vs average
	Reason      string  `json:"reason"`      // Why it's working
}

// StagnantItem represents something that's not performing
type StagnantItem struct {
	Type        string  `json:"type"`        // "campaign" | "creative" | "platform" | "angle"
	ID          string  `json:"id"`
	Name        string  `json:"name"`
	Metric      string  `json:"metric"`      // "CTR" | "conversions" | "ROAS"
	Value       float64 `json:"value"`
	Decline     float64 `json:"decline"`    // % decline vs average
	Reason      string  `json:"reason"`      // Why it's stagnant
}

// Recommendation represents a strategic recommendation
type Recommendation struct {
	Type        string `json:"type"`        // "angle" | "intent" | "platform" | "audience"
	Title       string `json:"title"`
	Description string `json:"description"`
	Priority    string `json:"priority"`    // "high" | "medium" | "low"
	Action      string `json:"action"`      // Recommended action (read-only, no auto-execute)
}

// TopPerformer represents a top-performing creative or campaign
type TopPerformer struct {
	Type        string  `json:"type"`        // "campaign" | "creative"
	ID          string  `json:"id"`
	Name        string  `json:"name"`
	Platform    string  `json:"platform"`
	CTR         float64 `json:"ctr"`
	Conversions int     `json:"conversions"`
	ROAS        *float64 `json:"roas,omitempty"`
	KeyFactors  []string `json:"keyFactors"` // What makes it successful
}

// Underperformer represents an underperforming creative or campaign
type Underperformer struct {
	Type        string  `json:"type"`        // "campaign" | "creative"
	ID          string  `json:"id"`
	Name        string  `json:"name"`
	Platform    string  `json:"platform"`
	CTR         float64 `json:"ctr"`
	Conversions int     `json:"conversions"`
	Issues      []string `json:"issues"`     // What's wrong
}

// StrategyReportGenerator generates ads strategy reports
type StrategyReportGenerator struct {
	aggregator *PerformanceAggregator
}

// NewStrategyReportGenerator creates a new strategy report generator
func NewStrategyReportGenerator() *StrategyReportGenerator {
	return &StrategyReportGenerator{
		aggregator: NewPerformanceAggregator(),
	}
}

// GenerateReport generates an ads strategy report
// PHASE 8A.5: Read-only insights - no auto-rewrite
func (g *StrategyReportGenerator) GenerateReport(req StrategyReportRequest) (*StrategyReport, error) {
	log.Printf("[STRATEGY REPORT] Generating report: brandId=%s, startDate=%s, endDate=%s", 
		req.BrandID, req.StartDate.Format("2006-01-02"), req.EndDate.Format("2006-01-02"))
	
	// Validate request
	if req.BrandID == "" {
		return nil, fmt.Errorf("brandId is required")
	}
	
	// Aggregate performance data
	aggregateReq := AggregateRequest{
		BrandID:    req.BrandID,
		LocaleID:   req.LocaleID,
		CampaignID: nil, // All campaigns
		Platform:   nil, // All platforms
		PeriodType: "DAILY",
		StartDate:  req.StartDate,
		EndDate:    req.EndDate,
	}
	
	aggregates, err := g.aggregator.Aggregate(aggregateReq)
	if err != nil {
		return nil, fmt.Errorf("failed to aggregate performance data: %w", err)
	}
	
	// Generate insights from aggregated data
	insights := g.generateInsights(aggregates)
	
	// PHASE 8A.5: Generate recommendations (read-only, no auto-execute)
	recommendations := g.generateRecommendations(insights)
	
	report := &StrategyReport{
		BrandID:     req.BrandID,
		LocaleID:    req.LocaleID,
		ReportType:  "ADS_STRATEGY_REPORT",
		PeriodStart: req.StartDate,
		PeriodEnd:   req.EndDate,
		GeneratedAt: time.Now(),
		Insights: Insights{
			WhatWorks:      insights.WhatWorks,
			WhatStagnant:   insights.WhatStagnant,
			Recommendations: recommendations,
			TopPerformers:   insights.TopPerformers,
			Underperformers: insights.Underperformers,
		},
	}
	
	log.Printf("[STRATEGY REPORT] Report generated: %d working items, %d stagnant items, %d recommendations", 
		len(report.Insights.WhatWorks), len(report.Insights.WhatStagnant), len(report.Insights.Recommendations))
	
	return report, nil
}

// generateInsights generates insights from aggregated performance data
func (g *StrategyReportGenerator) generateInsights(aggregates []AggregateResult) Insights {
	insights := Insights{
		WhatWorks:      []WorkingItem{},
		WhatStagnant:   []StagnantItem{},
		TopPerformers:   []TopPerformer{},
		Underperformers: []Underperformer{},
	}
	
	// Calculate averages
	var totalCTR, totalClicks, totalConversions float64
	for _, agg := range aggregates {
		totalCTR += agg.AvgCTR
		totalClicks += float64(agg.TotalClicks)
		totalConversions += float64(agg.TotalConversions)
	}
	
	avgCTR := totalCTR / float64(len(aggregates))
	avgClicks := totalClicks / float64(len(aggregates))
	avgConversions := totalConversions / float64(len(aggregates))
	
	// Identify what's working and what's stagnant
	for _, agg := range aggregates {
		if agg.AvgCTR > avgCTR*1.2 { // 20% above average
			insights.WhatWorks = append(insights.WhatWorks, WorkingItem{
				Type:        "aggregate",
				ID:          fmt.Sprintf("%s_%s", agg.BrandID, agg.PeriodStart.Format("20060102")),
				Name:        fmt.Sprintf("Period %s", agg.PeriodStart.Format("2006-01-02")),
				Metric:      "CTR",
				Value:       agg.AvgCTR,
				Improvement: ((agg.AvgCTR - avgCTR) / avgCTR) * 100,
				Reason:      "CTR significantly above average",
			})
		}
		
		if agg.AvgCTR < avgCTR*0.8 { // 20% below average
			insights.WhatStagnant = append(insights.WhatStagnant, StagnantItem{
				Type:    "aggregate",
				ID:      fmt.Sprintf("%s_%s", agg.BrandID, agg.PeriodStart.Format("20060102")),
				Name:    fmt.Sprintf("Period %s", agg.PeriodStart.Format("2006-01-02")),
				Metric:  "CTR",
				Value:   agg.AvgCTR,
				Decline: ((avgCTR - agg.AvgCTR) / avgCTR) * 100,
				Reason:  "CTR significantly below average",
			})
		}
	}
	
	return insights
}

// generateRecommendations generates strategic recommendations
// PHASE 8A.5: Read-only recommendations - no auto-execute
func (g *StrategyReportGenerator) generateRecommendations(insights Insights) []Recommendation {
	recommendations := []Recommendation{}
	
	// Analyze what's working and generate recommendations
	if len(insights.WhatWorks) > 0 {
		recommendations = append(recommendations, Recommendation{
			Type:        "angle",
			Title:       "Scale Successful Angles",
			Description: "Consider scaling the angles and approaches that are performing well",
			Priority:    "high",
			Action:      "Review top performers and create similar variations (manual action required)",
		})
	}
	
	// Analyze what's stagnant and generate recommendations
	if len(insights.WhatStagnant) > 0 {
		recommendations = append(recommendations, Recommendation{
			Type:        "intent",
			Title:       "Revise Underperforming Campaigns",
			Description: "Review and revise campaigns that are underperforming",
			Priority:    "medium",
			Action:      "Pause or revise underperforming campaigns (manual action required)",
		})
	}
	
	return recommendations
}
