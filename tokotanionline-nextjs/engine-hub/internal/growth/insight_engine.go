package growth

import (
	"fmt"
	"log"
	"time"
)

// PHASE 8C.3: Growth Insight Engine
// Analisis: konsistensi intent lintas channel, gap funnel, stagnasi vs akselerasi
// Output GROWTH_INSIGHT_REPORT (read-only)

// GrowthInsightReport represents growth insight report
// PHASE 8C.3: Read-only report
type GrowthInsightReport struct {
	BrandID     string    `json:"brandId"`     // PHASE 8C: Brand isolation
	LocaleID    string    `json:"localeId"`    // PHASE 8C: Locale isolation
	PageType    string    `json:"pageType"`    // blog, product, category, etc
	PageID      string    `json:"pageId,omitempty"` // Optional: specific page
	GeneratedAt time.Time `json:"generatedAt"`
	
	// Signal indices
	SignalIndices []ChannelSignalIndex `json:"signalIndices"`
	
	// Analysis results
	IntentConsistency IntentConsistency `json:"intentConsistency"`
	FunnelGaps       []FunnelGap        `json:"funnelGaps"`
	GrowthStatus     GrowthStatus        `json:"growthStatus"`
	
	// Read-only flag
	ReadOnly bool `json:"readOnly"` // PHASE 8C.3: Always true
}

// IntentConsistency represents consistency of intent across channels
type IntentConsistency struct {
	Score       float64   `json:"score"`       // 0.0-1.0, higher = more consistent
	Consistency string    `json:"consistency"` // "HIGH" | "MEDIUM" | "LOW"
	Channels    []ChannelIntent `json:"channels"` // Intent per channel
	Issues      []string  `json:"issues"`      // Inconsistency issues
}

// ChannelIntent represents intent detected from a channel
type ChannelIntent struct {
	Channel     string  `json:"channel"`     // "SEO" | "ADS" | "ANALYTICS"
	IntentType  string  `json:"intentType"`  // "AWARENESS" | "CONSIDERATION" | "PURCHASE"
	FunnelStage string  `json:"funnelStage"` // "TOP" | "MID" | "BOTTOM"
	Confidence  float64 `json:"confidence"`  // 0.0-1.0
}

// FunnelGap represents a gap in the funnel
type FunnelGap struct {
	Stage       string  `json:"stage"`       // "TOP" | "MID" | "BOTTOM"
	GapType     string  `json:"gapType"`     // "MISSING" | "WEAK" | "OVERLOADED"
	Severity    string  `json:"severity"`   // "HIGH" | "MEDIUM" | "LOW"
	Description string  `json:"description"`
	Impact      float64 `json:"impact"`     // 0.0-1.0, impact on growth
}

// GrowthStatus represents growth status (stagnation vs acceleration)
type GrowthStatus struct {
	Status       string  `json:"status"`       // "ACCELERATING" | "STABLE" | "STAGNATING" | "DECLINING"
	Velocity     float64 `json:"velocity"`     // Growth velocity (-1.0 to 1.0)
	Trend        string  `json:"trend"`        // "UP" | "FLAT" | "DOWN"
	Momentum     float64 `json:"momentum"`     // 0.0-1.0, growth momentum
	Indicators   []GrowthIndicator `json:"indicators"`
}

// GrowthIndicator represents a growth indicator
type GrowthIndicator struct {
	Type        string  `json:"type"`        // "SEO_GROWTH" | "ADS_GROWTH" | "ANALYTICS_GROWTH"
	Direction   string  `json:"direction"`   // "UP" | "FLAT" | "DOWN"
	Strength    float64 `json:"strength"`    // 0.0-1.0
	Description string  `json:"description"`
}

// InsightEngine analyzes growth insights from normalized signals
// PHASE 8C.3: Growth insight analysis
type InsightEngine struct {
	normalizer *SignalNormalizer
}

// NewInsightEngine creates a new insight engine
func NewInsightEngine() *InsightEngine {
	return &InsightEngine{
		normalizer: NewSignalNormalizer(),
	}
}

// GenerateInsight generates GROWTH_INSIGHT_REPORT
// PHASE 8C.3: Read-only report generation
func (e *InsightEngine) GenerateInsight(
	signals []ChannelSignal,
	brandID string,
	localeID string,
	pageType string,
	pageID string,
) (*GrowthInsightReport, error) {
	log.Printf("[INSIGHT ENGINE] Generating growth insight: brandId=%s, localeId=%s, pageType=%s", 
		brandID, localeID, pageType)
	
	// PHASE 8C.3: Guardrail - brand and locale are required
	if brandID == "" {
		return nil, fmt.Errorf("PHASE 8C.3 GUARDRAIL: brandId is required")
	}
	if localeID == "" {
		return nil, fmt.Errorf("PHASE 8C.3 GUARDRAIL: localeId is required")
	}
	
	// Normalize signals
	indices, err := e.normalizer.NormalizeSignals(signals)
	if err != nil {
		return nil, fmt.Errorf("failed to normalize signals: %w", err)
	}
	
	// Analyze intent consistency
	intentConsistency := e.analyzeIntentConsistency(signals)
	
	// Analyze funnel gaps
	funnelGaps := e.analyzeFunnelGaps(signals, indices)
	
	// Analyze growth status
	growthStatus := e.analyzeGrowthStatus(indices)
	
	report := &GrowthInsightReport{
		BrandID:          brandID,
		LocaleID:         localeID,
		PageType:         pageType,
		PageID:           pageID,
		GeneratedAt:      time.Now(),
		SignalIndices:    indices,
		IntentConsistency: intentConsistency,
		FunnelGaps:       funnelGaps,
		GrowthStatus:     growthStatus,
		ReadOnly:         true, // PHASE 8C.3: Always read-only
	}
	
	log.Printf("[INSIGHT ENGINE] Growth insight generated: intentConsistency=%.2f, funnelGaps=%d, growthStatus=%s", 
		intentConsistency.Score, len(funnelGaps), growthStatus.Status)
	
	return report, nil
}

// analyzeIntentConsistency analyzes consistency of intent across channels
func (e *InsightEngine) analyzeIntentConsistency(signals []ChannelSignal) IntentConsistency {
	channels := []ChannelIntent{}
	
	// Extract intent from each channel
	for _, signal := range signals {
		intent := e.extractChannelIntent(signal)
		if intent != nil {
			channels = append(channels, *intent)
		}
	}
	
	// Calculate consistency score
	score := e.calculateConsistencyScore(channels)
	
	// Determine consistency level
	consistency := "LOW"
	if score >= 0.7 {
		consistency = "HIGH"
	} else if score >= 0.4 {
		consistency = "MEDIUM"
	}
	
	// Identify issues
	issues := e.identifyConsistencyIssues(channels)
	
	return IntentConsistency{
		Score:       score,
		Consistency: consistency,
		Channels:    channels,
		Issues:      issues,
	}
}

// extractChannelIntent extracts intent from a channel signal
func (e *InsightEngine) extractChannelIntent(signal ChannelSignal) *ChannelIntent {
	// Determine intent based on channel signals
	var intentType string
	var funnelStage string
	var confidence float64
	
	switch signal.Channel {
	case "SEO":
		// SEO intent based on position and CTR
		if signal.SEOSignals != nil {
			if signal.SEOSignals.Position <= 10 && signal.SEOSignals.CTR > 0.05 {
				intentType = "PURCHASE"
				funnelStage = "BOTTOM"
				confidence = 0.8
			} else if signal.SEOSignals.Position <= 30 {
				intentType = "CONSIDERATION"
				funnelStage = "MID"
				confidence = 0.6
			} else {
				intentType = "AWARENESS"
				funnelStage = "TOP"
				confidence = 0.5
			}
		}
	case "ADS":
		// Ads intent based on CVR and CTR
		if signal.AdsSignals != nil {
			if signal.AdsSignals.CVR > 0.10 {
				intentType = "PURCHASE"
				funnelStage = "BOTTOM"
				confidence = 0.9
			} else if signal.AdsSignals.CTR > 0.05 {
				intentType = "CONSIDERATION"
				funnelStage = "MID"
				confidence = 0.7
			} else {
				intentType = "AWARENESS"
				funnelStage = "TOP"
				confidence = 0.5
			}
		}
	case "ANALYTICS":
		// Analytics intent based on engagement
		if signal.AnalyticsSignals != nil {
			if signal.AnalyticsSignals.BounceRate < 0.3 && signal.AnalyticsSignals.ScrollDepth > 0.7 {
				intentType = "PURCHASE"
				funnelStage = "BOTTOM"
				confidence = 0.7
			} else if signal.AnalyticsSignals.BounceRate < 0.5 {
				intentType = "CONSIDERATION"
				funnelStage = "MID"
				confidence = 0.6
			} else {
				intentType = "AWARENESS"
				funnelStage = "TOP"
				confidence = 0.5
			}
		}
	}
	
	if intentType == "" {
		return nil
	}
	
	return &ChannelIntent{
		Channel:     signal.Channel,
		IntentType:  intentType,
		FunnelStage: funnelStage,
		Confidence:  confidence,
	}
}

// calculateConsistencyScore calculates consistency score across channels
func (e *InsightEngine) calculateConsistencyScore(channels []ChannelIntent) float64 {
	if len(channels) < 2 {
		return 0.5 // Default if not enough channels
	}
	
	// Count matching intent types
	matches := 0
	total := 0
	
	for i := 0; i < len(channels); i++ {
		for j := i + 1; j < len(channels); j++ {
			total++
			if channels[i].IntentType == channels[j].IntentType {
				matches++
			}
		}
	}
	
	if total == 0 {
		return 0.5
	}
	
	return float64(matches) / float64(total)
}

// identifyConsistencyIssues identifies consistency issues
func (e *InsightEngine) identifyConsistencyIssues(channels []ChannelIntent) []string {
	issues := []string{}
	
	if len(channels) < 2 {
		return issues
	}
	
	// Check for intent mismatches
	intentTypes := make(map[string]int)
	for _, ch := range channels {
		intentTypes[ch.IntentType]++
	}
	
	if len(intentTypes) > 1 {
		issues = append(issues, "Intent mismatch across channels detected")
	}
	
	// Check for funnel stage mismatches
	funnelStages := make(map[string]int)
	for _, ch := range channels {
		funnelStages[ch.FunnelStage]++
	}
	
	if len(funnelStages) > 1 {
		issues = append(issues, "Funnel stage mismatch across channels detected")
	}
	
	return issues
}

// analyzeFunnelGaps analyzes gaps in the funnel
func (e *InsightEngine) analyzeFunnelGaps(signals []ChannelSignal, indices []ChannelSignalIndex) []FunnelGap {
	gaps := []FunnelGap{}
	
	// Analyze each funnel stage
	stages := []string{"TOP", "MID", "BOTTOM"}
	
	for _, stage := range stages {
		// Count signals per stage
		stageSignals := 0
		stageStrength := 0.0
		
		for _, signal := range signals {
			intent := e.extractChannelIntent(signal)
			if intent != nil && intent.FunnelStage == stage {
				stageSignals++
				stageStrength += intent.Confidence
			}
		}
		
		// Identify gaps
		if stageSignals == 0 {
			gaps = append(gaps, FunnelGap{
				Stage:       stage,
				GapType:     "MISSING",
				Severity:    "HIGH",
				Description: fmt.Sprintf("No signals detected for %s funnel stage", stage),
				Impact:      0.8,
			})
		} else if stageStrength/float64(stageSignals) < 0.4 {
			gaps = append(gaps, FunnelGap{
				Stage:       stage,
				GapType:     "WEAK",
				Severity:    "MEDIUM",
				Description: fmt.Sprintf("Weak signals for %s funnel stage", stage),
				Impact:      0.5,
			})
		}
	}
	
	return gaps
}

// analyzeGrowthStatus analyzes growth status (stagnation vs acceleration)
func (e *InsightEngine) analyzeGrowthStatus(indices []ChannelSignalIndex) GrowthStatus {
	if len(indices) == 0 {
		return GrowthStatus{
			Status:   "STABLE",
			Velocity: 0.0,
			Trend:    "FLAT",
			Momentum: 0.5,
			Indicators: []GrowthIndicator{},
		}
	}
	
	// Calculate average combined index
	avgIndex := 0.0
	for _, idx := range indices {
		avgIndex += idx.CombinedIndex
	}
	avgIndex /= float64(len(indices))
	
	// Determine status based on index and trend
	status := "STABLE"
	velocity := 0.0
	trend := "FLAT"
	momentum := avgIndex
	
	if avgIndex >= 0.7 {
		status = "ACCELERATING"
		velocity = 0.7
		trend = "UP"
	} else if avgIndex >= 0.5 {
		status = "STABLE"
		velocity = 0.0
		trend = "FLAT"
	} else if avgIndex >= 0.3 {
		status = "STAGNATING"
		velocity = -0.3
		trend = "FLAT"
	} else {
		status = "DECLINING"
		velocity = -0.7
		trend = "DOWN"
	}
	
	// Generate indicators
	indicators := []GrowthIndicator{}
	
	for _, idx := range indices {
		if idx.SEOIndex > 0 {
			direction := "UP"
			if idx.SEOIndex < 0.5 {
				direction = "DOWN"
			} else if idx.SEOIndex == 0.5 {
				direction = "FLAT"
			}
			indicators = append(indicators, GrowthIndicator{
				Type:        "SEO_GROWTH",
				Direction:   direction,
				Strength:    idx.SEOIndex,
				Description: fmt.Sprintf("SEO index: %.2f", idx.SEOIndex),
			})
		}
		
		if idx.AdsIndex > 0 {
			direction := "UP"
			if idx.AdsIndex < 0.5 {
				direction = "DOWN"
			} else if idx.AdsIndex == 0.5 {
				direction = "FLAT"
			}
			indicators = append(indicators, GrowthIndicator{
				Type:        "ADS_GROWTH",
				Direction:   direction,
				Strength:    idx.AdsIndex,
				Description: fmt.Sprintf("Ads index: %.2f", idx.AdsIndex),
			})
		}
		
		if idx.AnalyticsIndex > 0 {
			direction := "UP"
			if idx.AnalyticsIndex < 0.5 {
				direction = "DOWN"
			} else if idx.AnalyticsIndex == 0.5 {
				direction = "FLAT"
			}
			indicators = append(indicators, GrowthIndicator{
				Type:        "ANALYTICS_GROWTH",
				Direction:   direction,
				Strength:    idx.AnalyticsIndex,
				Description: fmt.Sprintf("Analytics index: %.2f", idx.AnalyticsIndex),
			})
		}
	}
	
	return GrowthStatus{
		Status:     status,
		Velocity:   velocity,
		Trend:      trend,
		Momentum:   momentum,
		Indicators: indicators,
	}
}
