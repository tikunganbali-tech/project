package content

// ContentType represents the type of content to generate
type ContentType string

const (
	ContentCornerstone   ContentType = "CORNERSTONE"
	ContentDerivative    ContentType = "DERIVATIVE"
	ContentDerivativeLong ContentType = "DERIVATIVE_LONG"
	ContentUseCase       ContentType = "USE_CASE"
)

// IsValidContentType checks if the content type is valid
func IsValidContentType(ct ContentType) bool {
	switch ct {
	case ContentCornerstone, ContentDerivative, ContentDerivativeLong, ContentUseCase:
		return true
	default:
		return false
	}
}

// String returns the string representation of ContentType
func (ct ContentType) String() string {
	return string(ct)
}
