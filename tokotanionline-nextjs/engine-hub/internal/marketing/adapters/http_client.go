package adapters

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"time"
)

// HTTPClient is a configured HTTP client for marketing API calls
type HTTPClient struct {
	client  *http.Client
	timeout time.Duration
	maxRetry int
}

// NewHTTPClient creates a new HTTP client with strict timeout and retry limits
func NewHTTPClient() *HTTPClient {
	timeout := 2 * time.Second // Strict ≤2s timeout
	maxRetry := 1              // Max 1 retry (0-1 total attempts = max 2 attempts)
	
	return &HTTPClient{
		client: &http.Client{
			Timeout: timeout,
		},
		timeout:  timeout,
		maxRetry: maxRetry,
	}
}

// Send performs an HTTP POST request with retry logic
// Returns (statusCode, responseBody, error)
func (c *HTTPClient) Send(url string, headers map[string]string, payload interface{}) (int, []byte, error) {
	// Marshal payload
	jsonData, err := json.Marshal(payload)
	if err != nil {
		return 0, nil, fmt.Errorf("failed to marshal payload: %w", err)
	}

	// Try up to maxRetry+1 times (initial attempt + retries)
	var lastErr error
	var lastStatusCode int
	var lastBody []byte
	
	for attempt := 0; attempt <= c.maxRetry; attempt++ {
		if attempt > 0 {
			// Brief delay before retry (non-aggressive)
			time.Sleep(100 * time.Millisecond)
		}
		
		// Create request
		req, err := http.NewRequest("POST", url, bytes.NewBuffer(jsonData))
		if err != nil {
			lastErr = fmt.Errorf("failed to create request: %w", err)
			continue
		}
		
		// Set headers
		req.Header.Set("Content-Type", "application/json")
		for key, value := range headers {
			req.Header.Set(key, value)
		}
		
		// Send request
		resp, err := c.client.Do(req)
		if err != nil {
			lastErr = fmt.Errorf("request failed: %w", err)
			log.Printf("[HTTP CLIENT] Attempt %d/%d failed: %v", attempt+1, c.maxRetry+1, err)
			continue
		}
		
		// Read response body
		body, err := io.ReadAll(resp.Body)
		resp.Body.Close()
		
		lastStatusCode = resp.StatusCode
		lastBody = body
		
		if err != nil {
			lastErr = fmt.Errorf("failed to read response: %w", err)
			log.Printf("[HTTP CLIENT] Attempt %d/%d failed to read response: %v", attempt+1, c.maxRetry+1, err)
			continue
		}
		
		// Check status code
		if resp.StatusCode >= 200 && resp.StatusCode < 300 {
			// Success
			return resp.StatusCode, body, nil
		}
		
		// Non-2xx status - log but don't retry for 4xx (client errors)
		if resp.StatusCode >= 400 && resp.StatusCode < 500 {
			lastErr = fmt.Errorf("client error: status %d, body: %s", resp.StatusCode, string(body))
			return resp.StatusCode, body, lastErr
		}
		
		// 5xx or other - might retry
		lastErr = fmt.Errorf("server error: status %d, body: %s", resp.StatusCode, string(body))
		log.Printf("[HTTP CLIENT] Attempt %d/%d returned status %d", attempt+1, c.maxRetry+1, resp.StatusCode)
	}
	
	// All attempts failed
	return lastStatusCode, lastBody, lastErr
}

