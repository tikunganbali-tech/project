package content

import (
	"fmt"
	"log"
	"time"

	"github.com/google/uuid"
	"github.com/lib/pq"
)

// WriteResult writes the process result to ContentResult and BlogPost
// Sets job status to DONE or FAILED
// Returns the blog post ID if successful, empty string if failed
func WriteResult(job *ContentJob, result *ProcessResult) (string, error) {
	db := GetDB()
	if db == nil {
		return "", fmt.Errorf("database connection not initialized")
	}

	// Start transaction for atomic writes
	tx, err := db.Begin()
	if err != nil {
		return "", fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback() // Rollback if not committed

	now := time.Now()

	if result.Error != nil {
		// Job failed - write error summary
		errorSummary := result.Error.Error()
		
		// Create ContentResult with error summary
		resultID := uuid.New().String()
		insertResultQuery := `
			INSERT INTO "ContentResult" (
				id, "jobId", "postId", summary, outline, metrics, 
				"engineVersion", "createdAt"
			) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		`
		
		_, err = tx.Exec(
			insertResultQuery,
			resultID,
			job.ID,
			nil, // No post ID on failure
			errorSummary,
			nil, // No outline on failure
			nil, // No metrics on failure
			"1.0.0", // Engine version
			now,
		)
		if err != nil {
			return "", fmt.Errorf("failed to insert ContentResult: %w", err)
		}

		// Update job status to FAILED and store error
		updateJobQuery := `
			UPDATE "ContentJob"
			SET status = $1, "finishedAt" = $2, error = $4
			WHERE id = $3
		`
		
		_, err = tx.Exec(updateJobQuery, string(JobStatusFailed), now, job.ID, errorSummary)
		if err != nil {
			return "", fmt.Errorf("failed to update job status to FAILED: %w", err)
		}

		// Commit transaction
		if err := tx.Commit(); err != nil {
			return "", fmt.Errorf("failed to commit transaction: %w", err)
		}

		return "", nil
	}

	// FASE D - D4: IDEMPOTENCY & ANTI DUPLIKASI
	// Check if slug already exists (prevent duplicates)
	var existingPostID string
	checkSlugQuery := `SELECT id FROM "BlogPost" WHERE slug = $1 LIMIT 1`
	err = tx.QueryRow(checkSlugQuery, result.Slug).Scan(&existingPostID)
	if err == nil {
		// Slug exists - this is a duplicate
		log.Printf("[IDEMPOTENCY] Duplicate slug detected: %s (existing post: %s) - skipping insert", result.Slug, existingPostID)
		// Update job to link to existing post instead of creating new one
		// This prevents duplicate content
		tx.Rollback()
		return "", fmt.Errorf("duplicate slug detected: %s", result.Slug)
	}
	// err == sql.ErrNoRows is expected (slug doesn't exist, we can proceed)

	// FASE D - D4: Check if keyword is already processed (additional deduplication)
	if result.PrimaryKeyword != nil {
		var existingKeywordPostID string
		checkKeywordQuery := `SELECT id FROM "BlogPost" WHERE "primaryKeyword" = $1 LIMIT 1`
		err = tx.QueryRow(checkKeywordQuery, *result.PrimaryKeyword).Scan(&existingKeywordPostID)
		if err == nil {
			log.Printf("[IDEMPOTENCY] Duplicate keyword detected: %s (existing post: %s) - skipping insert", *result.PrimaryKeyword, existingKeywordPostID)
			tx.Rollback()
			return "", fmt.Errorf("duplicate keyword detected: %s", *result.PrimaryKeyword)
		}
	}

	// Job succeeded - write BlogPost and ContentResult
	blogPostIDVal := uuid.New().String()

	// FASE D - D3: FEATURE_FREEZE check - if enabled, don't create new posts
	if isFeatureFreezeEnabled() {
		log.Printf("[FEATURE-FREEZE] Feature freeze enabled - skipping post creation for job %s", job.ID)
		tx.Rollback()
		return "", fmt.Errorf("feature freeze enabled - post creation blocked")
	}

	// Insert BlogPost (status = DRAFT - not auto-published)
	insertPostQuery := `
		INSERT INTO "BlogPost" (
			id, title, slug, content, excerpt, status,
			"seoTitle", "seoDescription", "seoSchema",
			"primaryKeyword", "secondaryKeywords",
			"wordCount", "readingTime",
			"createdAt", "updatedAt"
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
	`

	var excerptVal *string
	if result.Excerpt != nil {
		excerptVal = result.Excerpt
	}

	var seoTitleVal *string
	if result.SeoTitle != nil {
		seoTitleVal = result.SeoTitle
	}

	var seoDescVal *string
	if result.SeoDescription != nil {
		seoDescVal = result.SeoDescription
	}

	var seoSchemaVal []byte
	if len(result.SeoSchema) > 0 {
		seoSchemaVal = result.SeoSchema
	} else {
		seoSchemaVal = nil
	}

	var primaryKeywordVal *string
	if result.PrimaryKeyword != nil {
		primaryKeywordVal = result.PrimaryKeyword
	}

	// Convert secondaryKeywords to PostgreSQL array format using pq.Array
	var secondaryKeywordsArr pq.StringArray
	if len(result.SecondaryKeywords) > 0 {
		secondaryKeywordsArr = pq.StringArray(result.SecondaryKeywords)
	} else {
		secondaryKeywordsArr = pq.StringArray{}
	}

	var wordCountVal *int
	if result.WordCount != nil {
		wordCountVal = result.WordCount
	}

	var readingTimeVal *int
	if result.ReadingTime != nil {
		readingTimeVal = result.ReadingTime
	}

	_, err = tx.Exec(
		insertPostQuery,
		blogPostIDVal,
		result.Title,
		result.Slug,
		result.Content,
		excerptVal,
		string(PostStatusDraft), // Status = DRAFT (not auto-published)
		seoTitleVal,
		seoDescVal,
		seoSchemaVal,
		primaryKeywordVal,
		secondaryKeywordsArr,
		wordCountVal,
		readingTimeVal,
		now,
		now,
	)
	if err != nil {
		return "", fmt.Errorf("failed to insert BlogPost: %w", err)
	}

	// Create ContentResult
	resultID := uuid.New().String()
	
	summary := fmt.Sprintf("Content generated successfully. Title: %s, Word Count: %d, Reading Time: %d min",
		result.Title,
		getIntValue(result.WordCount),
		getIntValue(result.ReadingTime),
	)

	var outlineVal []byte
	if len(result.Outline) > 0 {
		outlineVal = result.Outline
	} else {
		outlineVal = nil
	}

	var metricsVal []byte
	if len(result.Metrics) > 0 {
		metricsVal = result.Metrics
	} else {
		metricsVal = nil
	}

	insertResultQuery := `
		INSERT INTO "ContentResult" (
			id, "jobId", "postId", summary, outline, metrics,
			"engineVersion", "createdAt"
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
	`

	_, err = tx.Exec(
		insertResultQuery,
		resultID,
		job.ID,
		blogPostIDVal,
		summary,
		outlineVal,
		metricsVal,
		"1.0.0", // Engine version
		now,
	)
	if err != nil {
		return "", fmt.Errorf("failed to insert ContentResult: %w", err)
	}

	// Update job status to DONE
	updateJobQuery := `
		UPDATE "ContentJob"
		SET status = $1, "finishedAt" = $2
		WHERE id = $3
	`

	_, err = tx.Exec(updateJobQuery, string(JobStatusDone), now, job.ID)
	if err != nil {
		return "", fmt.Errorf("failed to update job status to DONE: %w", err)
	}

	// Commit transaction
	if err := tx.Commit(); err != nil {
		return "", fmt.Errorf("failed to commit transaction: %w", err)
	}

	return blogPostIDVal, nil
}


// getIntValue safely gets int value from pointer
func getIntValue(ptr *int) int {
	if ptr == nil {
		return 0
	}
	return *ptr
}
