package content

import (
	"database/sql"
	"fmt"
	"time"
)

// UpdateHeartbeat updates the engine heartbeat in the database
// This should be called periodically (every 10-30 seconds) to indicate the engine is alive
func UpdateHeartbeat() error {
	db := GetDB()
	if db == nil {
		return fmt.Errorf("database connection not initialized")
	}

	now := time.Now()
	engineName := "content-engine"

	// Upsert heartbeat
	query := `
		INSERT INTO "EngineHeartbeat" (id, "engineName", status, "lastBeatAt", "uptimeStart", "updatedAt", "createdAt")
		VALUES (gen_random_uuid(), $1, $2, $3, 
			COALESCE((SELECT "uptimeStart" FROM "EngineHeartbeat" WHERE "engineName" = $1), $3),
			$3, $3)
		ON CONFLICT ("engineName") 
		DO UPDATE SET 
			status = $2,
			"lastBeatAt" = $3,
			"uptimeStart" = CASE 
				WHEN "EngineHeartbeat".status != $2 AND $2 = 'RUNNING' THEN $3
				ELSE "EngineHeartbeat"."uptimeStart"
			END,
			"updatedAt" = $3
	`
	
	_, err := db.Exec(query, engineName, "RUNNING", now)
	if err != nil {
		return fmt.Errorf("failed to update heartbeat: %w", err)
	}

	return nil
}

// IsEnginePaused checks if the engine is paused via EngineControl table
// Returns true if paused, false if not paused or error
func IsEnginePaused() (bool, error) {
	db := GetDB()
	if db == nil {
		return false, fmt.Errorf("database connection not initialized")
	}

	query := `SELECT paused FROM "EngineControl" LIMIT 1`
	
	var paused bool
	err := db.QueryRow(query).Scan(&paused)
	if err != nil {
		if err == sql.ErrNoRows {
			// No control record exists, create one with paused=false
			now := time.Now()
			_, createErr := db.Exec(`INSERT INTO "EngineControl" (id, paused, "createdAt", "updatedAt") 
				VALUES (gen_random_uuid(), false, $1, $1)`, now)
			if createErr != nil {
				return false, fmt.Errorf("failed to create engine control: %w", createErr)
			}
			return false, nil
		}
		return false, fmt.Errorf("failed to check engine pause status: %w", err)
	}

	return paused, nil
}
