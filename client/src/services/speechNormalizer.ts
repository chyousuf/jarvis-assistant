/**
 * Bilingual Phonetic & Vocabulary Normalizer for JARVIS
 * 
 * Handles Pakistani English accents, Roman-Urdu transliterations, Nastaliq Urdu script,
 * and biases recognition towards approved contacts and installed macOS apps.
 */

export interface VocabularyContext {
  contacts: string[];
  apps: string[];
  commands: string[];
}

export const DEFAULT_VOCABULARY: VocabularyContext = {
  contacts: ['Ahmed Raza', 'Ahmed Khan', 'Ali Hassan'],
  apps: ['WhatsApp', 'Google Chrome', 'Chrome', 'Microsoft Word', 'Word', 'TextEdit', 'YouTube', 'Safari', 'Finder', 'Terminal'],
  commands: [
    'open', 'kholo', 'close', 'band karo',
    'send', 'bhejo', 'write', 'likho', 'type karo',
    'read', 'read this', 'read aloud', 'parho', 'sunao', 'summarize',
    'save', 'save karo', 'save document',
    'stop', 'ruko', 'theek hai', 'confirm', 'approve'
  ]
};

// Common Pakistani English / ASR misrecognitions mapped to canonical terms
const PHONETIC_MAPPINGS: Array<[RegExp, string]> = [
  // App names
  [/\b(?:what'?s?\s*app|watsapp|watzaap|watts\s*app|vatsapp|wat\s*sub)\b/gi, 'WhatsApp'],
  [/\b(?:corom|crome|khrom|gogle\s*crome|google\s*crome|krome)\b/gi, 'Chrome'],
  [/\b(?:microsft\s*word|ms\s*word|werd|ward|microsoft\s*ward)\b/gi, 'Word'],
  [/\b(?:text\s*edit|textedit|tax\s*edit|text\s*add)\b/gi, 'TextEdit'],
  [/\b(?:you\s*tube|utube|u\s*tube|you\s*toob)\b/gi, 'YouTube'],
  [/\b(?:safari|safari\s*browser)\b/gi, 'Safari'],
  [/\b(?:calcu\s*later|calcy|calculater)\b/gi, 'Calculator'],
  [/\b(?:terminel|tarminal|termnal)\b/gi, 'Terminal'],

  // Names (Approved contacts)
  [/\b(?:i\s*met|aamad|ahmad|ahemd|ahemad)\b/gi, 'Ahmed'],
  [/\b(?:aali|aly)\b/gi, 'Ali'],
  [/\b(?:hasan|hassan)\b/gi, 'Hassan'],
  [/\b(?:raza|raaza)\b/gi, 'Raza'],
  [/\b(?:khan|kaan)\b/gi, 'Khan'],
  [/\b(?:yousaf|yousuf|yousif|yousaf\s*bhai)\b/gi, 'Yousaf'],
  [/\b(?:usman|osman|uthman)\b/gi, 'Usman'],
  [/\b(?:bilal|belal)\b/gi, 'Bilal'],
  [/\b(?:hamza|humza)\b/gi, 'Hamza'],
  [/\b(?:fatima|faatma)\b/gi, 'Fatima'],
  [/\b(?:ayesha|aisha)\b/gi, 'Ayesha'],

  // Urdu action words / verbs (often misheard phonetically by English STT models)
  [/\b(?:polo|kolo|khollo|khoolo|khol\s*do|khol)\b/gi, 'kholo'],
  [/\b(?:let\s*go|likkho|leekho|likh\s*do|likh)\b/gi, 'likho'],
  [/\b(?:bejo|bhejj\s*o|bheej\s*o|bhej\s*do|bhej)\b/gi, 'bhejo'],
  [/\b(?:seve|saave)\s*karo\b/gi, 'save karo'],
  [/\b(?:roko|rooko|ruk\s*jao|ruk|rukho)\b/gi, 'ruko'],
  [/\b(?:parh\s*lo|parho|parhkar\s*sunao|sunao|parh\s*do)\b/gi, 'parho'],
  [/\b(?:band\s*kar\s*do|close\s*karo)\b/gi, 'band karo'],
  [/\b(?:theek\s*hai|teek\s*hai|thek\s*hai)\b/gi, 'theek hai'],

  // Corrections prefixes
  [/\b(?:nahin|nahi|nae|nai|no)\s*,?\s*(?:maine|mene|me\s*ne)\s*(?:kaha|bola)\b/gi, 'No, I said'],
  [/\b(?:mera\s*matlab\s*(?:tha|hai)|i\s*mean)\b/gi, 'I meant']
];

// Urdu script (Nastaliq/Arabic) to normalized Roman-Urdu / English intent mapping
const URDU_SCRIPT_MAPPINGS: Array<[RegExp, string]> = [
  // Apps & basic verbs in Urdu script
  [/واٹس\s*ایپ\s*(?:ک Ian|کھولو|اوپن)/g, 'WhatsApp kholo'],
  [/واٹس\s*ایپ/g, 'WhatsApp'],
  [/کروم\s*(?:کھولو|اوپن)/g, 'Chrome kholo'],
  [/کروم/g, 'Chrome'],
  [/ورڈ\s*(?:کھولو|اوپن)/g, 'Word kholo'],
  [/ورڈ/g, 'Word'],
  [/یوٹیوب\s*(?:کھولو|اوپن)/g, 'YouTube kholo'],
  [/یوٹیوب/g, 'YouTube'],
  [/ٹیکسٹ\s*ایڈٹ/g, 'TextEdit'],
  [/کیلکولیٹر/g, 'Calculator'],

  // Actions
  [/احمد\s*رضا\s*کو\s*واٹس\s*ایپ\s*میسج\s*بھیجو/g, 'Ahmed Raza ko WhatsApp message bhejo'],
  [/احمد\s*کو\s*میسج\s*لکھو/g, 'Ahmed ko message likho'],
  [/احمد\s*کو\s*(?:واٹس\s*ایپ\s*)?میسج\s*بھیجو/g, 'Ahmed ko WhatsApp message bhejo'],
  [/علی\s*کو\s*ای میل\s*(?:ڈرافٹ\s*کرو|بھیجو)/g, 'Ali ko email draft karo'],
  [/(?:اس\s*ڈاکومنٹ\s*کو|ڈاکومنٹ)\s*سیو\s*کرو/g, 'Is document ko save karo'],
  [/(?:اسے\s*پڑھو|پڑھ\s*کر\s*سناؤ|پڑھو)/g, 'Read this aloud'],
  [/روکو|رک\s*جاؤ|سٹاپ|بس\s*کرو/g, 'ruko']
];

/**
 * Normalizes raw transcript by applying phonetic adjustments,
 * contact & app vocabulary biasing, and Urdu script transliteration.
 */
export function normalizeTranscript(
  rawText: string,
  _vocab: VocabularyContext = DEFAULT_VOCABULARY
): { normalized: string; raw: string; wasModified: boolean } {
  if (!rawText || !rawText.trim()) {
    return { normalized: '', raw: rawText, wasModified: false };
  }

  let text = rawText.trim();
  const original = text;

  // 1. Convert Urdu script phrases to Roman Urdu / English keywords
  for (const [pattern, replacement] of URDU_SCRIPT_MAPPINGS) {
    text = text.replace(pattern, replacement);
  }

  // 2. Apply phonetic corrections
  for (const [pattern, replacement] of PHONETIC_MAPPINGS) {
    text = text.replace(pattern, replacement);
  }

  // 3. Clean up double spaces or awkward punctuation
  text = text.replace(/\s{2,}/g, ' ').trim();

  return {
    normalized: text,
    raw: original,
    wasModified: text.toLowerCase() !== original.toLowerCase()
  };
}

/**
 * Detects whether a transcript is an explicit correction of a previous command
 */
export function parseCorrection(transcript: string): { isCorrection: boolean; correctedCommand: string } {
  const lower = transcript.toLowerCase().trim();
  const correctionPrefixes = [
    /^no[,.\s]+(?:i\s+said|i\s+meant|not\s+that)\s+(.+)$/i,
    /^i\s+meant\s+(.+)$/i,
    /^wrong[,.\s]+(?:i\s+said\s+)?(.+)$/i,
    /^(?:nahin|nahi|nae)[,.\s]+(?:maine\s+kaha|mera\s+matlab\s+tha)\s+(.+)$/i,
    /^(?:correction|correct\s+that\s+to)[:\s]+(.+)$/i
  ];

  for (const regex of correctionPrefixes) {
    const match = transcript.match(regex);
    if (match && match[1]) {
      return {
        isCorrection: true,
        correctedCommand: match[1].trim()
      };
    }
  }

  return { isCorrection: false, correctedCommand: transcript };
}
