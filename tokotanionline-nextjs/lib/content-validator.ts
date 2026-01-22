/**
 * FASE 3 — CONTENT VALIDATOR (WAJIB)
 * 
 * Deterministik: Hanya jawab ✅ LULUS atau ❌ GAGAL + ALASAN STRUKTURAL
 */

export interface ValidationError {
  rule: string;
  message: string;
  content?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

export interface ContentToValidate {
  title: string;
  body: string;
  metaTitle?: string;
  metaDescription?: string;
}

/**
 * Validate content - returns validation result
 */
export function validateContent(content: ContentToValidate): ValidationResult {
  const errors: ValidationError[] = [];

  // Rule 0: Word count (minimum 720 words)
  const wordCountError = checkWordCount(content);
  if (wordCountError) {
    errors.push(wordCountError);
  }

  // Rule 1: Sales CTA
  const ctaError = checkSalesCTA(content.body);
  if (ctaError) {
    errors.push(ctaError);
  }

  // Rule 2: Prohibited words
  const prohibitedError = checkProhibitedWords(content.body);
  if (prohibitedError) {
    errors.push(prohibitedError);
  }

  // Rule 3: Brand mentions
  const brandError = checkBrandMentions(content.body);
  if (brandError) {
    errors.push(brandError);
  }

  // Rule 4: Promotional tone
  const promoError = checkPromotionalTone(content.body);
  if (promoError) {
    errors.push(promoError);
  }

  // Rule 5: Structural integrity
  const structuralError = checkStructuralIntegrity(content);
  if (structuralError) {
    errors.push(structuralError);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Check word count (minimum 720 words)
 */
function checkWordCount(content: ContentToValidate): ValidationError | null {
  const fullText = `${content.title} ${content.body}`;
  const wordCount = countWords(fullText);

  if (wordCount < 720) {
    return {
      rule: 'WORD_COUNT_MINIMUM',
      message: `Word count below minimum: ${wordCount} < 720 (target: 800-1500)`,
      content: `Article has ${wordCount} words, minimum required is 720 words`,
    };
  }

  return null;
}

/**
 * Count words in text
 */
function countWords(text: string): number {
  // Remove markdown formatting
  text = removeMarkdownForWordCount(text);

  // Split and count words with at least one letter
  const words = text.split(/\s+/).filter((word) => {
    return /[a-zA-Z]/.test(word);
  });

  return words.length;
}

/**
 * Remove markdown for word counting
 */
function removeMarkdownForWordCount(text: string): string {
  // Remove headers
  text = text.replace(/#{1,6}\s+/g, '');
  // Remove bold/italic
  text = text.replace(/\*\*|\*|__|_/g, '');
  // Remove links (keep text)
  text = text.replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1');
  // Remove code blocks
  text = text.replace(/```[\s\S]*?```/g, '');
  text = text.replace(/`[^`]+`/g, '');
  // Remove images
  text = text.replace(/!\[([^\]]*)\]\([^\)]+\)/g, '');
  return text;
}

/**
 * Check for sales CTA patterns
 */
function checkSalesCTA(body: string): ValidationError | null {
  const salesPatterns = [
    { pattern: /(beli sekarang|buy now|pesan sekarang|order sekarang|checkout sekarang)/i, message: 'Sales CTA detected' },
    { pattern: /(hubungi kami|contact us|whatsapp|wa:|wa\.me)/i, message: 'Contact/sales CTA detected' },
    { pattern: /(dapatkan diskon|get discount|promo|harga special|harga spesial)/i, message: 'Promotional CTA detected' },
    { pattern: /(klik di sini|click here|get it now|gratis sekarang)/i, message: 'Action CTA detected' },
    { pattern: /(dapatkan (sekarang|segera|hari ini|promo|diskon|gratis))/i, message: 'Action CTA detected' },
    { pattern: /(tambahkan ke keranjang|add to cart|add to bag)/i, message: 'E-commerce CTA detected' },
    { pattern: /(daftar sekarang|register now|sign up now|join now)/i, message: 'Registration CTA detected' },
    { pattern: /(pesan via whatsapp|order via wa|hubungi sales)/i, message: 'WhatsApp sales CTA detected' },
  ];

  const bodyLower = body.toLowerCase();

  for (const { pattern, message } of salesPatterns) {
    const match = bodyLower.match(pattern);
    if (match) {
      const context = extractContext(body, match[0], 50);
      return {
        rule: 'CTA_JUALAN',
        message,
        content: context,
      };
    }
  }

  return null;
}

/**
 * Check for prohibited words
 */
function checkProhibitedWords(body: string): ValidationError | null {
  const prohibitedWords = [
    { word: 'pasti', message: "Prohibited word 'pasti' detected (promotional tone)" },
    { word: 'terbukti', message: "Prohibited word 'terbukti' detected (promotional tone)" },
    { word: 'rahasia', message: "Prohibited word 'rahasia' detected (promotional tone)" },
  ];

  const bodyLower = body.toLowerCase();

  for (const { word, message } of prohibitedWords) {
    const regex = new RegExp(`\\b${escapeRegex(word)}\\b`, 'i');
    if (regex.test(bodyLower)) {
      const match = bodyLower.match(regex);
      if (match) {
        const context = extractContext(body, match[0], 50);
        return {
          rule: 'KATA_TERLARANG',
          message,
          content: context,
        };
      }
    }
  }

  return null;
}

/**
 * Check for brand mentions
 */
function checkBrandMentions(body: string): ValidationError | null {
  const brandPatterns = [
    { pattern: /\btoko tani online\b/i, message: "Brand name 'Toko Tani Online' detected in content" },
    { pattern: /\btt[oi]\b/i, message: 'Brand abbreviation detected' },
  ];

  for (const { pattern, message } of brandPatterns) {
    const match = body.match(pattern);
    if (match) {
      const context = extractContext(body, match[0], 50);
      return {
        rule: 'NAMA_MEREK',
        message,
        content: context,
      };
    }
  }

  return null;
}

/**
 * Check for promotional tone
 */
function checkPromotionalTone(body: string): ValidationError | null {
  const promotionalPatterns = [
    { pattern: /(solusi terbaik|best solution|paling terbaik)/i, message: 'Promotional superlative detected' },
    { pattern: /(hanya di|only at|exclusive)/i, message: 'Exclusive promotional language detected' },
    { pattern: /(limited time|waktu terbatas|tawaran terbatas)/i, message: 'Limited-time promotion detected' },
    { pattern: /(garansi uang kembali|money back guarantee|jaminan uang kembali)/i, message: 'Guarantee marketing detected' },
    { pattern: /(testimoni|review positif|rating tinggi|bintang 5)/i, message: 'Social proof marketing detected' },
    { pattern: /(harga murah|harga terjangkau|harga terbaik)/i, message: 'Price promotion detected' },
    { pattern: /(diskon besar|big discount|potongan besar)/i, message: 'Discount promotion detected' },
    { pattern: /(stok terbatas|limited stock|hanya tersisa)/i, message: 'Scarcity marketing detected' },
    { pattern: /(wajib punya|must have|harus punya)/i, message: 'Urgency marketing detected' },
    { pattern: /(berlaku sampai|valid until|promo berlaku)/i, message: 'Time-limited promotion detected' },
  ];

  const bodyLower = body.toLowerCase();

  for (const { pattern, message } of promotionalPatterns) {
    const match = bodyLower.match(pattern);
    if (match) {
      const context = extractContext(body, match[0], 50);
      return {
        rule: 'NADA_PROMOSI',
        message,
        content: context,
      };
    }
  }

  // Check excessive exclamation marks
  const exclamationCount = (body.match(/!/g) || []).length;
  if (exclamationCount > 3) {
    return {
      rule: 'NADA_PROMOSI',
      message: `Excessive exclamation marks detected (${exclamationCount} instances, max 3 allowed)`,
      content: "Multiple '!' found in content",
    };
  }

  return null;
}

/**
 * Check structural integrity
 */
function checkStructuralIntegrity(content: ContentToValidate): ValidationError | null {
  const body = content.body;

  // Check for placeholders
  const placeholderPatterns = [
    /\[placeholder\]/i,
    /\[PLACEHOLDER\]/i,
    /\bTODO\b/i,
    /\bFIXME\b/i,
    /menurut AI/i,
    /menurut artificial intelligence/i,
    /menurut machine learning/i,
  ];

  for (const pattern of placeholderPatterns) {
    const match = body.match(pattern);
    if (match) {
      return {
        rule: 'STRUCTURAL_PLACEHOLDER',
        message: `Placeholder or AI reference detected: ${pattern}`,
        content: extractContext(body, match[0], 50),
      };
    }
  }

  // Check for minimum heading structure (at least 2 H2 headings)
  const h2Count = (body.match(/##\s+/g) || []).length;
  if (h2Count < 2) {
    return {
      rule: 'STRUCTURAL_HEADING',
      message: `Insufficient heading structure: found ${h2Count} H2 headings, minimum 2 required`,
      content: 'Content must have at least 2 main sections (H2 headings)',
    };
  }

  return null;
}

/**
 * Extract context around a match
 */
function extractContext(text: string, match: string, contextSize: number): string {
  const index = text.toLowerCase().indexOf(match.toLowerCase());
  if (index === -1) {
    return match;
  }

  const start = Math.max(0, index - contextSize);
  const end = Math.min(text.length, index + match.length + contextSize);

  const context = text.substring(start, end);
  return `...${context}...`;
}

/**
 * Escape regex special characters
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
