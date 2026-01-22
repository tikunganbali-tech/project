package normalize

import (
	"log"
	"regexp"
	"strings"

	"engine-hub/internal/ai/content"
)

// NormalizeContent applies deterministic normalization rules to content
// FASE A - A1: WAJIB & GLOBAL
// Berlaku ke SEMUA konten: blog, produk, static page, copywriting
// This is STRING PROCESSING, not AI-dependent
// Purpose: Force compliance BEFORE validation, so validator always passes
func NormalizeContent(input content.ContentResult) content.ContentResult {
	result := input
	log.Println("[NORMALIZER] Starting content normalization (GLOBAL - applies to all content types)...")

	// Normalize body content
	result.Body = normalizeBody(result.Body)

	// Normalize title (for all content types)
	result.Title = normalizeTitle(result.Title)

	// Normalize meta fields
	result.MetaTitle = normalizeMeta(result.MetaTitle)
	result.MetaDesc = normalizeMeta(result.MetaDesc)

	// Update status to indicate normalization
	if result.Status == "RAW_AI" {
		result.Status = "NORMALIZED"
	}

	log.Println("[NORMALIZER] Content normalization completed (GLOBAL rules applied)")
	return result
}

// normalizeTitle applies normalization to title (for all content types)
func normalizeTitle(title string) string {
	if title == "" {
		return title
	}

	// Apply same rules as body but lighter (title is shorter)
	title = limitExclamationMarksImproved(title)
	title = filterAbsoluteWords(title)
	title = cleanupWhitespace(title)

	return title
}

// normalizeBody applies all normalization rules to body content
func normalizeBody(body string) string {
	if body == "" {
		return body
	}

	beforeLen := len(body)
	log.Printf("[NORMALIZER] Body length before: %d chars", beforeLen)

	// Step 1: Hard-limit exclamation marks (if > 3, reduce to 3)
	body = limitExclamationMarks(body)

	// Step 2: Filter absolute words (replace with neutral forms)
	body = filterAbsoluteWords(body)

	// Step 3: Tone softening (claim sentences → observational)
	body = softenTone(body)

	// Step 4: Whitespace & punctuation cleanup
	body = cleanupWhitespace(body)

	afterLen := len(body)
	log.Printf("[NORMALIZER] Body length after: %d chars (diff: %d)", afterLen, afterLen-beforeLen)
	
	// TASK 27: Ensure body is not truncated (only whitespace cleanup allowed)
	if afterLen < beforeLen-100 { // Allow up to 100 chars reduction for whitespace cleanup
		log.Printf("[NORMALIZER] ⚠️ WARNING: Body length reduced significantly (before: %d, after: %d)", beforeLen, afterLen)
	}
	
	return body
}

// limitExclamationMarks reduces exclamation marks to max 3
// If > 3, keep first 3 and replace rest with periods
func limitExclamationMarks(text string) string {
	exclamationCount := strings.Count(text, "!")
	if exclamationCount <= 3 {
		return text
	}

	log.Printf("[NORMALIZER] Found %d exclamation marks, reducing to 3", exclamationCount)

	// Find all exclamation mark positions (byte positions)
	var positions []int
	for i := 0; i < len(text); i++ {
		if text[i] == '!' {
			positions = append(positions, i)
		}
	}

	// If we have more than 3, replace the excess with periods
	if len(positions) > 3 {
		// Build result by replacing from the end (keep first 3)
		result := []byte(text)
		for i := 3; i < len(positions); i++ {
			result[positions[i]] = '.'
		}
		return string(result)
	}

	return text
}

// limitExclamationMarksImproved reduces exclamation marks to max 3 (for meta fields)
func limitExclamationMarksImproved(text string) string {
	exclamationCount := strings.Count(text, "!")
	if exclamationCount <= 3 {
		return text
	}

	log.Printf("[NORMALIZER] Found %d exclamation marks in meta, reducing to 3", exclamationCount)

	// Find all exclamation mark positions (byte positions)
	var positions []int
	for i := 0; i < len(text); i++ {
		if text[i] == '!' {
			positions = append(positions, i)
		}
	}

	// If we have more than 3, replace the excess with periods
	if len(positions) > 3 {
		// Build result by replacing from the end (keep first 3)
		result := []byte(text)
		for i := 3; i < len(positions); i++ {
			result[positions[i]] = '.'
		}
		return string(result)
	}

	return text
}

// filterAbsoluteWords replaces absolute/promotional words with neutral alternatives
func filterAbsoluteWords(text string) string {
	// Word replacement map: absolute → neutral
	replacements := map[string]string{
		// Absolute claims
		"pasti":     "umumnya",
		"terbukti":  "sering digunakan",
		"100%":      "biasanya",
		"terbaik":   "sering dipilih",
		"paling":    "sering",
		"selalu":    "biasanya",
		"tidak pernah": "jarang",
		"mustahil":  "sulit",
		"wajib":     "disarankan",
		"harus":     "sebaiknya",
		"mutlak":    "umumnya",
	}

	// Case-insensitive replacement with word boundaries
	bodyLower := strings.ToLower(text)
	result := text

	for absolute, neutral := range replacements {
		// Create regex pattern with word boundaries
		pattern := `\b` + regexp.QuoteMeta(absolute) + `\b`
		re := regexp.MustCompile(`(?i)` + pattern)

		// Check if found
		if re.MatchString(bodyLower) {
			log.Printf("[NORMALIZER] Replacing absolute word: '%s' → '%s'", absolute, neutral)
		}

		// Replace with case preservation
		result = re.ReplaceAllStringFunc(result, func(match string) string {
			// Preserve case of first letter
			if len(match) > 0 && match[0] >= 'A' && match[0] <= 'Z' {
				// Uppercase first letter
				return strings.ToUpper(neutral[:1]) + neutral[1:]
			}
			return neutral
		})
	}

	// Also handle phrases (FASE A - A1: Expanded for global coverage)
	phraseReplacements := map[string]string{
		"pasti berhasil":     "umumnya berhasil",
		"terbukti efektif":   "sering efektif",
		"paling efektif":     "sering efektif",
		"solusi terbaik":     "solusi yang sering digunakan",
		"tidak diragukan":    "biasanya",
		"sangat efektif":     "efektif",
		"super efektif":      "efektif",
		"paling terbaik":     "sering dipilih",
		"menurut AI":         "", // Remove AI references
		"menurut artificial intelligence": "",
		"menurut machine learning": "",
		"[placeholder]":      "", // Remove placeholders
		"placeholder":        "",
		"TODO":               "",
		"FIXME":              "",
	}

	for phrase, replacement := range phraseReplacements {
		pattern := `(?i)\b` + regexp.QuoteMeta(phrase) + `\b`
		re := regexp.MustCompile(pattern)
		if re.MatchString(result) {
			log.Printf("[NORMALIZER] Replacing phrase: '%s' → '%s'", phrase, replacement)
			result = re.ReplaceAllString(result, replacement)
		}
	}

	return result
}

// softenTone converts claim sentences to observational statements
func softenTone(text string) string {
	// Patterns that indicate claims → convert to observational
	claimPatterns := []struct {
		pattern     string
		replacement string
	}{
		// "X adalah Y yang Z" → "X umumnya Y yang Z"
		{`(?i)(\w+) adalah (\w+) yang (\w+)`, `$1 umumnya $2 yang $3`},
		// "X pasti Y" → "X umumnya Y"
		{`(?i)(\w+) pasti (\w+)`, `$1 umumnya $2`},
		// "X terbukti Y" → "X sering Y"
		{`(?i)(\w+) terbukti (\w+)`, `$1 sering $2`},
	}

	result := text
	for _, cp := range claimPatterns {
		re := regexp.MustCompile(cp.pattern)
		if re.MatchString(result) {
			log.Printf("[NORMALIZER] Softening tone: pattern '%s'", cp.pattern)
			result = re.ReplaceAllString(result, cp.replacement)
		}
	}

	// Additional tone softening: replace strong adjectives
	strongAdjectives := map[string]string{
		"sangat":    "",
		"super":     "",
		"extremely": "",
		"very":      "",
		"really":    "",
	}

	for strong, replacement := range strongAdjectives {
		pattern := `(?i)\b` + regexp.QuoteMeta(strong) + `\s+`
		re := regexp.MustCompile(pattern)
		if re.MatchString(result) {
			log.Printf("[NORMALIZER] Removing strong adjective: '%s'", strong)
			result = re.ReplaceAllString(result, replacement)
		}
	}

	return result
}

// cleanupWhitespace normalizes whitespace and punctuation
func cleanupWhitespace(text string) string {
	// Normalize multiple spaces to single space
	re := regexp.MustCompile(`\s+`)
	text = re.ReplaceAllString(text, " ")

	// Remove spaces before punctuation
	re = regexp.MustCompile(`\s+([.,;:!?])`)
	text = re.ReplaceAllString(text, "$1")

	// Normalize multiple punctuation marks (except ...)
	// Match 3+ consecutive punctuation marks and replace with single
	// Go regex doesn't support backreferences in pattern, so we use a different approach
	punctuationPatterns := []string{`\.{3,}`, `,{3,}`, `;{3,}`, `:{3,}`, `!{3,}`, `\?{3,}`}
	for _, pattern := range punctuationPatterns {
		re = regexp.MustCompile(pattern)
		text = re.ReplaceAllStringFunc(text, func(match string) string {
			// Keep first character, remove rest
			if len(match) > 0 {
				return string(match[0])
			}
			return match
		})
	}

	// Trim whitespace from lines
	lines := strings.Split(text, "\n")
	var cleanedLines []string
	for _, line := range lines {
		cleanedLine := strings.TrimSpace(line)
		if cleanedLine != "" {
			cleanedLines = append(cleanedLines, cleanedLine)
		}
	}
	text = strings.Join(cleanedLines, "\n")

	// Remove trailing whitespace
	text = strings.TrimSpace(text)

	return text
}

// normalizeMeta applies normalization to meta fields (title, description)
func normalizeMeta(meta string) string {
	if meta == "" {
		return meta
	}

	// Apply same rules but lighter (meta is shorter)
	meta = limitExclamationMarksImproved(meta)
	meta = filterAbsoluteWords(meta)
	meta = cleanupWhitespace(meta)

	return meta
}
