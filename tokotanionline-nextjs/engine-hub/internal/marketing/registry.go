package marketing

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"sync"
	"time"
)

// Integration represents a marketing integration
type Integration struct {
	ID          string
	Type        string // FACEBOOK, GOOGLE, TIKTOK
	Name        string
	IsActive    bool
	Credentials map[string]interface{} // JSON stored as string
}

// EventMap represents an event mapping
type EventMap struct {
	ID                string
	IntegrationID     string
	EventKey          string // page_view, view_product, etc.
	ExternalEventName string // PageView, ViewContent, etc.
	Enabled           bool
}

// Registry holds marketing integration and event mapping configurations
type Registry struct {
	mu           sync.RWMutex
	db           *sql.DB
	integrations map[string]*Integration // Key: integration ID
	eventMaps    map[string][]*EventMap  // Key: integration ID, Value: event maps
	lastLoad     time.Time
	loadInterval time.Duration
}

var (
	globalRegistry *Registry
	once           sync.Once
)

// InitRegistry initializes the global marketing event registry
func InitRegistry(db *sql.DB) error {
	once.Do(func() {
		globalRegistry = &Registry{
			db:           db,
			integrations: make(map[string]*Integration),
			eventMaps:    make(map[string][]*EventMap),
			loadInterval: 5 * time.Minute, // Reload config every 5 minutes
		}
	})

	// Initial load
	if err := globalRegistry.loadConfig(); err != nil {
		return fmt.Errorf("failed to load initial config: %w", err)
	}

	// Start background reloader
	go globalRegistry.reloader()

	return nil
}

// GetRegistry returns the global registry instance
func GetRegistry() *Registry {
	if globalRegistry == nil {
		panic("marketing registry not initialized. Call InitRegistry first.")
	}
	return globalRegistry
}

// loadConfig loads marketing integrations and event maps from database
func (r *Registry) loadConfig() error {
	r.mu.Lock()
	defer r.mu.Unlock()

	// Load integrations
	integrationsQuery := `
		SELECT id, type, name, "isActive", credentials
		FROM "MarketingIntegration"
		ORDER BY type
	`

	rows, err := r.db.Query(integrationsQuery)
	if err != nil {
		return fmt.Errorf("failed to query integrations: %w", err)
	}
	defer rows.Close()

	newIntegrations := make(map[string]*Integration)
	for rows.Next() {
		var integration Integration
		var credentialsJSON sql.NullString

		if err := rows.Scan(
			&integration.ID,
			&integration.Type,
			&integration.Name,
			&integration.IsActive,
			&credentialsJSON,
		); err != nil {
			return fmt.Errorf("failed to scan integration: %w", err)
		}

		// Parse credentials JSON
		if credentialsJSON.Valid && credentialsJSON.String != "" {
			if err := json.Unmarshal([]byte(credentialsJSON.String), &integration.Credentials); err != nil {
				// Log but don't fail - credentials not used yet
				integration.Credentials = make(map[string]interface{})
			}
		} else {
			integration.Credentials = make(map[string]interface{})
		}

		newIntegrations[integration.ID] = &integration
	}

	// Load event maps
	eventMapsQuery := `
		SELECT id, "integrationId", "eventKey", "externalEventName", enabled
		FROM "MarketingEventMap"
		ORDER BY "integrationId", "eventKey"
	`

	eventRows, err := r.db.Query(eventMapsQuery)
	if err != nil {
		return fmt.Errorf("failed to query event maps: %w", err)
	}
	defer eventRows.Close()

	newEventMaps := make(map[string][]*EventMap)
	for eventRows.Next() {
		var eventMap EventMap

		if err := eventRows.Scan(
			&eventMap.ID,
			&eventMap.IntegrationID,
			&eventMap.EventKey,
			&eventMap.ExternalEventName,
			&eventMap.Enabled,
		); err != nil {
			return fmt.Errorf("failed to scan event map: %w", err)
		}

		newEventMaps[eventMap.IntegrationID] = append(newEventMaps[eventMap.IntegrationID], &eventMap)
	}

	// Update registry
	r.integrations = newIntegrations
	r.eventMaps = newEventMaps
	r.lastLoad = time.Now()

	return nil
}

// reloader runs in background to periodically reload config
func (r *Registry) reloader() {
	ticker := time.NewTicker(r.loadInterval)
	defer ticker.Stop()

	for range ticker.C {
		if err := r.loadConfig(); err != nil {
			// Log error but continue - use cached config
			fmt.Printf("[MARKETING REGISTRY] Failed to reload config: %v\n", err)
		}
	}
}

// GetActiveIntegrations returns all active integrations
func (r *Registry) GetActiveIntegrations() []*Integration {
	r.mu.RLock()
	defer r.mu.RUnlock()

	var active []*Integration
	for _, integration := range r.integrations {
		if integration.IsActive {
			active = append(active, integration)
		}
	}

	return active
}

// GetIntegration returns an integration by ID
func (r *Registry) GetIntegration(id string) (*Integration, bool) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	integration, ok := r.integrations[id]
	return integration, ok
}

// GetIntegrationsByType returns integrations filtered by type
func (r *Registry) GetIntegrationsByType(integrationType string) []*Integration {
	r.mu.RLock()
	defer r.mu.RUnlock()

	var filtered []*Integration
	for _, integration := range r.integrations {
		if integration.Type == integrationType {
			filtered = append(filtered, integration)
		}
	}

	return filtered
}

// GetEventMaps returns event maps for an integration
func (r *Registry) GetEventMaps(integrationID string) []*EventMap {
	r.mu.RLock()
	defer r.mu.RUnlock()

	return r.eventMaps[integrationID]
}

// GetEventMap returns a specific event map by integration ID and event key
func (r *Registry) GetEventMap(integrationID, eventKey string) (*EventMap, bool) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	eventMaps, ok := r.eventMaps[integrationID]
	if !ok {
		return nil, false
	}

	for _, eventMap := range eventMaps {
		if eventMap.EventKey == eventKey {
			return eventMap, true
		}
	}

	return nil, false
}

// IsEventEnabled checks if an event is enabled for an integration
func (r *Registry) IsEventEnabled(integrationID, eventKey string) bool {
	eventMap, ok := r.GetEventMap(integrationID, eventKey)
	if !ok {
		return false
	}

	return eventMap.Enabled
}

// GetEnabledEventsForIntegration returns all enabled events for an integration
func (r *Registry) GetEnabledEventsForIntegration(integrationID string) []*EventMap {
	r.mu.RLock()
	defer r.mu.RUnlock()

	eventMaps, ok := r.eventMaps[integrationID]
	if !ok {
		return nil
	}

	var enabled []*EventMap
	for _, eventMap := range eventMaps {
		if eventMap.Enabled {
			enabled = append(enabled, eventMap)
		}
	}

	return enabled
}

// Refresh forces a reload of the config from database
func (r *Registry) Refresh() error {
	return r.loadConfig()
}

// GetLastLoadTime returns when the config was last loaded
func (r *Registry) GetLastLoadTime() time.Time {
	r.mu.RLock()
	defer r.mu.RUnlock()

	return r.lastLoad
}

