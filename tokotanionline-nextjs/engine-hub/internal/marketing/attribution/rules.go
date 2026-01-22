package attribution

import "time"

// AttributionRule menentukan cara atribusi
type AttributionRule string

const (
	RuleLastClick  AttributionRule = "LAST_CLICK"
	RuleFirstTouch AttributionRule = "FIRST_TOUCH"
	RuleLinear     AttributionRule = "LINEAR"
)

// Touchpoint merepresentasikan satu interaksi user
type Touchpoint struct {
	EventKey   string
	CampaignID string
	Timestamp  time.Time
}

// AttributionInput adalah input resolver
type AttributionInput struct {
	Rule        AttributionRule
	Touchpoints []Touchpoint
	WindowStart time.Time
	WindowEnd   time.Time
}

// AttributionResultEvidence menjelaskan WHY (internal untuk rules engine)
type AttributionResultEvidence struct {
	Rule            AttributionRule
	TotalTouchpoint int
	Distribution    map[string]float64
	Touchpoints     []Touchpoint
	Explanation     string
}

// AttributionResult adalah output final
type AttributionResult struct {
	CampaignID string
	Score      float64
	Evidence   AttributionResultEvidence
}

// ResolveAttribution adalah PURE FUNCTION
func ResolveAttribution(input AttributionInput) []AttributionResult {
	valid := filterByWindow(input.Touchpoints, input.WindowStart, input.WindowEnd)
	if len(valid) == 0 {
		return []AttributionResult{}
	}

	switch input.Rule {
	case RuleLastClick:
		return lastClick(valid)
	case RuleFirstTouch:
		return firstTouch(valid)
	case RuleLinear:
		return linear(valid)
	default:
		return []AttributionResult{}
	}
}

// ===== helpers =====

func filterByWindow(tps []Touchpoint, start, end time.Time) []Touchpoint {
	out := []Touchpoint{}
	for _, tp := range tps {
		if tp.Timestamp.After(start) && tp.Timestamp.Before(end) {
			out = append(out, tp)
		}
	}
	return out
}

func lastClick(tps []Touchpoint) []AttributionResult {
	last := tps[len(tps)-1]
	return []AttributionResult{
		{
			CampaignID: last.CampaignID,
			Score:      1.0,
			Evidence: AttributionResultEvidence{
				Rule:            RuleLastClick,
				TotalTouchpoint: len(tps),
				Distribution:    map[string]float64{last.CampaignID: 1.0},
				Touchpoints:     tps,
				Explanation:     "100% atribusi diberikan ke interaksi terakhir (last click).",
			},
		},
	}
}

func firstTouch(tps []Touchpoint) []AttributionResult {
	first := tps[0]
	return []AttributionResult{
		{
			CampaignID: first.CampaignID,
			Score:      1.0,
			Evidence: AttributionResultEvidence{
				Rule:            RuleFirstTouch,
				TotalTouchpoint: len(tps),
				Distribution:    map[string]float64{first.CampaignID: 1.0},
				Touchpoints:     tps,
				Explanation:     "100% atribusi diberikan ke interaksi pertama (first touch).",
			},
		},
	}
}

func linear(tps []Touchpoint) []AttributionResult {
	dist := map[string]float64{}
	score := 1.0 / float64(len(tps))

	for _, tp := range tps {
		dist[tp.CampaignID] += score
	}

	results := []AttributionResult{}
	for cid, s := range dist {
		results = append(results, AttributionResult{
			CampaignID: cid,
			Score:      s,
			Evidence: AttributionResultEvidence{
				Rule:            RuleLinear,
				TotalTouchpoint: len(tps),
				Distribution:    dist,
				Touchpoints:     tps,
				Explanation:     "Skor dibagi rata ke seluruh interaksi dalam window.",
			},
		})
	}

	return results
}

