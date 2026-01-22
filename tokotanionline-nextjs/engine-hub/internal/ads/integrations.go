package ads

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"time"
)

// PHASE 8A.3: Read-only Ads Data Ingestion
// Integrations for Meta Ads, Google Ads, TikTok Ads
// Data yang diambil: impressions, CTR, CPC, conversion
// Data tidak mengubah konten

// AdsIntegration represents a read-only ads platform integration
type AdsIntegration interface {
	// FetchPerformanceData fetches performance data from the platform
	// Returns: impressions, clicks, CTR, CPC, conversions, conversionValue, spend
	FetchPerformanceData(campaignID string, startDate, endDate time.Time) (*PerformanceData, error)
	
	// GetPlatformName returns the platform name (FB, Google, TikTok)
	GetPlatformName() string
}

// PerformanceData represents performance metrics from ads platforms
type PerformanceData struct {
	CampaignID       string    `json:"campaignId"`
	CreativeID       string    `json:"creativeId,omitempty"`
	Date             time.Time `json:"date"`
	Impressions      int       `json:"impressions"`
	Clicks           int       `json:"clicks"`
	CTR              float64   `json:"ctr"`              // Click-through rate
	CPC              *float64  `json:"cpc,omitempty"`    // Cost per click
	CPM              *float64  `json:"cpm,omitempty"`    // Cost per 1000 impressions
	Conversions      int       `json:"conversions"`
	ConversionValue  *float64  `json:"conversionValue,omitempty"` // Revenue
	Spend            *float64  `json:"spend,omitempty"`  // Total spend
	ExternalDataID   string    `json:"externalDataId,omitempty"` // Platform-specific ID
	Metadata         map[string]interface{} `json:"metadata,omitempty"`
}

// MetaAdsIntegration implements AdsIntegration for Meta/Facebook Ads
// PHASE 8A.3: Read-only ingestion
type MetaAdsIntegration struct {
	accessToken string
	apiVersion  string
	client      *http.Client
}

// NewMetaAdsIntegration creates a new Meta Ads integration
func NewMetaAdsIntegration(accessToken string) *MetaAdsIntegration {
	return &MetaAdsIntegration{
		accessToken: accessToken,
		apiVersion:  "v18.0", // Meta API version
		client: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
}

func (m *MetaAdsIntegration) GetPlatformName() string {
	return "FB"
}

// FetchPerformanceData fetches performance data from Meta Ads API
// PHASE 8A.3: Read-only - no modifications
func (m *MetaAdsIntegration) FetchPerformanceData(campaignID string, startDate, endDate time.Time) (*PerformanceData, error) {
	log.Printf("[META ADS] Fetching performance data for campaign %s", campaignID)
	
	// Meta Ads API endpoint
	url := fmt.Sprintf("https://graph.facebook.com/%s/%s/insights", m.apiVersion, campaignID)
	
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}
	
	// Add query parameters
	q := req.URL.Query()
	q.Add("access_token", m.accessToken)
	q.Add("fields", "impressions,clicks,ctr,cpc,cpm,actions,spend")
	q.Add("time_range", fmt.Sprintf(`{"since":"%s","until":"%s"}`, 
		startDate.Format("2006-01-02"), endDate.Format("2006-01-02")))
	q.Add("level", "campaign")
	req.URL.RawQuery = q.Encode()
	
	resp, err := m.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("API request failed: %w", err)
	}
	defer resp.Body.Close()
	
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("Meta API returned status %d", resp.StatusCode)
	}
	
	var apiResponse struct {
		Data []struct {
			Impressions string  `json:"impressions"`
			Clicks      string  `json:"clicks"`
			CTR         string  `json:"ctr"`
			CPC         string  `json:"cpc"`
			CPM         string  `json:"cpm"`
			Spend       string  `json:"spend"`
			Actions     []struct {
				ActionType string `json:"action_type"`
				Value      string `json:"value"`
			} `json:"actions"`
		} `json:"data"`
	}
	
	if err := json.NewDecoder(resp.Body).Decode(&apiResponse); err != nil {
		return nil, fmt.Errorf("failed to parse response: %w", err)
	}
	
	if len(apiResponse.Data) == 0 {
		return nil, fmt.Errorf("no data returned from Meta API")
	}
	
	data := apiResponse.Data[0]
	
	// Parse metrics
	var impressions, clicks, conversions int
	var ctr float64
	var cpc, cpm, spend *float64
	
	fmt.Sscanf(data.Impressions, "%d", &impressions)
	fmt.Sscanf(data.Clicks, "%d", &clicks)
	fmt.Sscanf(data.CTR, "%f", &ctr)
	
	if data.CPC != "" {
		var cpcVal float64
		fmt.Sscanf(data.CPC, "%f", &cpcVal)
		cpc = &cpcVal
	}
	if data.CPM != "" {
		var cpmVal float64
		fmt.Sscanf(data.CPM, "%f", &cpmVal)
		cpm = &cpmVal
	}
	if data.Spend != "" {
		var spendVal float64
		fmt.Sscanf(data.Spend, "%f", &spendVal)
		spend = &spendVal
	}
	
	// Count conversions (purchase, lead, etc.)
	for _, action := range data.Actions {
		if action.ActionType == "purchase" || action.ActionType == "lead" || action.ActionType == "offsite_conversion" {
			var val int
			fmt.Sscanf(action.Value, "%d", &val)
			conversions += val
		}
	}
	
	return &PerformanceData{
		CampaignID:      campaignID,
		Date:            startDate, // Use start date as reference
		Impressions:     impressions,
		Clicks:          clicks,
		CTR:             ctr,
		CPC:             cpc,
		CPM:             cpm,
		Conversions:     conversions,
		Spend:           spend,
		ExternalDataID:  fmt.Sprintf("meta_%s_%s", campaignID, startDate.Format("20060102")),
		Metadata: map[string]interface{}{
			"platform": "FB",
			"source":   "Meta Ads API",
		},
	}, nil
}

// GoogleAdsIntegration implements AdsIntegration for Google Ads
// PHASE 8A.3: Read-only ingestion
type GoogleAdsIntegration struct {
	clientID     string
	clientSecret string
	refreshToken string
	client       *http.Client
}

// NewGoogleAdsIntegration creates a new Google Ads integration
func NewGoogleAdsIntegration(clientID, clientSecret, refreshToken string) *GoogleAdsIntegration {
	return &GoogleAdsIntegration{
		clientID:     clientID,
		clientSecret: clientSecret,
		refreshToken: refreshToken,
		client: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
}

func (g *GoogleAdsIntegration) GetPlatformName() string {
	return "Google"
}

// FetchPerformanceData fetches performance data from Google Ads API
// PHASE 8A.3: Read-only - no modifications
func (g *GoogleAdsIntegration) FetchPerformanceData(campaignID string, startDate, endDate time.Time) (*PerformanceData, error) {
	log.Printf("[GOOGLE ADS] Fetching performance data for campaign %s", campaignID)
	
	// Note: Google Ads API requires OAuth2 and uses gRPC/Protocol Buffers
	// This is a simplified implementation - in production, use google-ads-api library
	// For now, return a placeholder structure
	
	// TODO: Implement actual Google Ads API integration using google-ads-api library
	// This requires:
	// 1. OAuth2 authentication
	// 2. gRPC client setup
	// 3. Query builder for performance metrics
	
	return &PerformanceData{
		CampaignID:      campaignID,
		Date:            startDate,
		Impressions:     0, // Placeholder
		Clicks:          0, // Placeholder
		CTR:             0, // Placeholder
		Conversions:     0, // Placeholder
		ExternalDataID:  fmt.Sprintf("google_%s_%s", campaignID, startDate.Format("20060102")),
		Metadata: map[string]interface{}{
			"platform": "Google",
			"source":   "Google Ads API",
			"note":     "Placeholder - requires google-ads-api library",
		},
	}, fmt.Errorf("Google Ads API integration not yet implemented - requires google-ads-api library")
}

// TikTokAdsIntegration implements AdsIntegration for TikTok Ads
// PHASE 8A.3: Read-only ingestion
type TikTokAdsIntegration struct {
	accessToken string
	appID       string
	secret      string
	client      *http.Client
}

// NewTikTokAdsIntegration creates a new TikTok Ads integration
func NewTikTokAdsIntegration(accessToken, appID, secret string) *TikTokAdsIntegration {
	return &TikTokAdsIntegration{
		accessToken: accessToken,
		appID:       appID,
		secret:      secret,
		client: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
}

func (t *TikTokAdsIntegration) GetPlatformName() string {
	return "TikTok"
}

// FetchPerformanceData fetches performance data from TikTok Ads API
// PHASE 8A.3: Read-only - no modifications
func (t *TikTokAdsIntegration) FetchPerformanceData(campaignID string, startDate, endDate time.Time) (*PerformanceData, error) {
	log.Printf("[TIKTOK ADS] Fetching performance data for campaign %s", campaignID)
	
	// TikTok Ads API endpoint
	url := "https://business-api.tiktok.com/open_api/v1.3/report/integrated/get/"
	
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}
	
	// Add headers
	req.Header.Set("Access-Token", t.accessToken)
	req.Header.Set("Content-Type", "application/json")
	
	// Add query parameters
	q := req.URL.Query()
	q.Add("advertiser_id", t.appID)
	q.Add("service_type", "AUCTION")
	q.Add("report_type", "BASIC")
	q.Add("data_level", "AUCTION_CAMPAIGN")
	q.Add("dimensions", `["campaign_id"]`)
	q.Add("metrics", `["impressions","clicks","ctr","cpc","cpm","conversions","spend"]`)
	q.Add("start_date", startDate.Format("2006-01-02"))
	q.Add("end_date", endDate.Format("2006-01-02"))
	q.Add("filtering", fmt.Sprintf(`[{"field_name":"campaign_id","filter_type":"IN","filter_value":[%s]}]`, campaignID))
	req.URL.RawQuery = q.Encode()
	
	resp, err := t.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("API request failed: %w", err)
	}
	defer resp.Body.Close()
	
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("TikTok API returned status %d", resp.StatusCode)
	}
	
	var apiResponse struct {
		Data struct {
			List []struct {
				Metrics struct {
					Impressions string `json:"impressions"`
					Clicks      string `json:"clicks"`
					CTR         string `json:"ctr"`
					CPC         string `json:"cpc"`
					CPM         string `json:"cpm"`
					Conversions string `json:"conversions"`
					Spend       string `json:"spend"`
				} `json:"metrics"`
			} `json:"list"`
		} `json:"data"`
	}
	
	if err := json.NewDecoder(resp.Body).Decode(&apiResponse); err != nil {
		return nil, fmt.Errorf("failed to parse response: %w", err)
	}
	
	if len(apiResponse.Data.List) == 0 {
		return nil, fmt.Errorf("no data returned from TikTok API")
	}
	
	data := apiResponse.Data.List[0].Metrics
	
	// Parse metrics
	var impressions, clicks, conversions int
	var ctr float64
	var cpc, cpm, spend *float64
	
	fmt.Sscanf(data.Impressions, "%d", &impressions)
	fmt.Sscanf(data.Clicks, "%d", &clicks)
	fmt.Sscanf(data.CTR, "%f", &ctr)
	fmt.Sscanf(data.Conversions, "%d", &conversions)
	
	if data.CPC != "" {
		var cpcVal float64
		fmt.Sscanf(data.CPC, "%f", &cpcVal)
		cpc = &cpcVal
	}
	if data.CPM != "" {
		var cpmVal float64
		fmt.Sscanf(data.CPM, "%f", &cpmVal)
		cpm = &cpmVal
	}
	if data.Spend != "" {
		var spendVal float64
		fmt.Sscanf(data.Spend, "%f", &spendVal)
		spend = &spendVal
	}
	
	return &PerformanceData{
		CampaignID:      campaignID,
		Date:            startDate,
		Impressions:     impressions,
		Clicks:          clicks,
		CTR:             ctr,
		CPC:             cpc,
		CPM:             cpm,
		Conversions:     conversions,
		Spend:           spend,
		ExternalDataID:  fmt.Sprintf("tiktok_%s_%s", campaignID, startDate.Format("20060102")),
		Metadata: map[string]interface{}{
			"platform": "TikTok",
			"source":   "TikTok Ads API",
		},
	}, nil
}
