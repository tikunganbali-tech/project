package v2

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"strings"
)

// HandleQCDecision handles POST /api/v2/qc/decision
// PHASE 4: Save admin decision (audit trail)
func HandleQCDecision(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		PageID       string        `json:"pageId"`
		Version      int           `json:"version"`
		AdminDecision AdminDecision `json:"adminDecision"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, fmt.Sprintf("Invalid request body: %v", err), http.StatusBadRequest)
		return
	}

	log.Printf("[QC API] Saving admin decision: pageId=%s, version=%d, decision=%s", req.PageID, req.Version, req.AdminDecision.Decision)

	// Get existing QC artefact
	qcStore := NewQCStore()
	artefact, err := qcStore.GetQCArtefact(req.PageID, req.Version)
	if err != nil {
		// Create new artefact if not exists
		artefact = &QCArtefact{
			PageID:   req.PageID,
			Version:  req.Version,
			QCStatus: QCStatusPerluRevisi, // Default
			Timestamp: req.AdminDecision.Timestamp,
		}
	}

	// Update with admin decision
	artefact.AdminDecision = &req.AdminDecision
	artefact.Timestamp = req.AdminDecision.Timestamp

	// Save updated artefact
	if err := qcStore.SaveQCArtefact(*artefact); err != nil {
		log.Printf("[QC API] Failed to save QC artefact: %v", err)
		http.Error(w, fmt.Sprintf("Failed to save decision: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"message": "Admin decision saved",
	})
}

// HandleGetQCStatus handles GET /api/v2/qc/:pageId/:version
// Get QC status and report
func HandleGetQCStatus(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Extract pageId and version from path
	path := r.URL.Path
	// Remove /api/v2/qc/ prefix
	path = strings.TrimPrefix(path, "/api/v2/qc/")
	parts := strings.Split(path, "/")

	if len(parts) < 2 {
		http.Error(w, "Invalid path format: /api/v2/qc/:pageId/:version", http.StatusBadRequest)
		return
	}

	pageID := parts[0]
	versionStr := parts[1]

	version, err := strconv.Atoi(versionStr)
	if err != nil {
		http.Error(w, fmt.Sprintf("Invalid version: %s", versionStr), http.StatusBadRequest)
		return
	}

	log.Printf("[QC API] Get QC status: pageId=%s, version=%d", pageID, version)

	// Get QC artefact
	qcStore := NewQCStore()
	artefact, err := qcStore.GetQCArtefact(pageID, version)
	if err != nil {
		http.Error(w, fmt.Sprintf("QC artefact not found: %v", err), http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(artefact)
}
