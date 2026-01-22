package adapters

import (
	"fmt"
	"log"
	"os"
	"time"
)

// GoogleAdapter implements the MarketingAdapter interface for Google Analytics 4 / Google Ads
type GoogleAdapter struct {
	enabled       bool
	dryRun        bool
	measurementID string
	apiSecret     string
	httpClient    *HTTPClient
	liveConfig    *LiveConfig
	errorTracker  *ErrorTracker
}

// NewGoogleAdapter creates a new Google adapter instance
func NewGoogleAdapter() *GoogleAdapter {
	InitLiveConfig()
	InitErrorTracker()
	
	return &GoogleAdapter{
		enabled:       getFeatureFlag("GA_ENABLED"),
		dryRun:        isIntegrationDryRun("GOOGLE"), // Per-integration override
		measurementID: os.Getenv("GA_MEASUREMENT_ID"),
		apiSecret:     os.Getenv("GA_API_SECRET"),
		httpClient:    NewHTTPClient(),
		liveConfig:    GetLiveConfig(),
		errorTracker:  GetErrorTracker(),
	}
}

// Name returns the adapter name
func (a *GoogleAdapter) Name() string {
	return "google"
}

// IsEnabled checks if Google adapter is enabled
func (a *GoogleAdapter) IsEnabled() bool {
	return a.enabled
}

// Send sends an event to Google Analytics (dry-run mode logs only, live mode makes HTTP call)
func (a *GoogleAdapter) Send(event AdapterEvent) AdapterResult {
	result := AdapterResult{
		Timestamp: time.Now(),
		DryRun:    a.dryRun,
	}

	// Check if enabled
	if !a.enabled {
		result.Status = AdapterStatusSKIPPED
		skipReason := "Google adapter disabled (GA_ENABLED=false)"
		result.Error = &skipReason
		log.Printf("[GOOGLE ADAPTER] Event %s skipped: %s", event.EventID, skipReason)
		return result
	}

	// Check kill-switch
	if !a.liveConfig.IsLiveEnabled() {
		result.DryRun = true
		a.dryRun = true // Override to dry-run if kill-switch is off
	}

	// Check error tracker for auto-disable
	if a.errorTracker.ShouldDisable("GOOGLE") {
		result.Status = AdapterStatusSKIPPED
		skipReason := "Google adapter auto-disabled due to error spike"
		result.Error = &skipReason
		log.Printf("[GOOGLE ADAPTER] Event %s skipped: %s", event.EventID, skipReason)
		return result
	}

	// Check per-event allowlist (only if not in dry-run)
	if !a.dryRun && !a.liveConfig.IsEventAllowed(event.EventKey) {
		result.Status = AdapterStatusSKIPPED
		skipReason := fmt.Sprintf("Event %s not in live allowlist", event.EventKey)
		result.Error = &skipReason
		log.Printf("[GOOGLE ADAPTER] Event %s skipped: %s", event.EventID, skipReason)
		return result
	}

	// Map payload according to Google Analytics 4 Measurement Protocol format
	mappedPayload := a.mapPayload(event)

	// Dry-run mode: log only, no HTTP call
	if a.dryRun {
		logDryRunEvent("GOOGLE", event, mappedPayload)
		result.Status = AdapterStatusSENT
		log.Printf("[GOOGLE ADAPTER] [DRY-RUN] Event %s simulated as SENT", event.EventID)
		return result
	}

	// Live mode: make actual HTTP call
	return a.sendLive(event, mappedPayload)
}

// sendLive makes the actual HTTP call to Google Analytics 4 Measurement Protocol
func (a *GoogleAdapter) sendLive(event AdapterEvent, payload map[string]interface{}) AdapterResult {
	result := AdapterResult{
		Timestamp: time.Now(),
		DryRun:    false,
	}

	// Validate credentials
	if a.measurementID == "" || a.apiSecret == "" {
		result.Status = AdapterStatusFAILED
		errorMsg := "Google credentials not configured (GA_MEASUREMENT_ID or GA_API_SECRET missing)"
		result.Error = &errorMsg
		log.Printf("[GOOGLE ADAPTER] Event %s failed: %s", event.EventID, errorMsg)
		return result
	}

	// Google Analytics 4 Measurement Protocol endpoint
	url := fmt.Sprintf("https://www.google-analytics.com/mp/collect?measurement_id=%s&api_secret=%s",
		a.measurementID, a.apiSecret)

	// Headers (no auth needed, API secret in URL)
	headers := map[string]string{}

	// Send HTTP request
	statusCode, responseBody, err := a.httpClient.Send(url, headers, payload)

	if err != nil {
		// Record error for tracking
		a.errorTracker.RecordError("GOOGLE")
		
		result.Status = AdapterStatusFAILED
		errorMsg := fmt.Sprintf("HTTP request failed: %v", err)
		result.Error = &errorMsg
		log.Printf("[GOOGLE ADAPTER] Event %s failed: %s", event.EventID, errorMsg)
		return result
	}

	// GA4 MP returns 204 No Content on success, or 2xx for other success cases
	if statusCode >= 200 && statusCode < 300 {
		result.Status = AdapterStatusSENT
		log.Printf("[GOOGLE ADAPTER] Event %s sent successfully (status: %d)", event.EventID, statusCode)
	} else {
		// Record error for tracking
		a.errorTracker.RecordError("GOOGLE")
		
		result.Status = AdapterStatusFAILED
		errorMsg := fmt.Sprintf("Google Analytics API returned status %d: %s", statusCode, string(responseBody))
		result.Error = &errorMsg
		log.Printf("[GOOGLE ADAPTER] Event %s failed: %s", event.EventID, errorMsg)
	}

	return result
}

// mapPayload maps the sanitized payload to Google Analytics 4 format
func (a *GoogleAdapter) mapPayload(event AdapterEvent) map[string]interface{} {
	payload := make(map[string]interface{})

	// Base GA4 event structure
	payload["client_id"] = a.extractClientID(event)
	payload["events"] = []map[string]interface{}{
		{
			"name": event.ExternalEventName,
			"params": a.buildEventParams(event),
		},
	}

	// User properties
	if event.UserId != nil {
		payload["user_id"] = *event.UserId
	}

	return payload
}

// buildEventParams builds the event parameters for GA4
func (a *GoogleAdapter) buildEventParams(event AdapterEvent) map[string]interface{} {
	params := make(map[string]interface{})

	// URL and page info
	if url, ok := event.Payload["url"].(string); ok {
		params["page_location"] = url
	}
	if referrer, ok := event.Payload["referrer"].(string); ok {
		params["page_referrer"] = referrer
	}

	// Entity information
	if event.EntityId != nil {
		params["entity_type"] = event.EntityType
		params["entity_id"] = *event.EntityId
	}

	// Event-specific parameters
	switch event.EventKey {
	case "view_product":
		if productID, ok := event.Payload["productId"].(string); ok {
			params["item_id"] = productID
		}
		if price, ok := event.Payload["price"].(float64); ok {
			params["value"] = price
			params["currency"] = "IDR"
		}
	case "add_to_cart":
		if productID, ok := event.Payload["productId"].(string); ok {
			params["item_id"] = productID
		}
		if price, ok := event.Payload["price"].(float64); ok {
			params["value"] = price
			params["currency"] = "IDR"
		}
		if quantity, ok := event.Payload["quantity"].(float64); ok {
			params["quantity"] = int(quantity)
		}
	case "purchase":
		if orderID, ok := event.Payload["orderId"].(string); ok {
			params["transaction_id"] = orderID
		}
		if total, ok := event.Payload["total"].(float64); ok {
			params["value"] = total
			params["currency"] = event.Payload["currency"]
			if params["currency"] == nil {
				params["currency"] = "IDR"
			}
		}
	}

	return params
}

// extractClientID extracts or generates a client ID from session/user info
func (a *GoogleAdapter) extractClientID(event AdapterEvent) string {
	// Use session ID if available, otherwise use user ID, otherwise generate
	if event.SessionId != nil {
		return *event.SessionId
	}
	if event.UserId != nil {
		return *event.UserId
	}
	// Generate a temporary client ID (in real implementation, would be stored)
	return "anonymous_" + time.Now().Format("20060102150405")
}

