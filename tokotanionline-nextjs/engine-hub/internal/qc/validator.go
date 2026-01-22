package qc

import (
	"database/sql"
	"log"

	"engine-hub/internal/content"
)

// MarkFormReady marks the form as ready by updating validation state
// This sets excerpt_ok, image_ok, seo_ok to true and status to 'READY'
func MarkFormReady(entity string, id string) error {
	log.Printf("[QC VALIDATOR] Marking form ready: entity=%s, id=%s", entity, id)

	db := getDB()
	if db == nil {
		log.Printf("[QC VALIDATOR] WARNING: Database not available, skipping validation state update")
		return nil
	}

	// TODO: Update content_validation table when it exists
	// For now, this is a placeholder
	// The actual implementation should:
	// UPDATE content_validation
	// SET excerpt_ok = true, image_ok = true, seo_ok = true, status = 'READY'
	// WHERE entity = ? AND entity_id = ?

	query := `
		UPDATE content_validation
		SET
			excerpt_ok = true,
			image_ok = true,
			seo_ok = true,
			status = 'READY'
		WHERE entity = $1 AND entity_id = $2
	`

	_, err := db.Exec(query, entity, id)
	if err != nil {
		// If table doesn't exist, log warning but don't fail
		if err == sql.ErrNoRows || err.Error() == "relation \"content_validation\" does not exist" {
			log.Printf("[QC VALIDATOR] WARNING: content_validation table does not exist yet, skipping update")
			return nil
		}
		log.Printf("[QC VALIDATOR] Error updating validation state: %v", err)
		return err
	}

	log.Printf("[QC VALIDATOR] Validation state updated successfully for entity=%s, id=%s", entity, id)
	return nil
}

// getDB returns database connection
func getDB() *sql.DB {
	return content.GetDB()
}
