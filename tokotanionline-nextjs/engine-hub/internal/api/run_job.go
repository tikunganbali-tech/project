package api

import (
	"encoding/json"
	"net/http"
	"strings"

	"engine-hub/internal/jobs"
)

// RunJobRequest is the old format (kept for backward compatibility)
type RunJobRequest struct {
	Engine string `json:"engine"`
	Name   string `json:"name"`
}

// HandleJobRun handles POST /api/jobs/{id}/run - Manual run only
// STEP 18B-1: Manual run endpoint with idempotency check
func HandleJobRun(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Extract job ID from path: /api/jobs/{id}/run
	path := r.URL.Path
	parts := strings.Split(strings.Trim(path, "/"), "/")
	
	var jobID string
	for i, part := range parts {
		if part == "jobs" && i+1 < len(parts) {
			jobID = parts[i+1]
			// Check if next part is "run" (optional)
			if i+2 < len(parts) && parts[i+2] == "run" {
				break
			}
			// If no "run", the ID is the next part
			break
		}
	}

	if jobID == "" {
		http.Error(w, "job ID required in path: /api/jobs/{id}/run", http.StatusBadRequest)
		return
	}

	// STEP 18B-1: Find job by ID
	job := jobs.FindByID(jobID)
	if job == nil {
		http.Error(w, "job not found", http.StatusNotFound)
		return
	}

	// STEP 18B-1: Idempotent check - job RUNNING cannot be called again
	if job.Status == jobs.JobRunning {
		http.Error(w, "job is already running", http.StatusConflict)
		return
	}

	// STEP 18B-1: Only READY jobs can be run manually
	if job.Status != jobs.JobReady {
		http.Error(w, "job is not ready to run", http.StatusBadRequest)
		return
	}

	// STEP 18B-1: Manual run - explicit call only, no auto-trigger
	go jobs.RunJobByID(jobID)
	
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"status":  "accepted",
		"jobId":   jobID,
		"message": "Job execution started",
	})
}

// RunEngineJob handles old format POST /engines/jobs/run (backward compatibility)
func RunEngineJob(w http.ResponseWriter, r *http.Request) {
	// Old format (body-based)
	var req RunJobRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid body", http.StatusBadRequest)
		return
	}

	if req.Engine == "" || req.Name == "" {
		http.Error(w, "engine and name required", http.StatusBadRequest)
		return
	}

	go jobs.Run(req.Engine, req.Name)
	w.WriteHeader(http.StatusAccepted)
}


