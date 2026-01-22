# 🔒 FRONTEND_CONTENT_PACKAGE — OUTPUT CONTRACT (LOCKED)

**Status:** ✅ LOCKED  
**Tanggal:** 2024-12-19  
**Tujuan:** Kontrak output yang TIDAK BOLEH BERUBAH setelah coding dimulai

## ⛔ PENTING

**Jika kontrak ini berubah di tengah → STOP.**

Kontrak ini didefinisikan SEBELUM menulis 1 baris kode AI Generator v2.

## 📦 FRONTEND_CONTENT_PACKAGE Structure

```typescript
interface FrontendContentPackage {
  // ============================================
  // PAGE TYPE (WAJIB)
  // ============================================
  pageType: 'blog' | 'product' | 'category' | 'homepage';
  
  // ============================================
  // TITLE & HERO (WAJIB)
  // ============================================
  title: string;              // Main title (H1)
  heroCopy: string;           // Hero section copy (lead paragraph)
  
  // ============================================
  // SECTIONS (WAJIB)
  // ============================================
  sections: ContentSection[]; // Array of sections
  
  // ============================================
  // CTA (WAJIB)
  // ============================================
  cta: {
    text: string;             // CTA button text
    action: string;           // CTA action (e.g., "contact", "buy", "learn")
    placement: 'inline' | 'bottom' | 'both'; // Where CTA appears
  };
  
  // ============================================
  // MICROCOPY (WAJIB)
  // ============================================
  microcopy: {
    readingTime?: string;     // "5 menit membaca"
    lastUpdated?: string;     // "Diperbarui 19 Des 2024"
    author?: string;          // Author name (if applicable)
    tags?: string[];          // Content tags
  };
  
  // ============================================
  // TONE (WAJIB)
  // ============================================
  tone: {
    style: 'informative' | 'conversational' | 'professional' | 'friendly';
    formality: 'formal' | 'semi-formal' | 'casual';
    targetAudience: string;   // e.g., "petani pemula", "ahli pertanian"
  };
  
  // ============================================
  // METADATA (INTERNAL)
  // ============================================
  metadata: {
    version: number;          // Version number (increments on each generate)
    generatedAt: string;      // ISO 8601 timestamp
    contentType: string;      // Content type identifier
    wordCount: number;         // Actual word count
    readingTime: number;      // Estimated reading time in minutes
  };
}

interface ContentSection {
  heading: string;            // Section heading (H2 or H3)
  headingLevel: 2 | 3;       // Heading level
  body: string;              // Section body content (markdown)
  order: number;             // Display order
}
```

## 📋 FIELD REQUIREMENTS

### Page Type
- **Required:** ✅ Yes
- **Values:** `'blog' | 'product' | 'category' | 'homepage'`
- **Purpose:** Determines content structure and layout

### Title
- **Required:** ✅ Yes
- **Min Length:** 10 characters
- **Max Length:** 100 characters
- **Purpose:** Main H1 heading

### Hero Copy
- **Required:** ✅ Yes
- **Min Length:** 50 characters
- **Max Length:** 300 characters
- **Purpose:** Lead paragraph that appears below title

### Sections
- **Required:** ✅ Yes
- **Min Count:** 2 sections
- **Max Count:** 10 sections
- **Purpose:** Main content body, organized into sections

### CTA
- **Required:** ✅ Yes
- **Purpose:** Call-to-action for user engagement
- **Text:** Must be actionable (e.g., "Hubungi Kami", "Pelajari Lebih Lanjut")

### Microcopy
- **Required:** ✅ Yes (at least one field)
- **Purpose:** Supporting information (reading time, tags, etc.)

### Tone
- **Required:** ✅ Yes
- **Purpose:** Ensures consistent voice across content

## 🎯 VALIDATION RULES

1. **Title:** Must be present, 10-100 chars
2. **Hero Copy:** Must be present, 50-300 chars
3. **Sections:** Minimum 2 sections, each with heading and body
4. **CTA:** Must have text and action
5. **Tone:** Must be defined

## ⛔ LOCKED

**Kontrak ini TIDAK BOLEH BERUBAH setelah implementasi dimulai.**

Jika perlu perubahan, buat versi baru (v2.1, v2.2, etc.) dengan migration path.

## ✅ STATUS

- [x] Kontrak didefinisikan
- [x] Structure locked
- [x] Requirements documented
- [x] Ready for implementation

**NEXT:** PHASE 1.3 — Implement AI Generator Core
