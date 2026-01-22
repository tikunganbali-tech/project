package adapters

import (
	"encoding/json"
	"fmt"
	"log"
	"os"
	"strconv"
	"time"
)

// getFeatureFlag checks if a feature flag is enabled via environment variable
func getFeatureFlag(flagName string) bool {
	value := os.Getenv(flagName)
	if value == "" {
		return false
	}
	boolValue, err := strconv.ParseBool(value)
	if err != nil {
		log.Printf("[ADAPTER] Invalid boolean value for %s: %s, defaulting to false", flagName, value)
		return false
	}
	return boolValue
}

// isDryRunMode checks if dry-run mode is enabled
func isDryRunMode() bool {
	value := os.Getenv("MARKETING_DRY_RUN")
	if value == "" {
		return true // Default to dry-run
	}
	boolValue, err := strconv.ParseBool(value)
	if err != nil {
		log.Printf("[ADAPTER] Invalid boolean value for MARKETING_DRY_RUN: %s, defaulting to true", value)
		return true
	}
	return boolValue
}

// logDryRunEvent logs the event that would be sent in dry-run mode
func logDryRunEvent(adapterName string, event AdapterEvent, mappedPayload map[string]interface{}) {
	payloadJSON, err := json.MarshalIndent(mappedPayload, "", "  ")
	if err != nil {
		payloadJSON = []byte("(failed to marshal payload)")
	}
	log.Printf("[ADAPTER] [%s] [DRY-RUN] Event would be sent:", adapterName)
	log.Printf("[ADAPTER] [%s]   Event ID: %s", adapterName, event.EventID)
	log.Printf("[ADAPTER] [%s]   Internal Event: %s", adapterName, event.EventKey)
	log.Printf("[ADAPTER] [%s]   External Event: %s", adapterName, event.ExternalEventName)
	log.Printf("[ADAPTER] [%s]   Integration: %s (%s)", adapterName, event.IntegrationID, event.IntegrationType)
	if event.EntityId != nil {
		log.Printf("[ADAPTER] [%s]   Entity: %s/%s", adapterName, event.EntityType, *event.EntityId)
	}
	log.Printf("[ADAPTER] [%s]   Mapped Payload:\n%s", adapterName, string(payloadJSON))
}

// FacebookAdapter implements the MarketingAdapter interface for Facebook Pixel/Conversions API
type FacebookAdapter struct {
	enabled      bool
	dryRun       bool
	pixelID      string
	accessToken  string
	httpClient   *HTTPClient
	liveConfig   *LiveConfig
	errorTracker *ErrorTracker
}

// NewFacebookAdapter creates a new Facebook adapter instance
func NewFacebookAdapter() *FacebookAdapter {
	InitLiveConfig()
	InitErrorTracker()
	
	return &FacebookAdapter{
		enabled:      getFeatureFlag("FB_ADS_ENABLED"),
		dryRun:       isIntegrationDryRun("FACEBOOK"), // Per-integration override
		pixelID:      os.Getenv("FB_PIXEL_ID"),
		accessToken:  os.Getenv("FB_ACCESS_TOKEN"),
		httpClient:   NewHTTPClient(),
		liveConfig:   GetLiveConfig(),
		errorTracker: GetErrorTracker(),
	}
}

// Name returns the adapter name
func (a *FacebookAdapter) Name() string {
	return "facebook"
}

// IsEnabled checks if Facebook adapter is enabled
func (a *FacebookAdapter) IsEnabled() bool {
	return a.enabled
}

// Send sends an event to Facebook (dry-run mode logs only, live mode makes HTTP call)
func (a *FacebookAdapter) Send(event AdapterEvent) AdapterResult {
	result := AdapterResult{
		Timestamp: time.Now(),
		DryRun:    a.dryRun,
	}

	// Check if enabled
	if !a.enabled {
		result.Status = AdapterStatusSKIPPED
		skipReason := "Facebook adapter disabled (FB_ADS_ENABLED=false)"
		result.Error = &skipReason
		log.Printf("[FACEBOOK ADAPTER] Event %s skipped: %s", event.EventID, skipReason)
		return result
	}

	// Check kill-switch
	if !a.liveConfig.IsLiveEnabled() {
		result.DryRun = true
		a.dryRun = true // Override to dry-run if kill-switch is off
	}

	// Check error tracker for auto-disable
	if a.errorTracker.ShouldDisable("FACEBOOK") {
		result.Status = AdapterStatusSKIPPED
		skipReason := "Facebook adapter auto-disabled due to error spike"
		result.Error = &skipReason
		log.Printf("[FACEBOOK ADAPTER] Event %s skipped: %s", event.EventID, skipReason)
		return result
	}

	// Check per-event allowlist (only if not in dry-run)
	if !a.dryRun && !a.liveConfig.IsEventAllowed(event.EventKey) {
		result.Status = AdapterStatusSKIPPED
		skipReason := fmt.Sprintf("Event %s not in live allowlist", event.EventKey)
		result.Error = &skipReason
		log.Printf("[FACEBOOK ADAPTER] Event %s skipped: %s", event.EventID, skipReason)
		return result
	}

	// Map payload according to Facebook Conversions API format
	mappedPayload := a.mapPayload(event)

	// Dry-run mode: log only, no HTTP call
	if a.dryRun {
		logDryRunEvent("FACEBOOK", event, mappedPayload)
		result.Status = AdapterStatusSENT
		log.Printf("[FACEBOOK ADAPTER] [DRY-RUN] Event %s simulated as SENT", event.EventID)
		return result
	}

	// Live mode: make actual HTTP call
	return a.sendLive(event, mappedPayload)
}

// sendLive makes the actual HTTP call to Facebook Conversions API
func (a *FacebookAdapter) sendLive(event AdapterEvent, payload map[string]interface{}) AdapterResult {
	result := AdapterResult{
		Timestamp: time.Now(),
		DryRun:    false,
	}

	// Validate credentials
	if a.pixelID == "" || a.accessToken == "" {
		result.Status = AdapterStatusFAILED
		errorMsg := "Facebook credentials not configured (FB_PIXEL_ID or FB_ACCESS_TOKEN missing)"
		result.Error = &errorMsg
		log.Printf("[FACEBOOK ADAPTER] Event %s failed: %s", event.EventID, errorMsg)
		return result
	}

	// Facebook Conversions API endpoint
	url := fmt.Sprintf("https://graph.facebook.com/v18.0/%s/events", a.pixelID)

	// Prepare request payload
	requestPayload := map[string]interface{}{
		"data": []map[string]interface{}{payload},
	}

	// Headers
	headers := map[string]string{
		"Authorization": "Bearer " + a.accessToken,
	}

	// Send HTTP request
	statusCode, responseBody, err := a.httpClient.Send(url, headers, requestPayload)

	if err != nil {
		// Record error for tracking
		a.errorTracker.RecordError("FACEBOOK")
		
		result.Status = AdapterStatusFAILED
		errorMsg := fmt.Sprintf("HTTP request failed: %v", err)
		result.Error = &errorMsg
		log.Printf("[FACEBOOK ADAPTER] Event %s failed: %s", event.EventID, errorMsg)
		return result
	}

	// Check status code
	if statusCode >= 200 && statusCode < 300 {
		result.Status = AdapterStatusSENT
		log.Printf("[FACEBOOK ADAPTER] Event %s sent successfully (status: %d)", event.EventID, statusCode)
	} else {
		// Record error for tracking
		a.errorTracker.RecordError("FACEBOOK")
		
		result.Status = AdapterStatusFAILED
		errorMsg := fmt.Sprintf("Facebook API returned status %d: %s", statusCode, string(responseBody))
		result.Error = &errorMsg
		log.Printf("[FACEBOOK ADAPTER] Event %s failed: %s", event.EventID, errorMsg)
	}

	return result
}

// mapPayload maps the sanitized payload to Facebook Conversions API format
func (a *FacebookAdapter) mapPayload(event AdapterEvent) map[string]interface{} {
	payload := make(map[string]interface{})

	// Base Facebook event structure
	payload["event_name"] = event.ExternalEventName
	payload["event_time"] = time.Now().Unix()
	payload["event_source_url"] = a.extractURL(event.Payload)
	
	// User data
	if event.UserId != nil {
		payload["user_data"] = map[string]interface{}{
			"external_id": *event.UserId,
		}
	}
	
	if event.SessionId != nil {
		// Use session ID as client user agent or browser ID if available
		if userData, ok := payload["user_data"].(map[string]interface{}); ok {
			userData["client_user_agent"] = *event.SessionId // Placeholder
		}
	}

	// Custom data based on event type
	customData := make(map[string]interface{})
	
	switch event.EventKey {
	case "view_product":
		if productID, ok := event.Payload["productId"].(string); ok {
			customData["content_ids"] = []string{productID}
			customData["content_type"] = "product"
		}
		if price, ok := event.Payload["price"].(float64); ok {
			customData["value"] = price
			customData["currency"] = "IDR"
		}
	case "add_to_cart":
		if productID, ok := event.Payload["productId"].(string); ok {
			customData["content_ids"] = []string{productID}
			customData["content_type"] = "product"
		}
		if price, ok := event.Payload["price"].(float64); ok {
			customData["value"] = price
			customData["currency"] = "IDR"
		}
		if quantity, ok := event.Payload["quantity"].(float64); ok {
			customData["num_items"] = int(quantity)
		}
	case "purchase":
		if orderID, ok := event.Payload["orderId"].(string); ok {
			customData["order_id"] = orderID
		}
		if total, ok := event.Payload["total"].(float64); ok {
			customData["value"] = total
			customData["currency"] = event.Payload["currency"]
			if customData["currency"] == nil {
				customData["currency"] = "IDR"
			}
		}
	}

	if len(customData) > 0 {
		payload["custom_data"] = customData
	}

	// Add entity information if available
	if event.EntityId != nil {
		if metadata, ok := payload["custom_data"].(map[string]interface{}); ok {
			metadata["entity_type"] = event.EntityType
			metadata["entity_id"] = *event.EntityId
		} else {
			payload["custom_data"] = map[string]interface{}{
				"entity_type": event.EntityType,
				"entity_id":   *event.EntityId,
			}
		}
	}

	return payload
}

// extractURL extracts URL from payload if available
func (a *FacebookAdapter) extractURL(payload map[string]interface{}) string {
	if url, ok := payload["url"].(string); ok {
		return url
	}
	// Default URL if not provided
	return "https://tokotanionline.com"
}

