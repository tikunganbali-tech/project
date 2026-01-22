package adapters

import (
	"fmt"
	"log"
	"os"
	"time"
)

// TikTokAdapter implements the MarketingAdapter interface for TikTok Pixel/Events API
type TikTokAdapter struct {
	enabled     bool
	dryRun      bool
	pixelID     string
	accessToken string
	httpClient  *HTTPClient
	liveConfig  *LiveConfig
	errorTracker *ErrorTracker
}

// NewTikTokAdapter creates a new TikTok adapter instance
func NewTikTokAdapter() *TikTokAdapter {
	InitLiveConfig()
	InitErrorTracker()
	
	return &TikTokAdapter{
		enabled:      getFeatureFlag("TIKTOK_ENABLED"),
		dryRun:       isIntegrationDryRun("TIKTOK"), // Per-integration override
		pixelID:      os.Getenv("TIKTOK_PIXEL_ID"),
		accessToken:  os.Getenv("TIKTOK_ACCESS_TOKEN"),
		httpClient:   NewHTTPClient(),
		liveConfig:   GetLiveConfig(),
		errorTracker: GetErrorTracker(),
	}
}

// Name returns the adapter name
func (a *TikTokAdapter) Name() string {
	return "tiktok"
}

// IsEnabled checks if TikTok adapter is enabled
func (a *TikTokAdapter) IsEnabled() bool {
	return a.enabled
}

// Send sends an event to TikTok (dry-run mode logs only, live mode makes HTTP call)
func (a *TikTokAdapter) Send(event AdapterEvent) AdapterResult {
	result := AdapterResult{
		Timestamp: time.Now(),
		DryRun:    a.dryRun,
	}

	// Check if enabled
	if !a.enabled {
		result.Status = AdapterStatusSKIPPED
		skipReason := "TikTok adapter disabled (TIKTOK_ENABLED=false)"
		result.Error = &skipReason
		log.Printf("[TIKTOK ADAPTER] Event %s skipped: %s", event.EventID, skipReason)
		return result
	}

	// Check kill-switch
	if !a.liveConfig.IsLiveEnabled() {
		result.DryRun = true
		a.dryRun = true // Override to dry-run if kill-switch is off
	}

	// Check error tracker for auto-disable
	if a.errorTracker.ShouldDisable("TIKTOK") {
		result.Status = AdapterStatusSKIPPED
		skipReason := "TikTok adapter auto-disabled due to error spike"
		result.Error = &skipReason
		log.Printf("[TIKTOK ADAPTER] Event %s skipped: %s", event.EventID, skipReason)
		return result
	}

	// Check per-event allowlist (only if not in dry-run)
	if !a.dryRun && !a.liveConfig.IsEventAllowed(event.EventKey) {
		result.Status = AdapterStatusSKIPPED
		skipReason := fmt.Sprintf("Event %s not in live allowlist", event.EventKey)
		result.Error = &skipReason
		log.Printf("[TIKTOK ADAPTER] Event %s skipped: %s", event.EventID, skipReason)
		return result
	}

	// Map payload according to TikTok Events API format
	mappedPayload := a.mapPayload(event)

	// Dry-run mode: log only, no HTTP call
	if a.dryRun {
		logDryRunEvent("TIKTOK", event, mappedPayload)
		result.Status = AdapterStatusSENT
		log.Printf("[TIKTOK ADAPTER] [DRY-RUN] Event %s simulated as SENT", event.EventID)
		return result
	}

	// Live mode: make actual HTTP call
	return a.sendLive(event, mappedPayload)
}

// sendLive makes the actual HTTP call to TikTok Events API
func (a *TikTokAdapter) sendLive(event AdapterEvent, payload map[string]interface{}) AdapterResult {
	result := AdapterResult{
		Timestamp: time.Now(),
		DryRun:    false,
	}

	// Validate credentials
	if a.pixelID == "" || a.accessToken == "" {
		result.Status = AdapterStatusFAILED
		errorMsg := "TikTok credentials not configured (TIKTOK_PIXEL_ID or TIKTOK_ACCESS_TOKEN missing)"
		result.Error = &errorMsg
		log.Printf("[TIKTOK ADAPTER] Event %s failed: %s", event.EventID, errorMsg)
		return result
	}

	// TikTok Events API endpoint
	url := fmt.Sprintf("https://business-api.tiktok.com/open_api/v1.3/event/track/", a.pixelID)

	// Prepare request payload
	requestPayload := map[string]interface{}{
		"pixel_code": a.pixelID,
		"event":      payload["event"],
		"timestamp":  payload["timestamp"],
		"context":    payload["context"],
		"properties": payload["properties"],
	}

	// Headers
	headers := map[string]string{
		"Access-Token": a.accessToken,
	}

	// Send HTTP request
	statusCode, responseBody, err := a.httpClient.Send(url, headers, requestPayload)

	if err != nil {
		// Record error for tracking
		a.errorTracker.RecordError("TIKTOK")
		
		result.Status = AdapterStatusFAILED
		errorMsg := fmt.Sprintf("HTTP request failed: %v", err)
		result.Error = &errorMsg
		log.Printf("[TIKTOK ADAPTER] Event %s failed: %s", event.EventID, errorMsg)
		return result
	}

	// Check status code
	if statusCode >= 200 && statusCode < 300 {
		result.Status = AdapterStatusSENT
		log.Printf("[TIKTOK ADAPTER] Event %s sent successfully (status: %d)", event.EventID, statusCode)
	} else {
		// Record error for tracking
		a.errorTracker.RecordError("TIKTOK")
		
		result.Status = AdapterStatusFAILED
		errorMsg := fmt.Sprintf("TikTok API returned status %d: %s", statusCode, string(responseBody))
		result.Error = &errorMsg
		log.Printf("[TIKTOK ADAPTER] Event %s failed: %s", event.EventID, errorMsg)
	}

	return result
}

// mapPayload maps the sanitized payload to TikTok Events API format
func (a *TikTokAdapter) mapPayload(event AdapterEvent) map[string]interface{} {
	payload := make(map[string]interface{})

	// Base TikTok event structure
	payload["event"] = event.ExternalEventName
	payload["timestamp"] = time.Now().Format(time.RFC3339)
	payload["context"] = a.buildContext(event)

	// Properties
	properties := make(map[string]interface{})
	
	switch event.EventKey {
	case "view_product":
		if productID, ok := event.Payload["productId"].(string); ok {
			properties["content_id"] = productID
			properties["content_type"] = "product"
		}
		if price, ok := event.Payload["price"].(float64); ok {
			properties["value"] = price
			properties["currency"] = "IDR"
		}
	case "add_to_cart":
		if productID, ok := event.Payload["productId"].(string); ok {
			properties["content_id"] = productID
			properties["content_type"] = "product"
		}
		if price, ok := event.Payload["price"].(float64); ok {
			properties["value"] = price
			properties["currency"] = "IDR"
		}
		if quantity, ok := event.Payload["quantity"].(float64); ok {
			properties["quantity"] = int(quantity)
		}
	case "purchase":
		if orderID, ok := event.Payload["orderId"].(string); ok {
			properties["order_id"] = orderID
		}
		if total, ok := event.Payload["total"].(float64); ok {
			properties["value"] = total
			properties["currency"] = event.Payload["currency"]
			if properties["currency"] == nil {
				properties["currency"] = "IDR"
			}
		}
	}

	// Add entity information if available
	if event.EntityId != nil {
		properties["entity_type"] = event.EntityType
		properties["entity_id"] = *event.EntityId
	}

	payload["properties"] = properties

	return payload
}

// buildContext builds the context object for TikTok events
func (a *TikTokAdapter) buildContext(event AdapterEvent) map[string]interface{} {
	context := make(map[string]interface{})
	
	// Page info
	if url, ok := event.Payload["url"].(string); ok {
		context["page"] = map[string]interface{}{
			"url": url,
		}
		if referrer, ok := event.Payload["referrer"].(string); ok {
			if pageMap, ok := context["page"].(map[string]interface{}); ok {
				pageMap["referrer"] = referrer
			}
		}
	}

	// User info
	user := make(map[string]interface{})
	if event.UserId != nil {
		user["external_id"] = *event.UserId
	}
	if event.SessionId != nil {
		// Use session ID for TikTok tracking
		user["session_id"] = *event.SessionId
	}
	if len(user) > 0 {
		context["user"] = user
	}

	return context
}

