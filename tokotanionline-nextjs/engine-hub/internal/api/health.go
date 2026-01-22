package api

import (
	"encoding/json"
	"net/http"
	"time"

	"engine-hub/internal/engine"
)

var (
	serverStartTime = time.Now()
)

type HealthResponse struct {
	Status    string            `json:"status"`
	Engine    string            `json:"engine"`
	Uptime    int64             `json:"uptime"`
	Timestamp string            `json:"timestamp"`
	Engines   map[string]string `json:"engines,omitempty"` // FASE 7.3: Engine state
}

// Health returns a minimal JSON response for strict health checks.
//
// LAUNCH MODE REQUIREMENT:
// - MUST return {"status":"ok"} when healthy
// - MUST return non-200 with {"status":"degraded"} when unhealthy
//
// NOTE:
// - Use /health/full for extended diagnostics payload.
func Health(w http.ResponseWriter, r *http.Request) {
	engineStatuses := engine.GetStatuses()
	overallStatus := "ok"
	for _, status := range engineStatuses {
		if status == engine.StatusError {
			overallStatus = "degraded"
			break
		}
	}

	w.Header().Set("Content-Type", "application/json")
	
	statusCode := http.StatusOK
	if overallStatus == "degraded" {
		statusCode = http.StatusServiceUnavailable
	}
	
	w.WriteHeader(statusCode)
	json.NewEncoder(w).Encode(map[string]string{
		"status": overallStatus,
	})
}

// HealthFull returns extended diagnostics payload (engine state, uptime, timestamp).
// This endpoint is intended for observability dashboards and internal checks.
func HealthFull(w http.ResponseWriter, r *http.Request) {
	uptime := int64(time.Since(serverStartTime).Seconds())

	// FASE 7.3: Get engine states
	engineStatuses := engine.GetStatuses()
	engineStates := make(map[string]string)
	for name, status := range engineStatuses {
		engineStates[name] = string(status)
	}

	// Determine overall status based on engine states
	overallStatus := "ok"
	for _, status := range engineStatuses {
		if status == engine.StatusError {
			overallStatus = "degraded"
			break
		}
	}

	response := HealthResponse{
		Status:    overallStatus,
		Engine:    "AGRICULTURAL_ENGINE",
		Uptime:    uptime,
		Timestamp: time.Now().UTC().Format(time.RFC3339),
		Engines:   engineStates,
	}

	w.Header().Set("Content-Type", "application/json")

	// Return 503 if degraded, 200 if ok
	statusCode := http.StatusOK
	if overallStatus == "degraded" {
		statusCode = http.StatusServiceUnavailable
	}

	w.WriteHeader(statusCode)
	json.NewEncoder(w).Encode(response)
}

