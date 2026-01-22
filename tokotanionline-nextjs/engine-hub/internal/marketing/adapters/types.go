package adapters

import (
	"time"
)

// MarketingAdapter defines the interface for marketing platform adapters
type MarketingAdapter interface {
	// Name returns the adapter name (e.g., "facebook", "google", "tiktok")
	Name() string

	// IsEnabled checks if the adapter is enabled via feature flag
	IsEnabled() bool

	// Send sends an event to the marketing platform (dry-run mode logs only)
	Send(event AdapterEvent) AdapterResult
}

// AdapterEvent represents the event to be sent to an adapter
type AdapterEvent struct {
	// Event metadata
	EventID           string // Original event log ID
	EventKey          string // Internal event key (e.g., "page_view", "view_product")
	ExternalEventName string // External event name from MarketingEventMap (e.g., "PageView", "ViewContent")

	// Entity info
	EntityType string
	EntityId   *string

	// Payload (already sanitized by rules engine)
	Payload map[string]interface{}

	// User/session info
	SessionId *string
	UserId    *string

	// Integration config
	IntegrationID   string
	IntegrationType string // FACEBOOK, GOOGLE, TIKTOK
}

// AdapterResult represents the result of sending an event to an adapter
type AdapterResult struct {
	Status    AdapterStatus // SENT, FAILED, SKIPPED
	Error     *string       // Error message if status is FAILED
	Timestamp time.Time     // When the adapter processed the event
	DryRun    bool          // Whether this was a dry-run (no actual HTTP call)
}

// AdapterStatus represents the status of an adapter send operation
type AdapterStatus string

const (
	AdapterStatusSENT    AdapterStatus = "SENT"    // Successfully sent (or simulated in dry-run)
	AdapterStatusFAILED  AdapterStatus = "FAILED"  // Failed to send
	AdapterStatusSKIPPED AdapterStatus = "SKIPPED" // Skipped (e.g., disabled, no mapping)
)

