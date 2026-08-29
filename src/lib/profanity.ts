/**
 * Smart profanity filter.
 * Blocks abusive / lustful / degrading input, but deliberately allows explicit
 * anatomical, medical and academic terminology when it is used as study context.
 */

/** Slurs and sexual/abusive terms that are never acceptable as a display name. */
const HARD_BLOCK = [
  "fuck", "fucking", "motherfucker", "cunt", "kanker", "kut", "hoer", "slet",
  "nigger", "nigga", "faggot", "flikker", "retard", "mongool", "whore", "slut",
  "rape", "verkrachten", "bitch", "teef", "dick", "cock", "pussy", "boobs",
  "tieten", "penis", "vagina", "porn", "porno", "sex", "seks", "horny", "geil",
  "nude", "naakt", "anal", "blowjob", "pijpen", "wanking", "aftrekken",
];

/** Signals that explicit terminology is used in a legitimate learning context. */
const EDUCATIONAL_CONTEXT = [
  "biology", "biologie", "anatomy", "anatomie", "medical", "medisch", "exam",
  "tentamen", "toets", "reproduction", "reproductie", "hormone", "hormoon",
  "puberty", "puberteit", "disease", "ziekte", "health", "gezondheid", "essay",
  "history", "geschiedenis", "law", "recht", "sociology", "sociologie",
  "psychology", "psychologie", "definition", "definitie", "explain", "leg uit",
  "summar", "samenvat", "study", "studie", "lesson", "les", "research",
  "onderzoek", "thesis", "scriptie", "clinical", "klinisch", "consent",
];

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[0@]/g, "o")
    .replace(/[1!|]/g, "i")
    .replace(/3/g, "e")
    .replace(/\$/g, "s")
    .replace(/[^a-z\s]/g, " ");
}

function hits(text: string): string[] {
  const norm = normalize(text);
  const words = new Set(norm.split(/\s+/).filter(Boolean));
  return HARD_BLOCK.filter((w) => words.has(w) || (w.length > 5 && norm.includes(w)));
}

export interface ProfanityVerdict {
  blocked: boolean;
  reason?: string;
}

/** Display names are strict: no explicit terminology at all. */
export function checkPreferredName(name: string): ProfanityVerdict {
  const trimmed = name.trim();
  if (trimmed.length < 2) return { blocked: true, reason: "Please use at least 2 characters." };
  if (trimmed.length > 32) return { blocked: true, reason: "Please keep it under 32 characters." };
  if (hits(trimmed).length) {
    return { blocked: true, reason: "That name contains inappropriate language. Try another one." };
  }
  return { blocked: false };
}

/**
 * Chat input: explicit words are allowed when the message reads as educational.
 * Purely lustful or abusive messages are blocked.
 */
export function checkChatMessage(message: string): ProfanityVerdict {
  const found = hits(message);
  if (!found.length) return { blocked: false };

  const norm = normalize(message);
  const educational = EDUCATIONAL_CONTEXT.some((c) => norm.includes(normalize(c).trim()));
  const questionLike = /\?|\b(what|why|how|explain|define|wat|waarom|hoe|leg|betekent)\b/i.test(message);

  if (educational || (questionLike && message.trim().length > 25)) return { blocked: false };

  return {
    blocked: true,
    reason: "Let's keep it study-friendly. Rephrase your question and Nextudy will help.",
  };
}
