package content

import (
	"encoding/json"
	"fmt"
	"strings"
)

// STEP 1: REMOVED expandKeywords - Keyword TIDAK BOLEH diubah atau di-expand AI
// Keywords hanya dari input user (riset SEO manual), tidak boleh dimodifikasi

// OutlineSection represents a section in the content outline
type OutlineSection struct {
	Level   int    `json:"level"` // 1 = H1, 2 = H2, 3 = H3
	Title   string `json:"title"`
	Content string `json:"content,omitempty"` // Brief description
}

// buildOutlinePrompt constructs the AI prompt for outline generation
// This prompt includes explicit contract for outline structure
func buildOutlinePrompt(keyword string, contentType string, category string) string {
	var prompt strings.Builder

	// System instruction
	prompt.WriteString("Anda adalah ahli struktur konten untuk platform pertanian. ")
	prompt.WriteString("Buat outline artikel yang informatif, terstruktur, dan komprehensif.\n\n")

	// Content type context
	if contentType != "" {
		prompt.WriteString(fmt.Sprintf("Tipe Konten: %s\n", contentType))
	}
	if category != "" {
		prompt.WriteString(fmt.Sprintf("Kategori: %s\n", category))
	}
	prompt.WriteString("Platform: Toko Tani Online (agricultural e-commerce)\n\n")

	// Keyword context
	prompt.WriteString(fmt.Sprintf("Keyword Utama: %s\n\n", keyword))

	// KONTRAK EKSPLISIT - WAJIB MEMUAT STRUKTUR BERIKUT
	prompt.WriteString("OUTLINE WAJIB MEMUAT SEMUA BAGIAN BERIKUT SEBAGAI HEADING TERSENDIRI:\n\n")
	prompt.WriteString("1. Pendahuluan\n")
	prompt.WriteString("2. [Subtopik utama sesuai keyword]\n")
	prompt.WriteString("3. Hubungan Antar Jenis (sinergi, bukan berdiri sendiri)\n")
	prompt.WriteString("4. [Subtopik lanjutan]\n")
	prompt.WriteString("5. Penutup\n\n")

	// INSTRUKSI KRITIS
	prompt.WriteString("⚠️ INSTRUKSI KRITIS:\n")
	prompt.WriteString("- JANGAN mengganti judul \"Hubungan Antar Jenis (sinergi, bukan berdiri sendiri)\"\n")
	prompt.WriteString("- JANGAN menggabungkan bagian \"Hubungan Antar Jenis (sinergi, bukan berdiri sendiri)\" dengan heading lain\n")
	prompt.WriteString("- Bagian \"Hubungan Antar Jenis (sinergi, bukan berdiri sendiri)\" HARUS muncul sebagai heading H2 tersendiri\n")
	prompt.WriteString("- Jika tidak relevan secara langsung, tetap jelaskan hubungan konseptual antar subtopik\n")
	prompt.WriteString("- Setiap bagian HARUS sebagai heading tersendiri, tidak boleh digabung\n\n")

	// Format output
	prompt.WriteString("OUTPUT FORMAT:\n")
	prompt.WriteString("Buat outline dalam format markdown dengan struktur heading (H2 menggunakan ##, H3 menggunakan ###)\n")
	prompt.WriteString("Setiap heading harus jelas dan deskriptif\n")
	prompt.WriteString("Pastikan heading \"Hubungan Antar Jenis (sinergi, bukan berdiri sendiri)\" muncul tepat sebagai heading H2\n\n")

	return prompt.String()
}

// generateOutline generates a content outline based on keyword
func generateOutline(primaryKeyword string, keywords []string, categoryID *string) (json.RawMessage, error) {
	// TODO: Implement AI/LLM call for outline generation
	// For now, generate a basic outline structure
	
	outline := []OutlineSection{
		{Level: 1, Title: fmt.Sprintf("Panduan Lengkap: %s", primaryKeyword), Content: "Pendahuluan"},
		{Level: 2, Title: fmt.Sprintf("Apa itu %s?", primaryKeyword), Content: "Definisi dan penjelasan"},
		{Level: 2, Title: fmt.Sprintf("Manfaat %s", primaryKeyword), Content: "Manfaat dan keuntungan"},
		{Level: 2, Title: fmt.Sprintf("Cara Menggunakan %s", primaryKeyword), Content: "Langkah-langkah praktis"},
		{Level: 2, Title: "Tips dan Rekomendasi", Content: "Tips terbaik"},
		{Level: 2, Title: "Kesimpulan", Content: "Ringkasan"},
	}

	outlineJSON, err := json.Marshal(outline)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal outline: %w", err)
	}

	return json.RawMessage(outlineJSON), nil
}

// generateContent generates full content based on keyword and outline
func generateContent(primaryKeyword string, keywords []string, outline json.RawMessage, targetWordCount int) (string, error) {
	// TODO: Implement AI/LLM call for content generation
	// For now, generate placeholder content
	
	var sections []OutlineSection
	if err := json.Unmarshal(outline, &sections); err != nil {
		return "", fmt.Errorf("failed to unmarshal outline: %w", err)
	}

	var content strings.Builder
	
	for _, section := range sections {
		// Add heading
		headingPrefix := strings.Repeat("#", section.Level)
		content.WriteString(fmt.Sprintf("%s %s\n\n", headingPrefix, section.Title))
		
		// Add content
		sectionContent := generateSectionContent(section.Title, primaryKeyword, targetWordCount/len(sections))
		content.WriteString(sectionContent)
		content.WriteString("\n\n")
	}

	return content.String(), nil
}

// generateSectionContent generates content for a section
func generateSectionContent(title, keyword string, targetWords int) string {
	// Placeholder content generation
	// TODO: Replace with actual AI/LLM call
	
	paragraphs := []string{
		fmt.Sprintf("Dalam membahas %s, penting untuk memahami konteks dan manfaatnya. %s merupakan topik yang sangat relevan dalam industri pertanian modern.", keyword, keyword),
		fmt.Sprintf("Beberapa aspek penting yang perlu diperhatikan meliputi teknik terbaik, tips praktis, dan rekomendasi ahli. Dengan memahami %s secara menyeluruh, kita dapat mengoptimalkan hasil.", keyword),
		fmt.Sprintf("Praktik terbaik menunjukkan bahwa %s dapat memberikan dampak positif yang signifikan. Oleh karena itu, penting untuk terus belajar dan mengikuti perkembangan terbaru.", keyword),
	}
	
	// Combine paragraphs to reach target word count approximately
	result := strings.Join(paragraphs, "\n\n")
	
	// Repeat if needed to reach target word count
	if countWords(result) < targetWords {
		result += "\n\n" + strings.Join(paragraphs, "\n\n")
	}
	
	return result
}

// countWords counts words in a text
func countWords(text string) int {
	words := strings.Fields(text)
	return len(words)
}

// calculateReadingTime calculates reading time in minutes
func calculateReadingTime(wordCount int) int {
	// Average reading speed: 200 words per minute
	readingTime := wordCount / 200
	if readingTime < 1 {
		readingTime = 1
	}
	return readingTime
}

// generateTitleFromKeyword generates a title from keyword
func generateTitleFromKeyword(keyword string) string {
	return fmt.Sprintf("Panduan Lengkap: %s - Tips & Rekomendasi Terbaik", strings.Title(keyword))
}

// generateExcerptFromContent generates excerpt from content
func generateExcerptFromContent(content string) string {
	// Take first 200 characters
	excerpt := strings.TrimSpace(content)
	if len(excerpt) > 200 {
		excerpt = excerpt[:200]
		// Try to end at a sentence
		lastPeriod := strings.LastIndex(excerpt, ".")
		if lastPeriod > 100 {
			excerpt = excerpt[:lastPeriod+1]
		}
	}
	return excerpt
}

// generateSlug generates a URL-friendly slug from title
func generateSlug(title string) string {
	slug := strings.ToLower(title)
	slug = strings.ReplaceAll(slug, " ", "-")
	slug = strings.ReplaceAll(slug, ":", "")
	slug = strings.ReplaceAll(slug, "&", "dan")
	slug = strings.ReplaceAll(slug, ",", "")
	slug = strings.ReplaceAll(slug, ".", "")
	slug = strings.ReplaceAll(slug, "!", "")
	slug = strings.ReplaceAll(slug, "?", "")
	
	// Remove multiple dashes
	for strings.Contains(slug, "--") {
		slug = strings.ReplaceAll(slug, "--", "-")
	}
	
	// Remove leading/trailing dashes
	slug = strings.Trim(slug, "-")
	
	return slug
}
