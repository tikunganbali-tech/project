package marketing

import (
	"log"
	"sync"

	"engine-hub/internal/marketing/adapters"
)

// AdapterManager manages marketing platform adapters
type AdapterManager struct {
	mu       sync.RWMutex
	adapters map[string]adapters.MarketingAdapter // Key: integration type (FACEBOOK, GOOGLE, TIKTOK)
}

var (
	globalAdapterManager *AdapterManager
	adapterManagerOnce   sync.Once
)

// InitAdapterManager initializes the global adapter manager
func InitAdapterManager() {
	adapterManagerOnce.Do(func() {
		// Initialize live config and error tracker first
		adapters.InitLiveConfig()
		adapters.InitErrorTracker()
		
		globalAdapterManager = &AdapterManager{
			adapters: make(map[string]adapters.MarketingAdapter),
		}

		// Initialize adapters
		facebookAdapter := adapters.NewFacebookAdapter()
		googleAdapter := adapters.NewGoogleAdapter()
		tiktokAdapter := adapters.NewTikTokAdapter()

		// Register adapters
		globalAdapterManager.adapters["FACEBOOK"] = facebookAdapter
		globalAdapterManager.adapters["GOOGLE"] = googleAdapter
		globalAdapterManager.adapters["TIKTOK"] = tiktokAdapter

		log.Println("[ADAPTER MANAGER] Initialized adapters: FACEBOOK, GOOGLE, TIKTOK")
		log.Println("[ADAPTER MANAGER] Live config and error tracking enabled")
	})
}

// GetAdapterManager returns the global adapter manager instance
func GetAdapterManager() *AdapterManager {
	if globalAdapterManager == nil {
		InitAdapterManager()
	}
	return globalAdapterManager
}

// GetAdapter returns an adapter by integration type
func (m *AdapterManager) GetAdapter(integrationType string) (adapters.MarketingAdapter, bool) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	adapter, ok := m.adapters[integrationType]
	return adapter, ok
}

// GetAdapter returns the global adapter by integration type (convenience function)
func GetAdapter(integrationType string) (adapters.MarketingAdapter, bool) {
	return GetAdapterManager().GetAdapter(integrationType)
}

