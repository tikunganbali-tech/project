package v2

import (
	"encoding/json"
	"fmt"
	"io/ioutil"
	"log"
	"os"
	"path/filepath"
	"time"
	"crypto/sha256"
)

// PHASE 7C: Cross-Brand & Cross-Locale Insight Aggregator (READ-ONLY)
// Aggregates performance data across brands and locales WITHOUT exposing raw content

// PerformanceMetrics represents normalized performance metrics
// PHASE 7C: Normalized metrics (no raw content, no sensitive identifiers)
type PerformanceMetrics struct {
	// Identifiers (anonymized)
	BrandID    string `json:"brandId"`    // Brand ID (for aggregation)
	LocaleID   string `json:"localeId"`   // Locale ID (for aggregation)
	PageType   string `json:"pageType"`   // blog, product, category, homepage
	PageIDHash string `json:"pageIdHash"` // Hashed page ID (anonymized)
	
	// SEO Metrics (normalized)
	SEOScore      float64 `json:"seoScore"`      // 0-100, normalized
	AvgPosition   float64 `json:"avgPosition"`   // Average SERP position (1-100)
	AvgCTR        float64 `json:"avgCtr"`        // Average CTR (0.0-1.0)
	ImpressionCount int   `json:"impressionCount"` // Total impressions
	
	// User Engagement Metrics (normalized)
	AvgDwellTime  float64 `json:"avgDwellTime"`  // Average dwell time in seconds
	AvgBounceRate float64 `json:"avgBounceRate"` // Average bounce rate (0.0-1.0)
	AvgScrollDepth float64 `json:"avgScrollDepth"` // Average scroll depth (0.0-1.0)
	
	// Content Metrics (anonymized)
	WordCount     int     `json:"wordCount"`     // Word count (no content)
	SectionCount  int     `json:"sectionCount"`  // Number of sections (no content)
	
	// Timestamps
	LastUpdated   string  `json:"lastUpdated"`   // ISO 8601 timestamp
	SampleCount   int     `json:"sampleCount"`   // Number of data points aggregated
}

// AggregatedInsight represents aggregated insight across brands/locales
// PHASE 7C: Read-only insight, no raw content
type AggregatedInsight struct {
	// Aggregation Scope
	BrandID    string `json:"brandId,omitempty"`    // If filtering by brand
	LocaleID   string `json:"localeId,omitempty"`   // If filtering by locale
	PageType   string `json:"pageType,omitempty"`   // If filtering by page type
	Scope      string `json:"scope"`                // "brand", "locale", "global", "brand_locale"
	
	// Aggregated Metrics
	TotalPages      int                `json:"totalPages"`      // Total pages in aggregation
	AvgSEOScore     float64            `json:"avgSeoScore"`    // Average SEO score
	AvgPosition     float64            `json:"avgPosition"`    // Average SERP position
	AvgCTR          float64            `json:"avgCtr"`          // Average CTR
	TotalImpressions int              `json:"totalImpressions"` // Total impressions
	AvgDwellTime    float64            `json:"avgDwellTime"`   // Average dwell time
	AvgBounceRate   float64            `json:"avgBounceRate"` // Average bounce rate
	AvgScrollDepth  float64            `json:"avgScrollDepth"` // Average scroll depth
	
	// Trends
	SEOScoreTrend   string            `json:"seoScoreTrend"`   // "rising", "falling", "stable"
	PositionTrend   string            `json:"positionTrend"`    // "rising", "falling", "stable"
	CTRTrend        string            `json:"ctrTrend"`        // "rising", "falling", "stable"
	
	// Distribution
	ScoreDistribution map[string]int `json:"scoreDistribution"` // Count by score range
	PositionDistribution map[string]int `json:"positionDistribution"` // Count by position range
	
	// Top Performers (anonymized - only metrics, no content)
	TopPages        []PerformanceMetrics `json:"topPages,omitempty"` // Top 10 pages by SEO score
	
	// Generated At
	GeneratedAt     string            `json:"generatedAt"`     // ISO 8601 timestamp
}

// InsightAggregator aggregates insights across brands and locales
// PHASE 7C: READ-ONLY - No content access, no edit, no publish
type InsightAggregator struct {
	storageDir string
	seoEngine  *SEOv2
	serpCollector *SERPCollector
	userSignalAgg *UserSignalAggregator
}

// NewInsightAggregator creates a new insight aggregator
func NewInsightAggregator() *InsightAggregator {
	storageDir := os.Getenv("AI_V2_STORAGE_DIR")
	if storageDir == "" {
		storageDir = "./storage/ai-v2"
	}
	
	insightsDir := filepath.Join(storageDir, "insights")
	os.MkdirAll(insightsDir, 0755)
	
	return &InsightAggregator{
		storageDir: insightsDir,
		seoEngine:  NewSEOv2(),
		serpCollector: NewSERPCollector(),
		userSignalAgg: NewUserSignalAggregator(),
	}
}

// AggregateByBrand aggregates insights for a specific brand
// PHASE 7C: READ-ONLY aggregation
func (a *InsightAggregator) AggregateByBrand(brandID string) (*AggregatedInsight, error) {
	log.Printf("[INSIGHT AGGREGATOR] Aggregating by brand: brandId=%s", brandID)
	
	// PHASE 7C GUARDRAIL: Only aggregate metrics, no raw content access
	metrics, err := a.collectBrandMetrics(brandID)
	if err != nil {
		return nil, fmt.Errorf("failed to collect brand metrics: %w", err)
	}
	
	insight := a.aggregateMetrics(metrics, "brand", brandID, "", "")
	
	// Save aggregated insight
	if err := a.saveAggregatedInsight(insight); err != nil {
		log.Printf("[INSIGHT AGGREGATOR] Failed to save insight: %v", err)
	}
	
	return insight, nil
}

// AggregateByLocale aggregates insights for a specific locale
// PHASE 7C: READ-ONLY aggregation
func (a *InsightAggregator) AggregateByLocale(localeID string) (*AggregatedInsight, error) {
	log.Printf("[INSIGHT AGGREGATOR] Aggregating by locale: localeId=%s", localeID)
	
	metrics, err := a.collectLocaleMetrics(localeID)
	if err != nil {
		return nil, fmt.Errorf("failed to collect locale metrics: %w", err)
	}
	
	insight := a.aggregateMetrics(metrics, "locale", "", localeID, "")
	
	if err := a.saveAggregatedInsight(insight); err != nil {
		log.Printf("[INSIGHT AGGREGATOR] Failed to save insight: %v", err)
	}
	
	return insight, nil
}

// AggregateByBrandAndLocale aggregates insights for brand + locale combination
// PHASE 7C: READ-ONLY aggregation
func (a *InsightAggregator) AggregateByBrandAndLocale(brandID string, localeID string) (*AggregatedInsight, error) {
	log.Printf("[INSIGHT AGGREGATOR] Aggregating by brand+locale: brandId=%s, localeId=%s", brandID, localeID)
	
	metrics, err := a.collectBrandLocaleMetrics(brandID, localeID)
	if err != nil {
		return nil, fmt.Errorf("failed to collect brand+locale metrics: %w", err)
	}
	
	insight := a.aggregateMetrics(metrics, "brand_locale", brandID, localeID, "")
	
	if err := a.saveAggregatedInsight(insight); err != nil {
		log.Printf("[INSIGHT AGGREGATOR] Failed to save insight: %v", err)
	}
	
	return insight, nil
}

// AggregateGlobal aggregates insights across all brands and locales
// PHASE 7C: READ-ONLY aggregation - global view
func (a *InsightAggregator) AggregateGlobal() (*AggregatedInsight, error) {
	log.Printf("[INSIGHT AGGREGATOR] Aggregating global insights")
	
	metrics, err := a.collectGlobalMetrics()
	if err != nil {
		return nil, fmt.Errorf("failed to collect global metrics: %w", err)
	}
	
	insight := a.aggregateMetrics(metrics, "global", "", "", "")
	
	if err := a.saveAggregatedInsight(insight); err != nil {
		log.Printf("[INSIGHT AGGREGATOR] Failed to save insight: %v", err)
	}
	
	return insight, nil
}

// collectBrandMetrics collects normalized metrics for a brand
// PHASE 7C: Only metrics, no raw content
func (a *InsightAggregator) collectBrandMetrics(brandID string) ([]PerformanceMetrics, error) {
	// PHASE 7C GUARDRAIL: This function should read from storage files
	// that contain SEO reports, SERP signals, and user signals
	// WITHOUT accessing raw content
	
	var metrics []PerformanceMetrics
	
	// Scan storage directory for SEO reports
	storage := NewStorage()
	pageIDs, err := storage.ListPageIDs()
	if err != nil {
		log.Printf("[INSIGHT AGGREGATOR] Failed to list pages: %v", err)
		return metrics, nil
	}
	
	// For each page, check if it belongs to the brand
	for _, pageID := range pageIDs {
		// Get all versions
		versions, err := storage.GetAllVersions(pageID)
		if err != nil {
			continue
		}
		
		for _, version := range versions {
			// Get SEO report
			seoReport, err := a.getSEOReportFromStorage(pageID, version.Version)
			if err != nil {
				continue
			}
			
			// PHASE 7C GUARDRAIL: Filter by brandID
			if seoReport.BrandID != brandID {
				continue
			}
			
			// Get SERP history
			serpHistory, _ := a.serpCollector.GetHistory(pageID, version.Version)
			
			// Get user signals
			userSignals, _ := a.userSignalAgg.GetAggregated(pageID, version.Version)
			
			// PHASE 7C: Normalize and anonymize metrics
			metric := a.normalizeMetrics(pageID, seoReport, serpHistory, userSignals, version.Package)
			metrics = append(metrics, metric)
		}
	}
	
	return metrics, nil
}

// normalizeMetrics normalizes and anonymizes metrics
// PHASE 7C: No raw content, only normalized metrics
func (a *InsightAggregator) normalizeMetrics(
	pageID string,
	seoReport *SEOQCReport,
	serpHistory *SERPSignalHistory,
	userSignals *AggregatedUserSignal,
	pkg FrontendContentPackage,
) PerformanceMetrics {
	// PHASE 7C: Anonymize page ID (hash it)
	pageIDHash := a.hashPageID(pageID)
	
	// Calculate average position from SERP history
	avgPosition := 0.0
	if serpHistory != nil && len(serpHistory.Signals) > 0 {
		totalPos := 0.0
		for _, signal := range serpHistory.Signals {
			if signal.Position > 0 {
				totalPos += float64(signal.Position)
			}
		}
		if totalPos > 0 {
			avgPosition = totalPos / float64(len(serpHistory.Signals))
		}
	}
	
	// Calculate average CTR from SERP history
	avgCTR := 0.0
	totalImpressions := 0
	if serpHistory != nil && len(serpHistory.Signals) > 0 {
		totalCTR := 0.0
		for _, signal := range serpHistory.Signals {
			totalCTR += signal.CTR
			totalImpressions += signal.Impression
		}
		avgCTR = totalCTR / float64(len(serpHistory.Signals))
	}
	
	// Get user engagement metrics
	avgDwellTime := 0.0
	avgBounceRate := 0.0
	avgScrollDepth := 0.0
	if userSignals != nil {
		avgDwellTime = userSignals.AvgDwellTime
		avgBounceRate = userSignals.AvgBounceRate
		avgScrollDepth = userSignals.AvgScrollDepth
	}
	
	return PerformanceMetrics{
		BrandID:        seoReport.BrandID,
		LocaleID:       seoReport.LocaleID,
		PageType:       pkg.PageType,
		PageIDHash:     pageIDHash,
		SEOScore:       float64(seoReport.Score),
		AvgPosition:    avgPosition,
		AvgCTR:         avgCTR,
		ImpressionCount: totalImpressions,
		AvgDwellTime:   avgDwellTime,
		AvgBounceRate:  avgBounceRate,
		AvgScrollDepth: avgScrollDepth,
		WordCount:      pkg.Metadata.WordCount,
		SectionCount:   len(pkg.Sections),
		LastUpdated:    time.Now().Format(time.RFC3339),
		SampleCount:    1,
	}
}

// hashPageID hashes page ID for anonymization
// PHASE 7C: Use SHA256 for proper anonymization
func (a *InsightAggregator) hashPageID(pageID string) string {
	hash := sha256.Sum256([]byte(pageID))
	return fmt.Sprintf("%x", hash)
}

// getSEOReportFromStorage retrieves SEO report from storage
// PHASE 7C: Read-only access to SEO reports
func (a *InsightAggregator) getSEOReportFromStorage(pageID string, version int) (*SEOQCReport, error) {
	// Use SEO engine's GetSEOReport method (public, read-only)
	return a.seoEngine.GetSEOReport(pageID, version)
}

// collectLocaleMetrics collects normalized metrics for a locale
func (a *InsightAggregator) collectLocaleMetrics(localeID string) ([]PerformanceMetrics, error) {
	var metrics []PerformanceMetrics
	
	storage := NewStorage()
	pageIDs, err := storage.ListPageIDs()
	if err != nil {
		return metrics, nil
	}
	
	for _, pageID := range pageIDs {
		versions, err := storage.GetAllVersions(pageID)
		if err != nil {
			continue
		}
		
		for _, version := range versions {
			seoReport, err := a.getSEOReportFromStorage(pageID, version.Version)
			if err != nil {
				continue
			}
			
			// Filter by localeID
			if seoReport.LocaleID != localeID {
				continue
			}
			
			serpHistory, _ := a.serpCollector.GetHistory(pageID, version.Version)
			userSignals, _ := a.userSignalAgg.GetAggregated(pageID, version.Version)
			
			metric := a.normalizeMetrics(pageID, seoReport, serpHistory, userSignals, version.Package)
			metrics = append(metrics, metric)
		}
	}
	
	return metrics, nil
}

// collectBrandLocaleMetrics collects normalized metrics for brand + locale
func (a *InsightAggregator) collectBrandLocaleMetrics(brandID string, localeID string) ([]PerformanceMetrics, error) {
	var metrics []PerformanceMetrics
	
	storage := NewStorage()
	pageIDs, err := storage.ListPageIDs()
	if err != nil {
		return metrics, nil
	}
	
	for _, pageID := range pageIDs {
		versions, err := storage.GetAllVersions(pageID)
		if err != nil {
			continue
		}
		
		for _, version := range versions {
			seoReport, err := a.getSEOReportFromStorage(pageID, version.Version)
			if err != nil {
				continue
			}
			
			// Filter by both brandID and localeID
			if seoReport.BrandID != brandID || seoReport.LocaleID != localeID {
				continue
			}
			
			serpHistory, _ := a.serpCollector.GetHistory(pageID, version.Version)
			userSignals, _ := a.userSignalAgg.GetAggregated(pageID, version.Version)
			
			metric := a.normalizeMetrics(pageID, seoReport, serpHistory, userSignals, version.Package)
			metrics = append(metrics, metric)
		}
	}
	
	return metrics, nil
}

// collectGlobalMetrics collects normalized metrics across all brands/locales
func (a *InsightAggregator) collectGlobalMetrics() ([]PerformanceMetrics, error) {
	var metrics []PerformanceMetrics
	
	storage := NewStorage()
	pageIDs, err := storage.ListPageIDs()
	if err != nil {
		return metrics, nil
	}
	
	for _, pageID := range pageIDs {
		versions, err := storage.GetAllVersions(pageID)
		if err != nil {
			continue
		}
		
		for _, version := range versions {
			seoReport, err := a.getSEOReportFromStorage(pageID, version.Version)
			if err != nil {
				continue
			}
			
			serpHistory, _ := a.serpCollector.GetHistory(pageID, version.Version)
			userSignals, _ := a.userSignalAgg.GetAggregated(pageID, version.Version)
			
			metric := a.normalizeMetrics(pageID, seoReport, serpHistory, userSignals, version.Package)
			metrics = append(metrics, metric)
		}
	}
	
	return metrics, nil
}

// aggregateMetrics aggregates a list of metrics into insight
func (a *InsightAggregator) aggregateMetrics(metrics []PerformanceMetrics, scope string, brandID string, localeID string, pageType string) *AggregatedInsight {
	if len(metrics) == 0 {
		return &AggregatedInsight{
			Scope:      scope,
			BrandID:    brandID,
			LocaleID:   localeID,
			PageType:   pageType,
			TotalPages: 0,
			GeneratedAt: time.Now().Format(time.RFC3339),
		}
	}
	
	// Calculate aggregates
	totalPages := len(metrics)
	var totalSEOScore, totalPosition, totalCTR, totalDwellTime, totalBounceRate, totalScrollDepth float64
	var totalImpressions int
	
	for _, m := range metrics {
		totalSEOScore += m.SEOScore
		totalPosition += m.AvgPosition
		totalCTR += m.AvgCTR
		totalDwellTime += m.AvgDwellTime
		totalBounceRate += m.AvgBounceRate
		totalScrollDepth += m.AvgScrollDepth
		totalImpressions += m.ImpressionCount
	}
	
	avgSEOScore := totalSEOScore / float64(totalPages)
	avgPosition := totalPosition / float64(totalPages)
	avgCTR := totalCTR / float64(totalPages)
	avgDwellTime := totalDwellTime / float64(totalPages)
	avgBounceRate := totalBounceRate / float64(totalPages)
	avgScrollDepth := totalScrollDepth / float64(totalPages)
	
	// Calculate trends (simplified - would need historical data)
	seoScoreTrend := a.calculateTrend(metrics, "seo")
	positionTrend := a.calculateTrend(metrics, "position")
	ctrTrend := a.calculateTrend(metrics, "ctr")
	
	// Calculate distributions
	scoreDist := a.calculateScoreDistribution(metrics)
	positionDist := a.calculatePositionDistribution(metrics)
	
	// Get top performers (anonymized)
	topPages := a.getTopPerformers(metrics, 10)
	
	return &AggregatedInsight{
		Scope:              scope,
		BrandID:            brandID,
		LocaleID:           localeID,
		PageType:           pageType,
		TotalPages:         totalPages,
		AvgSEOScore:        avgSEOScore,
		AvgPosition:        avgPosition,
		AvgCTR:             avgCTR,
		TotalImpressions:   totalImpressions,
		AvgDwellTime:       avgDwellTime,
		AvgBounceRate:      avgBounceRate,
		AvgScrollDepth:     avgScrollDepth,
		SEOScoreTrend:      seoScoreTrend,
		PositionTrend:      positionTrend,
		CTRTrend:           ctrTrend,
		ScoreDistribution:  scoreDist,
		PositionDistribution: positionDist,
		TopPages:           topPages,
		GeneratedAt:        time.Now().Format(time.RFC3339),
	}
}

// calculateTrend calculates trend from metrics (simplified)
func (a *InsightAggregator) calculateTrend(metrics []PerformanceMetrics, metricType string) string {
	if len(metrics) < 2 {
		return "stable"
	}
	
	// Simplified trend calculation
	// In production, would compare current vs historical data
	return "stable"
}

// calculateScoreDistribution calculates score distribution
func (a *InsightAggregator) calculateScoreDistribution(metrics []PerformanceMetrics) map[string]int {
	dist := map[string]int{
		"0-20":   0,
		"21-40":  0,
		"41-60":  0,
		"61-80":  0,
		"81-100": 0,
	}
	
	for _, m := range metrics {
		score := int(m.SEOScore)
		switch {
		case score <= 20:
			dist["0-20"]++
		case score <= 40:
			dist["21-40"]++
		case score <= 60:
			dist["41-60"]++
		case score <= 80:
			dist["61-80"]++
		default:
			dist["81-100"]++
		}
	}
	
	return dist
}

// calculatePositionDistribution calculates position distribution
func (a *InsightAggregator) calculatePositionDistribution(metrics []PerformanceMetrics) map[string]int {
	dist := map[string]int{
		"1-10":   0,
		"11-20":  0,
		"21-50":  0,
		"51-100": 0,
		"100+":   0,
	}
	
	for _, m := range metrics {
		pos := int(m.AvgPosition)
		switch {
		case pos >= 1 && pos <= 10:
			dist["1-10"]++
		case pos >= 11 && pos <= 20:
			dist["11-20"]++
		case pos >= 21 && pos <= 50:
			dist["21-50"]++
		case pos >= 51 && pos <= 100:
			dist["51-100"]++
		default:
			dist["100+"]++
		}
	}
	
	return dist
}

// getTopPerformers returns top N performers (anonymized)
func (a *InsightAggregator) getTopPerformers(metrics []PerformanceMetrics, n int) []PerformanceMetrics {
	// Sort by SEO score (descending)
	// Return top N (already anonymized - no raw content)
	
	if len(metrics) <= n {
		return metrics
	}
	
	// Simple selection - in production would sort properly
	return metrics[:n]
}

// saveAggregatedInsight saves aggregated insight to storage
func (a *InsightAggregator) saveAggregatedInsight(insight *AggregatedInsight) error {
	// Generate filename based on scope
	var filename string
	switch insight.Scope {
	case "brand":
		filename = fmt.Sprintf("brand_%s_insight.json", insight.BrandID)
	case "locale":
		filename = fmt.Sprintf("locale_%s_insight.json", insight.LocaleID)
	case "brand_locale":
		filename = fmt.Sprintf("brand_%s_locale_%s_insight.json", insight.BrandID, insight.LocaleID)
	case "global":
		filename = "global_insight.json"
	default:
		filename = "insight.json"
	}
	
	filepath := filepath.Join(a.storageDir, filename)
	
	data, err := json.MarshalIndent(insight, "", "  ")
	if err != nil {
		return fmt.Errorf("failed to marshal insight: %w", err)
	}
	
	if err := ioutil.WriteFile(filepath, data, 0644); err != nil {
		return fmt.Errorf("failed to write insight: %w", err)
	}
	
	log.Printf("[INSIGHT AGGREGATOR] Saved insight: scope=%s, totalPages=%d", insight.Scope, insight.TotalPages)
	return nil
}

// GetAggregatedInsight retrieves saved aggregated insight
func (a *InsightAggregator) GetAggregatedInsight(scope string, brandID string, localeID string) (*AggregatedInsight, error) {
	var filename string
	switch scope {
	case "brand":
		filename = fmt.Sprintf("brand_%s_insight.json", brandID)
	case "locale":
		filename = fmt.Sprintf("locale_%s_insight.json", localeID)
	case "brand_locale":
		filename = fmt.Sprintf("brand_%s_locale_%s_insight.json", brandID, localeID)
	case "global":
		filename = "global_insight.json"
	default:
		return nil, fmt.Errorf("invalid scope: %s", scope)
	}
	
	filepath := filepath.Join(a.storageDir, filename)
	
	data, err := ioutil.ReadFile(filepath)
	if err != nil {
		return nil, err
	}
	
	var insight AggregatedInsight
	if err := json.Unmarshal(data, &insight); err != nil {
		return nil, err
	}
	
	return &insight, nil
}
