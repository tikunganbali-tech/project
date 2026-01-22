package api

import (
	"encoding/json"
	"net/http"

	"engine-hub/internal/engine"
)

func Engines(w http.ResponseWriter, r *http.Request) {
	statuses := engine.GetStatuses()
	
	// Convert EngineStatus to string for JSON
	result := make(map[string]string)
	for name, status := range statuses {
		result[name] = string(status)
	}
	
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(result)
}


