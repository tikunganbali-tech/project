package content

import (
	"strings"
)

// FASE D - D2 & D5: ERROR CLASSIFICATION
// Classify errors as INFRA (retryable) vs CONTENT (non-retryable)
// Used for rate guard retry logic and observability

// isInfrastructureError checks if error is infrastructure-related (retryable)
func isInfrastructureError(err error) bool {
	if err == nil {
		return false
	}

	errStr := strings.ToLower(err.Error())

	// API key errors
	if strings.Contains(errStr, "api key") ||
		strings.Contains(errStr, "authentication") ||
		strings.Contains(errStr, "unauthorized") ||
		strings.Contains(errStr, "401") ||
		strings.Contains(errStr, "403") {
		return true
	}

	// Timeout errors
	if strings.Contains(errStr, "timeout") ||
		strings.Contains(errStr, "deadline exceeded") ||
		strings.Contains(errStr, "context deadline") {
		return true
	}

	// Network errors
	if strings.Contains(errStr, "network") ||
		strings.Contains(errStr, "connection") ||
		strings.Contains(errStr, "dial") ||
		strings.Contains(errStr, "no such host") ||
		strings.Contains(errStr, "connection refused") ||
		strings.Contains(errStr, "connection reset") {
		return true
	}

	// Database errors
	if strings.Contains(errStr, "database") ||
		strings.Contains(errStr, "sql") ||
		strings.Contains(errStr, "connection pool") ||
		strings.Contains(errStr, "pq:") {
		return true
	}

	// API request/response errors (5xx)
	if strings.Contains(errStr, "500") ||
		strings.Contains(errStr, "502") ||
		strings.Contains(errStr, "503") ||
		strings.Contains(errStr, "504") {
		return true
	}

	// Image API errors (infra)
	if strings.Contains(errStr, "image generation failed") ||
		strings.Contains(errStr, "image api") {
		return true
	}

	// Default: assume content error (non-retryable)
	return false
}
