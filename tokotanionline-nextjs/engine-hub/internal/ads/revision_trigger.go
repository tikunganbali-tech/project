package ads

import (
	"fmt"
	"log"
	
	v2 "engine-hub/internal/ai/v2"
)

// PHASE 8B.4: Revision Trigger (EVENT-ONLY)
// Jika strategi butuh revisi: Emit CONTENT_REVISION_REQUESTED
// Tidak mengedit versi lama
// Tidak auto-publish

// RevisionTrigger triggers content revision requests via events
// PHASE 8B.4: Event-only, no content manipulation
type RevisionTrigger struct {
	eventEmitter *v2.EventEmitter
}

// NewRevisionTrigger creates a new revision trigger
func NewRevisionTrigger() *RevisionTrigger {
	return &RevisionTrigger{
		eventEmitter: v2.GetEventEmitter(),
	}
}

// TriggerRevision emits CONTENT_REVISION_REQUESTED event if strategy indicates need for revision
// PHASE 8B.4: Event-only, no edit old version, no auto-publish
func (r *RevisionTrigger) TriggerRevision(
	brief *ContentStrategyBrief,
	pageID string,
	currentVersion int,
	pageType string,
) error {
	log.Printf("[REVISION TRIGGER] Evaluating revision need: pageId=%s, version=%d, priority=%d", 
		pageID, currentVersion, brief.Priority)
	
	// PHASE 8B.4: Only trigger if priority indicates need for revision
	// Priority >= 7 suggests high need for revision
	if brief.Priority < 7 {
		log.Printf("[REVISION TRIGGER] Priority %d below threshold, skipping revision trigger", brief.Priority)
		return nil
	}
	
	// Check if there are high-priority recommendations
	hasHighPriorityRec := false
	for _, rec := range brief.Recommendations {
		if rec.Priority == "HIGH" && rec.Type == "REVISION" {
			hasHighPriorityRec = true
			break
		}
	}
	
	if !hasHighPriorityRec {
		log.Printf("[REVISION TRIGGER] No high-priority revision recommendations, skipping")
		return nil
	}
	
	// PHASE 8B.4: Emit CONTENT_REVISION_REQUESTED event
	// This does NOT edit the old version
	// This does NOT auto-publish
	// This only signals that revision may be needed
	
	revisionReasons := []v2.RevisionReason{}
	
	// Add SEO-based reasons
	if brief.SEOInsights.Score < 60 {
		revisionReasons = append(revisionReasons, v2.RevisionReason{
			Type:        "LOW_SEO_SCORE",
			Severity:    "HIGH",
			Message:     fmt.Sprintf("SEO score is %d (below threshold)", brief.SEOInsights.Score),
			Recommendation: "Review and improve SEO elements",
		})
	}
	
	// Add Ads-based reasons
	if len(brief.AdsInsights.WhatStagnant) > 0 {
		revisionReasons = append(revisionReasons, v2.RevisionReason{
			Type:        "ADS_PERFORMANCE_ISSUES",
			Severity:    "MEDIUM",
			Message:     fmt.Sprintf("%d ads elements are underperforming", len(brief.AdsInsights.WhatStagnant)),
			Recommendation: "Consider revising content angles based on ads performance",
		})
	}
	
	// Add combined reasons
	if brief.SEOInsights.Score < 60 && len(brief.AdsInsights.WhatStagnant) > 0 {
		revisionReasons = append(revisionReasons, v2.RevisionReason{
			Type:        "COMBINED_STRATEGY_ISSUES",
			Severity:    "HIGH",
			Message:     "Both SEO and Ads indicate need for content revision",
			Recommendation: "Review content strategy and consider revision",
		})
	}
	
	// Build revision request payload
	payload := v2.RevisionRequestPayload{
		PageID:        pageID,
		CurrentVersion: currentVersion,
		Reasons:       revisionReasons,
		DataSERP:      map[string]interface{}{}, // Would include SERP data if available
		UserSignals:   map[string]interface{}{}, // Would include user signals if available
	}
	
	// Add strategy brief to payload data
	payloadData := map[string]interface{}{
		"strategyBrief": brief,
		"brandId":       brief.BrandID,
		"localeId":      brief.LocaleID,
		"priority":      brief.Priority,
		"contentIntent": brief.ContentIntent,
	}
	
	// PHASE 8B.4: Emit event (does NOT edit old version, does NOT auto-publish)
	// Use EmitContentRevisionRequestedWithPayload for complete payload
	revisionPayload := v2.RevisionRequestPayload{
		PageID:        pageID,
		CurrentVersion: currentVersion,
		Reasons:       revisionReasons,
		DataSERP:      map[string]interface{}{},
		UserSignals:   payloadData,
	}
	
	r.eventEmitter.EmitContentRevisionRequestedWithPayload(
		pageID,
		currentVersion,
		pageType,
		revisionPayload,
	)
	
	log.Printf("[REVISION TRIGGER] CONTENT_REVISION_REQUESTED event emitted: pageId=%s, version=%d, reasons=%d", 
		pageID, currentVersion, len(revisionReasons))
	
	// PHASE 8B.4 GUARDRAIL: Explicitly log that we did NOT edit old version
	log.Printf("[REVISION TRIGGER] GUARDRAIL: Old version %d NOT modified", currentVersion)
	log.Printf("[REVISION TRIGGER] GUARDRAIL: No auto-publish triggered")
	
	return nil
}

// ShouldTriggerRevision determines if revision should be triggered
// PHASE 8B.4: Decision logic for revision trigger
func (r *RevisionTrigger) ShouldTriggerRevision(brief *ContentStrategyBrief) bool {
	// Trigger if priority is high (>= 7)
	if brief.Priority >= 7 {
		return true
	}
	
	// Trigger if there are high-priority revision recommendations
	for _, rec := range brief.Recommendations {
		if rec.Priority == "HIGH" && rec.Type == "REVISION" {
			return true
		}
	}
	
	// Trigger if both SEO and Ads indicate issues
	if brief.SEOInsights.Score < 60 && len(brief.AdsInsights.WhatStagnant) > 0 {
		return true
	}
	
	return false
}
