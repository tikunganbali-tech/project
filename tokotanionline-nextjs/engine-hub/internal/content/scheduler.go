package content

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"math/rand"
	"os"
	"strconv"
	"time"
)

// FASE D - D1: SCHEDULER HARIAN (AMAN & NON-OVERLAP)
// Window waktu tetap (09:00-17:00 lokal)
// Jitter kecil (±5-10 menit) untuk naturality
// Non-overlap (job berikutnya tidak boleh start jika job sebelumnya belum selesai)
// Max concurrency = 1 (WAJIB)

// DailyScheduler manages daily production scheduling
type DailyScheduler struct {
	running     bool
	stopCh      chan struct{}
	windowStart int // Hour (9 = 09:00)
	windowEnd   int // Hour (17 = 17:00)
	jitterMin   int // Minutes (±5)
	jitterMax   int // Minutes (±10)
	quota       int // Daily quota (3-5)
	cooldownMin int // Minutes between jobs (30-60)
}

// NewDailyScheduler creates a new scheduler with defaults
func NewDailyScheduler() *DailyScheduler {
	// Default: 09:00-17:00, jitter ±5-10 min, quota 5, cooldown 30-60 min
	windowStart := 9
	windowEnd := 17
	jitterMin := 5
	jitterMax := 10
	quota := 5
	cooldownMin := 30

	// Override from env if set
	if start := os.Getenv("PROD_WINDOW_START"); start != "" {
		if h, err := strconv.Atoi(start); err == nil && h >= 0 && h < 24 {
			windowStart = h
		}
	}
	if end := os.Getenv("PROD_WINDOW_END"); end != "" {
		if h, err := strconv.Atoi(end); err == nil && h >= 0 && h < 24 {
			windowEnd = h
		}
	}
	if jitter := os.Getenv("PROD_JITTER_MIN"); jitter != "" {
		if j, err := strconv.Atoi(jitter); err == nil && j >= 0 {
			jitterMin = j
		}
	}
	if jitter := os.Getenv("PROD_JITTER_MAX"); jitter != "" {
		if j, err := strconv.Atoi(jitter); err == nil && j >= jitterMin {
			jitterMax = j
		}
	}
	if q := os.Getenv("PROD_DAILY_QUOTA"); q != "" {
		if quotaVal, err := strconv.Atoi(q); err == nil && quotaVal > 0 {
			quota = quotaVal
		}
	}
	if cooldown := os.Getenv("PROD_COOLDOWN_MIN"); cooldown != "" {
		if c, err := strconv.Atoi(cooldown); err == nil && c > 0 {
			cooldownMin = c
		}
	}

	return &DailyScheduler{
		running:     false,
		stopCh:      make(chan struct{}),
		windowStart: windowStart,
		windowEnd:   windowEnd,
		jitterMin:   jitterMin,
		jitterMax:   jitterMax,
		quota:       quota,
		cooldownMin: cooldownMin,
	}
}

// Start starts the scheduler
func (s *DailyScheduler) Start() error {
	if s.running {
		return fmt.Errorf("scheduler is already running")
	}

	// Check if database is available
	if GetDB() == nil {
		log.Println("[SCHEDULER] Database not available - scheduler will not run")
		return fmt.Errorf("database connection not initialized")
	}

	s.running = true
	log.Printf("[SCHEDULER] Starting daily scheduler: window=%02d:00-%02d:00, quota=%d, cooldown=%d min",
		s.windowStart, s.windowEnd, s.quota, s.cooldownMin)

	go s.scheduleLoop()

	return nil
}

// Stop stops the scheduler
func (s *DailyScheduler) Stop() error {
	if !s.running {
		return fmt.Errorf("scheduler is not running")
	}

	close(s.stopCh)
	s.running = false
	log.Println("[SCHEDULER] Scheduler stopped")

	return nil
}

// scheduleLoop runs the main scheduling logic
func (s *DailyScheduler) scheduleLoop() {
	// Check every minute for scheduling opportunities
	ticker := time.NewTicker(1 * time.Minute)
	defer ticker.Stop()

	for {
		select {
		case <-s.stopCh:
			log.Println("[SCHEDULER] Schedule loop stopped")
			return
		case <-ticker.C:
			s.checkAndSchedule()
		}
	}
}

// checkAndSchedule checks if we should schedule a new job
func (s *DailyScheduler) checkAndSchedule() {
	// FASE D - D3: KILL-SWITCH CHECK (WAJIB - dibaca SETIAP sebelum job start)
	if isSafeModeEnabled() {
		log.Println("[SCHEDULER] SAFE_MODE enabled - skipping scheduling")
		return
	}

	// Check if we're in production window
	now := time.Now()
	hour := now.Hour()
	if hour < s.windowStart || hour >= s.windowEnd {
		return // Outside window
	}

	// FASE D - D2: Check daily quota
	if s.isQuotaExceeded(now) {
		log.Printf("[SCHEDULER] Daily quota (%d) exceeded - skipping", s.quota)
		return
	}

	// FASE D - D1: Check non-overlap (max concurrency = 1)
	if s.hasRunningJob() {
		log.Println("[SCHEDULER] Job already running - skipping (non-overlap)")
		return
	}

	// FASE D - D2: Check cooldown
	if s.isInCooldown(now) {
		return // Still in cooldown
	}

	// Schedule next job with jitter
	s.scheduleNextJob(now)
}

// scheduleNextJob schedules the next production job
func (s *DailyScheduler) scheduleNextJob(now time.Time) {
	// Calculate jitter (±5-10 minutes)
	jitter := s.jitterMin + rand.Intn(s.jitterMax-s.jitterMin+1)
	if rand.Float32() < 0.5 {
		jitter = -jitter // Randomly negative
	}

	// Schedule time: now + jitter (but within window)
	scheduledTime := now.Add(time.Duration(jitter) * time.Minute)
	scheduledHour := scheduledTime.Hour()
	if scheduledHour < s.windowStart {
		scheduledTime = time.Date(scheduledTime.Year(), scheduledTime.Month(), scheduledTime.Day(),
			s.windowStart, 0, 0, 0, scheduledTime.Location())
	} else if scheduledHour >= s.windowEnd {
		// Too late today, schedule for tomorrow
		scheduledTime = time.Date(scheduledTime.Year(), scheduledTime.Month(), scheduledTime.Day()+1,
			s.windowStart, 0, 0, 0, scheduledTime.Location())
	}

	// FASE D - D4: Generate unique JobID
	jobID := generateJobID()

	// FASE D - D4: Check idempotency (keyword lock)
	// Note: For now, we'll use a placeholder keyword pool
	// In production, this should come from a keyword pool
	keyword := s.getNextKeyword()
	if keyword == "" {
		log.Println("[SCHEDULER] No keywords available - skipping")
		return
	}

	// Check if keyword is already being processed (lock check)
	if s.isKeywordLocked(keyword) {
		log.Printf("[SCHEDULER] Keyword '%s' is locked - skipping", keyword)
		return
	}

	// Create job
	if err := s.createScheduledJob(jobID, keyword, scheduledTime); err != nil {
		log.Printf("[SCHEDULER] Failed to create scheduled job: %v", err)
		return
	}

	log.Printf("[SCHEDULER] Scheduled job %s for keyword '%s' at %s (jitter: %d min)",
		jobID, keyword, scheduledTime.Format("15:04"), jitter)
}

// createScheduledJob creates a ContentJob in the database
func (s *DailyScheduler) createScheduledJob(jobID, keyword string, scheduledTime time.Time) error {
	db := GetDB()
	if db == nil {
		return fmt.Errorf("database connection not initialized")
	}

	// FASE D - D4: Job params with keyword for idempotency
	params := map[string]interface{}{
		"keyword":     keyword,
		"scheduledBy": "daily-scheduler",
		"jobID":       jobID,
	}
	paramsJSON, _ := json.Marshal(params)

	query := `
		INSERT INTO "ContentJob" (id, type, status, "requestedBy", "scheduledAt", "createdAt")
		VALUES ($1, $2, $3, $4, $5, $6)
	`

	_, err := db.Exec(query,
		jobID,
		string(JobTypeGenerate),
		string(JobStatusPending),
		"daily-scheduler",
		scheduledTime,
		time.Now(),
	)

	if err != nil {
		return fmt.Errorf("failed to insert job: %w", err)
	}

	// Store job params separately (if needed) or in a metadata table
	// For now, we'll store it in a simple way
	// Note: Prisma schema has params as Json, so we can store it there
	updateParamsQuery := `UPDATE "ContentJob" SET params = $1 WHERE id = $2`
	_, err = db.Exec(updateParamsQuery, string(paramsJSON), jobID)
	if err != nil {
		log.Printf("[SCHEDULER] Warning: Failed to update job params: %v", err)
		// Non-fatal
	}

	return nil
}

// hasRunningJob checks if there's a job currently running
func (s *DailyScheduler) hasRunningJob() bool {
	db := GetDB()
	if db == nil {
		return false
	}

	query := `SELECT COUNT(*) FROM "ContentJob" WHERE status = $1`
	var count int
	err := db.QueryRow(query, string(JobStatusRunning)).Scan(&count)
	if err != nil {
		log.Printf("[SCHEDULER] Error checking running jobs: %v", err)
		return false
	}

	return count > 0
}

// isQuotaExceeded checks if daily quota is exceeded
func (s *DailyScheduler) isQuotaExceeded(now time.Time) bool {
	db := GetDB()
	if db == nil {
		return false
	}

	// Count jobs created today
	startOfDay := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
	query := `
		SELECT COUNT(*) 
		FROM "ContentJob" 
		WHERE "createdAt" >= $1 
		  AND "requestedBy" = 'daily-scheduler'
	`
	var count int
	err := db.QueryRow(query, startOfDay).Scan(&count)
	if err != nil {
		log.Printf("[SCHEDULER] Error checking quota: %v", err)
		return false
	}

	return count >= s.quota
}

// isInCooldown checks if we're still in cooldown period
func (s *DailyScheduler) isInCooldown(now time.Time) bool {
	db := GetDB()
	if db == nil {
		return false
	}

	// Find last completed job
	query := `
		SELECT "finishedAt" 
		FROM "ContentJob" 
		WHERE "requestedBy" = 'daily-scheduler'
		  AND status IN ($1, $2)
		  AND "finishedAt" IS NOT NULL
		ORDER BY "finishedAt" DESC
		LIMIT 1
	`
	var finishedAt sql.NullTime
	err := db.QueryRow(query, string(JobStatusDone), string(JobStatusFailed)).Scan(&finishedAt)
	if err == sql.ErrNoRows {
		return false // No previous job, not in cooldown
	}
	if err != nil {
		log.Printf("[SCHEDULER] Error checking cooldown: %v", err)
		return false
	}

	if !finishedAt.Valid {
		return false
	}

	// Check if cooldown period has passed
	cooldownEnd := finishedAt.Time.Add(time.Duration(s.cooldownMin) * time.Minute)
	return now.Before(cooldownEnd)
}

// isKeywordLocked checks if a keyword is currently being processed
func (s *DailyScheduler) isKeywordLocked(keyword string) bool {
	db := GetDB()
	if db == nil {
		return false
	}

	// Check if keyword is in any running or pending job
	query := `
		SELECT COUNT(*) 
		FROM "ContentJob" 
		WHERE status IN ($1, $2)
		  AND params::text LIKE $3
	`
	var count int
	keywordPattern := "%" + keyword + "%"
	err := db.QueryRow(query, string(JobStatusPending), string(JobStatusRunning), keywordPattern).Scan(&count)
	if err != nil {
		log.Printf("[SCHEDULER] Error checking keyword lock: %v", err)
		return false
	}

	return count > 0
}

// getNextKeyword gets the next keyword from pool
func (s *DailyScheduler) getNextKeyword() string {
	db := GetDB()
	if db == nil {
		return ""
	}

	// Query BlogKeyword table for available keywords
	// Prefer keywords that haven't been used recently
	query := `
		SELECT bk.keyword
		FROM "BlogKeyword" bk
		LEFT JOIN "BlogPost" bp ON bp."primaryKeyword" = bk.keyword
		WHERE bp.id IS NULL OR bp."createdAt" < NOW() - INTERVAL '30 days'
		ORDER BY bk."createdAt" DESC
		LIMIT 1
	`
	var keyword string
	err := db.QueryRow(query).Scan(&keyword)
	if err == sql.ErrNoRows {
		// No unused keywords, try any keyword
		fallbackQuery := `SELECT keyword FROM "BlogKeyword" ORDER BY "createdAt" DESC LIMIT 1`
		err = db.QueryRow(fallbackQuery).Scan(&keyword)
		if err != nil {
			log.Printf("[SCHEDULER] No keywords available in database")
			return ""
		}
	} else if err != nil {
		log.Printf("[SCHEDULER] Error querying keywords: %v", err)
		return ""
	}

	return keyword
}

// generateJobID generates a unique job ID
func generateJobID() string {
	return fmt.Sprintf("job-%d-%d", time.Now().Unix(), rand.Intn(10000))
}
