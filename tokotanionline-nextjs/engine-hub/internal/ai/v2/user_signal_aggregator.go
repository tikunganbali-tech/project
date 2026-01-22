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

// UserSignal represents a single user interaction signal
// PHASE 5: Aggregate dwell time, bounce rate, scroll depth
type UserSignal struct {
	PageID      string    `json:"pageId"`
	Version     int       `json:"version"`
	DwellTime   float64   `json:"dwellTime"`   // Seconds
	BounceRate  float64   `json:"bounceRate"` // 0.0 - 1.0
	ScrollDepth float64   `json:"scrollDepth"` // 0.0 - 1.0 (0 = no scroll, 1 = scrolled to bottom)
	Timestamp   string    `json:"timestamp"`
}

// AggregatedUserSignal represents aggregated user signals
type AggregatedUserSignal struct {
	PageID        string    `json:"pageId"`
	Version       int       `json:"version"`
	AvgDwellTime  float64   `json:"avgDwellTime"`
	AvgBounceRate float64   `json:"avgBounceRate"`
	AvgScrollDepth float64  `json:"avgScrollDepth"`
	SampleCount   int       `json:"sampleCount"`
	LastUpdated   string    `json:"lastUpdated"`
}

// UserSignalAggregator aggregates user signals
// PHASE 5: Analytics hanya mengukur
type UserSignalAggregator struct {
	storageDir string
	emitter    *EventEmitter
}

// NewUserSignalAggregator creates a new user signal aggregator
func NewUserSignalAggregator() *UserSignalAggregator {
	storageDir := os.Getenv("AI_V2_STORAGE_DIR")
	if storageDir == "" {
		storageDir = "./storage/ai-v2"
	}
	
	// Ensure user signals directory exists
	signalsDir := filepath.Join(storageDir, "user-signals")
	os.MkdirAll(signalsDir, 0755)
	
	return &UserSignalAggregator{
		storageDir: signalsDir,
		emitter:    GetEventEmitter(),
	}
}

// AddSignal adds a user signal and aggregates
// PHASE 5: Aggregate dwell time, bounce rate, scroll depth
func (a *UserSignalAggregator) AddSignal(signal UserSignal) error {
	// Load existing aggregated data
	aggregated, err := a.getAggregated(signal.PageID, signal.Version)
	if err != nil {
		// Create new aggregated
		aggregated = &AggregatedUserSignal{
			PageID:        signal.PageID,
			Version:       signal.Version,
			SampleCount:   0,
			AvgDwellTime:  0,
			AvgBounceRate: 0,
			AvgScrollDepth: 0,
		}
	}
	
	// Update aggregated values (running average)
	signal.Timestamp = time.Now().Format(time.RFC3339)
	aggregated.SampleCount++
	
	// Running average calculation
	aggregated.AvgDwellTime = (aggregated.AvgDwellTime*float64(aggregated.SampleCount-1) + signal.DwellTime) / float64(aggregated.SampleCount)
	aggregated.AvgBounceRate = (aggregated.AvgBounceRate*float64(aggregated.SampleCount-1) + signal.BounceRate) / float64(aggregated.SampleCount)
	aggregated.AvgScrollDepth = (aggregated.AvgScrollDepth*float64(aggregated.SampleCount-1) + signal.ScrollDepth) / float64(aggregated.SampleCount)
	aggregated.LastUpdated = signal.Timestamp
	
	// Save aggregated data
	if err := a.saveAggregated(aggregated); err != nil {
		return err
	}
	
	// PHASE 5: Emit USER_SIGNAL_AGGREGATED event setiap N samples atau interval waktu
	// Emit jika sample count mencapai threshold (mis. setiap 10 samples)
	if aggregated.SampleCount%10 == 0 {
		a.emitAggregatedSignal(aggregated)
	}
	
	return nil
}

// emitAggregatedSignal emits USER_SIGNAL_AGGREGATED event
// PHASE 5: Emit event USER_SIGNAL_AGGREGATED
func (a *UserSignalAggregator) emitAggregatedSignal(aggregated *AggregatedUserSignal) {
	log.Printf("[USER SIGNAL AGGREGATOR] Emitting USER_SIGNAL_AGGREGATED: pageId=%s, version=%d, samples=%d", 
		aggregated.PageID, aggregated.Version, aggregated.SampleCount)
	
	// Create custom event type for aggregated signals
	// For now, use USER_INTERACTION_UPDATED with aggregated data
	a.emitter.EmitUserInteractionUpdated(aggregated.PageID, aggregated.Version, "blog", map[string]interface{}{
		"dwellTime":  aggregated.AvgDwellTime,
		"bounceRate": aggregated.AvgBounceRate,
		"scrollDepth": aggregated.AvgScrollDepth,
		"sampleCount": aggregated.SampleCount,
		"aggregated":  true,
	})
}

// GetAggregated retrieves aggregated user signals
func (a *UserSignalAggregator) GetAggregated(pageID string, version int) (*AggregatedUserSignal, error) {
	return a.getAggregated(pageID, version)
}

// getAggregated retrieves aggregated data from storage
func (a *UserSignalAggregator) getAggregated(pageID string, version int) (*AggregatedUserSignal, error) {
	filename := filepath.Join(a.storageDir, pageID, fmt.Sprintf("v%d_aggregated.json", version))
	
	data, err := ioutil.ReadFile(filename)
	if err != nil {
		return nil, err
	}
	
	var aggregated AggregatedUserSignal
	if err := json.Unmarshal(data, &aggregated); err != nil {
		return nil, err
	}
	
	return &aggregated, nil
}

// saveAggregated saves aggregated data to storage
func (a *UserSignalAggregator) saveAggregated(aggregated *AggregatedUserSignal) error {
	pageDir := filepath.Join(a.storageDir, aggregated.PageID)
	os.MkdirAll(pageDir, 0755)
	
	filename := filepath.Join(pageDir, fmt.Sprintf("v%d_aggregated.json", aggregated.Version))
	
	data, err := json.MarshalIndent(aggregated, "", "  ")
	if err != nil {
		return fmt.Errorf("failed to marshal aggregated signals: %w", err)
	}
	
	if err := ioutil.WriteFile(filename, data, 0644); err != nil {
		return fmt.Errorf("failed to write aggregated signals: %w", err)
	}
	
	return nil
}
