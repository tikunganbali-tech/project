package engine

import (
	"sync"
)

var (
	engines = make(map[string]Engine)
	mu      sync.RWMutex
)

// Register registers an engine in the registry
func Register(e Engine) {
	mu.Lock()
	defer mu.Unlock()
	engines[e.Name()] = e
}

// Get retrieves an engine by name
func Get(name string) (Engine, bool) {
	mu.RLock()
	defer mu.RUnlock()
	e, ok := engines[name]
	return e, ok
}

// GetAll returns all registered engines
func GetAll() map[string]Engine {
	mu.RLock()
	defer mu.RUnlock()
	result := make(map[string]Engine)
	for name, e := range engines {
		result[name] = e
	}
	return result
}

// GetStatuses returns the status of all registered engines
func GetStatuses() map[string]EngineStatus {
	mu.RLock()
	defer mu.RUnlock()
	result := make(map[string]EngineStatus)
	for name, e := range engines {
		result[name] = e.Status()
	}
	return result
}


