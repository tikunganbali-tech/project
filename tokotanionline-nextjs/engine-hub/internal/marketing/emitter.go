package marketing

import (
	"bytes"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"sync"
	"time"
)

// EventPayload represents the event payload to be sent to the internal API
type EventPayload struct {
	EventKey   string                 `json:"eventKey"`
	EntityType string                 `json:"entityType"`
	EntityId   *string                `json:"entityId,omitempty"`
	Payload    map[string]interface{} `json:"payload"`
	Source     string                 `json:"source"` // ENGINE
	SessionId  *string                `json:"sessionId,omitempty"`
	UserId     *string                `json:"userId,omitempty"`
}

// EventEmitter handles emitting events to the internal API
type EventEmitter struct {
	endpoint string
	apiKey   string
	client   *http.Client
}

var (
	globalEmitter *EventEmitter
	emitterOnce   sync.Once
)

// InitEmitter initializes the global event emitter
func InitEmitter() error {
	emitterOnce.Do(func() {
		// Get base URL from environment
		baseURL := os.Getenv("NEXT_PUBLIC_BASE_URL")
		if baseURL == "" {
			baseURL = os.Getenv("NEXT_PUBLIC_SITE_URL")
		}
		if baseURL == "" {
			// Default to localhost:3000 for development
			baseURL = "http://localhost:3000"
		}

		// Ensure base URL doesn't end with slash
		if len(baseURL) > 0 && baseURL[len(baseURL)-1] == '/' {
			baseURL = baseURL[:len(baseURL)-1]
		}

		endpoint := baseURL + "/api/internal/events/log"

		// Get API key from environment
		apiKey := os.Getenv("INTERNAL_EVENT_KEY")
		if apiKey == "" {
			log.Printf("[EVENT EMITTER] WARNING: INTERNAL_EVENT_KEY not set, emitter will fail silently")
		}

		// Create HTTP client with timeout <= 2 seconds
		client := &http.Client{
			Timeout: 2 * time.Second,
		}

		globalEmitter = &EventEmitter{
			endpoint: endpoint,
			apiKey:   apiKey,
			client:   client,
		}
	})

	return nil
}

// GetEmitter returns the global emitter instance
func GetEmitter() *EventEmitter {
	if globalEmitter == nil {
		// Try to initialize if not already done
		if err := InitEmitter(); err != nil {
			log.Printf("[EVENT EMITTER] WARNING: Failed to initialize emitter: %v", err)
			// Return a dummy emitter that fails silently
			return &EventEmitter{
				endpoint: "",
				apiKey:   "",
				client:   &http.Client{Timeout: 2 * time.Second},
			}
		}
	}
	return globalEmitter
}

// Emit sends an event to the internal API asynchronously (fire-and-forget)
// This method does not block and logs errors instead of panicking
func (e *EventEmitter) Emit(event EventPayload) {
	// Validate required fields
	if event.EventKey == "" {
		log.Printf("[EVENT EMITTER] WARNING: Event key is empty, skipping emit")
		return
	}

	if event.EntityType == "" {
		log.Printf("[EVENT EMITTER] WARNING: Entity type is empty, skipping emit")
		return
	}

	if event.Source == "" {
		event.Source = "ENGINE"
	}

	// If endpoint or API key is not configured, fail silently
	if e.endpoint == "" || e.apiKey == "" {
		log.Printf("[EVENT EMITTER] WARNING: Emitter not configured (endpoint or API key missing), skipping emit for event: %s", event.EventKey)
		return
	}

	// Fire-and-forget: run in goroutine (async, non-blocking)
	go func() {
		if err := e.emitSync(event); err != nil {
			// Error handling: log only, no panic, no retry
			log.Printf("[EVENT EMITTER] WARNING: Failed to emit event %s: %v", event.EventKey, err)
		}
	}()
}

// emitSync performs the actual HTTP POST request
// This is called from the goroutine in Emit()
func (e *EventEmitter) emitSync(event EventPayload) error {
	// Marshal event to JSON
	jsonData, err := json.Marshal(event)
	if err != nil {
		return fmt.Errorf("failed to marshal event: %w", err)
	}

	// Create HTTP request
	req, err := http.NewRequest("POST", e.endpoint, bytes.NewBuffer(jsonData))
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}

	// Set headers
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("x-internal-key", e.apiKey)

	// Send request (with timeout <= 2 seconds)
	resp, err := e.client.Do(req)
	if err != nil {
		return fmt.Errorf("failed to send request: %w", err)
	}
	defer resp.Body.Close()

	// Check response status
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return fmt.Errorf("unexpected status code: %d", resp.StatusCode)
	}

	return nil
}

