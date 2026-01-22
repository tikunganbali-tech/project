package engine

import (
	"sync"
	"time"
)

type TrackingEngine struct {
	status EngineStatus
	mu     sync.RWMutex
}

func NewTrackingEngine() *TrackingEngine {
	return &TrackingEngine{
		status: StatusOff,
	}
}

func (t *TrackingEngine) Name() string {
	return "tracking"
}

func (t *TrackingEngine) Start() error {
	t.mu.Lock()
	defer t.mu.Unlock()
	t.status = StatusOn

	AddLog(EngineLog{
		Level:     "INFO",
		Message:   t.Name() + ": started",
		Timestamp: time.Now(),
	})

	return nil
}

func (t *TrackingEngine) Stop() error {
	t.mu.Lock()
	defer t.mu.Unlock()
	t.status = StatusOff

	AddLog(EngineLog{
		Level:     "INFO",
		Message:   t.Name() + ": stopped",
		Timestamp: time.Now(),
	})

	return nil
}

func (t *TrackingEngine) Status() EngineStatus {
	t.mu.RLock()
	defer t.mu.RUnlock()
	return t.status
}
