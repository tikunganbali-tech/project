package v2

// FrontendContentPackage represents the complete content package for frontend
// PHASE 1.2: LOCKED OUTPUT CONTRACT - DO NOT CHANGE
type FrontendContentPackage struct {
	// Page Type
	PageType string `json:"pageType"` // "blog" | "product" | "category" | "homepage"

	// Title & Hero
	Title    string `json:"title"`    // Main title (H1)
	HeroCopy string `json:"heroCopy"`  // Hero section copy (lead paragraph)

	// Sections
	Sections []ContentSection `json:"sections"` // Array of sections

	// CTA
	CTA CTAInfo `json:"cta"` // Call-to-action

	// Microcopy
	Microcopy MicrocopyInfo `json:"microcopy"` // Supporting information

	// Tone
	Tone ToneInfo `json:"tone"` // Content tone and style

	// Metadata (Internal)
	Metadata MetadataInfo `json:"metadata"` // Internal metadata
}

// ContentSection represents a single content section
type ContentSection struct {
	Heading     string `json:"heading"`     // Section heading
	HeadingLevel int   `json:"headingLevel"` // 2 or 3
	Body        string `json:"body"`       // Section body content (markdown)
	Order       int    `json:"order"`       // Display order
}

// CTAInfo represents call-to-action information
type CTAInfo struct {
	Text     string `json:"text"`     // CTA button text
	Action   string `json:"action"`   // CTA action (e.g., "contact", "buy", "learn")
	Placement string `json:"placement"` // "inline" | "bottom" | "both"
}

// MicrocopyInfo represents supporting microcopy
type MicrocopyInfo struct {
	ReadingTime string   `json:"readingTime,omitempty"` // "5 menit membaca"
	LastUpdated string   `json:"lastUpdated,omitempty"`  // "Diperbarui 19 Des 2024"
	Author      string   `json:"author,omitempty"`      // Author name
	Tags        []string `json:"tags,omitempty"`        // Content tags
}

// ToneInfo represents content tone and style
type ToneInfo struct {
	Style         string `json:"style"`         // "informative" | "conversational" | "professional" | "friendly"
	Formality     string `json:"formality"`    // "formal" | "semi-formal" | "casual"
	TargetAudience string `json:"targetAudience"` // e.g., "petani pemula"
}

// MetadataInfo represents internal metadata
type MetadataInfo struct {
	Version     int    `json:"version"`     // Version number (increments on each generate)
	GeneratedAt  string `json:"generatedAt"` // ISO 8601 timestamp
	ContentType string `json:"contentType"` // Content type identifier
	WordCount   int    `json:"wordCount"`   // Actual word count
	ReadingTime int    `json:"readingTime"` // Estimated reading time in minutes
}

// BrandContext represents brand information for content generation
// PHASE 7A: Brand-aware generation
type BrandContext struct {
	BrandID     string `json:"brandId"`     // Brand ID (immutable)
	BrandName   string `json:"brandName"`   // Brand name
	BrandSlug   string `json:"brandSlug"`   // Brand slug
	BrandStatus string `json:"brandStatus"` // "ACTIVE" | "INACTIVE"
	Domain      string `json:"domain,omitempty"`      // Optional custom domain
	Subdomain   string `json:"subdomain,omitempty"`   // Optional subdomain
}

// LocaleContext represents locale/language information for content generation
// PHASE 7B: Language-aware generation
type LocaleContext struct {
	LocaleID     string `json:"localeId"`     // Locale ID (immutable)
	LocaleCode   string `json:"localeCode"`   // e.g. "id-ID", "en-US"
	LanguageName string `json:"languageName"`  // e.g. "Indonesian", "English (US)"
	IsDefault    bool   `json:"isDefault"`     // Is default locale for brand
	IsActive     bool   `json:"isActive"`      // Is locale active
}

// GenerationRequest represents a request for content generation
// PHASE 1.3: NO SEO, NO VALIDATOR - Pure AI generation
// PHASE 7A: Brand-aware generation
// PHASE 7B: Language-aware generation
type GenerationRequest struct {
	PageType      string         `json:"pageType"`      // "blog" | "product" | "category" | "homepage"
	Topic         string         `json:"topic"`         // Main topic/keyword
	Language      string         `json:"language"`     // "id-ID" (deprecated, use LocaleContext)
	TargetAudience string        `json:"targetAudience"` // Target audience
	Tone          string         `json:"tone,omitempty"` // Optional tone override
	Outline       string         `json:"outline,omitempty"` // Optional outline to follow
	BrandContext  *BrandContext  `json:"brandContext,omitempty"` // PHASE 7A: Brand context (REQUIRED)
	LocaleContext *LocaleContext  `json:"localeContext,omitempty"` // PHASE 7B: Locale context (REQUIRED)
}

// GenerationResult represents the result of content generation
type GenerationResult struct {
	Package FrontendContentPackage `json:"package"` // Complete content package
	Status  string                 `json:"status"`  // "SUCCESS" | "FAILED"
	Error   string                 `json:"error,omitempty"` // Error message if failed
}
