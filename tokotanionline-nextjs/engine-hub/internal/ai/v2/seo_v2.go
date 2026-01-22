package v2

import (
	"encoding/json"
	"fmt"
	"io/ioutil"
	"log"
	"os"
	"path/filepath"
	"time"
)

// SEOv2 handles SEO optimization POST-PUBLISH only
// PHASE 3: SEO v2 HANYA mendengar CONTENT_PUBLISHED dan USER_INTERACTION_UPDATED
// SEO v2 TIDAK BOLEH: mengubah konten, memblokir publish, rewrite artikel
// SEO v2 BOLEH: generate metadata, generate schema, menghasilkan SEO_QC_REPORT
type SEOv2 struct {
	storageDir string
}

// NewSEOv2 creates a new SEO v2 instance
func NewSEOv2() *SEOv2 {
	storageDir := os.Getenv("AI_V2_STORAGE_DIR")
	if storageDir == "" {
		storageDir = "./storage/ai-v2"
	}
	
	return &SEOv2{
		storageDir: storageDir,
	}
}

// SEOQCReport represents SEO quality control report
// PHASE 7A: Brand-aware SEO report
// PHASE 7B: Locale-aware SEO report
type SEOQCReport struct {
	PageID      string                 `json:"pageId"`
	Version     int                    `json:"version"`
	BrandID     string                 `json:"brandId"`     // PHASE 7A: Brand isolation
	LocaleID    string                 `json:"localeId"`    // PHASE 7B: Locale isolation
	GeneratedAt string                 `json:"generatedAt"`
	Score       int                    `json:"score"` // 0-100
	Issues      []SEOIssue             `json:"issues"`
	Recommendations []SEORecommendation `json:"recommendations"`
	Metadata    SEOMetadata            `json:"metadata"`
	Schema      map[string]interface{} `json:"schema,omitempty"`
}

// SEOIssue represents an SEO issue found
type SEOIssue struct {
	Type        string `json:"type"`        // "MISSING_META", "LOW_WORD_COUNT", etc.
	Severity    string `json:"severity"`    // "LOW", "MEDIUM", "HIGH"
	Message     string `json:"message"`
	Recommendation string `json:"recommendation"`
}

// SEORecommendation represents an SEO recommendation
type SEORecommendation struct {
	Type    string `json:"type"`
	Message string `json:"message"`
	Action  string `json:"action"` // "ADD_META", "IMPROVE_HEADING", etc.
}

// SEOMetadata represents generated SEO metadata
// PHASE 7B: Locale-aware metadata with hreflang
type SEOMetadata struct {
	Title       string   `json:"title"`
	Description string   `json:"description"`
	Keywords    []string `json:"keywords"`
	Canonical   string   `json:"canonical"`
	Hreflang    string   `json:"hreflang,omitempty"` // PHASE 7B: hreflang tag (e.g., "id-ID", "en-US")
}

// HandleContentPublished handles CONTENT_PUBLISHED event
// PHASE 3: SEO v2 hanya aktif POST-PUBLISH
// PHASE 7A: Brand-aware SEO processing
func (s *SEOv2) HandleContentPublished(payload EventPayload) {
	log.Printf("[SEO V2] Handling CONTENT_PUBLISHED: pageId=%s, version=%d", payload.PageID, payload.Version)
	
	// PHASE 7A: Extract brand context from event payload
	brandID := ""
	if payload.Data != nil {
		if bid, ok := payload.Data["brandId"].(string); ok {
			brandID = bid
		}
	}
	
	// PHASE 7A: Guardrail - brand_id is required
	if brandID == "" {
		log.Printf("[SEO V2] PHASE 7A GUARDRAIL: Brand ID missing in event payload. Skipping SEO processing.")
		return
	}
	
	// PHASE 7B: Extract locale context from event payload
	localeID := ""
	localeCode := ""
	if payload.Data != nil {
		if lid, ok := payload.Data["localeId"].(string); ok {
			localeID = lid
		}
		if lc, ok := payload.Data["localeCode"].(string); ok {
			localeCode = lc
		}
	}
	
	// PHASE 7B: Guardrail - locale_id is required
	if localeID == "" {
		log.Printf("[SEO V2] PHASE 7B GUARDRAIL: Locale ID missing in event payload. Skipping SEO processing.")
		return
	}
	
	log.Printf("[SEO V2] Brand context: brandId=%s", brandID)
	log.Printf("[SEO V2] Locale context: localeId=%s, localeCode=%s", localeID, localeCode)
	
	// Get content from storage
	storage := NewStorage()
	content, err := storage.Get(payload.PageID, payload.Version)
	if err != nil {
		log.Printf("[SEO V2] Failed to get content: %v", err)
		return
	}
	
	// PHASE 3: Generate metadata (READ-ONLY, tidak mengubah konten)
	// PHASE 7A: Brand-aware metadata generation
	// PHASE 7B: Locale-aware metadata generation
	metadata := s.generateMetadata(content.Package, brandID, localeID, localeCode)
	
	// PHASE 3: Generate schema
	// PHASE 7A: Brand-aware schema generation
	// PHASE 7B: Locale-aware schema generation
	schema := s.generateSchema(content.Package, brandID, localeID, localeCode)
	
	// PHASE 3: Generate QC report
	// PHASE 7A: Brand-aware QC report
	// PHASE 7B: Locale-aware QC report
	report := s.generateQCReport(content.Package, metadata, payload.PageID, brandID, localeID)
	
	// Save SEO report (separate from content, tidak mengubah konten)
	s.saveSEOReport(payload.PageID, payload.Version, report, metadata, schema)
	
	// PHASE 4: Determine QC status based on threshold
	threshold := DefaultQCThreshold()
	qcStatus := DetermineQCStatus(report.Score, threshold)
	
	// Save QC artefact
	qcStore := NewQCStore()
	qcArtefact := QCArtefact{
		PageID:    payload.PageID,
		Version:   payload.Version,
		QCStatus:  qcStatus,
		SEOReport: &report,
		Timestamp: time.Now().Format(time.RFC3339),
	}
	if err := qcStore.SaveQCArtefact(qcArtefact); err != nil {
		log.Printf("[SEO V2] Failed to save QC artefact: %v", err)
	}
	
	// PHASE 4: Jika PERLU_REVISI, emit CONTENT_REVISION_REQUESTED dengan payload lengkap
	// PHASE 5: Check if we should use strategy-based revision
	if qcStatus == QCStatusPerluRevisi {
		// Get interaction data if available (from previous USER_INTERACTION_UPDATED)
		interactionData := map[string]interface{}{}
		// Try to get from stored interaction data
		userSignalAgg := NewUserSignalAggregator()
		userSignals, err := userSignalAgg.GetAggregated(payload.PageID, payload.Version)
		if err == nil {
			interactionData["dwellTime"] = userSignals.AvgDwellTime
			interactionData["bounceRate"] = userSignals.AvgBounceRate
			interactionData["scrollDepth"] = userSignals.AvgScrollDepth
		}
		
		// PHASE 5: Try to build strategy-based revision
		strategyBuilder := NewStrategyBuilder()
		strategy, err := strategyBuilder.BuildStrategy(payload.PageID, payload.Version)
		
		if err == nil && strategy != nil {
			// PHASE 5: Use strategy-based revision
			log.Printf("[SEO V2] Using strategy-based revision: pageId=%s, version=%d", payload.PageID, payload.Version)
			EmitRevisionRequestWithStrategy(payload.PageID, payload.Version, payload.PageType, strategy)
		} else {
			// PHASE 4: Fallback to standard revision payload
			revisionPayload := BuildRevisionRequestPayload(payload.PageID, payload.Version, &report, interactionData)
			
			emitter := GetEventEmitter()
			emitter.EmitContentRevisionRequestedWithPayload(payload.PageID, payload.Version, payload.PageType, revisionPayload)
			log.Printf("[SEO V2] Emitted CONTENT_REVISION_REQUESTED: pageId=%s, version=%d, score=%d, status=%s", 
				payload.PageID, payload.Version, report.Score, qcStatus)
		}
	}
	
	log.Printf("[SEO V2] SEO processing complete: pageId=%s, version=%d, score=%d", payload.PageID, payload.Version, report.Score)
}

// HandleUserInteractionUpdated handles USER_INTERACTION_UPDATED event
// PHASE 3: SEO v2 membaca data analytics sebagai input QC
// PHASE 4: Update QC status based on interaction data
func (s *SEOv2) HandleUserInteractionUpdated(payload EventPayload) {
	log.Printf("[SEO V2] Handling USER_INTERACTION_UPDATED: pageId=%s, version=%d", payload.PageID, payload.Version)
	
	// Extract interaction data
	interactionData := payload.Data
	if interactionData == nil {
		return
	}
	
	// Get current SEO report
	report, err := s.getSEOReport(payload.PageID, payload.Version)
	if err != nil {
		log.Printf("[SEO V2] No existing SEO report found: %v", err)
		return
	}
	
	// Update report with interaction data
	updatedReport := s.updateReportWithInteraction(*report, interactionData)
	
	// Save updated report
	s.saveSEOReport(payload.PageID, payload.Version, updatedReport, SEOMetadata{}, nil)
	
	// PHASE 4: Re-evaluate QC status with updated score
	threshold := DefaultQCThreshold()
	qcStatus := DetermineQCStatus(updatedReport.Score, threshold)
	
	// Update QC artefact
	qcStore := NewQCStore()
	artefact, err := qcStore.GetQCArtefact(payload.PageID, payload.Version)
	if err == nil {
		artefact.SEOReport = &updatedReport
		artefact.QCStatus = qcStatus
		artefact.Timestamp = time.Now().Format(time.RFC3339)
		qcStore.SaveQCArtefact(*artefact)
		
		// PHASE 4: Jika status berubah ke PERLU_REVISI, emit revision request
		if qcStatus == QCStatusPerluRevisi && artefact.QCStatus != QCStatusPerluRevisi {
			revisionPayload := BuildRevisionRequestPayload(payload.PageID, payload.Version, &updatedReport, interactionData)
			emitter := GetEventEmitter()
			emitter.EmitContentRevisionRequestedWithPayload(payload.PageID, payload.Version, payload.PageType, revisionPayload)
			log.Printf("[SEO V2] Status changed to PERLU_REVISI, emitted CONTENT_REVISION_REQUESTED")
		}
	}
	
	log.Printf("[SEO V2] Report updated with interaction data: pageId=%s, version=%d, newScore=%d, qcStatus=%s", 
		payload.PageID, payload.Version, updatedReport.Score, qcStatus)
}

// generateMetadata generates SEO metadata (READ-ONLY)
// PHASE 7A: Brand-aware metadata generation
// PHASE 7B: Locale-aware metadata generation
func (s *SEOv2) generateMetadata(pkg FrontendContentPackage, brandID string, localeID string, localeCode string) SEOMetadata {
	// Generate title (from package title, max 60 chars)
	title := pkg.Title
	if len(title) > 60 {
		title = title[:57] + "..."
	}
	
	// Generate description (from hero copy, max 160 chars)
	description := pkg.HeroCopy
	if len(description) > 160 {
		description = description[:157] + "..."
	}
	
	// Extract keywords from tags
	keywords := []string{}
	if pkg.Microcopy.Tags != nil {
		keywords = append(keywords, pkg.Microcopy.Tags...)
	}
	
	// PHASE 7A: Metadata is brand-specific - canonical URL should include brand context
	// PHASE 7B: Metadata is locale-specific - canonical URL should include locale context
	// Canonical will be set by caller with brand + locale context
	
	return SEOMetadata{
		Title:       title,
		Description: description,
		Keywords:    keywords,
		Canonical:   "", // Will be set by caller with brand + locale context
		Hreflang:    localeCode, // PHASE 7B: hreflang tag for locale
	}
}

// generateSchema generates structured data schema
// PHASE 7A: Brand-aware schema generation
// PHASE 7B: Locale-aware schema generation with inLanguage
func (s *SEOv2) generateSchema(pkg FrontendContentPackage, brandID string, localeID string, localeCode string) map[string]interface{} {
	schema := map[string]interface{}{
		"@context": "https://schema.org",
		"@type":    "Article",
		"headline": pkg.Title,
		"description": pkg.HeroCopy,
		"datePublished": pkg.Metadata.GeneratedAt,
		"wordCount": pkg.Metadata.WordCount,
	}
	
	// PHASE 7A: Schema is brand-specific - publisher should reference brand
	// PHASE 7B: Schema is locale-specific - add inLanguage field
	if localeCode != "" {
		schema["inLanguage"] = localeCode
	}
	
	// In production, you would fetch brand info and add publisher field
	
	if pkg.Microcopy.Author != "" {
		schema["author"] = map[string]interface{}{
			"@type": "Person",
			"name":  pkg.Microcopy.Author,
		}
	}
	
	return schema
}

// generateQCReport generates SEO quality control report
// PHASE 7A: Brand-aware QC report
// PHASE 7B: Locale-aware QC report
func (s *SEOv2) generateQCReport(pkg FrontendContentPackage, metadata SEOMetadata, pageID string, brandID string, localeID string) SEOQCReport {
	issues := []SEOIssue{}
	recommendations := []SEORecommendation{}
	score := 100
	
	// Check word count
	if pkg.Metadata.WordCount < 800 {
		issues = append(issues, SEOIssue{
			Type:        "LOW_WORD_COUNT",
			Severity:    "MEDIUM",
			Message:     fmt.Sprintf("Word count is %d, recommended minimum is 800", pkg.Metadata.WordCount),
			Recommendation: "Consider expanding content to improve SEO",
		})
		score -= 10
	}
	
	// Check sections
	if len(pkg.Sections) < 2 {
		issues = append(issues, SEOIssue{
			Type:        "INSUFFICIENT_SECTIONS",
			Severity:    "LOW",
			Message:     fmt.Sprintf("Only %d sections found, recommended minimum is 2", len(pkg.Sections)),
			Recommendation: "Add more sections to improve content structure",
		})
		score -= 5
	}
	
	// Check metadata
	if metadata.Title == "" {
		issues = append(issues, SEOIssue{
			Type:        "MISSING_META_TITLE",
			Severity:    "HIGH",
			Message:     "Meta title is missing",
			Recommendation: "Add meta title for better SEO",
		})
		score -= 15
	}
	
	if metadata.Description == "" {
		issues = append(issues, SEOIssue{
			Type:        "MISSING_META_DESCRIPTION",
			Severity:    "HIGH",
			Message:     "Meta description is missing",
			Recommendation: "Add meta description for better SEO",
		})
		score -= 15
	}
	
	// Ensure score is not negative
	if score < 0 {
		score = 0
	}
	
	// Generate recommendations
	if score < 80 {
		recommendations = append(recommendations, SEORecommendation{
			Type:    "IMPROVE_CONTENT",
			Message: "Content quality can be improved for better SEO performance",
			Action:  "REVIEW_AND_ENHANCE",
		})
	}
	
	return SEOQCReport{
		PageID:          pageID,
		Version:         pkg.Metadata.Version,
		BrandID:         brandID, // PHASE 7A: Brand isolation
		LocaleID:        localeID, // PHASE 7B: Locale isolation
		GeneratedAt:     time.Now().Format(time.RFC3339),
		Score:           score,
		Issues:          issues,
		Recommendations: recommendations,
		Metadata:        metadata,
	}
}

// updateReportWithInteraction updates report with user interaction data
func (s *SEOv2) updateReportWithInteraction(report SEOQCReport, interactionData map[string]interface{}) SEOQCReport {
	// Extract interaction metrics
	ctr, _ := interactionData["ctr"].(float64)
	dwellTime, _ := interactionData["dwellTime"].(float64)
	bounceRate, _ := interactionData["bounceRate"].(float64)
	
	// Update score based on interaction
	if ctr < 0.02 { // CTR < 2%
		report.Issues = append(report.Issues, SEOIssue{
			Type:        "LOW_CTR",
			Severity:    "MEDIUM",
			Message:     fmt.Sprintf("CTR is %.2f%%, below recommended 2%%", ctr*100),
			Recommendation: "Improve title and meta description to increase CTR",
		})
		report.Score -= 5
	}
	
	if bounceRate > 0.7 { // Bounce rate > 70%
		report.Issues = append(report.Issues, SEOIssue{
			Type:        "HIGH_BOUNCE_RATE",
			Severity:    "MEDIUM",
			Message:     fmt.Sprintf("Bounce rate is %.2f%%, above recommended 70%%", bounceRate*100),
			Recommendation: "Improve content engagement to reduce bounce rate",
		})
		report.Score -= 5
	}
	
	if dwellTime < 30 { // Dwell time < 30 seconds
		report.Issues = append(report.Issues, SEOIssue{
			Type:        "LOW_DWELL_TIME",
			Severity:    "LOW",
			Message:     fmt.Sprintf("Dwell time is %.0f seconds, below recommended 30 seconds", dwellTime),
			Recommendation: "Improve content quality to increase dwell time",
		})
		report.Score -= 3
	}
	
	// Ensure score is not negative
	if report.Score < 0 {
		report.Score = 0
	}
	
	return report
}

// saveSEOReport saves SEO report to storage
func (s *SEOv2) saveSEOReport(pageID string, version int, report SEOQCReport, metadata SEOMetadata, schema map[string]interface{}) {
	// Save to file: storage/{page_id}/v{version}_seo.json
	pageDir := filepath.Join(s.storageDir, pageID)
	os.MkdirAll(pageDir, 0755)
	
	filename := filepath.Join(pageDir, fmt.Sprintf("v%d_seo.json", version))
	
	seoData := map[string]interface{}{
		"report":   report,
		"metadata": metadata,
		"schema":   schema,
	}
	
	data, err := json.MarshalIndent(seoData, "", "  ")
	if err != nil {
		log.Printf("[SEO V2] Failed to marshal SEO data: %v", err)
		return
	}
	
	if err := ioutil.WriteFile(filename, data, 0644); err != nil {
		log.Printf("[SEO V2] Failed to save SEO report: %v", err)
		return
	}
	
	log.Printf("[SEO V2] SEO report saved: %s", filename)
}

// getSEOReport retrieves SEO report from storage
// PHASE 7C: Made public for insight aggregator (read-only access)
func (s *SEOv2) GetSEOReport(pageID string, version int) (*SEOQCReport, error) {
	return s.getSEOReport(pageID, version)
}

// getSEOReport retrieves SEO report from storage (internal)
func (s *SEOv2) getSEOReport(pageID string, version int) (*SEOQCReport, error) {
	filename := filepath.Join(s.storageDir, pageID, fmt.Sprintf("v%d_seo.json", version))
	
	data, err := ioutil.ReadFile(filename)
	if err != nil {
		return nil, err
	}
	
	var seoData map[string]interface{}
	if err := json.Unmarshal(data, &seoData); err != nil {
		return nil, err
	}
	
	reportData, ok := seoData["report"].(map[string]interface{})
	if !ok {
		return nil, fmt.Errorf("invalid report data")
	}
	
	reportJSON, err := json.Marshal(reportData)
	if err != nil {
		return nil, err
	}
	
	var report SEOQCReport
	if err := json.Unmarshal(reportJSON, &report); err != nil {
		return nil, err
	}
	
	return &report, nil
}
