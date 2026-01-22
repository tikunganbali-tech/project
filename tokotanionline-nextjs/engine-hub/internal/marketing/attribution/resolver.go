package attribution

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"time"
)

// AttributionQuery adalah query untuk resolusi attribution
type AttributionQuery struct {
	CampaignIDs []string
	EntityType  string
	EntityID    string
	Rule        AttributionRule
	WindowDays  int
}

// Resolver handles attribution resolution from database
type Resolver struct {
	db *sql.DB
}

var globalResolver *Resolver

// InitResolver initializes the global resolver with database connection
func InitResolver(db *sql.DB) {
	globalResolver = &Resolver{db: db}
}

// NewResolver creates a new attribution resolver
func NewResolver(db *sql.DB) *Resolver {
	return &Resolver{db: db}
}

// ResolveAttributionFromDB reads events from DB and resolves attribution
// READ-ONLY: Only queries database, no writes
// Uses global resolver if available, otherwise returns error
func ResolveAttributionFromDB(
	q AttributionQuery,
) ([]AttributionResult, error) {
	if globalResolver == nil {
		return nil, fmt.Errorf("resolver not initialized. Call InitResolver first")
	}
	return globalResolver.resolveAttributionFromDB(q)
}

// resolveAttributionFromDB is the internal implementation
func (r *Resolver) resolveAttributionFromDB(
	q AttributionQuery,
) ([]AttributionResult, error) {
	if r.db == nil {
		return nil, fmt.Errorf("database connection is not set")
	}

	// Calculate time window
	windowEnd := time.Now()
	windowStart := windowEnd.AddDate(0, 0, -q.WindowDays)

	// Build query for MarketingEventLog
	query := `
		SELECT id, "eventKey", "entityType", "entityId", payload, source, "sessionId", "userId", "createdAt"
		FROM "MarketingEventLog"
		WHERE "createdAt" >= $1 AND "createdAt" <= $2
	`

	args := []interface{}{windowStart, windowEnd}
	argIndex := 3

	// Filter by entity type if provided
	if q.EntityType != "" {
		query += fmt.Sprintf(" AND \"entityType\" = $%d", argIndex)
		args = append(args, q.EntityType)
		argIndex++
	}

	// Filter by entity ID if provided
	if q.EntityID != "" {
		query += fmt.Sprintf(" AND \"entityId\" = $%d", argIndex)
		args = append(args, q.EntityID)
		argIndex++
	}

	// Order by timestamp ASC to preserve chronological order
	query += ` ORDER BY "createdAt" ASC`

	// Execute query
	rows, err := r.db.Query(query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to query events: %w", err)
	}
	defer rows.Close()

	// Map events to touchpoints
	var touchpoints []Touchpoint
	for rows.Next() {
		var id, eventKey, entityType, source string
		var entityID, sessionID, userID sql.NullString
		var payloadJSON sql.NullString
		var createdAt time.Time

		err := rows.Scan(
			&id,
			&eventKey,
			&entityType,
			&entityID,
			&payloadJSON,
			&source,
			&sessionID,
			&userID,
			&createdAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan event row: %w", err)
		}

		// Extract campaign ID from payload
		campaignID := extractCampaignID(payloadJSON, source)

		// Filter by campaign IDs if provided
		if len(q.CampaignIDs) > 0 {
			found := false
			for _, cid := range q.CampaignIDs {
				if campaignID == cid {
					found = true
					break
				}
			}
			if !found {
				continue
			}
		}

		// Skip events without campaign ID (not relevant for attribution)
		if campaignID == "" {
			continue
		}

		// Create touchpoint
		touchpoint := Touchpoint{
			EventKey:   eventKey,
			CampaignID: campaignID,
			Timestamp:  createdAt,
		}

		touchpoints = append(touchpoints, touchpoint)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating events: %w", err)
	}

	// If no touchpoints found, return empty result
	if len(touchpoints) == 0 {
		return []AttributionResult{}, nil
	}

	// Build attribution input
	input := AttributionInput{
		Rule:        q.Rule,
		Touchpoints: touchpoints,
		WindowStart: windowStart,
		WindowEnd:   windowEnd,
	}

	// Resolve attribution using pure function
	results := ResolveAttribution(input)

	return results, nil
}

// extractCampaignID extracts campaign ID from event payload or source
// Campaign ID can come from:
// - payload.campaignId
// - payload.campaign_id
// - payload.utm_campaign (if it matches a campaign ID)
// - source field (if it contains campaign info)
func extractCampaignID(payloadJSON sql.NullString, source string) string {
	if !payloadJSON.Valid || payloadJSON.String == "" {
		return ""
	}

	var payload map[string]interface{}
	if err := json.Unmarshal([]byte(payloadJSON.String), &payload); err != nil {
		return ""
	}

	// Try campaignId
	if val, ok := payload["campaignId"].(string); ok && val != "" {
		return val
	}

	// Try campaign_id
	if val, ok := payload["campaign_id"].(string); ok && val != "" {
		return val
	}

	// Try utm_campaign (might be campaign ID)
	if val, ok := payload["utm_campaign"].(string); ok && val != "" {
		return val
	}

	// Try utmCampaign
	if val, ok := payload["utmCampaign"].(string); ok && val != "" {
		return val
	}

	// If source contains campaign info, try to extract
	// This is a fallback - in practice, campaign ID should be in payload
	if source != "" {
		// Could implement source parsing here if needed
	}

	return ""
}

