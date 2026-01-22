package api

import (
	"encoding/json"
	"net/http"

	"engine-hub/internal/engine"
)

type ControlRequest struct {
	Action string `json:"action"` // start | stop
}

func ControlEngine(w http.ResponseWriter, r *http.Request) {
	name := r.URL.Query().Get("name")
	if name == "" {
		http.Error(w, "engine name required", http.StatusBadRequest)
		return
	}

	var req ControlRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid body", http.StatusBadRequest)
		return
	}

	e, ok := engine.Get(name)
	if !ok {
		http.Error(w, "engine not found", http.StatusNotFound)
		return
	}

	switch req.Action {
	case "start":
		e.Start()
	case "stop":
		e.Stop()
	default:
		http.Error(w, "invalid action", http.StatusBadRequest)
		return
	}

	w.WriteHeader(http.StatusOK)
}


