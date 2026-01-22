package growth

import (
	"fmt"
	"log"
)

// PHASE 8C.2: Signal Normalization Layer
// Normalisasi skala metrik lintas channel
// Hasilkan CHANNEL_SIGNAL_INDEX
// ❌ Tidak mengubah data sumber

// ChannelSignalIndex represents normalized signal index across channels
type ChannelSignalIndex struct {
	BrandID     string    `json:"brandId"`     // PHASE 8C: Brand isolation
	LocaleID    string    `json:"localeId"`    // PHASE 8C: Locale isolation
	PageType    string    `json:"pageType"`    // blog, product, category, etc
	PageID      string    `json:"pageId,omitempty"` // Optional: specific page
	
	// Normalized indices (0.0 - 1.0)
	SEOIndex        float64 `json:"seoIndex"`        // Normalized SEO performance (0.0-1.0)
	AdsIndex        float64 `json:"adsIndex"`        // Normalized Ads performance (0.0-1.0)
	AnalyticsIndex  float64 `json:"analyticsIndex"`  // Normalized Analytics performance (0.0-1.0)
	CombinedIndex   float64 `json:"combinedIndex"`   // Combined normalized index (0.0-1.0)
	
	// Channel weights (for combination)
	SEOWeight       float64 `json:"seoWeight"`       // Weight for SEO (default: 0.4)
	AdsWeight       float64 `json:"adsWeight"`       // Weight for Ads (default: 0.3)
	AnalyticsWeight float64 `json:"analyticsWeight"` // Weight for Analytics (default: 0.3)
	
	// Trend indicators
	Trend           string  `json:"trend"`           // "INCREASING" | "DECREASING" | "STABLE"
	TrendStrength   float64 `json:"trendStrength"`   // 0.0-1.0, strength of trend
}

// SignalNormalizer normalizes signals across channels
// PHASE 8C.2: Normalization layer, no source data modification
type SignalNormalizer struct {
	// Normalization thresholds (can be configured)
	seoThresholds      SEONormalizationThresholds
	adsThresholds      AdsNormalizationThresholds
	analyticsThresholds AnalyticsNormalizationThresholds
}

// SEONormalizationThresholds defines thresholds for SEO normalization
type SEONormalizationThresholds struct {
	MinPosition    float64 // e.g., 100 (worst)
	MaxPosition    float64 // e.g., 1 (best)
	MinCTR         float64 // e.g., 0.0
	MaxCTR         float64 // e.g., 0.10 (10%)
	MinSEOScore    float64 // e.g., 0
	MaxSEOScore    float64 // e.g., 100
	MinDwellTime   float64 // e.g., 0 seconds
	MaxDwellTime   float64 // e.g., 120 seconds
}

// AdsNormalizationThresholds defines thresholds for Ads normalization
type AdsNormalizationThresholds struct {
	MinCTR         float64 // e.g., 0.0
	MaxCTR         float64 // e.g., 0.10 (10%)
	MinCVR         float64 // e.g., 0.0
	MaxCVR         float64 // e.g., 0.20 (20%)
	MinCPC         float64 // e.g., 0.10 (lower is better)
	MaxCPC         float64 // e.g., 5.00 (higher is worse)
}

// AnalyticsNormalizationThresholds defines thresholds for Analytics normalization
type AnalyticsNormalizationThresholds struct {
	MinDwellTime   float64 // e.g., 0 seconds
	MaxDwellTime   float64 // e.g., 180 seconds
	MinBounceRate  float64 // e.g., 0.0
	MaxBounceRate  float64 // e.g., 1.0 (inverted: lower is better)
	MinScrollDepth float64 // e.g., 0.0
	MaxScrollDepth float64 // e.g., 1.0
}

// NewSignalNormalizer creates a new signal normalizer
func NewSignalNormalizer() *SignalNormalizer {
	return &SignalNormalizer{
		seoThresholds: SEONormalizationThresholds{
			MinPosition:  100.0,
			MaxPosition:  1.0,
			MinCTR:       0.0,
			MaxCTR:       0.10,
			MinSEOScore:  0.0,
			MaxSEOScore:  100.0,
			MinDwellTime: 0.0,
			MaxDwellTime: 120.0,
		},
		adsThresholds: AdsNormalizationThresholds{
			MinCTR: 0.0,
			MaxCTR: 0.10,
			MinCVR: 0.0,
			MaxCVR: 0.20,
			MinCPC: 0.10,
			MaxCPC: 5.00,
		},
		analyticsThresholds: AnalyticsNormalizationThresholds{
			MinDwellTime:   0.0,
			MaxDwellTime:   180.0,
			MinBounceRate:  0.0,
			MaxBounceRate:  1.0,
			MinScrollDepth: 0.0,
			MaxScrollDepth: 1.0,
		},
	}
}

// NormalizeSignals normalizes signals and generates CHANNEL_SIGNAL_INDEX
// PHASE 8C.2: Normalization, no source data modification
func (n *SignalNormalizer) NormalizeSignals(signals []ChannelSignal) ([]ChannelSignalIndex, error) {
	log.Printf("[SIGNAL NORMALIZER] Normalizing %d signals", len(signals))
	
	indices := []ChannelSignalIndex{}
	
	for _, signal := range signals {
		index, err := n.normalizeSignal(signal)
		if err != nil {
			log.Printf("[SIGNAL NORMALIZER] Failed to normalize signal: %v", err)
			continue
		}
		indices = append(indices, *index)
	}
	
	log.Printf("[SIGNAL NORMALIZER] Generated %d signal indices", len(indices))
	
	return indices, nil
}

// normalizeSignal normalizes a single channel signal
func (n *SignalNormalizer) normalizeSignal(signal ChannelSignal) (*ChannelSignalIndex, error) {
	index := &ChannelSignalIndex{
		BrandID:        signal.BrandID,
		LocaleID:       signal.LocaleID,
		PageType:       signal.PageType,
		PageID:         signal.PageID,
		SEOWeight:      0.4,
		AdsWeight:      0.3,
		AnalyticsWeight: 0.3,
	}
	
	// Normalize SEO signals
	if signal.SEOSignals != nil {
		index.SEOIndex = n.normalizeSEO(signal.SEOSignals)
	}
	
	// Normalize Ads signals
	if signal.AdsSignals != nil {
		index.AdsIndex = n.normalizeAds(signal.AdsSignals)
	}
	
	// Normalize Analytics signals
	if signal.AnalyticsSignals != nil {
		index.AnalyticsIndex = n.normalizeAnalytics(signal.AnalyticsSignals)
	}
	
	// Calculate combined index (weighted average)
	index.CombinedIndex = (index.SEOIndex * index.SEOWeight) +
		(index.AdsIndex * index.AdsWeight) +
		(index.AnalyticsIndex * index.AnalyticsWeight)
	
	// Determine trend (simplified - would compare with previous period in production)
	index.Trend = "STABLE"
	index.TrendStrength = 0.5
	
	return index, nil
}

// normalizeSEO normalizes SEO signals to 0.0-1.0 index
func (n *SignalNormalizer) normalizeSEO(signals *SEOSignals) float64 {
	// Position: lower is better (1 = best, 100 = worst)
	positionNorm := 1.0 - ((signals.Position - n.seoThresholds.MinPosition) / 
		(n.seoThresholds.MaxPosition - n.seoThresholds.MinPosition))
	if positionNorm < 0 {
		positionNorm = 0
	}
	if positionNorm > 1 {
		positionNorm = 1
	}
	
	// CTR: higher is better
	ctrNorm := (signals.CTR - n.seoThresholds.MinCTR) / 
		(n.seoThresholds.MaxCTR - n.seoThresholds.MinCTR)
	if ctrNorm < 0 {
		ctrNorm = 0
	}
	if ctrNorm > 1 {
		ctrNorm = 1
	}
	
	// SEO Score: higher is better
	scoreNorm := (signals.SEOScore - n.seoThresholds.MinSEOScore) / 
		(n.seoThresholds.MaxSEOScore - n.seoThresholds.MinSEOScore)
	if scoreNorm < 0 {
		scoreNorm = 0
	}
	if scoreNorm > 1 {
		scoreNorm = 1
	}
	
	// Dwell Time: higher is better
	dwellNorm := (signals.AvgDwellTime - n.seoThresholds.MinDwellTime) / 
		(n.seoThresholds.MaxDwellTime - n.seoThresholds.MinDwellTime)
	if dwellNorm < 0 {
		dwellNorm = 0
	}
	if dwellNorm > 1 {
		dwellNorm = 1
	}
	
	// Weighted average
	seoIndex := (positionNorm * 0.3) + (ctrNorm * 0.3) + (scoreNorm * 0.3) + (dwellNorm * 0.1)
	
	return seoIndex
}

// normalizeAds normalizes Ads signals to 0.0-1.0 index
func (n *SignalNormalizer) normalizeAds(signals *AdsSignals) float64 {
	// CTR: higher is better
	ctrNorm := (signals.CTR - n.adsThresholds.MinCTR) / 
		(n.adsThresholds.MaxCTR - n.adsThresholds.MinCTR)
	if ctrNorm < 0 {
		ctrNorm = 0
	}
	if ctrNorm > 1 {
		ctrNorm = 1
	}
	
	// CVR: higher is better
	cvrNorm := (signals.CVR - n.adsThresholds.MinCVR) / 
		(n.adsThresholds.MaxCVR - n.adsThresholds.MinCVR)
	if cvrNorm < 0 {
		cvrNorm = 0
	}
	if cvrNorm > 1 {
		cvrNorm = 1
	}
	
	// CPC: lower is better (inverted)
	cpcNorm := 1.0 - ((signals.CPC - n.adsThresholds.MinCPC) / 
		(n.adsThresholds.MaxCPC - n.adsThresholds.MinCPC))
	if cpcNorm < 0 {
		cpcNorm = 0
	}
	if cpcNorm > 1 {
		cpcNorm = 1
	}
	
	// Weighted average
	adsIndex := (ctrNorm * 0.4) + (cvrNorm * 0.4) + (cpcNorm * 0.2)
	
	return adsIndex
}

// normalizeAnalytics normalizes Analytics signals to 0.0-1.0 index
func (n *SignalNormalizer) normalizeAnalytics(signals *AnalyticsSignals) float64 {
	// Dwell Time: higher is better
	dwellNorm := (signals.DwellTime - n.analyticsThresholds.MinDwellTime) / 
		(n.analyticsThresholds.MaxDwellTime - n.analyticsThresholds.MinDwellTime)
	if dwellNorm < 0 {
		dwellNorm = 0
	}
	if dwellNorm > 1 {
		dwellNorm = 1
	}
	
	// Bounce Rate: lower is better (inverted)
	bounceNorm := 1.0 - ((signals.BounceRate - n.analyticsThresholds.MinBounceRate) / 
		(n.analyticsThresholds.MaxBounceRate - n.analyticsThresholds.MinBounceRate))
	if bounceNorm < 0 {
		bounceNorm = 0
	}
	if bounceNorm > 1 {
		bounceNorm = 1
	}
	
	// Scroll Depth: higher is better
	scrollNorm := (signals.ScrollDepth - n.analyticsThresholds.MinScrollDepth) / 
		(n.analyticsThresholds.MaxScrollDepth - n.analyticsThresholds.MinScrollDepth)
	if scrollNorm < 0 {
		scrollNorm = 0
	}
	if scrollNorm > 1 {
		scrollNorm = 1
	}
	
	// Weighted average
	analyticsIndex := (dwellNorm * 0.4) + (bounceNorm * 0.3) + (scrollNorm * 0.3)
	
	return analyticsIndex
}
