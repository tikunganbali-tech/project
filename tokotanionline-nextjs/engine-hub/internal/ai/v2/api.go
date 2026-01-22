package v2

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"strconv"
	"strings"
)

// APIHandler handles HTTP requests for AI Generator v2
type APIHandler struct {
	generator *Generator
	storage   *Storage
}

// NewAPIHandler creates a new API handler
func NewAPIHandler() *APIHandler {
	generator := NewGenerator()
	storage := NewStorage()
	
	return &APIHandler{
		generator: generator,
		storage:   storage,
	}
}

// HandleGenerate handles POST /api/v2/generate
// PHASE 7A: Brand-aware generation - extracts brand context from headers or request body
func (h *APIHandler) HandleGenerate(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
	
	var req GenerationRequest
	bodyBytes, err := io.ReadAll(r.Body)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to read request body: %v", err), http.StatusBadRequest)
		return
	}
	if err := json.Unmarshal(bodyBytes, &req); err != nil {
		http.Error(w, fmt.Sprintf("Invalid request body: %v", err), http.StatusBadRequest)
		return
	}

	// LAUNCH MODE COMPATIBILITY:
	// Accept minimal payloads:
	// - brandContext: {"id":"...","name":"..."}
	// - localeContext: {"code":"id-ID"}
	// Map them into the strict v2 structures (brandId/localeId required by guardrails).
	var raw map[string]json.RawMessage
	_ = json.Unmarshal(bodyBytes, &raw)

	if req.BrandContext != nil && req.BrandContext.BrandID == "" {
		if bcRaw, ok := raw["brandContext"]; ok && len(bcRaw) > 0 {
			var legacy struct {
				ID     string `json:"id"`
				Name   string `json:"name"`
				Slug   string `json:"slug"`
				Status string `json:"status"`
			}
			if err := json.Unmarshal(bcRaw, &legacy); err == nil {
				if legacy.ID != "" {
					req.BrandContext.BrandID = legacy.ID
				}
				if req.BrandContext.BrandName == "" && legacy.Name != "" {
					req.BrandContext.BrandName = legacy.Name
				}
				if req.BrandContext.BrandSlug == "" && legacy.Slug != "" {
					req.BrandContext.BrandSlug = legacy.Slug
				}
				if req.BrandContext.BrandStatus == "" && legacy.Status != "" {
					req.BrandContext.BrandStatus = legacy.Status
				}
				if req.BrandContext.BrandStatus == "" {
					req.BrandContext.BrandStatus = "ACTIVE"
				}
				// Deterministic fallback slug
				if req.BrandContext.BrandSlug == "" {
					if req.BrandContext.BrandName != "" {
						req.BrandContext.BrandSlug = strings.ToLower(strings.ReplaceAll(strings.TrimSpace(req.BrandContext.BrandName), " ", "-"))
					} else {
						req.BrandContext.BrandSlug = strings.ToLower(strings.TrimSpace(req.BrandContext.BrandID))
					}
				}
			}
		}
	}

	if req.LocaleContext != nil && req.LocaleContext.LocaleID == "" {
		if lcRaw, ok := raw["localeContext"]; ok && len(lcRaw) > 0 {
			var legacy struct {
				ID          string `json:"id"`
				Code        string `json:"code"`
				Language    string `json:"languageName"`
				IsActive    *bool  `json:"isActive"`
				IsDefault   *bool  `json:"isDefault"`
			}
			if err := json.Unmarshal(lcRaw, &legacy); err == nil {
				// Prefer explicit id, else derive from code
				if legacy.ID != "" {
					req.LocaleContext.LocaleID = legacy.ID
				} else if legacy.Code != "" {
					req.LocaleContext.LocaleID = legacy.Code
				}
				if req.LocaleContext.LocaleCode == "" && legacy.Code != "" {
					req.LocaleContext.LocaleCode = legacy.Code
				}
				if req.LocaleContext.LanguageName == "" && legacy.Language != "" {
					req.LocaleContext.LanguageName = legacy.Language
				}
				if legacy.IsDefault != nil {
					req.LocaleContext.IsDefault = *legacy.IsDefault
				}
				if legacy.IsActive != nil {
					req.LocaleContext.IsActive = *legacy.IsActive
				} else if legacy.Code != "" {
					// For launch-mode minimal payload, default to active when code provided.
					req.LocaleContext.IsActive = true
				}
				// Deterministic fallback language name for common codes
				if req.LocaleContext.LanguageName == "" {
					switch strings.ToLower(req.LocaleContext.LocaleCode) {
					case "id-id", "id":
						req.LocaleContext.LanguageName = "Indonesian"
					case "en-us", "en":
						req.LocaleContext.LanguageName = "English"
					default:
						req.LocaleContext.LanguageName = "Unknown"
					}
				}
			}
		}
	}
	
	// PHASE 7A: Extract brand context from header if not in request body
	if req.BrandContext == nil {
		brandID := r.Header.Get("X-Brand-Id")
		if brandID != "" {
			// In production, you would fetch full brand context from database
			// For now, create minimal context from header
			req.BrandContext = &BrandContext{
				BrandID:     brandID,
				BrandName:   r.Header.Get("X-Brand-Name"),
				BrandSlug:   r.Header.Get("X-Brand-Slug"),
				BrandStatus: r.Header.Get("X-Brand-Status"),
			}
			if req.BrandContext.BrandStatus == "" {
				req.BrandContext.BrandStatus = "ACTIVE"
			}
		}
	}
	
	// PHASE 7B: Extract locale context from header if not in request body
	if req.LocaleContext == nil {
		localeID := r.Header.Get("X-Locale-Id")
		if localeID != "" {
			// In production, you would fetch full locale context from database
			// For now, create minimal context from header
			req.LocaleContext = &LocaleContext{
				LocaleID:     localeID,
				LocaleCode:   r.Header.Get("X-Locale-Code"),
				LanguageName: r.Header.Get("X-Language-Name"),
				IsDefault:    r.Header.Get("X-Is-Default") == "true",
				IsActive:     r.Header.Get("X-Is-Active") != "false",
			}
		}
	}
	
	log.Printf("[AI V2 API] Generate request: pageType=%s, topic=%s, brandId=%s, localeId=%s", 
		req.PageType, req.Topic, func() string {
			if req.BrandContext != nil {
				return req.BrandContext.BrandID
			}
			return "NONE"
		}(), func() string {
			if req.LocaleContext != nil {
				return req.LocaleContext.LocaleID
			}
			return "NONE"
		}())
	
	// Generate content
	result, err := h.generator.Generate(r.Context(), req)
	if err != nil {
		log.Printf("[AI V2 API] Generation failed: %v", err)
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"status": "FAILED",
			"error":  err.Error(),
		})
		return
	}
	
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(result)
}

// HandleGetContent handles GET /api/v2/content/:pageId/:version
func (h *APIHandler) HandleGetContent(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
	
	// Extract pageId and version from path
	// Path format: /api/v2/content/:pageId/:version
	path := r.URL.Path
	// Remove /api/v2/content/ prefix
	path = strings.TrimPrefix(path, "/api/v2/content/")
	parts := strings.Split(path, "/")
	
	if len(parts) < 2 {
		http.Error(w, "Invalid path format: /api/v2/content/:pageId/:version", http.StatusBadRequest)
		return
	}
	
	pageID := parts[0]
	versionStr := parts[1]
	
	version, err := strconv.Atoi(versionStr)
	if err != nil {
		http.Error(w, fmt.Sprintf("Invalid version: %s", versionStr), http.StatusBadRequest)
		return
	}
	
	log.Printf("[AI V2 API] Get content: pageId=%s, version=%d", pageID, version)
	
	// Get content from storage
	content, err := h.storage.Get(pageID, version)
	if err != nil {
		log.Printf("[AI V2 API] Content not found: %v", err)
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusNotFound)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"error": fmt.Sprintf("Content not found: %v", err),
		})
		return
	}
	
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(content)
}

// HandleGetAllVersions handles GET /api/v2/content/:pageId/versions
func (h *APIHandler) HandleGetAllVersions(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
	
	// Extract pageId from path
	path := r.URL.Path
	// Remove /api/v2/content/ prefix
	path = strings.TrimPrefix(path, "/api/v2/content/")
	parts := strings.Split(path, "/")
	
	if len(parts) < 1 {
		http.Error(w, "Invalid path format: /api/v2/content/:pageId/versions", http.StatusBadRequest)
		return
	}
	
	pageID := parts[0]
	
	log.Printf("[AI V2 API] Get all versions: pageId=%s", pageID)
	
	// Get all versions from storage
	versions, err := h.storage.GetAllVersions(pageID)
	if err != nil {
		log.Printf("[AI V2 API] Failed to get versions: %v", err)
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"error": fmt.Sprintf("Failed to get versions: %v", err),
		})
		return
	}
	
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"pageId":   pageID,
		"versions": versions,
	})
}

// HandleGetLatest handles GET /api/v2/content/:pageId/latest
func (h *APIHandler) HandleGetLatest(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
	
	// Extract pageId from path
	path := r.URL.Path
	// Remove /api/v2/content/ prefix
	path = strings.TrimPrefix(path, "/api/v2/content/")
	parts := strings.Split(path, "/")
	
	if len(parts) < 1 {
		http.Error(w, "Invalid path format: /api/v2/content/:pageId/latest", http.StatusBadRequest)
		return
	}
	
	pageID := parts[0]
	
	log.Printf("[AI V2 API] Get latest: pageId=%s", pageID)
	
	// Get latest version from storage
	content, err := h.storage.GetLatest(pageID)
	if err != nil {
		log.Printf("[AI V2 API] Content not found: %v", err)
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusNotFound)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"error": fmt.Sprintf("Content not found: %v", err),
		})
		return
	}
	
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(content)
}

// HandleListPages handles GET /api/v2/pages
func (h *APIHandler) HandleListPages(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
	
	log.Printf("[AI V2 API] List pages")
	
	// List all page IDs
	pageIDs, err := h.storage.ListPageIDs()
	if err != nil {
		log.Printf("[AI V2 API] Failed to list pages: %v", err)
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"error": fmt.Sprintf("Failed to list pages: %v", err),
		})
		return
	}
	
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"pages": pageIDs,
	})
}

// HandlePublishEvent handles POST /api/v2/events/publish
func (h *APIHandler) HandlePublishEvent(w http.ResponseWriter, r *http.Request) {
	HandlePublishEvent(w, r)
}

// HandleContentProducedEvent handles POST /api/v2/events/content-produced
func (h *APIHandler) HandleContentProducedEvent(w http.ResponseWriter, r *http.Request) {
	HandleContentProducedEvent(w, r)
}

// HandleUserInteractionEvent handles POST /api/v2/events/user-interaction
func (h *APIHandler) HandleUserInteractionEvent(w http.ResponseWriter, r *http.Request) {
	HandleUserInteractionEvent(w, r)
}
