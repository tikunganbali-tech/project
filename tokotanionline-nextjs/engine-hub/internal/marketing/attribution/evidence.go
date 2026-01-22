package attribution

import (
	"fmt"
	"time"
)

// EvidenceEvent merepresentasikan satu event dalam timeline
type EvidenceEvent struct {
	EventKey   string
	Timestamp  time.Time
	EntityID   string
}

// AttributionEvidence menjelaskan atribusi dengan detail untuk manusia
// Struct ini untuk evidence builder yang lebih detail dan human-readable
type AttributionEvidence struct {
	CampaignID  string
	Rule        AttributionRule
	Score       float64
	Explanation string
	Timeline    []EvidenceEvent
}

// BuildEvidence membangun evidence object per campaign dari attribution results
// Pure function: tidak ada side effects, tidak query DB, tidak HTTP
func BuildEvidence(
	q AttributionQuery,
	results []AttributionResult,
) []AttributionEvidence {
	if len(results) == 0 {
		return []AttributionEvidence{}
	}

	// Collect all touchpoints from all results
	// Karena semua results berasal dari touchpoints yang sama,
	// kita ambil touchpoints dari result pertama
	var allTouchpoints []Touchpoint
	if len(results) > 0 && len(results[0].Evidence.Touchpoints) > 0 {
		allTouchpoints = results[0].Evidence.Touchpoints
	}

	// Build evidence for each result
	evidences := []AttributionEvidence{}
	for _, result := range results {
		// Build timeline filtered by campaign from touchpoints
		timeline := buildTimelineByCampaign(allTouchpoints, result.CampaignID)
		
		evidence := AttributionEvidence{
			CampaignID:  result.CampaignID,
			Rule:        q.Rule,
			Score:       result.Score,
			Explanation: buildExplanation(q.Rule, result, len(allTouchpoints)),
			Timeline:    timeline,
		}
		evidences = append(evidences, evidence)
	}

	return evidences
}

// buildTimelineByCampaign converts touchpoints to evidence events filtered by campaign
func buildTimelineByCampaign(touchpoints []Touchpoint, campaignID string) []EvidenceEvent {
	timeline := []EvidenceEvent{}
	for _, tp := range touchpoints {
		// Filter: only include events from this campaign
		if tp.CampaignID == campaignID {
			event := EvidenceEvent{
				EventKey:  tp.EventKey,
				Timestamp: tp.Timestamp,
				EntityID:  "", // EntityID tidak ada di Touchpoint, bisa ditambahkan jika perlu
			}
			timeline = append(timeline, event)
		}
	}
	return timeline
}

// buildExplanation generates human-readable explanation based on rule
func buildExplanation(rule AttributionRule, result AttributionResult, totalTouchpoints int) string {
	switch rule {
	case RuleLastClick:
		return buildLastClickExplanation(result, totalTouchpoints)
	case RuleFirstTouch:
		return buildFirstTouchExplanation(result, totalTouchpoints)
	case RuleLinear:
		return buildLinearExplanation(result, totalTouchpoints)
	default:
		return fmt.Sprintf("Attribusi menggunakan rule %s dengan skor %.2f%%", rule, result.Score*100)
	}
}

// buildLastClickExplanation generates explanation for LAST_CLICK rule
func buildLastClickExplanation(result AttributionResult, totalTouchpoints int) string {
	if result.Score == 1.0 {
		return fmt.Sprintf("Campaign %s mendapat 100%% atribusi karena merupakan interaksi terakhir sebelum konversi.", 
			result.CampaignID)
	}
	return fmt.Sprintf("Campaign %s mendapat %.1f%% atribusi berdasarkan last click rule.", 
		result.CampaignID, result.Score*100)
}

// buildFirstTouchExplanation generates explanation for FIRST_TOUCH rule
func buildFirstTouchExplanation(result AttributionResult, totalTouchpoints int) string {
	if result.Score == 1.0 {
		return fmt.Sprintf("Campaign %s mendapat 100%% atribusi karena merupakan interaksi pertama dalam perjalanan user.", 
			result.CampaignID)
	}
	return fmt.Sprintf("Campaign %s mendapat %.1f%% atribusi berdasarkan first touch rule.", 
		result.CampaignID, result.Score*100)
}

// buildLinearExplanation generates explanation for LINEAR rule
func buildLinearExplanation(result AttributionResult, totalTouchpoints int) string {
	// Count how many touchpoints belong to this campaign
	campaignTouchpoints := 0
	for _, tp := range result.Evidence.Touchpoints {
		if tp.CampaignID == result.CampaignID {
			campaignTouchpoints++
		}
	}

	if totalTouchpoints > 0 && campaignTouchpoints > 0 {
		scorePercent := int(result.Score * 100)
		return fmt.Sprintf("Campaign %s mendapat %d%% atribusi karena terlibat dalam %d dari %d interaksi sepanjang perjalanan user.", 
			result.CampaignID, scorePercent, campaignTouchpoints, totalTouchpoints)
	}

	return fmt.Sprintf("Campaign %s mendapat %.1f%% atribusi berdasarkan linear rule (pembagian rata).", 
		result.CampaignID, result.Score*100)
}

