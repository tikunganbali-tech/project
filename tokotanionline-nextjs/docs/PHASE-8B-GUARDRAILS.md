# PHASE 8B: ADS → CONTENT FEEDBACK LOOP - GUARDRAILS

## Overview
PHASE 8B implements Ads → Content Feedback Loop dengan guardrails ketat untuk mencegah auto-manipulation.

## Guardrails Implemented

### 8B.1: Ads→Insight Normalizer ✅
**IMPLEMENTED**
- Normalisasi metrik Ads (CTR, CVR, CPC) → intent signals
- Output tanpa teks iklan mentah
- Intent signals: AWARENESS, CONSIDERATION, PURCHASE, RETENTION
- Funnel stages: TOP, MID, BOTTOM

**Guardrail Checks:**
- ✅ No raw ad text in output
- ✅ Only normalized metrics and intent signals
- ✅ Brand and locale context preserved

**Code Location:**
- `engine-hub/internal/ads/insight_normalizer.go`

### 8B.2: Insight Mapper ✅
**IMPLEMENTED**
- Peta sinyal Ads → content intent (top/mid/bottom funnel)
- Terikat brand + locale
- Tidak menyentuh body konten

**Guardrail Checks:**
- ✅ Brand ID required (validation)
- ✅ Locale ID required (validation)
- ✅ No content body manipulation
- ✅ Only recommendations (content types, topics, angles, CTAs)

**Code Location:**
- `engine-hub/internal/ads/insight_mapper.go`

### 8B.3: Strategy Sync ✅
**IMPLEMENTED**
- Gabungkan: SEO_QC_REPORT + ADS_STRATEGY_REPORT
- Hasilkan CONTENT_STRATEGY_BRIEF (read-only)

**Guardrail Checks:**
- ✅ Brand ID required (validation)
- ✅ Locale ID required (validation)
- ✅ Read-only brief (no auto-execute)
- ✅ Recommendations are suggestions only
- ✅ No content modification

**Code Location:**
- `engine-hub/internal/ads/strategy_sync.go`

### 8B.4: Revision Trigger (EVENT-ONLY) ✅
**IMPLEMENTED**
- Jika strategi butuh revisi: Emit CONTENT_REVISION_REQUESTED
- Tidak mengedit versi lama
- Tidak auto-publish

**Guardrail Checks:**
- ✅ Event-only (no direct content modification)
- ✅ Explicit logging: "Old version NOT modified"
- ✅ Explicit logging: "No auto-publish triggered"
- ✅ Only emits event, does not execute revision
- ✅ Revision happens via new version generation

**Code Location:**
- `engine-hub/internal/ads/revision_trigger.go`

### 8B.5: Admin Review Gate ✅
**IMPLEMENTED**
- Admin review & approve produksi versi baru
- Tidak ada edit teks manual
- Tidak ada auto-publish

**Guardrail Checks:**
- ✅ Read-only strategy brief display
- ✅ Approve production button (triggers new version, not auto-publish)
- ✅ No manual text edit interface
- ✅ Explicit warnings about read-only mode
- ✅ Approval only triggers generation, not publish

**Code Location:**
- `app/admin/ads/strategy-brief/page.tsx`
- `components/admin/StrategyBriefClient.tsx`
- `app/api/admin/ads/strategy-brief/route.ts`

### 8B.6: Guardrail PHASE 8B ✅
**IMPLEMENTED**

**Guardrails:**
- ❌ Tidak ada rewrite otomatis
- ❌ Tidak ada auto-publish
- ❌ Tidak ada lintas brand/locale
- ✅ Semua via event & versi baru
- ✅ Brand & locale isolation enforced
- ✅ Read-only flags di semua API endpoints
- ✅ Explicit warnings di UI

**Implementation Details:**

1. **Normalizer Level:**
   - No raw ad text in output
   - Only normalized metrics and intent signals
   - Brand and locale context preserved

2. **Mapper Level:**
   - Brand and locale validation required
   - No content body manipulation
   - Only recommendations (types, topics, angles, CTAs)

3. **Strategy Sync Level:**
   - Read-only brief generation
   - Recommendations are suggestions only
   - No content modification

4. **Revision Trigger Level:**
   - Event-only (no direct modification)
   - Explicit logging of guardrails
   - Only triggers new version generation

5. **Admin Review Gate Level:**
   - Read-only display
   - Approve production (not auto-publish)
   - No manual text edit

## Testing Checklist

- [ ] Normalizer produces intent signals (no raw ad text)
- [ ] Mapper requires brand and locale
- [ ] Mapper does not modify content body
- [ ] Strategy sync generates read-only brief
- [ ] Revision trigger emits event (no edit old version)
- [ ] Revision trigger does not auto-publish
- [ ] Admin review gate shows read-only warnings
- [ ] Admin review gate approve triggers generation (not publish)
- [ ] Brand/locale isolation enforced in all components
- [ ] All API endpoints return read-only flags

## Summary

PHASE 8B: Ads → Content Feedback Loop telah diimplementasikan dengan guardrails lengkap:
- ✅ Normalizer (no raw ad text)
- ✅ Mapper (brand+locale bound, no content manipulation)
- ✅ Strategy sync (read-only brief)
- ✅ Revision trigger (event-only, no edit old version)
- ✅ Admin review gate (approve production, not auto-publish)
- ✅ Guardrails enforced di semua level

**Status: COMPLETE**
