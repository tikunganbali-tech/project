package content

import (
	"encoding/json"
	"fmt"
	"strings"
)

// SEOMetadata holds SEO-related metadata
type SEOMetadata struct {
	Title       string
	Description string
	Schema      json.RawMessage
	Keywords    []string
}

// generateSEOMetadata generates SEO metadata for content
func generateSEOMetadata(primaryKeyword string, content string, categoryID *string) (*SEOMetadata, error) {
	// Generate meta title
	title := generateSEOTitle(primaryKeyword)
	
	// Generate meta description
	description := generateSEODescription(content, primaryKeyword)
	
	// Generate schema (JSON-LD)
	schema, err := generateSchema(primaryKeyword, title, description, categoryID)
	if err != nil {
		return nil, fmt.Errorf("failed to generate schema: %w", err)
	}
	
	// STEP 1: Keyword TIDAK BOLEH di-extract dari konten
	// Keywords hanya dari input user, bukan dari content
	keywords := []string{primaryKeyword}
	
	return &SEOMetadata{
		Title:       title,
		Description: description,
		Schema:      schema,
		Keywords:    keywords, // STEP 1: Hanya primary keyword, tidak extract dari content
	}, nil
}

// generateSEOTitle generates SEO-optimized title
func generateSEOTitle(keyword string) string {
	// Ensure title is between 50-60 characters for optimal SEO
	baseTitle := fmt.Sprintf("Panduan Lengkap: %s - Tips & Rekomendasi", strings.Title(keyword))
	if len(baseTitle) > 60 {
		baseTitle = fmt.Sprintf("%s - Tips Terbaik", strings.Title(keyword))
	}
	if len(baseTitle) > 60 {
		baseTitle = strings.Title(keyword) + " - Panduan Lengkap"
	}
	return baseTitle
}

// generateSEODescription generates SEO-optimized description
func generateSEODescription(content, keyword string) string {
	// Meta description should be 150-160 characters
	baseDesc := fmt.Sprintf("Pelajari semua tentang %s. Panduan lengkap dengan tips praktis dan rekomendasi terbaik untuk hasil optimal.", keyword)
	
	if len(baseDesc) > 160 {
		baseDesc = fmt.Sprintf("Panduan lengkap tentang %s dengan tips praktis dan rekomendasi terbaik.", keyword)
	}
	
	// Try to use content excerpt if it fits
	excerpt := generateExcerptFromContent(content)
	if len(excerpt) >= 120 && len(excerpt) <= 160 {
		baseDesc = excerpt
	}
	
	return baseDesc
}

// generateSchema generates JSON-LD schema markup
func generateSchema(keyword, title, description string, categoryID *string) (json.RawMessage, error) {
	// Generate Article schema
	schema := map[string]interface{}{
		"@context": "https://schema.org",
		"@type":    "Article",
		"headline": title,
		"description": description,
		"keywords": keyword,
	}
	
	// Add category if available
	if categoryID != nil {
		schema["articleSection"] = *categoryID
	}
	
	schemaJSON, err := json.Marshal(schema)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal schema: %w", err)
	}
	
	return json.RawMessage(schemaJSON), nil
}

// STEP 1: REMOVED extractKeywords - Keyword TIDAK BOLEH dihasilkan AI
// Keywords hanya dari input user (riset SEO manual)

// isStopWord checks if a word is a stop word
func isStopWord(word string) bool {
	stopWords := []string{"yang", "dan", "atau", "dari", "pada", "untuk", "dengan", "adalah", "ini", "itu", "dia", "kita", "mereka", "akan", "telah", "sudah", "dapat", "bisa", "jika", "ketika", "saat", "karena", "tetapi", "namun", "sehingga", "maka", "juga", "serta", "bahwa", "sebagai", "di", "ke", "dari", "oleh", "pada", "dalam", "atas", "bawah", "antara", "diantara", "sambil", "selama", "setelah", "sebelum", "hingga", "sampai", "tentang", "mengenai", "bagi", "guna", "melalui", "via", "tanpa", "terhadap", "bagi", "oleh", "untuk", "kepada", "dari", "pada"}
	
	word = strings.ToLower(word)
	for _, stop := range stopWords {
		if word == stop {
			return true
		}
	}
	return false
}
