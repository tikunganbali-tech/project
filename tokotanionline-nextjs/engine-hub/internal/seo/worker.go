package seo

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"engine-hub/internal/content"
	qc "engine-hub/internal/qc"
	"github.com/lib/pq"
)

// GenerateSecondaryKeywords generates secondary keywords from keyword tool
// Keyword HARUS dari keyword tool, BUKAN dari isi artikel
func GenerateSecondaryKeywords(blogID string) error {
	return GenerateSecondaryKeywordsFromTool(blogID)
}

// GenerateSecondaryKeywordsFromTool generates secondary keywords from keyword tool
// PHASE B: Keyword HARUS dari keyword tool, BUKAN dari isi artikel
func GenerateSecondaryKeywordsFromTool(blogID string) error {
	log.Printf("[SEO WORKER] Generating secondary keywords for blog ID: %s", blogID)

	db := getDB()
	if db == nil {
		log.Printf("[SEO WORKER] WARNING: Database not available, skipping secondary keyword generation")
		return nil
	}

	var primaryKeyword sql.NullString
	err := db.QueryRow(`
		SELECT "primaryKeyword" 
		FROM "BlogPost" 
		WHERE id = $1
	`, blogID).Scan(&primaryKeyword)
	
	if err != nil {
		log.Printf("[SEO WORKER] Error fetching primary keyword: %v", err)
		return err
	}

	if !primaryKeyword.Valid || primaryKeyword.String == "" {
		log.Printf("[SEO WORKER] No primary keyword found for blog ID: %s", blogID)
		return nil
	}

	// Call keyword tool API to generate secondary keywords
	secondaryKeywords, err := callKeywordToolAPI(primaryKeyword.String)
	if err != nil {
		log.Printf("[SEO WORKER] Error calling keyword tool: %v", err)
		// Continue anyway - non-blocking
		return nil
	}

	if len(secondaryKeywords) == 0 {
		log.Printf("[SEO WORKER] No secondary keywords generated for primary keyword: %s", primaryKeyword.String)
		return nil
	}

	// Update blog post with secondary keywords
	// Use PostgreSQL array format
	query := `
		UPDATE "BlogPost"
		SET "secondaryKeywords" = $1
		WHERE id = $2
	`
	
	_, err = db.Exec(query, pq.Array(secondaryKeywords), blogID)
	if err != nil {
		log.Printf("[SEO WORKER] Error updating blog post with secondary keywords: %v", err)
		return err
	}

	log.Printf("[SEO WORKER] Successfully updated blog ID %s with %d secondary keywords: %v", blogID, len(secondaryKeywords), secondaryKeywords)
	return nil
}

// callKeywordToolAPI calls the keyword tool API to generate secondary keywords
// PHASE B: Keyword HARUS dari keyword tool, BUKAN dari isi artikel
func callKeywordToolAPI(primaryKeyword string) ([]string, error) {
	// Get keyword tool API URL from environment
	keywordToolURL := os.Getenv("KEYWORD_TOOL_API_URL")
	if keywordToolURL == "" {
		// Fallback: Use a placeholder implementation
		// In production, this should be replaced with actual keyword tool API
		log.Printf("[SEO WORKER] KEYWORD_TOOL_API_URL not set, using placeholder implementation")
		return generatePlaceholderSecondaryKeywords(primaryKeyword), nil
	}

	// Call keyword tool API
	client := &http.Client{
		Timeout: 10 * time.Second,
	}

	req, err := http.NewRequest("POST", keywordToolURL, strings.NewReader(fmt.Sprintf(`{"keyword": "%s"}`, primaryKeyword)))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	
	// Add API key if available
	apiKey := os.Getenv("KEYWORD_TOOL_API_KEY")
	if apiKey != "" {
		req.Header.Set("Authorization", "Bearer "+apiKey)
	}

	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to call keyword tool API: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("keyword tool API returned status %d", resp.StatusCode)
	}

	var result struct {
		SecondaryKeywords []string `json:"secondary_keywords"`
		Keywords          []string `json:"keywords"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	// Use secondary_keywords if available, otherwise use keywords
	keywords := result.SecondaryKeywords
	if len(keywords) == 0 {
		keywords = result.Keywords
	}

	// Limit to max 10 secondary keywords
	if len(keywords) > 10 {
		keywords = keywords[:10]
	}

	return keywords, nil
}

// generatePlaceholderSecondaryKeywords generates placeholder secondary keywords
// This is a fallback when KEYWORD_TOOL_API_URL is not set
// In production, this should be replaced with actual keyword tool integration
func generatePlaceholderSecondaryKeywords(primaryKeyword string) []string {
	// Simple placeholder: generate variations of the primary keyword
	// This is just for development - should be replaced with actual keyword tool
	keywords := []string{}
	
	// Add some common variations (this is just a placeholder)
	words := strings.Fields(strings.ToLower(primaryKeyword))
	if len(words) > 0 {
		baseWord := words[0]
		keywords = append(keywords, 
			fmt.Sprintf("%s terbaik", baseWord),
			fmt.Sprintf("cara %s", baseWord),
			fmt.Sprintf("%s lengkap", baseWord),
		)
	}
	
	return keywords
}

// MarkComplete marks SEO as complete for the blog post
func MarkComplete(blogID string) error {
	log.Printf("[SEO WORKER] Marking SEO complete for blog ID: %s", blogID)
	
	// This function can be used to update a status field if needed
	// For now, it's a placeholder
	return nil
}

// getDB returns database connection
func getDB() *sql.DB {
	return content.GetDB()
}

// HandlePostGenerationComplete handles POST_GENERATION_COMPLETE event
// payloadData should be a map[string]interface{} with "entity" and "entity_id" keys
func HandlePostGenerationComplete(payloadData map[string]interface{}) {
	log.Printf("[SEO WORKER] Handling POST_GENERATION_COMPLETE event: %+v", payloadData)

	// Extract entity_id from payload
	entityID, ok := payloadData["entity_id"].(string)
	if !ok {
		log.Printf("[SEO WORKER] ERROR: entity_id not found in payload data")
		return
	}

	entity, ok := payloadData["entity"].(string)
	if !ok {
		log.Printf("[SEO WORKER] ERROR: entity not found in payload data")
		return
	}

	// Only process blog entities
	if entity != "blog" {
		log.Printf("[SEO WORKER] Skipping non-blog entity: %s", entity)
		return
	}

	// Generate secondary keywords from keyword tool
	if err := GenerateSecondaryKeywords(entityID); err != nil {
		log.Printf("[SEO WORKER] Error generating secondary keywords: %v", err)
		// Continue anyway - non-blocking
	}

	// Mark SEO as complete
	if err := MarkComplete(entityID); err != nil {
		log.Printf("[SEO WORKER] Error marking SEO complete: %v", err)
		// Continue anyway - non-blocking
	}

	// Mark form as ready (update validation state)
	// PHASE B: Call QC.MarkFormReady after SEO is complete
	if err := qc.MarkFormReady(entity, entityID); err != nil {
		log.Printf("[SEO WORKER] Error marking form ready: %v", err)
		// Continue anyway - non-blocking
	}

	log.Printf("[SEO WORKER] POST_GENERATION_COMPLETE handled successfully for blog ID: %s", entityID)
}
