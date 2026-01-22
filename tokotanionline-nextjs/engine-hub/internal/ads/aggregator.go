package ads

import (
	"fmt"
	"log"
	"time"
)

// PHASE 8A.4: Ads Performance Aggregator
// Aggregate performa ads per: brand, locale, campaign
// Simpan histori performa
// Tidak ada keputusan otomatis

// PerformanceAggregator aggregates ads performance data
type PerformanceAggregator struct {
	// Aggregation configuration
	periodTypes []string // DAILY | WEEKLY | MONTHLY
}

// NewPerformanceAggregator creates a new performance aggregator
func NewPerformanceAggregator() *PerformanceAggregator {
	return &PerformanceAggregator{
		periodTypes: []string{"DAILY", "WEEKLY", "MONTHLY"},
	}
}

// AggregateRequest represents a request for performance aggregation
type AggregateRequest struct {
	BrandID    string    `json:"brandId"`    // Required: Brand ID
	LocaleID   *string   `json:"localeId"`   // Optional: Locale ID (null = all locales)
	CampaignID *string   `json:"campaignId"` // Optional: Campaign ID (null = all campaigns)
	Platform   *string   `json:"platform"`    // Optional: Platform (null = all platforms)
	PeriodType string    `json:"periodType"` // DAILY | WEEKLY | MONTHLY
	StartDate  time.Time `json:"startDate"`
	EndDate    time.Time `json:"endDate"`
}

// AggregateResult represents aggregated performance data
type AggregateResult struct {
	BrandID            string    `json:"brandId"`
	LocaleID           *string   `json:"localeId"`
	CampaignID         *string   `json:"campaignId"`
	Platform           *string   `json:"platform"`
	PeriodType         string    `json:"periodType"`
	PeriodStart        time.Time `json:"periodStart"`
	PeriodEnd          time.Time `json:"periodEnd"`
	TotalImpressions   int       `json:"totalImpressions"`
	TotalClicks        int       `json:"totalClicks"`
	AvgCTR             float64   `json:"avgCtr"`
	AvgCPC             *float64  `json:"avgCpc,omitempty"`
	AvgCPM             *float64  `json:"avgCpm,omitempty"`
	TotalConversions   int       `json:"totalConversions"`
	TotalConversionValue *float64 `json:"totalConversionValue,omitempty"`
	TotalSpend         *float64  `json:"totalSpend,omitempty"`
	ImpressionsTrend   *float64  `json:"impressionsTrend,omitempty"` // % change vs previous period
	ClicksTrend        *float64  `json:"clicksTrend,omitempty"`
	CTRTrend           *float64  `json:"ctrTrend,omitempty"`
	ConversionsTrend   *float64  `json:"conversionsTrend,omitempty"`
}

// Aggregate aggregates performance data based on the request
// PHASE 8A.4: Performance Aggregator - no automatic decisions
func (a *PerformanceAggregator) Aggregate(req AggregateRequest) ([]AggregateResult, error) {
	log.Printf("[ADS AGGREGATOR] Aggregating performance data: brandId=%s, periodType=%s", 
		req.BrandID, req.PeriodType)
	
	// Validate request
	if req.BrandID == "" {
		return nil, fmt.Errorf("brandId is required")
	}
	
	if req.PeriodType != "DAILY" && req.PeriodType != "WEEKLY" && req.PeriodType != "MONTHLY" {
		return nil, fmt.Errorf("invalid periodType: %s (must be DAILY, WEEKLY, or MONTHLY)", req.PeriodType)
	}
	
	// Generate periods based on periodType
	periods := a.generatePeriods(req.PeriodType, req.StartDate, req.EndDate)
	
	results := make([]AggregateResult, 0, len(periods))
	
	// Aggregate data for each period
	for _, period := range periods {
		// TODO: Query database for performance data in this period
		// For now, return placeholder structure
		// In production, this would:
		// 1. Query AdPerformance table filtered by brandId, localeId, campaignId, platform, date range
		// 2. Calculate aggregates (sum, avg, etc.)
		// 3. Calculate trends vs previous period
		// 4. Store in AdPerformanceAggregate table
		
		result := AggregateResult{
			BrandID:          req.BrandID,
			LocaleID:         req.LocaleID,
			CampaignID:       req.CampaignID,
			Platform:         req.Platform,
			PeriodType:       req.PeriodType,
			PeriodStart:      period.Start,
			PeriodEnd:        period.End,
			TotalImpressions: 0, // Placeholder
			TotalClicks:      0, // Placeholder
			AvgCTR:           0, // Placeholder
			TotalConversions: 0, // Placeholder
		}
		
		results = append(results, result)
	}
	
	log.Printf("[ADS AGGREGATOR] Aggregated %d periods", len(results))
	
	return results, nil
}

// Period represents a time period for aggregation
type Period struct {
	Start time.Time
	End   time.Time
}

// generatePeriods generates time periods based on periodType
func (a *PerformanceAggregator) generatePeriods(periodType string, startDate, endDate time.Time) []Period {
	periods := []Period{}
	current := startDate
	
	for current.Before(endDate) || current.Equal(endDate) {
		var periodEnd time.Time
		
		switch periodType {
		case "DAILY":
			periodEnd = current.AddDate(0, 0, 1).Add(-time.Second)
		case "WEEKLY":
			periodEnd = current.AddDate(0, 0, 7).Add(-time.Second)
		case "MONTHLY":
			periodEnd = current.AddDate(0, 1, 0).Add(-time.Second)
		default:
			periodEnd = current.AddDate(0, 0, 1).Add(-time.Second)
		}
		
		if periodEnd.After(endDate) {
			periodEnd = endDate
		}
		
		periods = append(periods, Period{
			Start: current,
			End:   periodEnd,
		})
		
		current = periodEnd.Add(time.Second)
	}
	
	return periods
}
