package content

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"strings"
	"time"
	"unicode"
)

// ContentRequest represents the request for content generation
type ContentRequest struct {
	ContentType ContentType `json:"contentType"` // CORNERSTONE | DERIVATIVE | DERIVATIVE_LONG | USE_CASE
	Category    string     `json:"category"`    // K1, K2, K3, K4
	Outline     string     `json:"outline"`     // LOCKED - outline yang harus diikuti
	Language    string     `json:"language"`    // id-ID
	// AI Generator v2 fields
	AnswerDriven bool     `json:"answerDriven,omitempty"` // v2: Answer-driven writing mode
	Intent       string   `json:"intent,omitempty"`       // v2: informational, how_to, commercial, comparison
	Questions    []string `json:"questions,omitempty"`    // v2: Core questions for answer-driven writing
}

// ContentResult represents the raw AI-generated content
type ContentResult struct {
	Title      string `json:"title"`
	Body       string `json:"body"`
	MetaTitle  string `json:"metaTitle"`
	MetaDesc   string `json:"metaDesc"`
	Status     string `json:"status"` // RAW_AI
}

// Generator handles AI content generation
type Generator struct {
	client     *http.Client
	apiKey     string
	apiURL     string
	model      string
}

// NewGenerator creates a new content generator
func NewGenerator() *Generator {
	log.Println("[GENERATOR] Creating new content generator...")
	// Get API key from environment (OpenAI, Claude, or other)
	apiKey := os.Getenv("OPENAI_API_KEY")
	if apiKey == "" {
		apiKey = os.Getenv("AI_API_KEY")
	}
	log.Printf("[GENERATOR] API key loaded: present=%v, length=%d", apiKey != "", len(apiKey))

	// TASK 19: Use Responses API (WAJIB)
	apiURL := os.Getenv("AI_API_URL")
	if apiURL == "" {
		apiURL = "https://api.openai.com/v1/responses" // TASK 19: Responses API endpoint
	}

	// A1. Lock Model ke GPT-5.2 (WAJIB - NO FALLBACK)
	// ❌ Jangan pakai fallback otomatis ke model lama
	// ➡️ Jika GPT-5.2 unavailable → return error, bukan downgrade diam-diam
	model := os.Getenv("AI_MODEL")
	if model == "" {
		model = "gpt-5.2" // Default to GPT-5.2
	}
	if model != "gpt-5.2" {
		log.Printf("[GENERATOR] WARNING: Model is set to %s, but GPT-5.2 is required. Forcing GPT-5.2.", model)
		model = "gpt-5.2"
	}
	log.Printf("[AI MODEL LOCKED] %s (NO FALLBACK)", model)

	return &Generator{
		client: &http.Client{
			Timeout: 60 * time.Second, // 60 second timeout for AI generation
		},
		apiKey: apiKey,
		apiURL: apiURL,
		model:  model,
	}
}

// Generate produces raw AI content based on the request
// TASK 4: Implements retry loop with word count validation (min 900 words)
// This function only generates content, does NOT publish
func (g *Generator) Generate(req ContentRequest) (*ContentResult, error) {
	log.Println("[AI] Starting content generation...")
	log.Printf("[AI] API Key present: %v (length: %d)", g.apiKey != "", len(g.apiKey))
	
	if g.apiKey == "" {
		log.Println("[AI] ERROR: API key is empty!")
		return nil, fmt.Errorf("AI_API_KEY or OPENAI_API_KEY environment variable not set")
	}

	// Validate request
	if err := validateRequest(req); err != nil {
		return nil, fmt.Errorf("invalid request: %w", err)
	}

	// TASK 4: Retry loop for long-form articles (DERIVATIVE_LONG)
	if req.ContentType == ContentDerivativeLong || req.ContentType == ContentCornerstone {
		return g.GenerateWithRetry(req)
	}

	// For other content types, use standard generation (no retry)
	// Build prompt based on content type and outline
	log.Println("[AI] Building prompt...")
	prompt := g.buildPrompt(req)
	log.Printf("[AI] Prompt built, length: %d chars", len(prompt))

	// Determine max_tokens based on content type
	maxTokens := 4000

	// Call AI model
	log.Println("[AI] Calling OpenAI API...")
	log.Printf("[AI MODEL LOCKED] %s", g.model)
	log.Printf("[AI] API URL: %s", g.apiURL)
	log.Printf("[AI] Max tokens: %d (contentType: %s)", maxTokens, req.ContentType)
	rawContent, usage, err := g.callAI(prompt, maxTokens)
	if err != nil {
		log.Printf("[AI] OpenAI API call failed: %v", err)
		return nil, fmt.Errorf("AI generation failed: %w", err)
	}
	log.Printf("[AI] OpenAI response received, length: %d chars", len(rawContent))
	if usage != nil && usage.OutputTokens > 0 {
		log.Printf("[AI] Token usage: output_tokens=%d", usage.OutputTokens)
	}

	// Parse AI response into structured content
	result := g.parseResponse(rawContent, req)

	// KONTRAK FINAL: Validate output contract (FAIL HARD if invalid)
	if err := ValidateOutputContract(result); err != nil {
		log.Printf("[AI] Output contract validation failed: %v", err)
		return nil, fmt.Errorf("output contract validation failed: %w", err)
	}

	// KONTRAK FINAL: Validate output structure
	if err := ValidateOutputStructure(result); err != nil {
		log.Printf("[AI] Output structure validation failed: %v", err)
		return nil, fmt.Errorf("output structure validation failed: %w", err)
	}

	return result, nil
}

// GenerateWithRetry implements TASK 4: Retry loop with word count validation
// Minimum 900 words, maximum 3 retries
func (g *Generator) GenerateWithRetry(req ContentRequest) (*ContentResult, error) {
	const (
		MinWords = 900
		MaxRetry = 3
	)

	// Build initial prompt
	prompt := g.buildPrompt(req)
	log.Printf("[AI] Initial prompt built, length: %d chars", len(prompt))

	// TASK 16: MaxOutputTokens for GPT-5.2
	maxTokens := 4096 // Bisa dinaikkan ke 6000 jika perlu

	var result *ContentResult
	var lastErr error

	for attempt := 1; attempt <= MaxRetry; attempt++ {
		log.Printf("[AI] Attempt %d/%d for content generation", attempt, MaxRetry)
		log.Printf("[AI MODEL LOCKED] %s", g.model)
		log.Printf("[AI] API URL: %s", g.apiURL)
		log.Printf("[AI] Max tokens: %d", maxTokens)

		// Call AI model
		rawContent, usage, err := g.callAI(prompt, maxTokens)
		if err != nil {
			log.Printf("[AI] Attempt %d failed: %v", attempt, err)
			lastErr = err
			if attempt == MaxRetry {
				return nil, fmt.Errorf("AI generation failed after %d attempts: %w", MaxRetry, err)
			}
			// Continue to next attempt
			continue
		}

		log.Printf("[AI] Attempt %d: OpenAI response received, length: %d chars", attempt, len(rawContent))
		if usage != nil && usage.OutputTokens > 0 {
			log.Printf("[AI] Attempt %d: Token usage: output_tokens=%d", 
				attempt, usage.OutputTokens)
		}

		// Parse AI response into structured content
		result = g.parseResponse(rawContent, req)

		// KONTRAK FINAL: Validate output contract (FAIL HARD if invalid)
		if err := ValidateOutputContract(result); err != nil {
			log.Printf("[AI] Attempt %d: Output contract validation failed: %v", attempt, err)
			lastErr = fmt.Errorf("output contract validation failed: %w", err)
			if attempt == MaxRetry {
				return nil, lastErr
			}
			continue
		}

		// KONTRAK FINAL: Validate output structure
		if err := ValidateOutputStructure(result); err != nil {
			log.Printf("[AI] Attempt %d: Output structure validation failed: %v", attempt, err)
			lastErr = fmt.Errorf("output structure validation failed: %w", err)
			if attempt == MaxRetry {
				return nil, lastErr
			}
			continue
		}

		// TASK 4: Check word count (minimum 900 words)
		fullText := result.Title + " " + result.Body
		wc := countWordsInText(fullText)
		log.Printf("[AI] Attempt %d: word count = %d (min: %d)", attempt, wc, MinWords)

		// TASK 9 & 18: Log words and tokens together
		if usage != nil && usage.OutputTokens > 0 {
			log.Printf("[AI RESULT] words=%d tokens=%d", wc, usage.OutputTokens)
			log.Printf("[AI USAGE] output=%d", usage.OutputTokens)
		}

		if wc >= MinWords {
			log.Printf("[AI] Success: word count %d >= %d", wc, MinWords)
			return result, nil
		}

		// Word count below minimum - strengthen prompt for retry
		if attempt < MaxRetry {
			log.Printf("[AI] Word count below minimum (%d < %d), strengthening prompt for retry", wc, MinWords)
			prompt += "\n\nContinue writing. Expand all sections with deeper explanation and examples. Do not summarize."
		}
	}

	// All retries exhausted
	if result != nil {
		fullText := result.Title + " " + result.Body
		wc := countWordsInText(fullText)
		return nil, fmt.Errorf("WORD_COUNT_MINIMUM_FAILED: word count %d < %d after %d attempts", wc, MinWords, MaxRetry)
	}

	if lastErr != nil {
		return nil, fmt.Errorf("AI generation failed after %d attempts: %w", MaxRetry, lastErr)
	}

	return nil, fmt.Errorf("WORD_COUNT_MINIMUM_FAILED: failed to generate content with minimum word count after %d attempts", MaxRetry)
}

// GenerateLongFormArticle generates a long-form article with retry logic
// Implements hard-constraint prompt with minimum 900 words requirement
// Retries up to 3 times if word count is below minimum
func (g *Generator) GenerateLongFormArticle(ctx context.Context, topic string) (string, int, error) {
	const (
		MinWords = 900
		MaxRetry = 3
	)

	// Build hard-constraint prompt
	prompt := g.buildHardConstraintPrompt(topic)
	var content string
	var wc int

	for attempt := 1; attempt <= MaxRetry; attempt++ {
		log.Printf("[LONG-FORM] Attempt %d/%d for topic: %s", attempt, MaxRetry, topic)
		log.Printf("[AI MODEL LOCKED] %s", g.model)

		// TASK 16: MaxOutputTokens for GPT-5.2
		maxTokens := 4096 // Bisa dinaikkan ke 6000 jika perlu

		// Call AI model
		rawContent, usage, err := g.callAI(prompt, maxTokens)
		if err != nil {
			log.Printf("[LONG-FORM] Attempt %d failed: %v", attempt, err)
			if attempt == MaxRetry {
				return "", 0, fmt.Errorf("AI generation failed after %d attempts: %w", MaxRetry, err)
			}
			// Continue to next attempt
			continue
		}

		// Parse response to extract body content
		result := g.parseResponse(rawContent, ContentRequest{
			ContentType: ContentDerivativeLong,
			Category:    "K1",
			Language:    "id",
		})

		// Combine title and body for word count
		fullText := result.Title + " " + result.Body
		wc = countWordsInText(fullText)

		log.Printf("[LONG-FORM] Attempt %d: word count = %d (min: %d)", attempt, wc, MinWords)

		// TASK 9 & 18: Log words and tokens together
		if usage != nil && usage.OutputTokens > 0 {
			log.Printf("[AI RESULT] words=%d tokens=%d", wc, usage.OutputTokens)
			log.Printf("[AI USAGE] output=%d", usage.OutputTokens)
		}

		if wc >= MinWords {
			log.Printf("[LONG-FORM] Success: word count %d >= %d", wc, MinWords)
			// Return full markdown content
			content = result.Body
			if result.Title != "" {
				content = "# " + result.Title + "\n\n" + content
			}
			return content, wc, nil
		}

		// Word count below minimum - strengthen prompt for retry
		if attempt < MaxRetry {
			log.Printf("[LONG-FORM] Word count below minimum (%d < %d), strengthening prompt for retry", wc, MinWords)
			prompt += "\n\nContinue writing. Expand every section with deeper explanation, examples, and details. Do not summarize. Ensure the article reaches at least 900 words."
		}
	}

	// All retries exhausted
	return content, wc, fmt.Errorf(
		"VALIDATION_FAILED: WORD_COUNT_MINIMUM (%d < %d) after %d attempts",
		wc, MinWords, MaxRetry,
	)
}

// buildHardConstraintPrompt builds the production-grade hard-constraint prompt
// TASK 3: GANTI TOTAL - Hard constraint prompt
func (g *Generator) buildHardConstraintPrompt(topic string) string {
	var promptBuilder strings.Builder

	promptBuilder.WriteString("You are a professional agricultural content writer.\n\n")
	promptBuilder.WriteString("ABSOLUTE RULES:\n")
	promptBuilder.WriteString("- Write in Indonesian\n")
	promptBuilder.WriteString("- Minimum 900 words (ABSOLUTE MINIMUM)\n")
	promptBuilder.WriteString("- Target 1200–1500 words\n")
	promptBuilder.WriteString("- Use H2 and H3 headings\n")
	promptBuilder.WriteString("- Each H2 section must have at least 3 paragraphs\n")
	promptBuilder.WriteString("- Each paragraph must be 3–5 sentences\n")
	promptBuilder.WriteString("- DO NOT STOP EARLY\n")
	promptBuilder.WriteString("- DO NOT give short answers\n")
	promptBuilder.WriteString("- If word count is below minimum, CONTINUE WRITING\n\n")
	promptBuilder.WriteString("STRUCTURE:\n")
	promptBuilder.WriteString("- Introduction (2–3 paragraphs)\n")
	promptBuilder.WriteString("- 5–7 H2 sections with H3 subsections\n")
	promptBuilder.WriteString("- Practical examples\n")
	promptBuilder.WriteString("- Actionable tips\n")
	promptBuilder.WriteString("- Conclusion (2 paragraphs)\n\n")
	promptBuilder.WriteString("IMPORTANT:\n")
	promptBuilder.WriteString("If you reach output limits, CONTINUE writing until minimum word count is reached.\n\n")
	promptBuilder.WriteString(fmt.Sprintf("TOPIC: %s\n\n", topic))
	promptBuilder.WriteString("OUTPUT FORMAT (JSON):\n")
	promptBuilder.WriteString(`{
  "title": "Judul artikel (H1)",
  "body": "Isi artikel lengkap dengan MARKDOWN headings (## untuk H2, ### untuk H3). WAJIB menggunakan ## untuk setiap H2 section dan ### untuk setiap H3 subsection."
}`)
	promptBuilder.WriteString("\n\n")
	promptBuilder.WriteString("PENTING: Field 'body' HARUS menggunakan format markdown:\n")
	promptBuilder.WriteString("- ## untuk H2 (section utama)\n")
	promptBuilder.WriteString("- ### untuk H3 (subsection)\n")
	promptBuilder.WriteString("- JANGAN gunakan HTML headings (<h2>, <h3>)\n")
	promptBuilder.WriteString("- JANGAN gunakan plain text tanpa headings\n\n")

	// TASK 30: OUTPUT CONTRACT (MANDATORY) - Ini KRITIKAL
	promptBuilder.WriteString("OUTPUT CONTRACT (MANDATORY):\n")
	promptBuilder.WriteString("- Return FULL ARTICLE TEXT ONLY\n")
	promptBuilder.WriteString("- Do not summarize\n")
	promptBuilder.WriteString("- Do not shorten\n")
	promptBuilder.WriteString("- Do not explain what you are doing\n")
	promptBuilder.WriteString("- Do not ask questions\n")
	promptBuilder.WriteString("- Write continuously until minimum word count is reached\n")

	return promptBuilder.String()
}

// countWordsInText counts words in text (Indonesian-aware, same as validator)
func countWordsInText(text string) int {
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
	text = strings.ReplaceAll(text, "#", "")
	text = strings.ReplaceAll(text, "##", "")
	text = strings.ReplaceAll(text, "###", "")
	// Remove bold/italic
	text = strings.ReplaceAll(text, "**", "")
	text = strings.ReplaceAll(text, "*", "")
	text = strings.ReplaceAll(text, "__", "")
	text = strings.ReplaceAll(text, "_", "")
	// Remove links
	text = strings.ReplaceAll(text, "[", "")
	text = strings.ReplaceAll(text, "]", "")
	text = strings.ReplaceAll(text, "(", "")
	text = strings.ReplaceAll(text, ")", "")
	return text
}

// validateRequest validates the content request
func validateRequest(req ContentRequest) error {
	// STEP 4: Log untuk memastikan request masuk ke path yang benar
	log.Printf("[VALIDATION] contentType=%s (%T)", req.ContentType, req.ContentType)
	
	if req.ContentType == "" {
		return fmt.Errorf("contentType is required")
	}

	if !IsValidContentType(req.ContentType) {
		return fmt.Errorf("invalid contentType: %s", req.ContentType)
	}

	if req.Category == "" {
		return fmt.Errorf("category is required")
	}

	validCategories := map[string]bool{
		"K1": true,
		"K2": true,
		"K3": true,
		"K4": true,
	}
	if !validCategories[req.Category] {
		return fmt.Errorf("invalid category: %s (must be K1, K2, K3, or K4)", req.Category)
	}

	if req.Outline == "" {
		return fmt.Errorf("outline is required and must be LOCKED")
	}

	if req.Language == "" {
		return fmt.Errorf("language is required")
	}

	return nil
}

// buildPrompt constructs the AI prompt based on request parameters
func (g *Generator) buildPrompt(req ContentRequest) string {
	var promptBuilder strings.Builder

	// B1. System Prompt (DIKUNCI) - Tambahkan constraint eksplisit
	promptBuilder.WriteString("You are answering real human questions for search results.\n")
	promptBuilder.WriteString("Answer directly, clearly, and naturally.\n")
	promptBuilder.WriteString("Avoid filler phrases, marketing language, or academic tone.\n")
	promptBuilder.WriteString("Each answer must stand alone.\n\n")
	promptBuilder.WriteString("❌ Jangan sebut:\n")
	promptBuilder.WriteString("- \"Artikel ini akan membahas…\"\n")
	promptBuilder.WriteString("- \"Di era modern…\"\n")
	promptBuilder.WriteString("- \"Penting untuk diketahui…\"\n\n")
	
	// System instruction
	promptBuilder.WriteString("Anda adalah penulis konten ahli untuk platform pertanian. ")
	promptBuilder.WriteString("Tulis konten yang informatif, natural, dan mengikuti outline yang diberikan.\n\n")

	// Content type instructions
	switch req.ContentType {
	case ContentCornerstone:
		promptBuilder.WriteString("Tipe: CORNERSTONE CONTENT\n")
		promptBuilder.WriteString("Konten harus komprehensif, mendalam, dan authoritative.\n\n")
	case ContentDerivative:
		promptBuilder.WriteString("Tipe: DERIVATIVE CONTENT\n")
		promptBuilder.WriteString("Konten harus fokus pada topik spesifik yang terkait dengan konten utama.\n")
		promptBuilder.WriteString("Gaya: informatif, alur natural seperti manusia, non-promosi.\n\n")
	case ContentDerivativeLong:
		// AI Generator v2: Answer-Driven Writing (NO WORD COUNT) - TUNING v2
		if req.AnswerDriven && len(req.Questions) > 0 {
			promptBuilder.WriteString("AI GENERATOR v2: ANSWER-DRIVEN WRITING MODE (TUNING v2)\n\n")
			promptBuilder.WriteString("PRINSIP INTI:\n")
			promptBuilder.WriteString("- Artikel = kumpulan jawaban berkualitas, BUKAN karangan panjang\n")
			promptBuilder.WriteString("- Setiap section = jawaban 1 pertanyaan\n")
			promptBuilder.WriteString("- Lulus SEO jika: menjawab cepat, relevan, bisa berdiri sendiri\n")
			promptBuilder.WriteString("- TIDAK ADA word count requirement\n\n")
			promptBuilder.WriteString(fmt.Sprintf("SEARCH INTENT: %s\n\n", req.Intent))
			promptBuilder.WriteString("CORE QUESTIONS (WAJIB DIJAWAB):\n")
			for i, q := range req.Questions {
				promptBuilder.WriteString(fmt.Sprintf("Q%d: %s\n", i+1, q))
			}
			promptBuilder.WriteString("\n")
			promptBuilder.WriteString("B. ANSWER REFINEMENT LAYER (WAJIB):\n")
			promptBuilder.WriteString("Struktur jawaban DIKUNCI:\n")
			promptBuilder.WriteString("1. Kalimat 1: JAWABAN LANGSUNG (langsung ke inti, ≤ 30 kata)\n")
			promptBuilder.WriteString("2. Kalimat 2-4: Penjelasan singkat (konteks, detail penting)\n")
			promptBuilder.WriteString("3. Opsional: Contoh / tips praktis (jika relevan)\n\n")
			promptBuilder.WriteString("❌ TIDAK BOLEH:\n")
			promptBuilder.WriteString("- Opening basa-basi (\"Dalam era modern...\", \"Tidak dapat dipungkiri...\")\n")
			promptBuilder.WriteString("- Paragraf \"AI sounding\" (terlalu formal, generic)\n")
			promptBuilder.WriteString("- Filler phrases (\"sangat penting\", \"di era modern\", \"tidak dapat dipungkiri\")\n")
			promptBuilder.WriteString("- Jawaban yang bisa dipakai di topik apa pun\n\n")
			promptBuilder.WriteString("INSTRUKSI PER PERTANYAAN:\n")
			promptBuilder.WriteString("B2. Section Prompt (PER PERTANYAAN):\n")
			promptBuilder.WriteString("Answer the question directly in the first sentence.\n")
			promptBuilder.WriteString("If the answer is simple, keep it short.\n")
			promptBuilder.WriteString("Do not expand unless it adds clarity.\n\n")
			promptBuilder.WriteString("1. Jawab SETIAP pertanyaan dengan:\n")
			promptBuilder.WriteString("   - JAWABAN LANGSUNG di kalimat pertama (≤ 30 kata)\n")
			promptBuilder.WriteString("   - Lalu penjelasan singkat (2-4 kalimat)\n")
			promptBuilder.WriteString("   - Nada manusia, natural, bukan artikel AI\n")
			promptBuilder.WriteString("   - Tidak mengulang jawaban lain\n")
			promptBuilder.WriteString("2. Format: Gunakan H2 untuk setiap pertanyaan\n")
			promptBuilder.WriteString("3. Panjang: Cukup untuk menjawab (tidak perlu panjang)\n")
			promptBuilder.WriteString("4. QC: Setiap jawaban harus:\n")
			promptBuilder.WriteString("   - Menjawab pertanyaan dengan jelas (kalimat pertama)\n")
			promptBuilder.WriteString("   - Bisa jadi featured snippet\n")
			promptBuilder.WriteString("   - Bisa dibaca terpisah\n")
			promptBuilder.WriteString("   - Tidak terasa promosi atau AI writing\n")
			promptBuilder.WriteString("   - Menyebut konteks nyata (bukan generic)\n\n")
		} else {
			// Legacy format (backward compatibility)
			promptBuilder.WriteString("You are a professional agricultural content writer.\n\n")
			promptBuilder.WriteString("ABSOLUTE RULES:\n")
			promptBuilder.WriteString("- Write in Indonesian\n")
			promptBuilder.WriteString("- Minimum 900 words (ABSOLUTE MINIMUM)\n")
			promptBuilder.WriteString("- Target 1200–1500 words\n")
			promptBuilder.WriteString("- Use H2 and H3 headings\n")
			promptBuilder.WriteString("- Each H2 section must have at least 3 paragraphs\n")
			promptBuilder.WriteString("- Each paragraph must be 3–5 sentences\n")
			promptBuilder.WriteString("- DO NOT STOP EARLY\n")
			promptBuilder.WriteString("- DO NOT give short answers\n")
			promptBuilder.WriteString("- If word count is below minimum, CONTINUE WRITING\n\n")
			promptBuilder.WriteString("STRUCTURE:\n")
			promptBuilder.WriteString("- Introduction (2–3 paragraphs)\n")
			promptBuilder.WriteString("- 5–7 H2 sections with H3 subsections\n")
			promptBuilder.WriteString("- Practical examples\n")
			promptBuilder.WriteString("- Actionable tips\n")
			promptBuilder.WriteString("- Conclusion (2 paragraphs)\n\n")
			promptBuilder.WriteString("IMPORTANT:\n")
			promptBuilder.WriteString("If you reach output limits, CONTINUE writing until minimum word count is reached.\n\n")
			promptBuilder.WriteString("Tipe: DERIVATIVE LONG CONTENT\n")
			promptBuilder.WriteString("Konten dengan struktur CORE + EXTENSION LAYER untuk topical completeness.\n")
			promptBuilder.WriteString("Gaya: informatif, alur natural, non-promosi, SERP-friendly.\n\n")
		}
	case ContentUseCase:
		promptBuilder.WriteString("Tipe: USE_CASE CONTENT\n")
		promptBuilder.WriteString("Konten harus memberikan contoh praktis dan aplikasi nyata.\n\n")
	}

	// Category context
	promptBuilder.WriteString(fmt.Sprintf("Kategori: %s\n", req.Category))
	promptBuilder.WriteString("Platform: Toko Tani Online (agricultural e-commerce)\n\n")

	// Critical: Outline must be followed exactly
	promptBuilder.WriteString("OUTLINE (WAJIB DIIKUTI EKSIS):\n")
	promptBuilder.WriteString(req.Outline)
	promptBuilder.WriteString("\n\n")
	
	// STEP 2: Special instruction for DERIVATIVE_LONG - ensure relationship heading
	// TRIGGER STRUKTURAL: Extension Layer dipicu oleh contentType, BUKAN wordCount
	if req.ContentType == ContentDerivativeLong {
		promptBuilder.WriteString("PENTING UNTUK DERIVATIVE_LONG:\n")
		promptBuilder.WriteString("Pastikan outline mencakup satu bagian yang menjelaskan hubungan atau keterkaitan antar jenis/topik utama, bukan berdiri sendiri.\n")
		promptBuilder.WriteString("Jika outline memuat heading tentang 'Hubungan Antar Jenis' atau serupa, WAJIB diikuti dan ditulis dengan lengkap.\n\n")
		// STEP 4: Instruksi eksplisit 1 baris - Extension Layer WAJIB untuk DERIVATIVE_LONG
		promptBuilder.WriteString("⚠️ TRIGGER STRUKTURAL: Untuk konten DERIVATIVE_LONG, Extension Layer (Q&A kontekstual dan/atau panduan praktis) WAJIB ditambahkan sebagai bagian utama artikel setelah pembahasan inti selesai, bukan tambahan opsional. Ini dipicu oleh tipe konten, bukan jumlah kata.\n\n")
	}

	// Language specification
	promptBuilder.WriteString(fmt.Sprintf("Bahasa: %s\n\n", req.Language))

	// Content requirements
	promptBuilder.WriteString("REQUIREMENTS:\n")
	promptBuilder.WriteString("1. Ikuti outline dengan ketat - setiap heading HARUS sesuai dengan outline\n")
	promptBuilder.WriteString("2. Tulis dalam bahasa Indonesia yang natural\n")
	promptBuilder.WriteString("3. Gunakan 1 H1 untuk judul utama (di field 'title', bukan di body)\n")
	promptBuilder.WriteString("4. Strukturkan body dengan MARKDOWN headings:\n")
	promptBuilder.WriteString("   - Gunakan ## (dua hash) untuk setiap H2 section sesuai outline\n")
	promptBuilder.WriteString("   - Gunakan ### (tiga hash) untuk setiap H3 subsection sesuai outline\n")
	promptBuilder.WriteString("   - JANGAN gunakan HTML tags (<h2>, <h3>)\n")
	promptBuilder.WriteString("   - JANGAN gunakan plain text tanpa headings\n")
	promptBuilder.WriteString("5. Konten harus informatif dan tidak promosional\n")
	promptBuilder.WriteString("6. Jangan gunakan CTA jualan\n")
	promptBuilder.WriteString("7. Jangan menyebut nama merek\n\n")
	
	// Constraint bahasa eksplisit (CTO-approved - untuk menghindari validation errors)
	promptBuilder.WriteString("CONSTRAINT BAHASA (WAJIB DIIKUTI):\n")
	promptBuilder.WriteString("❌ LARANGAN KATA ABSOLUT (JANGAN GUNAKAN):\n")
	promptBuilder.WriteString("   - 'pasti', 'terbukti', 'paling', 'terbaik', '100%'\n")
	promptBuilder.WriteString("   - Klaim absolut lainnya yang tidak dapat dibuktikan\n\n")
	promptBuilder.WriteString("❌ LARANGAN BAHASA PROMOSI (JANGAN GUNAKAN):\n")
	promptBuilder.WriteString("   - 'sangat efektif', 'solusi terbaik', 'tidak diragukan'\n")
	promptBuilder.WriteString("   - Bahasa yang terdengar seperti sales atau marketing\n\n")
	promptBuilder.WriteString("❌ EMPHASIS BERLEBIHAN (SANGAT PENTING):\n")
	promptBuilder.WriteString("   - JANGAN GUNAKAN TANDA SERU (!) SAMA SEKALI, atau maksimal 1 untuk seluruh artikel\n")
	promptBuilder.WriteString("   - Validator akan menolak artikel dengan lebih dari 3 tanda seru\n")
	promptBuilder.WriteString("   - Gunakan titik (.) atau koma (,) untuk mengakhiri kalimat\n")
	promptBuilder.WriteString("   - Jika perlu emphasis, gunakan kata-kata, bukan tanda seru\n\n")
	promptBuilder.WriteString("✅ GAYA YANG DIWAJIBKAN:\n")
	promptBuilder.WriteString("   - Naratif: ceritakan seperti penjelasan manusia berpengalaman\n")
	promptBuilder.WriteString("   - Informatif: fokus pada informasi faktual\n")
	promptBuilder.WriteString("   - Observasional: berdasarkan pengamatan, bukan klaim\n")
	promptBuilder.WriteString("   - Netral: tidak memihak, tidak promosional\n\n")
	promptBuilder.WriteString("✅ FRAMING YANG AMAN (GUNAKAN POLA INI):\n")
	promptBuilder.WriteString("   - 'Dalam praktiknya...'\n")
	promptBuilder.WriteString("   - 'Pada beberapa kondisi...'\n")
	promptBuilder.WriteString("   - 'Berdasarkan pengalaman lapangan...'\n")
	promptBuilder.WriteString("   - 'Umumnya digunakan ketika...'\n")
	promptBuilder.WriteString("   - 'Biasanya terjadi pada...'\n")
	promptBuilder.WriteString("   - 'Dapat membantu dalam situasi...'\n")
	promptBuilder.WriteString("   - Gunakan bahasa yang menunjukkan variasi dan kondisi, bukan absolut\n\n")

	// Natural depth guidance - BASELINE v3.1 untuk DERIVATIVE_LONG dengan EXTENSION LAYER KONTRAKTUAL
	// Extension Layer sebagai SECTION KONTRAKTUAL dengan heading nyata (bukan konsep)
	if req.ContentType == ContentDerivativeLong {
		promptBuilder.WriteString("STRUKTUR KONTEN (DERIVATIVE LONG - BASELINE v3.1 - SECTION KONTRAKTUAL):\n")
		promptBuilder.WriteString("\n1. CORE CONTENT (Isi Utama):\n")
		promptBuilder.WriteString("   - Definisi, penjelasan inti, konteks, implikasi\n")
		promptBuilder.WriteString("   - Bahas setiap subtopik sampai tuntas secara logis sebelum pindah\n")
		promptBuilder.WriteString("   - Ikuti outline dengan ketat\n")
		promptBuilder.WriteString("   - SETELAH semua heading outline selesai, WAJIB tambahkan Extension Layer sebagai section berikutnya\n\n")
		promptBuilder.WriteString("2. EXTENSION LAYER (SECTION KONTRAKTUAL - WAJIB DENGAN HEADING NYATA):\n")
		promptBuilder.WriteString("   ⚠️ EXTENSION LAYER ADALAH KONTRAK STRUKTURAL, BUKAN KONSEP\n")
		promptBuilder.WriteString("   ⚠️ SETELAH semua heading outline selesai, WAJIB tambahkan section dengan heading markdown berikut:\n\n")
		promptBuilder.WriteString("   A. Section WAJIB: ## Pertanyaan yang Sering Diajukan\n")
		promptBuilder.WriteString("      - GUNAKAN HEADING MARKDOWN: ## Pertanyaan yang Sering Diajukan\n")
		promptBuilder.WriteString("      - HARUS ada minimal 4 pertanyaan dengan jawaban\n")
		promptBuilder.WriteString("      - Format: Pertanyaan (bold) + Jawaban lengkap\n")
		promptBuilder.WriteString("      - Pertanyaan yang benar-benar sering ditanyakan pembaca\n")
		promptBuilder.WriteString("      - Jawaban ringkas tapi tuntas, bukan FAQ dangkal\n")
		promptBuilder.WriteString("      - Contoh pertanyaan: 'Apa yang terjadi jika...', 'Kapan sebaiknya...', 'Apakah aman jika...', 'Apa kesalahan umum saat...'\n\n")
		promptBuilder.WriteString("   B. Section OPSIONAL: ## Panduan Praktis / Penerapan (jika relevan)\n")
		promptBuilder.WriteString("      - GUNAKAN HEADING MARKDOWN: ## Panduan Praktis\n")
		promptBuilder.WriteString("      - 4-6 langkah praktis, fokus ke praktik lapangan\n")
		promptBuilder.WriteString("      - Bukan how-to dangkal\n\n")
		promptBuilder.WriteString("   C. Section OPSIONAL: ## Kesalahan Umum / Studi Kasus (jika relevan)\n")
		promptBuilder.WriteString("      - GUNAKAN HEADING MARKDOWN: ## Kesalahan Umum\n")
		promptBuilder.WriteString("      - 3-5 poin berdasarkan logika lapangan\n")
		promptBuilder.WriteString("      - Tanpa klaim berlebihan\n\n")
		promptBuilder.WriteString("\n3. PENUTUP ALAMI:\n")
		promptBuilder.WriteString("   - Ringkasan reflektif, tanpa CTA jualan\n")
		promptBuilder.WriteString("   - Tanpa kesimpulan dipaksakan\n\n")
		promptBuilder.WriteString("KONTRAK STRUKTURAL EXTENSION LAYER (WAJIB UNTUK DERIVATIVE_LONG):\n")
		promptBuilder.WriteString("⚠️ SETELAH semua heading outline selesai, WAJIB tambahkan section dengan heading:\n")
		promptBuilder.WriteString("   ## Pertanyaan yang Sering Diajukan\n")
		promptBuilder.WriteString("⚠️ Section ini HARUS muncul sebagai heading markdown (##) di body artikel\n")
		promptBuilder.WriteString("⚠️ Bukan konsep atau saran, tapi section kontraktual yang WAJIB ada\n")
		promptBuilder.WriteString("⚠️ Minimal 4 pertanyaan dengan jawaban lengkap\n")
		promptBuilder.WriteString("⚠️ JANGAN berhenti sebelum section Extension Layer selesai\n")
		promptBuilder.WriteString("⚠️ Extension Layer adalah bagian struktural artikel, bukan tambahan opsional\n")
		promptBuilder.WriteString("⚠️ Jangan filler, jangan mengulang isi utama\n")
		promptBuilder.WriteString("⚠️ Panjang datang dari nilai tambahan, bukan dari pengulangan\n\n")
	} else if req.ContentType == ContentDerivative {
		promptBuilder.WriteString("PANDUAN PENULISAN (DERIVATIVE - BASELINE v2):\n")
		promptBuilder.WriteString("- Bahas setiap subtopik sampai tuntas secara logis sebelum pindah\n")
		promptBuilder.WriteString("- Jangan memperpanjang demi jumlah kata - jika pembahasan selesai, akhiri secara wajar\n")
		promptBuilder.WriteString("- Hindari ringkasan berulang dan filler yang tidak perlu\n")
		promptBuilder.WriteString("- Gaya informatif, alur natural seperti manusia menulis, non-promosi\n")
		promptBuilder.WriteString("- Fokus pada substansi, bukan panjang konten\n\n")
	} else {
		// Guidance untuk CORNERSTONE (lebih komprehensif)
		promptBuilder.WriteString("KEDALAMAN KONTEN (NATURAL):\n")
		promptBuilder.WriteString("- Untuk setiap bagian, bahas hingga tuntas sebelum berpindah ke bagian berikutnya\n")
		promptBuilder.WriteString("- Sertakan latar belakang konseptual yang relevan untuk membantu pembaca memahami konteks\n")
		promptBuilder.WriteString("- Jelaskan hubungan sebab-akibat ketika relevan\n")
		promptBuilder.WriteString("- Elaborasi konteks yang membantu pemahaman pembaca\n")
		promptBuilder.WriteString("- Hindari ringkasan terlalu cepat - berikan penjelasan yang memadai untuk setiap poin\n")
		promptBuilder.WriteString("- Konten harus komprehensif dan substantif, tanpa filler atau pengulangan yang tidak perlu\n\n")
	}

	// Output format - CRITICAL: Body must contain markdown headings (## and ###)
	promptBuilder.WriteString("OUTPUT FORMAT (JSON):\n")
	promptBuilder.WriteString(`{
  "title": "Judul artikel (H1)",
  "body": "Isi artikel lengkap dengan MARKDOWN headings (## untuk H2, ### untuk H3) sesuai outline. WAJIB menggunakan ## untuk setiap H2 section dan ### untuk setiap H3 subsection.",
  "metaTitle": "Meta title untuk SEO (max 60 karakter)",
  "metaDesc": "Meta description untuk SEO (max 160 karakter)"
}`)
	promptBuilder.WriteString("\n\n")
	promptBuilder.WriteString("PENTING: Field 'body' HARUS menggunakan format markdown:\n")
	promptBuilder.WriteString("- ## untuk H2 (section utama)\n")
	promptBuilder.WriteString("- ### untuk H3 (subsection)\n")
	promptBuilder.WriteString("- JANGAN gunakan HTML headings (<h2>, <h3>)\n")
	promptBuilder.WriteString("- JANGAN gunakan plain text tanpa headings\n\n")

	// TASK 30: OUTPUT CONTRACT (MANDATORY) - Ini KRITIKAL
	promptBuilder.WriteString("OUTPUT CONTRACT (MANDATORY):\n")
	promptBuilder.WriteString("- Return FULL ARTICLE TEXT ONLY\n")
	promptBuilder.WriteString("- Do not summarize\n")
	promptBuilder.WriteString("- Do not shorten\n")
	promptBuilder.WriteString("- Do not explain what you are doing\n")
	promptBuilder.WriteString("- Do not ask questions\n")
	promptBuilder.WriteString("- Write continuously until minimum word count is reached\n")

	return promptBuilder.String()
}

// GetBasePrompt returns the base prompt template (for prompt refinement system)
func (g *Generator) GetBasePrompt() string {
	var promptBuilder strings.Builder
	
	// B1. System Prompt (DIKUNCI) - Tambahkan constraint eksplisit
	promptBuilder.WriteString("You are answering real human questions for search results.\n")
	promptBuilder.WriteString("Answer directly, clearly, and naturally.\n")
	promptBuilder.WriteString("Avoid filler phrases, marketing language, or academic tone.\n")
	promptBuilder.WriteString("Each answer must stand alone.\n\n")
	promptBuilder.WriteString("❌ Jangan sebut:\n")
	promptBuilder.WriteString("- \"Artikel ini akan membahas…\"\n")
	promptBuilder.WriteString("- \"Di era modern…\"\n")
	promptBuilder.WriteString("- \"Penting untuk diketahui…\"\n\n")
	
	// System instruction
	promptBuilder.WriteString("Anda adalah penulis konten ahli untuk platform pertanian. ")
	promptBuilder.WriteString("Tulis konten yang informatif, natural, dan mengikuti outline yang diberikan.\n\n")
	
	// Content requirements
	promptBuilder.WriteString("REQUIREMENTS:\n")
	promptBuilder.WriteString("1. Ikuti outline dengan ketat - setiap heading HARUS sesuai dengan outline\n")
	promptBuilder.WriteString("2. Tulis dalam bahasa Indonesia yang natural\n")
	promptBuilder.WriteString("3. Gunakan 1 H1 untuk judul utama (di field 'title', bukan di body)\n")
	promptBuilder.WriteString("4. Strukturkan body dengan MARKDOWN headings:\n")
	promptBuilder.WriteString("   - Gunakan ## (dua hash) untuk setiap H2 section sesuai outline\n")
	promptBuilder.WriteString("   - Gunakan ### (tiga hash) untuk setiap H3 subsection sesuai outline\n")
	promptBuilder.WriteString("   - JANGAN gunakan HTML tags (<h2>, <h3>)\n")
	promptBuilder.WriteString("   - JANGAN gunakan plain text tanpa headings\n")
	promptBuilder.WriteString("5. Konten harus informatif dan tidak promosional\n")
	promptBuilder.WriteString("6. Hindari kata-kata promosi seperti 'pasti', 'terbukti', 'rahasia'\n")
	promptBuilder.WriteString("7. Jangan gunakan CTA jualan\n")
	promptBuilder.WriteString("8. Jangan menyebut nama merek\n\n")
	
	// Natural depth guidance (KONSEPTUAL, bukan paksaan)
	promptBuilder.WriteString("KEDALAMAN KONTEN (NATURAL):\n")
	promptBuilder.WriteString("- Untuk setiap bagian, bahas hingga tuntas sebelum berpindah ke bagian berikutnya\n")
	promptBuilder.WriteString("- Sertakan latar belakang konseptual yang relevan untuk membantu pembaca memahami konteks\n")
	promptBuilder.WriteString("- Jelaskan hubungan sebab-akibat ketika relevan\n")
	promptBuilder.WriteString("- Elaborasi konteks yang membantu pemahaman pembaca\n")
	promptBuilder.WriteString("- Hindari ringkasan terlalu cepat - berikan penjelasan yang memadai untuk setiap poin\n")
	promptBuilder.WriteString("- Untuk setiap H2 section, berikan penjelasan lengkap dengan sub-poin yang relevan\n")
	promptBuilder.WriteString("- Untuk setiap H3 subsection, berikan penjelasan detail dengan contoh konkret ketika relevan\n")
	promptBuilder.WriteString("- Konten harus komprehensif dan substantif, mencakup aspek-aspek penting dari setiap topik\n")
	promptBuilder.WriteString("- Konten harus informatif dan memadai tanpa filler atau pengulangan yang tidak perlu\n\n")
	
	return promptBuilder.String()
}

// TokenUsage represents token usage from Responses API
type TokenUsage struct {
	OutputTokens int // TASK 19: Responses API uses output_tokens
}

// callAI makes the actual API call to Responses API
// TASK 19-20: Uses Responses API format (WAJIB)
// Returns content and token usage for logging (TASK 9)
func (g *Generator) callAI(prompt string, maxTokens int) (string, *TokenUsage, error) {
	// Responses API (OpenAI) request payload
	// NOTE (2026): `response_format` is deprecated in Responses API.
	// Use `text.format` instead to avoid "Unsupported parameter: 'response_format'".
	// A2. Parameter Stabil (ANTI OVER-GENERATE)
	payload := map[string]interface{}{
		"model":             g.model,
		"input":             prompt,
		"max_output_tokens": maxTokens,
		"temperature":      0.4,  // A2: Konservatif & stabil
		"top_p":            0.85, // A2: Stabil (hindari over-creativity)
		"presence_penalty": 0.1,  // A2: Minim repetisi
		"frequency_penalty": 0.2,  // A2: Tidak "puitis AI"
		"text": map[string]interface{}{
			"format": map[string]string{
				"type": "text",
			},
		},
	}

	// BAGIAN 2.3: LOG PAYLOAD SEBELUM KIRIM (WAJIB)
	log.Printf("[OPENAI PAYLOAD] model=%v max_output_tokens=%v",
		payload["model"],
		payload["max_output_tokens"],
	)

	jsonData, err := json.Marshal(payload)
	if err != nil {
		return "", nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	req, err := http.NewRequest("POST", g.apiURL, bytes.NewBuffer(jsonData))
	if err != nil {
		return "", nil, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+g.apiKey)

	resp, err := g.client.Do(req)
	if err != nil {
		return "", nil, fmt.Errorf("API request failed: %w", err)
	}
	defer resp.Body.Close()

	log.Printf("[AI] Responses API response status: %d", resp.StatusCode)

	if resp.StatusCode != http.StatusOK {
		body, readErr := io.ReadAll(resp.Body)
		if readErr != nil {
			log.Printf("[AI] Failed to read error response body: %v", readErr)
			return "", nil, fmt.Errorf("API returned status %d (failed to read body)", resp.StatusCode)
		}
		log.Printf("[AI] Responses API error response: %s", string(body))
		// A1: Jika GPT-5.2 unavailable → return error, bukan downgrade diam-diam
		return "", nil, fmt.Errorf("API returned status %d: %s (GPT-5.2 required, no fallback)", resp.StatusCode, string(body))
	}

	// TASK 20: Parse Responses API response format (WAJIB)
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", nil, fmt.Errorf("failed to read response body: %w", err)
	}

	// TASK 24: Log raw response untuk verifikasi (SEKALI SAJA)
	log.Printf("[AI RAW RESPONSE] %s", string(body))

	log.Println("[AI] Decoding Responses API response...")
	var r struct {
		Output []struct {
			ID      string `json:"id"`
			Type    string `json:"type"`
			Content []struct {
				Type string `json:"type"`
				Text string `json:"text"`
			} `json:"content"`
		} `json:"output"`
		Usage struct {
			OutputTokens int `json:"output_tokens"`
		} `json:"usage"`
		Error struct {
			Message string `json:"message"`
			Type    string `json:"type"`
		} `json:"error"`
	}

	if err := json.Unmarshal(body, &r); err != nil {
		log.Printf("[AI] Failed to decode JSON response: %v", err)
		return "", nil, fmt.Errorf("failed to decode response: %w", err)
	}

	// TASK 26: Extract FULL content from nested structure (WAJIB - SATU-SATUNYA CARA YANG SAH)
	content := ""
	for _, msg := range r.Output {
		if msg.Type == "message" {
			for _, c := range msg.Content {
				if c.Type == "output_text" {
					content += c.Text
				}
			}
		}
	}

	if content == "" {
		errorMsg := "no content in API response"
		if r.Error.Message != "" {
			errorMsg = fmt.Sprintf("API error: %s (type: %s)", r.Error.Message, r.Error.Type)
		}
		log.Printf("[AI] %s", errorMsg)
		return "", nil, fmt.Errorf(errorMsg)
	}

	// BAGIAN 1.3: LOG RAW CONTENT CHECK SETELAH PARSING GPT (TEPAT SETELAH EXTRACTION)
	contentPreview := content
	if len(contentPreview) > 500 {
		contentPreview = contentPreview[:500]
	}
	log.Printf(
		"[RAW CONTENT CHECK] chars=%d words=%d preview=%.500s",
		len(content),
		countWordsInText(content),
		content,
	)

	// BAGIAN 5.1: HARD ASSERT SETELAH PARSING GPT (WAJIB - PENENTU)
	if countWordsInText(content) < 200 {
		panic("GPT OUTPUT TOO SHORT — ENGINE STILL WRONG")
	}

	// TASK 26: Log content length immediately after extraction
	log.Printf("[ENGINE CONTENT LENGTH] chars=%d words=%d", len(content), countWordsInText(content))
	
	// TASK 20: Extract token usage from Responses API
	usage := &TokenUsage{
		OutputTokens: r.Usage.OutputTokens,
	}
	
	if usage.OutputTokens > 0 {
		log.Printf("[AI] Token usage: output_tokens=%d", usage.OutputTokens)
	}

	// TASK 21: Log verifikasi final (INI PENENTU)
	wc := countWordsInText(content)
	log.Printf(
		"[AI FINAL] model=gpt-5.2 words=%d output_tokens=%d",
		wc,
		r.Usage.OutputTokens,
	)

	// TASK 31: VERIFIKASI DENGAN LOG FINAL (WAJIB)
	wcFinal := countWordsInText(content)
	charCount := len(content)
	log.Printf(
		"[FINAL VERIFY] model=gpt-5.2 words=%d chars=%d",
		wcFinal,
		charCount,
	)
	if wcFinal >= 900 && charCount >= 6000 {
		log.Printf("[FINAL VERIFY] ✅ SUCCESS: words=%d >= 900, chars=%d >= 6000", wcFinal, charCount)
	} else {
		log.Printf("[FINAL VERIFY] ⚠️ WARNING: words=%d (expected >= 900), chars=%d (expected >= 6000)", wcFinal, charCount)
	}
	
	return content, usage, nil
}

// parseResponse extracts structured content from AI response
func (g *Generator) parseResponse(rawContent string, req ContentRequest) *ContentResult {
	result := &ContentResult{
		Status: "RAW_AI",
	}

	// TASK 27: Log raw content length before parsing
	rawLen := len(rawContent)
	log.Printf("[PARSE RESPONSE] Raw content length: %d chars", rawLen)

	// Try to parse as JSON first
	var jsonData map[string]interface{}
	if err := json.Unmarshal([]byte(rawContent), &jsonData); err == nil {
		// JSON format detected
		if title, ok := jsonData["title"].(string); ok {
			result.Title = title
		}
		if body, ok := jsonData["body"].(string); ok {
			result.Body = body
			log.Printf("[PARSE RESPONSE] Body extracted from JSON: %d chars", len(result.Body))
		}
		if metaTitle, ok := jsonData["metaTitle"].(string); ok {
			result.MetaTitle = metaTitle
		}
		if metaDesc, ok := jsonData["metaDesc"].(string); ok {
			result.MetaDesc = metaDesc
		}
		// CRITICAL: If metaDesc is missing from JSON, generate it from body
		if result.MetaDesc == "" && result.Body != "" {
			bodyLines := strings.Split(result.Body, "\n")
			for _, line := range bodyLines {
				line = strings.TrimSpace(line)
				if line != "" && !strings.HasPrefix(line, "#") && !strings.HasPrefix(line, "##") && !strings.HasPrefix(line, "###") {
					// Remove markdown formatting
					cleanLine := strings.TrimPrefix(line, "**")
					cleanLine = strings.TrimSuffix(cleanLine, "**")
					cleanLine = strings.TrimPrefix(cleanLine, "*")
					cleanLine = strings.TrimSuffix(cleanLine, "*")
					if len(cleanLine) > 20 {
						result.MetaDesc = truncateString(cleanLine, 160)
						break
					}
				}
			}
		}
	} else {
		// Plain text format - extract title from first line or H1
		lines := strings.Split(rawContent, "\n")
		for i, line := range lines {
			line = strings.TrimSpace(line)
			if strings.HasPrefix(line, "# ") {
				result.Title = strings.TrimPrefix(line, "# ")
				// Rest is body
				result.Body = strings.Join(lines[i+1:], "\n")
				break
			} else if i == 0 && line != "" {
				result.Title = line
				result.Body = strings.Join(lines[1:], "\n")
				break
			}
		}

		// Generate meta if not provided
		if result.MetaTitle == "" {
			result.MetaTitle = truncateString(result.Title, 60)
		}
		if result.MetaDesc == "" {
			// Extract first paragraph for meta description
			bodyLines := strings.Split(result.Body, "\n")
			for _, line := range bodyLines {
				line = strings.TrimSpace(line)
				if line != "" && !strings.HasPrefix(line, "#") {
					result.MetaDesc = truncateString(line, 160)
					break
				}
			}
		}
	}

	// Ensure title exists
	if result.Title == "" {
		result.Title = "Artikel Pertanian"
	}

	// Ensure body exists
	if result.Body == "" {
		result.Body = rawContent
		log.Printf("[PARSE RESPONSE] Body was empty, using raw content: %d chars", len(result.Body))
	}

	// TASK 27: Log final body length and ensure it's not truncated
	bodyLen := len(result.Body)
	log.Printf("[PARSE RESPONSE] Final body length: %d chars (raw was: %d)", bodyLen, rawLen)
	if bodyLen < rawLen-50 && rawLen > 100 { // Allow small reduction for JSON parsing, but warn if significant
		log.Printf("[PARSE RESPONSE] ⚠️ WARNING: Body length reduced (raw: %d, final: %d)", rawLen, bodyLen)
	}

	// CRITICAL FIX: Ensure metaDesc always exists (required by contract)
	if result.MetaDesc == "" {
		// Extract first meaningful paragraph from body for meta description
		bodyLines := strings.Split(result.Body, "\n")
		for _, line := range bodyLines {
			line = strings.TrimSpace(line)
			// Skip empty lines and headings
			if line != "" && !strings.HasPrefix(line, "#") && !strings.HasPrefix(line, "##") && !strings.HasPrefix(line, "###") {
				// Remove markdown formatting
				cleanLine := strings.TrimPrefix(line, "**")
				cleanLine = strings.TrimSuffix(cleanLine, "**")
				cleanLine = strings.TrimPrefix(cleanLine, "*")
				cleanLine = strings.TrimSuffix(cleanLine, "*")
				if len(cleanLine) > 20 { // Only use if it's meaningful
					result.MetaDesc = truncateString(cleanLine, 160)
					break
				}
			}
		}
		// If still empty, use title as fallback
		if result.MetaDesc == "" {
			result.MetaDesc = truncateString(result.Title, 160)
		}
	}

	// Ensure metaTitle exists
	if result.MetaTitle == "" {
		result.MetaTitle = truncateString(result.Title, 60)
	}

	// BAGIAN 1.3: LOG RAW CONTENT CHECK SETELAH PARSING (WAJIB)
	contentPreview := result.Body
	if len(contentPreview) > 500 {
		contentPreview = contentPreview[:500]
	} else {
		contentPreview = result.Body
	}
	log.Printf(
		"[RAW CONTENT CHECK] chars=%d words=%d preview=%.500s",
		len(result.Body),
		countWordsInText(result.Body),
		result.Body,
	)

	// BAGIAN 5.1: HARD ASSERT (WAJIB - PENENTU)
	if countWordsInText(result.Body) < 200 {
		panic("GPT OUTPUT TOO SHORT — ENGINE STILL WRONG")
	}

	return result
}

// truncateString truncates string to max length
func truncateString(s string, maxLen int) string {
	if len(s) <= maxLen {
		return s
	}
	return s[:maxLen-3] + "..."
}