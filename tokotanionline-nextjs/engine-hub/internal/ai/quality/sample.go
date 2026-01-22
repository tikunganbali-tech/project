package quality

import (
	"encoding/json"
	"time"

	"engine-hub/internal/ai/content"
)

// GenerationSample represents a learning data point
// This is NOT published content, but data for prompt refinement
type GenerationSample struct {
	// Input data
	InputOutline string `json:"inputOutline"` // The outline used

	// Prompt version for tracking evolution
	PromptVersion string `json:"promptVersion"` // e.g., "v1", "v2", "v3"

	// Generated output
	OutputText string `json:"outputText"` // Full generated article (body)

	// Quality metrics
	Metrics Metrics `json:"metrics"`

	// Quality profile pass/fail
	PassQualityProfile bool `json:"passQualityProfile"` // true if metrics pass baseline B

	// Metadata
	Timestamp time.Time `json:"timestamp"`
	Category  string    `json:"category"`  // K1, K2, etc.
	ContentType string  `json:"contentType"` // DERIVATIVE, CORNERSTONE, etc. (stored as string for JSON)
}

// NewGenerationSample creates a new generation sample with metrics analysis
func NewGenerationSample(
	req content.ContentRequest,
	result *content.ContentResult,
	promptVersion string,
) GenerationSample {
	// Analyze metrics
	metrics := AnalyzeContent(result, req.Outline)

	// Check against quality profile
	profile := DefaultQualityProfile()
	passes := profile.Pass(metrics)

	return GenerationSample{
		InputOutline:       req.Outline,
		PromptVersion:      promptVersion,
		OutputText:         result.Body,
		Metrics:            metrics,
		PassQualityProfile: passes,
		Timestamp:          time.Now(),
		Category:           req.Category,
		ContentType:        string(req.ContentType), // Convert ContentType enum to string
	}
}

// ToJSON converts sample to JSON for storage
func (s GenerationSample) ToJSON() ([]byte, error) {
	return json.Marshal(s)
}

// FromJSON creates sample from JSON
func FromJSON(data []byte) (GenerationSample, error) {
	var sample GenerationSample
	err := json.Unmarshal(data, &sample)
	return sample, err
}

// SampleStore is an interface for storing generation samples
// This enables learning data persistence
type SampleStore interface {
	Save(sample GenerationSample) error
	GetByPromptVersion(version string) ([]GenerationSample, error)
	GetPassingSamples() ([]GenerationSample, error)
	GetRecentSamples(limit int) ([]GenerationSample, error)
}

// InMemorySampleStore is a simple in-memory implementation for development
// In production, this should be replaced with database-backed store
type InMemorySampleStore struct {
	samples []GenerationSample
}

// NewInMemorySampleStore creates a new in-memory sample store
func NewInMemorySampleStore() *InMemorySampleStore {
	return &InMemorySampleStore{
		samples: make([]GenerationSample, 0),
	}
}

// Save stores a generation sample
func (s *InMemorySampleStore) Save(sample GenerationSample) error {
	s.samples = append(s.samples, sample)
	return nil
}

// GetByPromptVersion returns all samples for a specific prompt version
func (s *InMemorySampleStore) GetByPromptVersion(version string) ([]GenerationSample, error) {
	var result []GenerationSample
	for _, sample := range s.samples {
		if sample.PromptVersion == version {
			result = append(result, sample)
		}
	}
	return result, nil
}

// GetPassingSamples returns all samples that passed quality profile
func (s *InMemorySampleStore) GetPassingSamples() ([]GenerationSample, error) {
	var result []GenerationSample
	for _, sample := range s.samples {
		if sample.PassQualityProfile {
			result = append(result, sample)
		}
	}
	return result, nil
}

// GetRecentSamples returns the most recent samples, limited by limit
func (s *InMemorySampleStore) GetRecentSamples(limit int) ([]GenerationSample, error) {
	if limit <= 0 || limit > len(s.samples) {
		limit = len(s.samples)
	}

	// Return last N samples (most recent first)
	start := len(s.samples) - limit
	if start < 0 {
		start = 0
	}

	result := make([]GenerationSample, limit)
	copy(result, s.samples[start:])
	return result, nil
}
