package api

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"strconv"
	"strings"

	_ "github.com/lib/pq" // PostgreSQL driver
	"engine-hub/internal/marketing/attribution"
)

// Attribution handles GET /api/marketing/attribution
// READ-ONLY endpoint untuk attribution resolution
func Attribution(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Get DB connection (assuming it's initialized globally or passed)
	// For now, we'll need to initialize it if not already done
	// This assumes DB is available via some global or injected dependency
	// In a real implementation, you'd inject DB via dependency injection

	// Parse query parameters
	queryParams := r.URL.Query()

	// Build AttributionQuery
	query := attribution.AttributionQuery{
		WindowDays: 7, // default
	}

	// Parse campaignIds (comma-separated)
	if campaignIdsStr := queryParams.Get("campaignId"); campaignIdsStr != "" {
		if strings.Contains(campaignIdsStr, ",") {
			query.CampaignIDs = strings.Split(campaignIdsStr, ",")
		} else {
			query.CampaignIDs = []string{campaignIdsStr}
		}
	}

	// Parse entityType
	if entityType := queryParams.Get("entityType"); entityType != "" {
		query.EntityType = entityType
	}

	// Parse entityId
	if entityId := queryParams.Get("entityId"); entityId != "" {
		query.EntityID = entityId
	}

	// Parse rule
	if ruleStr := queryParams.Get("rule"); ruleStr != "" {
		query.Rule = attribution.AttributionRule(ruleStr)
	} else {
		query.Rule = attribution.RuleLastClick // default
	}

	// Parse windowDays
	if windowDaysStr := queryParams.Get("windowDays"); windowDaysStr != "" {
		if windowDays, err := strconv.Atoi(windowDaysStr); err == nil && windowDays > 0 {
			query.WindowDays = windowDays
		}
	}

	// Get DB connection - we need to get it from somewhere
	// For now, we'll return an error if DB is not available
	// In production, you'd inject DB via dependency injection or use a global
	db := getDB()
	if db == nil {
		http.Error(w, "Database connection not available", http.StatusInternalServerError)
		return
	}

	// Initialize resolver if needed
	attribution.InitResolver(db)

	// Resolve attribution from DB
	results, err := attribution.ResolveAttributionFromDB(query)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to resolve attribution: %v", err), http.StatusInternalServerError)
		return
	}

	// Build evidence
	evidences := attribution.BuildEvidence(query, results)

	// Build response
	response := AttributionResponse{
		Query: AttributionQueryResponse{
			Rule:       string(query.Rule),
			WindowDays: query.WindowDays,
		},
		Results: make([]AttributionResultResponse, 0, len(evidences)),
	}

	for _, evidence := range evidences {
		result := AttributionResultResponse{
			CampaignID:  evidence.CampaignID,
			Score:       evidence.Score,
			Explanation: evidence.Explanation,
			Timeline:    make([]EvidenceEventResponse, 0, len(evidence.Timeline)),
		}

		for _, event := range evidence.Timeline {
			result.Timeline = append(result.Timeline, EvidenceEventResponse{
				EventKey:  event.EventKey,
				Timestamp: event.Timestamp.Format("2006-01-02T15:04:05Z07:00"),
				EntityID:  event.EntityID,
			})
		}

		response.Results = append(response.Results, result)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// AttributionResponse is the JSON response structure
type AttributionResponse struct {
	Query   AttributionQueryResponse    `json:"query"`
	Results []AttributionResultResponse `json:"results"`
}

type AttributionQueryResponse struct {
	Rule       string `json:"rule"`
	WindowDays int    `json:"windowDays"`
}

type AttributionResultResponse struct {
	CampaignID  string                  `json:"campaignId"`
	Score       float64                 `json:"score"`
	Explanation string                  `json:"explanation"`
	Timeline    []EvidenceEventResponse `json:"timeline"`
}

type EvidenceEventResponse struct {
	EventKey  string `json:"eventKey"`
	Timestamp string `json:"timestamp"`
	EntityID  string `json:"entityId"`
}

var attributionDB *sql.DB

// getDB retrieves database connection for attribution
func getDB() *sql.DB {
	if attributionDB != nil {
		return attributionDB
	}

	// Initialize DB connection if not already done
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		return nil
	}

	db, err := sql.Open("postgres", dbURL)
	if err != nil {
		return nil
	}

	// Test connection
	if err := db.Ping(); err != nil {
		return nil
	}

	// Set connection pool settings
	db.SetMaxOpenConns(25)
	db.SetMaxIdleConns(5)

	attributionDB = db
	return attributionDB
}

