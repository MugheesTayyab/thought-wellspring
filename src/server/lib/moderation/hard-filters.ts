import { NormalizedTextPayload } from './normalize';

export interface HardFilterResult {
  blocked: boolean;
  violationType?: 'PHONE_NUMBER' | 'URL_LINK' | 'SCRIPT_INJECTION' | 'SEVERE_EXPLOIT';
  details?: string;
}

const PHONETIC_DIGIT_MAP: Record<string, string> = {
  'zero': '0', 'sifar': '0', 'shunya': '0',
  'one': '1', 'aik': '1', 'ek': '1',
  'two': '2', 'do': '2', 'tou': '2',
  'three': '3', 'teen': '3',
  'four': '4', 'chaar': '4', 'char': '4',
  'five': '5', 'paanch': '5', 'panch': '5',
  'six': '6', 'chhay': '6', 'che': '6', 'chhe': '6',
  'seven': '7', 'saat': '7', 'sat': '7',
  'eight': '8', 'aath': '8', 'ath': '8',
  'nine': '9', 'nau': '9', 'no': '9',
  'o': '0' // common substitute for zero
};

export function checkHardFilters(payload: NormalizedTextPayload): HardFilterResult {
  const { normalized, compact } = payload;

  // 1. Script Injection & HTML Abuse (Tested against original and normalized)
  const scriptRegex = /<(?:\/)?(?:script|style|iframe|object|embed|svg|img|link|meta)\b[^>]*>/i;
  const eventHandlerRegex = /\bon\w+\s*=\s*["'][^"']*["']/i;
  const protocolInjectionRegex = /(?:javascript|data|vbscript):/i;

  if (
    scriptRegex.test(payload.original) ||
    eventHandlerRegex.test(payload.original) ||
    protocolInjectionRegex.test(payload.original)
  ) {
    return { blocked: true, violationType: 'SCRIPT_INJECTION', details: 'Malicious markup detected' };
  }

  // 2. Phone Number Detection
  // Standard & Delimited Formats (Tested against normalizedText)
  const standardPhoneRegex = /(?:(?:\+|00)92[\s.-]?)?0?3[0-4]\d{1}[\s.-]?\d{3}[\s.-]?\d{4}\b/;
  if (standardPhoneRegex.test(normalized)) {
    return { blocked: true, violationType: 'PHONE_NUMBER', details: 'Domestic phone number' };
  }

  // Obfuscated Spaced Formats (Tested against compactText)
  const compactPhoneRegex = /(?:92|0)?3[0-4]\d{8}/;
  if (compactPhoneRegex.test(compact)) {
    return { blocked: true, violationType: 'PHONE_NUMBER', details: 'Obfuscated phone number' };
  }

  // International Formats (Tested against compactText)
  // UAE (+971), KSA (+966), UK (+44)
  const intlPhoneRegex = /(?:(?:9715\d{8})|(?:9665\d{8})|(?:447\d{9}))/;
  if (intlPhoneRegex.test(compact)) {
    return { blocked: true, violationType: 'PHONE_NUMBER', details: 'International phone number' };
  }

  // Phonetic & Word-Spelled Number Detection
  // Convert words to digits in the normalized text and then compact
  let phoneticNormalized = normalized;
  // Replace each phonetic word with its digit equivalent
  Object.keys(PHONETIC_DIGIT_MAP).forEach(word => {
    // We use word boundary to avoid replacing parts of normal words like 'no' in 'nothing'
    // but 'o' is tricky, so we apply 'o' carefully or rely on compact text
    const regex = new RegExp(`\\b${word}\\b`, 'g');
    phoneticNormalized = phoneticNormalized.replace(regex, PHONETIC_DIGIT_MAP[word]!);
  });
  
  // Re-compact the phonetic text
  const phoneticCompact = phoneticNormalized.replace(/[^a-z0-9]/g, '');
  if (compactPhoneRegex.test(phoneticCompact)) {
    return { blocked: true, violationType: 'PHONE_NUMBER', details: 'Phonetic phone number' };
  }


  // 3. URL, Link & Contact Protocol Neutralization
  const webProtocolRegex = /\b(?:https?:\/\/|ftp:\/\/|www\.)[a-z0-9-]+(?:\.[a-z0-9-]+)+/i;
  const tldRegex = /\b[a-z0-9-]+\.(?:com|pk|org|net|io|me|xyz|top|online|site|info|app|cc|co)\b/i;
  
  // Direct Messaging & Invite Deep Links
  const whatsappRegex = /(?:wa\.me|api\.whatsapp\.com|chat\.whatsapp\.com)\/[a-z0-9_-]+/i;
  const telegramRegex = /(?:t\.me|telegram\.me)\/[a-z0-9_]+/i;
  const discordRegex = /(?:discord\.gg|discord\.com\/invite)\/[a-z0-9_-]+/i;
  const snapchatRegex = /(?:snapchat\.com\/add)\/[a-z0-9._-]+/i;
  const instagramRegex = /(?:instagram\.com|instagr\.am)\/[a-z0-9._-]+/i;
  const tiktokRegex = /(?:tiktok\.com\/@)[a-z0-9._-]+/i;

  if (
    webProtocolRegex.test(normalized) ||
    tldRegex.test(normalized) ||
    whatsappRegex.test(normalized) ||
    telegramRegex.test(normalized) ||
    discordRegex.test(normalized) ||
    snapchatRegex.test(normalized) ||
    instagramRegex.test(normalized) ||
    tiktokRegex.test(normalized)
  ) {
    return { blocked: true, violationType: 'URL_LINK', details: 'Unauthorized link or protocol' };
  }

  // Pass all hard filters
  return { blocked: false };
}

/**
 * Escapes HTML entities to prevent XSS.
 * This should be called before persisting text to the database.
 */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
