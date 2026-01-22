package marketing

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"sync"
	"time"

	"engine-hub/internal/marketing/adapters"
)

// EventLogEntry represents a row from MarketingEventLog table
type EventLogEntry struct {
	ID         string
	EventKey   string
	EntityType string
	EntityId   *string
	Payload    map[string]interface{}
	Source     string
	SessionId  *string
	UserId     *string
	CreatedAt  time.Time
}

// Dispatcher handles the dispatch loop for marketing events
type Dispatcher struct {
	db           *sql.DB
	registry     *Registry
	rulesEngine  *RulesEngine
	auditLogger  *AuditLogger
	mu           sync.RWMutex
	isRunning    bool
	stopChan     chan struct{}
	pollInterval time.Duration
	batchSize    int
	lastPollTime time.Time
}

var (
	globalDispatcher *Dispatcher
	dispatcherOnce   sync.Once
)

// InitDispatcher initializes the global dispatcher
func InitDispatcher(db *sql.DB) error {
	dispatcherOnce.Do(func() {
		// Initialize dependencies
		if err := InitRegistry(db); err != nil {
			log.Printf("[DISPATCHER] WARNING: Failed to initialize registry: %v", err)
		}

		InitRulesEngine()
		InitAuditLogger()
		InitAdapterManager() // Initialize adapter manager

		globalDispatcher = &Dispatcher{
			db:           db,
			registry:     GetRegistry(),
			rulesEngine:  GetRulesEngine(),
			auditLogger:  GetAuditLogger(),
			stopChan:     make(chan struct{}),
			pollInterval: 5 * time.Second, // Poll every 5 seconds
			batchSize:    50,               // Process 50 events per batch
			lastPollTime: time.Now(),
		}
	})

	return nil
}

// GetDispatcher returns the global dispatcher instance
func GetDispatcher() *Dispatcher {
	if globalDispatcher == nil {
		panic("dispatcher not initialized. Call InitDispatcher first.")
	}
	return globalDispatcher
}

// Start starts the dispatcher loop
func (d *Dispatcher) Start() error {
	d.mu.Lock()
	defer d.mu.Unlock()

	if d.isRunning {
		return fmt.Errorf("dispatcher is already running")
	}

	if d.db == nil {
		return fmt.Errorf("database connection is not set")
	}

	d.isRunning = true
	d.stopChan = make(chan struct{})

	// Start the dispatch loop in a goroutine
	go d.dispatchLoop()

	log.Println("[DISPATCHER] Started dispatch loop")
	return nil
}

// Stop stops the dispatcher loop
func (d *Dispatcher) Stop() {
	d.mu.Lock()
	defer d.mu.Unlock()

	if !d.isRunning {
		return
	}

	close(d.stopChan)
	d.isRunning = false
	log.Println("[DISPATCHER] Stopped dispatch loop")
}

// IsRunning returns whether the dispatcher is currently running
func (d *Dispatcher) IsRunning() bool {
	d.mu.RLock()
	defer d.mu.RUnlock()
	return d.isRunning
}

// dispatchLoop is the main loop that polls and processes events
func (d *Dispatcher) dispatchLoop() {
	ticker := time.NewTicker(d.pollInterval)
	defer ticker.Stop()

	// Process immediately on start
	d.processBatch()

	for {
		select {
		case <-d.stopChan:
			return
		case <-ticker.C:
			d.processBatch()
		}
	}
}

// processBatch polls and processes a batch of events
func (d *Dispatcher) processBatch() {
	events, err := d.pollEvents()
	if err != nil {
		log.Printf("[DISPATCHER] Error polling events: %v", err)
		return
	}

	if len(events) == 0 {
		// No events to process
		return
	}

	log.Printf("[DISPATCHER] Processing batch of %d events", len(events))

	// Get active integrations from registry
	activeIntegrations := d.registry.GetActiveIntegrations()

	if len(activeIntegrations) == 0 {
		log.Printf("[DISPATCHER] No active integrations found, skipping dispatch")
		return
	}

	// Process each event for each active integration
	for _, event := range events {
		eventPayload := EventPayload{
			EventKey:   event.EventKey,
			EntityType: event.EntityType,
			EntityId:   event.EntityId,
			Payload:    event.Payload,
			Source:     event.Source,
			SessionId:  event.SessionId,
			UserId:     event.UserId,
		}

		for _, integration := range activeIntegrations {
			d.processEventForIntegration(event, eventPayload, integration)
		}
	}

	d.mu.Lock()
	d.lastPollTime = time.Now()
	d.mu.Unlock()
}

// pollEvents polls new events from MarketingEventLog
// Ordered by createdAt ASC, limited by batchSize
func (d *Dispatcher) pollEvents() ([]EventLogEntry, error) {
	query := `
		SELECT id, "eventKey", "entityType", "entityId", payload, source, "sessionId", "userId", "createdAt"
		FROM "MarketingEventLog"
		WHERE "createdAt" > $1
		ORDER BY "createdAt" ASC
		LIMIT $2
	`

	d.mu.RLock()
	lastPoll := d.lastPollTime
	d.mu.RUnlock()

	// Query events created after last poll time
	rows, err := d.db.Query(query, lastPoll, d.batchSize)
	if err != nil {
		return nil, fmt.Errorf("failed to query events: %w", err)
	}
	defer rows.Close()

	var events []EventLogEntry
	for rows.Next() {
		var event EventLogEntry
		var payloadJSON sql.NullString
		var entityID, sessionID, userID sql.NullString

		err := rows.Scan(
			&event.ID,
			&event.EventKey,
			&event.EntityType,
			&entityID,
			&payloadJSON,
			&event.Source,
			&sessionID,
			&userID,
			&event.CreatedAt,
		)
		if err != nil {
			log.Printf("[DISPATCHER] Error scanning event row: %v", err)
			continue
		}

		// Handle nullable fields
		if entityID.Valid {
			event.EntityId = &entityID.String
		}
		if sessionID.Valid {
			event.SessionId = &sessionID.String
		}
		if userID.Valid {
			event.UserId = &userID.String
		}

		// Parse payload JSON
		if payloadJSON.Valid && payloadJSON.String != "" {
			if err := json.Unmarshal([]byte(payloadJSON.String), &event.Payload); err != nil {
				log.Printf("[DISPATCHER] Error unmarshaling payload for event %s: %v", event.ID, err)
				event.Payload = make(map[string]interface{})
			}
		} else {
			event.Payload = make(map[string]interface{})
		}

		events = append(events, event)
	}

	return events, nil
}

// processEventForIntegration processes a single event for a single integration
func (d *Dispatcher) processEventForIntegration(
	event EventLogEntry,
	eventPayload EventPayload,
	integration *Integration,
) {
	// Build integration config
	integrationConfig := IntegrationConfig{
		ID:   integration.ID,
		Type: integration.Type,
	}

	// Evaluate dispatch rules
	result := EvaluateDispatch(eventPayload, integrationConfig, d.registry)

	// Log to audit
	reason := result.Reason
	d.auditLogger.LogDispatch(event.ID, integration.Type, result.Decision, reason)

	// Handle decision
	if result.Decision == DispatchAllow {
		// Get adapter and send event
		d.callAdapter(event, integration, eventPayload, result.Payload)
	} else {
		// SKIP - reason already logged in audit
		log.Printf("[DISPATCHER] Event %s skipped for integration %s: %v",
			event.ID, integration.Type, reason)
	}
}

// callAdapter calls the appropriate adapter for the integration
func (d *Dispatcher) callAdapter(
	event EventLogEntry,
	integration *Integration,
	eventPayload EventPayload,
	sanitizedPayload map[string]interface{},
) {
	// Get adapter for this integration type
	adapter, exists := GetAdapter(integration.Type)
	if !exists {
		log.Printf("[DISPATCHER] No adapter found for integration type: %s", integration.Type)
		return
	}

	// Check if adapter is enabled (feature flag)
	if !adapter.IsEnabled() {
		log.Printf("[DISPATCHER] Adapter %s is disabled (feature flag), skipping event %s",
			integration.Type, event.ID)
		return
	}

	// Get external event name from event map
	eventMap, found := d.registry.GetEventMap(integration.ID, event.EventKey)
	if !found {
		log.Printf("[DISPATCHER] No event map found for integration %s, event key %s",
			integration.ID, event.EventKey)
		return
	}

	// Build adapter event
	adapterEvent := adapters.AdapterEvent{
		EventID:           event.ID,
		EventKey:          event.EventKey,
		ExternalEventName: eventMap.ExternalEventName,
		EntityType:        event.EntityType,
		EntityId:          event.EntityId,
		Payload:           sanitizedPayload,
		SessionId:         event.SessionId,
		UserId:            event.UserId,
		IntegrationID:     integration.ID,
		IntegrationType:   integration.Type,
	}

	// Send event to adapter (non-blocking, error handling in adapter)
	// Use goroutine to avoid blocking dispatcher
	go func() {
		adapterResult := adapter.Send(adapterEvent)
		
		// Log result
		if adapterResult.Status == adapters.AdapterStatusFAILED {
			errorMsg := "unknown error"
			if adapterResult.Error != nil {
				errorMsg = *adapterResult.Error
			}
			log.Printf("[DISPATCHER] Adapter %s failed for event %s: %s",
				integration.Type, event.ID, errorMsg)
		} else if adapterResult.Status == adapters.AdapterStatusSKIPPED {
			skipReason := "unknown reason"
			if adapterResult.Error != nil {
				skipReason = *adapterResult.Error
			}
			log.Printf("[DISPATCHER] Adapter %s skipped event %s: %s",
				integration.Type, event.ID, skipReason)
		} else {
			mode := "LIVE"
			if adapterResult.DryRun {
				mode = "DRY-RUN"
			}
			log.Printf("[DISPATCHER] Adapter %s sent event %s successfully (%s mode)",
				integration.Type, event.ID, mode)
		}
	}()
}

// GetStats returns dispatcher statistics
func (d *Dispatcher) GetStats() map[string]interface{} {
	d.mu.RLock()
	defer d.mu.RUnlock()

	return map[string]interface{}{
		"isRunning":    d.isRunning,
		"lastPollTime": d.lastPollTime,
		"pollInterval": d.pollInterval.String(),
		"batchSize":    d.batchSize,
		"auditLogCount": d.auditLogger.GetLogCount(),
	}
}

