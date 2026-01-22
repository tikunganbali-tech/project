package qc

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
)

// HandleRecheck handles POST /qc/recheck
// PHASE B: Recheck validation status after SEO is complete
func HandleRecheck(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		Entity string `json:"entity"`
		ID     string `json:"id"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, fmt.Sprintf("Invalid request body: %v", err), http.StatusBadRequest)
		return
	}

	if req.Entity == "" || req.ID == "" {
		http.Error(w, "Missing required fields: entity and id", http.StatusBadRequest)
		return
	}

	log.Printf("[QC RECHECK] Rechecking validation status: entity=%s, id=%s", req.Entity, req.ID)

	// Get validation status from database
	db := getDB()
	if db == nil {
		log.Printf("[QC RECHECK] WARNING: Database not available")
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"status": "INVALID",
			"error":  "Database not available",
		})
		return
	}

	var status sql.NullString
	var contentOK, imageOK, seoOK sql.NullBool

	query := `
		SELECT status, content_ok, image_ok, seo_ok
		FROM content_validation
		WHERE entity = $1 AND entity_id = $2
	`

	err := db.QueryRow(query, req.Entity, req.ID).Scan(&status, &contentOK, &imageOK, &seoOK)
	if err != nil {
		if err == sql.ErrNoRows {
			// No validation record exists - return INVALID
			log.Printf("[QC RECHECK] No validation record found for entity=%s, id=%s", req.Entity, req.ID)
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(map[string]interface{}{
				"status": "INVALID",
			})
			return
		}
		log.Printf("[QC RECHECK] Error querying validation status: %v", err)
		http.Error(w, fmt.Sprintf("Failed to query validation status: %v", err), http.StatusInternalServerError)
		return
	}

	// Determine status
	resultStatus := "INVALID"
	if status.Valid && status.String == "READY" {
		resultStatus = "READY"
	} else if contentOK.Valid && imageOK.Valid && seoOK.Valid {
		if contentOK.Bool && imageOK.Bool && seoOK.Bool {
			resultStatus = "READY"
		}
	}

	log.Printf("[QC RECHECK] Validation status: entity=%s, id=%s, status=%s", req.Entity, req.ID, resultStatus)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"status": resultStatus,
	})
}
