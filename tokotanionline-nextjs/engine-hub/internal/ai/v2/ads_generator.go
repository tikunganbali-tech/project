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

// PHASE 8A.2: Ads Copy Generator
// Produces: primary text, headline, description, CTA text
// Output versioned (no overwrite)

// AdsGenerationRequest represents a request for ads copy generation
// PHASE 8A: Brand & Locale isolation - REQUIRED
type AdsGenerationRequest struct {
	BrandContext    *BrandContext  `json:"brandContext"`    // PHASE 8A: REQUIRED
	LocaleContext   *LocaleContext  `json:"localeContext"`  // PHASE 8A: REQUIRED
	CampaignID      string         `json:"campaignId"`     // Campaign ID
	Objective       string         `json:"objective"`      // AWARENESS | TRAFFIC | ENGAGEMENT | CONVERSIONS | SALES
	Platform        string         `json:"platform"`       // FB | Google | TikTok
	ProductContext  string         `json:"productContext,omitempty"`  // Optional: Product/service context
	TargetAudience  string         `json:"targetAudience,omitempty"`   // Optional: Target audience
	KeyMessage      string         `json:"keyMessage,omitempty"`       // Optional: Key message/angle
	PreviousVersion int            `json:"previousVersion,omitempty"` // Optional: Previous version number
}

// AdsGenerationResult represents the result of ads copy generation
type AdsGenerationResult struct {
	PrimaryText  string `json:"primaryText"`  // Main ad copy text
	Headline     string `json:"headline"`     // Ad headline
	Description  string `json:"description"`  // Ad description (optional)
	CTAText      string `json:"ctaText"`      // Call-to-action text
	Version      int    `json:"version"`      // Version number
	GeneratedAt  string `json:"generatedAt"`  // ISO 8601 timestamp
	Status       string `json:"status"`        // "SUCCESS" | "FAILED"
	Error        string `json:"error,omitempty"` // Error message if failed
}

// AdsGenerator handles AI ads copy generation
// PHASE 8A.2: Ads Copy Producer - versioned output
type AdsGenerator struct {
	client *http.Client
	apiKey string
	apiURL string
	model  string
}

// NewAdsGenerator creates a new ads copy generator
func NewAdsGenerator() *AdsGenerator {
	log.Println("[ADS GENERATOR] Creating new ads generator...")
	
	// Get API key from environment
	apiKey := os.Getenv("OPENAI_API_KEY")
	if apiKey == "" {
		apiKey = os.Getenv("AI_API_KEY")
	}
	
	// Get API URL
	apiURL := os.Getenv("AI_API_URL")
	if apiURL == "" {
		apiURL = "https://api.openai.com/v1/chat/completions"
	}
	
	// Model (can be configured)
	model := os.Getenv("AI_MODEL")
	if model == "" {
		model = "gpt-4" // Default to GPT-4
	}
	
	log.Printf("[ADS GENERATOR] API key loaded: present=%v, length=%d", apiKey != "", len(apiKey))
	log.Printf("[ADS GENERATOR] Model: %s", model)
	
	return &AdsGenerator{
		client: &http.Client{
			Timeout: 60 * time.Second, // 1 minute timeout for ads generation
		},
		apiKey: apiKey,
		apiURL: apiURL,
		model:  model,
	}
}

// GenerateAdsCopy produces ads copy (primary text, headline, description, CTA)
// PHASE 8A.2: AI Generator - Ads Copy Producer
// PHASE 8A: Brand & Locale isolation - REQUIRED
func (g *AdsGenerator) GenerateAdsCopy(ctx context.Context, req AdsGenerationRequest) (*AdsGenerationResult, error) {
	log.Println("[ADS GENERATOR] Starting ads copy generation...")
	log.Printf("[ADS GENERATOR] Request: campaignId=%s, objective=%s, platform=%s", 
		req.CampaignID, req.Objective, req.Platform)
	
	// PHASE 8A: Guardrail - brand context is REQUIRED
	if req.BrandContext == nil {
		return nil, fmt.Errorf("PHASE 8A GUARDRAIL: Brand context is required. No ads generation without brand_id")
	}
	if req.BrandContext.BrandID == "" {
		return nil, fmt.Errorf("PHASE 8A GUARDRAIL: Brand ID is required")
	}
	if req.BrandContext.BrandStatus != "ACTIVE" {
		return nil, fmt.Errorf("PHASE 8A GUARDRAIL: Brand must be ACTIVE. Current status: %s", req.BrandContext.BrandStatus)
	}
	
	// PHASE 8A: Guardrail - locale context is REQUIRED
	if req.LocaleContext == nil {
		return nil, fmt.Errorf("PHASE 8A GUARDRAIL: Locale context is required. No ads generation without locale_id")
	}
	if req.LocaleContext.LocaleID == "" {
		return nil, fmt.Errorf("PHASE 8A GUARDRAIL: Locale ID is required")
	}
	if !req.LocaleContext.IsActive {
		return nil, fmt.Errorf("PHASE 8A GUARDRAIL: Locale must be ACTIVE. Current locale: %s", req.LocaleContext.LocaleCode)
	}
	
	log.Printf("[ADS GENERATOR] Brand context: brandId=%s, brandName=%s", 
		req.BrandContext.BrandID, req.BrandContext.BrandName)
	log.Printf("[ADS GENERATOR] Locale context: localeId=%s, localeCode=%s", 
		req.LocaleContext.LocaleID, req.LocaleContext.LocaleCode)
	
	if g.apiKey == "" {
		return nil, fmt.Errorf("AI_API_KEY or OPENAI_API_KEY environment variable not set")
	}
	
	// PHASE 8A.2: Generate ads copy components
	// Build prompt for ads copy generation
	prompt := g.buildAdsPrompt(req)
	
	// Call AI API
	response, err := g.callAI(prompt, 2000) // 2000 tokens for ads copy
	if err != nil {
		return nil, fmt.Errorf("AI API call failed: %w", err)
	}
	
	// Parse AI response
	result, err := g.parseAdsResponse(response, req)
	if err != nil {
		return nil, fmt.Errorf("failed to parse ads response: %w", err)
	}
	
	// Set version (increment from previous version if provided)
	if req.PreviousVersion > 0 {
		result.Version = req.PreviousVersion + 1
	} else {
		result.Version = 1
	}
	
	result.GeneratedAt = time.Now().Format(time.RFC3339)
	result.Status = "SUCCESS"
	
	log.Printf("[ADS GENERATOR] Ads copy generated: version=%d, headline=%s", 
		result.Version, result.Headline)
	
	return result, nil
}

// buildAdsPrompt builds the prompt for ads copy generation
// PHASE 8A: Brand & Locale-aware prompt generation
func (g *AdsGenerator) buildAdsPrompt(req AdsGenerationRequest) string {
	var prompt strings.Builder
	
	prompt.WriteString("Generate compelling ad copy for a digital advertising campaign.\n\n")
	
	// PHASE 8A: Include brand context
	if req.BrandContext != nil {
		prompt.WriteString(fmt.Sprintf("Brand Context:\n"))
		prompt.WriteString(fmt.Sprintf("- Brand Name: %s\n", req.BrandContext.BrandName))
		prompt.WriteString(fmt.Sprintf("- Brand Identity: Write ad copy that reflects %s's brand values and voice\n", req.BrandContext.BrandName))
		prompt.WriteString("- IMPORTANT: This ad copy is exclusive to this brand. Do not reference or reuse content from other brands.\n\n")
	}
	
	// PHASE 8A: Include locale context
	if req.LocaleContext != nil {
		prompt.WriteString(fmt.Sprintf("Locale Context:\n"))
		prompt.WriteString(fmt.Sprintf("- Language: %s (%s)\n", req.LocaleContext.LanguageName, req.LocaleContext.LocaleCode))
		prompt.WriteString(fmt.Sprintf("- Write in native %s, NOT translated content\n", req.LocaleContext.LanguageName))
		prompt.WriteString(fmt.Sprintf("- Use natural %s expressions and cultural context\n", req.LocaleContext.LanguageName))
		prompt.WriteString("- IMPORTANT: Generate original ad copy in this language. Do NOT translate from other languages.\n")
		prompt.WriteString("- CRITICAL: This is a NEW VERSION for this locale. Do not reuse content from other locales.\n\n")
	}
	
	// Campaign objective
	prompt.WriteString(fmt.Sprintf("Campaign Objective: %s\n", req.Objective))
	prompt.WriteString(fmt.Sprintf("Platform: %s\n\n", req.Platform))
	
	// Platform-specific requirements
	switch req.Platform {
	case "FB", "Facebook", "Meta":
		prompt.WriteString("Platform Requirements (Facebook/Meta Ads):\n")
		prompt.WriteString("- Primary Text: 125 characters recommended (max 500)\n")
		prompt.WriteString("- Headline: 40 characters recommended (max 40)\n")
		prompt.WriteString("- Description: 125 characters recommended (optional)\n")
		prompt.WriteString("- CTA: Clear action verb (e.g., 'Shop Now', 'Learn More', 'Sign Up')\n\n")
	case "Google":
		prompt.WriteString("Platform Requirements (Google Ads):\n")
		prompt.WriteString("- Headline: 30 characters recommended (max 30)\n")
		prompt.WriteString("- Description: 90 characters recommended (max 90)\n")
		prompt.WriteString("- CTA: Clear action verb (e.g., 'Buy Now', 'Get Started', 'Contact Us')\n\n")
	case "TikTok":
		prompt.WriteString("Platform Requirements (TikTok Ads):\n")
		prompt.WriteString("- Primary Text: 100 characters recommended (max 220)\n")
		prompt.WriteString("- Headline: 34 characters recommended (max 34)\n")
		prompt.WriteString("- Description: 100 characters recommended (optional)\n")
		prompt.WriteString("- CTA: Clear action verb (e.g., 'Shop Now', 'Download', 'Learn More')\n\n")
	}
	
	// Additional context
	if req.ProductContext != "" {
		prompt.WriteString(fmt.Sprintf("Product/Service Context: %s\n\n", req.ProductContext))
	}
	if req.TargetAudience != "" {
		prompt.WriteString(fmt.Sprintf("Target Audience: %s\n\n", req.TargetAudience))
	}
	if req.KeyMessage != "" {
		prompt.WriteString(fmt.Sprintf("Key Message/Angle: %s\n\n", req.KeyMessage))
	}
	
	// Versioning note
	if req.PreviousVersion > 0 {
		prompt.WriteString(fmt.Sprintf("Note: This is version %d. Create a NEW version with different angles/approaches.\n\n", req.PreviousVersion+1))
	}
	
	prompt.WriteString("Requirements:\n")
	prompt.WriteString("- Generate compelling, conversion-focused ad copy\n")
	prompt.WriteString("- Use persuasive language appropriate for the campaign objective\n")
	prompt.WriteString("- Include clear value proposition\n")
	prompt.WriteString("- CTA should be action-oriented and specific\n")
	prompt.WriteString("- Respect platform character limits\n")
	prompt.WriteString("- NO generic or placeholder text\n")
	prompt.WriteString("- NO keyword stuffing\n")
	
	// PHASE 8A: Brand isolation requirement
	if req.BrandContext != nil {
		prompt.WriteString(fmt.Sprintf("- CRITICAL: This ad copy is for brand %s only. Do not mix or reference other brands.\n", req.BrandContext.BrandName))
	}
	
	// PHASE 8A: Locale isolation requirement
	if req.LocaleContext != nil {
		prompt.WriteString(fmt.Sprintf("- CRITICAL: This ad copy is for locale %s (%s) only. Do not translate or reuse content from other locales.\n", 
			req.LocaleContext.LocaleCode, req.LocaleContext.LanguageName))
	}
	
	prompt.WriteString("\nReturn as JSON with the following structure:\n")
	prompt.WriteString(`{
  "primaryText": "...",
  "headline": "...",
  "description": "...",
  "ctaText": "..."
}`)
	
	return prompt.String()
}

// parseAdsResponse parses the AI response into AdsGenerationResult
func (g *AdsGenerator) parseAdsResponse(response string, req AdsGenerationRequest) (*AdsGenerationResult, error) {
	// Try to parse as JSON
	var parsed struct {
		PrimaryText string `json:"primaryText"`
		Headline    string `json:"headline"`
		Description string `json:"description"`
		CTAText     string `json:"ctaText"`
	}
	
	// Clean response (remove markdown code blocks if present)
	cleaned := strings.TrimSpace(response)
	if strings.HasPrefix(cleaned, "```json") {
		cleaned = strings.TrimPrefix(cleaned, "```json")
		cleaned = strings.TrimSuffix(cleaned, "```")
		cleaned = strings.TrimSpace(cleaned)
	} else if strings.HasPrefix(cleaned, "```") {
		cleaned = strings.TrimPrefix(cleaned, "```")
		cleaned = strings.TrimSuffix(cleaned, "```")
		cleaned = strings.TrimSpace(cleaned)
	}
	
	if err := json.Unmarshal([]byte(cleaned), &parsed); err != nil {
		log.Printf("[ADS GENERATOR] JSON parsing failed, trying to extract fields: %v", err)
		// Fallback: try to extract fields manually
		return g.extractAdsFieldsFromText(response, req)
	}
	
	// Validate required fields
	if parsed.PrimaryText == "" {
		return nil, fmt.Errorf("primaryText is required but was empty")
	}
	if parsed.Headline == "" {
		return nil, fmt.Errorf("headline is required but was empty")
	}
	if parsed.CTAText == "" {
		return nil, fmt.Errorf("ctaText is required but was empty")
	}
	
	return &AdsGenerationResult{
		PrimaryText: parsed.PrimaryText,
		Headline:    parsed.Headline,
		Description: parsed.Description, // Optional
		CTAText:     parsed.CTAText,
	}, nil
}

// extractAdsFieldsFromText extracts ads fields from unstructured text (fallback)
func (g *AdsGenerator) extractAdsFieldsFromText(text string, req AdsGenerationRequest) (*AdsGenerationResult, error) {
	// Simple extraction logic (fallback)
	lines := strings.Split(text, "\n")
	
	result := &AdsGenerationResult{
		PrimaryText: "",
		Headline:    "",
		Description: "",
		CTAText:     "",
	}
	
	for _, line := range lines {
		line = strings.TrimSpace(line)
		if strings.Contains(strings.ToLower(line), "primary") || strings.Contains(strings.ToLower(line), "main text") {
			result.PrimaryText = line
		} else if strings.Contains(strings.ToLower(line), "headline") {
			result.Headline = line
		} else if strings.Contains(strings.ToLower(line), "description") {
			result.Description = line
		} else if strings.Contains(strings.ToLower(line), "cta") || strings.Contains(strings.ToLower(line), "call to action") {
			result.CTAText = line
		}
	}
	
	// If still empty, use first few lines as fallback
	if result.PrimaryText == "" && len(lines) > 0 {
		result.PrimaryText = lines[0]
	}
	if result.Headline == "" && len(lines) > 1 {
		result.Headline = lines[1]
	}
	if result.CTAText == "" {
		result.CTAText = "Learn More" // Default CTA
	}
	
	return result, nil
}

// callAI calls the AI API
func (g *AdsGenerator) callAI(prompt string, maxTokens int) (string, error) {
	log.Printf("[ADS GENERATOR] Calling AI API: prompt length=%d, maxTokens=%d", len(prompt), maxTokens)
	
	// Build request payload (OpenAI Chat Completions format)
	payload := map[string]interface{}{
		"model": g.model,
		"messages": []map[string]string{
			{
				"role":    "user",
				"content": prompt,
			},
		},
		"max_tokens": maxTokens,
		"temperature": 0.8, // Slightly higher temperature for creative ads copy
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
		log.Printf("[ADS GENERATOR] JSON parsing failed, trying direct extraction: %v", err)
		return string(body), nil
	}
	
	if len(apiResponse.Choices) == 0 {
		return "", fmt.Errorf("no choices in API response")
	}
	
	content := apiResponse.Choices[0].Message.Content
	log.Printf("[ADS GENERATOR] API response received: %d chars", len(content))
	
	return content, nil
}
