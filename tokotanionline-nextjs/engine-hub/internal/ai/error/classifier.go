package error

import (
	"fmt"
	"strings"
)

// ErrorType represents the type of error according to KONTRAK FINAL
type ErrorType string

const (
	// AI_ERROR - Model gagal jawab (retryable)
	ErrorTypeAI ErrorType = "AI_ERROR"

	// STRUCTURE_ERROR - Format rusak (non-retryable)
	ErrorTypeStructure ErrorType = "STRUCTURE_ERROR"

	// QUALITY_ERROR - Konten buruk (non-retryable)
	ErrorTypeQuality ErrorType = "QUALITY_ERROR"

	// INFRA_ERROR - API / timeout (retryable)
	ErrorTypeInfra ErrorType = "INFRA_ERROR"
)

// ClassifiedError represents an error with classification
type ClassifiedError struct {
	Type    ErrorType
	Message string
	Original error
}

func (e *ClassifiedError) Error() string {
	return fmt.Sprintf("[%s] %s: %v", e.Type, e.Message, e.Original)
}

// ClassifyFailure classifies an error according to KONTRAK FINAL
// KONTRAK FINAL: Setiap kegagalan WAJIB diklasifikasikan
func ClassifyFailure(err error) *ClassifiedError {
	if err == nil {
		return nil
	}

	errStr := strings.ToLower(err.Error())

	// STRUCTURE_ERROR - Format rusak (non-retryable)
	if isStructureError(errStr) {
		return &ClassifiedError{
			Type:     ErrorTypeStructure,
			Message:  "Format rusak - JSON invalid, missing fields, atau struktur tidak sesuai",
			Original: err,
		}
	}

	// QUALITY_ERROR - Konten buruk (non-retryable)
	if isQualityError(errStr) {
		return &ClassifiedError{
			Type:     ErrorTypeQuality,
			Message:  "Konten buruk - Validation failed, kualitas tidak memenuhi standar",
			Original: err,
		}
	}

	// INFRA_ERROR - API / timeout (retryable)
	if isInfraError(errStr) {
		return &ClassifiedError{
			Type:     ErrorTypeInfra,
			Message:  "Infrastruktur error - API timeout, network, atau service down",
			Original: err,
		}
	}

	// AI_ERROR - Model gagal jawab (retryable)
	// Default untuk error AI yang tidak masuk kategori lain
	return &ClassifiedError{
		Type:     ErrorTypeAI,
		Message:  "Model gagal jawab - API rate limit, model error, atau response invalid",
		Original: err,
	}
}

// isStructureError checks if error is structure-related (non-retryable)
func isStructureError(errStr string) bool {
	structurePatterns := []string{
		"invalid request",
		"invalid request body",
		"failed to parse",
		"failed to decode",
		"json",
		"missing field",
		"invalid format",
		"structure",
		"outline",
		"heading",
		"meta_description",
		"meta_desc",
		"outline kosong",
		"content tanpa heading",
	}

	for _, pattern := range structurePatterns {
		if strings.Contains(errStr, pattern) {
			return true
		}
	}

	return false
}

// isQualityError checks if error is quality-related (non-retryable)
func isQualityError(errStr string) bool {
	qualityPatterns := []string{
		"validation failed",
		"validation error",
		"word_count",
		"cta_jualan",
		"kata_terlarang",
		"nama_merek",
		"nada_promosi",
		"heading_tidak_sesuai",
		"keyword stuffing",
		"content_failed",
		"quality",
		"prohibited",
		"promotional",
	}

	for _, pattern := range qualityPatterns {
		if strings.Contains(errStr, pattern) {
			return true
		}
	}

	return false
}

// isInfraError checks if error is infrastructure-related (retryable)
func isInfraError(errStr string) bool {
	infraPatterns := []string{
		"timeout",
		"deadline exceeded",
		"context deadline",
		"network",
		"connection",
		"dial",
		"no such host",
		"connection refused",
		"connection reset",
		"api request failed",
		"failed to create request",
		"500",
		"502",
		"503",
		"504",
		"service unavailable",
		"bad gateway",
		"gateway timeout",
		"api key",
		"authentication",
		"unauthorized",
		"401",
		"403",
		"rate limit",
		"too many requests",
		"429",
	}

	for _, pattern := range infraPatterns {
		if strings.Contains(errStr, pattern) {
			return true
		}
	}

	return false
}

// IsRetryable checks if error is retryable according to KONTRAK FINAL
// KONTRAK FINAL: Retry hanya untuk AI_ERROR dan INFRA_ERROR
func IsRetryable(err error) bool {
	classified := ClassifyFailure(err)
	if classified == nil {
		return false
	}

	return classified.Type == ErrorTypeAI || classified.Type == ErrorTypeInfra
}

// GetErrorType returns the error type
func GetErrorType(err error) ErrorType {
	classified := ClassifyFailure(err)
	if classified == nil {
		return ErrorTypeAI // Default
	}

	return classified.Type
}
