/**
 * FASE 3 — CONTENT NORMALIZER (WAJIB)
 * 
 * Deterministik: Memaksa konten patuh sebelum validasi
 * Berlaku ke SEMUA konten: blog, produk, static page
 */

export interface NormalizedContent {
  title: string;
  body: string;
  metaTitle?: string;
  metaDescription?: string;
}

/**
 * Normalize content - deterministik rules
 */
export function normalizeContent(content: NormalizedContent): NormalizedContent {
  const result = { ...content };

  // Normalize body
  result.body = normalizeBody(result.body);

  // Normalize title
  result.title = normalizeTitle(result.title);

  // Normalize meta fields
  if (result.metaTitle) {
    result.metaTitle = normalizeMeta(result.metaTitle);
  }
  if (result.metaDescription) {
    result.metaDescription = normalizeMeta(result.metaDescription);
  }

  return result;
}

/**
 * Normalize body content
 */
function normalizeBody(body: string): string {
  if (!body) return body;

  // Step 1: Limit exclamation marks (max 3)
  body = limitExclamationMarks(body);

  // Step 2: Filter absolute words
  body = filterAbsoluteWords(body);

  // Step 3: Soften tone
  body = softenTone(body);

  // Step 4: Cleanup whitespace
  body = cleanupWhitespace(body);

  return body;
}

/**
 * Normalize title
 */
function normalizeTitle(title: string): string {
  if (!title) return title;

  title = limitExclamationMarksImproved(title);
  title = filterAbsoluteWords(title);
  title = cleanupWhitespace(title);

  return title;
}

/**
 * Normalize meta fields
 */
function normalizeMeta(meta: string): string {
  if (!meta) return meta;

  meta = limitExclamationMarksImproved(meta);
  meta = filterAbsoluteWords(meta);
  meta = cleanupWhitespace(meta);

  return meta;
}

/**
 * Limit exclamation marks to max 3
 */
function limitExclamationMarks(text: string): string {
  const matches = text.match(/!/g);
  if (!matches || matches.length <= 3) {
    return text;
  }

  // Replace excess exclamation marks with periods
  let count = 0;
  return text.replace(/!/g, (match) => {
    count++;
    return count <= 3 ? match : '.';
  });
}

/**
 * Limit exclamation marks for meta fields
 */
function limitExclamationMarksImproved(text: string): string {
  return limitExclamationMarks(text);
}

/**
 * Filter absolute words - replace with neutral alternatives
 */
function filterAbsoluteWords(text: string): string {
  const replacements: Record<string, string> = {
    pasti: 'umumnya',
    terbukti: 'sering digunakan',
    '100%': 'biasanya',
    terbaik: 'sering dipilih',
    paling: 'sering',
    selalu: 'biasanya',
    'tidak pernah': 'jarang',
    mustahil: 'sulit',
    wajib: 'disarankan',
    harus: 'sebaiknya',
    mutlak: 'umumnya',
  };

  let result = text;

  // Word boundary replacements
  for (const [absolute, neutral] of Object.entries(replacements)) {
    const regex = new RegExp(`\\b${escapeRegex(absolute)}\\b`, 'gi');
    result = result.replace(regex, (match) => {
      // Preserve case
      if (match[0] >= 'A' && match[0] <= 'Z') {
        return neutral.charAt(0).toUpperCase() + neutral.slice(1);
      }
      return neutral;
    });
  }

  // Phrase replacements
  const phraseReplacements: Record<string, string> = {
    'pasti berhasil': 'umumnya berhasil',
    'terbukti efektif': 'sering efektif',
    'paling efektif': 'sering efektif',
    'solusi terbaik': 'solusi yang sering digunakan',
    'tidak diragukan': 'biasanya',
    'sangat efektif': 'efektif',
    'super efektif': 'efektif',
    'paling terbaik': 'sering dipilih',
    'menurut AI': '',
    'menurut artificial intelligence': '',
    'menurut machine learning': '',
    '[placeholder]': '',
    placeholder: '',
    TODO: '',
    FIXME: '',
  };

  for (const [phrase, replacement] of Object.entries(phraseReplacements)) {
    const regex = new RegExp(`\\b${escapeRegex(phrase)}\\b`, 'gi');
    if (regex.test(result)) {
      result = result.replace(regex, replacement);
    }
  }

  return result;
}

/**
 * Soften tone - convert claims to observational
 */
function softenTone(text: string): string {
  let result = text;

  // Pattern replacements
  const patterns = [
    { pattern: /(\w+) adalah (\w+) yang (\w+)/gi, replacement: '$1 umumnya $2 yang $3' },
    { pattern: /(\w+) pasti (\w+)/gi, replacement: '$1 umumnya $2' },
    { pattern: /(\w+) terbukti (\w+)/gi, replacement: '$1 sering $2' },
  ];

  for (const { pattern, replacement } of patterns) {
    result = result.replace(pattern, replacement);
  }

  // Remove strong adjectives
  const strongAdjectives: Record<string, string> = {
    sangat: '',
    super: '',
    extremely: '',
    very: '',
    really: '',
  };

  for (const [strong, replacement] of Object.entries(strongAdjectives)) {
    const regex = new RegExp(`\\b${escapeRegex(strong)}\\s+`, 'gi');
    result = result.replace(regex, replacement);
  }

  return result;
}

/**
 * Cleanup whitespace and punctuation
 */
function cleanupWhitespace(text: string): string {
  // Normalize multiple spaces
  text = text.replace(/\s+/g, ' ');

  // Remove spaces before punctuation
  text = text.replace(/\s+([.,;:!?])/g, '$1');

  // Normalize multiple punctuation (except ...)
  text = text.replace(/\.{4,}/g, '...');
  text = text.replace(/,{3,}/g, ',');
  text = text.replace(/;{3,}/g, ';');
  text = text.replace(/:{3,}/g, ':');
  text = text.replace(/!{3,}/g, '!');
  text = text.replace(/\?{3,}/g, '?');

  // Trim lines
  const lines = text.split('\n').map((line) => line.trim()).filter((line) => line);
  text = lines.join('\n');

  // Trim final whitespace
  return text.trim();
}

/**
 * Escape regex special characters
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
