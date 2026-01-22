package seo

import (
	"fmt"
	"strings"
)

// KeywordValidationError represents a keyword validation failure
type KeywordValidationError struct {
	Rule    string
	Message string
}

func (e *KeywordValidationError) Error() string {
	return fmt.Sprintf("KEYWORD VALIDATION FAILED [%s]: %s", e.Rule, e.Message)
}

// ValidateKeywords validates keywords according to STEP 2 rules:
// - primary_keyword ≠ kosong (REQUIRED)
// - secondary_keywords[] (OPTIONAL)
// - NO validation for: keyword count, keyword density, keyword repetition
func ValidateKeywords(primaryKeyword string, secondaryKeywords []string) error {
	// STEP 2: WAJIB - primary_keyword tidak boleh kosong
	if strings.TrimSpace(primaryKeyword) == "" {
		return &KeywordValidationError{
			Rule:    "PRIMARY_KEYWORD_EMPTY",
			Message: "Primary keyword is required and cannot be empty",
		}
	}

	// STEP 2: OPTIONAL - secondary_keywords boleh kosong (no validation)
	// No validation for:
	// - Keyword count (allowed 0-N)
	// - Keyword density (not validated)
	// - Keyword repetition (not validated)

	return nil
}
