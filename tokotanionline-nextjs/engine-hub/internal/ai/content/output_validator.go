package content

import (
	"fmt"
	"regexp"
	"strings"
)

// ValidateOutputContract validates AI output according to KONTRAK FINAL
// KONTRAK FINAL: Output contract wajib, FAIL HARD jika tidak sesuai
func ValidateOutputContract(result *ContentResult) error {
	// Rule 1: Title tidak boleh kosong (hanya cek empty, tidak ada minimum panjang)
	// STEP 1 FIX: Tidak ada minimum panjang, judul pendek sah (sesuai Google)
	if strings.TrimSpace(result.Title) == "" {
		return fmt.Errorf("OUTPUT_CONTRACT_VIOLATION: title is required")
	}
	if len(result.Title) > 100 {
		// Auto-truncate instead of failing
		result.Title = result.Title[:97] + "..."
	}

	// Rule 3: Content tidak boleh kosong
	if result.Body == "" {
		return fmt.Errorf("OUTPUT_CONTRACT_VIOLATION: content is required")
	}

	// Rule 4: Content harus memiliki minimal 1 H2 heading
	h2Count := strings.Count(result.Body, "## ")
	if h2Count < 1 {
		return fmt.Errorf("OUTPUT_CONTRACT_VIOLATION: content must have at least 1 H2 heading (found %d)", h2Count)
	}

	// Rule 5: Meta description tidak boleh kosong
	if result.MetaDesc == "" {
		return fmt.Errorf("OUTPUT_CONTRACT_VIOLATION: meta_description is required")
	}

	// Rule 6: Meta description max 300 chars (auto-trim, bukan reject)
	// STEP 2 FIX: Trim, bukan reject - SEO modern friendly, tidak mematikan generator
	if len(result.MetaDesc) > 300 {
		result.MetaDesc = result.MetaDesc[:300]
	}

	// Rule 7: Outline validation (extract headings from content)
	outline := extractOutline(result.Body)
	if len(outline) < 2 {
		return fmt.Errorf("OUTPUT_CONTRACT_VIOLATION: outline must have at least 2 items (H2 headings), found %d", len(outline))
	}
	if len(outline) > 20 {
		return fmt.Errorf("OUTPUT_CONTRACT_VIOLATION: outline exceeds 20 items (found %d)", len(outline))
	}

	return nil
}

// extractOutline extracts heading structure from markdown content
func extractOutline(body string) []string {
	var outline []string
	lines := strings.Split(body, "\n")

	for _, line := range lines {
		line = strings.TrimSpace(line)
		
		// Extract H2 headings (## heading)
		if strings.HasPrefix(line, "## ") && !strings.HasPrefix(line, "### ") {
			heading := strings.TrimPrefix(line, "## ")
			outline = append(outline, heading)
		}
		
		// Extract H3 headings (### heading)
		if strings.HasPrefix(line, "### ") {
			heading := strings.TrimPrefix(line, "### ")
			outline = append(outline, heading)
		}
	}

	return outline
}

// ValidateOutputStructure validates the structure of output
// KONTRAK FINAL: Struktur harus sesuai, tidak ada shortcut
func ValidateOutputStructure(result *ContentResult) error {
	// Check for required markdown structure
	if !hasMarkdownHeadings(result.Body) {
		return fmt.Errorf("OUTPUT_STRUCTURE_ERROR: content must contain markdown headings (## or ###)")
	}

	// Check for heading hierarchy (no jumping)
	if err := validateHeadingHierarchy(result.Body); err != nil {
		return fmt.Errorf("OUTPUT_STRUCTURE_ERROR: %v", err)
	}

	return nil
}

// hasMarkdownHeadings checks if content has markdown headings
func hasMarkdownHeadings(body string) bool {
	// Check for H2 or H3 headings
	h2Pattern := regexp.MustCompile(`^##\s+`)
	h3Pattern := regexp.MustCompile(`^###\s+`)

	lines := strings.Split(body, "\n")
	for _, line := range lines {
		line = strings.TrimSpace(line)
		if h2Pattern.MatchString(line) || h3Pattern.MatchString(line) {
			return true
		}
	}

	return false
}

// validateHeadingHierarchy validates heading hierarchy (no jumping)
func validateHeadingHierarchy(body string) error {
	lines := strings.Split(body, "\n")
	var lastLevel int = 0

	for _, line := range lines {
		line = strings.TrimSpace(line)
		
		var currentLevel int = 0
		if strings.HasPrefix(line, "## ") && !strings.HasPrefix(line, "### ") {
			currentLevel = 2
		} else if strings.HasPrefix(line, "### ") {
			currentLevel = 3
		}

		if currentLevel > 0 {
			// Check for hierarchy violation (jumping from H2 to H3 is OK, but not from nothing to H3)
			if lastLevel == 0 && currentLevel == 3 {
				return fmt.Errorf("heading hierarchy violation: H3 found without preceding H2")
			}
			lastLevel = currentLevel
		}
	}

	return nil
}
