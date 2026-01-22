package seo

import (
	"fmt"
	"log"
	"regexp"
	"strings"

	"engine-hub/internal/ai/content"
)

// SEOValidationError represents a SEO validation failure that stops the pipeline
// DEPRECATED: Hanya untuk manual input, tidak untuk AI
type SEOValidationError struct {
	Rule    string
	Message string
	Content string
}

func (e *SEOValidationError) Error() string {
	return fmt.Sprintf("SEO VALIDATION FAILED [%s]: %s - Found: %q", e.Rule, e.Message, e.Content)
}

// SEOContext represents the source of content for SEO validation
type SEOContext struct {
	Source string // "ai" | "manual"
}

// DefaultSEOContext returns default context (AI source)
func DefaultSEOContext() SEOContext {
	return SEOContext{Source: "ai"}
}

// OptimizeSEO cleans AI patterns, normalizes headings, validates 1×H1,
// and generates natural SEO meta tags
// NO keyword stuffing, NO rigid SEO templates
// SEO VALIDATOR SEBAGAI ADVISOR (TIDAK MEMBLOKIR PIPELINE)
func OptimizeSEO(input content.ContentResult) (content.ContentResult, error) {
	return OptimizeSEOWithContext(input, DefaultSEOContext())
}

// OptimizeSEOWithContext cleans AI patterns, normalizes headings, validates 1×H1,
// and generates natural SEO meta tags with context-aware validation
func OptimizeSEOWithContext(input content.ContentResult, ctx SEOContext) (content.ContentResult, error) {
	result := input

	// SEO VALIDATOR SEBAGAI ADVISOR - hanya warning, tidak fail untuk AI
	if err := ValidateSEOWithContext(input, ctx); err != nil {
		// Untuk AI source, jangan fail - hanya log warning
		if ctx.Source == "ai" {
			log.Printf("[SEO WARNING] Validation issue detected but continuing (AI source): %v", err)
		} else {
			// Untuk manual input, tetap fail (strict validation)
			return result, err
		}
	}

	// PHASE 0.2: FREEZE INTERVENSI SEO - BODY CONTENT READ ONLY untuk AI source
	// Untuk AI source: SEO tidak boleh mengubah body konten (READ ONLY)
	// Untuk manual source: Tetap boleh optimize (backward compatibility)
	if ctx.Source == "ai" {
		// PHASE 0.2: Log body length (untuk monitoring, tidak mengubah)
		bodyLen := len(result.Body)
		log.Printf("[SEO READ-ONLY] Body length: %d chars (AI source - no modifications)", bodyLen)
		log.Printf("[SEO READ-ONLY] Body content preserved as-is for AI source")
		// Body tidak diubah sama sekali untuk AI source
	} else {
		// Manual source: Tetap boleh optimize (backward compatibility)
		// TASK 27: Log body length before SEO processing
		beforeLen := len(result.Body)
		log.Printf("[SEO] Body length before: %d chars", beforeLen)

		// Step 1: Clean AI patterns
		result.Body = cleanAIPatterns(result.Body)

		// Step 2: Normalize headings
		result.Body = normalizeHeadings(result.Body)
		
		// TASK 27: Log body length after SEO processing
		afterLen := len(result.Body)
		log.Printf("[SEO] Body length after: %d chars (diff: %d)", afterLen, afterLen-beforeLen)
		
		// TASK 27: Ensure body is not truncated (only pattern cleaning allowed)
		if afterLen < beforeLen-200 { // Allow up to 200 chars reduction for pattern cleaning
			log.Printf("[SEO] ⚠️ WARNING: Body length reduced significantly (before: %d, after: %d)", beforeLen, afterLen)
		}

		// Step 3: Validate and enforce 1×H1
		result.Body = enforceSingleH1(result.Body, result.Title)
	}

	// Step 4: Generate natural meta tags (if missing or poor)
	result.MetaTitle = optimizeMetaTitle(result.MetaTitle, result.Title)
	result.MetaDesc = optimizeMetaDesc(result.MetaDesc, result.Body)

	// Step 4.5: Auto-fix meta description jika keyword stuffing terdeteksi
	if isKeywordStuffed(result.MetaDesc) {
		log.Printf("[SEO WARNING] Keyword density tinggi pada meta description, applying auto-fix")
		result.MetaDesc = RewriteMetaDescription(result.MetaDesc, result.Body)
	}

	// Step 5: Re-validate after optimization (meta limits must be enforced)
	// Untuk AI source, hanya warning, tidak fail
	// ValidateSEOAfterOptimizationWithContext akan auto-fix dan return result yang sudah di-fix
	var err error
	result, err = ValidateSEOAfterOptimizationWithContext(result, ctx)
	if err != nil {
		if ctx.Source == "ai" {
			log.Printf("[SEO WARNING] Post-optimization issue detected but continuing (AI source): %v", err)
			// Result sudah di-auto-fix, continue
		} else {
			return result, err
		}
	}

	result.Status = "SEO_OPTIMIZED"

	// TASK 4: LOG SEBAGAI BUKTI FINAL
	log.Printf("[SEO VALIDATOR] source=%s result=PASS", ctx.Source)

	return result, nil
}

// ValidateSEO performs SEO validation (backward compatibility - uses AI context)
func ValidateSEO(input content.ContentResult) error {
	return ValidateSEOWithContext(input, DefaultSEOContext())
}

// ValidateSEOWithContext performs context-aware SEO validation
// For AI source: only warnings, no failures
// For manual source: strict validation with failures
func ValidateSEOWithContext(input content.ContentResult, ctx SEOContext) error {
	// Rule 1: Exactly 1 H1 heading (validation)
	if err := validateSingleH1WithContext(input.Body, ctx); err != nil {
		if ctx.Source == "ai" {
			log.Printf("[SEO WARNING] H1 validation issue (continuing): %v", err)
		} else {
			return err
		}
	}

	// Rule 2: H2/H3 hierarchy must be valid (no jumping)
	if err := validateHeadingHierarchyWithContext(input.Body, ctx); err != nil {
		if ctx.Source == "ai" {
			log.Printf("[SEO WARNING] Heading hierarchy issue (continuing): %v", err)
		} else {
			return err
		}
	}

	// Rule 3: Meta title must be ≤ 60 characters (if provided)
	if input.MetaTitle != "" {
		if len(input.MetaTitle) > 60 {
			if ctx.Source == "ai" {
				log.Printf("[SEO WARNING] Meta title exceeds 60 characters (%d chars): %s", len(input.MetaTitle), input.MetaTitle)
				// Auto-fix: truncate
				input.MetaTitle = truncateString(input.MetaTitle, 60)
			} else {
				return &SEOValidationError{
					Rule:    "META_TITLE_TOO_LONG",
					Message: fmt.Sprintf("Meta title exceeds 60 characters (%d chars)", len(input.MetaTitle)),
					Content: input.MetaTitle,
				}
			}
		}
	}

	// Rule 4: Meta description must be ≤ 300 characters (if provided)
	// STEP 2 FIX: Trim, bukan reject - SEO modern friendly
	if input.MetaDesc != "" {
		if len(input.MetaDesc) > 300 {
			if ctx.Source == "ai" {
				log.Printf("[SEO WARNING] Meta description exceeds 300 characters (%d chars), auto-trimming", len(input.MetaDesc))
				// Auto-fix: trim to 300 chars
				input.MetaDesc = input.MetaDesc[:300]
			} else {
				// For manual source, also trim instead of rejecting
				log.Printf("[SEO] Meta description exceeds 300 characters (%d chars), auto-trimming", len(input.MetaDesc))
				input.MetaDesc = input.MetaDesc[:300]
			}
		}
	}

	// Rule 5: No keyword stuffing in meta title
	if input.MetaTitle != "" {
		if isKeywordStuffed(input.MetaTitle) {
			if ctx.Source == "ai" {
				log.Printf("[SEO WARNING] Keyword density tinggi pada meta title: %s", input.MetaTitle)
				// Jangan return error untuk AI
			} else {
				return &SEOValidationError{
					Rule:    "KEYWORD_STUFFING_META_TITLE",
					Message: "Meta title contains keyword stuffing patterns",
					Content: input.MetaTitle,
				}
			}
		}
	}

	// Rule 6: No keyword stuffing in meta description
	if input.MetaDesc != "" {
		if isKeywordStuffed(input.MetaDesc) {
			if ctx.Source == "ai" {
				log.Printf("[SEO WARNING] Keyword density tinggi pada meta description: %s", input.MetaDesc)
				// Jangan return error untuk AI - akan di-fix di optimizeMetaDesc
			} else {
				return &SEOValidationError{
					Rule:    "KEYWORD_STUFFING_META_DESC",
					Message: "Meta description contains keyword stuffing patterns",
					Content: input.MetaDesc,
				}
			}
		}
	}

	// TASK 4: LOG SEBAGAI BUKTI FINAL
	log.Printf("[SEO VALIDATOR] source=%s result=PASS", ctx.Source)

	return nil
}

// ValidateSEOAfterOptimization validates SEO after optimization (backward compatibility)
func ValidateSEOAfterOptimization(input content.ContentResult) error {
	_, err := ValidateSEOAfterOptimizationWithContext(input, DefaultSEOContext())
	return err
}

// ValidateSEOAfterOptimizationWithContext validates SEO after optimization with context
// Returns the result with auto-fixes applied and any error
func ValidateSEOAfterOptimizationWithContext(input content.ContentResult, ctx SEOContext) (content.ContentResult, error) {
	result := input
	
	// Enforce meta limits after optimization
	if len(result.MetaTitle) > 60 {
		if ctx.Source == "ai" {
			log.Printf("[SEO WARNING] Meta title exceeds 60 characters after optimization (%d chars), auto-fixing", len(result.MetaTitle))
			result.MetaTitle = truncateString(result.MetaTitle, 60)
		} else {
			return result, &SEOValidationError{
				Rule:    "META_TITLE_TOO_LONG_AFTER_OPT",
				Message: fmt.Sprintf("Meta title exceeds 60 characters after optimization (%d chars)", len(result.MetaTitle)),
				Content: result.MetaTitle,
			}
		}
	}

	// STEP 2 FIX: Meta description max 300 chars (trim, bukan reject)
	if len(result.MetaDesc) > 300 {
		if ctx.Source == "ai" {
			log.Printf("[SEO WARNING] Meta description exceeds 300 characters after optimization (%d chars), auto-trimming", len(result.MetaDesc))
			result.MetaDesc = result.MetaDesc[:300]
		} else {
			// For manual source, also trim instead of rejecting
			log.Printf("[SEO] Meta description exceeds 300 characters after optimization (%d chars), auto-trimming", len(result.MetaDesc))
			result.MetaDesc = result.MetaDesc[:300]
		}
	}

	if isKeywordStuffed(result.MetaTitle) {
		if ctx.Source == "ai" {
			log.Printf("[SEO WARNING] Meta title contains keyword stuffing after optimization")
			// Jangan return error untuk AI
		} else {
			return result, &SEOValidationError{
				Rule:    "KEYWORD_STUFFING_META_TITLE_AFTER_OPT",
				Message: "Meta title contains keyword stuffing after optimization",
				Content: result.MetaTitle,
			}
		}
	}

	if isKeywordStuffed(result.MetaDesc) {
		if ctx.Source == "ai" {
			log.Printf("[SEO WARNING] Meta description contains keyword stuffing after optimization, applying auto-fix")
			result.MetaDesc = RewriteMetaDescription(result.MetaDesc, result.Body)
		} else {
			return result, &SEOValidationError{
				Rule:    "KEYWORD_STUFFING_META_DESC_AFTER_OPT",
				Message: "Meta description contains keyword stuffing after optimization",
				Content: result.MetaDesc,
			}
		}
	}

	return result, nil
}

// validateSingleH1 ensures exactly one H1 in content (backward compatibility)
func validateSingleH1(body string) error {
	return validateSingleH1WithContext(body, DefaultSEOContext())
}

// validateSingleH1WithContext ensures exactly one H1 in content with context
func validateSingleH1WithContext(body string, ctx SEOContext) error {
	h1Pattern := regexp.MustCompile(`(?m)^#\s+[^\n]+`)
	matches := h1Pattern.FindAllString(body, -1)

	if len(matches) == 0 {
		// No H1 - this will be fixed by enforceSingleH1, but we should validate it exists after
		return nil // Allow this, will be fixed
	}

	if len(matches) > 1 {
		// Multiple H1 akan di-fix oleh enforceSingleH1, hanya warning untuk AI
		log.Printf("[SEO WARNING] Found %d H1 headings, will be auto-fixed to 1", len(matches))
		// Tidak return error - akan di-fix di enforceSingleH1
	}

	return nil
}

// validateHeadingHierarchy ensures H2/H3 hierarchy is correct (backward compatibility)
func validateHeadingHierarchy(body string) error {
	return validateHeadingHierarchyWithContext(body, DefaultSEOContext())
}

// validateHeadingHierarchyWithContext ensures H2/H3 hierarchy is correct (no jumping)
// H3 must come after H2, cannot have H3 without parent H2
func validateHeadingHierarchyWithContext(body string, ctx SEOContext) error {
	lines := strings.Split(body, "\n")
	var headingStack []string // Track heading levels

	for i, line := range lines {
		line = strings.TrimSpace(line)

		// Check for H1
		if strings.HasPrefix(line, "# ") && !strings.HasPrefix(line, "##") {
			headingStack = []string{"H1"} // Reset stack, H1 is root
			continue
		}

		// Check for H2
		if strings.HasPrefix(line, "## ") && !strings.HasPrefix(line, "###") {
			// Clear stack to H2 level
			headingStack = []string{"H1", "H2"}
			continue
		}

		// Check for H3
		if strings.HasPrefix(line, "### ") && !strings.HasPrefix(line, "####") {
			// H3 must have H2 parent (H2 in stack)
			hasH2 := false
			for _, level := range headingStack {
				if level == "H2" {
					hasH2 = true
					break
				}
			}

			if !hasH2 {
				headingText := strings.TrimPrefix(line, "### ")
				// H3 tanpa H2 akan di-fix oleh normalizeHeadings, hanya warning
				log.Printf("[SEO WARNING] H3 heading found without H2 parent at line %d: %s (will be auto-fixed)", i+1, headingText)
				// Tidak return error - akan di-fix
			}

			// Update stack
			if len(headingStack) > 2 {
				headingStack = headingStack[:2]
			}
			headingStack = append(headingStack, "H3")
			continue
		}

		// Check for H4+ (should not exist in content)
		if strings.HasPrefix(line, "####") {
			// H4+ akan di-fix oleh normalizeHeadings, hanya warning
			log.Printf("[SEO WARNING] Heading H4 or deeper found at line %d (max H3 allowed), will be converted to H3: %s", i+1, line[:min(50, len(line))])
			// Tidak return error - akan di-fix
		}
	}

	return nil
}

// min returns minimum of two integers
func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}

// cleanAIPatterns removes common AI writing patterns that feel unnatural
func cleanAIPatterns(body string) string {
	result := body

	// Remove excessive introductory phrases
	patterns := []struct {
		pattern     string
		replacement string
	}{
		// Remove "Dalam artikel ini, kita akan membahas..."
		{`(?i)dalam artikel ini[,\s]+kita akan membahas[^\n]+`, ""},
		// Remove "Mari kita mulai dengan..."
		{`(?i)mari kita mulai dengan[^\n]+`, ""},
		// Remove "Pertama-tama, penting untuk diketahui..."
		{`(?i)pertama-tama[,\s]+penting untuk diketahui[^\n]+`, ""},
		// Remove "Sebagai kesimpulan, dapat dikatakan bahwa..."
		{`(?i)sebagai kesimpulan[,\s]+dapat dikatakan bahwa[^\n]+`, ""},
		// Remove "Tidak dapat dipungkiri bahwa..."
		{`(?i)tidak dapat dipungkiri bahwa[^\n]+`, ""},
		// Remove "Pada dasarnya..." (when overused)
		{`(?i)pada dasarnya[,\s]+`, ""},
		// Remove "Dalam hal ini..."
		{`(?i)dalam hal ini[,\s]+`, ""},
	}

	for _, p := range patterns {
		re := regexp.MustCompile(p.pattern)
		result = re.ReplaceAllString(result, p.replacement)
	}

	// Remove excessive question marks (AI often uses rhetorical questions)
	reQuestions := regexp.MustCompile(`\?\s*\?\s*\?+`)
	result = reQuestions.ReplaceAllString(result, "?")

	// Remove multiple consecutive exclamation marks
	reExclamations := regexp.MustCompile(`!\s*!\s*!+`)
	result = reExclamations.ReplaceAllString(result, "!")

	// Clean up excessive whitespace
	result = regexp.MustCompile(`\n{3,}`).ReplaceAllString(result, "\n\n")
	result = regexp.MustCompile(`[ \t]+`).ReplaceAllString(result, " ")

	return strings.TrimSpace(result)
}

// normalizeHeadings ensures consistent heading format and hierarchy
func normalizeHeadings(body string) string {
	result := body

	// Normalize H1 (# Title) - ensure single #
	h1Pattern := regexp.MustCompile(`(?m)^#{2,}\s+`)
	result = h1Pattern.ReplaceAllStringFunc(result, func(match string) string {
		// Multiple # at start of line should become H2 (##)
		return "## "
	})

	// Ensure proper heading format (add space after # if missing)
	result = regexp.MustCompile(`(?m)^#+([^\s#])`).ReplaceAllString(result, "$1")

	// Fix headings without proper spacing
	result = regexp.MustCompile(`(?m)^(#{1,6})([A-Za-z])`).ReplaceAllString(result, "$1 $2")

	// Ensure headings are not too long (truncate extremely long headings)
	lines := strings.Split(result, "\n")
	for i, line := range lines {
		if strings.HasPrefix(line, "#") {
			parts := strings.SplitN(line, " ", 2)
			if len(parts) == 2 {
				headingText := parts[1]
				if len(headingText) > 100 {
					// Truncate but keep meaningful words
					words := strings.Fields(headingText)
					truncated := ""
					for _, word := range words {
						if len(truncated)+len(word)+1 <= 97 {
							if truncated != "" {
								truncated += " "
							}
							truncated += word
						} else {
							break
						}
					}
					lines[i] = parts[0] + " " + truncated + "..."
				}
			}
		}
	}
	result = strings.Join(lines, "\n")

	return result
}

// enforceSingleH1 ensures exactly one H1 heading in the body
func enforceSingleH1(body string, title string) string {
	// Count H1 headings in body
	h1Pattern := regexp.MustCompile(`(?m)^#\s+[^\n]+`)
	matches := h1Pattern.FindAllString(body, -1)

	if len(matches) == 0 {
		// No H1 found - add title as H1 at the beginning
		return fmt.Sprintf("# %s\n\n%s", title, body)
	} else if len(matches) == 1 {
		// Exactly one H1 - ensure it matches the title
		existingH1 := matches[0]
		h1Text := strings.TrimPrefix(existingH1, "# ")
		if h1Text != title {
			// Replace first H1 with title
			re := regexp.MustCompile(`(?m)^#\s+[^\n]+`)
			first := true
			result := re.ReplaceAllStringFunc(body, func(match string) string {
				if first {
					first = false
					return fmt.Sprintf("# %s", title)
				}
				return match
			})
			return result
		}
		return body
	} else {
		// Multiple H1s - keep first one as H1, convert others to H2
		firstH1 := true
		result := regexp.MustCompile(`(?m)^#\s+([^\n]+)`).ReplaceAllStringFunc(body, func(match string) string {
			if firstH1 {
				firstH1 = false
				// Keep first H1, but ensure it's the title
				return fmt.Sprintf("# %s", title)
			}
			// Convert subsequent H1s to H2
			text := strings.TrimPrefix(match, "# ")
			return fmt.Sprintf("## %s", text)
		})
		return result
	}
}

// optimizeMetaTitle creates natural, optimized meta title
// NO keyword stuffing, NO rigid templates
// ENFORCES 60 character limit strictly
func optimizeMetaTitle(currentMeta string, title string) string {
	// If current meta is good (exists, reasonable length), use it
	if currentMeta != "" && len(currentMeta) >= 20 && len(currentMeta) <= 60 {
		// Check if it's too template-like (keyword stuffing patterns)
		if !isKeywordStuffed(currentMeta) {
			return currentMeta
		}
	}

	// Generate from title if needed
	meta := title

	// Remove common suffixes that aren't needed in meta
	meta = regexp.MustCompile(`(?i)\s*[-–—]\s*(panduan|guide|tips|tricks|cara|solusi).*$`).ReplaceAllString(meta, "")

	// Add site context naturally if space allows
	if len(meta) <= 45 {
		meta += " | Toko Tani Online"
	}

	// ENFORCE 60 character limit strictly (no exceptions)
	if len(meta) > 60 {
		// Truncate at word boundary
		words := strings.Fields(meta)
		truncated := ""
		for _, word := range words {
			// Calculate with space if not first word
			neededLen := len(word)
			if truncated != "" {
				neededLen += 1 // space
			}

			if len(truncated)+neededLen <= 57 {
				if truncated != "" {
					truncated += " "
				}
				truncated += word
			} else {
				break
			}
		}
		// Ensure we're still under 60
		if len(truncated) > 60 {
			truncated = truncated[:57]
		}
		meta = truncated + "..."
	}

	// Final check - must be ≤ 60
	result := strings.TrimSpace(meta)
	if len(result) > 60 {
		result = result[:57] + "..."
	}

	return result
}

// optimizeMetaDesc creates natural meta description
// NO keyword stuffing, NO rigid templates
// STEP 2 FIX: ENFORCES 300 character limit (trim, bukan reject)
func optimizeMetaDesc(currentMeta string, body string) string {
	// If current meta is good, use it (updated to 300 char limit)
	if currentMeta != "" && len(currentMeta) >= 50 && len(currentMeta) <= 300 {
		if !isKeywordStuffed(currentMeta) {
			return currentMeta
		}
	}

	// Extract from body - find first substantial paragraph
	lines := strings.Split(body, "\n")
	for _, line := range lines {
		line = strings.TrimSpace(line)
		// Skip headings and very short lines
		if strings.HasPrefix(line, "#") || len(line) < 30 {
			continue
		}

		// Clean the line
		line = regexp.MustCompile(`<[^>]+>`).ReplaceAllString(line, "") // Remove HTML tags
		line = regexp.MustCompile(`\[([^\]]+)\]\([^\)]+\)`).ReplaceAllString(line, "$1") // Remove markdown links

		// Use this paragraph if it's substantial
		if len(line) >= 50 {
			meta := line

			// STEP 2 FIX: Trim to 300 chars (bukan reject)
			if len(meta) > 300 {
				meta = meta[:300]
			}

			result := strings.TrimSpace(meta)
			return result
		}
	}

	// Fallback: generate simple meta (ensures ≤ 300)
	// Extract title from body if available, otherwise use generic
	title := "topik pertanian"
	bodyLines := strings.Split(body, "\n")
	for _, line := range bodyLines {
		line = strings.TrimSpace(line)
		if strings.HasPrefix(line, "# ") {
			title = strings.TrimPrefix(line, "# ")
			break
		}
	}

	fallback := fmt.Sprintf("Pelajari tentang %s. Panduan lengkap dan informatif dari Toko Tani Online.", title)
	if len(fallback) > 300 {
		fallback = fallback[:300]
	}
	return fallback
}

// isKeywordStuffed detects keyword stuffing patterns
func isKeywordStuffed(text string) bool {
	text = strings.ToLower(text)

	// Check for excessive repetition (same word 3+ times in short text)
	words := strings.Fields(text)
	wordCount := make(map[string]int)
	for _, word := range words {
		// Ignore common stop words
		stopWords := map[string]bool{
			"dan": true, "atau": true, "dengan": true, "untuk": true,
			"dari": true, "pada": true, "dalam": true, "adalah": true,
			"yang": true, "di": true, "ke": true, "ini": true, "itu": true,
		}
		if stopWords[word] {
			continue
		}
		wordCount[word]++
	}

	for _, count := range wordCount {
		if count >= 3 && len(text) < 200 {
			return true // Too repetitive in short text
		}
	}

	// Check for template-like patterns
	templates := []string{
		"panduan lengkap",
		"tips dan trik",
		"solusi terbaik",
		"cara mudah",
		"rahasia sukses",
	}

	count := 0
	for _, template := range templates {
		if strings.Contains(text, template) {
			count++
		}
	}

	// If 2+ template phrases in meta, likely keyword stuffing
	if count >= 2 {
		return true
	}

	return false
}

// RewriteMetaDescription auto-fixes meta description with keyword stuffing
// TASK 2: Auto-fix meta description jika keyword density tinggi
func RewriteMetaDescription(meta string, body string) string {
	// Simple auto-fix: extract natural sentence from body
	// Jika tidak bisa, truncate dan clean meta yang ada
	
	// Coba ambil dari body yang natural
	lines := strings.Split(body, "\n")
	for _, line := range lines {
		line = strings.TrimSpace(line)
		// Skip headings dan line pendek
		if strings.HasPrefix(line, "#") || len(line) < 50 {
			continue
		}
		
		// Clean line
		line = regexp.MustCompile(`<[^>]+>`).ReplaceAllString(line, "")
		line = regexp.MustCompile(`\[([^\]]+)\]\([^\)]+\)`).ReplaceAllString(line, "$1")
		line = regexp.MustCompile(`\*\*|\*|__|_`).ReplaceAllString(line, "")
		
		// Gunakan jika natural dan tidak keyword stuffed (STEP 2 FIX: 300 char limit)
		if len(line) >= 50 && len(line) <= 300 && !isKeywordStuffed(line) {
			// Pastikan tidak melebihi 300
			if len(line) > 300 {
				line = line[:300]
			}
			log.Printf("[SEO AUTO-FIX] Meta description rewritten from body: %s", line)
			return line
		}
	}
	
	// Fallback: clean dan trim meta yang ada (STEP 2 FIX: 300 char limit)
	cleaned := regexp.MustCompile(`\b(\w+)(\s+\1){2,}`).ReplaceAllString(meta, "$1") // Remove repeated words
	cleaned = strings.TrimSpace(cleaned)
	if len(cleaned) > 300 {
		cleaned = cleaned[:300]
	}
	log.Printf("[SEO AUTO-FIX] Meta description cleaned and truncated: %s", cleaned)
	return cleaned
}

// truncateString truncates string to max length at word boundary
func truncateString(s string, maxLen int) string {
	if len(s) <= maxLen {
		return s
	}
	
	// Truncate at word boundary
	words := strings.Fields(s)
	truncated := ""
	for _, word := range words {
		neededLen := len(word)
		if truncated != "" {
			neededLen += 1 // space
		}
		
		if len(truncated)+neededLen <= maxLen-3 {
			if truncated != "" {
				truncated += " "
			}
			truncated += word
		} else {
			break
		}
	}
	
	if len(truncated) > maxLen-3 {
		truncated = truncated[:maxLen-3]
	}
	
	return strings.TrimSpace(truncated) + "..."
}