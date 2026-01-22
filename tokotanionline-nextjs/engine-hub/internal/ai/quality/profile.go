package quality

import "fmt"

// QualityProfile defines the non-negotiable baseline (B) requirements
// This is a QUALITY CONTRACT - not a suggestion, but a hard requirement
type QualityProfile struct {
	// Word count range (natural, not forced)
	MinWordCount int `json:"minWordCount"` // 1200
	MaxWordCount int `json:"maxWordCount"` // 2000

	// Content depth - measures how substantive the content is
	DepthScoreMin float64 `json:"depthScoreMin"` // 0.75 (0-1 scale)

	// Repetition - how much content repeats itself
	RepetitionMax float64 `json:"repetitionMax"` // 0.05 (5% max repetition rate)

	// Structure compliance - adherence to outline structure
	StructureCompliance float64 `json:"structureCompliance"` // 1.0 (100% compliance required)

	// Human readability - basic readability test
	HumanReadability string `json:"humanReadability"` // "PASS" required
}

// DefaultQualityProfile returns the baseline B profile (NON-NEGOTIABLE)
// For CORNERSTONE content
func DefaultQualityProfile() QualityProfile {
	return QualityProfile{
		MinWordCount:        1200,
		MaxWordCount:        2000,
		DepthScoreMin:       0.75,
		RepetitionMax:       0.05, // 5%
		StructureCompliance: 1.0,  // 100%
		HumanReadability:    "PASS",
	}
}

// DerivativeQualityProfile returns the profile for DERIVATIVE content
// Natural range: 650-1000 words (not hard target)
func DerivativeQualityProfile() QualityProfile {
	return QualityProfile{
		MinWordCount:        650,
		MaxWordCount:        1000,
		DepthScoreMin:       0.7,
		RepetitionMax:       0.05, // 5%
		StructureCompliance: 1.0,  // 100%
		HumanReadability:    "PASS",
	}
}

// DerivativeLongQualityProfile returns the profile for DERIVATIVE_LONG content
// Natural range: 1200-2000 words with extension layer (core + Q&A + tutorial/praktis)
func DerivativeLongQualityProfile() QualityProfile {
	return QualityProfile{
		MinWordCount:        1200,
		MaxWordCount:        2000,
		DepthScoreMin:       0.75,
		RepetitionMax:       0.05, // 5%
		StructureCompliance: 1.0,  // 100%
		HumanReadability:    "PASS",
	}
}

// Pass returns true if all metrics pass the quality profile requirements
func (qp QualityProfile) Pass(metrics Metrics) bool {
	// Word count check
	if metrics.WordCount < qp.MinWordCount || metrics.WordCount > qp.MaxWordCount {
		return false
	}

	// Depth score check
	if metrics.DepthScore < qp.DepthScoreMin {
		return false
	}

	// Repetition rate check
	if metrics.RepetitionRate > qp.RepetitionMax {
		return false
	}

	// Structure compliance check
	if metrics.StructureCompliance < qp.StructureCompliance {
		return false
	}

	// Human readability check
	if metrics.HumanReadability != qp.HumanReadability {
		return false
	}

	return true
}

// GetFailureReasons returns a list of reasons why the metrics failed the profile
func (qp QualityProfile) GetFailureReasons(metrics Metrics) []string {
	var reasons []string

	if metrics.WordCount < qp.MinWordCount {
		reasons = append(reasons, fmt.Sprintf("Word count too low: %d < %d", metrics.WordCount, qp.MinWordCount))
	}
	if metrics.WordCount > qp.MaxWordCount {
		reasons = append(reasons, fmt.Sprintf("Word count too high: %d > %d", metrics.WordCount, qp.MaxWordCount))
	}

	if metrics.DepthScore < qp.DepthScoreMin {
		reasons = append(reasons, fmt.Sprintf("Depth score too low: %.2f < %.2f", metrics.DepthScore, qp.DepthScoreMin))
	}

	if metrics.RepetitionRate > qp.RepetitionMax {
		reasons = append(reasons, fmt.Sprintf("Repetition rate too high: %.2f%% > %.2f%%", metrics.RepetitionRate*100, qp.RepetitionMax*100))
	}

	if metrics.StructureCompliance < qp.StructureCompliance {
		reasons = append(reasons, fmt.Sprintf("Structure compliance too low: %.2f%% < %.2f%%", metrics.StructureCompliance*100, qp.StructureCompliance*100))
	}

	if metrics.HumanReadability != qp.HumanReadability {
		reasons = append(reasons, fmt.Sprintf("Human readability failed: %s != %s", metrics.HumanReadability, qp.HumanReadability))
	}

	return reasons
}
