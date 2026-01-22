package v2

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
)

// HandleAggregatedInsight handles GET /api/v2/insights/aggregated
// PHASE 7C: Read-only aggregated insight API
// Query params: scope (brand|locale|brand_locale|global), brandId, localeId
func HandleAggregatedInsight(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Parse query parameters
	scope := r.URL.Query().Get("scope")
	brandID := r.URL.Query().Get("brandId")
	localeID := r.URL.Query().Get("localeId")
	pageType := r.URL.Query().Get("pageType")

	log.Printf("[INSIGHT AGGREGATOR API] Request: scope=%s, brandId=%s, localeId=%s, pageType=%s", 
		scope, brandID, localeID, pageType)

	// Validate scope
	if scope == "" {
		scope = "global" // Default to global
	}

	// PHASE 7C GUARDRAIL: Validate scope and parameters
	if scope != "brand" && scope != "locale" && scope != "brand_locale" && scope != "global" {
		http.Error(w, fmt.Sprintf("Invalid scope: %s. Must be: brand, locale, brand_locale, or global", scope), http.StatusBadRequest)
		return
	}

	if scope == "brand" && brandID == "" {
		http.Error(w, "brandId is required for scope=brand", http.StatusBadRequest)
		return
	}

	if scope == "locale" && localeID == "" {
		http.Error(w, "localeId is required for scope=locale", http.StatusBadRequest)
		return
	}

	if scope == "brand_locale" && (brandID == "" || localeID == "") {
		http.Error(w, "brandId and localeId are required for scope=brand_locale", http.StatusBadRequest)
		return
	}

	// Create aggregator
	aggregator := NewInsightAggregator()

	var insight *AggregatedInsight
	var err error

	// Aggregate based on scope
	switch scope {
	case "brand":
		insight, err = aggregator.AggregateByBrand(brandID)
	case "locale":
		insight, err = aggregator.AggregateByLocale(localeID)
	case "brand_locale":
		insight, err = aggregator.AggregateByBrandAndLocale(brandID, localeID)
	case "global":
		insight, err = aggregator.AggregateGlobal()
	}

	if err != nil {
		log.Printf("[INSIGHT AGGREGATOR API] Aggregation failed: %v", err)
		http.Error(w, fmt.Sprintf("Failed to aggregate insight: %v", err), http.StatusInternalServerError)
		return
	}

	// PHASE 7C: Filter by pageType if specified
	if pageType != "" && insight != nil {
		// Note: This would require filtering metrics during collection
		// For now, just set pageType in response
		insight.PageType = pageType
	}

	// PHASE 7C GUARDRAIL: Ensure no raw content in response
	// Insight should only contain normalized metrics, no content
	response := map[string]interface{}{
		"scope":      scope,
		"brandId":    brandID,
		"localeId":   localeID,
		"pageType":   pageType,
		"insight":    insight,
		"readOnly":   true, // PHASE 7C: Explicit read-only flag
		"warning":    "This is a read-only insight. No content access, no edit, no publish.",
	}

	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("X-Read-Only", "true") // PHASE 7C: Header indicating read-only
	json.NewEncoder(w).Encode(response)
}

// HandleListBrands handles GET /api/v2/insights/brands
// PHASE 7C: List all brands for insight aggregation (read-only)
func HandleListBrands(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// PHASE 7C: This would typically query database for brands
	// For now, return empty list - implementation would fetch from database
	// via API call to Next.js backend
	
	response := map[string]interface{}{
		"brands":   []interface{}{},
		"readOnly": true,
		"message":  "Brand list - implement via database query",
	}

	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("X-Read-Only", "true")
	json.NewEncoder(w).Encode(response)
}

// HandleListLocales handles GET /api/v2/insights/locales
// PHASE 7C: List all locales for insight aggregation (read-only)
func HandleListLocales(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	brandID := r.URL.Query().Get("brandId")

	// PHASE 7C: This would typically query database for locales
	// For now, return empty list
	
	response := map[string]interface{}{
		"locales":  []interface{}{},
		"brandId":  brandID,
		"readOnly": true,
		"message":  "Locale list - implement via database query",
	}

	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("X-Read-Only", "true")
	json.NewEncoder(w).Encode(response)
}
