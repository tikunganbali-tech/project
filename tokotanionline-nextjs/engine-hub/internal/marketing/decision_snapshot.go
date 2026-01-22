package marketing

import (
	"fmt"
	"time"
)

// DecisionSnapshot represents a human-readable explanation of why an event was dispatched or skipped
// This is READ-ONLY and does not trigger any execution
type DecisionSnapshot struct {
	EventID      string    `json:"eventId"`
	EventKey     string    `json:"eventKey"`
	EntityType   string    `json:"entityType"`
	EntityID     *string   `json:"entityId,omitempty"`
	Integration  string    `json:"integration"` // FACEBOOK, GOOGLE, TIKTOK
	Decision     string    `json:"decision"`    // ALLOW or SKIP
	Reason       *string   `json:"reason,omitempty"`
	Rule         string    `json:"rule"`         // Human-readable rule name
	Explanation  string    `json:"explanation"` // Human-readable explanation
	Timestamp    time.Time `json:"timestamp"`
	Metadata     map[string]interface{} `json:"metadata,omitempty"`
}

// BuildDecisionSnapshot builds a decision snapshot from audit log and event data
// This is READ-ONLY and does not trigger any execution or state changes
func BuildDecisionSnapshot(
	auditLog DispatchAuditLog,
	eventKey string,
	entityType string,
	entityID *string,
) DecisionSnapshot {
	snapshot := DecisionSnapshot{
		EventID:     auditLog.EventID,
		EventKey:    eventKey,
		EntityType:  entityType,
		EntityID:    entityID,
		Integration: auditLog.IntegrationType,
		Decision:    auditLog.Decision,
		Reason:      auditLog.Reason,
		Timestamp:   auditLog.CreatedAt,
		Metadata:    make(map[string]interface{}),
	}

	// Build human-readable rule and explanation based on decision and reason
	if auditLog.Decision == string(DispatchAllow) {
		snapshot.Rule = "All checks passed"
		snapshot.Explanation = fmt.Sprintf("Event allowed to be sent to %s. All dispatch rules passed (dedup, rate limit, enable checks).", auditLog.IntegrationType)
	} else if auditLog.Reason != nil {
		// Build explanation based on skip reason
		switch *auditLog.Reason {
		case string(SkipDedup):
			snapshot.Rule = "Deduplication (60s window)"
			snapshot.Explanation = fmt.Sprintf("Event skipped because a similar event was already sent to %s within the last 60 seconds. This prevents duplicate events.", auditLog.IntegrationType)
			snapshot.Metadata["dedupWindow"] = "60 seconds"
		case string(SkipRateLimit):
			snapshot.Rule = "Rate limit (30 events/minute)"
			snapshot.Explanation = fmt.Sprintf("Event skipped because the rate limit for %s has been reached (30 events per minute). Please wait before sending more events.", auditLog.IntegrationType)
			snapshot.Metadata["rateLimit"] = "30 events/minute"
		case string(SkipIntegrationDisabled):
			snapshot.Rule = "Integration disabled"
			snapshot.Explanation = fmt.Sprintf("Event skipped because the %s integration is currently disabled. Enable the integration to allow events.", auditLog.IntegrationType)
			snapshot.Metadata["integrationStatus"] = "disabled"
		case string(SkipEventDisabled):
			snapshot.Rule = "Event mapping disabled"
			snapshot.Explanation = fmt.Sprintf("Event skipped because the event mapping for '%s' is disabled for %s integration. Enable the event mapping to allow this event.", eventKey, auditLog.IntegrationType)
			snapshot.Metadata["eventMappingStatus"] = "disabled"
		default:
			snapshot.Rule = "Unknown rule"
			snapshot.Explanation = fmt.Sprintf("Event skipped for %s. Reason: %s", auditLog.IntegrationType, *auditLog.Reason)
		}
	} else {
		snapshot.Rule = "Unknown"
		snapshot.Explanation = fmt.Sprintf("Event skipped for %s, but no specific reason was recorded.", auditLog.IntegrationType)
	}

	return snapshot
}

// GetDecisionSnapshots returns decision snapshots for recent audit logs
// This is READ-ONLY and does not trigger any execution
func GetDecisionSnapshots(limit int) ([]DecisionSnapshot, error) {
	auditLogger := GetAuditLogger()

	// Get recent audit logs (read-only)
	auditLogs := auditLogger.GetRecentLogs(limit)

	snapshots := make([]DecisionSnapshot, 0, len(auditLogs))

	// Build snapshots from audit logs
	// Note: We need to look up event details from MarketingEventLog (DB)
	// For now, we'll use what we have in audit log
	for _, log := range auditLogs {
		// Try to get event details from registry or use defaults
		// Since we don't have direct access to MarketingEventLog here,
		// we'll build a basic snapshot with available data
		snapshot := DecisionSnapshot{
			EventID:     log.EventID,
			EventKey:    "unknown", // Will be filled from DB query in API layer
			EntityType:  "unknown", // Will be filled from DB query in API layer
			Integration: log.IntegrationType,
			Decision:    log.Decision,
			Reason:      log.Reason,
			Timestamp:   log.CreatedAt,
			Metadata:    make(map[string]interface{}),
		}

		// Build explanation
		if log.Decision == string(DispatchAllow) {
			snapshot.Rule = "All checks passed"
			snapshot.Explanation = fmt.Sprintf("Event allowed to be sent to %s.", log.IntegrationType)
		} else if log.Reason != nil {
			switch *log.Reason {
			case string(SkipDedup):
				snapshot.Rule = "Deduplication (60s window)"
				snapshot.Explanation = fmt.Sprintf("Event skipped: similar event already sent to %s within 60 seconds.", log.IntegrationType)
			case string(SkipRateLimit):
				snapshot.Rule = "Rate limit (30 events/minute)"
				snapshot.Explanation = fmt.Sprintf("Event skipped: rate limit reached for %s (30 events/minute).", log.IntegrationType)
			case string(SkipIntegrationDisabled):
				snapshot.Rule = "Integration disabled"
				snapshot.Explanation = fmt.Sprintf("Event skipped: %s integration is disabled.", log.IntegrationType)
			case string(SkipEventDisabled):
				snapshot.Rule = "Event mapping disabled"
				snapshot.Explanation = fmt.Sprintf("Event skipped: event mapping disabled for %s.", log.IntegrationType)
			default:
				snapshot.Rule = "Unknown rule"
				snapshot.Explanation = fmt.Sprintf("Event skipped: %s", *log.Reason)
			}
		}

		snapshots = append(snapshots, snapshot)
	}

	return snapshots, nil
}

// GetDecisionSnapshotForEvent builds a decision snapshot for a specific event
// This is READ-ONLY and does not trigger any execution
func GetDecisionSnapshotForEvent(eventID string, integrationType string) (*DecisionSnapshot, error) {
	auditLogger := GetAuditLogger()
	
	// Get recent logs and find matching one
	logs := auditLogger.GetRecentLogs(10000) // Get all logs
	
	for _, log := range logs {
		if log.EventID == eventID && log.IntegrationType == integrationType {
			snapshot := BuildDecisionSnapshot(log, "unknown", "unknown", nil)
			return &snapshot, nil
		}
	}
	
	return nil, fmt.Errorf("decision snapshot not found for event %s and integration %s", eventID, integrationType)
}
