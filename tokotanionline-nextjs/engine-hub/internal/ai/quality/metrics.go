package quality

import (
	"regexp"
	"strings"
	"unicode"

	"engine-hub/internal/ai/content"
)

// Metrics represents all quality metrics for a generated article
type Metrics struct {
	WordCount           int     `json:"wordCount"`
	DepthScore          float64 `json:"depthScore"`          // 0-1 scale
	RepetitionRate      float64 `json:"repetitionRate"`      // 0-1 scale (percentage)
	StructureCompliance float64 `json:"structureCompliance"` // 0-1 scale
	HumanReadability    string  `json:"humanReadability"`    // PASS or FAIL
}

// AnalyzeContent calculates all quality metrics for given content
func AnalyzeContent(result *content.ContentResult, outline string) Metrics {
	body := result.Body
	title := result.Title

	// Combine title and body for analysis
	fullText := title + " " + body

	return Metrics{
		WordCount:           countWords(fullText),
		DepthScore:          calculateDepthScore(body),
		RepetitionRate:      calculateRepetitionRate(body),
		StructureCompliance: calculateStructureCompliance(body, outline),
		HumanReadability:    assessReadability(body),
	}
}

// countWords counts words in text (Indonesian-aware)
func countWords(text string) int {
	// Remove markdown formatting
	text = removeMarkdown(text)

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

// removeMarkdown removes markdown formatting from text
func removeMarkdown(text string) string {
	// Remove headers
	text = regexp.MustCompile(`#{1,6}\s+`).ReplaceAllString(text, "")
	// Remove bold/italic
	text = regexp.MustCompile(`\*\*|\*|__|_`).ReplaceAllString(text, "")
	// Remove links
	text = regexp.MustCompile(`\[([^\]]+)\]\([^\)]+\)`).ReplaceAllString(text, "$1")
	// Remove code blocks
	text = regexp.MustCompile("```[\\s\\S]*?```").ReplaceAllString(text, "")
	text = regexp.MustCompile("`[^`]+`").ReplaceAllString(text, "")
	// Remove images
	text = regexp.MustCompile(`!\[([^\]]*)\]\([^\)]+\)`).ReplaceAllString(text, "")
	return text
}

// calculateDepthScore measures content depth (0-1 scale)
// Depth = substance + coherence + comprehensive coverage
// Higher score = more substantive, well-structured, comprehensive content
func calculateDepthScore(body string) float64 {
	score := 0.0

	// Factor 1: Average paragraph length (substantive paragraphs score higher)
	// But not too long (fluff detection)
	paragraphs := splitParagraphs(body)
	if len(paragraphs) == 0 {
		return 0.0
	}

	totalParagraphLength := 0
	for _, p := range paragraphs {
		words := countWords(p)
		totalParagraphLength += words
	}
	avgParagraphLength := float64(totalParagraphLength) / float64(len(paragraphs))

	// Optimal paragraph length: 50-150 words (Indonesian content)
	if avgParagraphLength >= 50 && avgParagraphLength <= 150 {
		score += 0.3
	} else if avgParagraphLength >= 30 && avgParagraphLength <= 200 {
		score += 0.2
	} else if avgParagraphLength >= 20 {
		score += 0.1
	}

	// Factor 2: Heading structure (proper H2/H3 hierarchy)
	headingCount := countHeadings(body)
	if headingCount >= 4 && headingCount <= 12 {
		score += 0.3 // Well-structured
	} else if headingCount >= 2 {
		score += 0.15
	}

	// Factor 3: Content variety (vocabulary richness)
	// Count unique words vs total words ratio
	words := strings.Fields(removeMarkdown(body))
	uniqueWords := make(map[string]bool)
	for _, word := range words {
		word = strings.ToLower(strings.Trim(word, ".,!?;:\"()[]{}"))
		if len(word) > 2 { // Ignore very short words
			uniqueWords[word] = true
		}
	}

	if len(words) > 0 {
		varietyRatio := float64(len(uniqueWords)) / float64(len(words))
		if varietyRatio > 0.5 {
			score += 0.2
		} else if varietyRatio > 0.3 {
			score += 0.1
		}
	}

	// Factor 4: Sentence complexity (not just short, simple sentences)
	sentences := splitSentences(body)
	if len(sentences) > 0 {
		avgSentenceLength := 0.0
		for _, s := range sentences {
			avgSentenceLength += float64(countWords(s))
		}
		avgSentenceLength /= float64(len(sentences))

		if avgSentenceLength >= 12 && avgSentenceLength <= 25 {
			score += 0.2 // Natural, readable complexity
		} else if avgSentenceLength >= 8 {
			score += 0.1
		}
	}

	// Normalize to 0-1
	if score > 1.0 {
		score = 1.0
	}

	return score
}

// calculateRepetitionRate calculates how much content repeats itself (0-1 scale)
func calculateRepetitionRate(body string) float64 {
	// Remove markdown and normalize
	text := removeMarkdown(body)
	words := strings.Fields(text)

	if len(words) < 10 {
		return 0.0 // Too short to assess
	}

	// Count phrase repetitions (3-word phrases)
	phraseCount := make(map[string]int)
	phraseSize := 3

	for i := 0; i <= len(words)-phraseSize; i++ {
		phrase := strings.ToLower(strings.Join(words[i:i+phraseSize], " "))
		phraseCount[phrase]++
	}

	// Calculate repetition rate
	repeatedPhrases := 0
	totalPhrases := len(words) - phraseSize + 1

	for _, count := range phraseCount {
		if count > 1 {
			repeatedPhrases += (count - 1) // Count extra occurrences
		}
	}

	if totalPhrases == 0 {
		return 0.0
	}

	repetitionRate := float64(repeatedPhrases) / float64(totalPhrases)
	return repetitionRate
}

// calculateStructureCompliance checks adherence to outline structure (0-1 scale)
func calculateStructureCompliance(body string, outline string) float64 {
	if outline == "" {
		return 1.0 // No outline to check against
	}

	// Extract expected headings from outline
	expectedHeadings := extractExpectedHeadings(outline)
	if len(expectedHeadings) == 0 {
		return 1.0 // No headings to check
	}

	// Extract actual headings from body
	actualHeadings := extractActualHeadings(body)

	// Calculate match rate
	matches := 0
	for _, expected := range expectedHeadings {
		for _, actual := range actualHeadings {
			if strings.Contains(strings.ToLower(actual), strings.ToLower(expected)) ||
				strings.Contains(strings.ToLower(expected), strings.ToLower(actual)) {
				matches++
				break
			}
		}
	}

	if len(expectedHeadings) == 0 {
		return 1.0
	}

	compliance := float64(matches) / float64(len(expectedHeadings))
	return compliance
}

// assessReadability performs basic readability assessment
func assessReadability(body string) string {
	// Basic checks for readability
	paragraphs := splitParagraphs(body)
	if len(paragraphs) < 3 {
		return "FAIL" // Too few paragraphs
	}

	// Check average sentence length (not too long, not too short)
	sentences := splitSentences(body)
	if len(sentences) < 5 {
		return "FAIL" // Too few sentences
	}

	avgSentenceLength := 0.0
	for _, s := range sentences {
		avgSentenceLength += float64(countWords(s))
	}
	avgSentenceLength /= float64(len(sentences))

	// Reasonable sentence length for Indonesian: 8-30 words
	if avgSentenceLength < 5 || avgSentenceLength > 40 {
		return "FAIL"
	}

	// Check paragraph length
	avgParagraphLength := 0.0
	for _, p := range paragraphs {
		avgParagraphLength += float64(countWords(p))
	}
	avgParagraphLength /= float64(len(paragraphs))

	// Reasonable paragraph length: 20-200 words
	if avgParagraphLength < 10 || avgParagraphLength > 300 {
		return "FAIL"
	}

	return "PASS"
}

// Helper functions

func splitParagraphs(text string) []string {
	// Split by double newline or single newline after markdown heading
	parts := regexp.MustCompile(`\n\s*\n`).Split(text, -1)
	var paragraphs []string
	for _, p := range parts {
		p = strings.TrimSpace(p)
		if p != "" && !strings.HasPrefix(p, "#") {
			paragraphs = append(paragraphs, p)
		}
	}
	return paragraphs
}

func splitSentences(text string) []string {
	// Remove markdown first
	text = removeMarkdown(text)

	// Split by sentence terminators
	sentences := regexp.MustCompile(`[.!?]+`).Split(text, -1)
	var result []string
	for _, s := range sentences {
		s = strings.TrimSpace(s)
		if len(s) > 5 { // Minimum sentence length
			result = append(result, s)
		}
	}
	return result
}

func countHeadings(text string) int {
	// Count H2 (##) and H3 (###) headings
	h2Count := len(regexp.MustCompile(`(?m)^##\s+`).FindAllString(text, -1))
	h3Count := len(regexp.MustCompile(`(?m)^###\s+`).FindAllString(text, -1))
	return h2Count + h3Count
}

func extractExpectedHeadings(outline string) []string {
	// Extract H2 and H3 headings from outline
	var headings []string

	// H2 headings
	h2Matches := regexp.MustCompile(`(?m)^### H2[^#]*\*\*([^\*]+)\*\*`).FindAllStringSubmatch(outline, -1)
	for _, match := range h2Matches {
		if len(match) > 1 {
			headings = append(headings, strings.TrimSpace(match[1]))
		}
	}

	// H3 headings
	h3Matches := regexp.MustCompile(`(?m)^#### H3[^#]*\*\*([^\*]+)\*\*`).FindAllStringSubmatch(outline, -1)
	for _, match := range h3Matches {
		if len(match) > 1 {
			headings = append(headings, strings.TrimSpace(match[1]))
		}
	}

	// Also try simpler patterns
	h2Simple := regexp.MustCompile(`(?m)^### H2 — ([^\n]+)`).FindAllStringSubmatch(outline, -1)
	for _, match := range h2Simple {
		if len(match) > 1 {
			headings = append(headings, strings.TrimSpace(match[1]))
		}
	}

	h3Simple := regexp.MustCompile(`(?m)^#### H3 — ([^\n]+)`).FindAllStringSubmatch(outline, -1)
	for _, match := range h3Simple {
		if len(match) > 1 {
			headings = append(headings, strings.TrimSpace(match[1]))
		}
	}

	return headings
}

func extractActualHeadings(body string) []string {
	var headings []string

	// Extract H2 headings (##)
	h2Matches := regexp.MustCompile(`(?m)^##\s+([^\n]+)`).FindAllStringSubmatch(body, -1)
	for _, match := range h2Matches {
		if len(match) > 1 {
			headings = append(headings, strings.TrimSpace(match[1]))
		}
	}

	// Extract H3 headings (###)
	h3Matches := regexp.MustCompile(`(?m)^###\s+([^\n]+)`).FindAllStringSubmatch(body, -1)
	for _, match := range h3Matches {
		if len(match) > 1 {
			headings = append(headings, strings.TrimSpace(match[1]))
		}
	}

	return headings
}
