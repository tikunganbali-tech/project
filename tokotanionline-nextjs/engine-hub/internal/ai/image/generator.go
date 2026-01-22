package image

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"strings"
	"time"
)

// ImageAsset represents a generated image associated with a content section
type ImageAsset struct {
	Section    string `json:"section"`    // H2 / H3 section identifier
	URL        string `json:"url"`        // Original URL from AI API (temporary)
	LocalPath  string `json:"localPath"`  // Local path relative to public folder (e.g., /uploads/artikel-slug/hero.webp)
	AltText    string `json:"altText"`     // Descriptive alt text for SEO
	Prompt     string `json:"prompt"`     // The prompt used for generation
	Heading    string `json:"heading"`   // Section heading for context
	IsHero     bool   `json:"isHero"`     // True if this is the hero image (first image)
	Role       string `json:"role"`       // M-04: "hero" or "section" - explicit role for structured placement
}

// Generator handles AI image generation
type Generator struct {
	client      *http.Client
	apiKey      string
	apiURL      string
	model       string
	imageSize   string
	storage     *Storage
}

// NewGenerator creates a new image generator
// FASE C - C3: Satu API key OpenAI sudah cukup (tidak boleh API image terpisah)
func NewGenerator() *Generator {
	// FASE C - C3: Use same OpenAI API key (not separate image API)
	apiKey := os.Getenv("IMAGE_API_KEY")
	if apiKey == "" {
		apiKey = os.Getenv("OPENAI_API_KEY") // Fallback to OpenAI (same key as content generation)
	}

	// Get API URL (default to OpenAI DALL-E)
	apiURL := os.Getenv("IMAGE_API_URL")
	if apiURL == "" {
		apiURL = "https://api.openai.com/v1/images/generations"
	}

	// Get model name
	model := os.Getenv("IMAGE_MODEL")
	if model == "" {
		model = "dall-e-3" // Default to DALL-E 3
	}

	// Get image size
	size := os.Getenv("IMAGE_SIZE")
	if size == "" {
		size = "1024x1024" // Default size
	}

	return &Generator{
		client: &http.Client{
			Timeout: 90 * time.Second, // 90 second timeout for image generation
		},
		apiKey:    apiKey,
		apiURL:    apiURL,
		model:     model,
		imageSize: size,
		storage:   NewStorage(),
	}
}

// GeneratePrompt creates an image generation prompt from content section
// FASE C - C2: TEMPLATE PROMPT (LOCKED - FINAL)
// Template berbasis {OBJEK}, {KONTEKS}, {AKTIVITAS} dari konten artikel
// Engine wajib mengisi variable dari konten artikel, bukan di-hardcode
func (g *Generator) GeneratePrompt(sectionType string, heading string, content string) string {
	// FASE C - C2: Extract {OBJEK}, {KONTEKS}, {AKTIVITAS} from article content
	objek := extractObjectFromContent(heading, content)
	konteks := extractContextFromContent(heading, content)
	aktivitas := extractActivityFromContent(heading, content)

	// M-04: TEMPLATE FINAL (WAJIB & DIKUNCI)
	// Prinsip: RAW, natural, human-like (bukan cinematic/illustrative/AI fantasy)
	// Filter kualitas: Tolak ilustrasi fantasi, wajah aneh, komposisi tidak masuk akal
	template := `Foto realistis hasil kamera manusia, bukan ilustrasi atau AI art generik.

Objek utama:
{OBJEK_DARI_KONTEN}

Konteks lokasi:
{KONTEKS_ALAM/AKTIVITAS_RELEVAN}

Aktivitas:
{AKTIVITAS_NATURAL_MANUSIA}

Gaya foto:
- foto lapangan biasa, dokumenter
- pencahayaan alami (matahari, tidak studio)
- tanpa filter atau efek
- sedikit noise (seperti foto smartphone)
- framing tidak sempurna (natural composition)
- tidak cinematic atau dramatic
- tidak ilustratif atau fantasi
- tidak HDR atau oversaturated
- tidak AI fantasy atau surreal art
- foto aktivitas nyata, bukan ilustrasi

Kualitas wajib:
- Realistis dan natural
- Terlihat seperti foto dokumentasi sehari-hari
- Diambil spontan oleh manusia dengan kamera biasa
- Komposisi masuk akal (tidak aneh atau tidak mungkin)
- Objek dan aktivitas jelas terlihat

JANGAN:
- Ilustrasi fantasi atau AI art generik
- Wajah aneh atau tidak natural
- Komposisi tidak masuk akal
- Efek cinematic atau dramatic
- Stylized art atau illustration`

	// Replace template variables with extracted values
	result := strings.ReplaceAll(template, "{OBJEK_DARI_KONTEN}", objek)
	result = strings.ReplaceAll(result, "{KONTEKS_ALAM/AKTIVITAS_RELEVAN}", konteks)
	result = strings.ReplaceAll(result, "{AKTIVITAS_NATURAL_MANUSIA}", aktivitas)

	return result
}

// FASE C - C2: Extract {OBJEK} from article content
// Objek utama yang dibahas dalam section
func extractObjectFromContent(heading string, content string) string {
	keywords := extractKeywords(heading, content)
	
	// Look for object-related keywords (nouns, main subjects)
	objectKeywords := []string{}
	objectPatterns := []string{
		"benih", "pupuk", "pestisida", "fungisida", "herbisida", "insektisida",
		"alat", "tanaman", "sawah", "ladang", "kebun", "lahan",
		"petani", "pertanian", "perkebunan", "tanah", "hasil", "panen",
	}
	
	for _, kw := range keywords {
		lower := strings.ToLower(kw)
		for _, pattern := range objectPatterns {
			if strings.Contains(lower, pattern) {
				objectKeywords = append(objectKeywords, kw)
				break
			}
		}
	}
	
	if len(objectKeywords) > 0 {
		// Return first 2-3 most relevant objects
		maxObjects := min(3, len(objectKeywords))
		return strings.Join(objectKeywords[:maxObjects], ", ")
	}
	
	// Fallback: use heading if no specific objects found
	if len(keywords) > 0 {
		return strings.Join(keywords[:min(2, len(keywords))], " ")
	}
	
	return "aktivitas pertanian"
}

// FASE C - C2: Extract {KONTEKS} from article content
// Konteks lokasi/alam/aktivitas relevan
func extractContextFromContent(heading string, content string) string {
	keywords := extractKeywords(heading, content)
	
	// Look for context-related keywords (location, environment, setting)
	contextKeywords := []string{}
	contextPatterns := []string{
		"sawah", "ladang", "kebun", "lahan", "desa", "pedesaan", "perkebunan",
		"lapangan", "tanah", "pertanian", "alam", "lingkungan",
	}
	
	for _, kw := range keywords {
		lower := strings.ToLower(kw)
		for _, pattern := range contextPatterns {
			if strings.Contains(lower, pattern) {
				contextKeywords = append(contextKeywords, kw)
				break
			}
		}
	}
	
	if len(contextKeywords) > 0 {
		return strings.Join(contextKeywords[:min(2, len(contextKeywords))], ", ")
	}
	
	// Fallback: infer from content type
	if strings.Contains(strings.ToLower(heading+content), "sawah") {
		return "sawah, lahan pertanian"
	}
	if strings.Contains(strings.ToLower(heading+content), "kebun") {
		return "kebun, lahan perkebunan"
	}
	
	return "lahan pertanian, lingkungan alam"
}

// FASE C - C2: Extract {AKTIVITAS} from article content
// Aktivitas natural manusia yang relevan
func extractActivityFromContent(heading string, content string) string {
	keywords := extractKeywords(heading, content)
	
	// Look for activity-related keywords (verbs, actions)
	activityKeywords := []string{}
	activityPatterns := []string{
		"menanam", "panen", "merawat", "mengolah", "bekerja", "menggunakan",
		"menerapkan", "memupuk", "menyemprot", "menggemburkan", "menyiram",
		"memilih", "mengukur", "mengamati", "memeriksa", "mengatur",
	}
	
	for _, kw := range keywords {
		lower := strings.ToLower(kw)
		for _, pattern := range activityPatterns {
			if strings.Contains(lower, pattern) {
				activityKeywords = append(activityKeywords, kw)
				break
			}
		}
	}
	
	if len(activityKeywords) > 0 {
		return strings.Join(activityKeywords[:min(2, len(activityKeywords))], ", ")
	}
	
	// Fallback: infer from heading
	if strings.Contains(strings.ToLower(heading), "cara") {
		return "melakukan aktivitas pertanian"
	}
	if strings.Contains(strings.ToLower(heading), "penggunaan") {
		return "menggunakan peralatan atau bahan pertanian"
	}
	
	return "melakukan pekerjaan pertanian"
}

// Helper function to check if string contains any of the substrings
func containsAny(s string, substrings []string) bool {
	for _, substr := range substrings {
		if strings.Contains(s, substr) {
			return true
		}
	}
	return false
}

// Helper function to get minimum of two integers
func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}

// GenerateImages creates images for all relevant sections in the content
// FASE C - C3: IMAGE GENERATION FLOW (DIKUNCI)
// Flow: [CONTENT FINAL] → Extract image context → Generate via OpenAI → Download → Local save → Metadata → Relate
// articleSlug is used to create the folder structure for local storage
func (g *Generator) GenerateImages(body string, articleSlug string) ([]ImageAsset, error) {
	if g.apiKey == "" {
		return nil, fmt.Errorf("IMAGE_API_KEY or OPENAI_API_KEY environment variable not set")
	}

	// Extract headings (H2 and H3) from body
	sections := extractSections(body)

	if len(sections) == 0 {
		log.Println("[IMAGE GEN] No sections found in content, skipping image generation")
		return []ImageAsset{}, nil
	}

	var images []ImageAsset

	// M-04: Generate 3-5 images: 1 hero + 2-4 section images
	// Minimum 3 images required (hero + 2 sections)
	// Maximum 5 images to avoid over-image
	maxImages := 5
	minImages := 3
	imageCount := 0

	for _, section := range sections {
		if imageCount >= maxImages {
			log.Printf("[IMAGE GEN] Reached maximum image limit (%d), skipping remaining sections", maxImages)
			break
		}

		// M-04: Step 1 - Extract image context (topik, objek, aktivitas)
		// Generate prompt (extracts {OBJEK}, {KONTEKS}, {AKTIVITAS} from content)
		prompt := g.GeneratePrompt(section.Type, section.Heading, section.Content)

		// M-04: Step 2 - Generate image via OpenAI with quality filter
		imageURL, err := g.callImageAPI(prompt)
		if err != nil {
			log.Printf("[IMAGE GEN] Failed to generate image for section '%s': %v", section.Heading, err)
			// Continue with other sections even if one fails
			continue
		}

		// M-04: Step 3 - Quality filter (reject fantasy/AI art, prioritize realistic)
		// Note: Quality check happens at prompt level (realistic prompt enforced)
		// Additional validation can be added here if needed

		// M-04: Step 4 - Determine role (hero or section)
		var role string
		var isHero bool
		if imageCount == 0 {
			role = "hero"
			isHero = true
		} else {
			role = "section"
			isHero = false
		}

		// M-04: Step 5 - Generate natural filename
		filename := generateNaturalFilename(section.Heading, section.Content, imageCount)

		// M-04: Step 6 - Download and save to local storage
		localPath, err := g.storage.DownloadAndSave(imageURL, articleSlug, filename)
		if err != nil {
			log.Printf("[IMAGE GEN] Failed to save image locally for section '%s': %v", section.Heading, err)
			// Continue but mark as failed - we still have the URL
			localPath = ""
		}

		// M-04: Step 7 - Generate SEO-safe alt text (natural, contextual)
		altText := g.generateAltText(section.Heading, section.Content)

		images = append(images, ImageAsset{
			Section:   section.Type + ": " + section.Heading,
			URL:       imageURL, // Keep original URL for reference
			LocalPath: localPath,
			AltText:   altText,
			Prompt:    prompt,
			Heading:   section.Heading,
			IsHero:    isHero,
			Role:      role, // M-04: Explicit role for structured placement
		})

		imageCount++
		log.Printf("[IMAGE GEN] Successfully generated image [%s] for section: %s (path: %s)", role, section.Heading, localPath)
	}

	// M-04: Ensure minimum 3 images (hero + 2 sections)
	if imageCount < minImages {
		log.Printf("[IMAGE GEN] WARNING: Only generated %d images (minimum %d required: 1 hero + 2 sections)", imageCount, minImages)
		// Continue anyway - non-fatal, but log warning
	}

	return images, nil
}

// generateAltText creates descriptive alt text from heading and content
// FASE C - C4: Natural alt text (deskriptif, bukan keyword stuffing)
func (g *Generator) generateAltText(heading string, content string) string {
	// Extract key terms from heading and content
	headingWords := strings.Fields(strings.ToLower(heading))
	
	// Remove stop words
	stopWords := map[string]bool{
		"dan": true, "atau": true, "dengan": true, "untuk": true,
		"dari": true, "pada": true, "dalam": true, "adalah": true,
		"yang": true, "di": true, "ke": true, "ini": true, "itu": true,
		"apa": true, "bagaimana": true, "mengapa": true, "kapan": true,
	}
	
	var keyTerms []string
	for _, word := range headingWords {
		word = strings.Trim(word, ".,;:!?()[]{}")
		if len(word) >= 3 && !stopWords[word] {
			keyTerms = append(keyTerms, word)
		}
		if len(keyTerms) >= 3 {
			break
		}
	}
	
	// FASE C - C4: Natural, descriptive alt text (not keyword stuffing)
	if len(keyTerms) > 0 {
		terms := strings.Join(keyTerms, " ")
		// Natural description, not "Ilustrasi tentang..."
		return fmt.Sprintf("Foto %s di lahan pertanian", terms)
	}
	
	// Fallback: simple, natural description
	return fmt.Sprintf("Foto aktivitas pertanian terkait %s", heading)
}

// generateNaturalFilename creates a natural filename from section content
// FASE C - C4: Natural naming (e.g., petani-memupuk-sawah-pagi.webp)
// NOT: hero.webp, section-N.webp, ai_generated_001.webp
func generateNaturalFilename(heading string, content string, index int) string {
	// Extract keywords for filename
	keywords := extractKeywords(heading, content)
	
	// Build filename from keywords (max 4-5 words)
	var filenameParts []string
	maxParts := 4
	if len(keywords) > maxParts {
		keywords = keywords[:maxParts]
	}
	
	// Use keywords to build natural filename
	for _, kw := range keywords {
		// Clean keyword: lowercase, remove special chars
		clean := strings.ToLower(kw)
		clean = strings.Trim(clean, ".,;:!?()[]{}")
		if len(clean) >= 3 {
			filenameParts = append(filenameParts, clean)
		}
	}
	
	// If we have enough parts, create natural filename
	if len(filenameParts) >= 2 {
		filename := strings.Join(filenameParts, "-")
		// Limit length
		if len(filename) > 50 {
			filename = filename[:50]
			filename = strings.Trim(filename, "-")
		}
		return filename + ".webp"
	}
	
	// Fallback: use heading words if keywords insufficient
	headingWords := strings.Fields(strings.ToLower(heading))
	var fallbackParts []string
	for _, word := range headingWords {
		word = strings.Trim(word, ".,;:!?()[]{}")
		if len(word) >= 3 && len(fallbackParts) < 3 {
			fallbackParts = append(fallbackParts, word)
		}
	}
	
	if len(fallbackParts) >= 2 {
		filename := strings.Join(fallbackParts, "-")
		if len(filename) > 50 {
			filename = filename[:50]
		}
		return filename + ".webp"
	}
	
	// Last resort: use index but with descriptive prefix
	return fmt.Sprintf("foto-pertanian-%d.webp", index+1)
}

// Section represents a content section with heading
type Section struct {
	Type    string // H2 or H3
	Heading string
	Content string
}

// extractSections extracts H2 and H3 sections from markdown body
func extractSections(body string) []Section {
	var sections []Section

	lines := strings.Split(body, "\n")
	var currentSection *Section

	for _, line := range lines {
		line = strings.TrimSpace(line)

		// Check for H2 (## heading)
		if strings.HasPrefix(line, "## ") {
			// Save previous section if exists
			if currentSection != nil && currentSection.Heading != "" {
				sections = append(sections, *currentSection)
			}
			heading := strings.TrimPrefix(line, "## ")
			currentSection = &Section{
				Type:    "H2",
				Heading: heading,
				Content: "",
			}
		} else if strings.HasPrefix(line, "### ") {
			// Check for H3 (### heading)
			// Save previous section if exists
			if currentSection != nil && currentSection.Heading != "" {
				sections = append(sections, *currentSection)
			}
			heading := strings.TrimPrefix(line, "### ")
			currentSection = &Section{
				Type:    "H3",
				Heading: heading,
				Content: "",
			}
		} else if currentSection != nil && line != "" {
			// Accumulate content for current section
			if currentSection.Content != "" {
				currentSection.Content += " "
			}
			currentSection.Content += line
		}
	}

	// Add last section
	if currentSection != nil && currentSection.Heading != "" {
		sections = append(sections, *currentSection)
	}

	return sections
}

// extractKeywords extracts relevant keywords from heading and content for prompt generation
func extractKeywords(heading string, content string) []string {
	var keywords []string

	// Extract from heading first
	headingWords := strings.Fields(strings.ToLower(heading))
	stopWords := map[string]bool{
		"dan": true, "atau": true, "dengan": true, "untuk": true,
		"dari": true, "pada": true, "dalam": true, "adalah": true,
		"yang": true, "di": true, "ke": true, "ini": true, "itu": true,
		"apa": true, "bagaimana": true, "mengapa": true, "kapan": true,
		"akan": true, "sudah": true, "telah": true,
	}

	seen := make(map[string]bool)

	// Add meaningful words from heading
	for _, word := range headingWords {
		word = strings.Trim(word, ".,;:!?()[]{}")
		if len(word) >= 3 && !stopWords[word] && !seen[word] {
			keywords = append(keywords, word)
			seen[word] = true
			if len(keywords) >= 5 {
				break
			}
		}
	}

	// If we need more, extract from content (first paragraph)
	if len(keywords) < 3 {
		contentWords := strings.Fields(strings.ToLower(content))
		for _, word := range contentWords {
			word = strings.Trim(word, ".,;:!?()[]{}")
			if len(word) >= 4 && !stopWords[word] && !seen[word] {
				keywords = append(keywords, word)
				seen[word] = true
				if len(keywords) >= 5 {
					break
				}
			}
		}
	}

	return keywords
}

// callImageAPI makes the actual API call to the image generation service
func (g *Generator) callImageAPI(prompt string) (string, error) {
	// OpenAI DALL-E format
	requestBody := map[string]interface{}{
		"model":  g.model,
		"prompt": prompt,
		"size":   g.imageSize,
		"n":      1, // Generate 1 image
	}

	// FASE C - C1: Enforce natural style (not cinematic/illustrative)
	// DALL-E 3 parameters locked to natural, human-like photos
	if g.model == "dall-e-3" {
		requestBody["quality"] = "standard"
		requestBody["style"] = "natural" // LOCKED: natural only, not vivid/cinematic
	}

	jsonData, err := json.Marshal(requestBody)
	if err != nil {
		return "", fmt.Errorf("failed to marshal request: %w", err)
	}

	req, err := http.NewRequest("POST", g.apiURL, bytes.NewBuffer(jsonData))
	if err != nil {
		return "", fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+g.apiKey)

	resp, err := g.client.Do(req)
	if err != nil {
		return "", fmt.Errorf("API request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("API returned status %d: %s", resp.StatusCode, string(body))
	}

	var apiResponse struct {
		Data []struct {
			URL string `json:"url"`
		} `json:"data"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&apiResponse); err != nil {
		return "", fmt.Errorf("failed to decode response: %w", err)
	}

	if len(apiResponse.Data) == 0 || apiResponse.Data[0].URL == "" {
		return "", fmt.Errorf("no image URL in API response")
	}

	return apiResponse.Data[0].URL, nil
}

// M-05: GenerateProductImages creates product images with roles (hero, detail)
// Generates 3-6 images: minimum 3 (1 hero + 2 detail), maximum 6
// All images must be realistic product photos, not AI art/illustrations
func (g *Generator) GenerateProductImages(productName string, productDescription string, productSlug string) ([]ImageAsset, error) {
	if g.apiKey == "" {
		return nil, fmt.Errorf("IMAGE_API_KEY or OPENAI_API_KEY environment variable not set")
	}

	// M-05: Image count rules
	// Minimum 3 images (1 hero + 2 detail)
	// Maximum 6 images
	minImages := 3
	maxImages := 6

	var images []ImageAsset

	// M-05 STEP 1: Generate hero image (tampak depan produk)
	log.Printf("[PRODUCT IMAGE GEN] Generating hero image for product: %s", productName)
	heroPrompt := g.generateProductPrompt(productName, productDescription, "hero", "foto produk nyata tampak depan")
	heroURL, err := g.callImageAPI(heroPrompt)
	if err != nil {
		log.Printf("[PRODUCT IMAGE GEN] Failed to generate hero image: %v", err)
		return nil, fmt.Errorf("hero image generation failed: %w", err)
	}

	// M-05 STEP 2: Quality filter for hero
	if !g.validateImageQuality(heroPrompt, "hero") {
		log.Printf("[PRODUCT IMAGE GEN] WARNING: Hero image may not meet quality standards")
		// Continue anyway but log warning
	}

	// M-05 STEP 3: Save hero image
	heroFilename := fmt.Sprintf("%s-hero.jpg", productSlug)
	heroPath, err := g.storage.DownloadAndSaveProduct(heroURL, productSlug, heroFilename)
	if err != nil {
		log.Printf("[PRODUCT IMAGE GEN] Failed to save hero image: %v", err)
		heroPath = "" // Continue without local path
	}

	// M-05 STEP 4: Generate SEO alt text for hero
	heroAlt := fmt.Sprintf("%s - tampak depan", productName)

	images = append(images, ImageAsset{
		Section:   "hero",
		URL:       heroURL,
		LocalPath: heroPath,
		AltText:   heroAlt,
		Prompt:    heroPrompt,
		Heading:   productName,
		IsHero:    true,
		Role:      "hero",
	})
	log.Printf("[PRODUCT IMAGE GEN] Hero image generated: %s", heroPath)

	// M-05 STEP 5: Generate detail images (2-5 more images)
	detailQueries := []struct {
		query string
		alt   string
	}{
		{"foto detail tekstur atau komponen produk", "Detail produk " + productName},
		{"foto produk saat digunakan atau diaplikasikan", "Penggunaan " + productName},
		{"foto produk dari sudut berbeda", productName + " - sudut alternatif"},
		{"foto kemasan atau tampilan produk", productName + " - kemasan"},
		{"foto produk dalam konteks penggunaan", productName + " - konteks penggunaan"},
	}

	detailCount := 0
	for i, detail := range detailQueries {
		if len(images) >= maxImages {
			log.Printf("[PRODUCT IMAGE GEN] Reached maximum image limit (%d)", maxImages)
			break
		}

		log.Printf("[PRODUCT IMAGE GEN] Generating detail image %d/%d: %s", i+1, len(detailQueries), detail.query)
		detailPrompt := g.generateProductPrompt(productName, productDescription, "detail", detail.query)
		detailURL, err := g.callImageAPI(detailPrompt)
		if err != nil {
			log.Printf("[PRODUCT IMAGE GEN] Failed to generate detail image %d: %v", i+1, err)
			continue // Continue with next detail image
		}

		// M-05 STEP 2: Quality filter for detail
		if !g.validateImageQuality(detailPrompt, "detail") {
			log.Printf("[PRODUCT IMAGE GEN] WARNING: Detail image %d may not meet quality standards", i+1)
		}

		// M-05 STEP 3: Save detail image
		detailFilename := fmt.Sprintf("%s-detail-%d.jpg", productSlug, i+1)
		detailPath, err := g.storage.DownloadAndSaveProduct(detailURL, productSlug, detailFilename)
		if err != nil {
			log.Printf("[PRODUCT IMAGE GEN] Failed to save detail image %d: %v", i+1, err)
			detailPath = "" // Continue without local path
		}

		images = append(images, ImageAsset{
			Section:   fmt.Sprintf("detail-%d", i+1),
			URL:       detailURL,
			LocalPath: detailPath,
			AltText:   detail.alt,
			Prompt:    detailPrompt,
			Heading:   productName,
			IsHero:    false,
			Role:      "detail",
		})
		detailCount++
		log.Printf("[PRODUCT IMAGE GEN] Detail image %d generated: %s", i+1, detailPath)
	}

	// M-05: Ensure minimum images requirement
	if len(images) < minImages {
		log.Printf("[PRODUCT IMAGE GEN] WARNING: Only generated %d images (minimum %d required: 1 hero + 2 detail)", len(images), minImages)
		// Try to generate more detail images if needed
		needed := minImages - len(images)
		for i := 0; i < needed && len(images) < maxImages; i++ {
			log.Printf("[PRODUCT IMAGE GEN] Generating additional detail image to meet minimum requirement")
			detailPrompt := g.generateProductPrompt(productName, productDescription, "detail", "foto produk tambahan")
			detailURL, err := g.callImageAPI(detailPrompt)
			if err != nil {
				log.Printf("[PRODUCT IMAGE GEN] Failed to generate additional detail image: %v", err)
				continue
			}

			detailFilename := fmt.Sprintf("%s-detail-extra-%d.jpg", productSlug, i+1)
			detailPath, err := g.storage.DownloadAndSaveProduct(detailURL, productSlug, detailFilename)
			if err != nil {
				detailPath = ""
			}

			images = append(images, ImageAsset{
				Section:   fmt.Sprintf("detail-extra-%d", i+1),
				URL:       detailURL,
				LocalPath: detailPath,
				AltText:   fmt.Sprintf("Detail tambahan %s", productName),
				Prompt:    detailPrompt,
				Heading:   productName,
				IsHero:    false,
				Role:      "detail",
			})
		}
	}

	log.Printf("[PRODUCT IMAGE GEN] Successfully generated %d images (1 hero + %d detail)", len(images), len(images)-1)
	return images, nil
}

// M-05: generateProductPrompt creates product-specific image generation prompt
// Enforces realistic product photos, not AI art/illustrations
func (g *Generator) generateProductPrompt(productName string, description string, role string, query string) string {
	// M-05: Extract product keywords from name and description
	productKeywords := extractProductKeywords(productName, description)

	// M-05: TEMPLATE FINAL untuk produk (WAJIB & DIKUNCI)
	// Prinsip: Foto produk realistis, bukan ilustrasi/AI art
	template := `Foto produk realistis hasil kamera, bukan ilustrasi atau AI art generik.

Produk:
{PRODUK_NAMA}

Deskripsi visual:
{PRODUK_KEYWORDS}

Query spesifik:
{QUERY_SPESIFIK}

Gaya foto produk:
- Foto produk nyata seperti foto e-commerce profesional
- Latar belakang netral (putih, abu-abu terang, atau konteks penggunaan natural)
- Pencahayaan alami atau studio ringan (tidak dramatic)
- Fokus pada produk, komposisi jelas
- Tidak ada efek fantasi atau surreal
- Tidak ilustratif atau stylized art
- Foto produk seperti di katalog atau marketplace

Kualitas wajib:
- Realistis dan natural
- Produk terlihat jelas dan detail
- Komposisi masuk akal
- Tidak ada distorsi atau proporsi aneh
- Foto produk profesional, bukan AI fantasy art

JANGAN:
- Ilustrasi fantasi atau AI art generik
- Render 3D yang terlihat tidak natural
- Wajah atau proporsi aneh
- Komposisi tidak masuk akal
- Efek cinematic atau dramatic berlebihan
- Stylized illustration atau digital art`

	// Replace template variables
	result := strings.ReplaceAll(template, "{PRODUK_NAMA}", productName)
	result = strings.ReplaceAll(result, "{PRODUK_KEYWORDS}", productKeywords)
	result = strings.ReplaceAll(result, "{QUERY_SPESIFIK}", query)

	return result
}

// M-05: extractProductKeywords extracts relevant keywords from product name and description
func extractProductKeywords(productName string, description string) string {
	keywords := extractKeywords(productName, description)
	
	// Filter for product-relevant keywords
	productKeywords := []string{}
	productPatterns := []string{
		"pupuk", "pestisida", "fungisida", "herbisida", "insektisida",
		"benih", "alat", "peralatan", "bahan", "produk",
		"pertanian", "perkebunan", "tanaman", "sawah", "ladang",
	}
	
	seen := make(map[string]bool)
	for _, kw := range keywords {
		lower := strings.ToLower(kw)
		for _, pattern := range productPatterns {
			if strings.Contains(lower, pattern) && !seen[lower] {
				productKeywords = append(productKeywords, kw)
				seen[lower] = true
				break
			}
		}
		if len(productKeywords) >= 5 {
			break
		}
	}
	
	if len(productKeywords) > 0 {
		return strings.Join(productKeywords, ", ")
	}
	
	// Fallback: use product name
	return productName
}

// M-05: validateImageQuality checks if prompt meets quality standards
// Returns true if prompt is realistic (not fantasy/AI art)
func (g *Generator) validateImageQuality(prompt string, role string) bool {
	// Check for forbidden terms that indicate non-realistic images
	forbiddenTerms := []string{
		"illustration", "illustrated", "artistic", "fantasy", "surreal",
		"3d render", "digital art", "stylized", "cinematic", "dramatic",
		"fantasy art", "ai art", "generated art",
	}
	
	promptLower := strings.ToLower(prompt)
	for _, term := range forbiddenTerms {
		if strings.Contains(promptLower, term) {
			log.Printf("[PRODUCT IMAGE GEN] Quality check FAILED: Found forbidden term '%s' in prompt", term)
			return false
		}
	}
	
	// Check for required realistic terms
	requiredTerms := []string{
		"foto", "photo", "realistic", "real", "natural", "produk",
	}
	
	foundRequired := false
	for _, term := range requiredTerms {
		if strings.Contains(promptLower, term) {
			foundRequired = true
			break
		}
	}
	
	if !foundRequired {
		log.Printf("[PRODUCT IMAGE GEN] Quality check WARNING: No required realistic terms found in prompt")
		return false
	}
	
	return true
}