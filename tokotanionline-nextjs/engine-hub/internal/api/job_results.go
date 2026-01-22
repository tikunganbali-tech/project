package api

import (
	"encoding/json"
	"net/http"
	"strconv"

	"engine-hub/internal/jobs"
)

func EngineJobResults(w http.ResponseWriter, r *http.Request) {
	limit := 10
	if l := r.URL.Query().Get("limit"); l != "" {
		if parsed, err := strconv.Atoi(l); err == nil {
			limit = parsed
		}
	}

	results := jobs.GetResults(limit)
	json.NewEncoder(w).Encode(results)
}


