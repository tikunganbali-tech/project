package quality

import (
	"fmt"
	"log"
	"strings"
)

// PromptVersion tracks prompt evolution
type PromptVersion struct {
	Version    string   `json:"version"`     // e.g., "v1", "v2"
	BasePrompt string   `json:"basePrompt"`  // The actual prompt text
	Status     string   `json:"status"`      // "EVOLVING" or "STABLE"
	CreatedAt  string   `json:"createdAt"`   // Timestamp
}

// PromptRefiner handles prompt evolution based on passing samples
// This is NOT model fine-tuning, but prompt engineering based on data
type PromptRefiner struct {
	currentVersion string
	currentPrompt  string
	store          SampleStore
}

// NewPromptRefiner creates a new prompt refiner
func NewPromptRefiner(basePrompt string, store SampleStore) *PromptRefiner {
	return &PromptRefiner{
		currentVersion: "v1",
		currentPrompt:  basePrompt,
		store:          store,
	}
}

// GetCurrentPrompt returns the current prompt version
func (pr *PromptRefiner) GetCurrentPrompt() (string, string) {
	return pr.currentPrompt, pr.currentVersion
}

// RefinePrompt analyzes passing samples and suggests prompt improvements
// This is internal learning, NOT shared with external services
func (pr *PromptRefiner) RefinePrompt() (string, error) {
	log.Println("[PROMPT REFINER] Starting prompt refinement analysis...")

	// Get all passing samples
	passingSamples, err := pr.store.GetPassingSamples()
	if err != nil {
		return "", fmt.Errorf("failed to get passing samples: %w", err)
	}

	if len(passingSamples) == 0 {
		log.Println("[PROMPT REFINER] No passing samples found - keeping current prompt")
		return pr.currentPrompt, nil
	}

	log.Printf("[PROMPT REFINER] Analyzing %d passing samples...", len(passingSamples))

	// Analyze patterns in passing samples
	patterns := pr.analyzePassingPatterns(passingSamples)

	// Build refined prompt based on patterns
	refinedPrompt := pr.buildRefinedPrompt(pr.currentPrompt, patterns)

	// Increment version
	oldVersion := pr.currentVersion
	pr.currentVersion = incrementVersion(pr.currentVersion)
	pr.currentPrompt = refinedPrompt

	log.Printf("[PROMPT REFINER] Prompt refined: %s -> %s", oldVersion, pr.currentVersion)
	return refinedPrompt, nil
}

// analyzePassingPatterns extracts common patterns from passing samples
func (pr *PromptRefiner) analyzePassingPatterns(samples []GenerationSample) map[string]interface{} {
	patterns := make(map[string]interface{})

	if len(samples) == 0 {
		return patterns
	}

	// Calculate average metrics from passing samples
	avgWordCount := 0
	avgDepthScore := 0.0
	for _, sample := range samples {
		avgWordCount += sample.Metrics.WordCount
		avgDepthScore += sample.Metrics.DepthScore
	}
	avgWordCount /= len(samples)
	avgDepthScore /= float64(len(samples))

	patterns["avgWordCount"] = avgWordCount
	patterns["avgDepthScore"] = avgDepthScore
	patterns["sampleCount"] = len(samples)

	// Extract common structural elements
	// (In a more sophisticated implementation, we could analyze actual content patterns)
	patterns["structureCompliance"] = 1.0 // All passing samples have 100% structure compliance by definition

	log.Printf("[PROMPT REFINER] Patterns identified: avgWordCount=%d, avgDepthScore=%.2f, samples=%d",
		avgWordCount, avgDepthScore, len(samples))

	return patterns
}

// buildRefinedPrompt constructs refined prompt based on patterns
// This maintains core requirements but adjusts based on what works
func (pr *PromptRefiner) buildRefinedPrompt(basePrompt string, patterns map[string]interface{}) string {
	// Start with base prompt
	refined := basePrompt

	// Add guidance based on patterns (if we have enough data)
	sampleCount, ok := patterns["sampleCount"].(int)
	if ok && sampleCount >= 3 {
		avgWordCount, _ := patterns["avgWordCount"].(int)
		avgDepthScore, _ := patterns["avgDepthScore"].(float64)

		// Add natural guidance about word count (not forced, but informed)
		if avgWordCount >= 1200 && avgWordCount <= 1800 {
			refined += "\n\nPENTING: Tulis konten dengan panjang natural sekitar 1200-1800 kata. "
			refined += "Jangan paksa panjang dengan filler, tapi pastikan kedalaman dan cakupan memadai.\n"
		}

		// Add guidance about depth if we see good patterns
		if avgDepthScore >= 0.75 {
			refined += "\nPENTING: Konten harus mendalam dan substantif. "
			refined += "Setiap paragraf harus memberikan nilai informasi yang jelas. "
			refined += "Hindari paragraf yang hanya mengulang poin sebelumnya.\n"
		}
	}

	return refined
}

// CheckStability checks if prompt is stable (3-5 consecutive passing outputs)
func (pr *PromptRefiner) CheckStability() (bool, error) {
	// Get recent samples
	recentSamples, err := pr.store.GetRecentSamples(5)
	if err != nil {
		return false, fmt.Errorf("failed to get recent samples: %w", err)
	}

	// Need at least 3 samples
	if len(recentSamples) < 3 {
		return false, nil
	}

	// Check if all recent samples (from current version) passed
	allPassed := true
	for _, sample := range recentSamples {
		if !sample.PassQualityProfile {
			allPassed = false
			break
		}
	}

	if allPassed {
		log.Printf("[PROMPT REFINER] Prompt stability detected: %d consecutive passing samples", len(recentSamples))
		return true, nil
	}

	return false, nil
}

// SetStable marks the current prompt as stable baseline
func (pr *PromptRefiner) SetStable() {
	log.Printf("[PROMPT REFINER] Marking prompt %s as STABLE baseline", pr.currentVersion)
	// In a full implementation, this would be persisted
	// For now, we just log it
}

// Helper function to increment version
func incrementVersion(version string) string {
	if !strings.HasPrefix(version, "v") {
		return "v1"
	}

	versionNum := strings.TrimPrefix(version, "v")
	// Simple increment (in production, might want to parse as int)
	if versionNum == "1" {
		return "v2"
	} else if versionNum == "2" {
		return "v3"
	}
	// Continue incrementing...
	return fmt.Sprintf("v%s", versionNum)
}
