package jobs

import "time"

type JobResult struct {
	JobID     string    `json:"jobId"`
	Engine    string    `json:"engine"`
	Name      string    `json:"name"`
	Output    string    `json:"output"`
	CreatedAt time.Time `json:"createdAt"`
}


