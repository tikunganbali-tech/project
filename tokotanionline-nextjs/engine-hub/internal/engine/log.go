package engine

import "time"

type EngineLog struct {
	Level     string    `json:"level"` // INFO, WARN, ERROR
	Message   string    `json:"message"`
	JobID     string    `json:"jobId,omitempty"`
	Timestamp time.Time `json:"timestamp"`
}
