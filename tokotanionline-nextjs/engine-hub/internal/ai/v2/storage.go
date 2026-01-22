package v2

import (
	"encoding/json"
	"fmt"
	"io/ioutil"
	"log"
	"os"
	"path/filepath"
	"sort"
	"strconv"
	"strings"
)

// Storage handles versioned content storage
// PHASE 1.5: Versioning - setiap generate → version +1, tidak overwrite
type Storage struct {
	storageDir string
}

// NewStorage creates a new storage instance
func NewStorage() *Storage {
	// Get storage directory from environment or use default
	storageDir := os.Getenv("AI_V2_STORAGE_DIR")
	if storageDir == "" {
		storageDir = "./storage/ai-v2"
	}
	
	// Ensure storage directory exists
	if err := os.MkdirAll(storageDir, 0755); err != nil {
		log.Printf("[AI V2 STORAGE] WARNING: Failed to create storage directory: %v", err)
		log.Printf("[AI V2 STORAGE] Using fallback: current directory")
		storageDir = "./ai-v2-storage"
		os.MkdirAll(storageDir, 0755)
	}
	
	log.Printf("[AI V2 STORAGE] Storage directory: %s", storageDir)
	
	return &Storage{
		storageDir: storageDir,
	}
}

// StoredContent represents stored content with metadata
type StoredContent struct {
	PageID    string                 `json:"pageId"`
	Version   int                    `json:"version"`
	Package   FrontendContentPackage  `json:"package"`
	CreatedAt string                 `json:"createdAt"`
}

// Save saves a FrontendContentPackage with versioning
// PHASE 1.5: Tidak overwrite - setiap generate → version +1
func (s *Storage) Save(pageID string, pkg FrontendContentPackage) (int, error) {
	// Get next version for this page_id
	nextVersion, err := s.getNextVersion(pageID)
	if err != nil {
		return 0, fmt.Errorf("failed to get next version: %w", err)
	}
	
	// Update package version
	pkg.Metadata.Version = nextVersion
	
	// Create stored content
	stored := StoredContent{
		PageID:    pageID,
		Version:   nextVersion,
		Package:   pkg,
		CreatedAt: pkg.Metadata.GeneratedAt,
	}
	
	// Save to file: storage/{page_id}/v{version}.json
	pageDir := filepath.Join(s.storageDir, pageID)
	if err := os.MkdirAll(pageDir, 0755); err != nil {
		return 0, fmt.Errorf("failed to create page directory: %w", err)
	}
	
	filename := filepath.Join(pageDir, fmt.Sprintf("v%d.json", nextVersion))
	
	// Marshal to JSON
	data, err := json.MarshalIndent(stored, "", "  ")
	if err != nil {
		return 0, fmt.Errorf("failed to marshal content: %w", err)
	}
	
	// Write to file
	if err := ioutil.WriteFile(filename, data, 0644); err != nil {
		return 0, fmt.Errorf("failed to write file: %w", err)
	}
	
	log.Printf("[AI V2 STORAGE] Saved: pageId=%s, version=%d, file=%s", pageID, nextVersion, filename)
	
	return nextVersion, nil
}

// Get retrieves a specific version of content
func (s *Storage) Get(pageID string, version int) (*StoredContent, error) {
	filename := filepath.Join(s.storageDir, pageID, fmt.Sprintf("v%d.json", version))
	
	data, err := ioutil.ReadFile(filename)
	if err != nil {
		return nil, fmt.Errorf("failed to read file: %w", err)
	}
	
	var stored StoredContent
	if err := json.Unmarshal(data, &stored); err != nil {
		return nil, fmt.Errorf("failed to unmarshal content: %w", err)
	}
	
	return &stored, nil
}

// GetAllVersions retrieves all versions for a page_id
func (s *Storage) GetAllVersions(pageID string) ([]StoredContent, error) {
	pageDir := filepath.Join(s.storageDir, pageID)
	
	// Check if directory exists
	if _, err := os.Stat(pageDir); os.IsNotExist(err) {
		return []StoredContent{}, nil
	}
	
	// Read all version files
	files, err := ioutil.ReadDir(pageDir)
	if err != nil {
		return nil, fmt.Errorf("failed to read directory: %w", err)
	}
	
	var versions []StoredContent
	
	for _, file := range files {
		if file.IsDir() {
			continue
		}
		
		// Check if file matches v{number}.json pattern
		filename := file.Name()
		if !strings.HasPrefix(filename, "v") || !strings.HasSuffix(filename, ".json") {
			continue
		}
		
		// Extract version number
		versionStr := strings.TrimPrefix(strings.TrimSuffix(filename, ".json"), "v")
		version, err := strconv.Atoi(versionStr)
		if err != nil {
			log.Printf("[AI V2 STORAGE] WARNING: Invalid version file: %s", filename)
			continue
		}
		
		// Read file
		stored, err := s.Get(pageID, version)
		if err != nil {
			log.Printf("[AI V2 STORAGE] WARNING: Failed to read version %d: %v", version, err)
			continue
		}
		
		versions = append(versions, *stored)
	}
	
	// Sort by version (ascending)
	sort.Slice(versions, func(i, j int) bool {
		return versions[i].Version < versions[j].Version
	})
	
	return versions, nil
}

// GetLatest retrieves the latest version for a page_id
func (s *Storage) GetLatest(pageID string) (*StoredContent, error) {
	versions, err := s.GetAllVersions(pageID)
	if err != nil {
		return nil, err
	}
	
	if len(versions) == 0 {
		return nil, fmt.Errorf("no versions found for page_id: %s", pageID)
	}
	
	// Return last version (highest version number)
	return &versions[len(versions)-1], nil
}

// getNextVersion calculates the next version number for a page_id
func (s *Storage) getNextVersion(pageID string) (int, error) {
	versions, err := s.GetAllVersions(pageID)
	if err != nil {
		return 0, err
	}
	
	if len(versions) == 0 {
		return 1, nil // First version
	}
	
	// Get highest version and increment
	maxVersion := 0
	for _, v := range versions {
		if v.Version > maxVersion {
			maxVersion = v.Version
		}
	}
	
	return maxVersion + 1, nil
}

// ListPageIDs lists all page_ids that have stored content
func (s *Storage) ListPageIDs() ([]string, error) {
	// Check if storage directory exists
	if _, err := os.Stat(s.storageDir); os.IsNotExist(err) {
		return []string{}, nil
	}
	
	// Read all directories (each is a page_id)
	entries, err := ioutil.ReadDir(s.storageDir)
	if err != nil {
		return nil, fmt.Errorf("failed to read storage directory: %w", err)
	}
	
	var pageIDs []string
	for _, entry := range entries {
		if entry.IsDir() {
			pageIDs = append(pageIDs, entry.Name())
		}
	}
	
	return pageIDs, nil
}
