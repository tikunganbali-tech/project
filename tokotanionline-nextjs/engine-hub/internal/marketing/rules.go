package marketing

import (
	"fmt"
	"sync"
	"time"
)

// DispatchDecision represents the decision made by the dispatch rules
type DispatchDecision string

const (
	DispatchAllow DispatchDecision = "ALLOW"
	DispatchSkip  DispatchDecision = "SKIP"
)

// SkipReason represents the reason why an event was skipped
type SkipReason string

const (
	SkipDedup              SkipReason = "DEDUP_WINDOW"
	SkipRateLimit          SkipReason = "RATE_LIMIT"
	SkipIntegrationDisabled SkipReason = "INTEGRATION_DISABLED"
	SkipEventDisabled      SkipReason = "EVENT_DISABLED"
)

// DispatchResult represents the result of evaluating dispatch rules
type DispatchResult struct {
	Decision DispatchDecision
	Reason   *SkipReason
	Payload  map[string]interface{} // sanitized
}

// IntegrationConfig represents the integration configuration for evaluation
type IntegrationConfig struct {
	ID   string
	Type string // FACEBOOK, GOOGLE, TIKTOK
}

// dedupEntry represents an entry in the deduplication cache
type dedupEntry struct {
	timestamp time.Time
}

// rateLimitEntry represents rate limit tracking for an integration
type rateLimitEntry struct {
	tokens    int
	lastReset time.Time
	mu        sync.Mutex
}

// RulesEngine holds the state for dispatch rules
type RulesEngine struct {
	// Dedup cache: key -> entry with timestamp
	dedupCache map[string]*dedupEntry
	dedupMu    sync.RWMutex
	dedupTTL   time.Duration

	// Rate limit: integration ID -> rate limit entry
	rateLimitCache map[string]*rateLimitEntry
	rateLimitMu    sync.RWMutex
	rateLimitMax   int           // max events per window
	rateLimitWindow time.Duration // time window

	// Payload sanitizer whitelist
	eventWhitelist map[string][]string
}

var (
	globalRulesEngine *RulesEngine
	rulesOnce         sync.Once
)

// InitRulesEngine initializes the global rules engine
func InitRulesEngine() {
	rulesOnce.Do(func() {
		globalRulesEngine = &RulesEngine{
			dedupCache:      make(map[string]*dedupEntry),
			dedupTTL:        60 * time.Second, // Default 60 seconds
			rateLimitCache:  make(map[string]*rateLimitEntry),
			rateLimitMax:    30,                // 30 events per minute
			rateLimitWindow: 1 * time.Minute,
			eventWhitelist:  initEventWhitelist(),
		}

		// Start cleanup goroutine for dedup cache
		go globalRulesEngine.cleanupDedupCache()
	})
}

// GetRulesEngine returns the global rules engine instance
func GetRulesEngine() *RulesEngine {
	if globalRulesEngine == nil {
		InitRulesEngine()
	}
	return globalRulesEngine
}

// initEventWhitelist initializes the whitelist of allowed fields per event
func initEventWhitelist() map[string][]string {
	return map[string][]string{
		"page_view": {
			"url",
			"referrer",
		},
		"view_product": {
			"productId",
			"price",
		},
		"add_to_cart": {
			"productId",
			"price",
			"quantity",
		},
		"purchase": {
			"orderId",
			"total",
			"currency",
		},
	}
}

// cleanupDedupCache periodically removes expired entries from dedup cache
func (r *RulesEngine) cleanupDedupCache() {
	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()

	for range ticker.C {
		r.dedupMu.Lock()
		now := time.Now()
		for key, entry := range r.dedupCache {
			if now.Sub(entry.timestamp) > r.dedupTTL {
				delete(r.dedupCache, key)
			}
		}
		r.dedupMu.Unlock()
	}
}

// buildDedupKey builds a deduplication key from event payload
func buildDedupKey(event EventPayload, integrationID string) string {
	key := fmt.Sprintf("%s:%s:%s", event.EventKey, event.EntityType, integrationID)
	if event.EntityId != nil {
		key += ":" + *event.EntityId
	}
	if event.SessionId != nil {
		key += ":" + *event.SessionId
	}
	return key
}

// checkDedup checks if the event should be skipped due to deduplication
func (r *RulesEngine) checkDedup(event EventPayload, integrationID string) (bool, *SkipReason) {
	key := buildDedupKey(event, integrationID)

	r.dedupMu.Lock()
	defer r.dedupMu.Unlock()

	entry, exists := r.dedupCache[key]
	if exists {
		// Check if entry is still valid (within TTL window)
		if time.Since(entry.timestamp) < r.dedupTTL {
			// Event seen within window - skip (don't update timestamp to keep original window)
			reason := SkipDedup
			return true, &reason // Should skip
		}
		// Entry expired, remove it
		delete(r.dedupCache, key)
	}

	// Add new entry (first occurrence or after TTL expired)
	r.dedupCache[key] = &dedupEntry{
		timestamp: time.Now(),
	}

	return false, nil // Should allow
}

// getRateLimitEntry gets or creates a rate limit entry for an integration
func (r *RulesEngine) getRateLimitEntry(integrationID string) *rateLimitEntry {
	r.rateLimitMu.Lock()
	defer r.rateLimitMu.Unlock()

	entry, exists := r.rateLimitCache[integrationID]
	if !exists {
		entry = &rateLimitEntry{
			tokens:    r.rateLimitMax,
			lastReset: time.Now(),
		}
		r.rateLimitCache[integrationID] = entry
	}

	return entry
}

// checkRateLimit checks if the event should be skipped due to rate limiting
func (r *RulesEngine) checkRateLimit(integrationID string) (bool, *SkipReason) {
	entry := r.getRateLimitEntry(integrationID)

	entry.mu.Lock()
	defer entry.mu.Unlock()

	// Reset tokens if window has passed
	now := time.Now()
	if now.Sub(entry.lastReset) >= r.rateLimitWindow {
		entry.tokens = r.rateLimitMax
		entry.lastReset = now
	}

	// Check if we have tokens available
	if entry.tokens <= 0 {
		reason := SkipRateLimit
		return true, &reason // Should skip
	}

	// Consume a token
	entry.tokens--

	return false, nil // Should allow
}

// checkEnable checks if the integration and event are enabled
func (r *RulesEngine) checkEnable(registry *Registry, integrationID string, eventKey string) (bool, *SkipReason) {
	// Check if integration exists and is active
	integration, exists := registry.GetIntegration(integrationID)
	if !exists || !integration.IsActive {
		reason := SkipIntegrationDisabled
		return true, &reason // Should skip
	}

	// Check if event is enabled for this integration
	if !registry.IsEventEnabled(integrationID, eventKey) {
		reason := SkipEventDisabled
		return true, &reason // Should skip
	}

	return false, nil // Should allow
}

// sanitizePayload removes fields not in the whitelist for the given event
func (r *RulesEngine) sanitizePayload(eventKey string, payload map[string]interface{}) map[string]interface{} {
	whitelist, exists := r.eventWhitelist[eventKey]
	if !exists {
		// If event not in whitelist, return empty payload
		return make(map[string]interface{})
	}

	sanitized := make(map[string]interface{})
	for _, field := range whitelist {
		if value, ok := payload[field]; ok {
			sanitized[field] = value
		}
	}

	return sanitized
}

// EvaluateDispatch evaluates all dispatch rules and returns the decision
func EvaluateDispatch(
	event EventPayload,
	integration IntegrationConfig,
	registry *Registry,
) DispatchResult {
	engine := GetRulesEngine()

	// Rule 1: Dedup check
	shouldSkip, reason := engine.checkDedup(event, integration.ID)
	if shouldSkip {
		return DispatchResult{
			Decision: DispatchSkip,
			Reason:   reason,
			Payload:  make(map[string]interface{}),
		}
	}

	// Rule 2: Rate limit check
	shouldSkip, reason = engine.checkRateLimit(integration.ID)
	if shouldSkip {
		return DispatchResult{
			Decision: DispatchSkip,
			Reason:   reason,
			Payload:  make(map[string]interface{}),
		}
	}

	// Rule 3: Enable check
	shouldSkip, reason = engine.checkEnable(registry, integration.ID, event.EventKey)
	if shouldSkip {
		return DispatchResult{
			Decision: DispatchSkip,
			Reason:   reason,
			Payload:  make(map[string]interface{}),
		}
	}

	// Rule 4: Payload sanitization
	sanitizedPayload := engine.sanitizePayload(event.EventKey, event.Payload)

	// All rules passed - allow dispatch
	return DispatchResult{
		Decision: DispatchAllow,
		Reason:   nil,
		Payload:  sanitizedPayload,
	}
}

