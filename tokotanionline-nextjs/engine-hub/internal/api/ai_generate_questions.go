package api

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

// QuestionGenerationRequest represents request for question generation (PHASE 1)
type QuestionGenerationRequest struct {
	Title    string `json:"title"`
	Intent   string `json:"intent"` // informational, how_to, commercial, comparison
	Category string `json:"category,omitempty"`
	Language string `json:"language"` // id, en, etc.
}

// QuestionGenerationResponse represents response with questions
type QuestionGenerationResponse struct {
	Intent    string   `json:"intent"`
	Questions []string `json:"questions"`
}

// AIGenerateQuestions handles POST /api/engine/ai/generate-questions
// PHASE 1: Generate core questions for answer-driven writing
func AIGenerateQuestions(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req QuestionGenerationRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		log.Printf("[QUESTION GENERATE] Failed to parse request: %v", err)
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	log.Printf("[QUESTION GENERATE] Generating questions: title=%s, intent=%s", req.Title, req.Intent)

	// Generate questions using AI (semantic approach)
	questions := generateQuestionsSemantic(req)

	response := QuestionGenerationResponse{
		Intent:    req.Intent,
		Questions: questions,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// generateQuestionsSemantic generates SERP-like questions using AI
func generateQuestionsSemantic(req QuestionGenerationRequest) []string {
	// A. SERP-DRIVEN QUESTION GENERATOR
	// Tujuan: Pertanyaan harus mirip yang Google tampilkan, bukan rekaan

	apiKey := os.Getenv("OPENAI_API_KEY")
	if apiKey == "" {
		apiKey = os.Getenv("AI_API_KEY")
	}

	if apiKey == "" {
		log.Printf("[QUESTION GENERATE] No API key, using fallback")
		return generateFallbackQuestions(req)
	}

	// Build prompt untuk SERP-like questions
	prompt := buildSERPQuestionPrompt(req)

	// Call OpenAI untuk generate questions
	questions, err := callAIForQuestions(prompt, apiKey)
	if err != nil {
		log.Printf("[QUESTION GENERATE] AI call failed: %v, using fallback", err)
		return generateFallbackQuestions(req)
	}

	// A2. Filter "SERP-like"
	filtered := filterSERPLikeQuestions(questions)

	// If < 3 questions pass → REGENERATE PHASE 1
	if len(filtered) < 3 {
		log.Printf("[QUESTION GENERATE] Only %d questions passed filter, regenerating...", len(filtered))
		// Retry once
		questions2, err2 := callAIForQuestions(prompt, apiKey)
		if err2 == nil {
			filtered2 := filterSERPLikeQuestions(questions2)
			if len(filtered2) >= 3 {
				return filtered2[:min(7, len(filtered2))]
			}
		}
		// Final fallback
		return generateFallbackQuestions(req)
	}

	return filtered[:min(7, len(filtered))] // Max 7 questions
}

// buildSERPQuestionPrompt builds prompt for SERP-like question generation
func buildSERPQuestionPrompt(req QuestionGenerationRequest) string {
	var prompt strings.Builder

	prompt.WriteString("Anda adalah ahli SEO yang memahami pertanyaan yang muncul di Google SERP (Search Engine Results Page).\n\n")
	prompt.WriteString("TUGAS: Generate 5-7 pertanyaan yang MIRIP dengan yang Google tampilkan di \"People Also Ask\" (PAA).\n\n")
	prompt.WriteString(fmt.Sprintf("Topik: %s\n", req.Title))
	prompt.WriteString(fmt.Sprintf("Search Intent: %s\n", req.Intent))
	if req.Category != "" {
		prompt.WriteString(fmt.Sprintf("Kategori: %s\n", req.Category))
	}
	prompt.WriteString(fmt.Sprintf("Bahasa: %s\n\n", req.Language))

	prompt.WriteString("ATURAN KERAS PERTANYAAN:\n")
	prompt.WriteString("1. Bentuk Q&A manusia (bukan heading akademik)\n")
	prompt.WriteString("2. Bisa dijawab ≤ 120 kata\n")
	prompt.WriteString("3. Tidak tumpang tindih dengan pertanyaan lain\n")
	prompt.WriteString("4. Bisa berdiri sendiri (tidak perlu konteks lain)\n")
	prompt.WriteString("5. Mirip pertanyaan yang muncul di Google PAA\n\n")

	prompt.WriteString("CONTOH OUTPUT VALID:\n")
	prompt.WriteString("- Apa itu pertanian organik?\n")
	prompt.WriteString("- Bagaimana cara memulai pertanian organik dari nol?\n")
	prompt.WriteString("- Kesalahan apa yang sering dilakukan pemula?\n")
	prompt.WriteString("- Apakah pertanian organik menguntungkan?\n\n")

	prompt.WriteString("❌ JANGAN BUAT:\n")
	prompt.WriteString("- Pertanyaan terlalu akademik\n")
	prompt.WriteString("- Terlalu panjang (> 15 kata)\n")
	prompt.WriteString("- Tidak punya nilai jawaban cepat\n")
	prompt.WriteString("- Pertanyaan yang tidak bisa berdiri sendiri\n\n")

	prompt.WriteString("OUTPUT: Satu pertanyaan per baris, tanpa nomor, tanpa bullet.\n")

	return prompt.String()
}

// callAIForQuestions calls OpenAI to generate questions
func callAIForQuestions(prompt string, apiKey string) ([]string, error) {
	apiURL := os.Getenv("AI_API_URL")
	if apiURL == "" {
		apiURL = "https://api.openai.com/v1/responses"
	}

	// A1. Lock Model ke GPT-5.2 (WAJIB - NO FALLBACK)
	model := os.Getenv("AI_MODEL")
	if model == "" {
		model = "gpt-5.2" // Default to GPT-5.2
	}
	if model != "gpt-5.2" {
		log.Printf("[QUESTION GENERATE] WARNING: Model is set to %s, but GPT-5.2 is required. Forcing GPT-5.2.", model)
		model = "gpt-5.2"
	}

	// A2. Parameter Stabil (ANTI OVER-GENERATE)
	payload := map[string]interface{}{
		"model":             model,
		"input":             prompt,
		"max_output_tokens": 500,
		"temperature":       0.4,  // A2: Konservatif & stabil
		"top_p":             0.85, // A2: Stabil (hindari over-creativity)
		"presence_penalty":  0.1,  // A2: Minim repetisi
		"frequency_penalty": 0.2,  // A2: Tidak "puitis AI"
		"text": map[string]interface{}{
			"format": map[string]string{
				"type": "text",
			},
		},
	}

	jsonData, err := json.Marshal(payload)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	client := &http.Client{Timeout: 30 * time.Second}
	req, err := http.NewRequest("POST", apiURL, bytes.NewBuffer(jsonData))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+apiKey)

	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("API request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		// A1: Jika GPT-5.2 unavailable → return error, bukan downgrade diam-diam
		return nil, fmt.Errorf("API returned status %d: %s (GPT-5.2 required, no fallback)", resp.StatusCode, string(body))
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %w", err)
	}

	// Parse Responses API response
	var apiResponse struct {
		Output []struct {
			Content []struct {
				Text string `json:"text"`
			} `json:"content"`
		} `json:"output"`
	}

	if err := json.Unmarshal(body, &apiResponse); err != nil {
		return nil, fmt.Errorf("failed to parse response: %w", err)
	}

	if len(apiResponse.Output) == 0 || len(apiResponse.Output[0].Content) == 0 {
		return nil, fmt.Errorf("no content in response")
	}

	text := apiResponse.Output[0].Content[0].Text

	// Parse questions (one per line)
	lines := strings.Split(text, "\n")
	questions := []string{}
	for _, line := range lines {
		line = strings.TrimSpace(line)
		// Remove bullet points, numbers, dashes
		line = strings.TrimPrefix(line, "-")
		line = strings.TrimPrefix(line, "•")
		line = strings.TrimPrefix(line, "*")
		line = strings.TrimSpace(line)
		// Remove leading numbers (1., 2., etc.)
		for strings.HasPrefix(line, "1.") || strings.HasPrefix(line, "2.") ||
			strings.HasPrefix(line, "3.") || strings.HasPrefix(line, "4.") ||
			strings.HasPrefix(line, "5.") || strings.HasPrefix(line, "6.") ||
			strings.HasPrefix(line, "7.") {
			parts := strings.SplitN(line, ".", 2)
			if len(parts) > 1 {
				line = strings.TrimSpace(parts[1])
			} else {
				break
			}
		}
		if len(line) >= 10 && strings.HasSuffix(line, "?") {
			questions = append(questions, line)
		}
	}

	return questions, nil
}

// filterSERPLikeQuestions filters questions to ensure SERP-like quality
func filterSERPLikeQuestions(questions []string) []string {
	filtered := []string{}

	for _, q := range questions {
		q = strings.TrimSpace(q)

		// A2. Filter "SERP-like"
		// ❌ Pertanyaan terlalu akademik
		academicWords := []string{"definisi", "konsep", "teori", "paradigma", "metodologi"}
		isAcademic := false
		qLower := strings.ToLower(q)
		for _, word := range academicWords {
			if strings.Contains(qLower, word) {
				isAcademic = true
				break
			}
		}
		if isAcademic {
			continue
		}

		// ❌ Terlalu panjang (> 15 kata)
		words := strings.Fields(q)
		if len(words) > 15 {
			continue
		}

		// ❌ Tidak punya nilai jawaban cepat
		// Check if question can be answered in ≤ 120 words
		// Simple heuristic: question should be specific, not too broad
		if len(q) < 10 {
			continue
		}

		// ✅ Bisa berdiri sendiri
		// Check if question has context (mentions topic)
		if !strings.Contains(qLower, strings.ToLower(q)) && len(q) < 20 {
			// Question too short and doesn't mention topic
			continue
		}

		// Remove generic questions
		if isGenericQuestion(q) {
			continue
		}

		filtered = append(filtered, q)
	}

	return filtered
}

// generateFallbackQuestions generates fallback questions if AI fails
func generateFallbackQuestions(req QuestionGenerationRequest) []string {
	questions := []string{}
	titleLower := strings.ToLower(req.Title)

	switch req.Intent {
	case "how_to":
		questions = []string{
			fmt.Sprintf("Bagaimana cara %s?", titleLower),
			fmt.Sprintf("Apa langkah-langkah %s?", titleLower),
			fmt.Sprintf("Tips praktis untuk %s?", titleLower),
		}
	case "comparison":
		questions = []string{
			fmt.Sprintf("Apa perbedaan %s?", titleLower),
			fmt.Sprintf("Mana yang lebih baik: %s?", titleLower),
			fmt.Sprintf("Kapan menggunakan %s?", titleLower),
		}
	case "commercial":
		questions = []string{
			fmt.Sprintf("Berapa harga %s?", titleLower),
			fmt.Sprintf("Dimana bisa membeli %s?", titleLower),
			fmt.Sprintf("Apa kelebihan %s?", titleLower),
		}
	default: // informational
		questions = []string{
			fmt.Sprintf("Apa itu %s?", req.Title),
			fmt.Sprintf("Mengapa %s penting?", req.Title),
			fmt.Sprintf("Bagaimana %s bekerja?", req.Title),
		}
	}

	// Filter
	filtered := []string{}
	for _, q := range questions {
		if len(q) >= 10 && !isGenericQuestion(q) {
			filtered = append(filtered, q)
		}
	}

	if len(filtered) < 3 {
		filtered = append(filtered, fmt.Sprintf("Tips praktis untuk %s", req.Title))
	}

	return filtered[:min(7, len(filtered))]
}

// isGenericQuestion checks if question is too generic
func isGenericQuestion(q string) bool {
	generic := []string{"apa itu?", "bagaimana?", "mengapa?", "kapan?"}
	qLower := strings.ToLower(strings.TrimSpace(q))
	for _, g := range generic {
		if qLower == g {
			return true
		}
	}
	return false
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}
