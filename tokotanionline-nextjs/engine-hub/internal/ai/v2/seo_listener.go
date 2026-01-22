package v2

import (
	"log"
)

// SetupSEOListener sets up SEO v2 event listeners
// PHASE 3: SEO v2 HANYA mendengar CONTENT_PUBLISHED dan USER_INTERACTION_UPDATED
func SetupSEOListener() {
	emitter := GetEventEmitter()
	seo := NewSEOv2()
	
	// Subscribe to CONTENT_PUBLISHED
	emitter.Subscribe(EventContentPublished, func(payload EventPayload) {
		log.Printf("[SEO V2 LISTENER] Received CONTENT_PUBLISHED: pageId=%s, version=%d", payload.PageID, payload.Version)
		seo.HandleContentPublished(payload)
	})
	
	// Subscribe to USER_INTERACTION_UPDATED
	emitter.Subscribe(EventUserInteractionUpdated, func(payload EventPayload) {
		log.Printf("[SEO V2 LISTENER] Received USER_INTERACTION_UPDATED: pageId=%s, version=%d", payload.PageID, payload.Version)
		seo.HandleUserInteractionUpdated(payload)
	})
	
	// NOTE: POST_GENERATION_COMPLETE handler moved to main.go to avoid import cycle
	// seo -> content -> v2 -> seo cycle broken by handling in main.go
	
	log.Println("[SEO V2 LISTENER] SEO v2 listeners setup complete")
	
	// PHASE 3: Setup revision listener
	SetupRevisionListener()
}
