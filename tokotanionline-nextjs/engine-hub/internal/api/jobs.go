package api

import (
	"encoding/json"
	"net/http"

	"engine-hub/internal/jobs"
)

// EngineJobs handles GET /api/jobs - List all jobs (read-only)
// STEP 18B-1: Jobs endpoint for viewing jobs
func EngineJobs(w http.ResponseWriter, _ *http.Request) {
	jobList := jobs.List(100) // Get more jobs for UI
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(jobList)
}


