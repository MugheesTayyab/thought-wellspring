export interface NormalizedTextPayload {
  original: string;
  normalized: string;        // Folded case, trimmed, normalized whitespace
  compact: string;           // Punctuation and spaces stripped for sequence detection
  words: string[];           // Tokenized array of lower-case words
}

/**
 * Homoglyph translation matrix.
 * Maps visually similar characters (Cyrillic, Greek, numbers, symbols)
 * to their standard Latin canonical equivalents.
 */
const HOMOGLYPH_MAP: Record<string, string> = {
  'а': 'a', 'α': 'a', 'à': 'a', 'á': 'a', 'â': 'a', 'ã': 'a', 'ä': 'a', '@': 'a',
  'е': 'e', 'ё': 'e', 'ε': 'e', 'é': 'e', 'è': 'e', 'ê': 'e', 'ë': 'e', '€': 'e',
  'і': 'i', 'ї': 'i', 'ι': 'i', 'í': 'i', 'ì': 'i', 'î': 'i', 'ï': 'i', '!': 'i', '|': 'i',
  'о': 'o', 'ο': 'o', 'ò': 'o', 'ó': 'o', 'ô': 'o', 'õ': 'o', 'ö': 'o', 'θ': 'o',
  'и': 'u', 'υ': 'u', 'ú': 'u', 'ù': 'u', 'û': 'u', 'ü': 'u', 'μ': 'u',
  'с': 's', 'ç': 's', '¢': 's', '$': 's',
  'р': 'p', 'ρ': 'p',
  'х': 'x', 'χ': 'x', '×': 'x',
  'у': 'y',
  'в': 'b',
  'т': 't', '+': 't',
};

/**
 * Core text normalization pipeline for moderation.
 * @param text The raw user input
 * @returns Object with dual text representations (normalized and compact)
 */
export function normalizeText(text: string): NormalizedTextPayload {
  if (!text) {
    return { original: '', normalized: '', compact: '', words: [] };
  }

  // 1. Unicode Normalization (NFKD) and Zero-Width Stripping
  let processed = text.normalize('NFKD');
  
  // Strip zero-width and directional markers
  processed = processed.replace(/[\u200B-\u200F\uFEFF\u0300-\u036F]/g, '');
  
  // Normalize whitespace (convert NBSP, etc. to standard space)
  processed = processed.replace(/[\u00A0\u2000-\u200A\u202F\u205F\u3000]/g, ' ');

  // Convert to lowercase
  processed = processed.toLowerCase();

  // 2. Homoglyph Translation
  let homoglyphCleaned = '';
  for (const char of processed) {
    homoglyphCleaned += HOMOGLYPH_MAP[char] || char;
  }
  processed = homoglyphCleaned;

  // 3. Repetition Folding & Whitespace Compression
  // Collapse any character repeated 3 or more times down to 2 occurrences
  // E.g., "noooooooo" -> "noo"
  processed = processed.replace(/(.)\1{2,}/g, '$1$1');
  
  // Collapse consecutive spaces
  const normalized = processed.replace(/\s+/g, ' ').trim();

  // 4. Compact Form Generation
  // Strip all non-alphanumeric characters for contact sequence detection
  const compact = normalized.replace(/[^a-z0-9]/g, '');
  
  // Word tokenization
  const words = normalized.length > 0 ? normalized.split(' ') : [];

  return {
    original: text,
    normalized,
    compact,
    words,
  };
}
