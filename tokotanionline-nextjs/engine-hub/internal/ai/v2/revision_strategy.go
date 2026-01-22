package v2

import (
	"fmt"
	"log"
)

// RevisionStrategy represents a data-driven revision strategy
// PHASE 5: Strategy berisi apa yang perlu diperbaiki (struktur, kedalaman, intent)
// Bukan rewrite kalimat
type RevisionStrategy struct {
	PageID          string                 `json:"pageId"`
	CurrentVersion  int                    `json:"currentVersion"`
	GeneratedAt     string                 `json:"generatedAt"`
	
	// What needs to be improved
	ImproveStructure bool                  `json:"improveStructure"` // Heading hierarchy, organization
	ImproveDepth     bool                  `json:"improveDepth"`     // Content depth, detail level
	ImproveIntent    bool                  `json:"improveIntent"`    // User intent alignment
	
	// Specific guidance
	StructureGuidance []string              `json:"structureGuidance"` // Specific structure improvements
	DepthGuidance     []string              `json:"depthGuidance"`     // Specific depth improvements
	IntentGuidance    []string              `json:"intentGuidance"`    // Specific intent improvements
	
	// Data backing
	Insight          *Insight              `json:"insight,omitempty"`
	SerpHistory      *SERPSignalHistory    `json:"serpHistory,omitempty"`
	UserSignals      *AggregatedUserSignal `json:"userSignals,omitempty"`
}

// StrategyBuilder builds revision strategy from insights
// PHASE 5: Insight → Revision Strategy
type StrategyBuilder struct {
	insightEngine *InsightEngine
}

// NewStrategyBuilder creates a new strategy builder
func NewStrategyBuilder() *StrategyBuilder {
	return &StrategyBuilder{
		insightEngine: NewInsightEngine(),
	}
}

// BuildStrategy builds revision strategy from data
// PHASE 5: Jika tren negatif berulang, buat REVISION_STRATEGY
func (b *StrategyBuilder) BuildStrategy(pageID string, version int) (*RevisionStrategy, error) {
	log.Printf("[STRATEGY BUILDER] Building revision strategy: pageId=%s, version=%d", pageID, version)
	
	// Generate insight
	insight, err := b.insightEngine.GenerateInsight(pageID, version)
	if err != nil {
		return nil, fmt.Errorf("failed to generate insight: %w", err)
	}
	
	// Check if negative trends are repeating
	hasRepeatingNegativeTrends := b.hasRepeatingNegativeTrends(insight)
	
	if !hasRepeatingNegativeTrends {
		log.Printf("[STRATEGY BUILDER] No repeating negative trends, no strategy needed")
		return nil, nil
	}
	
	// Build strategy based on insight
	strategy := &RevisionStrategy{
		PageID:         pageID,
		CurrentVersion: version,
		GeneratedAt:    insight.GeneratedAt,
		Insight:        insight,
	}
	
	// Determine what needs improvement
	for _, rec := range insight.Recommendations {
		switch rec.Type {
		case "STRUCTURE":
			strategy.ImproveStructure = true
			strategy.StructureGuidance = append(strategy.StructureGuidance, rec.Action)
		case "DEPTH":
			strategy.ImproveDepth = true
			strategy.DepthGuidance = append(strategy.DepthGuidance, rec.Action)
		case "INTENT":
			strategy.ImproveIntent = true
			strategy.IntentGuidance = append(strategy.IntentGuidance, rec.Action)
		}
	}
	
	// Get supporting data
	serpCollector := NewSERPCollector()
	serpHistory, _ := serpCollector.GetHistory(pageID, version)
	strategy.SerpHistory = serpHistory
	
	userSignalAgg := NewUserSignalAggregator()
	userSignals, _ := userSignalAgg.GetAggregated(pageID, version)
	strategy.UserSignals = userSignals
	
	log.Printf("[STRATEGY BUILDER] Strategy built: pageId=%s, version=%d, improveStructure=%v, improveDepth=%v, improveIntent=%v", 
		pageID, version, strategy.ImproveStructure, strategy.ImproveDepth, strategy.ImproveIntent)
	
	return strategy, nil
}

// hasRepeatingNegativeTrends checks if negative trends are repeating
func (b *StrategyBuilder) hasRepeatingNegativeTrends(insight *Insight) bool {
	// Check if multiple trends are negative
	negativeCount := 0
	
	if insight.SERPTrend == TrendFalling {
		negativeCount++
	}
	if insight.CTRTrend == TrendFalling {
		negativeCount++
	}
	if insight.EngagementTrend == TrendFalling {
		negativeCount++
	}
	
	// If 2+ trends are negative, consider it repeating
	return negativeCount >= 2 || len(insight.DecliningPatterns) > 0
}

// EmitRevisionRequestWithStrategy emits CONTENT_REVISION_REQUESTED with strategy
// PHASE 5: Emit event CONTENT_REVISION_REQUESTED (dengan strategy)
func EmitRevisionRequestWithStrategy(pageID string, version int, pageType string, strategy *RevisionStrategy) {
	emitter := GetEventEmitter()
	
	// Build revision payload with strategy
	revisionPayload := RevisionRequestPayload{
		PageID:         pageID,
		CurrentVersion: version,
		Reasons:        []RevisionReason{},
		DataSERP:       map[string]interface{}{},
		UserSignals:    map[string]interface{}{},
	}
	
	// Add strategy-based reasons
	if strategy.ImproveStructure {
		for _, guidance := range strategy.StructureGuidance {
			revisionPayload.Reasons = append(revisionPayload.Reasons, RevisionReason{
				Type:          "STRUCTURE_IMPROVEMENT",
				Severity:      "MEDIUM",
				Message:       guidance,
				Recommendation: "Improve content structure based on performance data",
			})
		}
	}
	
	if strategy.ImproveDepth {
		for _, guidance := range strategy.DepthGuidance {
			revisionPayload.Reasons = append(revisionPayload.Reasons, RevisionReason{
				Type:          "DEPTH_IMPROVEMENT",
				Severity:      "MEDIUM",
				Message:       guidance,
				Recommendation: "Increase content depth based on engagement data",
			})
		}
	}
	
	if strategy.ImproveIntent {
		for _, guidance := range strategy.IntentGuidance {
			revisionPayload.Reasons = append(revisionPayload.Reasons, RevisionReason{
				Type:          "INTENT_IMPROVEMENT",
				Severity:      "MEDIUM",
				Message:       guidance,
				Recommendation: "Align content with user intent based on CTR data",
			})
		}
	}
	
	// Add strategy to payload data
	revisionPayload.DataSERP["strategy"] = map[string]interface{}{
		"improveStructure": strategy.ImproveStructure,
		"improveDepth":     strategy.ImproveDepth,
		"improveIntent":    strategy.ImproveIntent,
		"structureGuidance": strategy.StructureGuidance,
		"depthGuidance":     strategy.DepthGuidance,
		"intentGuidance":    strategy.IntentGuidance,
	}
	
	emitter.EmitContentRevisionRequestedWithPayload(pageID, version, pageType, revisionPayload)
	log.Printf("[STRATEGY BUILDER] Emitted CONTENT_REVISION_REQUESTED with strategy: pageId=%s, version=%d", pageID, version)
}
