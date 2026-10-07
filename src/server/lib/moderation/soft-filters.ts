import { NormalizedTextPayload } from './normalize';

export interface SoftFilterResult {
  flagged: boolean;
  category?: 'CULTURAL_ABUSE' | 'SOCIAL_SHILL' | 'LOW_ENTROPY' | 'PROMOTIONAL';
  matchedTerms?: string[];
  severityScore: number; // 1 (Minor concern) to 10 (Critical review)
}

// 1. Severe Profanity & Vulgarity (Tier 2 Auto-Quarantine, Weight: 8–10)
const PROFANITY_ROOTS = [
  'kutta', 'kuttay', 'kutte',
  'kanjar', 'kanjr',
  'chootia', 'chutiya', 'chootya',
  'harami', 'haraami', 'hramkhor',
  'gandu', 'gaandu',
  'bhenchod', 'bc', 'bhenklode', 'behenchod',
  'madarchod', 'mc', 'madarchd',
  'randi', 'rnd',
  'bharwa', 'bhrwa'
];

// 2. Targeted Harassment, Doxxing Intent & Blackmail (Weight: 9–10)
const HARASSMENT_PHRASES = [
  'pics leak', 'video leak', 'tasweerain leak', 'tasveer leak',
  'blackmail kar', 'barbaad kar',
  'address share', 'ghar ka pata',
  'num share', 'number de'
];

// Commercial Gambling & Easy Money Scams
const COMMERCIAL_SCAMS = [
  '1xbet', 'melbet', 'betway', 'easyload free', 'online earning scheme', 'daily profit'
];

/**
 * Computes Shannon Entropy of a string to detect low-quality, repetitive gibberish.
 * H(X) = -sum(P(x_i) * log2(P(x_i)))
 */
function computeEntropy(text: string): number {
  if (text.length === 0) return 0;
  
  const charCounts: Record<string, number> = {};
  for (const char of text) {
    charCounts[char] = (charCounts[char] || 0) + 1;
  }
  
  let entropy = 0;
  for (const count of Object.values(charCounts)) {
    const probability = count / text.length;
    entropy -= probability * Math.log2(probability);
  }
  
  return entropy;
}

export function checkSoftFilters(payload: NormalizedTextPayload): SoftFilterResult {
  const { normalized, words, compact } = payload;
  const matchedTerms: string[] = [];
  let highestSeverity = 0;
  let category: SoftFilterResult['category'] | undefined = undefined;

  // 1. Text Entropy, Quality & Authenticity Heuristics

  // Minimum Word Count
  // Requirement: at least 3 whitespace-delimited words
  // Exception: very short valid phrases (e.g., "I love you"), but plan says "must contain at least 3 words".
  if (words.length < 3) {
    return { flagged: true, category: 'LOW_ENTROPY', severityScore: 2, matchedTerms: ['<3_words'] };
  }

  // Repetition Density Threshold
  // If any single word > 60% of total word count in confession > 5 words
  if (words.length > 5) {
    const wordCounts: Record<string, number> = {};
    let maxFreq = 0;
    for (const word of words) {
      const count = (wordCounts[word] || 0) + 1;
      wordCounts[word] = count;
      if (count > maxFreq) maxFreq = count;
    }
    if (maxFreq / words.length > 0.6) {
      return { flagged: true, category: 'LOW_ENTROPY', severityScore: 4, matchedTerms: ['high_word_repetition'] };
    }
  }

  // Character Set Entropy
  // H(X) < 1.8 on strings longer than 20 characters triggers quarantine
  if (compact.length > 20) {
    const entropy = computeEntropy(compact);
    if (entropy < 1.8) {
      return { flagged: true, category: 'LOW_ENTROPY', severityScore: 4, matchedTerms: ['low_char_entropy'] };
    }
  }

  // All-Caps Screaming Threshold
  // uppercase > 70% of submission over 25 characters
  // We use the original text for this because normalized is already lowercased.
  if (payload.original.length > 25) {
    const letters = payload.original.replace(/[^a-zA-Z]/g, '');
    if (letters.length > 0) {
      const uppers = letters.replace(/[^A-Z]/g, '').length;
      if (uppers / letters.length > 0.7) {
        // Just flag for review, as per spec
        return { flagged: true, category: 'LOW_ENTROPY', severityScore: 2, matchedTerms: ['all_caps'] };
      }
    }
  }


  // 2. Roman Urdu & Cultural Abuse Lexicon
  
  // Severe Profanity
  for (const root of PROFANITY_ROOTS) {
    const regex = new RegExp(`\\b${root}\\b`, 'i');
    if (regex.test(normalized)) {
      matchedTerms.push(root);
      highestSeverity = Math.max(highestSeverity, 8);
      category = 'CULTURAL_ABUSE';
    }
  }

  // Harassment & Doxxing
  for (const phrase of HARASSMENT_PHRASES) {
    if (normalized.includes(phrase)) {
      matchedTerms.push(phrase);
      highestSeverity = Math.max(highestSeverity, 9);
      category = 'CULTURAL_ABUSE';
    }
  }

  // Commercial Scams
  for (const scam of COMMERCIAL_SCAMS) {
    if (normalized.includes(scam)) {
      matchedTerms.push(scam);
      highestSeverity = Math.max(highestSeverity, 8);
      if (!category) category = 'PROMOTIONAL';
    }
  }

  // 3. Off-Platform Social Solicitation & Shilling
  
  // Handle Solicitation Flags
  const handleRegex = /\b(?:insta|ig|snap|sc|telegram|tg|snapchat)\s*(?::|is|-|pe)?\s*@?[a-z0-9._]{3,25}\b/i;
  if (handleRegex.test(normalized)) {
    matchedTerms.push('social_handle_solicitation');
    highestSeverity = Math.max(highestSeverity, 6);
    if (!category) category = 'SOCIAL_SHILL';
  }

  // Direct Contact Solicitations
  const dmSolicitations = [
    'dm me on', 'inbox me', 'inbox aao',
    'add me on', 'follow me on', 'baat karni hai to',
    'message karo', 'raabta karo'
  ];
  for (const dm of dmSolicitations) {
    if (normalized.includes(dm)) {
      matchedTerms.push(dm);
      highestSeverity = Math.max(highestSeverity, 5);
      if (!category) category = 'SOCIAL_SHILL';
    }
  }

  if (highestSeverity > 0) {
    const result: SoftFilterResult = { flagged: true, severityScore: highestSeverity, matchedTerms };
    if (category) {
      result.category = category;
    }
    return result;
  }

  return { flagged: false, severityScore: 0 };
}
