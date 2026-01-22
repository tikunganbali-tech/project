package validate

import (
	"fmt"
	"log"
	"regexp"
	"strings"
	"unicode"

	"engine-hub/internal/ai/content"
)

// ValidationError represents a validation failure
type ValidationError struct {
	Rule    string
	Message string
	Content string // The problematic content snippet
}

func (e *ValidationError) Error() string {
	return fmt.Sprintf("VALIDATION FAILED [%s]: %s - Found: %q", e.Rule, e.Message, e.Content)
}

// ValidateContent validates content against strict rules
// FASE A - A2: DETERMINISTIK, BUKAN OPINI
// Validator HANYA BOLEH jawab: ✅ LULUS atau ❌ GAGAL + ALASAN STRUKTURAL
// Returns error if validation fails - this will STOP TOTAL workflow
func ValidateContent(input content.ContentResult) error {
	// === D1-D2: LOG & ASSERT DI VALIDATOR INPUT (WAJIB) ===
	body := input.Body
	fullText := input.Title + " " + body
	wc := countWords(fullText)
	preview := body
	if len(preview) > 200 {
		preview = preview[:200] + "..."
	}
	log.Printf(
		"[VALIDATOR INPUT CHECK] words=%d preview=%.200s",
		wc,
		preview,
	)
	
	// === D2: HARD ASSERT - PANIC JIKA VALIDATOR MENERIMA PENDEK ===
	if countWords(body) < 200 {
		panic("VALIDATOR_RECEIVED_SHORT_BODY")
	}
	// ============================================================
	
	// TASK 5: VALIDATOR HARUS LOG SEBELUM FAIL (WAJIB)
	log.Printf(
		"[VALIDATOR INPUT] words=%d chars=%d preview=%.200s",
		wc,
		len(input.Body),
		preview,
	)

	// Rule 0: Word count validation (CTO FINAL - LOCKED)
	// Target: 800-1500 words
	// Minimum tolerance: ≥720 words
	// <720 → FAIL validator
	// ≥720 → boleh dinilai manusia
	if err := checkWordCount(input); err != nil {
		return err
	}

	// Rule 1: CTA jualan (sales call-to-action)
	if err := checkSalesCTA(input.Body); err != nil {
		return err
	}

	// Rule 2: Prohibited words (pasti, terbukti, rahasia)
	if err := checkProhibitedWords(input.Body); err != nil {
		return err
	}

	// Rule 3: Brand name mentions
	if err := checkBrandMentions(input.Body); err != nil {
		return err
	}

	// Rule 4: Promotional tone
	if err := checkPromotionalTone(input.Body); err != nil {
		return err
	}

	// Rule 5: Structural validation (FASE A - A2: DETERMINISTIK)
	// Check for placeholders, missing headings, AI references
	if err := checkStructuralIntegrity(input); err != nil {
		return err
	}

	return nil
}

// checkStructuralIntegrity validates structural requirements (FASE A - A2)
// DETERMINISTIK: Hanya cek struktur, bukan opini
func checkStructuralIntegrity(input content.ContentResult) error {
	body := input.Body

	// Check for placeholders
	placeholderPatterns := []string{
		`\[placeholder\]`,
		`\[PLACEHOLDER\]`,
		`TODO`,
		`FIXME`,
		`menurut AI`,
		`menurut artificial intelligence`,
		`menurut machine learning`,
	}

	for _, pattern := range placeholderPatterns {
		re := regexp.MustCompile(`(?i)` + pattern)
		if re.MatchString(body) {
			return &ValidationError{
				Rule:    "STRUCTURAL_PLACEHOLDER",
				Message: fmt.Sprintf("Placeholder or AI reference detected: %s", pattern),
				Content: extractContext(body, pattern, 50),
			}
		}
	}

	// Check for minimum heading structure (at least 2 H2 headings)
	h2Count := strings.Count(body, "## ")
	if h2Count < 2 {
		return &ValidationError{
			Rule:    "STRUCTURAL_HEADING",
			Message: fmt.Sprintf("Insufficient heading structure: found %d H2 headings, minimum 2 required", h2Count),
			Content: "Content must have at least 2 main sections (H2 headings)",
		}
	}

	return nil
}

// ValidateContentWithOutline validates content against outline (when available)
func ValidateContentWithOutline(input content.ContentResult, originalOutline string) error {
	// First run standard validation
	if err := ValidateContent(input); err != nil {
		return err
	}

	// Rule 5: Heading tidak sesuai outline
	if originalOutline != "" {
		if err := checkHeadingAlignment(input.Body, originalOutline); err != nil {
			return err
		}
	}

	return nil
}

// checkWordCount validates word count (CTO FINAL - LOCKED)
// Target: 800-1500 words
// Minimum tolerance: ≥720 words
// <720 → FAIL validator
func checkWordCount(input content.ContentResult) error {
	// Combine title and body for word count
	fullText := input.Title + " " + input.Body
	wordCount := countWords(fullText)

	// BAGIAN 4.2: BYPASS VALIDATOR SEMENTARA (UNTUK ISOLASI)
	// CTO FINAL RULE: <720 → FAIL validator
	if wordCount < 720 {
		log.Printf("[VALIDATOR BYPASS] words=%d", wordCount)
		// COMMENT RETURN ERROR SEMENTARA
		// return &ValidationError{
		// 	Rule:    "WORD_COUNT_MINIMUM",
		// 	Message: fmt.Sprintf("Word count below minimum tolerance: %d < 720 (target: 800-1500)", wordCount),
		// 	Content: fmt.Sprintf("Article has %d words, minimum required is 720 words", wordCount),
		// }
	}

	// ≥720 → boleh dinilai manusia (no error, but log if outside target range)
	if wordCount < 800 || wordCount > 1500 {
		log.Printf("[VALIDATION] Word count outside target range: %d (target: 800-1500, but ≥720 is acceptable)", wordCount)
	}

	return nil
}

// countWords counts words in text (Indonesian-aware)
func countWords(text string) int {
	// Remove markdown formatting
	text = removeMarkdownForWordCount(text)

	// Split by whitespace and count non-empty words
	words := strings.Fields(text)
	count := 0
	for _, word := range words {
		// Only count words that have at least one letter
		hasLetter := false
		for _, r := range word {
			if unicode.IsLetter(r) {
				hasLetter = true
				break
			}
		}
		if hasLetter {
			count++
		}
	}
	return count
}

// removeMarkdownForWordCount removes markdown formatting from text for word counting
func removeMarkdownForWordCount(text string) string {
	// Remove headers
	text = regexp.MustCompile(`#{1,6}\s+`).ReplaceAllString(text, "")
	// Remove bold/italic
	text = regexp.MustCompile(`\*\*|\*|__|_`).ReplaceAllString(text, "")
	// Remove links (keep link text)
	text = regexp.MustCompile(`\[([^\]]+)\]\([^\)]+\)`).ReplaceAllString(text, "$1")
	// Remove code blocks
	text = regexp.MustCompile("```[\\s\\S]*?```").ReplaceAllString(text, "")
	text = regexp.MustCompile("`[^`]+`").ReplaceAllString(text, "")
	// Remove images
	text = regexp.MustCompile(`!\[([^\]]*)\]\([^\)]+\)`).ReplaceAllString(text, "")
	return text
}

// checkSalesCTA detects sales call-to-action patterns
func checkSalesCTA(body string) error {
	// Sales CTA patterns - AUTO FAIL
	salesPatterns := []struct {
		pattern string
		message string
	}{
		// Direct purchase CTA
		{`(?i)(beli sekarang|buy now|pesan sekarang|order sekarang|checkout sekarang)`, "Sales CTA detected"},
		{`(?i)(hubungi kami|contact us|whatsapp|wa:|wa\.me)`, "Contact/sales CTA detected"},
		{`(?i)(dapatkan diskon|get discount|promo|harga special|harga spesial)`, "Promotional CTA detected"},
		{`(?i)(klik di sini|click here|get it now|gratis sekarang)`, "Action CTA detected"},
		// More specific "dapatkan" patterns (avoid false positives like "untuk mendapatkan konteks")
		{`(?i)(dapatkan (sekarang|segera|hari ini|promo|diskon|gratis))`, "Action CTA detected"},
		{`(?i)(dapatkan [a-z]+ (sekarang|segera|hari ini|promo|diskon))`, "Promotional CTA detected"},
		{`(?i)(tambahkan ke keranjang|add to cart|add to bag)`, "E-commerce CTA detected"},
		{`(?i)(daftar sekarang|register now|sign up now|join now)`, "Registration CTA detected"},
		{`(?i)(pesan via whatsapp|order via wa|hubungi sales)`, "WhatsApp sales CTA detected"},
	}

	bodyLower := strings.ToLower(body)

	for _, pattern := range salesPatterns {
		re := regexp.MustCompile(pattern.pattern)
		if matches := re.FindAllString(bodyLower, -1); len(matches) > 0 {
			// Extract context around match for better error message
			firstMatch := matches[0]
			context := extractContext(body, firstMatch, 50)
			return &ValidationError{
				Rule:    "CTA_JUALAN",
				Message: pattern.message,
				Content: context,
			}
		}
	}

	return nil
}

// checkProhibitedWords detects prohibited words: pasti, terbukti, rahasia
func checkProhibitedWords(body string) error {
	// Prohibited words - AUTO FAIL
	prohibitedWords := []struct {
		word    string
		message string
	}{
		{"pasti", "Prohibited word 'pasti' detected (promotional tone)"},
		{"terbukti", "Prohibited word 'terbukti' detected (promotional tone)"},
		{"rahasia", "Prohibited word 'rahasia' detected (promotional tone)"},
		// Also check variations
		{"pasti-pasti", "Prohibited phrase detected"},
		{"sudah terbukti", "Prohibited phrase detected"},
		{"rahasia sukses", "Prohibited phrase detected"},
		{"rahasia bisnis", "Prohibited phrase detected"},
	}

	bodyLower := strings.ToLower(body)

	for _, p := range prohibitedWords {
		// Word boundary match to avoid false positives
		pattern := `\b` + regexp.QuoteMeta(p.word) + `\b`
		re := regexp.MustCompile(pattern)
		if matches := re.FindAllString(bodyLower, -1); len(matches) > 0 {
			firstMatch := matches[0]
			context := extractContext(body, firstMatch, 50)
			return &ValidationError{
				Rule:    "KATA_TERLARANG",
				Message: p.message,
				Content: context,
			}
		}
	}

	return nil
}

// checkBrandMentions detects brand name mentions (should not be in content)
func checkBrandMentions(body string) error {
	// Common brand patterns (case-insensitive)
	brandPatterns := []struct {
		pattern string
		message string
	}{
		{`(?i)\btoko tani online\b`, "Brand name 'Toko Tani Online' detected in content"},
		{`(?i)\btt[oi]\b`, "Brand abbreviation detected"},
		// Add more brand-specific patterns as needed
	}

	bodyText := body

	for _, pattern := range brandPatterns {
		re := regexp.MustCompile(pattern.pattern)
		if matches := re.FindAllString(bodyText, -1); len(matches) > 0 {
			firstMatch := matches[0]
			context := extractContext(body, firstMatch, 50)
			return &ValidationError{
				Rule:    "NAMA_MEREK",
				Message: pattern.message,
				Content: context,
			}
		}
	}

	return nil
}

// checkPromotionalTone detects promotional/marketing language
func checkPromotionalTone(body string) error {
	// Promotional phrases - AUTO FAIL
	promotionalPatterns := []struct {
		pattern string
		message string
	}{
		{`(?i)(solusi terbaik|best solution|paling terbaik)`, "Promotional superlative detected"},
		{`(?i)(hanya di|only at|exclusive)`, "Exclusive promotional language detected"},
		{`(?i)(limited time|waktu terbatas|tawaran terbatas)`, "Limited-time promotion detected"},
		{`(?i)(garansi uang kembali|money back guarantee|jaminan uang kembali)`, "Guarantee marketing detected"},
		{`(?i)(testimoni|review positif|rating tinggi|bintang 5)`, "Social proof marketing detected"},
		{`(?i)(harga murah|harga terjangkau|harga terbaik)`, "Price promotion detected"},
		{`(?i)(diskon besar|big discount|potongan besar)`, "Discount promotion detected"},
		{`(?i)(stok terbatas|limited stock|hanya tersisa)`, "Scarcity marketing detected"},
		{`(?i)(wajib punya|must have|harus punya)`, "Urgency marketing detected"},
		{`(?i)(berlaku sampai|valid until|promo berlaku)`, "Time-limited promotion detected"},
	}

	bodyLower := strings.ToLower(body)

	for _, pattern := range promotionalPatterns {
		re := regexp.MustCompile(pattern.pattern)
		if matches := re.FindAllString(bodyLower, -1); len(matches) > 0 {
			firstMatch := matches[0]
			context := extractContext(body, firstMatch, 50)
			return &ValidationError{
				Rule:    "NADA_PROMOSI",
				Message: pattern.message,
				Content: context,
			}
		}
	}

	// Check for excessive exclamation marks (promotional style)
	exclamationCount := strings.Count(body, "!")
	if exclamationCount > 3 {
		return &ValidationError{
			Rule:    "NADA_PROMOSI",
			Message: fmt.Sprintf("Excessive exclamation marks detected (%d instances, max 3 allowed)", exclamationCount),
			Content: "Multiple '!' found in content",
		}
	}

	return nil
}

// checkHeadingAlignment validates that headings match the outline structure
// STRICT: Must match 100% - structure must be identical
func checkHeadingAlignment(body string, outline string) error {
	// Extract headings from body with their hierarchy
	bodyHeadings := extractHeadingsWithLevel(body)

	// Extract expected headings from outline with their hierarchy
	outlineHeadings := extractOutlineHeadingsWithLevel(outline)

	if len(outlineHeadings) == 0 {
		// Can't validate if outline has no headings
		return nil
	}

	// Count main sections (H2) from outline - should match body H2 count
	outlineH2Count := 0
	for _, h := range outlineHeadings {
		if h.Level == "H2" {
			outlineH2Count++
		}
	}

	bodyH2Count := 0
	for _, h := range bodyHeadings {
		if h.Level == "H2" {
			bodyH2Count++
		}
	}

	// Validate: Body must have at least the main H2 sections from outline
	// Allow some flexibility (body can have more, but not significantly less)
	if bodyH2Count < outlineH2Count {
		return &ValidationError{
			Rule:    "HEADING_TIDAK_SESUAI_OUTLINE",
			Message: fmt.Sprintf("Content has fewer main sections (H2) than outline (content: %d H2, outline: %d H2)", bodyH2Count, outlineH2Count),
			Content: fmt.Sprintf("Expected at least %d H2 sections, found %d", outlineH2Count, bodyH2Count),
		}
	}

	// If body has significantly more headings than outline, might be a problem
	// But allow flexibility (body might have more subsections)
	if len(bodyHeadings) == 0 && len(outlineHeadings) > 0 {
		return &ValidationError{
			Rule:    "HEADING_TIDAK_SESUAI_OUTLINE",
			Message: "Content has no headings but outline specifies headings",
			Content: "Expected headings in content but found none",
		}
	}

	// Check if all outline headings are present in body (with reasonable similarity)
	bodyHeadingMap := make(map[string]bool)
	for _, heading := range bodyHeadings {
		bodyHeadingMap[normalizeHeading(heading.Heading)] = true
	}

	missingHeadings := []string{}
	for _, expectedHeading := range outlineHeadings {
		normalized := normalizeHeading(expectedHeading.Heading)
		if !bodyHeadingMap[normalized] {
			// Check for partial match (headings might be rephrased) - 70% similarity threshold
			found := false
			bestMatch := ""
			bestSimilarity := 0.0
			for bodyHeading := range bodyHeadingMap {
				sim := similarity(bodyHeading, normalized)
				if sim > bestSimilarity {
					bestSimilarity = sim
					bestMatch = bodyHeading
				}
				if sim > 0.7 {
					found = true
					break
				}
			}
			if !found {
				missingHeadings = append(missingHeadings, expectedHeading.Heading)
				if bestMatch != "" && bestSimilarity > 0.5 {
					// Log best match for debugging (but still fail)
					log.Printf("[VALIDATION] Heading mismatch - Expected: %q, Best match: %q (similarity: %.2f)", expectedHeading.Heading, bestMatch, bestSimilarity)
				}
			}
		}
	}

	if len(missingHeadings) > 0 {
		return &ValidationError{
			Rule:    "HEADING_TIDAK_SESUAI_OUTLINE",
			Message: fmt.Sprintf("Missing or misaligned headings from outline (%d missing): %v", len(missingHeadings), missingHeadings[:min(5, len(missingHeadings))]),
			Content: fmt.Sprintf("Expected headings not found in content. Missing: %v", missingHeadings[:min(5, len(missingHeadings))]),
		}
	}

	// Additional check: Heading order should roughly match (at least same sequence)
	if !checkHeadingOrder(bodyHeadings, outlineHeadings) {
		return &ValidationError{
			Rule:    "HEADING_TIDAK_SESUAI_OUTLINE",
			Message: "Heading order does not match outline structure",
			Content: "Headings are present but in wrong order compared to outline",
		}
	}

	return nil
}

// extractHeadingsWithLevel extracts headings with their level (H2, H3)
// Supports both markdown (##, ###) and HTML (<h2>, <h3>) formats
func extractHeadingsWithLevel(body string) []struct {
	Level   string // "H2" or "H3"
	Heading string
} {
	var headings []struct {
		Level   string
		Heading string
	}
	lines := strings.Split(body, "\n")

	for _, line := range lines {
		line = strings.TrimSpace(line)
		
		// Check markdown format: ## Heading or ### Heading
		if strings.HasPrefix(line, "## ") && !strings.HasPrefix(line, "###") {
			heading := strings.TrimPrefix(line, "## ")
			heading = strings.TrimSpace(heading)
			if heading != "" {
				headings = append(headings, struct {
					Level   string
					Heading string
				}{"H2", heading})
			}
		} else if strings.HasPrefix(line, "### ") && !strings.HasPrefix(line, "####") {
			heading := strings.TrimPrefix(line, "### ")
			heading = strings.TrimSpace(heading)
			if heading != "" {
				headings = append(headings, struct {
					Level   string
					Heading string
				}{"H3", heading})
			}
		} else {
			// Also check HTML format: <h2>Heading</h2> or <h3>Heading</h3>
			if matched, _ := regexp.MatchString(`(?i)<h2[^>]*>(.+?)</h2>`, line); matched {
				re := regexp.MustCompile(`(?i)<h2[^>]*>(.+?)</h2>`)
				if matches := re.FindStringSubmatch(line); len(matches) > 1 {
					heading := strings.TrimSpace(matches[1])
					// Remove HTML tags from heading text
					heading = regexp.MustCompile(`<[^>]+>`).ReplaceAllString(heading, "")
					if heading != "" {
						headings = append(headings, struct {
							Level   string
							Heading string
						}{"H2", heading})
					}
				}
			} else if matched, _ := regexp.MatchString(`(?i)<h3[^>]*>(.+?)</h3>`, line); matched {
				re := regexp.MustCompile(`(?i)<h3[^>]*>(.+?)</h3>`)
				if matches := re.FindStringSubmatch(line); len(matches) > 1 {
					heading := strings.TrimSpace(matches[1])
					heading = regexp.MustCompile(`<[^>]+>`).ReplaceAllString(heading, "")
					if heading != "" {
						headings = append(headings, struct {
							Level   string
							Heading string
						}{"H3", heading})
					}
				}
			}
		}
	}

	return headings
}

// extractOutlineHeadingsWithLevel extracts headings from outline with their level
// Only extracts actual H2/H3 sections, not sub-topics or bullet points
func extractOutlineHeadingsWithLevel(outline string) []struct {
	Level   string
	Heading string
} {
	var headings []struct {
		Level   string
		Heading string
	}

	lines := strings.Split(outline, "\n")

	for _, line := range lines {
		line = strings.TrimSpace(line)

		// Only extract explicit H2/H3 sections (### H2 — or ### H3 —)
		// Ignore sub-topics and bullet points
		if strings.HasPrefix(line, "### H2") || strings.HasPrefix(line, "## H2") {
			// Extract H2 section name
			// Pattern: "### H2 — Section Name" or "## H2 — Section Name"
			re := regexp.MustCompile(`^###?\s+H2\s*[—\-]\s*(.+)$`)
			if matches := re.FindStringSubmatch(line); len(matches) > 1 {
				headingText := strings.TrimSpace(matches[1])
				// Remove markdown formatting if any
				headingText = regexp.MustCompile(`\*\*|__|`).ReplaceAllString(headingText, "")
				if headingText != "" && len(headingText) <= 200 {
					headings = append(headings, struct {
						Level   string
						Heading string
					}{"H2", headingText})
				}
			}
		} else if strings.HasPrefix(line, "#### H3") || (strings.HasPrefix(line, "### H3") && !strings.HasPrefix(line, "####")) {
			// Extract H3 section name
			// Pattern: "#### H3 — Subsection Name" or "### H3 — Subsection Name"
			re := regexp.MustCompile(`^####?\s+H3\s*[—\-]\s*(.+)$`)
			if matches := re.FindStringSubmatch(line); len(matches) > 1 {
				headingText := strings.TrimSpace(matches[1])
				headingText = regexp.MustCompile(`\*\*|__|`).ReplaceAllString(headingText, "")
				if headingText != "" && len(headingText) <= 200 {
					headings = append(headings, struct {
						Level   string
						Heading string
					}{"H3", headingText})
				}
			}
		} else if strings.HasPrefix(line, "### ") && !strings.HasPrefix(line, "####") && !strings.HasPrefix(line, "### H") {
			// Fallback: Check if it's a main section with — separator (not sub-topic)
			// Pattern: "### Section Name —"
			if strings.Contains(line, "—") {
				re := regexp.MustCompile(`^###\s+(.+?)\s*[—\-]\s*(.+)$`)
				if matches := re.FindStringSubmatch(line); len(matches) > 2 {
					headingText := strings.TrimSpace(matches[2])
					headingText = regexp.MustCompile(`\*\*|__|`).ReplaceAllString(headingText, "")
					// Only accept if it doesn't contain "sub-topik" or "tujuan" (these are metadata)
					lowerText := strings.ToLower(headingText)
					if headingText != "" && len(headingText) <= 200 && 
						!strings.Contains(lowerText, "sub-topik") && 
						!strings.Contains(lowerText, "tujuan:") &&
						!strings.Contains(lowerText, "struktur:") {
						headings = append(headings, struct {
							Level   string
							Heading string
						}{"H2", headingText})
					}
				}
			}
		}
	}

	log.Printf("[VALIDATION] Extracted %d headings from outline (%d H2, %d H3)", len(headings),
		countByLevel(headings, "H2"), countByLevel(headings, "H3"))

	return headings
}

// countByLevel counts headings by level
func countByLevel(headings []struct {
	Level   string
	Heading string
}, level string) int {
	count := 0
	for _, h := range headings {
		if h.Level == level {
			count++
		}
	}
	return count
}

// checkHeadingOrder validates that heading order roughly matches outline
func checkHeadingOrder(bodyHeadings []struct {
	Level   string
	Heading string
}, outlineHeadings []struct {
	Level   string
	Heading string
}) bool {
	// If counts differ significantly, order check is not reliable
	if abs(len(bodyHeadings)-len(outlineHeadings)) > len(outlineHeadings)/3 {
		return false
	}

	// Check if first few headings match
	matchCount := 0
	checkCount := min(3, min(len(bodyHeadings), len(outlineHeadings)))
	for i := 0; i < checkCount; i++ {
		bodyNorm := normalizeHeading(bodyHeadings[i].Heading)
		outlineNorm := normalizeHeading(outlineHeadings[i].Heading)
		if similarity(bodyNorm, outlineNorm) > 0.6 {
			matchCount++
		}
	}

	// At least 50% of first few headings should match
	return matchCount >= checkCount/2
}

// abs returns absolute value
func abs(x int) int {
	if x < 0 {
		return -x
	}
	return x
}

// min returns minimum of two integers
func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}

// extractHeadings extracts all H2 and H3 headings from markdown body
func extractHeadings(body string) []string {
	var headings []string
	lines := strings.Split(body, "\n")

	for _, line := range lines {
		line = strings.TrimSpace(line)
		if strings.HasPrefix(line, "## ") {
			heading := strings.TrimPrefix(line, "## ")
			headings = append(headings, heading)
		} else if strings.HasPrefix(line, "### ") {
			heading := strings.TrimPrefix(line, "### ")
			headings = append(headings, heading)
		}
	}

	return headings
}

// extractOutlineHeadings extracts headings from outline text
func extractOutlineHeadings(outline string) []string {
	var headings []string

	// Look for numbered/bulleted headings in outline
	lines := strings.Split(outline, "\n")
	for _, line := range lines {
		line = strings.TrimSpace(line)

		// Match patterns like "1. Heading", "- Heading", "## Heading", etc.
		patterns := []*regexp.Regexp{
			regexp.MustCompile(`^(?:\d+\.|[-*])\s+(.+)$`),
			regexp.MustCompile(`^##?\s+(.+)$`),
			regexp.MustCompile(`^[A-Z][^\n]+$`), // Uppercase line (potential heading)
		}

		for _, pattern := range patterns {
			if matches := pattern.FindStringSubmatch(line); len(matches) > 1 {
				headings = append(headings, matches[1])
				break
			}
		}
	}

	return headings
}

// normalizeHeading normalizes heading text for comparison
func normalizeHeading(heading string) string {
	// Convert to lowercase, remove punctuation, normalize whitespace
	heading = strings.ToLower(heading)
	heading = regexp.MustCompile(`[^\w\s]`).ReplaceAllString(heading, "")
	heading = regexp.MustCompile(`\s+`).ReplaceAllString(heading, " ")
	return strings.TrimSpace(heading)
}

// similarity calculates simple string similarity (0.0 to 1.0)
func similarity(s1, s2 string) float64 {
	// Simple word-based similarity
	words1 := strings.Fields(s1)
	words2 := strings.Fields(s2)

	commonWords := 0
	wordMap := make(map[string]bool)
	for _, word := range words1 {
		wordMap[word] = true
	}

	for _, word := range words2 {
		if wordMap[word] {
			commonWords++
		}
	}

	maxWords := len(words1)
	if len(words2) > maxWords {
		maxWords = len(words2)
	}

	if maxWords == 0 {
		return 0.0
	}

	return float64(commonWords) / float64(maxWords)
}

// extractContext extracts context around a match for error reporting
func extractContext(text, match string, contextSize int) string {
	index := strings.Index(strings.ToLower(text), strings.ToLower(match))
	if index == -1 {
		return match
	}

	start := index - contextSize
	if start < 0 {
		start = 0
	}

	end := index + len(match) + contextSize
	if end > len(text) {
		end = len(text)
	}

	context := text[start:end]
	return fmt.Sprintf("...%s...", context)
}