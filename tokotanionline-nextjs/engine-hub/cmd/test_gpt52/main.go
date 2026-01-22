package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
)

func main() {
	apiKey := os.Getenv("OPENAI_API_KEY")
	if apiKey == "" {
		fmt.Println("ERROR: OPENAI_API_KEY environment variable not set")
		os.Exit(1)
	}

	payload := map[string]interface{}{
		"model":           "gpt-5.2",
		"input":           "Tulis artikel panjang minimal 900 kata tentang pertanian organik di Indonesia. Gunakan H2 dan H3.",
		"max_output_tokens": 4096,
	}

	body, err := json.Marshal(payload)
	if err != nil {
		fmt.Printf("ERROR marshaling payload: %v\n", err)
		os.Exit(1)
	}

	req, err := http.NewRequest(
		"POST",
		"https://api.openai.com/v1/responses",
		bytes.NewBuffer(body),
	)
	if err != nil {
		fmt.Printf("ERROR creating request: %v\n", err)
		os.Exit(1)
	}

	req.Header.Set("Authorization", "Bearer "+apiKey)
	req.Header.Set("Content-Type", "application/json")

	fmt.Println("=== SENDING REQUEST ===")
	fmt.Printf("URL: %s\n", req.URL.String())
	fmt.Printf("Model: %s\n", payload["model"])
	fmt.Printf("Input length: %d characters\n", len(payload["input"].(string)))
	fmt.Println()

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		fmt.Printf("ERROR making request: %v\n", err)
		os.Exit(1)
	}
	defer resp.Body.Close()

	fmt.Printf("=== RESPONSE STATUS ===\n")
	fmt.Printf("Status Code: %d %s\n", resp.StatusCode, resp.Status)
	fmt.Println()

	raw, err := io.ReadAll(resp.Body)
	if err != nil {
		fmt.Printf("ERROR reading response: %v\n", err)
		os.Exit(1)
	}

	fmt.Println("=== RAW RESPONSE ===")
	fmt.Println(string(raw))
	fmt.Println()

	// Parse and show output length
	var result map[string]interface{}
	if err := json.Unmarshal(raw, &result); err == nil {
		if output, ok := result["output"].(string); ok {
			fmt.Printf("=== OUTPUT ANALYSIS ===\n")
			fmt.Printf("Output length: %d characters\n", len(output))
			fmt.Printf("Word count (approx): %d words\n", len(bytes.Fields([]byte(output))))
			fmt.Println()
			fmt.Println("=== OUTPUT PREVIEW (first 500 chars) ===")
			if len(output) > 500 {
				fmt.Println(output[:500] + "...")
			} else {
				fmt.Println(output)
			}
		}
	}
}
