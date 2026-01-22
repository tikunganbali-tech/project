package api

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"engine-hub/internal/ai/content"
	"engine-hub/internal/ai/quality"
	"engine-hub/internal/ai/workflow"
)

// ControlledProductionRequest represents a controlled production request
// This generates articles for learning, NOT for publishing
type ControlledProductionRequest struct {
	Category    string `json:"category"`    // K1
	ContentType string `json:"contentType"` // DERIVATIVE
	Language    string `json:"language"`    // id-ID
	Count       int    `json:"count"`       // Number of articles to generate (default: 3)
}

// ControlledProductionResponse represents the result of controlled production
type ControlledProductionResponse struct {
	Status      string                      `json:"status"`      // SUCCESS or FAILED
	SampleCount int                         `json:"sampleCount"` // Number of samples generated
	Samples     []ControlledProductionSample `json:"samples"`     // Individual sample results
	Summary     string                      `json:"summary"`     // Human-readable summary
}

// ControlledProductionSample represents a single generation sample result
type ControlledProductionSample struct {
	SampleNumber    int                 `json:"sampleNumber"`
	PromptVersion   string              `json:"promptVersion"`
	Metrics         quality.Metrics     `json:"metrics"`
	Pass            bool                `json:"pass"`
	FailureReasons  []string            `json:"failureReasons,omitempty"`
	Title           string              `json:"title,omitempty"`
	WordCount       int                 `json:"wordCount"`
	DepthScore      float64             `json:"depthScore"`
	RepetitionRate  float64             `json:"repetitionRate"`
	StructureCompl  float64             `json:"structureCompliance"`
	Readability     string              `json:"readability"`
}

// ControlledProduction handles POST /api/engine/ai/controlled-production
// This is BACKEND ONLY - generates learning samples with quality metrics
func ControlledProduction(w http.ResponseWriter, r *http.Request) {
	log.Println("[CONTROLLED PRODUCTION] Endpoint hit")

	defer func() {
		if r := recover(); r != nil {
			log.Printf("[CONTROLLED PRODUCTION] PANIC RECOVERED: %v", r)
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

	var req ControlledProductionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		log.Printf("[CONTROLLED PRODUCTION] Failed to parse request: %v", err)
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Default values
	if req.Count <= 0 {
		req.Count = 3
	}
	if req.Language == "" {
		req.Language = "id-ID"
	}
	if req.Category == "" {
		req.Category = "K1"
	}
	if req.ContentType == "" {
		req.ContentType = "DERIVATIVE"
	}

	log.Printf("[CONTROLLED PRODUCTION] Generating %d samples: category=%s, contentType=%s",
		req.Count, req.Category, req.ContentType)

	// Initialize quality learning system
	// Use appropriate profile based on content type
	// Convert string to ContentType enum
	contentType := content.ContentType(req.ContentType)
	var profile quality.QualityProfile
	if contentType == content.ContentDerivativeLong {
		profile = quality.DerivativeLongQualityProfile()
		log.Println("[CONTROLLED PRODUCTION] Using DerivativeLongQualityProfile (1200-2000 words)")
	} else if contentType == content.ContentDerivative {
		profile = quality.DerivativeQualityProfile()
		log.Println("[CONTROLLED PRODUCTION] Using DerivativeQualityProfile (650-1000 words)")
	} else {
		profile = quality.DefaultQualityProfile()
		log.Println("[CONTROLLED PRODUCTION] Using DefaultQualityProfile (1200-2000 words)")
	}
	store := quality.NewInMemorySampleStore()
	
	// Get base prompt from generator
	baseGenerator := content.NewGenerator()
	basePrompt := baseGenerator.GetBasePrompt()
	
	// Initialize prompt refiner
	refiner := quality.NewPromptRefiner(basePrompt, store)
	promptVersion, _ := refiner.GetCurrentPrompt()

	// Generate samples
	var sampleResults []ControlledProductionSample
	
	for i := 1; i <= req.Count; i++ {
		log.Printf("[CONTROLLED PRODUCTION] Generating sample %d/%d...", i, req.Count)
		
		// Load outline for derivative article
		outline, err := loadDerivativeOutline(req.Category, i)
		if err != nil {
			log.Printf("[CONTROLLED PRODUCTION] Failed to load outline for sample %d: %v", i, err)
			continue
		}

		// Create content request (NO forced word count)
		// Convert string to ContentType enum
		contentType := content.ContentType(req.ContentType)
		contentReq := content.ContentRequest{
			ContentType: contentType,
			Category:    req.Category,
			Outline:     outline,
			Language:    req.Language,
		}

		// Generate content using pipeline
		pipeline := workflow.NewPipeline()
		draft, err := pipeline.Execute(contentReq)
		if err != nil {
			log.Printf("[CONTROLLED PRODUCTION] Generation failed for sample %d: %v", i, err)
			sampleResults = append(sampleResults, ControlledProductionSample{
				SampleNumber: i,
				PromptVersion: promptVersion,
				Pass: false,
				FailureReasons: []string{fmt.Sprintf("Generation failed: %v", err)},
			})
			continue
		}

		// Analyze quality metrics
		metrics := quality.AnalyzeContent(&draft.Content, outline)

		// Check against quality profile
		passes := profile.Pass(metrics)
		var failureReasons []string
		if !passes {
			failureReasons = profile.GetFailureReasons(metrics)
		}

		// Create and save sample
		sample := quality.NewGenerationSample(contentReq, &draft.Content, promptVersion)
		store.Save(sample)

		// Add to results
		sampleResults = append(sampleResults, ControlledProductionSample{
			SampleNumber:    i,
			PromptVersion:   promptVersion,
			Metrics:         metrics,
			Pass:            passes,
			FailureReasons:  failureReasons,
			Title:           draft.Content.Title,
			WordCount:       metrics.WordCount,
			DepthScore:      metrics.DepthScore,
			RepetitionRate:  metrics.RepetitionRate,
			StructureCompl:  metrics.StructureCompliance,
			Readability:     metrics.HumanReadability,
		})

		log.Printf("[CONTROLLED PRODUCTION] Sample %d: PASS=%v, wordCount=%d, depthScore=%.2f",
			i, passes, metrics.WordCount, metrics.DepthScore)
	}

	// Generate summary
	summary := generateSummary(sampleResults)

	// Build response
	response := ControlledProductionResponse{
		Status:      "SUCCESS",
		SampleCount: len(sampleResults),
		Samples:     sampleResults,
		Summary:     summary,
	}

	log.Printf("[CONTROLLED PRODUCTION] Completed: %d samples generated", len(sampleResults))

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(response)
}

// loadDerivativeOutline loads outline for derivative article
// Reads from docs directory relative to workspace root
func loadDerivativeOutline(category string, index int) (string, error) {
	// Map index to outline file (1-based, cycles through 3 outlines)
	outlineFiles := map[int]string{
		1: "OUTLINE-K1-TURUNAN-1-JENIS-SAPROTAN.md",
		2: "OUTLINE-K1-TURUNAN-2-CARA-MENENTUKAN.md",
		3: "OUTLINE-K1-TURUNAN-3-KESALAHAN-UMUM.md",
	}

	// Cycle if index > 3
	outlineIndex := ((index - 1) % 3) + 1
	fileName, ok := outlineFiles[outlineIndex]
	if !ok {
		return "", fmt.Errorf("no outline file for index %d", outlineIndex)
	}

	// Try multiple possible paths (relative to engine-hub directory)
	possiblePaths := []string{
		filepath.Join("..", "docs", fileName),
		filepath.Join("docs", fileName),
		filepath.Join("../docs", fileName),
	}

	var fileContent []byte
	var readErr error

	for _, path := range possiblePaths {
		if _, statErr := os.Stat(path); statErr == nil {
			fileContent, readErr = os.ReadFile(path)
			if readErr == nil {
				break
			}
		}
	}

	if len(fileContent) == 0 {
		return "", fmt.Errorf("failed to read outline file: %s (tried paths: %v)", fileName, possiblePaths)
	}

	// Extract outline content section (typically from line 28 onwards, until end or specific marker)
	// For now, return the full file content - the outline section starts around line 28
	lines := strings.Split(string(fileContent), "\n")
	
	// Find the start of the outline section (usually after metadata, around "## 📐 STRUKTUR KONTEN")
	startIdx := 0
	for i, line := range lines {
		if strings.Contains(line, "STRUKTUR KONTEN") || strings.Contains(line, "STRUKTUR KONTEN") {
			startIdx = i
			break
		}
	}
	
	// If not found, start from line 28 (typical outline start)
	if startIdx == 0 {
		startIdx = 27 // 0-indexed, so line 28 is index 27
		if startIdx >= len(lines) {
			startIdx = 0
		}
	}

	// Extract from start to end (or until "END OF OUTLINE" marker)
	endIdx := len(lines)
	for i := startIdx; i < len(lines); i++ {
		if strings.Contains(lines[i], "END OF OUTLINE") || strings.Contains(lines[i], "OUTLINE SELESAI") {
			endIdx = i
			break
		}
	}

	outlineContent := strings.Join(lines[startIdx:endIdx], "\n")
	return strings.TrimSpace(outlineContent), nil
}

// generateSummary creates human-readable summary of results
func generateSummary(samples []ControlledProductionSample) string {
	if len(samples) == 0 {
		return "No samples generated."
	}

	var summary strings.Builder
	summary.WriteString("CONTROLLED PRODUCTION SUMMARY\n")
	summary.WriteString("============================\n\n")

	passCount := 0
	failCount := 0

	for _, sample := range samples {
		status := "FAIL"
		if sample.Pass {
			status = "PASS"
			passCount++
		} else {
			failCount++
		}

		summary.WriteString(fmt.Sprintf("SAMPLE #%d: %s", sample.SampleNumber, status))
		
		if !sample.Pass && len(sample.FailureReasons) > 0 {
			summary.WriteString(" — ")
			summary.WriteString(strings.Join(sample.FailureReasons, "; "))
		}
		
		summary.WriteString("\n")
		summary.WriteString(fmt.Sprintf("  Word Count: %d, Depth: %.2f, Repetition: %.2f%%, Structure: %.2f%%, Readability: %s\n",
			sample.WordCount,
			sample.DepthScore,
			sample.RepetitionRate*100,
			sample.StructureCompl*100,
			sample.Readability))
		summary.WriteString("\n")
	}

	summary.WriteString(fmt.Sprintf("TOTAL: %d PASS, %d FAIL\n", passCount, failCount))
	
	passRate := float64(passCount) / float64(len(samples)) * 100
	summary.WriteString(fmt.Sprintf("PASS RATE: %.1f%%\n", passRate))

	return summary.String()
}
