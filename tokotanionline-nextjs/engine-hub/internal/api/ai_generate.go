package api

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"regexp"
	"strings"

	"engine-hub/internal/ai/content"
	"engine-hub/internal/ai/image"
	"engine-hub/internal/ai/workflow"
)

// AIGenerate handles POST /api/engine/ai/generate
// Frontend sends ContentRequest, receives DraftAI
func AIGenerate(w http.ResponseWriter, r *http.Request) {
	// CRITICAL: Panic recovery with proper error handling
	defer func() {
		if r := recover(); r != nil {
			log.Printf("[AI GENERATE] PANIC RECOVERED: %v", r)
			// Log stack trace if possible
			log.Printf("[AI GENERATE] Panic details: %+v", r)
			
			// Try to write error response
			errorResponse := map[string]interface{}{
				"error":   "Internal server error (panic recovered)",
				"message": fmt.Sprintf("%v", r),
				"status":  "FAILED",
			}
			
			// Check if headers already sent
			if w.Header().Get("Content-Type") == "" {
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusInternalServerError)
				
				// Try to encode, but don't panic if it fails
				if err := json.NewEncoder(w).Encode(errorResponse); err != nil {
					log.Printf("[AI GENERATE] Failed to write panic response: %v", err)
					// Last resort: write plain text
					w.Write([]byte(fmt.Sprintf("PANIC: %v", r)))
				}
			}
		}
	}()

	log.Println("[ENTRY] ADMIN BLOG AI HANDLER HIT")
	log.Println("[AI] Generate endpoint hit")
	log.Println("[ADMIN BLOG AI] USING GPT-5.2 LONGFORM ENGINE")

	// Only allow POST method
	if r.Method != http.MethodPost {
		log.Printf("[AI GENERATE] Invalid method: %s", r.Method)
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Parse request body
	var req content.ContentRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		log.Printf("[AI GENERATE] Failed to parse request: %v", err)
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// AI Generator v2: Log v2 fields if present
	if req.AnswerDriven {
		log.Printf("[AI GENERATE v2] Answer-driven mode: intent=%s, questions=%d", req.Intent, len(req.Questions))
	}
	log.Printf("[AI GENERATE] Received request: contentType=%s, category=%s, language=%s, outlineLength=%d", 
		req.ContentType, req.Category, req.Language, len(req.Outline))

	log.Println("[AI GENERATE] Creating pipeline...")
	// Create pipeline
	pipeline := workflow.NewPipeline()

	log.Println("[AI GENERATE] Executing pipeline...")
	// Execute pipeline
	draft, err := pipeline.Execute(req)
	if err != nil {
		log.Printf("[AI GENERATE] Pipeline failed: %v", err)
		
		// Determine status based on error type
		status := "FAILED"
		errMsg := err.Error()
		statusCode := http.StatusInternalServerError
		
		// Check if it's a validation error
		if strings.Contains(errMsg, "VALIDATION FAILED") || strings.Contains(errMsg, "SEO VALIDATION FAILED") {
			status = "FAILED_VALIDATION"
			statusCode = http.StatusBadRequest // 400 for validation errors (not 500)
			log.Printf("[AI GENERATE] Validation error detected - returning FAILED_VALIDATION status")
		} else if strings.Contains(errMsg, "validation failed") || strings.Contains(errMsg, "SEO validation failed") {
			status = "FAILED_VALIDATION"
			statusCode = http.StatusBadRequest
			log.Printf("[AI GENERATE] Validation error detected - returning FAILED_VALIDATION status")
		}
		
		// Return error response with details
		errorResponse := map[string]interface{}{
			"error":   "Content generation failed",
			"message": errMsg,
			"status":  status,
		}
		
		log.Printf("[AI GENERATE] Writing error response: status=%s, httpStatus=%d", status, statusCode)
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(statusCode)
		
		// Explicitly write JSON response
		if encodeErr := json.NewEncoder(w).Encode(errorResponse); encodeErr != nil {
			log.Printf("[AI GENERATE] Failed to encode error response: %v", encodeErr)
			// Last resort: write plain text
			w.Write([]byte(fmt.Sprintf(`{"error":"Failed to encode response","status":"%s","message":"%s"}`, status, errMsg)))
		}
		
		log.Printf("[AI GENERATE] Error response sent successfully")
		return
	}

	log.Printf("[AI GENERATE] Pipeline completed successfully: status=%s, images=%d", 
		draft.Status, len(draft.Images))

	// AI Generator v2: Word count only for legacy format
	var wordCount int
	if !req.AnswerDriven {
		wordCount = countWordsInResponse(draft)
		log.Printf("[AI RESULT] words=%d", wordCount)
	} else {
		log.Printf("[AI RESULT v2] Answer-driven mode - no word count requirement")
	}

	// AI Generator v2: Build response (v2 format if answerDriven, legacy otherwise)
	var response map[string]interface{}
	if req.AnswerDriven && len(req.Questions) > 0 {
		// v2: Answer-driven format with sections
		sections := buildAnswerDrivenSections(draft, req.Questions, req.Intent)
		response = map[string]interface{}{
			"success": true,
			"data": map[string]interface{}{
				"title":       draft.Content.Title,
				"content":     assembleContentFromSections(sections),
				"content_html": assembleContentFromSections(sections),
				"intent":      req.Intent,
				"sections":    sections,
				"seo": map[string]interface{}{
					"title":             draft.Content.MetaTitle,
					"meta_description":  draft.Content.MetaDesc,
					"primary_keyword":    extractPrimaryKeyword(draft.Content),
					"secondary_keywords": []string{},
				},
				"images": map[string]interface{}{
					"featured": extractFeaturedImage(draft.Images),
					"inline":   extractInlineImages(draft.Images),
				},
			},
			"steps": draft.Steps,
		}
	} else {
		// Legacy format
		response = map[string]interface{}{
			"success": true,
			"data": map[string]interface{}{
				"title":       draft.Content.Title,
				"content":    draft.Content.Body,
				"content_html": convertMarkdownToHTML(draft.Content.Body),
				"word_count":   wordCount,
				"seo": map[string]interface{}{
					"title":             draft.Content.MetaTitle,
					"meta_description":  draft.Content.MetaDesc,
					"primary_keyword":    extractPrimaryKeyword(draft.Content),
					"secondary_keywords": []string{},
				},
				"images": map[string]interface{}{
					"featured": extractFeaturedImage(draft.Images),
					"inline":   extractInlineImages(draft.Images),
				},
			},
			"steps": draft.Steps,
		}
	}

	// Return success response
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(response)
}

// Helper functions for response building
func extractExcerpt(body string) string {
	// Extract first 200 chars, strip markdown
	text := strings.ReplaceAll(body, "#", "")
	text = strings.ReplaceAll(text, "##", "")
	text = strings.ReplaceAll(text, "**", "")
	lines := strings.Split(text, "\n")
	for _, line := range lines {
		line = strings.TrimSpace(line)
		if len(line) > 20 {
			if len(line) > 200 {
				return line[:200] + "..."
			}
			return line
		}
	}
	return "Artikel pertanian informatif."
}

func convertMarkdownToHTML(markdown string) string {
	// Simple markdown to HTML conversion
	html := markdown
	html = strings.ReplaceAll(html, "## ", "<h2>")
	html = strings.ReplaceAll(html, "\n## ", "</h2>\n<h2>")
	html = strings.ReplaceAll(html, "### ", "<h3>")
	html = strings.ReplaceAll(html, "\n### ", "</h3>\n<h3>")
	html = strings.ReplaceAll(html, "**", "<strong>")
	html = strings.ReplaceAll(html, "\n\n", "</p><p>")
	return "<p>" + html + "</p>"
}

func countWordsInResponse(draft *workflow.DraftAI) int {
	fullText := draft.Content.Title + " " + draft.Content.Body
	words := strings.Fields(fullText)
	return len(words)
}

func extractPrimaryKeyword(content content.ContentResult) string {
	// Try to extract from title or meta
	if content.MetaTitle != "" {
		words := strings.Fields(content.MetaTitle)
		if len(words) > 0 {
			return words[0]
		}
	}
	return ""
}

func extractFeaturedImage(images []image.ImageAsset) string {
	for _, img := range images {
		if img.IsHero && img.LocalPath != "" {
			// M-02: Normalize path before returning
			return image.NormalizeImagePathSafe(img.LocalPath)
		}
	}
	if len(images) > 0 && images[0].LocalPath != "" {
		// M-02: Normalize path before returning
		return image.NormalizeImagePathSafe(images[0].LocalPath)
	}
	return ""
}

func extractInlineImages(images []image.ImageAsset) []string {
	var inline []string
	for _, img := range images {
		if !img.IsHero && img.LocalPath != "" {
			// M-02: Normalize path before returning
			normalized := image.NormalizeImagePathSafe(img.LocalPath)
			if normalized != "" {
				inline = append(inline, normalized)
			}
		}
	}
	return inline
}

// AI Generator v2: Build answer-driven sections from content
func buildAnswerDrivenSections(draft *workflow.DraftAI, questions []string, intent string) []map[string]interface{} {
	sections := []map[string]interface{}{}
	contentBody := draft.Content.Body
	
	// Split content by H2 headings to match with questions
	// Simple approach: match questions with content sections
	for i, question := range questions {
		// Extract answer for this question from content
		answerHTML := extractAnswerForQuestion(contentBody, question, i)
		
		// C. QC Engine v2: Perform QC check with scoring
		qcStatus, qcScore := performQCCheck(question, answerHTML)
		
		section := map[string]interface{}{
			"question":    question,
			"answer_html": answerHTML,
			"qc_status":   qcStatus,
			"qc_scores": map[string]interface{}{
				"answer_clarity_score":   qcScore.AnswerClarityScore,
				"snippet_readiness_score": qcScore.SnippetReadinessScore,
				"generic_penalty_score":   qcScore.GenericPenaltyScore,
			},
		}
		
		if qcScore.FailureReason != "" {
			section["failure_reason"] = qcScore.FailureReason
		}
		
		// D. Image Relevance Tuning
		// D1. Image hanya jika MENJELASKAN (tutorial, langkah, perbandingan visual)
		if needsVisualExplanationStrict(question, answerHTML) && i < len(draft.Images) {
			img := draft.Images[i]
			if img.LocalPath != "" {
				// M-02: Normalize path before returning
				normalizedPath := image.NormalizeImagePathSafe(img.LocalPath)
				if normalizedPath != "" {
					// D2. Alt Text = Jawaban Singkat (≤ 125 karakter)
					altText := generateAltText(question, answerHTML)
					section["image"] = map[string]interface{}{
						"url": normalizedPath,
						"alt": altText,
					}
				}
			}
		}
		
		sections = append(sections, section)
	}
	
	return sections
}

// Extract answer for a specific question from content
func extractAnswerForQuestion(content string, question string, index int) string {
	// Split by H2 headings (##)
	sections := strings.Split(content, "##")
	
	// Try to find relevant section
	if index+1 < len(sections) {
		section := sections[index+1]
		// Remove H3 headings and clean up
		section = strings.ReplaceAll(section, "###", "")
		section = strings.TrimSpace(section)
		
		// Convert markdown to HTML
		html := convertMarkdownToHTML(section)
		if len(html) > 50 {
			return html
		}
	}
	
	// Fallback: extract paragraphs
	paragraphs := strings.Split(content, "\n\n")
	if index < len(paragraphs) {
		para := paragraphs[index]
		para = strings.TrimSpace(para)
		if len(para) > 50 {
			return convertMarkdownToHTML("<p>" + para + "</p>")
		}
	}
	
	// Last resort: return question as placeholder
	return fmt.Sprintf("<p>Jawaban untuk: %s</p>", question)
}

// QCScore represents scoring for a section
type QCScore struct {
	AnswerClarityScore   int    `json:"answer_clarity_score"`   // 0-100
	SnippetReadinessScore int    `json:"snippet_readiness_score"` // 0-100
	GenericPenaltyScore   int    `json:"generic_penalty_score"`  // 0-100 (lower is better)
	OverallStatus         string `json:"overall_status"`         // PASS/FAIL
	FailureReason         string `json:"failure_reason,omitempty"`
}

// Perform QC check on section with scoring (QC Engine v2)
func performQCCheck(question string, answerHTML string) (string, QCScore) {
	score := QCScore{}
	
	// Remove HTML tags for text analysis
	htmlTagRegex := regexp.MustCompile(`<[^>]*>`)
	text := htmlTagRegex.ReplaceAllString(answerHTML, " ")
	text = strings.TrimSpace(text)
	answerLower := strings.ToLower(text)
	questionLower := strings.ToLower(question)
	
	// C1. Scoring per Section
	
	// 1. answer_clarity_score (0-100)
	// Check: Answer directly addresses question in first sentence
	firstSentence := getFirstSentence(text)
	firstSentenceLower := strings.ToLower(firstSentence)
	
	clarityScore := 0
	// Check if first sentence answers the question
	questionKeywords := extractKeywords(questionLower)
	matchedKeywords := 0
	for _, keyword := range questionKeywords {
		if strings.Contains(firstSentenceLower, keyword) {
			matchedKeywords++
		}
	}
	if len(questionKeywords) > 0 {
		clarityScore = (matchedKeywords * 100) / len(questionKeywords)
	}
	
	// Bonus: First sentence is concise (≤ 30 words)
	firstSentenceWords := len(strings.Fields(firstSentence))
	if firstSentenceWords <= 30 {
		clarityScore = min(100, clarityScore+10)
	}
	
	score.AnswerClarityScore = clarityScore
	
	// 2. snippet_readiness_score (0-100)
	snippetScore := 0
	
	// Can stand alone (has complete sentences)
	sentences := strings.Split(text, ".")
	completeSentences := 0
	for _, s := range sentences {
		s = strings.TrimSpace(s)
		if len(s) >= 10 {
			completeSentences++
		}
	}
	if completeSentences >= 2 {
		snippetScore += 40
	}
	
	// Answer length appropriate (50-500 chars for snippet)
	textLen := len(text)
	if textLen >= 50 && textLen <= 500 {
		snippetScore += 30
	} else if textLen < 50 {
		snippetScore += 10 // Too short
	} else {
		snippetScore += 20 // Too long but acceptable
	}
	
	// Contains specific context (not generic)
	if containsSpecificContext(text, questionLower) {
		snippetScore += 30
	}
	
	score.SnippetReadinessScore = snippetScore
	
	// 3. generic_penalty_score (0-100, lower is better)
	genericScore := 0
	
	// B2. Anti-Generic Filter
	genericPhrases := []string{
		"di era modern", "sangat penting", "tidak dapat dipungkiri",
		"sangat baik", "sangat bagus", "sangat berguna", "sangat membantu",
		"dapat membantu", "dapat meningkatkan", "dapat memperbaiki",
		"merupakan hal yang", "adalah hal yang", "tidak diragukan lagi",
	}
	
	for _, phrase := range genericPhrases {
		if strings.Contains(answerLower, phrase) {
			genericScore += 10
		}
	}
	
	// Check if answer could be used for any topic
	if isTooGeneric(text, questionLower) {
		genericScore += 30
	}
	
	// Check for opening basa-basi
	openingPhrases := []string{"dalam era", "tidak dapat dipungkiri", "perlu diketahui", "perlu dipahami"}
	for _, phrase := range openingPhrases {
		if strings.HasPrefix(answerLower, phrase) || strings.Contains(strings.Split(answerLower, ".")[0], phrase) {
			genericScore += 20
		}
	}
	
	score.GenericPenaltyScore = min(100, genericScore)
	
	// C1. Lulus jika:
	// clarity ≥ 80
	// snippet ≥ 75
	// generic ≤ 20
	if score.AnswerClarityScore >= 80 && score.SnippetReadinessScore >= 75 && score.GenericPenaltyScore <= 20 {
		score.OverallStatus = "PASS"
		return "PASS", score
	}
	
	// Determine failure reason
	if score.AnswerClarityScore < 80 {
		score.FailureReason = "clarity"
	} else if score.SnippetReadinessScore < 75 {
		score.FailureReason = "snippet_readiness"
	} else if score.GenericPenaltyScore > 20 {
		score.FailureReason = "generic"
	} else {
		score.FailureReason = "unknown"
	}
	
	score.OverallStatus = "FAIL"
	return "FAIL", score
}

// Helper functions for QC scoring
func getFirstSentence(text string) string {
	sentences := strings.Split(text, ".")
	if len(sentences) > 0 {
		return strings.TrimSpace(sentences[0])
	}
	return text
}

func extractKeywords(text string) []string {
	// Extract meaningful words (length > 3, not stop words)
	stopWords := map[string]bool{
		"yang": true, "dan": true, "atau": true, "dari": true, "pada": true,
		"untuk": true, "dengan": true, "adalah": true, "merupakan": true,
		"dapat": true, "akan": true, "telah": true, "sudah": true,
	}
	
	words := strings.Fields(strings.ToLower(text))
	keywords := []string{}
	for _, word := range words {
		word = strings.Trim(word, ".,!?;:")
		if len(word) > 3 && !stopWords[word] {
			keywords = append(keywords, word)
		}
	}
	return keywords
}

func containsSpecificContext(text string, question string) bool {
	// Check if text mentions specific details (not just generic statements)
	// Simple heuristic: contains numbers, specific terms, or detailed explanations
	hasNumbers := regexp.MustCompile(`\d+`).MatchString(text)
	hasSpecificTerms := len(strings.Fields(text)) > 20 // Detailed explanation
	
	// Check if mentions question context
	questionWords := extractKeywords(question)
	matched := 0
	textLower := strings.ToLower(text)
	for _, word := range questionWords {
		if strings.Contains(textLower, word) {
			matched++
		}
	}
	
	return hasNumbers || hasSpecificTerms || matched >= 2
}

func isTooGeneric(text string, question string) bool {
	// Check if answer could be used for any topic
	genericPatterns := []string{
		"adalah hal yang", "merupakan hal yang", "sangat penting untuk",
		"dapat membantu dalam", "sangat berguna untuk",
	}
	
	textLower := strings.ToLower(text)
	genericCount := 0
	for _, pattern := range genericPatterns {
		if strings.Contains(textLower, pattern) {
			genericCount++
		}
	}
	
	// If too many generic patterns and doesn't mention question context
	questionWords := extractKeywords(question)
	contextMatches := 0
	for _, word := range questionWords {
		if strings.Contains(textLower, word) {
			contextMatches++
		}
	}
	
	return genericCount >= 2 && contextMatches < 2
}

// D1. Image Relevance Tuning: Image hanya jika MENJELASKAN
func needsVisualExplanationStrict(question string, answerHTML string) bool {
	// D1. Image hanya jika: tutorial, langkah, perbandingan visual
	// ❌ Jika hanya definisi → NO IMAGE
	
	questionLower := strings.ToLower(question)
	answerLower := strings.ToLower(answerHTML)
	
	// Check for tutorial/step-by-step keywords
	tutorialKeywords := []string{"cara", "langkah", "tutorial", "panduan", "step", "tahap", "proses"}
	hasTutorial := false
	for _, keyword := range tutorialKeywords {
		if strings.Contains(questionLower, keyword) || strings.Contains(answerLower, keyword) {
			hasTutorial = true
			break
		}
	}
	
	// Check for comparison keywords
	comparisonKeywords := []string{"banding", "perbandingan", "beda", "perbedaan", "vs", "versus"}
	hasComparison := false
	for _, keyword := range comparisonKeywords {
		if strings.Contains(questionLower, keyword) || strings.Contains(answerLower, keyword) {
			hasComparison = true
			break
		}
	}
	
	// Check if it's just a definition (NO IMAGE)
	definitionKeywords := []string{"apa itu", "definisi", "pengertian", "adalah", "merupakan"}
	isDefinition := false
	for _, keyword := range definitionKeywords {
		if strings.Contains(questionLower, keyword) {
			isDefinition = true
			break
		}
	}
	
	// Image needed if: tutorial OR comparison, AND NOT just definition
	return (hasTutorial || hasComparison) && !isDefinition
}

// D2. Generate Alt Text = Jawaban Singkat (≤ 125 karakter)
func generateAltText(question string, answerHTML string) string {
	// Extract first sentence as alt text
	htmlTagRegex := regexp.MustCompile(`<[^>]*>`)
	text := htmlTagRegex.ReplaceAllString(answerHTML, " ")
	text = strings.TrimSpace(text)
	
	firstSentence := getFirstSentence(text)
	
	// Limit to 125 characters
	if len(firstSentence) > 125 {
		firstSentence = firstSentence[:122] + "..."
	}
	
	// If too short, use question
	if len(firstSentence) < 20 {
		if len(question) > 125 {
			return question[:122] + "..."
		}
		return question
	}
	
	return firstSentence
}

// Assemble full content from sections
func assembleContentFromSections(sections []map[string]interface{}) string {
	var content strings.Builder
	for _, section := range sections {
		question, _ := section["question"].(string)
		answerHTML, _ := section["answer_html"].(string)
		
		content.WriteString(fmt.Sprintf("<h2>%s</h2>\n", question))
		content.WriteString(answerHTML)
		content.WriteString("\n\n")
	}
	return content.String()
}

// M-05: AIGenerateProductImages handles POST /api/engine/ai/generate-product-images
// Generates product images with roles (hero, detail) - 3-6 images total
func AIGenerateProductImages(w http.ResponseWriter, r *http.Request) {
	defer func() {
		if r := recover(); r != nil {
			log.Printf("[PRODUCT IMAGE GEN] PANIC RECOVERED: %v", r)
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

	log.Println("[PRODUCT IMAGE GEN] Endpoint hit")

	// Only allow POST method
	if r.Method != http.MethodPost {
		log.Printf("[PRODUCT IMAGE GEN] Invalid method: %s", r.Method)
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Parse request body
	var req struct {
		ProductName        string `json:"productName"`
		ProductDescription string `json:"productDescription"`
		ProductSlug        string `json:"productSlug"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		log.Printf("[PRODUCT IMAGE GEN] Failed to parse request: %v", err)
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Validate required fields
	if req.ProductName == "" {
		http.Error(w, "productName is required", http.StatusBadRequest)
		return
	}
	if req.ProductSlug == "" {
		// Generate slug from product name if not provided
		req.ProductSlug = image.GenerateSlugFromTitle(req.ProductName)
		log.Printf("[PRODUCT IMAGE GEN] Generated slug from name: %s", req.ProductSlug)
	}

	log.Printf("[PRODUCT IMAGE GEN] Generating images for product: %s (slug: %s)", req.ProductName, req.ProductSlug)

	// Create image generator
	imageGen := image.NewGenerator()

	// Generate product images
	images, err := imageGen.GenerateProductImages(req.ProductName, req.ProductDescription, req.ProductSlug)
	if err != nil {
		log.Printf("[PRODUCT IMAGE GEN] Failed to generate images: %v", err)
		errorResponse := map[string]interface{}{
			"error":   "Image generation failed",
			"message": err.Error(),
			"status":  "FAILED",
		}
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(errorResponse)
		return
	}

	log.Printf("[PRODUCT IMAGE GEN] Successfully generated %d images", len(images))

	// Return images in response
	response := map[string]interface{}{
		"images": images,
		"status": "SUCCESS",
		"count":  len(images),
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(response)
}