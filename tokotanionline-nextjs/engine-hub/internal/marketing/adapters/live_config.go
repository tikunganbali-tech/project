package adapters

import (
	"log"
	"os"
	"strconv"
	"strings"
)

// LiveConfig manages live mode configuration (kill-switch, per-event allowlist)
type LiveConfig struct {
	globalLiveEnabled bool
	eventAllowlist    map[string]bool // Event keys allowed for live mode
}

var (
	globalLiveConfig *LiveConfig
)

// InitLiveConfig initializes the global live configuration
func InitLiveConfig() {
	globalLiveConfig = &LiveConfig{
		globalLiveEnabled: getEnvBool("MARKETING_LIVE_ENABLED", false),
		eventAllowlist:    parseEventAllowlist(os.Getenv("MARKETING_LIVE_EVENTS")),
	}
	
	log.Printf("[LIVE CONFIG] Global live enabled: %v", globalLiveConfig.globalLiveEnabled)
	log.Printf("[LIVE CONFIG] Event allowlist: %v", globalLiveConfig.eventAllowlist)
}

// GetLiveConfig returns the global live config
func GetLiveConfig() *LiveConfig {
	if globalLiveConfig == nil {
		InitLiveConfig()
	}
	return globalLiveConfig
}

// IsLiveEnabled checks if live mode is globally enabled
func (c *LiveConfig) IsLiveEnabled() bool {
	return c.globalLiveEnabled
}

// IsEventAllowed checks if a specific event is allowed for live mode
func (c *LiveConfig) IsEventAllowed(eventKey string) bool {
	// If no allowlist configured, allow all (when live is enabled)
	if len(c.eventAllowlist) == 0 {
		return true
	}
	return c.eventAllowlist[eventKey]
}

// parseEventAllowlist parses comma-separated event keys from ENV
// Example: MARKETING_LIVE_EVENTS="purchase,add_to_cart"
func parseEventAllowlist(envValue string) map[string]bool {
	allowlist := make(map[string]bool)
	if envValue == "" {
		return allowlist // Empty = allow all
	}
	
	events := strings.Split(envValue, ",")
	for _, event := range events {
		event = strings.TrimSpace(event)
		if event != "" {
			allowlist[event] = true
		}
	}
	
	return allowlist
}

// getEnvBool gets a boolean environment variable with default value
func getEnvBool(key string, defaultValue bool) bool {
	value := os.Getenv(key)
	if value == "" {
		return defaultValue
	}
	boolValue, err := strconv.ParseBool(value)
	if err != nil {
		log.Printf("[LIVE CONFIG] Invalid boolean value for %s: %s, defaulting to %v", key, value, defaultValue)
		return defaultValue
	}
	return boolValue
}

// isIntegrationDryRun checks if a specific integration should be in dry-run mode
// Per-integration override: FB_DRY_RUN, GA_DRY_RUN, TIKTOK_DRY_RUN
// If not set, falls back to global MARKETING_DRY_RUN
func isIntegrationDryRun(integrationType string) bool {
	var envKey string
	switch integrationType {
	case "FACEBOOK":
		envKey = "FB_DRY_RUN"
	case "GOOGLE":
		envKey = "GA_DRY_RUN"
	case "TIKTOK":
		envKey = "TIKTOK_DRY_RUN"
	default:
		// Fall back to global
		return isGlobalDryRun()
	}
	
	// Check per-integration override
	value := os.Getenv(envKey)
	if value != "" {
		boolValue, err := strconv.ParseBool(value)
		if err != nil {
			log.Printf("[LIVE CONFIG] Invalid boolean value for %s: %s, using global", envKey, value)
			return isGlobalDryRun()
		}
		// Invert: DRY_RUN=true means dry-run mode
		return boolValue
	}
	
	// Fall back to global
	return isGlobalDryRun()
}

// isGlobalDryRun checks the global MARKETING_DRY_RUN setting
func isGlobalDryRun() bool {
	return getEnvBool("MARKETING_DRY_RUN", true) // Default to dry-run (safe)
}

