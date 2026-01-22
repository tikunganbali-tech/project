package jobs

import "time"

type JobStatus string

const (
	JobReady   JobStatus = "READY"
	JobQueued  JobStatus = "QUEUED"
	JobRunning JobStatus = "RUNNING"
	JobDone    JobStatus = "DONE"
	JobFailed  JobStatus = "FAILED"
)

// EngineJob matches STEP 18B specification
type EngineJob struct {
	ID        string    `json:"id"`
	Type      string    `json:"type"`
	Status    JobStatus `json:"status"` // READY, RUNNING, DONE, FAILED
	CreatedAt time.Time `json:"createdAt"`
}

// Job is the internal job structure (kept for backward compatibility)
type Job struct {
	ID        string    `json:"id"`
	Engine    string    `json:"engine"`
	Name      string    `json:"name"`
	Type      string    `json:"type"` // Job type (e.g., "content", "image", "smart-adset")
	Status    JobStatus `json:"status"`
	CreatedAt time.Time `json:"createdAt"`
	StartedAt time.Time `json:"startedAt,omitempty"`
	EndedAt   time.Time `json:"endedAt,omitempty"`
}


