package marketing

import (
	"encoding/json"
	"fmt"
	"sync"
	"time"
)

// DispatchAuditLog represents an audit log entry for dispatch decisions
type DispatchAuditLog struct {
	EventID         string     `json:"eventId"`
	IntegrationType string     `json:"integrationType"`
	Decision        string     `json:"decision"` // "ALLOW" or "SKIP"
	Reason          *string    `json:"reason,omitempty"`
	CreatedAt       time.Time  `json:"createdAt"`
}

// AuditLogger handles append-only audit logging
type AuditLogger struct {
	mu      sync.RWMutex
	buffer  []DispatchAuditLog
	maxSize int
	// In the future, this can write to DB or file
	// For now: stdout JSON or in-memory buffer
}

var (
	globalAuditLogger *AuditLogger
	auditOnce         sync.Once
)

// InitAuditLogger initializes the global audit logger
func InitAuditLogger() {
	auditOnce.Do(func() {
		globalAuditLogger = &AuditLogger{
			buffer:  make([]DispatchAuditLog, 0, 1000),
			maxSize: 10000, // Keep last 10k entries in memory
		}
	})
}

// GetAuditLogger returns the global audit logger instance
func GetAuditLogger() *AuditLogger {
	if globalAuditLogger == nil {
		InitAuditLogger()
	}
	return globalAuditLogger
}

// LogDispatch logs a dispatch decision to the audit log
func (a *AuditLogger) LogDispatch(eventID string, integrationType string, decision DispatchDecision, reason *SkipReason) {
	a.mu.Lock()
	defer a.mu.Unlock()

	auditEntry := DispatchAuditLog{
		EventID:         eventID,
		IntegrationType: integrationType,
		Decision:        string(decision),
		CreatedAt:       time.Now(),
	}

	if reason != nil {
		reasonStr := string(*reason)
		auditEntry.Reason = &reasonStr
	}

	// Append to buffer
	a.buffer = append(a.buffer, auditEntry)

	// Trim buffer if exceeds max size
	if len(a.buffer) > a.maxSize {
		// Keep last maxSize entries
		a.buffer = a.buffer[len(a.buffer)-a.maxSize:]
	}

	// Log to stdout as JSON (append-only, no DB write)
	jsonData, err := json.Marshal(auditEntry)
	if err != nil {
		// Fallback to simple log if JSON marshal fails
		fmt.Printf("[DISPATCH AUDIT] eventId=%s integrationType=%s decision=%s reason=%v createdAt=%s\n",
			eventID, integrationType, decision, reason, auditEntry.CreatedAt.Format(time.RFC3339))
		return
	}

	fmt.Printf("[DISPATCH AUDIT] %s\n", string(jsonData))
}

// GetRecentLogs returns recent audit logs (for debugging/monitoring)
func (a *AuditLogger) GetRecentLogs(limit int) []DispatchAuditLog {
	a.mu.RLock()
	defer a.mu.RUnlock()

	if limit <= 0 {
		limit = 100
	}

	start := len(a.buffer) - limit
	if start < 0 {
		start = 0
	}

	// Return a copy to prevent external modification
	logs := make([]DispatchAuditLog, len(a.buffer[start:]))
	copy(logs, a.buffer[start:])
	return logs
}

// GetLogCount returns the current number of logs in buffer
func (a *AuditLogger) GetLogCount() int {
	a.mu.RLock()
	defer a.mu.RUnlock()
	return len(a.buffer)
}

