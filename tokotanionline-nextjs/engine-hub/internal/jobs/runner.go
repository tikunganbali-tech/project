package jobs

import (
	"fmt"
	"time"

	"github.com/google/uuid"

	"engine-hub/internal/engine"
)

// Run creates and runs a new job (old API, kept for backward compatibility)
func Run(engineName string, jobName string) {
	id := uuid.New().String()
	now := time.Now()

	job := Job{
		ID:        id,
		Engine:    engineName,
		Name:      jobName,
		Type:      engineName, // Use engine name as type
		Status:    JobReady,   // STEP 18B-1: Start as READY (manual run only)
		CreatedAt: now,
	}
	Add(job)

	// Auto-run for backward compatibility (old API)
	go func() {
		defer func() {
			if r := recover(); r != nil {
				engine.AddLog(engine.EngineLog{
					Level:     "ERROR",
					Message:   fmt.Sprintf("Job failed: %v", r),
					JobID:     id,
					Timestamp: time.Now(),
				})
				Update(id, JobFailed)
			}
		}()

		engine.AddLog(engine.EngineLog{
			Level:     "INFO",
			Message:   "Job started",
			JobID:     id,
			Timestamp: time.Now(),
		})

		Update(id, JobRunning)
		time.Sleep(3 * time.Second) // simulasi kerja
		Update(id, JobDone)

		engine.AddLog(engine.EngineLog{
			Level:     "INFO",
			Message:   "Job finished",
			JobID:     id,
			Timestamp: time.Now(),
		})

		AddResult(JobResult{
			JobID:     id,
			Engine:    engineName,
			Name:      jobName,
			Output:    "Job completed successfully",
			CreatedAt: time.Now(),
		})
	}()
}

// RunJobByID runs an existing job by ID (STEP 18B-1: Manual run only)
func RunJobByID(jobID string) {
	job := FindByID(jobID)
	if job == nil {
		return
	}

	engine.AddLog(engine.EngineLog{
		Level:     "INFO",
		Message:   "Job started",
		JobID:     jobID,
		Timestamp: time.Now(),
	})

	// Update status to RUNNING
	Update(jobID, JobRunning)

	// Simulate job execution
	go func() {
		defer func() {
			if r := recover(); r != nil {
				engine.AddLog(engine.EngineLog{
					Level:     "ERROR",
					Message:   fmt.Sprintf("Job failed: %v", r),
					JobID:     jobID,
					Timestamp: time.Now(),
				})
				Update(jobID, JobFailed)
			}
		}()

		time.Sleep(3 * time.Second) // simulasi kerja

		// Mark as DONE
		Update(jobID, JobDone)

		engine.AddLog(engine.EngineLog{
			Level:     "INFO",
			Message:   "Job finished",
			JobID:     jobID,
			Timestamp: time.Now(),
		})

		// Add result
		AddResult(JobResult{
			JobID:     jobID,
			Engine:    job.Engine,
			Name:      job.Name,
			Output:    "Job completed successfully",
			CreatedAt: time.Now(),
		})
	}()
}
