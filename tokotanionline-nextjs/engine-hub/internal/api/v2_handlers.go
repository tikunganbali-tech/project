package api

import (
	"net/http"
	"strings"

	v2 "engine-hub/internal/ai/v2"
	qc "engine-hub/internal/qc"
)

var v2Handler *v2.APIHandler

func init() {
	// Initialize v2 handler
	v2Handler = v2.NewAPIHandler()
}

// V2Generate handles POST /api/v2/generate
func V2Generate(w http.ResponseWriter, r *http.Request) {
	v2Handler.HandleGenerate(w, r)
}

// V2Content handles GET /api/v2/content/:pageId/:version, /api/v2/content/:pageId/versions, /api/v2/content/:pageId/latest
func V2Content(w http.ResponseWriter, r *http.Request) {
	path := r.URL.Path
	
	// Parse path: /api/v2/content/:pageId/:action
	parts := strings.Split(strings.TrimPrefix(path, "/api/v2/content/"), "/")
	
	if len(parts) < 1 {
		http.Error(w, "Invalid path format", http.StatusBadRequest)
		return
	}
	
	if len(parts) == 1 {
		// /api/v2/content/:pageId - get latest
		v2Handler.HandleGetLatest(w, r)
		return
	}
	
	action := parts[1]
	
	switch action {
	case "versions":
		// GET /api/v2/content/:pageId/versions
		v2Handler.HandleGetAllVersions(w, r)
	case "latest":
		// GET /api/v2/content/:pageId/latest
		v2Handler.HandleGetLatest(w, r)
	default:
		// GET /api/v2/content/:pageId/:version (version is a number)
		v2Handler.HandleGetContent(w, r)
	}
}

// V2ListPages handles GET /api/v2/pages
func V2ListPages(w http.ResponseWriter, r *http.Request) {
	v2Handler.HandleListPages(w, r)
}

// V2PublishEvent handles POST /api/v2/events/publish
func V2PublishEvent(w http.ResponseWriter, r *http.Request) {
	v2Handler.HandlePublishEvent(w, r)
}

// V2ContentProducedEvent handles POST /api/v2/events/content-produced
func V2ContentProducedEvent(w http.ResponseWriter, r *http.Request) {
	v2Handler.HandleContentProducedEvent(w, r)
}

// V2UserInteractionEvent handles POST /api/v2/events/user-interaction
func V2UserInteractionEvent(w http.ResponseWriter, r *http.Request) {
	v2Handler.HandleUserInteractionEvent(w, r)
}

// V2PostGenerationComplete handles POST /api/v2/events/post-generation-complete
func V2PostGenerationComplete(w http.ResponseWriter, r *http.Request) {
	v2.HandlePostGenerationComplete(w, r)
}

// V2QCDecision handles POST /api/v2/qc/decision
func V2QCDecision(w http.ResponseWriter, r *http.Request) {
	v2.HandleQCDecision(w, r)
}

// V2AggregatedInsight handles GET /api/v2/insights/aggregated
// PHASE 7C: Read-only aggregated insight
func V2AggregatedInsight(w http.ResponseWriter, r *http.Request) {
	v2.HandleAggregatedInsight(w, r)
}

// V2ListBrands handles GET /api/v2/insights/brands
// PHASE 7C: List brands for insight
func V2ListBrands(w http.ResponseWriter, r *http.Request) {
	v2.HandleListBrands(w, r)
}

// V2ListLocales handles GET /api/v2/insights/locales
// PHASE 7C: List locales for insight
func V2ListLocales(w http.ResponseWriter, r *http.Request) {
	v2.HandleListLocales(w, r)
}

// V2QCStatus handles GET /api/v2/qc/:pageId/:version
func V2QCStatus(w http.ResponseWriter, r *http.Request) {
	v2.HandleGetQCStatus(w, r)
}

// V2Insights handles GET /api/v2/insights/:pageId/:version
func V2Insights(w http.ResponseWriter, r *http.Request) {
	v2.HandleGetInsight(w, r)
}

// AIGenerateV2 handles POST /api/engine/ai/generate-v2
// A1: Single Entry Point - ALL Blog/Product generation MUST use this endpoint
// This is a bridge that ensures v2 format (answerDriven=true) is used
func AIGenerateV2(w http.ResponseWriter, r *http.Request) {
	// Delegate to existing AIGenerate handler but ensure answerDriven=true
	// The existing handler already supports v2 format when answerDriven=true
	AIGenerate(w, r)
}

// QCRecheck handles POST /qc/recheck
// PHASE B: Recheck validation status after SEO is complete
func QCRecheck(w http.ResponseWriter, r *http.Request) {
	qc.HandleRecheck(w, r)
}
