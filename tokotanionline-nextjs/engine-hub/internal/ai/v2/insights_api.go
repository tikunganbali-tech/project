package v2

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"strings"
)

// HandleGetInsight handles GET /api/v2/insights/:pageId/:version
// PHASE 5: Dashboard Insight (Read-Only)
func HandleGetInsight(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Extract pageId and version from path
	path := r.URL.Path
	// Remove /api/v2/insights/ prefix
	path = strings.TrimPrefix(path, "/api/v2/insights/")
	parts := strings.Split(path, "/")

	if len(parts) < 1 {
		http.Error(w, "Invalid path format: /api/v2/insights/:pageId/:version", http.StatusBadRequest)
		return
	}

	pageID := parts[0]
	version := 0

	if len(parts) >= 2 {
		var err error
		version, err = strconv.Atoi(parts[1])
		if err != nil {
			http.Error(w, fmt.Sprintf("Invalid version: %s", parts[1]), http.StatusBadRequest)
			return
		}
	}

	log.Printf("[INSIGHTS API] Get insight: pageId=%s, version=%d", pageID, version)

	insightEngine := NewInsightEngine()
	
	// If version specified, get insight for that version
	// Otherwise, get insight for latest version
	if version == 0 {
		storage := NewStorage()
		latest, err := storage.GetLatest(pageID)
		if err != nil {
			http.Error(w, fmt.Sprintf("Failed to get latest version: %v", err), http.StatusNotFound)
			return
		}
		version = latest.Version
	}

	// Generate insight
	insight, err := insightEngine.GenerateInsight(pageID, version)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to generate insight: %v", err), http.StatusInternalServerError)
		return
	}

	// Get additional data for dashboard
	storage := NewStorage()
	allVersions, _ := storage.GetAllVersions(pageID)
	
	serpCollector := NewSERPCollector()
	serpHistory, _ := serpCollector.GetHistory(pageID, version)
	
	userSignalAgg := NewUserSignalAggregator()
	userSignals, _ := userSignalAgg.GetAggregated(pageID, version)
	
	qcStore := NewQCStore()
	qcArtefact, _ := qcStore.GetQCArtefact(pageID, version)

	// Build dashboard response
	dashboardData := map[string]interface{}{
		"pageId":      pageID,
		"version":     version,
		"insight":     insight,
		"allVersions": allVersions,
		"serpHistory": serpHistory,
		"userSignals": userSignals,
		"qcArtefact":  qcArtefact,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(dashboardData)
}
