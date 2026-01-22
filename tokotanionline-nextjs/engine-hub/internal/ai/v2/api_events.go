package v2

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
)

// HandlePublishEvent handles POST /api/v2/events/publish
// PHASE 3: Publish Engine = Event Distributor
func HandlePublishEvent(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		PageID   string `json:"pageId"`
		Version  int    `json:"version"`
		PageType string `json:"pageType"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, fmt.Sprintf("Invalid request body: %v", err), http.StatusBadRequest)
		return
	}

	log.Printf("[EVENT API] Publish event received: pageId=%s, version=%d, pageType=%s", req.PageID, req.Version, req.PageType)

	// PHASE 3: Emit CONTENT_PUBLISHED event
	emitter := GetEventEmitter()
	emitter.EmitContentPublished(req.PageID, req.Version, req.PageType)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"message": "Event CONTENT_PUBLISHED emitted",
	})
}

// HandleContentProducedEvent handles POST /api/v2/events/content-produced
// PHASE 3: Emit CONTENT_PRODUCED event
func HandleContentProducedEvent(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		PageID   string `json:"pageId"`
		Version  int    `json:"version"`
		PageType string `json:"pageType"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, fmt.Sprintf("Invalid request body: %v", err), http.StatusBadRequest)
		return
	}

	log.Printf("[EVENT API] Content produced event received: pageId=%s, version=%d", req.PageID, req.Version)

	// PHASE 3: Emit CONTENT_PRODUCED event
	emitter := GetEventEmitter()
	emitter.EmitContentProduced(req.PageID, req.Version, req.PageType)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"message": "Event CONTENT_PRODUCED emitted",
	})
}

// HandleUserInteractionEvent handles POST /api/v2/events/user-interaction
// PHASE 3: Analytics emit USER_INTERACTION_UPDATED
func HandleUserInteractionEvent(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		PageID     string  `json:"pageId"`
		Version    int     `json:"version"`
		PageType   string  `json:"pageType"`
		CTR        float64 `json:"ctr"`
		DwellTime  float64 `json:"dwellTime"`
		BounceRate float64 `json:"bounceRate"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, fmt.Sprintf("Invalid request body: %v", err), http.StatusBadRequest)
		return
	}

	log.Printf("[EVENT API] User interaction event received: pageId=%s, version=%d, ctr=%.2f", req.PageID, req.Version, req.CTR)

	// PHASE 3: Emit USER_INTERACTION_UPDATED event
	emitter := GetEventEmitter()
	emitter.EmitUserInteractionUpdated(req.PageID, req.Version, req.PageType, map[string]interface{}{
		"ctr":        req.CTR,
		"dwellTime":  req.DwellTime,
		"bounceRate": req.BounceRate,
	})

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"message": "Event USER_INTERACTION_UPDATED emitted",
	})
}

// HandlePostGenerationComplete handles POST /api/v2/events/post-generation-complete
// EKSEKUSI: Emit POST_GENERATION_COMPLETE event after AI generation
func HandlePostGenerationComplete(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		Entity   string `json:"entity"`
		EntityID string `json:"entity_id"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, fmt.Sprintf("Invalid request body: %v", err), http.StatusBadRequest)
		return
	}

	log.Printf("[EVENT API] Post generation complete event received: entity=%s, entity_id=%s", req.Entity, req.EntityID)

	// Emit POST_GENERATION_COMPLETE event
	emitter := GetEventEmitter()
	emitter.Emit(EventPostGenerationComplete, EventPayload{
		PageID:   req.EntityID, // Use entity_id as pageId for compatibility
		PageType: req.Entity,
		Data: map[string]interface{}{
			"entity":   req.Entity,
			"entity_id": req.EntityID,
		},
	})

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"message": "Event POST_GENERATION_COMPLETE emitted",
	})
}
