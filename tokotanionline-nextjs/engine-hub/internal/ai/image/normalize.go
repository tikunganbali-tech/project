package image

import (
	"fmt"
	"strings"
)

// NormalizeImagePath normalizes an image path to the standard format: /images/...
// 
// M-02: Image Path Normalization
// Rules:
// - Removes /public/ prefix if present
// - Validates that path starts with /images/
// - Panics if path is invalid (fail-fast)
//
// This function MUST be called before:
// - Saving media to database
// - Returning AI response
// - Publishing content
func NormalizeImagePath(path string) string {
	if path == "" {
		panic("image path empty")
	}

	// Remove /public prefix if present
	if strings.HasPrefix(path, "/public/") {
		path = strings.Replace(path, "/public", "", 1)
	}

	// Validate that path starts with /images/
	if !strings.HasPrefix(path, "/images/") {
		panic(fmt.Sprintf("invalid image path: %s. Must start with /images/", path))
	}

	return path
}

// NormalizeImagePathSafe normalizes an image path, returning empty string if invalid instead of panicking.
// Useful for optional image fields.
func NormalizeImagePathSafe(path string) string {
	if path == "" {
		return ""
	}

	// Remove /public prefix if present
	if strings.HasPrefix(path, "/public/") {
		path = strings.Replace(path, "/public", "", 1)
	}

	// Validate that path starts with /images/
	if !strings.HasPrefix(path, "/images/") {
		return "" // Return empty string for invalid paths
	}

	return path
}
