package content

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"time"
)

// PollJob gets 1 PENDING job and locks it via transaction
// Sets status to RUNNING and startedAt
// Skips jobs where scheduledAt is in the future
func PollJob() (*ContentJob, error) {
	db := GetDB()
	if db == nil {
		return nil, fmt.Errorf("database connection not initialized")
	}

	// Start transaction for atomic lock
	tx, err := db.Begin()
	if err != nil {
		return nil, fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback() // Rollback if not committed

	now := time.Now()

	// Query for 1 PENDING job where scheduledAt is NULL or <= now
	// FOR UPDATE SKIP LOCKED ensures only one worker gets the job
	query := `
		SELECT id, type, status, "requestedBy", "scheduledAt", "startedAt", 
		       "finishedAt", params, "createdAt"
		FROM "ContentJob"
		WHERE status = $1
		  AND ("scheduledAt" IS NULL OR "scheduledAt" <= $2)
		ORDER BY "createdAt" ASC
		LIMIT 1
		FOR UPDATE SKIP LOCKED
	`

	var job ContentJob
	var scheduledAt, startedAt, finishedAt sql.NullTime
	var params sql.NullString

	err = tx.QueryRow(query, string(JobStatusPending), now).Scan(
		&job.ID,
		&job.Type,
		&job.Status,
		&job.RequestedBy,
		&scheduledAt,
		&startedAt,
		&finishedAt,
		&params,
		&job.CreatedAt,
	)

	if err == sql.ErrNoRows {
		tx.Rollback()
		return nil, nil // No pending jobs
	}
	if err != nil {
		tx.Rollback()
		return nil, fmt.Errorf("failed to query job: %w", err)
	}

	// Map nullable fields
	if scheduledAt.Valid {
		job.ScheduledAt = &scheduledAt.Time
	}
	if startedAt.Valid {
		job.StartedAt = &startedAt.Time
	}
	if finishedAt.Valid {
		job.FinishedAt = &finishedAt.Time
	}
	if params.Valid {
		job.Params = json.RawMessage(params.String)
	}

	// Update status to RUNNING and set startedAt
	updateQuery := `
		UPDATE "ContentJob"
		SET status = $1, "startedAt" = $2
		WHERE id = $3
	`

	_, err = tx.Exec(updateQuery, string(JobStatusRunning), now, job.ID)
	if err != nil {
		tx.Rollback()
		return nil, fmt.Errorf("failed to update job status: %w", err)
	}

	// Commit transaction (releases lock)
	if err := tx.Commit(); err != nil {
		return nil, fmt.Errorf("failed to commit transaction: %w", err)
	}

	// Update job struct with new status and startedAt
	job.Status = JobStatusRunning
	job.StartedAt = &now

	return &job, nil
}
