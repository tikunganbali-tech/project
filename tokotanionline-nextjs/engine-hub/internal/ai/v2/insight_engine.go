package v2

import (
	"fmt"
	"log"
	"time"
)

// PerformanceTrend represents performance trend over time
// PHASE 5: Tren performa, pola stagnan / naik / turun
type PerformanceTrend string

const (
	TrendStagnant PerformanceTrend = "STAGNANT" // No significant change
	TrendRising   PerformanceTrend = "RISING"    // Improving
	TrendFalling  PerformanceTrend = "FALLING"   // Declining
)

// Insight represents SEO insight based on historical data
// PHASE 5: SEO v2 membaca SERP_SIGNAL_HISTORY dan USER_SIGNAL_AGGREGATED
type Insight struct {
	PageID          string           `json:"pageId"`
	Version         int              `json:"version"`
	GeneratedAt     string           `json:"generatedAt"`
	
	// Performance trends
	SERPTrend       PerformanceTrend `json:"serpTrend"`
	CTRTrend        PerformanceTrend `json:"ctrTrend"`
	EngagementTrend PerformanceTrend `json:"engagementTrend"`
	
	// Patterns
	StagnantPatterns []string `json:"stagnantPatterns"` // Patterns that are not improving
	DecliningPatterns []string `json:"decliningPatterns"` // Patterns that are getting worse
	
	// Recommendations
	Recommendations []InsightRecommendation `json:"recommendations"`
}

// InsightRecommendation represents a recommendation based on insight
type InsightRecommendation struct {
	Type        string `json:"type"`        // "STRUCTURE", "DEPTH", "INTENT", etc.
	Message     string `json:"message"`
	Priority    string `json:"priority"`    // "LOW", "MEDIUM", "HIGH"
	Action      string `json:"action"`      // What needs to be done
}

// InsightEngine generates insights from historical data
// PHASE 5: SEO v2 → Insight Engine (Bukan Editor)
type InsightEngine struct {
	serpCollector      *SERPCollector
	userSignalAgg      *UserSignalAggregator
	storage            *Storage
}

// NewInsightEngine creates a new insight engine
func NewInsightEngine() *InsightEngine {
	return &InsightEngine{
		serpCollector: NewSERPCollector(),
		userSignalAgg: NewUserSignalAggregator(),
		storage:       NewStorage(),
	}
}

// GenerateInsight generates insight for a page version
// PHASE 5: Hasilkan tren performa, pola stagnan / naik / turun
func (e *InsightEngine) GenerateInsight(pageID string, version int) (*Insight, error) {
	log.Printf("[INSIGHT ENGINE] Generating insight: pageId=%s, version=%d", pageID, version)
	
	// Get SERP signal history
	serpHistory, err := e.serpCollector.GetHistory(pageID, version)
	if err != nil {
		log.Printf("[INSIGHT ENGINE] No SERP history found: %v", err)
		serpHistory = &SERPSignalHistory{
			PageID:  pageID,
			Version: version,
			Signals: []SERPSignal{},
		}
	}
	
	// Get aggregated user signals
	userSignals, err := e.userSignalAgg.GetAggregated(pageID, version)
	if err != nil {
		log.Printf("[INSIGHT ENGINE] No user signals found: %v", err)
		userSignals = &AggregatedUserSignal{
			PageID:  pageID,
			Version: version,
		}
	}
	
	// Get all versions for comparison
	allVersions, err := e.storage.GetAllVersions(pageID)
	if err != nil {
		log.Printf("[INSIGHT ENGINE] Failed to get versions: %v", err)
		allVersions = []StoredContent{}
	}
	
	// Analyze trends
	serpTrend := e.analyzeSERPTrend(serpHistory)
	ctrTrend := e.analyzeCTRTrend(serpHistory)
	engagementTrend := e.analyzeEngagementTrend(userSignals, allVersions)
	
	// Identify patterns
	stagnantPatterns := e.identifyStagnantPatterns(serpHistory, userSignals)
	decliningPatterns := e.identifyDecliningPatterns(serpHistory, userSignals)
	
	// Generate recommendations
	recommendations := e.generateRecommendations(serpTrend, ctrTrend, engagementTrend, stagnantPatterns, decliningPatterns)
	
	insight := &Insight{
		PageID:           pageID,
		Version:          version,
		GeneratedAt:      time.Now().Format(time.RFC3339),
		SERPTrend:        serpTrend,
		CTRTrend:         ctrTrend,
		EngagementTrend:  engagementTrend,
		StagnantPatterns: stagnantPatterns,
		DecliningPatterns: decliningPatterns,
		Recommendations:  recommendations,
	}
	
	log.Printf("[INSIGHT ENGINE] Insight generated: pageId=%s, version=%d, serpTrend=%s, ctrTrend=%s", 
		pageID, version, serpTrend, ctrTrend)
	
	return insight, nil
}

// analyzeSERPTrend analyzes SERP position trend
func (e *InsightEngine) analyzeSERPTrend(history *SERPSignalHistory) PerformanceTrend {
	if len(history.Signals) < 2 {
		return TrendStagnant
	}
	
	// Compare first and last signals
	first := history.Signals[0]
	last := history.Signals[len(history.Signals)-1]
	
	if last.Position == 0 {
		return TrendFalling // Not in top 100
	}
	
	if first.Position == 0 {
		return TrendRising // Appeared in top 100
	}
	
	if last.Position < first.Position {
		return TrendRising // Position improved (lower number = better)
	} else if last.Position > first.Position {
		return TrendFalling // Position declined
	}
	
	return TrendStagnant
}

// analyzeCTRTrend analyzes CTR trend
func (e *InsightEngine) analyzeCTRTrend(history *SERPSignalHistory) PerformanceTrend {
	if len(history.Signals) < 2 {
		return TrendStagnant
	}
	
	// Calculate average CTR for first half vs second half
	mid := len(history.Signals) / 2
	firstHalfCTR := 0.0
	secondHalfCTR := 0.0
	
	for i := 0; i < mid; i++ {
		firstHalfCTR += history.Signals[i].CTR
	}
	firstHalfCTR /= float64(mid)
	
	for i := mid; i < len(history.Signals); i++ {
		secondHalfCTR += history.Signals[i].CTR
	}
	secondHalfCTR /= float64(len(history.Signals) - mid)
	
	threshold := 0.01 // 1% change threshold
	if secondHalfCTR > firstHalfCTR+threshold {
		return TrendRising
	} else if secondHalfCTR < firstHalfCTR-threshold {
		return TrendFalling
	}
	
	return TrendStagnant
}

// analyzeEngagementTrend analyzes user engagement trend
func (e *InsightEngine) analyzeEngagementTrend(current *AggregatedUserSignal, allVersions []StoredContent) PerformanceTrend {
	if len(allVersions) < 2 {
		return TrendStagnant
	}
	
	// Compare with previous version
	prevVersion := current.Version - 1
	if prevVersion < 1 {
		return TrendStagnant
	}
	
	prevSignals, err := e.userSignalAgg.GetAggregated(current.PageID, prevVersion)
	if err != nil {
		return TrendStagnant
	}
	
	// Compare dwell time and bounce rate
	if current.AvgDwellTime > prevSignals.AvgDwellTime*1.1 {
		return TrendRising
	} else if current.AvgDwellTime < prevSignals.AvgDwellTime*0.9 {
		return TrendFalling
	}
	
	return TrendStagnant
}

// identifyStagnantPatterns identifies patterns that are not improving
func (e *InsightEngine) identifyStagnantPatterns(serpHistory *SERPSignalHistory, userSignals *AggregatedUserSignal) []string {
	patterns := []string{}
	
	// Check if position is stuck
	if len(serpHistory.Signals) >= 5 {
		recentPositions := serpHistory.Signals[len(serpHistory.Signals)-5:]
		allSame := true
		for i := 1; i < len(recentPositions); i++ {
			if recentPositions[i].Position != recentPositions[0].Position {
				allSame = false
				break
			}
		}
		if allSame && recentPositions[0].Position > 20 {
			patterns = append(patterns, "Position stuck outside top 20")
		}
	}
	
	// Check if CTR is low and not improving
	if len(serpHistory.Signals) > 0 {
		lastCTR := serpHistory.Signals[len(serpHistory.Signals)-1].CTR
		if lastCTR < 0.02 && e.analyzeCTRTrend(serpHistory) == TrendStagnant {
			patterns = append(patterns, "Low CTR with no improvement")
		}
	}
	
	return patterns
}

// identifyDecliningPatterns identifies patterns that are getting worse
func (e *InsightEngine) identifyDecliningPatterns(serpHistory *SERPSignalHistory, userSignals *AggregatedUserSignal) []string {
	patterns := []string{}
	
	// Check if position is declining
	if e.analyzeSERPTrend(serpHistory) == TrendFalling {
		patterns = append(patterns, "SERP position declining")
	}
	
	// Check if CTR is declining
	if e.analyzeCTRTrend(serpHistory) == TrendFalling {
		patterns = append(patterns, "CTR declining")
	}
	
	// Check if engagement is declining
	if userSignals.AvgBounceRate > 0.7 {
		patterns = append(patterns, "High bounce rate")
	}
	
	if userSignals.AvgDwellTime < 30 {
		patterns = append(patterns, "Low dwell time")
	}
	
	return patterns
}

// generateRecommendations generates recommendations based on trends and patterns
func (e *InsightEngine) generateRecommendations(
	serpTrend, ctrTrend, engagementTrend PerformanceTrend,
	stagnantPatterns, decliningPatterns []string,
) []InsightRecommendation {
	recommendations := []InsightRecommendation{}
	
	// SERP trend recommendations
	if serpTrend == TrendFalling {
		recommendations = append(recommendations, InsightRecommendation{
			Type:     "STRUCTURE",
			Message:  "SERP position is declining, consider improving content structure",
			Priority: "HIGH",
			Action:   "Review heading hierarchy and content organization",
		})
	}
	
	// CTR trend recommendations
	if ctrTrend == TrendFalling {
		recommendations = append(recommendations, InsightRecommendation{
			Type:     "INTENT",
			Message:  "CTR is declining, content may not match user intent",
			Priority: "MEDIUM",
			Action:   "Review title and meta description alignment with content",
		})
	}
	
	// Engagement trend recommendations
	if engagementTrend == TrendFalling {
		recommendations = append(recommendations, InsightRecommendation{
			Type:     "DEPTH",
			Message:  "User engagement is declining, content may lack depth",
			Priority: "MEDIUM",
			Action:   "Consider expanding content depth and adding more value",
		})
	}
	
	// Stagnant patterns
	for _, pattern := range stagnantPatterns {
		recommendations = append(recommendations, InsightRecommendation{
			Type:     "GENERAL",
			Message:  fmt.Sprintf("Stagnant pattern detected: %s", pattern),
			Priority: "LOW",
			Action:   "Monitor and consider content refresh",
		})
	}
	
	// Declining patterns
	for _, pattern := range decliningPatterns {
		recommendations = append(recommendations, InsightRecommendation{
			Type:     "URGENT",
			Message:  fmt.Sprintf("Declining pattern detected: %s", pattern),
			Priority: "HIGH",
			Action:   "Immediate content revision recommended",
		})
	}
	
	return recommendations
}
