package api

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strings"

	v2 "engine-hub/internal/ai/v2"
)

// PHASE 8A.2: Ads Generation API Handler
// POST /api/ads/generate - Generate ads copy

// AdsGenerate handles POST /api/ads/generate
// PHASE 8A: Brand & Locale isolation - REQUIRED
func AdsGenerate(w http.ResponseWriter, r *http.Request) {
	defer func() {
		if r := recover(); r != nil {
			log.Printf("[ADS API] PANIC RECOVERED: %v", r)
			errorResponse := map[string]interface{}{
				"error":   "Internal server error (panic recovered)",
				"message": fmt.Sprintf("%v", r),
				"status":  "FAILED",
			}
			if w.Header().Get("Content-Type") == "" {
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusInternalServerError)
				json.NewEncoder(w).Encode(errorResponse)
			}
		}
	}()

	log.Println("[ADS API] Generate endpoint hit")

	// Only allow POST method
	if r.Method != http.MethodPost {
		log.Printf("[ADS API] Invalid method: %s", r.Method)
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Parse request body
	var req v2.AdsGenerationRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		log.Printf("[ADS API] Failed to parse request: %v", err)
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	log.Printf("[ADS API] Received request: campaignId=%s, objective=%s, platform=%s", 
		req.CampaignID, req.Objective, req.Platform)

	// PHASE 8A: Guardrail - brand context is REQUIRED
	if req.BrandContext == nil {
		errorResponse := map[string]interface{}{
			"error":   "PHASE 8A GUARDRAIL: Brand context is required",
			"message": "No ads generation without brand_id",
			"status":  "FAILED",
		}
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(errorResponse)
		return
	}

	// PHASE 8A: Guardrail - locale context is REQUIRED
	if req.LocaleContext == nil {
		errorResponse := map[string]interface{}{
			"error":   "PHASE 8A GUARDRAIL: Locale context is required",
			"message": "No ads generation without locale_id",
			"status":  "FAILED",
		}
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(errorResponse)
		return
	}

	// Create ads generator
	generator := v2.NewAdsGenerator()

	// Generate ads copy
	ctx := context.Background()
	result, err := generator.GenerateAdsCopy(ctx, req)
	if err != nil {
		log.Printf("[ADS API] Generation failed: %v", err)
		
		errorResponse := map[string]interface{}{
			"error":   "Ads generation failed",
			"message": err.Error(),
			"status":  "FAILED",
		}
		
		statusCode := http.StatusInternalServerError
		if strings.Contains(err.Error(), "GUARDRAIL") {
			statusCode = http.StatusBadRequest
		}
		
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(statusCode)
		json.NewEncoder(w).Encode(errorResponse)
		return
	}

	log.Printf("[ADS API] Ads copy generated successfully: version=%d", result.Version)

	// Return success response
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(result)
}
