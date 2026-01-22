package v2

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"strings"
	"time"
)

// Generator handles AI content generation (v2)
// PHASE 1.3: NO SEO, NO VALIDATOR - Pure AI generation
type Generator struct {
	client  *http.Client
	apiKey  string
	apiURL  string
	model   string
	storage *Storage // PHASE 1.5: Versioning storage
}

// NewGenerator creates a new v2 content generator
func NewGenerator() *Generator {
	log.Println("[AI GENERATOR V2] Creating new generator...")
	
	// Get API key from environment
	apiKey := os.Getenv("OPENAI_API_KEY")
	if apiKey == "" {
		apiKey = os.Getenv("AI_API_KEY")
	}
	
	// Get API URL
	apiURL := os.Getenv("AI_API_URL")
	if apiURL == "" {
		apiURL = "https://api.openai.com/v1/chat/completions" // Standard OpenAI endpoint
	}
	
	// A1. Lock Model ke GPT-5.2 (WAJIB - NO FALLBACK)
	// ❌ Jangan pakai fallback otomatis ke model lama
	// ➡️ Jika GPT-5.2 unavailable → return error, bukan downgrade diam-diam
	model := os.Getenv("AI_MODEL")
	if model == "" {
		model = "gpt-5.2" // Default to GPT-5.2
	}
	if model != "gpt-5.2" {
		log.Printf("[AI GENERATOR V2] WARNING: Model is set to %s, but GPT-5.2 is required. Forcing GPT-5.2.", model)
		model = "gpt-5.2"
	}
	
	log.Printf("[AI GENERATOR V2] API key loaded: present=%v, length=%d", apiKey != "", len(apiKey))
	log.Printf("[AI GENERATOR V2] Model: %s (LOCKED - NO FALLBACK)", model)
	
	// PHASE 1.5: Initialize storage for versioning
	storage := NewStorage()
	
	return &Generator{
		client: &http.Client{
			Timeout: 120 * time.Second, // 2 minute timeout for long-form content
		},
		apiKey:  apiKey,
		apiURL:  apiURL,
		model:   model,
		storage: storage,
	}
}

// Generate produces complete FrontendContentPackage
// PHASE 1.3: Generate narasi utama, struktur logika, tone konsisten, isi panjang
// NO SEO, NO VALIDATOR, NO TRUNCATE, NO "kalau gagal, potong"
// PHASE 7A: Brand-aware generation - brand context is REQUIRED
func (g *Generator) Generate(ctx context.Context, req GenerationRequest) (*GenerationResult, error) {
	log.Println("[AI GENERATOR V2] Starting content generation...")
	log.Printf("[AI GENERATOR V2] Request: pageType=%s, topic=%s, language=%s", req.PageType, req.Topic, req.Language)
	
	// PHASE 7A: Guardrail - brand context is REQUIRED
	if req.BrandContext == nil {
		return nil, fmt.Errorf("PHASE 7A GUARDRAIL: Brand context is required. No content generation without brand_id")
	}
	if req.BrandContext.BrandID == "" {
		return nil, fmt.Errorf("PHASE 7A GUARDRAIL: Brand ID is required")
	}
	if req.BrandContext.BrandStatus != "ACTIVE" {
		return nil, fmt.Errorf("PHASE 7A GUARDRAIL: Brand must be ACTIVE. Current status: %s", req.BrandContext.BrandStatus)
	}
	
	// PHASE 7B: Guardrail - locale context is REQUIRED
	if req.LocaleContext == nil {
		return nil, fmt.Errorf("PHASE 7B GUARDRAIL: Locale context is required. No content generation without locale_id")
	}
	if req.LocaleContext.LocaleID == "" {
		return nil, fmt.Errorf("PHASE 7B GUARDRAIL: Locale ID is required")
	}
	if !req.LocaleContext.IsActive {
		return nil, fmt.Errorf("PHASE 7B GUARDRAIL: Locale must be ACTIVE. Current locale: %s", req.LocaleContext.LocaleCode)
	}
	
	log.Printf("[AI GENERATOR V2] Brand context: brandId=%s, brandName=%s, brandSlug=%s", 
		req.BrandContext.BrandID, req.BrandContext.BrandName, req.BrandContext.BrandSlug)
	log.Printf("[AI GENERATOR V2] Locale context: localeId=%s, localeCode=%s, languageName=%s", 
		req.LocaleContext.LocaleID, req.LocaleContext.LocaleCode, req.LocaleContext.LanguageName)
	
	if g.apiKey == "" {
		return nil, fmt.Errorf("AI_API_KEY or OPENAI_API_KEY environment variable not set")
	}
	
	// PHASE 1.3: Generate complete content package
	// Step 1: Generate main narrative (long-form content)
	mainContent, err := g.generateMainNarrative(req)
	if err != nil {
		return nil, fmt.Errorf("failed to generate main narrative: %w", err)
	}
	
	log.Printf("[AI GENERATOR V2] Main narrative generated: %d words", countWords(mainContent))
	
	// Step 2: Generate structure (sections with headings)
	sections, err := g.generateStructure(mainContent, req)
	if err != nil {
		return nil, fmt.Errorf("failed to generate structure: %w", err)
	}
	
	log.Printf("[AI GENERATOR V2] Structure generated: %d sections", len(sections))
	
	// Step 3: Generate title and hero copy
	title, heroCopy, err := g.generateTitleAndHero(req, mainContent)
	if err != nil {
		return nil, fmt.Errorf("failed to generate title and hero: %w", err)
	}
	
	// Step 4: Generate CTA (PHASE 1.4: Content Composer)
	cta, err := g.generateCTA(req)
	if err != nil {
		return nil, fmt.Errorf("failed to generate CTA: %w", err)
	}
	
	// Step 5: Generate microcopy (PHASE 1.4: Content Composer)
	microcopy, err := g.generateMicrocopy(req, mainContent, sections)
	if err != nil {
		return nil, fmt.Errorf("failed to generate microcopy: %w", err)
	}
	
	// Step 6: Determine tone
	tone := g.determineTone(req)
	
	// Step 7: Calculate metadata
	wordCount := countWords(mainContent)
	readingTime := calculateReadingTime(wordCount)
	
	// Generate page_id (normalized) with brand+locale isolation
	// PHASE 7A/7B: Prevent cross-brand/locale version collision and leakage.
	// NOTE: This affects storage keying and versioning; required for true isolation.
	pageIDSource := req.Topic
	if req.BrandContext != nil && req.BrandContext.BrandID != "" && req.LocaleContext != nil && req.LocaleContext.LocaleCode != "" {
		pageIDSource = fmt.Sprintf("%s %s %s", req.Topic, req.BrandContext.BrandID, req.LocaleContext.LocaleCode)
	}
	pageID := generatePageID(pageIDSource, req.PageType)
	
	// Build FrontendContentPackage (version will be set by storage)
	contentPackage := FrontendContentPackage{
		PageType: req.PageType,
		Title:    title,
		HeroCopy: heroCopy,
		Sections: sections,
		CTA:      cta,
		Microcopy: microcopy,
		Tone:     tone,
		Metadata: MetadataInfo{
			Version:     0, // Will be set by storage.Save()
			GeneratedAt: time.Now().Format(time.RFC3339),
			ContentType: req.PageType,
			WordCount:   wordCount,
			ReadingTime: readingTime,
		},
	}
	
	// PHASE 1.5: Save dengan versioning (tidak overwrite)
	version, err := g.storage.Save(pageID, contentPackage)
	if err != nil {
		log.Printf("[AI GENERATOR V2] WARNING: Failed to save to storage: %v", err)
		// Continue anyway - generation succeeded, storage is optional
		contentPackage.Metadata.Version = 1 // Fallback version
	} else {
		contentPackage.Metadata.Version = version
		log.Printf("[AI GENERATOR V2] Saved to storage: pageId=%s, version=%d, wordCount=%d", pageID, version, wordCount)
	}
	
	// PHASE 3: Emit CONTENT_PRODUCED event
	// PHASE 7A: Include brand context in event
	// PHASE 7B: Include locale context in event
	emitter := GetEventEmitter()
	eventData := map[string]interface{}{
		"brandId": req.BrandContext.BrandID,
		"brandName": req.BrandContext.BrandName,
		"brandSlug": req.BrandContext.BrandSlug,
		"localeId": req.LocaleContext.LocaleID,
		"localeCode": req.LocaleContext.LocaleCode,
		"languageName": req.LocaleContext.LanguageName,
	}
	emitter.EmitContentProducedWithData(pageID, contentPackage.Metadata.Version, req.PageType, eventData)
	log.Printf("[AI GENERATOR V2] Event CONTENT_PRODUCED emitted: pageId=%s, version=%d, brandId=%s, localeId=%s", 
		pageID, contentPackage.Metadata.Version, req.BrandContext.BrandID, req.LocaleContext.LocaleID)
	
	return &GenerationResult{
		Package: contentPackage,
		Status:  "SUCCESS",
	}, nil
}

// generateMainNarrative generates the main long-form content
// PHASE 1.3: Generate isi panjang (artikel / copy)
// NO truncate, NO "kalau gagal, potong"
func (g *Generator) generateMainNarrative(req GenerationRequest) (string, error) {
	log.Println("[AI GENERATOR V2] Generating main narrative...")
	
	basePrompt := g.buildNarrativePrompt(req)

	// PHASE 1.3 LAUNCH MODE HARD REQUIREMENT:
	// Content MUST be >= 800 words. Retry a few times with stronger instruction.
	const minWords = 800
	const maxAttempts = 5
	lastWordCount := 0
	draft := ""

	for attempt := 1; attempt <= maxAttempts; attempt++ {
		prompt := basePrompt
		if attempt > 1 && draft != "" {
			// Expand the previous draft instead of regenerating from scratch.
			// This tends to be much more reliable to hit minimum word count.
			prompt = fmt.Sprintf(`You are given a DRAFT article.
Your task is to EXPAND it into a complete long-form article with at least %d words.

Rules:
- Output MUST be >= %d words (hard minimum).
- Keep the same topic and language.
- Add new sections, examples, and deeper explanations.
- Do NOT shorten. Do NOT summarize. Do NOT output an outline only.
- Output the FULL expanded article text (not a diff).

DRAFT:
%s
`, minWords+400, minWords, draft)
		} else if attempt > 1 {
			// Fallback if no draft captured for some reason.
			prompt = fmt.Sprintf("%s\n\nCRITICAL RETRY:\n- Your previous output was %d words.\n- You MUST output at least %d words.\n- Expand with deeper explanations, concrete examples, and additional sections.\n- Do NOT summarize.\n",
				basePrompt, lastWordCount, minWords+400)
		}

		// Call AI API
		// Keep within common 8k context models (prompt + completion).
		content, err := g.callAI(prompt, 6000)
		if err != nil {
			return "", fmt.Errorf("AI API call failed: %w", err)
		}

		draft = content
		lastWordCount = countWords(content)
		log.Printf("[AI GENERATOR V2] Main narrative generated: attempt=%d, chars=%d, words=%d", attempt, len(content), lastWordCount)

		if lastWordCount >= minWords {
			return content, nil
		}
	}

	return "", fmt.Errorf("generated content too short: %d words (<%d) after %d attempts", lastWordCount, minWords, maxAttempts)
}

// generateStructure breaks content into sections with headings
// PHASE 1.3: Generate struktur logika
func (g *Generator) generateStructure(mainContent string, req GenerationRequest) ([]ContentSection, error) {
	log.Println("[AI GENERATOR V2] Generating structure...")
	
	prompt := fmt.Sprintf(`Break down the following content into logical sections with headings.

Content:
%s

Requirements:
- Minimum 2 sections
- Maximum 10 sections
- Each section should have a clear heading (H2 or H3)
- Sections should be logically organized
- Return as JSON array with: heading, headingLevel (2 or 3), body, order

Topic: %s
Page Type: %s`, mainContent, req.Topic, req.PageType)
	
	// Call AI API
	response, err := g.callAI(prompt, 2000)
	if err != nil {
		return nil, fmt.Errorf("AI API call failed: %w", err)
	}
	
	// Parse JSON response
	var sections []ContentSection
	if err := json.Unmarshal([]byte(response), &sections); err != nil {
		// If JSON parsing fails, create default structure
		log.Printf("[AI GENERATOR V2] JSON parsing failed, creating default structure: %v", err)
		sections = g.createDefaultStructure(mainContent)
	}
	
	return sections, nil
}

// generateTitleAndHero generates title and hero copy
func (g *Generator) generateTitleAndHero(req GenerationRequest, mainContent string) (string, string, error) {
	log.Println("[AI GENERATOR V2] Generating title and hero...")
	
	prompt := fmt.Sprintf(`Generate a title and hero copy for the following content.

Content:
%s

Requirements:
- Title: 10-100 characters, engaging and clear
- Hero Copy: 50-300 characters, compelling lead paragraph
- Language: %s
- Topic: %s

Return as JSON: {"title": "...", "heroCopy": "..."}`, mainContent, req.Language, req.Topic)
	
	response, err := g.callAI(prompt, 500)
	if err != nil {
		return "", "", fmt.Errorf("AI API call failed: %w", err)
	}
	
	// Parse JSON
	var result struct {
		Title    string `json:"title"`
		HeroCopy string `json:"heroCopy"`
	}
	if err := json.Unmarshal([]byte(response), &result); err != nil {
		// Fallback: create simple title and hero
		title := req.Topic
		if len(title) > 100 {
			title = title[:97] + "..."
		}
		heroCopy := fmt.Sprintf("Pelajari tentang %s dengan panduan lengkap dan informatif.", req.Topic)
		return title, heroCopy, nil
	}
	
	return result.Title, result.HeroCopy, nil
}

// generateCTA generates call-to-action
// PHASE 1.4: Content Composer - AI melengkapi dirinya sendiri
func (g *Generator) generateCTA(req GenerationRequest) (CTAInfo, error) {
	log.Println("[AI GENERATOR V2] Generating CTA...")
	
	// Determine CTA based on page type
	var cta CTAInfo
	switch req.PageType {
	case "blog":
		cta = CTAInfo{
			Text:     "Pelajari Lebih Lanjut",
			Action:   "learn",
			Placement: "bottom",
		}
	case "product":
		cta = CTAInfo{
			Text:     "Hubungi Kami",
			Action:   "contact",
			Placement: "both",
		}
	case "category":
		cta = CTAInfo{
			Text:     "Lihat Produk",
			Action:   "browse",
			Placement: "inline",
		}
	default:
		cta = CTAInfo{
			Text:     "Pelajari Lebih Lanjut",
			Action:   "learn",
			Placement: "bottom",
		}
	}
	
	return cta, nil
}

// generateMicrocopy generates supporting microcopy
// PHASE 1.4: Content Composer - AI melengkapi dirinya sendiri
func (g *Generator) generateMicrocopy(req GenerationRequest, mainContent string, sections []ContentSection) (MicrocopyInfo, error) {
	log.Println("[AI GENERATOR V2] Generating microcopy...")
	
	wordCount := countWords(mainContent)
	readingTime := calculateReadingTime(wordCount)
	
	microcopy := MicrocopyInfo{
		ReadingTime: fmt.Sprintf("%d menit membaca", readingTime),
		LastUpdated: time.Now().Format("2 Jan 2006"),
		Tags:        []string{req.Topic},
	}
	
	return microcopy, nil
}

// determineTone determines content tone
// PHASE 1.3: Generate tone konsisten
func (g *Generator) determineTone(req GenerationRequest) ToneInfo {
	tone := ToneInfo{
		Style:         "informative",
		Formality:     "semi-formal",
		TargetAudience: req.TargetAudience,
	}
	
	if req.Tone != "" {
		// Use provided tone override
		tone.Style = req.Tone
	}
	
	return tone
}

// buildNarrativePrompt builds the prompt for main narrative generation
// PHASE 7A: Brand-aware prompt generation
// PHASE 7B: Language-aware prompt generation
// B1. System Prompt (DIKUNCI) - Tambahkan constraint eksplisit
func (g *Generator) buildNarrativePrompt(req GenerationRequest) string {
	var prompt strings.Builder
	
	// B1. System Prompt Constraint
	prompt.WriteString("You are answering real human questions for search results.\n")
	prompt.WriteString("Answer directly, clearly, and naturally.\n")
	prompt.WriteString("Avoid filler phrases, marketing language, or academic tone.\n")
	prompt.WriteString("Each answer must stand alone.\n\n")
	prompt.WriteString("❌ Jangan sebut:\n")
	prompt.WriteString("- \"Artikel ini akan membahas…\"\n")
	prompt.WriteString("- \"Di era modern…\"\n")
	prompt.WriteString("- \"Penting untuk diketahui…\"\n\n")
	
	prompt.WriteString(fmt.Sprintf("Generate comprehensive, long-form content about: %s\n\n", req.Topic))
	prompt.WriteString(fmt.Sprintf("Page Type: %s\n", req.PageType))
	
	// PHASE 7B: Use locale context instead of deprecated Language field
	if req.LocaleContext != nil {
		prompt.WriteString(fmt.Sprintf("Language: %s (%s)\n", req.LocaleContext.LanguageName, req.LocaleContext.LocaleCode))
		prompt.WriteString(fmt.Sprintf("Locale: %s\n", req.LocaleContext.LocaleCode))
	} else {
		// Fallback to deprecated Language field
		prompt.WriteString(fmt.Sprintf("Language: %s\n", req.Language))
	}
	
	prompt.WriteString(fmt.Sprintf("Target Audience: %s\n", req.TargetAudience))
	
	// PHASE 7A: Include brand context in prompt
	if req.BrandContext != nil {
		prompt.WriteString(fmt.Sprintf("\nBrand Context:\n"))
		prompt.WriteString(fmt.Sprintf("- Brand Name: %s\n", req.BrandContext.BrandName))
		prompt.WriteString(fmt.Sprintf("- Brand Identity: Write content that reflects %s's brand values and tone\n", req.BrandContext.BrandName))
		prompt.WriteString(fmt.Sprintf("- Brand Voice: Use language and style consistent with %s brand identity\n", req.BrandContext.BrandName))
		prompt.WriteString("- IMPORTANT: This content is exclusive to this brand. Do not reference or reuse content from other brands.\n")
	}
	
	// PHASE 7B: Include locale context in prompt
	if req.LocaleContext != nil {
		prompt.WriteString(fmt.Sprintf("\nLocale Context:\n"))
		prompt.WriteString(fmt.Sprintf("- Language: %s (%s)\n", req.LocaleContext.LanguageName, req.LocaleContext.LocaleCode))
		prompt.WriteString(fmt.Sprintf("- Write in native %s, NOT translated content\n", req.LocaleContext.LanguageName))
		prompt.WriteString(fmt.Sprintf("- Use natural %s expressions, idioms, and cultural context\n", req.LocaleContext.LanguageName))
		prompt.WriteString("- IMPORTANT: Generate original content in this language. Do NOT translate from other languages.\n")
		prompt.WriteString("- CRITICAL: This is a NEW VERSION for this locale. Do not reuse content from other locales.\n")
	}
	
	if req.Outline != "" {
		prompt.WriteString(fmt.Sprintf("\nFollow this outline:\n%s\n\n", req.Outline))
	}
	
	prompt.WriteString("\nRequirements:\n")
	prompt.WriteString("- Generate comprehensive, detailed content (800-1500 words)\n")
	prompt.WriteString("- Use clear, engaging language\n")
	prompt.WriteString("- Include relevant information and examples\n")
	prompt.WriteString("- Structure content logically with headings\n")
	prompt.WriteString("- NO promotional language, NO sales CTA in body\n")
	prompt.WriteString("- NO keyword stuffing\n")
	prompt.WriteString("- Write naturally and informatively\n")
	
	// PHASE 7A: Brand isolation requirement
	if req.BrandContext != nil {
		prompt.WriteString("- CRITICAL: This content is for brand " + req.BrandContext.BrandName + " only. Do not mix or reference other brands.\n")
	}
	
	// PHASE 7B: Locale isolation requirement
	if req.LocaleContext != nil {
		prompt.WriteString(fmt.Sprintf("- CRITICAL: This content is for locale %s (%s) only. Do not translate or reuse content from other locales.\n", 
			req.LocaleContext.LocaleCode, req.LocaleContext.LanguageName))
	}
	
	return prompt.String()
}

// callAI calls the AI API
// PHASE 1.3: NO SEO, NO VALIDATOR - Pure AI generation
func (g *Generator) callAI(prompt string, maxTokens int) (string, error) {
	log.Printf("[AI GENERATOR V2] Calling AI API: prompt length=%d, maxTokens=%d", len(prompt), maxTokens)
	
	// Build request payload (OpenAI Chat Completions format)
	// A2. Parameter Stabil (ANTI OVER-GENERATE)
	// temperature=0.4, top_p=0.85, presence_penalty=0.1, frequency_penalty=0.2
	payload := map[string]interface{}{
		"model": g.model,
		"messages": []map[string]string{
			{
				"role":    "user",
				"content": prompt,
			},
		},
		"max_tokens":        maxTokens,
		"temperature":       0.4,  // A2: Konservatif & stabil
		"top_p":            0.85, // A2: Stabil (hindari over-creativity)
		"presence_penalty": 0.1,  // A2: Minim repetisi
		"frequency_penalty": 0.2,  // A2: Tidak "puitis AI"
	}
	
	jsonData, err := json.Marshal(payload)
	if err != nil {
		return "", fmt.Errorf("failed to marshal request: %w", err)
	}
	
	req, err := http.NewRequest("POST", g.apiURL, strings.NewReader(string(jsonData)))
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
	
	// Parse response
	var apiResponse struct {
		Choices []struct {
			Message struct {
				Content string `json:"content"`
			} `json:"message"`
		} `json:"choices"`
	}
	
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("failed to read response: %w", err)
	}
	
	if err := json.Unmarshal(body, &apiResponse); err != nil {
		// If parsing fails, try to extract content directly
		log.Printf("[AI GENERATOR V2] JSON parsing failed, trying direct extraction: %v", err)
		// Fallback: return raw body
		return string(body), nil
	}
	
	if len(apiResponse.Choices) == 0 {
		return "", fmt.Errorf("no choices in API response")
	}
	
	content := apiResponse.Choices[0].Message.Content
	log.Printf("[AI GENERATOR V2] API response received: %d chars", len(content))
	
	return content, nil
}

// createDefaultStructure creates a default structure if AI parsing fails
func (g *Generator) createDefaultStructure(content string) []ContentSection {
	// Split content by paragraphs and create sections
	paragraphs := strings.Split(content, "\n\n")
	sections := []ContentSection{}
	
	for i, para := range paragraphs {
		if strings.TrimSpace(para) == "" {
			continue
		}
		
		// Extract heading if present
		heading := ""
		body := para
		if strings.HasPrefix(para, "# ") {
			lines := strings.Split(para, "\n")
			heading = strings.TrimPrefix(lines[0], "# ")
			if len(lines) > 1 {
				body = strings.Join(lines[1:], "\n")
			}
		} else if strings.HasPrefix(para, "## ") {
			lines := strings.Split(para, "\n")
			heading = strings.TrimPrefix(lines[0], "## ")
			if len(lines) > 1 {
				body = strings.Join(lines[1:], "\n")
			}
		}
		
		if heading == "" {
			heading = fmt.Sprintf("Section %d", i+1)
		}
		
		sections = append(sections, ContentSection{
			Heading:     heading,
			HeadingLevel: 2,
			Body:        body,
			Order:       i + 1,
		})
	}
	
	return sections
}

// Helper functions
func countWords(text string) int {
	words := strings.Fields(text)
	return len(words)
}

func calculateReadingTime(wordCount int) int {
	// Average reading speed: 200 words per minute
	readingTime := wordCount / 200
	if readingTime < 1 {
		return 1
	}
	return readingTime
}

// generatePageID generates a normalized page_id from topic and page type
func generatePageID(topic string, pageType string) string {
	// Normalize topic to create page_id
	// Remove special characters, convert to lowercase, replace spaces with hyphens
	normalized := strings.ToLower(topic)
	normalized = strings.ReplaceAll(normalized, " ", "-")
	normalized = strings.ReplaceAll(normalized, "_", "-")
	
	// Remove special characters (keep only alphanumeric and hyphens)
	var result strings.Builder
	for _, r := range normalized {
		if (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') || r == '-' {
			result.WriteRune(r)
		}
	}
	
	pageID := result.String()
	
	// Add page type prefix if needed
	if pageType != "" {
		pageID = fmt.Sprintf("%s-%s", pageType, pageID)
	}
	
	// Limit length
	if len(pageID) > 100 {
		pageID = pageID[:100]
	}
	
	return pageID
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}
