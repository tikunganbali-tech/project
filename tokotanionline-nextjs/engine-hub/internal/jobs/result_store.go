package jobs

import "sync"

var (
	resultMu sync.Mutex
	results  []JobResult
)

func AddResult(r JobResult) {
	resultMu.Lock()
	defer resultMu.Unlock()
	results = append(results, r)
}

func GetResults(limit int) []JobResult {
	resultMu.Lock()
	defer resultMu.Unlock()

	if limit > len(results) {
		limit = len(results)
	}

	start := len(results) - limit
	if start < 0 {
		start = 0
	}

	return results[start:]
}


