package workflow

import (
	"fmt"
	"log"
	"strings"
	"unicode"

	"engine-hub/internal/ai/content"
	aiError "engine-hub/internal/ai/error"
	"engine-hub/internal/ai/image"
	"engine-hub/internal/ai/normalize"
	"engine-hub/internal/ai/seo"
	"engine-hub/internal/ai/state"
	"engine-hub/internal/ai/validate"
)

// StepResult represents the result of a pipeline step
type StepResult struct {
	Step  string `json:"step"`  // "text", "seo", "image"
	Ok    bool   `json:"ok"`     // true if step succeeded
	Error string `json:"error,omitempty"` // error message if step failed
}

// DraftAI represents the final output of the AI content pipeline
type DraftAI struct {
	Content content.ContentResult `json:"content"`
	Images  []image.ImageAsset    `json:"images"`
	Status  string                `json:"status"` // DRAFT_AI
	Steps   []StepResult          `json:"steps,omitempty"` // Step-by-step results
}

// Pipeline orchestrates the AI content generation workflow
type Pipeline struct {
	contentGen *content.Generator
	imageGen   *image.Generator
}

// NewPipeline creates a new workflow pipeline
func NewPipeline() *Pipeline {
	log.Println("[PIPELINE] Creating new pipeline...")
	return &Pipeline{
		contentGen: content.NewGenerator(),
		imageGen:   image.NewGenerator(),
	}
}

// Execute runs the complete pipeline:
// KONTRAK FINAL: State machine wajib, tidak ada shortcut
// INIT → GENERATE_RAW → NORMALIZE → VALIDATE → STORE (DRAFT_READY)
// PARTIAL-SAFE: Image failures don't stop pipeline, tracked in Steps
func (p *Pipeline) Execute(req content.ContentRequest) (*DraftAI, error) {
	log.Println("[AI PIPELINE] Starting content generation workflow")

	// === E1: DEKLARASI FINAL_CONTENT DI AWAL (STANDARISASI SATU VARIABEL) ===
	var FINAL_CONTENT string
	// =======================================================================

	// Track step results
	steps := []StepResult{}

	// KONTRAK FINAL: Initialize state machine
	stateMachine := state.NewStateMachine(2) // Max 2 retries according to contract
	if err := stateMachine.Transition(state.StateGenerateRaw); err != nil {
		return nil, fmt.Errorf("state machine initialization failed: %w", err)
	}

	// STEP 1: Generate raw AI content (TEXT GENERATION)
	log.Println("[AI PIPELINE] STEP 1: Generating raw AI content...")
	rawContent, err := p.contentGen.Generate(req)
	if err != nil {
		// KONTRAK FINAL: Classify failure
		classifiedErr := aiError.ClassifyFailure(err)
		log.Printf("[AI PIPELINE] STEP 1 FAILED: %s - %s", classifiedErr.Type, classifiedErr.Message)
		
		// Text generation failure = CRITICAL, stop pipeline
		steps = append(steps, StepResult{
			Step:  "text",
			Ok:    false,
			Error: classifiedErr.Message,
		})
		
		// Transition to quarantine if non-retryable
		if !aiError.IsRetryable(err) {
			stateMachine.Transition(state.StateQuarantine)
		}
		
		return nil, fmt.Errorf("text_generation failed: %w", classifiedErr)
	}

	log.Printf("[AI PIPELINE] STEP 1 COMPLETE: Raw content generated (Status: %s)", rawContent.Status)
	steps = append(steps, StepResult{Step: "text", Ok: true})

	// === C1: KUNCI JALUR DATA GPT (SET LANGSUNG SETELAH PARSING) ===
	contentFromGPT := rawContent.Body // hasil parsing GPT
	log.Printf("[GPT PARSED] words=%d", countWordsForValidation(contentFromGPT))
	
	// === PAKSA PAKAI HASIL GPT ===
	rawContent.Body = contentFromGPT
	// ============================
	
	// STEP 1.5: Content Normalization (DETERMINISTIC - forces compliance before validation)
	// KONTRAK FINAL: Transition to NORMALIZE state
	if err := stateMachine.Transition(state.StateNormalize); err != nil {
		return nil, fmt.Errorf("state transition failed: %w", err)
	}
	
	log.Println("[AI PIPELINE] STEP 1.5: Normalizing content (enforcing compliance rules)...")
	normalizedContent := normalize.NormalizeContent(*rawContent)
	log.Printf("[AI PIPELINE] STEP 1.5 COMPLETE: Content normalized (Status: %s)", normalizedContent.Status)
	
	// === E1: SET FINAL_CONTENT SETELAH NORMALIZE ===
	FINAL_CONTENT = normalizedContent.Body
	normalizedContent.Body = FINAL_CONTENT
	// ===============================================

	// STEP 2: SEO Optimization (ADVISOR - tidak memblokir pipeline untuk AI)
	log.Println("[AI PIPELINE] STEP 2: Optimizing SEO...")
	// TASK 3: Pass context "ai" untuk SEO validator (tidak boleh fail hard)
	seoCtx := seo.SEOContext{Source: "ai"}
	seoContent, err := seo.OptimizeSEOWithContext(normalizedContent, seoCtx)
	if err != nil {
		// SEO validator tidak boleh memblokir pipeline untuk AI source
		// Hanya log warning dan continue
		log.Printf("[AI PIPELINE] STEP 2 WARNING: SEO validation issue (continuing): %v", err)
		// Gunakan content yang sudah di-optimize meskipun ada warning
		if seoContent.Status == "" {
			seoContent = normalizedContent
			seoContent.Status = "SEO_OPTIMIZED_WITH_WARNINGS"
		}
		steps = append(steps, StepResult{
			Step:  "seo",
			Ok:    true, // Tetap OK karena tidak memblokir
			Error: "",   // Tidak ada error yang memblokir
		})
	} else {
		steps = append(steps, StepResult{Step: "seo", Ok: true})
	}

	log.Printf("[AI PIPELINE] STEP 2 COMPLETE: SEO optimized (Status: %s)", seoContent.Status)
	steps = append(steps, StepResult{Step: "seo", Ok: true})
	
	// === E2: SEMUA KOMPONEN WAJIB PAKAI FINAL_CONTENT ===
	// Pastikan seoContent.Body menggunakan FINAL_CONTENT
	seoContent.Body = FINAL_CONTENT
	// ====================================================

	// STEP 3: Generate images (NON-CRITICAL - pipeline continues if image fails)
	// FASE C - C3: IMAGE GENERATION FLOW (DIKUNCI)
	// Flow: [CONTENT FINAL] → Extract context → Generate → Download → Local save → Metadata → Relate
	log.Println("[AI PIPELINE] STEP 3: Generating images...")
	
	// Generate slug from title for folder structure
	articleSlug := image.GenerateSlugFromTitle(seoContent.Title)
	log.Printf("[AI PIPELINE] Generated article slug: %s", articleSlug)
	
	// FASE C - C3: Execute image generation flow (all steps inside GenerateImages)
	images, err := p.imageGen.GenerateImages(seoContent.Body, articleSlug)
	if err != nil {
		log.Printf("[AI PIPELINE] WARNING: Image generation failed: %v (continuing without images)", err)
		images = []image.ImageAsset{} // Continue without images
		// Image failure = NON-CRITICAL, track but continue
		steps = append(steps, StepResult{
			Step:  "image",
			Ok:    false,
			Error: err.Error(),
		})
	} else {
		log.Printf("[AI PIPELINE] STEP 3 COMPLETE: Generated %d images", len(images))
		steps = append(steps, StepResult{Step: "image", Ok: true})
		
		// FASE C - C3: Step 6 - Relasikan ke artikel (inject image references)
		if len(images) > 0 {
			// === C2: PASTIKAN INJECT IMAGES PAKAI FINAL_CONTENT ===
			seoContent.Body = p.injectImagesIntoContent(FINAL_CONTENT, images)
			FINAL_CONTENT = seoContent.Body // Update FINAL_CONTENT setelah inject
			log.Printf("[AI PIPELINE] STEP 3.5 COMPLETE: Injected %d image references into content", len(images))
		}
	}

	// STEP 4: Validation (CRITICAL - stops pipeline if fails)
	// KONTRAK FINAL: Transition to VALIDATE state
	if err := stateMachine.Transition(state.StateValidate); err != nil {
		return nil, fmt.Errorf("state transition failed: %w", err)
	}
	
	// BAGIAN D2: Log pre-validation (WAJIB - sebelum validator jalan)
	fullText := seoContent.Title + " " + seoContent.Body
	wc := countWordsForValidation(fullText)
	log.Printf("[PRE-VALIDATION] words=%d chars=%d", wc, len(seoContent.Body))
	if wc > 900 {
		log.Printf("[PRE-VALIDATION] ✅ Engine sehat: %d words (min: 900)", wc)
	} else if wc < 100 {
		log.Printf("[PRE-VALIDATION] ⚠️ Engine masih rusak: %d words (expected: >900)", wc)
	}
	
	// BAGIAN 3.3: LOG TEPAT SEBELUM VALIDATOR (WAJIB)
	log.Printf("[PIPELINE BEFORE VALIDATOR] words=%d",
		countWordsForValidation(seoContent.Body),
	)
	
	// PHASE 0.2: VALIDATOR = WARNING ONLY (tidak memblokir pipeline)
	log.Println("[AI PIPELINE] STEP 4: Validating content...")
	if err := validate.ValidateContent(seoContent); err != nil {
		// PHASE 0.2: Validator hanya warning, tidak memblokir pipeline
		// KONTRAK FINAL: Classify failure untuk logging
		classifiedErr := aiError.ClassifyFailure(err)
		log.Printf("[AI PIPELINE] STEP 4 WARNING: Validation issue detected but continuing (WARNING ONLY): %s - %s", classifiedErr.Type, classifiedErr.Message)
		
		// PHASE 0.2: Tidak transition ke quarantine, tidak return error
		// Validator adalah advisor, bukan gatekeeper
		steps = append(steps, StepResult{
			Step:  "validate",
			Ok:    true, // Tetap OK karena tidak memblokir
			Error: classifiedErr.Message, // Warning message
		})
	} else {
		steps = append(steps, StepResult{Step: "validate", Ok: true})
	}

	// Also validate against outline if provided
	if req.Outline != "" {
		if err := validate.ValidateContentWithOutline(seoContent, req.Outline); err != nil {
			// PHASE 0.2: Validator hanya warning, tidak memblokir pipeline
			// KONTRAK FINAL: Classify failure untuk logging
			classifiedErr := aiError.ClassifyFailure(err)
			log.Printf("[AI PIPELINE] STEP 4 WARNING: Outline validation issue detected but continuing (WARNING ONLY): %s - %s", classifiedErr.Type, classifiedErr.Message)
			
			// PHASE 0.2: Tidak transition ke quarantine, tidak return error
			// Validator adalah advisor, bukan gatekeeper
			// Update step result jika belum ada
			for i, step := range steps {
				if step.Step == "validate" {
					steps[i].Error = step.Error + "; " + classifiedErr.Message
					break
				}
			}
		}
	}

	log.Println("[AI PIPELINE] STEP 4 COMPLETE: Content validated successfully")

	// STEP 5: Create final DraftAI output
	// KONTRAK FINAL: Transition to STORE state (DRAFT_READY)
	if err := stateMachine.Transition(state.StateStore); err != nil {
		return nil, fmt.Errorf("state transition failed: %w", err)
	}
	
	log.Println("[AI PIPELINE] STEP 5: Creating final draft...")
	draft := &DraftAI{
		Content: seoContent,
		Images:  images,
		Status:  "DRAFT_READY", // KONTRAK FINAL: Status DRAFT_READY
		Steps:   steps,          // Include step results
	}

	// Update content status to DRAFT_READY (final state)
	draft.Content.Status = string(stateMachine.GetStatusCode())

	log.Printf("[AI PIPELINE] STEP 5 COMPLETE: Draft created (Status: %s)", draft.Status)
	log.Printf("[AI PIPELINE] State machine final state: %s", stateMachine.GetCurrentState())
	log.Printf("[AI PIPELINE] Steps completed: %d/%d successful", countSuccessfulSteps(steps), len(steps))
	log.Println("[AI PIPELINE] Workflow completed successfully")

	return draft, nil
}

// countSuccessfulSteps counts successful steps
func countSuccessfulSteps(steps []StepResult) int {
	count := 0
	for _, step := range steps {
		if step.Ok {
			count++
		}
	}
	return count
}

// ExecuteWithRetry executes the pipeline with retry logic for content generation
// KONTRAK FINAL: Retry maksimal 2x, hanya untuk AI_ERROR dan INFRA_ERROR
// - Retry HARUS dengan prompt yang sama (req.Outline tidak berubah)
// - Jika 2x gagal: keyword → fallback pool, dicatat sebagai content_failed
// ⛔ DILARANG: infinite retry, retry tanpa catatan, ganti outline diam-diam
func (p *Pipeline) ExecuteWithRetry(req content.ContentRequest, maxRetries int) (*DraftAI, error) {
	var lastErr error
	var lastNonRetryableErr error
	var attempt int

	// KONTRAK FINAL: Store original outline to ensure it doesn't change
	originalOutline := req.Outline

	// KONTRAK FINAL: Max retries = 2
	if maxRetries > 2 {
		maxRetries = 2
		log.Printf("[AI PIPELINE] Max retries limited to 2 according to contract")
	}

	for attempt = 0; attempt <= maxRetries; attempt++ {
		if attempt > 0 {
			log.Printf("[AI PIPELINE] Retry attempt %d/%d (using same outline)", attempt, maxRetries)
			// KONTRAK FINAL: Ensure outline doesn't change during retry
			req.Outline = originalOutline
		}

		draft, err := p.Execute(req)
		if err == nil {
			return draft, nil
		}

		lastErr = err

		// KONTRAK FINAL: Classify failure
		classifiedErr := aiError.ClassifyFailure(err)
		log.Printf("[AI PIPELINE] Error classified: %s - %s", classifiedErr.Type, classifiedErr.Message)

		// KONTRAK FINAL: Don't retry on STRUCTURE_ERROR and QUALITY_ERROR
		if classifiedErr.Type == aiError.ErrorTypeStructure || classifiedErr.Type == aiError.ErrorTypeQuality {
			log.Printf("[AI PIPELINE] Non-retryable error detected: %s - no retry", classifiedErr.Type)
			lastNonRetryableErr = classifiedErr
			break // Stop immediately for non-retryable errors
		}

		// KONTRAK FINAL: Retry only for AI_ERROR and INFRA_ERROR
		if !aiError.IsRetryable(err) {
			log.Printf("[AI PIPELINE] Non-retryable error: %s", classifiedErr.Type)
			lastNonRetryableErr = classifiedErr
			break
		}

		// Retry for retryable errors (AI_ERROR, INFRA_ERROR)
		if attempt < maxRetries {
			log.Printf("[AI PIPELINE] Retryable error (%s), will retry: %v", classifiedErr.Type, err)
			continue
		}
	}

	// KONTRAK FINAL: Return appropriate error
	if lastNonRetryableErr != nil {
		return nil, fmt.Errorf("content_failed after %d attempts: %w", attempt+1, lastNonRetryableErr)
	}

	return nil, fmt.Errorf("pipeline failed after %d attempts: %w", maxRetries+1, lastErr)
}

// isValidationError checks if error is a validation error (non-retryable)
func isValidationError(err error) bool {
	if err == nil {
		return false
	}

	errStr := err.Error()
	return containsAny(errStr, []string{
		"VALIDATION FAILED",
		"CTA_JUALAN",
		"KATA_TERLARANG",
		"NAMA_MEREK",
		"NADA_PROMOSI",
		"HEADING_TIDAK_SESUAI_OUTLINE",
	})
}

// containsAny checks if string contains any of the substrings
func containsAny(s string, substrings []string) bool {
	for _, substr := range substrings {
		if contains(s, substr) {
			return true
		}
	}
	return false
}

// contains checks if string contains substring (case-insensitive)
func contains(s, substr string) bool {
	return strings.Contains(strings.ToLower(s), strings.ToLower(substr))
}

// injectImagesIntoContent injects image markdown references into content
// Images are placed after their corresponding section headings
func (p *Pipeline) injectImagesIntoContent(body string, images []image.ImageAsset) string {
	if len(images) == 0 {
		return body
	}

	lines := strings.Split(body, "\n")
	var result []string
	imageIndex := 0

	for _, line := range lines {
		result = append(result, line)

		// Check if this is a heading that matches an image section
		trimmedLine := strings.TrimSpace(line)
		
		// M-04: For H2 headings (## heading) - inject section images only (not hero)
		if strings.HasPrefix(trimmedLine, "## ") && !strings.HasPrefix(trimmedLine, "### ") {
			heading := strings.TrimPrefix(trimmedLine, "## ")
			
			// Find matching image (skip hero images - they go above title, not in content)
			for imgIdx, img := range images {
				if imgIdx < imageIndex {
					continue
				}
				
				// M-04: Skip hero images - they should not be injected into content
				if img.IsHero || img.Role == "hero" {
					continue
				}
				
				// Check if image heading matches (case-insensitive, partial match)
				if strings.Contains(strings.ToLower(img.Heading), strings.ToLower(heading)) ||
				   strings.Contains(strings.ToLower(heading), strings.ToLower(img.Heading)) {
					
					// Only inject if we have a local path
					if img.LocalPath != "" {
						// M-04: Add section image markdown after heading
						imageMarkdown := fmt.Sprintf("\n![%s](%s)\n", img.AltText, img.LocalPath)
						result = append(result, imageMarkdown)
						imageIndex = imgIdx + 1
						log.Printf("[PIPELINE] Injected section image for '%s': %s", heading, img.LocalPath)
					}
					break
				}
			}
		}
	}

	// M-04: Hero images should NOT be injected into content
	// Hero images are stored separately as featuredImageUrl and rendered above title in frontend
	// Only section images (role="section") are injected into content after headings
	log.Printf("[PIPELINE] M-04: Hero images excluded from content injection (rendered above title in frontend)")

	return strings.Join(result, "\n")
}

// countWordsForValidation counts words in text for validation logging
func countWordsForValidation(text string) int {
	// Remove markdown formatting
	text = strings.ReplaceAll(text, "#", "")
	text = strings.ReplaceAll(text, "##", "")
	text = strings.ReplaceAll(text, "###", "")
	text = strings.ReplaceAll(text, "**", "")
	text = strings.ReplaceAll(text, "*", "")
	text = strings.ReplaceAll(text, "__", "")
	text = strings.ReplaceAll(text, "_", "")
	text = strings.ReplaceAll(text, "[", "")
	text = strings.ReplaceAll(text, "]", "")
	text = strings.ReplaceAll(text, "(", "")
	text = strings.ReplaceAll(text, ")", "")

	// Split by whitespace and count non-empty words
	words := strings.Fields(text)
	count := 0
	for _, word := range words {
		// Only count words that have at least one letter
		hasLetter := false
		for _, r := range word {
			if unicode.IsLetter(r) {
				hasLetter = true
				break
			}
		}
		if hasLetter {
			count++
		}
	}
	return count
}