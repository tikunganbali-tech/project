package v2

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"strings"
)

// RevisionHandler handles revision requests
// PHASE 4: AI Generator produksi VERSI BARU (V+1)
// ❌ DILARANG mengedit versi lama
// ✅ Emit CONTENT_PRODUCED (version +1)
type RevisionHandler struct {
	generator *Generator
	storage   *Storage
}

// NewRevisionHandler creates a new revision handler
func NewRevisionHandler() *RevisionHandler {
	return &RevisionHandler{
		generator: NewGenerator(),
		storage:   NewStorage(),
	}
}

// HandleRevisionRequest handles CONTENT_REVISION_REQUESTED event
// PHASE 4: AI Generator produksi VERSI BARU (tidak edit konten lama)
func (r *RevisionHandler) HandleRevisionRequest(payload EventPayload) {
	log.Printf("[REVISION HANDLER] Handling revision request: pageId=%s, version=%d", payload.PageID, payload.Version)
	
	// Extract revision payload
	revisionData := payload.Data
	if revisionData == nil {
		log.Printf("[REVISION HANDLER] No revision data in payload")
		return
	}
	
	// Get current version content to understand context
	currentContent, err := r.storage.Get(payload.PageID, payload.Version)
	if err != nil {
		log.Printf("[REVISION HANDLER] Failed to get current content: %v", err)
		return
	}
	
	// Extract reasons from payload
	reasonsJSON, _ := json.Marshal(revisionData["reasons"])
	var reasons []RevisionReason
	json.Unmarshal(reasonsJSON, &reasons)
	
	log.Printf("[REVISION HANDLER] Revision reasons: %d reasons found", len(reasons))
	for _, reason := range reasons {
		log.Printf("[REVISION HANDLER] - %s (%s): %s", reason.Type, reason.Severity, reason.Message)
	}
	
	// PHASE 4: Build generation request for new version
	// Extract topic from current content
	topic := currentContent.Package.Title
	if topic == "" {
		topic = payload.PageID // Fallback
	}
	
	// PHASE 5: Extract revision strategy from payload
	strategyData, hasStrategy := revisionData["strategy"].(map[string]interface{})
	
	// Build generation request with revision context
	req := GenerationRequest{
		PageType:      currentContent.Package.PageType,
		Topic:         topic,
		Language:      "id-ID",
		TargetAudience: currentContent.Package.Tone.TargetAudience,
		Tone:          currentContent.Package.Tone.Style,
		// PHASE 4: Include revision reasons in outline/notes for AI context
		// PHASE 5: Include strategy guidance for adaptive production
		Outline:       buildAdaptiveRevisionOutline(currentContent.Package, reasons, strategyData, hasStrategy),
	}
	
	// PHASE 4: AI Generator produksi VERSI BARU (V+1)
	log.Printf("[REVISION HANDLER] Generating new version for pageId=%s (current: V%d)", payload.PageID, payload.Version)
	
	ctx := context.Background()
	result, err := r.generator.Generate(ctx, req)
	if err != nil {
		log.Printf("[REVISION HANDLER] Failed to generate new version: %v", err)
		return
	}
	
	// PHASE 4: New version will be saved automatically by generator (V+1)
	// PHASE 4: CONTENT_PRODUCED event will be emitted automatically by generator
	log.Printf("[REVISION HANDLER] New version generated: pageId=%s, newVersion=%d", payload.PageID, result.Package.Metadata.Version)
}

// buildRevisionOutline builds outline for revision based on reasons (backward compatibility)
func buildRevisionOutline(currentPkg FrontendContentPackage, reasons []RevisionReason) string {
	return buildAdaptiveRevisionOutline(currentPkg, reasons, nil, false)
}

// buildAdaptiveRevisionOutline builds outline for adaptive revision
// PHASE 5: AI Generator menerima konten lama, QC report, revision strategy
func buildAdaptiveRevisionOutline(
	currentPkg FrontendContentPackage,
	reasons []RevisionReason,
	strategyData map[string]interface{},
	hasStrategy bool,
) string {
	var outline strings.Builder
	
	outline.WriteString("ADAPTIVE REVISION REQUEST - Improve content based on historical performance data:\n\n")
	
	// PHASE 5: Include strategy guidance
	if hasStrategy {
		outline.WriteString("STRATEGY-BASED IMPROVEMENTS:\n")
		
		if improveStructure, ok := strategyData["improveStructure"].(bool); ok && improveStructure {
			outline.WriteString("- STRUCTURE: Improve content structure and organization\n")
			if guidance, ok := strategyData["structureGuidance"].([]interface{}); ok {
				for _, g := range guidance {
					outline.WriteString(fmt.Sprintf("  * %s\n", g))
				}
			}
		}
		
		if improveDepth, ok := strategyData["improveDepth"].(bool); ok && improveDepth {
			outline.WriteString("- DEPTH: Increase content depth and detail\n")
			if guidance, ok := strategyData["depthGuidance"].([]interface{}); ok {
				for _, g := range guidance {
					outline.WriteString(fmt.Sprintf("  * %s\n", g))
				}
			}
		}
		
		if improveIntent, ok := strategyData["improveIntent"].(bool); ok && improveIntent {
			outline.WriteString("- INTENT: Better align content with user intent\n")
			if guidance, ok := strategyData["intentGuidance"].([]interface{}); ok {
				for _, g := range guidance {
					outline.WriteString(fmt.Sprintf("  * %s\n", g))
				}
			}
		}
		
		outline.WriteString("\n")
	}
	
	// Include revision reasons
	outline.WriteString("REVISION REASONS:\n")
	for _, reason := range reasons {
		outline.WriteString(fmt.Sprintf("- %s (%s): %s\n", reason.Type, reason.Severity, reason.Message))
		outline.WriteString(fmt.Sprintf("  Recommendation: %s\n", reason.Recommendation))
	}
	
	outline.WriteString("\nCURRENT CONTENT STRUCTURE (for reference, do not copy):\n")
	for _, section := range currentPkg.Sections {
		outline.WriteString(fmt.Sprintf("- %s (H%d)\n", section.Heading, section.HeadingLevel))
	}
	
	outline.WriteString("\nINSTRUCTIONS:\n")
	outline.WriteString("- Produce NEW VERSION (V+1), do not edit current version\n")
	outline.WriteString("- Apply strategy-based improvements\n")
	outline.WriteString("- Maintain content quality and depth\n")
	outline.WriteString("- Ensure content aligns with user intent\n")
	
	return outline.String()
}

// SetupRevisionListener sets up revision request listener
func SetupRevisionListener() {
	emitter := GetEventEmitter()
	handler := NewRevisionHandler()
	
	// Subscribe to CONTENT_REVISION_REQUESTED
	emitter.Subscribe(EventContentRevisionRequested, func(payload EventPayload) {
		log.Printf("[REVISION LISTENER] Received CONTENT_REVISION_REQUESTED: pageId=%s, version=%d", payload.PageID, payload.Version)
		handler.HandleRevisionRequest(payload)
	})
	
	log.Println("[REVISION LISTENER] Revision listener setup complete")
}
