package ads

import (
	"fmt"
	"log"
)

// PHASE 8B.2: Insight Mapper
// Peta sinyal Ads → content intent (top/mid/bottom funnel)
// Terikat brand + locale
// Tidak menyentuh body konten

// ContentIntent represents content intent mapped from ads signals
type ContentIntent struct {
	BrandID        string   `json:"brandId"`        // PHASE 8B: Brand isolation
	LocaleID       string   `json:"localeId"`       // PHASE 8B: Locale isolation
	FunnelStage    string   `json:"funnelStage"`    // "TOP" | "MID" | "BOTTOM"
	IntentType     string   `json:"intentType"`    // "AWARENESS" | "CONSIDERATION" | "PURCHASE"
	ContentTypes   []string `json:"contentTypes"`  // Recommended content types
	Topics         []string `json:"topics"`        // Recommended topics
	Angles         []string `json:"angles"`        // Recommended angles
	CTAs            []string `json:"ctas"`          // Recommended CTAs
	Priority        int      `json:"priority"`      // 1-10 priority score
	Confidence      float64  `json:"confidence"`    // 0.0 - 1.0
}

// InsightMapper maps ads intent signals to content intent
// PHASE 8B.2: Brand + locale bound, no content body manipulation
type InsightMapper struct {
	// Content type mappings by funnel stage
	topFunnelContentTypes    []string
	midFunnelContentTypes     []string
	bottomFunnelContentTypes []string
}

// NewInsightMapper creates a new insight mapper
func NewInsightMapper() *InsightMapper {
	return &InsightMapper{
		topFunnelContentTypes: []string{
			"blog", "guide", "article", "educational",
		},
		midFunnelContentTypes: []string{
			"comparison", "review", "case-study", "how-to",
		},
		bottomFunnelContentTypes: []string{
			"product", "pricing", "testimonial", "faq",
		},
	}
}

// MapToContentIntent maps ads intent signal to content intent
// PHASE 8B.2: Brand + locale bound, no content body manipulation
func (m *InsightMapper) MapToContentIntent(signal IntentSignal, brandID string, localeID string) (*ContentIntent, error) {
	log.Printf("[INSIGHT MAPPER] Mapping intent signal to content intent: type=%s, stage=%s, brandId=%s, localeId=%s", 
		signal.IntentType, signal.FunnelStage, brandID, localeID)
	
	// PHASE 8B.2: Guardrail - brand and locale are required
	if brandID == "" {
		return nil, fmt.Errorf("PHASE 8B.2 GUARDRAIL: brandId is required")
	}
	if localeID == "" {
		return nil, fmt.Errorf("PHASE 8B.2 GUARDRAIL: localeId is required")
	}
	
	// Determine content types based on funnel stage
	contentTypes := m.getContentTypesForStage(signal.FunnelStage)
	
	// Determine topics based on intent type and funnel stage
	topics := m.getTopicsForIntent(signal.IntentType, signal.FunnelStage)
	
	// Determine angles based on intent strength
	angles := m.getAnglesForIntent(signal.IntentStrength, signal.IntentType)
	
	// Determine CTAs based on funnel stage
	ctas := m.getCTAsForStage(signal.FunnelStage)
	
	// Calculate priority based on intent strength and confidence
	priority := m.calculatePriority(signal.IntentStrength, signal.Confidence)
	
	log.Printf("[INSIGHT MAPPER] Content intent mapped: funnelStage=%s, contentTypes=%v, priority=%d", 
		signal.FunnelStage, contentTypes, priority)
	
	return &ContentIntent{
		BrandID:      brandID,
		LocaleID:     localeID,
		FunnelStage:  signal.FunnelStage,
		IntentType:   signal.IntentType,
		ContentTypes: contentTypes,
		Topics:       topics,
		Angles:       angles,
		CTAs:         ctas,
		Priority:     priority,
		Confidence:   signal.Confidence,
	}, nil
}

// getContentTypesForStage returns recommended content types for funnel stage
func (m *InsightMapper) getContentTypesForStage(stage string) []string {
	switch stage {
	case "TOP":
		return m.topFunnelContentTypes
	case "MID":
		return m.midFunnelContentTypes
	case "BOTTOM":
		return m.bottomFunnelContentTypes
	default:
		return m.midFunnelContentTypes
	}
}

// getTopicsForIntent returns recommended topics based on intent
func (m *InsightMapper) getTopicsForIntent(intentType string, funnelStage string) []string {
	topics := []string{}
	
	switch intentType {
	case "AWARENESS":
		topics = []string{
			"introduction", "basics", "overview", "getting-started",
		}
	case "CONSIDERATION":
		topics = []string{
			"comparison", "benefits", "features", "alternatives",
		}
	case "PURCHASE":
		topics = []string{
			"pricing", "testimonials", "case-studies", "guarantees",
		}
	case "RETENTION":
		topics = []string{
			"advanced-usage", "tips", "best-practices", "troubleshooting",
		}
	default:
		topics = []string{"general", "information"}
	}
	
	return topics
}

// getAnglesForIntent returns recommended angles based on intent strength
func (m *InsightMapper) getAnglesForIntent(intentStrength float64, intentType string) []string {
	angles := []string{}
	
	// High intent strength suggests more direct angles
	if intentStrength >= 0.7 {
		angles = append(angles, "direct", "solution-focused", "results-driven")
	} else if intentStrength >= 0.4 {
		angles = append(angles, "educational", "informative", "helpful")
	} else {
		angles = append(angles, "awareness-building", "educational", "soft")
	}
	
	// Add intent-specific angles
	switch intentType {
	case "PURCHASE":
		angles = append(angles, "urgency", "value-proposition", "social-proof")
	case "CONSIDERATION":
		angles = append(angles, "comparison", "benefits", "differentiation")
	case "AWARENESS":
		angles = append(angles, "educational", "problem-awareness", "solution-introduction")
	}
	
	return angles
}

// getCTAsForStage returns recommended CTAs for funnel stage
func (m *InsightMapper) getCTAsForStage(stage string) []string {
	switch stage {
	case "TOP":
		return []string{"Learn More", "Read More", "Explore", "Discover"}
	case "MID":
		return []string{"Compare", "See Options", "View Details", "Get Started"}
	case "BOTTOM":
		return []string{"Buy Now", "Get Quote", "Contact Us", "Start Free Trial"}
	default:
		return []string{"Learn More", "Get Started"}
	}
}

// calculatePriority calculates priority score (1-10)
func (m *InsightMapper) calculatePriority(intentStrength float64, confidence float64) int {
	// Priority = (intentStrength * 0.6 + confidence * 0.4) * 10
	priority := (intentStrength*0.6 + confidence*0.4) * 10
	
	// Round to integer
	priorityInt := int(priority + 0.5)
	
	// Clamp to 1-10
	if priorityInt < 1 {
		priorityInt = 1
	}
	if priorityInt > 10 {
		priorityInt = 10
	}
	
	return priorityInt
}

// MapBatch maps multiple intent signals to content intents
// PHASE 8B.2: Batch mapping for multiple signals
func (m *InsightMapper) MapBatch(signals []IntentSignal, brandID string, localeID string) ([]ContentIntent, error) {
	intents := []ContentIntent{}
	
	for _, signal := range signals {
		intent, err := m.MapToContentIntent(signal, brandID, localeID)
		if err != nil {
			log.Printf("[INSIGHT MAPPER] Failed to map signal: %v", err)
			continue
		}
		intents = append(intents, *intent)
	}
	
	return intents, nil
}
