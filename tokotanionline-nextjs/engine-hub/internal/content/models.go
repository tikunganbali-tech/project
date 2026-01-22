package content

import (
	"database/sql/driver"
	"encoding/json"
	"time"
)

// JobType matches Prisma enum JobType
type JobType string

const (
	JobTypeGenerate JobType = "GENERATE"
	JobTypeRefresh  JobType = "REFRESH"
	JobTypeOptimize JobType = "OPTIMIZE"
)

// JobStatus matches Prisma enum JobStatus
type JobStatus string

const (
	JobStatusPending JobStatus = "PENDING"
	JobStatusRunning JobStatus = "RUNNING"
	JobStatusDone    JobStatus = "DONE"
	JobStatusFailed  JobStatus = "FAILED"
)

// PostStatus matches Prisma enum PostStatus
type PostStatus string

const (
	PostStatusDraft     PostStatus = "DRAFT"
	PostStatusPublished PostStatus = "PUBLISHED"
	PostStatusArchived  PostStatus = "ARCHIVED"
)

// ContentJob represents the ContentJob model from Prisma
type ContentJob struct {
	ID          string          `json:"id"`
	Type        JobType         `json:"type"`
	Status      JobStatus       `json:"status"`
	RequestedBy string          `json:"requestedBy"`
	ScheduledAt *time.Time      `json:"scheduledAt,omitempty"`
	StartedAt   *time.Time      `json:"startedAt,omitempty"`
	FinishedAt  *time.Time      `json:"finishedAt,omitempty"`
	Params      json.RawMessage `json:"params,omitempty"`
	CreatedAt   time.Time       `json:"createdAt"`
}

// BlogPost represents the BlogPost model from Prisma
type BlogPost struct {
	ID               string          `json:"id"`
	Title            string          `json:"title"`
	Slug             string          `json:"slug"`
	Content          string          `json:"content"`
	Excerpt          *string         `json:"excerpt,omitempty"`
	Status           PostStatus      `json:"status"`
	SeoTitle         *string         `json:"seoTitle,omitempty"`
	SeoDescription   *string         `json:"seoDescription,omitempty"`
	SeoSchema        json.RawMessage `json:"seoSchema,omitempty"`
	PrimaryKeyword   *string         `json:"primaryKeyword,omitempty"`
	SecondaryKeywords []string       `json:"secondaryKeywords,omitempty"`
	WordCount        *int            `json:"wordCount,omitempty"`
	ReadingTime      *int            `json:"readingTime,omitempty"`
	PublishedAt      *time.Time      `json:"publishedAt,omitempty"`
	CreatedAt        time.Time       `json:"createdAt"`
	UpdatedAt        time.Time       `json:"updatedAt"`
}

// ContentResult represents the ContentResult model from Prisma
type ContentResult struct {
	ID            string          `json:"id"`
	JobID         string          `json:"jobId"`
	PostID        *string         `json:"postId,omitempty"`
	Summary       *string         `json:"summary,omitempty"`
	Outline       json.RawMessage `json:"outline,omitempty"`
	Metrics       json.RawMessage `json:"metrics,omitempty"`
	EngineVersion *string         `json:"engineVersion,omitempty"`
	CreatedAt     time.Time       `json:"createdAt"`
}

// GenerateParams represents parameters for GENERATE job type
type GenerateParams struct {
	Keyword          string   `json:"keyword"`                    // Primary keyword (REQUIRED)
	SecondaryKeywords []string `json:"secondaryKeywords,omitempty"` // Secondary keywords (OPTIONAL - dari input user, bukan AI)
	CategoryID       *string  `json:"categoryId,omitempty"`
	WordCount        *int     `json:"wordCount,omitempty"`
}

// Scan implements the sql.Scanner interface for JobType
func (j *JobType) Scan(value interface{}) error {
	if value == nil {
		*j = ""
		return nil
	}
	*j = JobType(value.([]byte))
	return nil
}

// Value implements the driver.Valuer interface for JobType
func (j JobType) Value() (driver.Value, error) {
	return string(j), nil
}

// Scan implements the sql.Scanner interface for JobStatus
func (j *JobStatus) Scan(value interface{}) error {
	if value == nil {
		*j = ""
		return nil
	}
	*j = JobStatus(value.([]byte))
	return nil
}

// Value implements the driver.Valuer interface for JobStatus
func (j JobStatus) Value() (driver.Value, error) {
	return string(j), nil
}

// Scan implements the sql.Scanner interface for PostStatus
func (p *PostStatus) Scan(value interface{}) error {
	if value == nil {
		*p = ""
		return nil
	}
	*p = PostStatus(value.([]byte))
	return nil
}

// Value implements the driver.Valuer interface for PostStatus
func (p PostStatus) Value() (driver.Value, error) {
	return string(p), nil
}
