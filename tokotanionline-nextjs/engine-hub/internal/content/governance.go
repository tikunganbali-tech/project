package content

import (
	"log"
	"os"
	"strconv"
	"strings"
	"time"
)

// FASE D - D3: KILL-SWITCH OPERASIONAL (WAJIB)
// SAFE_MODE=true → semua job TIDAK JALAN
// FEATURE_FREEZE=true → tidak ada perubahan status/publish
// Dibaca SETIAP sebelum job start

// isSafeModeEnabled checks if SAFE_MODE is enabled
func isSafeModeEnabled() bool {
	safeMode := os.Getenv("SAFE_MODE")
	return strings.ToLower(safeMode) == "true"
}

// isFeatureFreezeEnabled checks if FEATURE_FREEZE is enabled
func isFeatureFreezeEnabled() bool {
	featureFreeze := os.Getenv("FEATURE_FREEZE")
	return strings.ToLower(featureFreeze) == "true"
}

// FASE D - D2: RATE & QUOTA GUARD (ANTI LOCKOUT)
// Hard cap harian (mis. 5 konten)
// Cooldown antar job (mis. 30–60 menit)
// Backoff infra error (exponential, max 2x, lalu STOP)

// RateGuard manages rate limiting and quota
type RateGuard struct {
	dailyQuota    int
	cooldownMin   int
	maxRetries    int
	retryBackoff  map[string]int // jobID -> retry count
}

var globalRateGuard *RateGuard

// initRateGuard initializes the global rate guard
func initRateGuard() {
	quota := 5
	cooldown := 30
	maxRetries := 2

	if q := os.Getenv("PROD_DAILY_QUOTA"); q != "" {
		if quotaVal, err := strconv.Atoi(q); err == nil && quotaVal > 0 {
			quota = quotaVal
		}
	}
	if c := os.Getenv("PROD_COOLDOWN_MIN"); c != "" {
		if cooldownVal, err := strconv.Atoi(c); err == nil && cooldownVal > 0 {
			cooldown = cooldownVal
		}
	}
	if r := os.Getenv("PROD_MAX_RETRIES"); r != "" {
		if retryVal, err := strconv.Atoi(r); err == nil && retryVal > 0 {
			maxRetries = retryVal
		}
	}

	globalRateGuard = &RateGuard{
		dailyQuota:   quota,
		cooldownMin:  cooldown,
		maxRetries:   maxRetries,
		retryBackoff: make(map[string]int),
	}
}

// getRateGuard returns the global rate guard
func getRateGuard() *RateGuard {
	if globalRateGuard == nil {
		initRateGuard()
	}
	return globalRateGuard
}

// CheckQuota checks if daily quota is exceeded
func (rg *RateGuard) CheckQuota(now time.Time) (bool, int) {
	db := GetDB()
	if db == nil {
		return false, 0
	}

	startOfDay := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
	query := `
		SELECT COUNT(*) 
		FROM "ContentJob" 
		WHERE "createdAt" >= $1 
		  AND status = $2
	`
	var count int
	err := db.QueryRow(query, startOfDay, string(JobStatusDone)).Scan(&count)
	if err != nil {
		log.Printf("[RATE-GUARD] Error checking quota: %v", err)
		return false, 0
	}

	exceeded := count >= rg.dailyQuota
	return exceeded, count
}

// CheckCooldown checks if we're in cooldown period
func (rg *RateGuard) CheckCooldown(now time.Time) (bool, time.Time) {
	db := GetDB()
	if db == nil {
		return false, time.Time{}
	}

	query := `
		SELECT "finishedAt" 
		FROM "ContentJob" 
		WHERE status IN ($1, $2)
		  AND "finishedAt" IS NOT NULL
		ORDER BY "finishedAt" DESC
		LIMIT 1
	`
	var finishedAt time.Time
	err := db.QueryRow(query, string(JobStatusDone), string(JobStatusFailed)).Scan(&finishedAt)
	if err != nil {
		return false, time.Time{} // No previous job
	}

	cooldownEnd := finishedAt.Add(time.Duration(rg.cooldownMin) * time.Minute)
	inCooldown := now.Before(cooldownEnd)
	return inCooldown, cooldownEnd
}

// ShouldRetry checks if we should retry after infra error
func (rg *RateGuard) ShouldRetry(jobID string, isInfraError bool) bool {
	if !isInfraError {
		return false // Only retry infra errors
	}

	count := rg.retryBackoff[jobID]
	if count >= rg.maxRetries {
		log.Printf("[RATE-GUARD] Job %s exceeded max retries (%d) - STOP", jobID, rg.maxRetries)
		return false
	}

	rg.retryBackoff[jobID] = count + 1
	log.Printf("[RATE-GUARD] Job %s retry %d/%d (exponential backoff)", jobID, count+1, rg.maxRetries)
	return true
}

// GetBackoffDelay calculates exponential backoff delay
func (rg *RateGuard) GetBackoffDelay(jobID string) time.Duration {
	count := rg.retryBackoff[jobID]
	if count == 0 {
		return 30 * time.Second
	}
	// Exponential: 30s, 60s, 120s
	delay := 30 * time.Second * time.Duration(1<<uint(count-1))
	if delay > 2*time.Minute {
		delay = 2 * time.Minute // Max 2 minutes
	}
	return delay
}

// ClearRetryCount clears retry count for a job
func (rg *RateGuard) ClearRetryCount(jobID string) {
	delete(rg.retryBackoff, jobID)
}
