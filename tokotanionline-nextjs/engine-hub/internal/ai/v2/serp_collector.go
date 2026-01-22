package v2

import (
	"encoding/json"
	"fmt"
	"io/ioutil"
	"log"
	"os"
	"path/filepath"
	"time"
)

// SERPSignal represents a single SERP signal data point
// PHASE 5: Kumpulkan keyword position, impression, CTR, rich result status
type SERPSignal struct {
	PageID        string    `json:"pageId"`
	Version       int       `json:"version"`
	Keyword       string    `json:"keyword"`
	Position      int       `json:"position"`      // Search position (1-100, 0 = not in top 100)
	Impression    int       `json:"impression"`    // Number of impressions
	CTR           float64   `json:"ctr"`           // Click-through rate (0.0 - 1.0)
	RichResult    string    `json:"richResult"`   // "none" | "featured" | "snippet" | "video"
	Timestamp     string    `json:"timestamp"`
}

// SERPSignalHistory represents historical SERP signals
type SERPSignalHistory struct {
	PageID   string       `json:"pageId"`
	Version  int          `json:"version"`
	Signals  []SERPSignal `json:"signals"`
	LastUpdated string    `json:"lastUpdated"`
}

// SERPCollector collects SERP signals periodically
// PHASE 5: ❌ Jangan ubah konten
type SERPCollector struct {
	storageDir string
}

// NewSERPCollector creates a new SERP collector
func NewSERPCollector() *SERPCollector {
	storageDir := os.Getenv("AI_V2_STORAGE_DIR")
	if storageDir == "" {
		storageDir = "./storage/ai-v2"
	}
	
	// Ensure SERP directory exists
	serpDir := filepath.Join(storageDir, "serp")
	os.MkdirAll(serpDir, 0755)
	
	return &SERPCollector{
		storageDir: serpDir,
	}
}

// CollectSignal collects a single SERP signal
// PHASE 5: Simpan sebagai SERP_SIGNAL_HISTORY
func (c *SERPCollector) CollectSignal(signal SERPSignal) error {
	// Load existing history
	history, err := c.getHistory(signal.PageID, signal.Version)
	if err != nil {
		// Create new history
		history = &SERPSignalHistory{
			PageID:   signal.PageID,
			Version:  signal.Version,
			Signals:  []SERPSignal{},
		}
	}
	
	// Add new signal
	signal.Timestamp = time.Now().Format(time.RFC3339)
	history.Signals = append(history.Signals, signal)
	history.LastUpdated = signal.Timestamp
	
	// Save history
	return c.saveHistory(history)
}

// GetHistory retrieves SERP signal history
func (c *SERPCollector) GetHistory(pageID string, version int) (*SERPSignalHistory, error) {
	return c.getHistory(pageID, version)
}

// getHistory retrieves history from storage
func (c *SERPCollector) getHistory(pageID string, version int) (*SERPSignalHistory, error) {
	filename := filepath.Join(c.storageDir, pageID, fmt.Sprintf("v%d_serp.json", version))
	
	data, err := ioutil.ReadFile(filename)
	if err != nil {
		return nil, err
	}
	
	var history SERPSignalHistory
	if err := json.Unmarshal(data, &history); err != nil {
		return nil, err
	}
	
	return &history, nil
}

// saveHistory saves history to storage
func (c *SERPCollector) saveHistory(history *SERPSignalHistory) error {
	pageDir := filepath.Join(c.storageDir, history.PageID)
	os.MkdirAll(pageDir, 0755)
	
	filename := filepath.Join(pageDir, fmt.Sprintf("v%d_serp.json", history.Version))
	
	data, err := json.MarshalIndent(history, "", "  ")
	if err != nil {
		return fmt.Errorf("failed to marshal SERP history: %w", err)
	}
	
	if err := ioutil.WriteFile(filename, data, 0644); err != nil {
		return fmt.Errorf("failed to write SERP history: %w", err)
	}
	
	log.Printf("[SERP COLLECTOR] Saved signal: pageId=%s, version=%d, keyword=%s, position=%d", 
		history.PageID, history.Version, history.Signals[len(history.Signals)-1].Keyword, 
		history.Signals[len(history.Signals)-1].Position)
	
	return nil
}

// CollectPeriodically collects SERP signals periodically
// PHASE 5: Kumpulkan secara periodik
func (c *SERPCollector) CollectPeriodically(pageID string, version int, keywords []string, interval time.Duration) {
	// This would be called by a scheduler
	// For now, it's a placeholder for periodic collection
	log.Printf("[SERP COLLECTOR] Periodic collection scheduled: pageId=%s, version=%d, interval=%v", 
		pageID, version, interval)
	
	// TODO: Implement actual SERP API calls (Google Search Console API, etc.)
	// For now, this is a structure for future implementation
}
