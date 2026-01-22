package content

import (
	"fmt"
	"log"
	"time"

	v2 "engine-hub/internal/ai/v2"
)

// ContentEngine handles content generation jobs
type ContentEngine struct {
	running bool
	stopCh  chan struct{}
}

// NewContentEngine creates a new ContentEngine instance
func NewContentEngine() *ContentEngine {
	return &ContentEngine{
		running: false,
		stopCh:  make(chan struct{}),
	}
}

// Start starts the content engine worker loop
func (e *ContentEngine) Start() error {
	if e.running {
		return fmt.Errorf("content engine is already running")
	}

	// Initialize database connection
	// DEV MODE: Allow engine to start without database for AI pipeline testing
	// AI pipeline (/api/engine/ai/generate) does not require database
	if err := InitDB(); err != nil {
		log.Printf("[CONTENT-ENGINE] WARNING: Failed to initialize database: %v", err)
		log.Println("[CONTENT-ENGINE] Running in DEV MODE (memory-only, no job queue)")
		log.Println("[CONTENT-ENGINE] AI pipeline endpoint will work without database")
		log.Println("[CONTENT-ENGINE] To enable job queue, set DATABASE_URL environment variable")
		// Don't return error - allow engine to start in dev mode
		// AI pipeline doesn't need database
		e.running = true
		log.Println("[CONTENT-ENGINE] Content Engine started (DEV MODE - no database)")
		return nil // Success - running in dev mode
	}

	e.running = true
	log.Println("[CONTENT-ENGINE] Content Engine started (with database)")

	// Start worker loop only if database is available
	go e.workerLoop()

	return nil
}

// Stop stops the content engine
func (e *ContentEngine) Stop() error {
	if !e.running {
		return fmt.Errorf("content engine is not running")
	}

	close(e.stopCh)
	e.running = false
	log.Println("[CONTENT-ENGINE] Content Engine stopped")

	return nil
}

// workerLoop continuously polls for jobs and processes them
func (e *ContentEngine) workerLoop() {
	// Check if database is available before starting worker loop
	if GetDB() == nil {
		log.Println("[CONTENT-ENGINE] Skipping worker loop (no database in DEV MODE)")
		return
	}

	log.Println("[CONTENT-ENGINE] Starting worker loop...")
	
	// Send initial heartbeat
	if err := UpdateHeartbeat(); err != nil {
		log.Printf("[CONTENT-ENGINE] Failed to send initial heartbeat: %v", err)
	}
	
	// Heartbeat ticker (every 15 seconds)
	heartbeatTicker := time.NewTicker(15 * time.Second)
	defer heartbeatTicker.Stop()
	
	// Job polling ticker (every 5 seconds)
	jobTicker := time.NewTicker(5 * time.Second)
	defer jobTicker.Stop()

	for {
		select {
		case <-e.stopCh:
			log.Println("[CONTENT-ENGINE] Worker loop stopped")
			return
		case <-heartbeatTicker.C:
			// UI-B: Send heartbeat periodically
			if err := UpdateHeartbeat(); err != nil {
				log.Printf("[CONTENT-ENGINE] Failed to update heartbeat: %v", err)
			}
		case <-jobTicker.C:
			// FASE D - D3: KILL-SWITCH CHECK (WAJIB - dibaca SETIAP sebelum job start)
			if isSafeModeEnabled() {
				log.Println("[CONTENT-ENGINE] SAFE_MODE enabled - skipping job processing")
				continue
			}

			// UI-B4: Check if engine is paused
			paused, err := IsEnginePaused()
			if err != nil {
				log.Printf("[CONTENT-ENGINE] Failed to check pause status: %v", err)
				// Continue processing if we can't check (fail open)
			} else if paused {
				log.Println("[CONTENT-ENGINE] Engine is paused - skipping job processing")
				continue
			}

			// Poll for pending job
			job, err := PollJob()
			if err != nil {
				log.Printf("[CONTENT-ENGINE] Error polling job: %v", err)
				continue
			}

			if job == nil {
				// No pending jobs, continue
				continue
			}

			// FASE D - D5: OBSERVABILITY - Log job start
			log.Printf("[JOB-START] jobId=%s type=%s", job.ID, job.Type)

			// Process job
			result, err := ProcessJob(job)
			
			// FASE D - D2: Classify error type (INFRA vs CONTENT)
			isInfraErr := false
			if err != nil {
				isInfraErr = isInfrastructureError(err)
				
				// FASE D - D5: OBSERVABILITY - Log job fail with classification
				if isInfraErr {
					log.Printf("[JOB-FAIL] jobId=%s reason=INFRA error=%v", job.ID, err)
				} else {
					log.Printf("[JOB-FAIL] jobId=%s reason=CONTENT error=%v", job.ID, err)
				}

				// Create error result
				if result == nil {
					result = &ProcessResult{}
				}
				result.Error = err
			}

			// FASE D - D2: Rate guard - check if should retry infra errors
			rateGuard := getRateGuard()
			if err != nil && isInfraErr {
				if rateGuard.ShouldRetry(job.ID, true) {
					// Schedule retry with backoff
					backoffDelay := rateGuard.GetBackoffDelay(job.ID)
					log.Printf("[RATE-GUARD] Job %s will retry after %v", job.ID, backoffDelay)
					// TODO: Implement retry scheduling (could update job status back to PENDING with new scheduledAt)
					// For now, we'll mark as failed but log the retry decision
				} else {
					log.Printf("[RATE-GUARD] Job %s exceeded retry limit - marking as failed", job.ID)
				}
			} else if err == nil {
				// Success - clear retry count
				rateGuard.ClearRetryCount(job.ID)
			}

			// Write result
			blogPostID, err := WriteResult(job, result)
			if err != nil {
				log.Printf("[CONTENT-ENGINE] Error writing result for job %s: %v", job.ID, err)
				// Job will remain in RUNNING status (will need manual intervention)
				continue
			}

			// PHASE B: Emit POST_GENERATION_COMPLETE event after blog content and images are saved
			// This happens after WriteResult succeeds and transaction is committed
			if blogPostID != "" && result.Error == nil {
				emitter := v2.GetEventEmitter()
				emitter.Emit(v2.EventPostGenerationComplete, v2.EventPayload{
					PageID:   blogPostID,
					PageType: "blog",
					Data: map[string]interface{}{
						"entity":   "blog",
						"entity_id": blogPostID,
					},
				})
				log.Printf("[CONTENT-ENGINE] POST_GENERATION_COMPLETE event emitted for blog ID: %s", blogPostID)
			}

			// FASE D - D5: OBSERVABILITY - Log job success
			if result.Error != nil {
				// Already logged above as JOB-FAIL
			} else {
				log.Printf("[JOB-SUCCESS] jobId=%s", job.ID)
			}
		}
	}
}

// IsRunning returns whether the engine is running
func (e *ContentEngine) IsRunning() bool {
	return e.running
}
