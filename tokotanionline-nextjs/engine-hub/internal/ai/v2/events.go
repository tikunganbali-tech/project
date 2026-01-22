package v2

import (
	"encoding/json"
	"log"
	"time"
)

// EventType represents the type of event
type EventType string

const (
	EventContentProduced        EventType = "CONTENT_PRODUCED"
	EventContentPublished       EventType = "CONTENT_PUBLISHED"
	EventUserInteractionUpdated EventType = "USER_INTERACTION_UPDATED"
	EventContentRevisionRequested EventType = "CONTENT_REVISION_REQUESTED"
	EventPostGenerationComplete EventType = "POST_GENERATION_COMPLETE"
)

// EventPayload represents event data
// PHASE 3: Event payload TIDAK memuat logic, hanya data (ID, versi, page_type)
type EventPayload struct {
	EventType EventType `json:"eventType"`
	PageID    string    `json:"pageId"`
	Version   int       `json:"version"`
	PageType  string    `json:"pageType"`
	Timestamp string    `json:"timestamp"`
	Data      map[string]interface{} `json:"data,omitempty"` // Additional data (no logic)
}

// EventEmitter handles event emission
// PHASE 3: Emit event HANYA di server
type EventEmitter struct {
	handlers map[EventType][]func(EventPayload)
}

// NewEventEmitter creates a new event emitter
func NewEventEmitter() *EventEmitter {
	return &EventEmitter{
		handlers: make(map[EventType][]func(EventPayload)),
	}
}

// Subscribe subscribes to an event
func (e *EventEmitter) Subscribe(eventType EventType, handler func(EventPayload)) {
	if e.handlers[eventType] == nil {
		e.handlers[eventType] = []func(EventPayload){}
	}
	e.handlers[eventType] = append(e.handlers[eventType], handler)
	log.Printf("[EVENT EMITTER] Subscribed to %s", eventType)
}

// Emit emits an event
// PHASE 3: Emit event HANYA di server
func (e *EventEmitter) Emit(eventType EventType, payload EventPayload) {
	payload.EventType = eventType
	payload.Timestamp = time.Now().Format(time.RFC3339)
	
	log.Printf("[EVENT EMITTER] Emitting event: %s, pageId=%s, version=%d", eventType, payload.PageID, payload.Version)
	
	// Call all handlers
	handlers := e.handlers[eventType]
	for _, handler := range handlers {
		go func(h func(EventPayload)) {
			defer func() {
				if r := recover(); r != nil {
					log.Printf("[EVENT EMITTER] Panic in handler for %s: %v", eventType, r)
				}
			}()
			h(payload)
		}(handler)
	}
}

// EmitContentProduced emits CONTENT_PRODUCED event
func (e *EventEmitter) EmitContentProduced(pageID string, version int, pageType string) {
	e.Emit(EventContentProduced, EventPayload{
		PageID:   pageID,
		Version:  version,
		PageType: pageType,
	})
}

// EmitContentProducedWithData emits CONTENT_PRODUCED event with additional data
// PHASE 7A: Brand-aware event emission
func (e *EventEmitter) EmitContentProducedWithData(pageID string, version int, pageType string, data map[string]interface{}) {
	e.Emit(EventContentProduced, EventPayload{
		PageID:   pageID,
		Version:  version,
		PageType: pageType,
		Data:     data,
	})
}

// EmitContentPublished emits CONTENT_PUBLISHED event
func (e *EventEmitter) EmitContentPublished(pageID string, version int, pageType string) {
	e.Emit(EventContentPublished, EventPayload{
		PageID:   pageID,
		Version:  version,
		PageType: pageType,
	})
}

// EmitUserInteractionUpdated emits USER_INTERACTION_UPDATED event
func (e *EventEmitter) EmitUserInteractionUpdated(pageID string, version int, pageType string, interactionData map[string]interface{}) {
	e.Emit(EventUserInteractionUpdated, EventPayload{
		PageID:   pageID,
		Version:  version,
		PageType: pageType,
		Data:     interactionData,
	})
}

// EmitContentRevisionRequested emits CONTENT_REVISION_REQUESTED event (backward compatibility)
func (e *EventEmitter) EmitContentRevisionRequested(pageID string, version int, pageType string, reason string) {
	e.Emit(EventContentRevisionRequested, EventPayload{
		PageID:   pageID,
		Version:  version,
		PageType: pageType,
		Data: map[string]interface{}{
			"reason": reason,
		},
	})
}

// EmitContentRevisionRequestedWithPayload emits CONTENT_REVISION_REQUESTED event with complete payload
// PHASE 4: Payload lengkap dengan page_id, current_version, reasons[], data_serp, user_signals
func (e *EventEmitter) EmitContentRevisionRequestedWithPayload(pageID string, version int, pageType string, payload RevisionRequestPayload) {
	// Convert RevisionRequestPayload to EventPayload Data
	data := map[string]interface{}{
		"pageId":         payload.PageID,
		"currentVersion": payload.CurrentVersion,
		"reasons":        payload.Reasons,
		"dataSerp":       payload.DataSERP,
		"userSignals":    payload.UserSignals,
	}
	
	// Include SEO report if available
	if payload.SEOReport != nil {
		data["seoReport"] = payload.SEOReport
	}
	
	e.Emit(EventContentRevisionRequested, EventPayload{
		PageID:   pageID,
		Version:  version,
		PageType: pageType,
		Data:     data,
	})
}

// Global event emitter instance
var globalEmitter *EventEmitter

func init() {
	globalEmitter = NewEventEmitter()
}

// GetEventEmitter returns the global event emitter
func GetEventEmitter() *EventEmitter {
	return globalEmitter
}

// MarshalEventPayload marshals event payload to JSON
func (p EventPayload) MarshalJSON() ([]byte, error) {
	type Alias EventPayload
	return json.Marshal(&struct {
		*Alias
	}{
		Alias: (*Alias)(&p),
	})
}
