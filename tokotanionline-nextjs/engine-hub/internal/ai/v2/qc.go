package v2

import (
	"encoding/json"
	"fmt"
	"io/ioutil"
	"log"
	"os"
	"path/filepath"
)

// QCStatus represents QC status
// PHASE 4: Status QC hanya LAYAK atau PERLU_REVISI
type QCStatus string

const (
	QCStatusLayak        QCStatus = "LAYAK"
	QCStatusPerluRevisi  QCStatus = "PERLU_REVISI"
)

// QCThreshold represents QC threshold configuration
// PHASE 4: Threshold skor SEO (mis. < 60 = PERLU_REVISI)
type QCThreshold struct {
	MinScoreForLayak int `json:"minScoreForLayak"` // Default: 60
}

// DefaultQCThreshold returns default threshold
func DefaultQCThreshold() QCThreshold {
	return QCThreshold{
		MinScoreForLayak: 60, // PHASE 4: < 60 = PERLU_REVISI
	}
}

// DetermineQCStatus determines QC status based on SEO score
// PHASE 4: Threshold & Status QC
func DetermineQCStatus(seoScore int, threshold QCThreshold) QCStatus {
	if seoScore >= threshold.MinScoreForLayak {
		return QCStatusLayak
	}
	return QCStatusPerluRevisi
}

// RevisionRequestPayload represents complete revision request payload
// PHASE 4: Payload harus memuat page_id, current_version, reasons[], data_serp, user_signals
type RevisionRequestPayload struct {
	PageID        string                 `json:"pageId"`
	CurrentVersion int                   `json:"currentVersion"`
	Reasons       []RevisionReason       `json:"reasons"`
	DataSERP      map[string]interface{} `json:"dataSerp,omitempty"`
	UserSignals   map[string]interface{} `json:"userSignals,omitempty"`
	SEOReport     *SEOQCReport           `json:"seoReport,omitempty"`
}

// RevisionReason represents a reason for revision
type RevisionReason struct {
	Type        string `json:"type"`        // "LOW_SCORE", "LOW_CTR", "HIGH_BOUNCE", etc.
	Severity    string `json:"severity"`    // "LOW", "MEDIUM", "HIGH"
	Message     string `json:"message"`
	Recommendation string `json:"recommendation"`
}

// QCArtefact represents stored QC artefact
// PHASE 4: Simpan SEO_QC_REPORT, keputusan admin, timestamp & version
type QCArtefact struct {
	PageID         string                 `json:"pageId"`
	Version        int                    `json:"version"`
	QCStatus       QCStatus               `json:"qcStatus"`
	SEOReport      *SEOQCReport           `json:"seoReport"`
	AdminDecision  *AdminDecision         `json:"adminDecision,omitempty"`
	Timestamp      string                 `json:"timestamp"`
	RevisionRequest *RevisionRequestPayload `json:"revisionRequest,omitempty"`
}

// AdminDecision represents admin decision in review gate
// PHASE 4: Admin hanya menerima versi baru atau reject
type AdminDecision struct {
	Decision   string `json:"decision"`   // "ACCEPT" | "REJECT"
	Reason     string `json:"reason,omitempty"`
	AdminID    string `json:"adminId,omitempty"`
	Timestamp  string `json:"timestamp"`
}

// QCStore handles QC artefact storage
// PHASE 4: Media bebas (DB / file) asal konsisten
type QCStore struct {
	storageDir string
}

// NewQCStore creates a new QC store
func NewQCStore() *QCStore {
	storageDir := os.Getenv("AI_V2_STORAGE_DIR")
	if storageDir == "" {
		storageDir = "./storage/ai-v2"
	}
	
	// Ensure QC directory exists
	qcDir := filepath.Join(storageDir, "qc")
	os.MkdirAll(qcDir, 0755)
	
	return &QCStore{
		storageDir: qcDir,
	}
}

// SaveQCArtefact saves QC artefact
// PHASE 4: Simpan SEO_QC_REPORT, keputusan admin, timestamp & version
func (s *QCStore) SaveQCArtefact(artefact QCArtefact) error {
	// Save to file: storage/qc/{page_id}/v{version}_qc.json
	pageDir := filepath.Join(s.storageDir, artefact.PageID)
	os.MkdirAll(pageDir, 0755)
	
	filename := filepath.Join(pageDir, fmt.Sprintf("v%d_qc.json", artefact.Version))
	
	data, err := json.MarshalIndent(artefact, "", "  ")
	if err != nil {
		return fmt.Errorf("failed to marshal QC artefact: %w", err)
	}
	
	if err := ioutil.WriteFile(filename, data, 0644); err != nil {
		return fmt.Errorf("failed to write QC artefact: %w", err)
	}
	
	log.Printf("[QC STORE] Saved QC artefact: pageId=%s, version=%d, status=%s", artefact.PageID, artefact.Version, artefact.QCStatus)
	return nil
}

// GetQCArtefact retrieves QC artefact
func (s *QCStore) GetQCArtefact(pageID string, version int) (*QCArtefact, error) {
	filename := filepath.Join(s.storageDir, pageID, fmt.Sprintf("v%d_qc.json", version))
	
	data, err := ioutil.ReadFile(filename)
	if err != nil {
		return nil, err
	}
	
	var artefact QCArtefact
	if err := json.Unmarshal(data, &artefact); err != nil {
		return nil, err
	}
	
	return &artefact, nil
}

// BuildRevisionRequestPayload builds complete revision request payload
// PHASE 4: Payload lengkap dengan reasons, data_serp, user_signals
func BuildRevisionRequestPayload(
	pageID string,
	version int,
	seoReport *SEOQCReport,
	interactionData map[string]interface{},
) RevisionRequestPayload {
	// Build reasons from SEO report issues
	reasons := []RevisionReason{}
	for _, issue := range seoReport.Issues {
		reasons = append(reasons, RevisionReason{
			Type:          issue.Type,
			Severity:      issue.Severity,
			Message:       issue.Message,
			Recommendation: issue.Recommendation,
		})
	}
	
	// Build data_serp (mock for now, should come from actual SERP data)
	dataSERP := map[string]interface{}{
		"position": nil, // Will be filled from actual SERP tracking
		"ctr":      interactionData["ctr"],
		"impressions": nil,
	}
	
	// Build user_signals from interaction data
	userSignals := map[string]interface{}{
		"ctr":        interactionData["ctr"],
		"dwellTime":  interactionData["dwellTime"],
		"bounceRate": interactionData["bounceRate"],
	}
	
	return RevisionRequestPayload{
		PageID:         pageID,
		CurrentVersion: version,
		Reasons:        reasons,
		DataSERP:       dataSERP,
		UserSignals:    userSignals,
		SEOReport:      seoReport,
	}
}
