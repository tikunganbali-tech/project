package image

import (
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"
)

// Storage handles downloading and saving images locally
type Storage struct {
	baseDir    string // Base directory for uploads (relative to Next.js public folder)
	httpClient *http.Client
}

// NewStorage creates a new image storage handler
// FASE C - C4: Storage path locked to /public/images/articles/{slug}/
func NewStorage() *Storage {
	// Get base directory from env or use default
	baseDir := os.Getenv("IMAGE_STORAGE_DIR")
	if baseDir == "" {
		// FASE C - C4: Default path is /public/images/articles/
		// Server runs from engine-hub, so go up one level to workspace root
		baseDir = filepath.Join("..", "public", "images", "articles")
		
		// Resolve to absolute path to ensure consistency
		absBaseDir, err := filepath.Abs(baseDir)
		if err == nil {
			baseDir = absBaseDir
			log.Printf("[IMAGE STORAGE] Using base directory: %s", baseDir)
		} else {
			log.Printf("[IMAGE STORAGE] WARNING: Failed to resolve absolute path, using relative: %s", baseDir)
		}
	} else {
		log.Printf("[IMAGE STORAGE] Using IMAGE_STORAGE_DIR from env: %s", baseDir)
	}

	return &Storage{
		baseDir: baseDir,
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
}

// DownloadAndSave downloads an image from URL and saves it locally
// Returns the relative path from public folder (e.g., /uploads/artikel-slug/hero.webp)
func (s *Storage) DownloadAndSave(imageURL string, articleSlug string, filename string) (string, error) {
	log.Printf("[IMAGE STORAGE] Starting download: URL=%s, slug=%s, filename=%s", imageURL, articleSlug, filename)
	log.Printf("[IMAGE STORAGE] Base directory: %s", s.baseDir)

	// Download image
	resp, err := s.httpClient.Get(imageURL)
	if err != nil {
		log.Printf("[IMAGE STORAGE] ERROR: Failed to download image: %v", err)
		return "", fmt.Errorf("failed to download image: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		log.Printf("[IMAGE STORAGE] ERROR: HTTP status %d", resp.StatusCode)
		return "", fmt.Errorf("failed to download image: status %d", resp.StatusCode)
	}

	// Read image data
	imageData, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("failed to read image data: %w", err)
	}

	// Detect image format from Content-Type header
	contentType := resp.Header.Get("Content-Type")
	fileExt := ".png" // Default to PNG (DALL-E returns PNG)
	if strings.Contains(contentType, "image/png") {
		fileExt = ".png"
	} else if strings.Contains(contentType, "image/jpeg") || strings.Contains(contentType, "image/jpg") {
		fileExt = ".jpg"
	} else if strings.Contains(contentType, "image/webp") {
		fileExt = ".webp"
	}

	// Create directory structure: public/uploads/artikel-slug/
	articleDir := filepath.Join(s.baseDir, articleSlug)
	log.Printf("[IMAGE STORAGE] Creating directory: %s", articleDir)
	if err := os.MkdirAll(articleDir, 0755); err != nil {
		log.Printf("[IMAGE STORAGE] ERROR: Failed to create directory: %v", err)
		return "", fmt.Errorf("failed to create directory: %w", err)
	}
	log.Printf("[IMAGE STORAGE] Directory created successfully")

	// Ensure filename has correct extension based on detected format
	// TODO: Add webp conversion for better performance (currently saving as PNG/JPG from API)
	currentExt := filepath.Ext(filename)
	if currentExt == "" || currentExt != fileExt {
		filename = strings.TrimSuffix(filename, currentExt) + fileExt
	}

	// Save image file
	filePath := filepath.Join(articleDir, filename)
	if err := os.WriteFile(filePath, imageData, 0644); err != nil {
		return "", fmt.Errorf("failed to save image: %w", err)
	}

	// FASE C - C4: Return relative path from public folder
	// Path format: /images/articles/{slug}/{filename}
	relativePath := fmt.Sprintf("/images/articles/%s/%s", articleSlug, filename)
	
	// M-02: Normalize path before returning (ensures consistency)
	normalizedPath := NormalizeImagePath(relativePath)
	log.Printf("[IMAGE STORAGE] Image saved to: %s (relative: %s)", filePath, normalizedPath)

	return normalizedPath, nil
}

// GenerateSlugFromTitle creates a URL-friendly slug from title
func GenerateSlugFromTitle(title string) string {
	// Convert to lowercase
	slug := strings.ToLower(title)

	// Replace spaces with hyphens
	slug = strings.ReplaceAll(slug, " ", "-")

	// Remove special characters, keep only alphanumeric and hyphens
	var result strings.Builder
	for _, char := range slug {
		if (char >= 'a' && char <= 'z') || (char >= '0' && char <= '9') || char == '-' {
			result.WriteRune(char)
		}
	}

	slug = result.String()

	// Remove multiple consecutive hyphens
	for strings.Contains(slug, "--") {
		slug = strings.ReplaceAll(slug, "--", "-")
	}

	// Trim hyphens from start and end
	slug = strings.Trim(slug, "-")

	// Limit length
	if len(slug) > 100 {
		slug = slug[:100]
		slug = strings.Trim(slug, "-")
	}

	return slug
}

// M-05: DownloadAndSaveProduct downloads and saves product images to /images/products/{slug}/
// Similar to DownloadAndSave but uses products directory instead of articles
func (s *Storage) DownloadAndSaveProduct(imageURL string, productSlug string, filename string) (string, error) {
	log.Printf("[PRODUCT IMAGE STORAGE] Starting download: URL=%s, slug=%s, filename=%s", imageURL, productSlug, filename)

	// Download image
	resp, err := s.httpClient.Get(imageURL)
	if err != nil {
		log.Printf("[PRODUCT IMAGE STORAGE] ERROR: Failed to download image: %v", err)
		return "", fmt.Errorf("failed to download image: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		log.Printf("[PRODUCT IMAGE STORAGE] ERROR: HTTP status %d", resp.StatusCode)
		return "", fmt.Errorf("failed to download image: status %d", resp.StatusCode)
	}

	// Read image data
	imageData, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("failed to read image data: %w", err)
	}

	// Detect image format from Content-Type header
	contentType := resp.Header.Get("Content-Type")
	fileExt := ".png" // Default to PNG (DALL-E returns PNG)
	if strings.Contains(contentType, "image/png") {
		fileExt = ".png"
	} else if strings.Contains(contentType, "image/jpeg") || strings.Contains(contentType, "image/jpg") {
		fileExt = ".jpg"
	} else if strings.Contains(contentType, "image/webp") {
		fileExt = ".webp"
	}

	// M-05: Create directory structure: public/images/products/{slug}/
	// Server runs from engine-hub, so go up one level to workspace root
	productsBaseDir := filepath.Join("..", "public", "images", "products")
	productDir := filepath.Join(productsBaseDir, productSlug)
	
	// Resolve to absolute path
	absProductDir, err := filepath.Abs(productDir)
	if err == nil {
		productDir = absProductDir
	}
	
	log.Printf("[PRODUCT IMAGE STORAGE] Creating directory: %s", productDir)
	if err := os.MkdirAll(productDir, 0755); err != nil {
		log.Printf("[PRODUCT IMAGE STORAGE] ERROR: Failed to create directory: %v", err)
		return "", fmt.Errorf("failed to create directory: %w", err)
	}
	log.Printf("[PRODUCT IMAGE STORAGE] Directory created successfully")

	// Ensure filename has correct extension
	currentExt := filepath.Ext(filename)
	if currentExt == "" || currentExt != fileExt {
		filename = strings.TrimSuffix(filename, currentExt) + fileExt
	}

	// Save image file
	filePath := filepath.Join(productDir, filename)
	if err := os.WriteFile(filePath, imageData, 0644); err != nil {
		return "", fmt.Errorf("failed to save image: %w", err)
	}

	// M-05: Return relative path from public folder
	// Path format: /images/products/{slug}/{filename}
	relativePath := fmt.Sprintf("/images/products/%s/%s", productSlug, filename)
	
	// M-02: Normalize path before returning (ensures consistency)
	normalizedPath := NormalizeImagePath(relativePath)
	log.Printf("[PRODUCT IMAGE STORAGE] Image saved to: %s (relative: %s)", filePath, normalizedPath)

	return normalizedPath, nil
}
