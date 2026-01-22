package main

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"github.com/joho/godotenv"
	_ "github.com/lib/pq"

	"engine-hub/internal/content"
)

const (
	// Default check interval (5 minutes)
	defaultCheckInterval = 5 * time.Minute
	// Engine hub URL for content generation
	defaultEngineHubURL = "http://localhost:8090"
)

// ScheduleWorker is the main scheduler worker
type ScheduleWorker struct {
	db              *sql.DB
	checkInterval   time.Duration
	engineHubURL    string
	running         bool
	stopCh          chan struct{}
}

// ContentSchedule represents a schedule from database
type ContentSchedule struct {
	ID              string
	Name            string
	Mode            string // BLOG | PRODUCT
	Status          string // ACTIVE | PAUSED | FINISHED
	ProductionPerDay int
	StartDate       time.Time
	EndDate         sql.NullTime
	PublishMode     string // AUTO_PUBLISH | DRAFT_ONLY | QC_REQUIRED
	TimeWindowStart string // HH:mm
	TimeWindowEnd   string // HH:mm
}

// ScheduleKeyword represents a keyword from database
type ScheduleKeyword struct {
	ID                string
	ScheduleID        string
	PrimaryKeyword    string
	SecondaryKeywords []string
	Status            string // PENDING | PROCESSING | DONE | FAILED
	LastError         sql.NullString
	ScheduledPublishAt sql.NullTime
}

func main() {
	// Load .env for development
	if os.Getenv("ENV") == "development" {
		if err := godotenv.Load(); err == nil {
			log.Println("[SCHEDULER] Loaded .env file for development")
		}
	}

	log.Println("[SCHEDULER] Starting scheduler worker...")

	// Initialize database
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		log.Fatal("[SCHEDULER] FATAL: DATABASE_URL environment variable is not set")
	}

	db, err := sql.Open("postgres", dbURL)
	if err != nil {
		log.Fatalf("[SCHEDULER] FATAL: Failed to open database: %v", err)
	}
	defer db.Close()

	if err := db.Ping(); err != nil {
		log.Fatalf("[SCHEDULER] FATAL: Failed to ping database: %v", err)
	}

	// Set connection pool settings
	db.SetMaxOpenConns(10)
	db.SetMaxIdleConns(5)

	log.Println("[SCHEDULER] Database connection established")

	// Initialize Content Engine database connection (for reuse)
	content.InitDB()

	// Get configuration
	checkInterval := defaultCheckInterval
	if intervalStr := os.Getenv("SCHEDULER_CHECK_INTERVAL"); intervalStr != "" {
		if d, err := time.ParseDuration(intervalStr); err == nil {
			checkInterval = d
		}
	}

	engineHubURL := os.Getenv("ENGINE_HUB_URL")
	if engineHubURL == "" {
		engineHubURL = defaultEngineHubURL
	}

	// Create worker
	worker := &ScheduleWorker{
		db:            db,
		checkInterval: checkInterval,
		engineHubURL:  engineHubURL,
		stopCh:        make(chan struct{}),
	}

	log.Printf("[SCHEDULER] Worker configured: checkInterval=%v, engineHubURL=%s", checkInterval, engineHubURL)
	log.Println("[SCHEDULER] Starting scheduler loop...")

	// Start worker
	if err := worker.Start(); err != nil {
		log.Fatalf("[SCHEDULER] FATAL: Failed to start worker: %v", err)
	}

	// Set up signal handler for graceful shutdown
	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, os.Interrupt, syscall.SIGTERM)

	// Wait for stop signal
	select {
	case <-sigCh:
		log.Println("[SCHEDULER] Received interrupt signal, shutting down gracefully...")
		worker.Stop()
		<-worker.stopCh
		log.Println("[SCHEDULER] Worker stopped")
	case <-worker.stopCh:
		log.Println("[SCHEDULER] Worker stopped")
	}
}

// Start starts the scheduler worker
func (w *ScheduleWorker) Start() error {
	if w.running {
		return fmt.Errorf("worker is already running")
	}

	w.running = true
	go w.runLoop()
	return nil
}

// Stop stops the scheduler worker
func (w *ScheduleWorker) Stop() {
	if !w.running {
		return
	}
	close(w.stopCh)
	w.running = false
}

// runLoop is the main scheduling loop
func (w *ScheduleWorker) runLoop() {
	ticker := time.NewTicker(w.checkInterval)
	defer ticker.Stop()

	log.Println("[SCHEDULER] Loop started")

	// Run immediately on start
	w.processSchedules()

	for {
		select {
		case <-w.stopCh:
			log.Println("[SCHEDULER] Loop stopped")
			return
		case <-ticker.C:
			w.processSchedules()
		}
	}
}

// processSchedules processes all ACTIVE schedules
func (w *ScheduleWorker) processSchedules() {
	log.Println("[SCHEDULER] Checking for active schedules...")

	// Get all ACTIVE schedules
	schedules, err := w.getActiveSchedules()
	if err != nil {
		log.Printf("[SCHEDULER] Error getting active schedules: %v", err)
		return
	}

	if len(schedules) == 0 {
		log.Println("[SCHEDULER] No active schedules found")
		return
	}

	log.Printf("[SCHEDULER] Found %d active schedule(s)", len(schedules))

	// M-12: TIMEZONE LOCK - Use UTC for all time operations
	now := time.Now().UTC()

	// Process each schedule
	for _, schedule := range schedules {
		// M-12: Check if schedule is within date range (UTC)
		// Ensure StartDate and EndDate are compared in UTC
		startDateUTC := schedule.StartDate.UTC()
		if now.Before(startDateUTC) {
			log.Printf("[SCHEDULER] Schedule '%s' skipped (not started yet) - starts: %v UTC, now: %v UTC", 
				schedule.Name, startDateUTC, now)
			continue
		}

		if schedule.EndDate.Valid {
			endDateUTC := schedule.EndDate.Time.UTC()
			if now.After(endDateUTC) {
				log.Printf("[SCHEDULER] Schedule '%s' skipped (has ended) - ended: %v UTC, now: %v UTC", 
					schedule.Name, endDateUTC, now)
				continue
			}
		}

		// M-12: Check if we're within time window (UTC-based comparison)
		if !w.isInTimeWindow(now, schedule.TimeWindowStart, schedule.TimeWindowEnd) {
			log.Printf("[SCHEDULER] Schedule '%s' skipped (outside time window) - window: %s-%s, now: %02d:%02d UTC", 
				schedule.Name, schedule.TimeWindowStart, schedule.TimeWindowEnd, now.Hour(), now.Minute())
			continue
		}

		// M-12: All conditions met - process schedule
		log.Printf("[SCHEDULER] Schedule '%s' - All conditions met, processing...", schedule.Name)
		if err := w.processSchedule(schedule); err != nil {
			log.Printf("[SCHEDULER] Error processing schedule '%s': %v", schedule.Name, err)
		} else {
			log.Printf("[SCHEDULER] Schedule '%s' - Processing completed successfully", schedule.Name)
		}
	}
}

// processSchedule processes a single schedule
func (w *ScheduleWorker) processSchedule(schedule ContentSchedule) error {
	log.Printf("[SCHEDULER] Processing schedule: %s (mode: %s, perDay: %d)", 
		schedule.Name, schedule.Mode, schedule.ProductionPerDay)

	// M-12: TIMEZONE LOCK - Use UTC for all time operations
	now := time.Now().UTC()
	today := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, time.UTC)

	// Count how many keywords have been DONE today
	doneToday, err := w.countDoneKeywordsToday(schedule.ID, today)
	if err != nil {
		return fmt.Errorf("failed to count done keywords: %w", err)
	}

	log.Printf("[SCHEDULER] Schedule '%s': Done today: %d/%d", schedule.Name, doneToday, schedule.ProductionPerDay)

	// Check if we need more articles today
	remaining := schedule.ProductionPerDay - doneToday
	if remaining <= 0 {
		log.Printf("[SCHEDULER] Schedule '%s': Daily quota met (%d/%d)", schedule.Name, doneToday, schedule.ProductionPerDay)
		return nil
	}

	// Get PENDING keywords for this schedule
	keywords, err := w.getPendingKeywords(schedule.ID, remaining)
	if err != nil {
		return fmt.Errorf("failed to get pending keywords: %w", err)
	}

	if len(keywords) == 0 {
		log.Printf("[SCHEDULER] Schedule '%s': No pending keywords available", schedule.Name)
		return nil
	}

	log.Printf("[SCHEDULER] Schedule '%s': Found %d pending keyword(s), processing %d...", 
		schedule.Name, len(keywords), min(len(keywords), remaining))

	// M-12: Process keywords (one at a time to avoid overload)
	processed := 0
	for i := 0; i < min(len(keywords), remaining); i++ {
		keyword := keywords[i]

		// M-12: Update status to PROCESSING (prevents concurrent processing)
		if err := w.updateKeywordStatus(keyword.ID, "PROCESSING", nil); err != nil {
			log.Printf("[SCHEDULER] Error updating keyword status to PROCESSING: %v", err)
			continue
		}
		
		log.Printf("[SCHEDULER] Processing keyword '%s' (keywordId: %s)", keyword.PrimaryKeyword, keyword.ID)

		// Generate content
		var articleID string
		var generateErr error
		
		if schedule.Mode == "BLOG" {
			articleID, generateErr = w.generateBlogContent(schedule, keyword)
		} else {
			articleID, generateErr = w.generateProductContent(schedule, keyword)
		}

		if generateErr != nil {
			log.Printf("[SCHEDULER] Error generating content for keyword '%s': %v", keyword.PrimaryKeyword, generateErr)
			// Update status to FAILED
			errMsg := generateErr.Error()
			if err := w.updateKeywordStatus(keyword.ID, "FAILED", &errMsg); err != nil {
				log.Printf("[SCHEDULER] Error updating keyword status to FAILED: %v", err)
			}
			continue
		}

		// M-12: Calculate scheduled publish time (if needed) - UTC-based
		var scheduledPublishAt *time.Time
		if schedule.PublishMode == "AUTO_PUBLISH" {
			// Schedule for now or near future (UTC)
			publishTime := now.Add(5 * time.Minute) // 5 minutes from now
			scheduledPublishAt = &publishTime
		}

		// Update keyword status to DONE
		if err := w.updateKeywordStatusWithPublishTime(keyword.ID, "DONE", nil, scheduledPublishAt); err != nil {
			log.Printf("[SCHEDULER] Error updating keyword status to DONE: %v", err)
		}

		// M-12: Log success with publish mode info
		if schedule.PublishMode == "AUTO_PUBLISH" {
			log.Printf("[SCHEDULER] Successfully generated and scheduled %s content for keyword '%s' (articleId: %s, publishMode: AUTO_PUBLISH, scheduledPublishAt: %v UTC)", 
				schedule.Mode, keyword.PrimaryKeyword, articleID, scheduledPublishAt)
		} else {
			log.Printf("[SCHEDULER] Successfully generated %s content for keyword '%s' (articleId: %s, publishMode: %s)", 
				schedule.Mode, keyword.PrimaryKeyword, articleID, schedule.PublishMode)
		}
		processed++
	}

	log.Printf("[SCHEDULER] Schedule '%s': Processed %d/%d keywords", schedule.Name, processed, remaining)
	return nil
}

// generateBlogContent generates blog content for a keyword
func (w *ScheduleWorker) generateBlogContent(schedule ContentSchedule, keyword ScheduleKeyword) (string, error) {
	log.Printf("[SCHEDULER] Generating blog content for keyword: %s", keyword.PrimaryKeyword)

	// Call Go engine hub to generate content
	// Use the v2 endpoint which is the default
	requestBody := map[string]interface{}{
		"contentType": "DERIVATIVE",
		"outline":     w.buildOutline(keyword.PrimaryKeyword),
		"language":    "id",
		"category":    "K1", // Default category
	}

	jsonData, err := json.Marshal(requestBody)
	if err != nil {
		return "", fmt.Errorf("failed to marshal request: %w", err)
	}

	// Call engine hub
	url := fmt.Sprintf("%s/api/engine/ai/generate-v2", w.engineHubURL)
	req, err := http.NewRequest("POST", url, strings.NewReader(string(jsonData)))
	if err != nil {
		return "", fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 5 * time.Minute}
	resp, err := client.Do(req)
	if err != nil {
		return "", fmt.Errorf("engine hub request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		errorBody, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("engine hub returned status %d: %s", resp.StatusCode, string(errorBody))
	}

	// Parse response (matches the format from AIGenerate endpoint)
	var engineResponse struct {
		Success bool `json:"success"`
		Data    struct {
			Title      string `json:"title"`
			Content    string `json:"content"`
			ContentHTML string `json:"content_html,omitempty"`
			SEO        struct {
				Title            string `json:"title"`
				MetaDescription  string `json:"meta_description"`
				PrimaryKeyword   string `json:"primary_keyword,omitempty"`
			} `json:"seo"`
		} `json:"data"`
		Error   string `json:"error,omitempty"`
		Message string `json:"message,omitempty"`
		Status  string `json:"status,omitempty"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&engineResponse); err != nil {
		return "", fmt.Errorf("failed to decode response: %w", err)
	}

	if !engineResponse.Success || engineResponse.Status == "FAILED" || engineResponse.Status == "FAILED_VALIDATION" {
		return "", fmt.Errorf("engine hub returned error: %s (status: %s)", engineResponse.Message, engineResponse.Status)
	}

	// Save to database as draft
	contentData := struct {
		Title     string
		Body      string
		MetaTitle string
		MetaDesc  string
	}{
		Title:     engineResponse.Data.Title,
		Body:      engineResponse.Data.Content,
		MetaTitle: engineResponse.Data.SEO.Title,
		MetaDesc:  engineResponse.Data.SEO.MetaDescription,
	}

	articleID, err := w.saveBlogPostAsDraft(contentData, keyword, schedule)
	if err != nil {
		return "", fmt.Errorf("failed to save blog post: %w", err)
	}

	return articleID, nil
}

// generateProductContent generates product content for a keyword
func (w *ScheduleWorker) generateProductContent(schedule ContentSchedule, keyword ScheduleKeyword) (string, error) {
	// Similar to blog, but for products
	// For now, return error as product generation may need different handling
	return "", fmt.Errorf("product content generation not yet implemented")
}

// saveBlogPostAsDraft saves blog post to database as draft
func (w *ScheduleWorker) saveBlogPostAsDraft(content struct {
	Title     string
	Body      string
	MetaTitle string
	MetaDesc  string
}, keyword ScheduleKeyword, schedule ContentSchedule) (string, error) {
	// Generate slug from title
	slug := strings.ToLower(strings.ReplaceAll(content.Title, " ", "-"))
	slug = strings.ReplaceAll(slug, "/", "-")

	// Get first active brand (for now - could be made configurable)
	var brandID string
	err := w.db.QueryRow(`SELECT id FROM "Brand" WHERE "brandStatus" = 'ACTIVE' ORDER BY "createdAt" ASC LIMIT 1`).Scan(&brandID)
	if err != nil {
		return "", fmt.Errorf("no active brand found: %w", err)
	}

	// Insert blog post
	query := `
		INSERT INTO "BlogPost" (
			id, title, slug, content, excerpt, status, 
			"seoTitle", "seoDescription", "primaryKeyword", "brandId", "createdAt", "updatedAt"
		) VALUES (
			gen_random_uuid()::text, $1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW()
		) RETURNING id
	`

	var articleID string
	excerpt := content.MetaDesc
	if len(excerpt) > 200 {
		excerpt = excerpt[:200]
	}

	err = w.db.QueryRow(
		query,
		content.Title,
		slug,
		content.Body,
		excerpt,
		"DRAFT",
		content.MetaTitle,
		content.MetaDesc,
		keyword.PrimaryKeyword,
		brandID,
	).Scan(&articleID)

	if err != nil {
		return "", fmt.Errorf("failed to insert blog post: %w", err)
	}

	log.Printf("[SCHEDULER] Saved blog post as draft: id=%s, title=%s", articleID, content.Title)
	return articleID, nil
}

// buildOutline builds a simple outline from keyword
func (w *ScheduleWorker) buildOutline(keyword string) string {
	return fmt.Sprintf(`### H2 — Pengenalan %s
Pengenalan singkat tentang %s dan pentingnya dalam pertanian.

### H2 — Manfaat dan Keuntungan
Manfaat utama dari %s dan bagaimana hal ini dapat membantu petani.

### H2 — Cara Menggunakan atau Menerapkan
Panduan praktis tentang cara menggunakan atau menerapkan %s.

### H2 — Tips dan Rekomendasi
Tips praktis dan rekomendasi untuk mendapatkan hasil terbaik dengan %s.

### H2 — Kesimpulan
Ringkasan poin-poin penting tentang %s.`, keyword, keyword, keyword, keyword, keyword, keyword)
}

// Helper functions

func (w *ScheduleWorker) getActiveSchedules() ([]ContentSchedule, error) {
	query := `
		SELECT id, name, mode, status, "productionPerDay", "startDate", "endDate", 
		       "publishMode", "timeWindowStart", "timeWindowEnd"
		FROM "ContentSchedule"
		WHERE status = 'ACTIVE'
		ORDER BY "createdAt" ASC
	`

	rows, err := w.db.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var schedules []ContentSchedule
	for rows.Next() {
		var s ContentSchedule
		var endDate sql.NullTime

		err := rows.Scan(
			&s.ID, &s.Name, &s.Mode, &s.Status, &s.ProductionPerDay,
			&s.StartDate, &endDate, &s.PublishMode,
			&s.TimeWindowStart, &s.TimeWindowEnd,
		)
		if err != nil {
			return nil, err
		}

		s.EndDate = endDate
		schedules = append(schedules, s)
	}

	return schedules, rows.Err()
}

func (w *ScheduleWorker) getPendingKeywords(scheduleID string, limit int) ([]ScheduleKeyword, error) {
	query := `
		SELECT id, "scheduleId", "primaryKeyword", "secondaryKeywords", status, "lastError", "scheduledPublishAt"
		FROM "ScheduleKeyword"
		WHERE "scheduleId" = $1 AND status = 'PENDING'
		ORDER BY "createdAt" ASC
		LIMIT $2
	`

	rows, err := w.db.Query(query, scheduleID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var keywords []ScheduleKeyword
	for rows.Next() {
		var k ScheduleKeyword
		var secondaryKeywordsJSON []byte
		var lastError sql.NullString
		var scheduledPublishAt sql.NullTime

		err := rows.Scan(
			&k.ID, &k.ScheduleID, &k.PrimaryKeyword, &secondaryKeywordsJSON,
			&k.Status, &lastError, &scheduledPublishAt,
		)
		if err != nil {
			return nil, err
		}

		// Parse secondary keywords from JSON array
		if len(secondaryKeywordsJSON) > 0 {
			json.Unmarshal(secondaryKeywordsJSON, &k.SecondaryKeywords)
		}

		k.LastError = lastError
		k.ScheduledPublishAt = scheduledPublishAt
		keywords = append(keywords, k)
	}

	return keywords, rows.Err()
}

func (w *ScheduleWorker) countDoneKeywordsToday(scheduleID string, todayStart time.Time) (int, error) {
	todayEnd := todayStart.Add(24 * time.Hour)

	query := `
		SELECT COUNT(*)
		FROM "ScheduleKeyword"
		WHERE "scheduleId" = $1 
		  AND status = 'DONE'
		  AND "updatedAt" >= $2 
		  AND "updatedAt" < $3
	`

	var count int
	err := w.db.QueryRow(query, scheduleID, todayStart, todayEnd).Scan(&count)
	return count, err
}

func (w *ScheduleWorker) updateKeywordStatus(keywordID, status string, lastError *string) error {
	var err error
	if lastError != nil {
		query := `UPDATE "ScheduleKeyword" SET status = $1, "lastError" = $2, "updatedAt" = NOW() WHERE id = $3`
		_, err = w.db.Exec(query, status, *lastError, keywordID)
	} else {
		query := `UPDATE "ScheduleKeyword" SET status = $1, "lastError" = NULL, "updatedAt" = NOW() WHERE id = $2`
		_, err = w.db.Exec(query, status, keywordID)
	}
	return err
}

func (w *ScheduleWorker) updateKeywordStatusWithPublishTime(keywordID, status string, lastError *string, scheduledPublishAt *time.Time) error {
	var err error
	if lastError != nil && scheduledPublishAt != nil {
		query := `UPDATE "ScheduleKeyword" SET status = $1, "lastError" = $2, "scheduledPublishAt" = $3, "updatedAt" = NOW() WHERE id = $4`
		_, err = w.db.Exec(query, status, *lastError, *scheduledPublishAt, keywordID)
	} else if scheduledPublishAt != nil {
		query := `UPDATE "ScheduleKeyword" SET status = $1, "lastError" = NULL, "scheduledPublishAt" = $2, "updatedAt" = NOW() WHERE id = $3`
		_, err = w.db.Exec(query, status, *scheduledPublishAt, keywordID)
	} else if lastError != nil {
		query := `UPDATE "ScheduleKeyword" SET status = $1, "lastError" = $2, "updatedAt" = NOW() WHERE id = $3`
		_, err = w.db.Exec(query, status, *lastError, keywordID)
	} else {
		query := `UPDATE "ScheduleKeyword" SET status = $1, "lastError" = NULL, "updatedAt" = NOW() WHERE id = $2`
		_, err = w.db.Exec(query, status, keywordID)
	}
	return err
}

// M-12: isInTimeWindow checks if current time (UTC) is within the time window
// Time window is interpreted as UTC time (HH:mm format)
func (w *ScheduleWorker) isInTimeWindow(now time.Time, windowStart, windowEnd string) bool {
	// M-12: Ensure now is in UTC
	nowUTC := now.UTC()
	currentMin := nowUTC.Hour()*60 + nowUTC.Minute()

	// Parse window start (HH:mm format, interpreted as UTC)
	startParts := strings.Split(windowStart, ":")
	if len(startParts) != 2 {
		return false
	}
	var startHour, startMin int
	fmt.Sscanf(startParts[0], "%d", &startHour)
	fmt.Sscanf(startParts[1], "%d", &startMin)
	startMinTotal := startHour*60 + startMin

	// Parse window end (HH:mm format, interpreted as UTC)
	endParts := strings.Split(windowEnd, ":")
	if len(endParts) != 2 {
		return false
	}
	var endHour, endMin int
	fmt.Sscanf(endParts[0], "%d", &endHour)
	fmt.Sscanf(endParts[1], "%d", &endMin)
	endMinTotal := endHour*60 + endMin

	// M-12: Strict check - must be >= start AND < end
	return currentMin >= startMinTotal && currentMin < endMinTotal
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}
