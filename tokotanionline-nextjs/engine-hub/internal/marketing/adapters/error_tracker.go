package adapters

import (
	"log"
	"sync"
	"time"
)

// ErrorTracker tracks errors for auto-disable on error spike
type ErrorTracker struct {
	mu             sync.RWMutex
	errors         map[string][]time.Time // Integration type -> error timestamps
	windowDuration time.Duration           // Time window to check for errors
	maxErrors      int                     // Max errors in window before auto-disable
}

var (
	globalErrorTracker *ErrorTracker
	trackerOnce        sync.Once
)

// InitErrorTracker initializes the global error tracker
func InitErrorTracker() {
	trackerOnce.Do(func() {
		globalErrorTracker = &ErrorTracker{
			errors:         make(map[string][]time.Time),
			windowDuration: 5 * time.Minute, // 5 minute window
			maxErrors:      10,               // Max 10 errors in 5 minutes
		}
		
		// Start cleanup goroutine
		go globalErrorTracker.cleanup()
	})
}

// GetErrorTracker returns the global error tracker
func GetErrorTracker() *ErrorTracker {
	if globalErrorTracker == nil {
		InitErrorTracker()
	}
	return globalErrorTracker
}

// RecordError records an error for an integration
func (t *ErrorTracker) RecordError(integrationType string) {
	t.mu.Lock()
	defer t.mu.Unlock()
	
	now := time.Now()
	t.errors[integrationType] = append(t.errors[integrationType], now)
	
	// Check if we should auto-disable
	if t.shouldAutoDisable(integrationType) {
		log.Printf("[ERROR TRACKER] ⚠️  AUTO-DISABLE: %s has exceeded error threshold (%d errors in %v)", 
			integrationType, len(t.errors[integrationType]), t.windowDuration)
		// Note: Actual auto-disable would be handled by adapter manager
		// This is just tracking/logging
	}
}

// ShouldDisable checks if an integration should be disabled due to error spike
func (t *ErrorTracker) ShouldDisable(integrationType string) bool {
	t.mu.RLock()
	defer t.mu.RUnlock()
	
	return t.shouldAutoDisable(integrationType)
}

// shouldAutoDisable checks if error count exceeds threshold (must be called with lock held)
func (t *ErrorTracker) shouldAutoDisable(integrationType string) bool {
	errors := t.errors[integrationType]
	if len(errors) == 0 {
		return false
	}
	
	now := time.Now()
	windowStart := now.Add(-t.windowDuration)
	
	// Count errors in window
	count := 0
	for _, errTime := range errors {
		if errTime.After(windowStart) {
			count++
		}
	}
	
	return count >= t.maxErrors
}

// cleanup periodically removes old error entries
func (t *ErrorTracker) cleanup() {
	ticker := time.NewTicker(1 * time.Minute)
	defer ticker.Stop()
	
	for range ticker.C {
		t.mu.Lock()
		now := time.Now()
		windowStart := now.Add(-t.windowDuration)
		
		for integrationType, errors := range t.errors {
			// Filter out old errors
			var recentErrors []time.Time
			for _, errTime := range errors {
				if errTime.After(windowStart) {
					recentErrors = append(recentErrors, errTime)
				}
			}
			
			if len(recentErrors) == 0 {
				delete(t.errors, integrationType)
			} else {
				t.errors[integrationType] = recentErrors
			}
		}
		t.mu.Unlock()
	}
}

