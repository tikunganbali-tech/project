package content

import (
	"encoding/json"
	"fmt"
	"log"
)

// ProcessResult holds the result of processing a job
type ProcessResult struct {
	Title            string
	Slug             string
	Content          string
	Excerpt          *string
	SeoTitle         *string
	SeoDescription   *string
	SeoSchema        json.RawMessage
	PrimaryKeyword   *string
	SecondaryKeywords []string
	WordCount        *int
	ReadingTime      *int
	Outline          json.RawMessage
	Metrics          json.RawMessage
	Error            error
}

// ProcessJob processes a ContentJob based on its type
func ProcessJob(job *ContentJob) (*ProcessResult, error) {
	switch job.Type {
	case JobTypeGenerate:
		return processGenerateJob(job)
	case JobTypeRefresh:
		return processRefreshJob(job)
	case JobTypeOptimize:
		return processOptimizeJob(job)
	default:
		return nil, fmt.Errorf("unknown job type: %s", job.Type)
	}
}

// processGenerateJob handles GENERATE type jobs
func processGenerateJob(job *ContentJob) (*ProcessResult, error) {
	// Parse params
	var params GenerateParams
	if len(job.Params) > 0 {
		if err := json.Unmarshal(job.Params, &params); err != nil {
			return nil, fmt.Errorf("failed to parse job params: %w", err)
		}
	}

	// STEP 1: Keyword TIDAK BOLEH diubah atau di-expand AI
	// Gunakan keyword dari input params tanpa modifikasi
	primaryKeyword := params.Keyword
	if primaryKeyword == "" {
		return nil, fmt.Errorf("primary keyword is required")
	}
	
	// Secondary keywords dari params (jika ada), bukan dari expansion
	var secondaryKeywords []string
	if params.SecondaryKeywords != nil {
		secondaryKeywords = params.SecondaryKeywords
	}
	
	// Untuk backward compatibility: buat keywords list (tidak digunakan untuk expansion)
	keywords := []string{primaryKeyword}
	keywords = append(keywords, secondaryKeywords...)

	// STEP 20C-2: Outline generation
	outline, err := generateOutline(primaryKeyword, keywords, params.CategoryID)
	if err != nil {
		return nil, fmt.Errorf("outline generation failed: %w", err)
	}

	// STEP 20C-2: Content generation
	wordCount := 1500 // Default
	if params.WordCount != nil {
		wordCount = *params.WordCount
	}

	content, err := generateContent(primaryKeyword, keywords, outline, wordCount)
	if err != nil {
		return nil, fmt.Errorf("content generation failed: %w", err)
	}

	// STEP 20C-2: SEO metadata
	seoMeta, err := generateSEOMetadata(primaryKeyword, content, params.CategoryID)
	if err != nil {
		log.Printf("[CONTENT-ENGINE] SEO metadata generation failed (non-fatal): %v", err)
		// Continue with basic metadata
		seoMeta = &SEOMetadata{
			Title:       generateTitleFromKeyword(primaryKeyword),
			Description: generateExcerptFromContent(content),
		}
	}

	// STEP 20C-2: Reading time & word count
	actualWordCount := countWords(content)
	readingTime := calculateReadingTime(actualWordCount)

	// Generate excerpt
	excerpt := generateExcerptFromContent(content)
	if len(excerpt) > 200 {
		excerpt = excerpt[:200] + "..."
	}

	// Generate slug from title
	slug := generateSlug(seoMeta.Title)

	// Prepare metrics
	metrics := map[string]interface{}{
		"wordCount":    actualWordCount,
		"readingTime":  readingTime,
		"keywordCount": len(keywords),
		"outlineSize":  len(outline),
	}
	metricsJSON, _ := json.Marshal(metrics)

	result := &ProcessResult{
		Title:            seoMeta.Title,
		Slug:             slug,
		Content:          content,
		Excerpt:          &excerpt,
		SeoTitle:         &seoMeta.Title,
		SeoDescription:   &seoMeta.Description,
		SeoSchema:        seoMeta.Schema,
		PrimaryKeyword:   &primaryKeyword,
		SecondaryKeywords: keywords[1:], // Skip first (primary)
		WordCount:        &actualWordCount,
		ReadingTime:      &readingTime,
		Outline:          outline,
		Metrics:          metricsJSON,
	}

	return result, nil
}

// processRefreshJob handles REFRESH type jobs (placeholder)
func processRefreshJob(job *ContentJob) (*ProcessResult, error) {
	log.Printf("[CONTENT-ENGINE] REFRESH job type not yet implemented (jobId: %s)", job.ID)
	// Placeholder: log only
	return nil, fmt.Errorf("REFRESH job type not yet implemented")
}

// processOptimizeJob handles OPTIMIZE type jobs (placeholder)
func processOptimizeJob(job *ContentJob) (*ProcessResult, error) {
	log.Printf("[CONTENT-ENGINE] OPTIMIZE job type not yet implemented (jobId: %s)", job.ID)
	// Placeholder: log only
	return nil, fmt.Errorf("OPTIMIZE job type not yet implemented")
}
