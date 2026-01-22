package jobs

import "sync"

var (
	jobMu sync.Mutex
	jobs  []Job
)

func Add(job Job) {
	jobMu.Lock()
	defer jobMu.Unlock()
	jobs = append(jobs, job)
}

func Update(id string, status JobStatus) {
	jobMu.Lock()
	defer jobMu.Unlock()
	for i := range jobs {
		if jobs[i].ID == id {
			jobs[i].Status = status
			return
		}
	}
}

// FindByID finds a job by ID (STEP 18B-1: for manual run)
func FindByID(id string) *Job {
	jobMu.Lock()
	defer jobMu.Unlock()
	for i := range jobs {
		if jobs[i].ID == id {
			return &jobs[i]
		}
	}
	return nil
}

func List(limit int) []Job {
	jobMu.Lock()
	defer jobMu.Unlock()

	if limit > len(jobs) {
		limit = len(jobs)
	}
	start := len(jobs) - limit
	if start < 0 {
		start = 0
	}
	return jobs[start:]
}


