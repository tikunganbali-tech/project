package api

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strings"

	"engine-hub/internal/ai/content"
	"engine-hub/internal/ai/workflow"
)

// BatchProductionRequest represents a production batch generation request
// CTO FINAL - LOCKED: MODE=PRODUCTION, BATCH_SIZE=5, CONTENT_TYPE=DERIVATIVE_LONG, etc.
type BatchProductionRequest struct {
	Mode          string   `json:"mode"`          // PRODUCTION
	BatchSize     int      `json:"batchSize"`    // 3-5 articles
	ContentType   string   `json:"contentType"`  // DERIVATIVE_LONG
	ImageMode     string   `json:"imageMode"`    // RAW_PHOTO
	Storage       string   `json:"storage"`      // LOCAL
	RetryLogic    string   `json:"retryLogic"`   // ON
	KeywordRotation string `json:"keywordRotation"` // ON
	Keywords      []string `json:"keywords"`     // Keyword pool
	Category      string   `json:"category"`     // Category (e.g., K1)
	Language      string   `json:"language"`     // id-ID
}

// BatchProductionResponse represents the result of batch production
type BatchProductionResponse struct {
	Status        string                    `json:"status"`        // SUCCESS or FAILED
	TotalRequested int                      `json:"totalRequested"` // Total articles requested
	TotalGenerated int                      `json:"totalGenerated"` // Total articles successfully generated
	TotalFailed    int                      `json:"totalFailed"`    // Total articles failed
	Articles      []BatchArticleResult      `json:"articles"`      // Individual article results
	Blacklist     []string                  `json:"blacklist"`     // Keywords that failed after all retries
	Summary       string                    `json:"summary"`       // Human-readable summary
}

// BatchArticleResult represents a single article generation result
type BatchArticleResult struct {
	Keyword       string                 `json:"keyword"`
	Attempt       int                    `json:"attempt"`       // 1-3
	Success       bool                   `json:"success"`
	Status        string                 `json:"status"`        // PUBLISHED, FAILED, VALIDATION_FAILED
	Title         string                 `json:"title,omitempty"`
	WordCount     int                    `json:"wordCount"`
	ImagesCount   int                    `json:"imagesCount"`
	Error         string                 `json:"error,omitempty"`
	FailureReason string                 `json:"failureReason,omitempty"`
	Draft         *workflow.DraftAI      `json:"draft,omitempty"` // Only included if success
}

// MAX_ATTEMPT is the maximum number of retry attempts per keyword (CTO FINAL - LOCKED)
const MAX_ATTEMPT = 3

// BatchProduction handles POST /api/engine/ai/batch-production
// CTO FINAL - LOCKED: Production batch generation with retry logic and keyword rotation
func BatchProduction(w http.ResponseWriter, r *http.Request) {
	log.Println("[BATCH PRODUCTION] Endpoint hit")

	defer func() {
		if r := recover(); r != nil {
			log.Printf("[BATCH PRODUCTION] PANIC RECOVERED: %v", r)
			errorResponse := map[string]interface{}{
				"error":   "Internal server error",
				"message": fmt.Sprintf("%v", r),
				"status":  "FAILED",
			}
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(errorResponse)
		}
	}()

	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req BatchProductionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		log.Printf("[BATCH PRODUCTION] Failed to parse request: %v", err)
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Set defaults
	if req.Mode == "" {
		req.Mode = "PRODUCTION"
	}
	if req.BatchSize <= 0 {
		req.BatchSize = 5
	}
	if req.ContentType == "" {
		req.ContentType = "DERIVATIVE_LONG"
	}
	if req.ImageMode == "" {
		req.ImageMode = "RAW_PHOTO"
	}
	if req.Storage == "" {
		req.Storage = "LOCAL"
	}
	if req.RetryLogic == "" {
		req.RetryLogic = "ON"
	}
	if req.KeywordRotation == "" {
		req.KeywordRotation = "ON"
	}
	if req.Language == "" {
		req.Language = "id-ID"
	}
	if req.Category == "" {
		req.Category = "K1"
	}

	// Validate keywords
	if len(req.Keywords) == 0 {
		http.Error(w, "Keywords array is required", http.StatusBadRequest)
		return
	}

	log.Printf("[BATCH PRODUCTION] Starting batch: mode=%s, batchSize=%d, contentType=%s, keywords=%d",
		req.Mode, req.BatchSize, req.ContentType, len(req.Keywords))

	// CTO FINAL LOGIC - LOCKED
	// MAX_ATTEMPT = 3
	// for keyword in keyword_pool:
	//   attempt = 1
	//   while attempt <= MAX_ATTEMPT:
	//     generate_article()
	//     if validator == PASS:
	//        publish
	//        break
	//     attempt++
	//   if attempt > MAX_ATTEMPT:
	//      mark keyword as FAILED
	//      push to blacklist
	//      continue to next keyword

	var results []BatchArticleResult
	var blacklist []string
	generatedCount := 0
	failedCount := 0

	// Create pipeline once (reused for all articles)
	pipeline := workflow.NewPipeline()

	// Process each keyword in the pool
	for keywordIdx, keyword := range req.Keywords {
		// Stop if we've generated enough articles
		if generatedCount >= req.BatchSize {
			log.Printf("[BATCH PRODUCTION] Reached batch size limit (%d), stopping", req.BatchSize)
			break
		}

		log.Printf("[BATCH PRODUCTION] Processing keyword %d/%d: %s", keywordIdx+1, len(req.Keywords), keyword)

		// FASE A - A3: RETRY CONTROLLER (ANTI KACAU)
		// Generate outline ONCE per keyword (not per attempt)
		// Retry HARUS dengan prompt yang sama (outline tidak berubah)
		outline := generateOutlineFromKeyword(keyword, req.ContentType, req.Category)
		log.Printf("[BATCH PRODUCTION] Generated outline for keyword '%s' (will reuse for all retries)", keyword)

		// Try up to MAX_ATTEMPT times for this keyword
		success := false
		var lastError error

		for attempt := 1; attempt <= MAX_ATTEMPT; attempt++ {
			log.Printf("[BATCH PRODUCTION] Keyword '%s', attempt %d/%d (using same outline)", keyword, attempt, MAX_ATTEMPT)

			// Create content request (FASE A - A3: Same outline for all attempts)
			contentReq := content.ContentRequest{
				ContentType: content.ContentType(req.ContentType),
				Category:    req.Category,
				Language:    req.Language,
				Outline:     outline, // Same outline for all retries
			}

			// Execute pipeline
			draft, err := pipeline.Execute(contentReq)
			if err != nil {
				lastError = err
				log.Printf("[BATCH PRODUCTION] Keyword '%s', attempt %d failed: %v", keyword, attempt, err)

				// Check if it's a validation error (non-retryable)
				if isValidationError(err) {
					log.Printf("[BATCH PRODUCTION] Validation error for keyword '%s' - not retrying", keyword)
					results = append(results, BatchArticleResult{
						Keyword:       keyword,
						Attempt:       attempt,
						Success:       false,
						Status:        "VALIDATION_FAILED",
						Error:         err.Error(),
						FailureReason: "Validation failed",
					})
					break // Don't retry validation errors
				}

				// Continue to next attempt for transient errors
				if attempt < MAX_ATTEMPT {
					log.Printf("[BATCH PRODUCTION] Transient error, will retry")
					continue
				}
			} else {
				// Success - validator passed
				log.Printf("[BATCH PRODUCTION] Keyword '%s', attempt %d SUCCESS", keyword, attempt)
				success = true

				// Calculate word count
				wordCount := countWordsInDraft(draft)

				// Create success result
				results = append(results, BatchArticleResult{
					Keyword:     keyword,
					Attempt:     attempt,
					Success:     true,
					Status:      "PUBLISHED",
					Title:       draft.Content.Title,
					WordCount:   wordCount,
					ImagesCount: len(draft.Images),
					Draft:       draft,
				})

				generatedCount++
				break // Success, move to next keyword
			}
		}

		// If all attempts failed, mark keyword as failed (FASE A - A3: ANTI KACAU)
		if !success {
			log.Printf("[BATCH PRODUCTION] Keyword '%s' failed after %d attempts", keyword, MAX_ATTEMPT)
			failedCount++

			// FASE B - B3: ERROR CLASSIFICATION (ANTI SALAH HUKUM)
			// Rule FINAL: ENV missing → FATAL (sudah di-handle di startup)
			// API key invalid → INFRA_ERROR
			// Timeout → INFRA_ERROR (retry infra)
			// Outline gagal → CONTENT_FAILED
			// Validator gagal 3x → CONTENT_FAILED
			shouldBlacklist := false
			failureReason := ""

			if lastError != nil {
				errStr := strings.ToLower(lastError.Error())
				
				// FASE B - B3: Classify error type
				if isInfraError(errStr) {
					// Infra error - TIDAK BOLEH blacklist
					shouldBlacklist = false
					failureReason = "INFRA_ERROR"
					log.Printf("[BATCH PRODUCTION] Keyword '%s' failed due to INFRA_ERROR - NOT blacklisting", keyword)
				} else if isContentError(errStr) {
					// Content-based failure - boleh blacklist
					shouldBlacklist = true
					failureReason = "CONTENT_FAILED"
					log.Printf("[BATCH PRODUCTION] Keyword '%s' failed due to CONTENT_FAILED - will blacklist", keyword)
				} else {
					// Unknown error - conservative: treat as content failure (but log warning)
					shouldBlacklist = true
					failureReason = "UNKNOWN_FAILURE"
					log.Printf("[BATCH PRODUCTION] Keyword '%s' failed with unknown error - treating as CONTENT_FAILED (conservative)", keyword)
				}
			} else {
				// No error recorded - treat as unknown
				failureReason = "UNKNOWN_FAILURE"
				shouldBlacklist = true
			}

			// FASE B - B3: Add to blacklist ONLY if content-based failure
			// ❌ DILARANG: infra error masuk blacklist
			// ❌ DILARANG: infra error dianggap konten gagal
			if shouldBlacklist && req.RetryLogic == "ON" {
				blacklist = append(blacklist, keyword)
				log.Printf("[BATCH PRODUCTION] Added keyword '%s' to blacklist (reason: %s)", keyword, failureReason)
			} else if !shouldBlacklist {
				log.Printf("[BATCH PRODUCTION] Keyword '%s' NOT blacklisted (reason: %s)", keyword, failureReason)
			}

			// Create failure result
			if lastError != nil {
				results = append(results, BatchArticleResult{
					Keyword:       keyword,
					Attempt:       MAX_ATTEMPT,
					Success:       false,
					Status:        "FAILED",
					Error:         lastError.Error(),
					FailureReason: fmt.Sprintf("Failed after %d attempts (reason: %s)", MAX_ATTEMPT, failureReason),
				})
			}
		}
	}

	// Generate summary
	summary := generateBatchSummary(results, generatedCount, failedCount, len(req.Keywords), blacklist)

	// Build response
	response := BatchProductionResponse{
		Status:         "SUCCESS",
		TotalRequested: req.BatchSize,
		TotalGenerated: generatedCount,
		TotalFailed:    failedCount,
		Articles:       results,
		Blacklist:      blacklist,
		Summary:        summary,
	}

	// If no articles were generated, mark as failed
	if generatedCount == 0 {
		response.Status = "FAILED"
	}

	log.Printf("[BATCH PRODUCTION] Completed: generated=%d, failed=%d, blacklist=%d",
		generatedCount, failedCount, len(blacklist))

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(response)
}

// generateOutlineFromKeyword generates a basic outline from keyword
// For DERIVATIVE_LONG, includes required "Hubungan Antar Jenis" section
func generateOutlineFromKeyword(keyword string, contentType string, category string) string {
	var outline strings.Builder
	
	// Base structure for DERIVATIVE_LONG
	if contentType == "DERIVATIVE_LONG" {
		outline.WriteString("## Pendahuluan\n\n")
		outline.WriteString(fmt.Sprintf("Artikel ini membahas tentang %s secara komprehensif.\n\n", keyword))
		
		outline.WriteString(fmt.Sprintf("## %s\n\n", keyword))
		outline.WriteString(fmt.Sprintf("Bagian ini menjelaskan konsep, definisi, dan aspek penting dari %s.\n\n", keyword))
		
		// Required section for DERIVATIVE_LONG
		outline.WriteString("## Hubungan Antar Jenis (sinergi, bukan berdiri sendiri)\n\n")
		outline.WriteString("Bagian ini menjelaskan hubungan dan keterkaitan antara berbagai aspek yang terkait dengan topik utama.\n\n")
		
		outline.WriteString(fmt.Sprintf("## Cara Menerapkan %s\n\n", keyword))
		outline.WriteString("Bagian ini memberikan panduan praktis untuk menerapkan pengetahuan tentang topik ini.\n\n")
		
		outline.WriteString("## Tips dan Rekomendasi\n\n")
		outline.WriteString("Bagian ini berisi tips praktis dan rekomendasi berdasarkan pengalaman.\n\n")
		
		outline.WriteString("## Kesimpulan\n\n")
		outline.WriteString("Ringkasan poin-poin penting dari artikel.\n\n")
	} else {
		// Basic structure for other content types
		outline.WriteString("## Pendahuluan\n\n")
		outline.WriteString(fmt.Sprintf("## %s\n\n", keyword))
		outline.WriteString("## Kesimpulan\n\n")
	}
	
	return outline.String()
}

// isValidationError checks if error is a validation error (non-retryable)
func isValidationError(err error) bool {
	if err == nil {
		return false
	}

	errStr := err.Error()
	return strings.Contains(errStr, "VALIDATION FAILED") ||
		strings.Contains(errStr, "WORD_COUNT_MINIMUM") ||
		strings.Contains(errStr, "CTA_JUALAN") ||
		strings.Contains(errStr, "KATA_TERLARANG") ||
		strings.Contains(errStr, "NAMA_MEREK") ||
		strings.Contains(errStr, "NADA_PROMOSI") ||
		strings.Contains(errStr, "HEADING_TIDAK_SESUAI_OUTLINE")
}

// isInfraError checks if error is an infrastructure error (FASE B - B3)
// INFRA_ERROR: API key, timeout, network, API status errors
// These should NOT go to blacklist
func isInfraError(errStr string) bool {
	// API key errors
	if strings.Contains(errStr, "ai_api_key") ||
		strings.Contains(errStr, "openai_api_key") ||
		strings.Contains(errStr, "environment variable not set") ||
		strings.Contains(errStr, "api key") ||
		strings.Contains(errStr, "authentication") ||
		strings.Contains(errStr, "unauthorized") ||
		strings.Contains(errStr, "401") ||
		strings.Contains(errStr, "403") {
		return true
	}

	// Timeout errors
	if strings.Contains(errStr, "timeout") ||
		strings.Contains(errStr, "deadline exceeded") ||
		strings.Contains(errStr, "context deadline") ||
		strings.Contains(errStr, "request timeout") {
		return true
	}

	// Network errors
	if strings.Contains(errStr, "network") ||
		strings.Contains(errStr, "connection") ||
		strings.Contains(errStr, "dial") ||
		strings.Contains(errStr, "no such host") ||
		strings.Contains(errStr, "connection refused") ||
		strings.Contains(errStr, "connection reset") {
		return true
	}

	// API request/response errors
	if strings.Contains(errStr, "api request failed") ||
		strings.Contains(errStr, "failed to create request") ||
		strings.Contains(errStr, "failed to decode response") ||
		strings.Contains(errStr, "api returned status") ||
		strings.Contains(errStr, "500") ||
		strings.Contains(errStr, "502") ||
		strings.Contains(errStr, "503") ||
		strings.Contains(errStr, "504") {
		return true
	}

	// Image API errors (infra)
	if strings.Contains(errStr, "image_api_key") ||
		strings.Contains(errStr, "image generation failed") {
		return true
	}

	return false
}

// isContentError checks if error is a content-based error (FASE B - B3)
// CONTENT_FAILED: validation, structure, outline, word count
// These CAN go to blacklist
func isContentError(errStr string) bool {
	// Validation errors
	if strings.Contains(errStr, "validation failed") ||
		strings.Contains(errStr, "word_count_minimum") ||
		strings.Contains(errStr, "cta_jualan") ||
		strings.Contains(errStr, "kata_terlarang") ||
		strings.Contains(errStr, "nama_merek") ||
		strings.Contains(errStr, "nada_promosi") ||
		strings.Contains(errStr, "heading_tidak_sesuai_outline") {
		return true
	}

	// Structure/outline errors
	if strings.Contains(errStr, "structural") ||
		strings.Contains(errStr, "outline") ||
		strings.Contains(errStr, "seo validation failed") ||
		strings.Contains(errStr, "content_failed") {
		return true
	}

	return false
}

// countWordsInDraft counts words in a draft article
func countWordsInDraft(draft *workflow.DraftAI) int {
	fullText := draft.Content.Title + " " + draft.Content.Body
	return countWords(fullText)
}

// countWords counts words in text (simple implementation)
func countWords(text string) int {
	words := strings.Fields(text)
	count := 0
	for _, word := range words {
		if len(strings.TrimSpace(word)) > 0 {
			count++
		}
	}
	return count
}

// generateBatchSummary creates human-readable summary of batch results
func generateBatchSummary(results []BatchArticleResult, generated int, failed int, totalKeywords int, blacklist []string) string {
	var summary strings.Builder
	summary.WriteString("BATCH PRODUCTION SUMMARY\n")
	summary.WriteString("========================\n\n")
	summary.WriteString(fmt.Sprintf("Total Keywords Processed: %d\n", totalKeywords))
	summary.WriteString(fmt.Sprintf("Articles Generated: %d\n", generated))
	summary.WriteString(fmt.Sprintf("Articles Failed: %d\n", failed))
	summary.WriteString(fmt.Sprintf("Blacklisted Keywords: %d\n", len(blacklist)))
	summary.WriteString("\n")

	if len(blacklist) > 0 {
		summary.WriteString("Blacklisted Keywords:\n")
		for _, kw := range blacklist {
			summary.WriteString(fmt.Sprintf("  - %s\n", kw))
		}
		summary.WriteString("\n")
	}

	summary.WriteString("Article Results:\n")
	for i, result := range results {
		status := "FAILED"
		if result.Success {
			status = "SUCCESS"
		}
		summary.WriteString(fmt.Sprintf("%d. Keyword: %s, Status: %s, Attempt: %d", i+1, result.Keyword, status, result.Attempt))
		if result.Success {
			summary.WriteString(fmt.Sprintf(", Word Count: %d, Images: %d", result.WordCount, result.ImagesCount))
		} else {
			summary.WriteString(fmt.Sprintf(", Error: %s", result.FailureReason))
		}
		summary.WriteString("\n")
	}

	return summary.String()
}
