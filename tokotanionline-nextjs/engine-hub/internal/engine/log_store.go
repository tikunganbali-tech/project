package engine

import (
	"sync"
	"time"
)

var (
	logMu    sync.RWMutex
	logBuf   = make([]EngineLog, 500) // ring buffer
	logStart = 0                      // index of oldest entry
	logCount = 0                      // number of valid entries (<= len(logBuf))
)

func AddLog(entry EngineLog) {
	if entry.Timestamp.IsZero() {
		entry.Timestamp = time.Now()
	}

	logMu.Lock()
	defer logMu.Unlock()

	capacity := len(logBuf)
	if capacity == 0 {
		return
	}

	// If buffer not full, write at end.
	if logCount < capacity {
		idx := (logStart + logCount) % capacity
		logBuf[idx] = entry
		logCount++
		return
	}

	// Buffer full: overwrite oldest and advance start.
	logBuf[logStart] = entry
	logStart = (logStart + 1) % capacity
}

func GetLogs(limit int) []EngineLog {
	logMu.RLock()
	defer logMu.RUnlock()

	if limit <= 0 {
		limit = 20
	}

	if logCount == 0 {
		return []EngineLog{}
	}

	if limit > logCount {
		limit = logCount
	}

	capacity := len(logBuf)
	// We want the last `limit` logs, in chronological order.
	first := (logStart + (logCount - limit)) % capacity
	out := make([]EngineLog, 0, limit)
	for i := 0; i < limit; i++ {
		out = append(out, logBuf[(first+i)%capacity])
	}
	return out
}
