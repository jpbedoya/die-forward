/**
 * Client-side DISPLAY filter — mirror of the content-filter half of
 * src/lib/moderation.ts (mobile can't import web src/). Keep
 * BLOCKED_ROOTS/CONFUSABLES/URL_RE in sync.
 */

const LEET: Record<string, string> = { '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '@': 'a', '$': 's' };

// Latin look-alikes from Cyrillic (U+0400–04FF) and Greek (U+0370–03FF) — the
// common homoglyph vector for obfuscating Latin slurs (e.g. Cyrillic "ѕһіт").
// Folding ONLY these scripts is i18n-safe: legit CJK / Vietnamese / other
// non-Latin final words contain no confusables here, so they pass through and
// are stripped to '' by the [^a-z0-9] pass — never falsely blocked.
const CONFUSABLES: Record<string, string> = {
  'а': 'a', 'е': 'e', 'о': 'o', 'р': 'p', 'с': 'c', 'у': 'y', 'х': 'x', 'к': 'k', 'м': 'm', 'т': 't', 'в': 'b', 'н': 'h', 'і': 'i', 'ѕ': 's', 'ԁ': 'd',
  'α': 'a', 'ο': 'o', 'ε': 'e', 'ι': 'i', 'ν': 'v', 'ρ': 'p', 'τ': 't', 'υ': 'u', 'κ': 'k', 'χ': 'x',
};

// Small self-contained baseline. Substring match on the collapsed form. Extend behind this same function.
const BLOCKED_ROOTS = [
  'fuck', 'shit', 'cunt', 'bitch', 'asshole', 'bastard', 'dick', 'piss',
  'nigger', 'faggot', 'retard', 'whore', 'slut', 'rape', 'nazi', 'kike', 'spic', 'chink', 'tranny', 'wetback',
];

// Generic TLD (any 2+ letter suffix), plus protocol / www / @handle forms.
// Broadened from a fixed TLD allowlist so exotic spam domains (.ru, .biz, …)
// can't slip through. Over-blocks the rare "word.word" final phrase — fail-safe
// (suppresses rebroadcast only; the author still sees their own words).
const URL_RE = /(https?:\/\/|www\.|\b[\w-]+\.[a-z]{2,}\b|@\w{3,})/i;

export function normalizeForFilter(text: string): string {
  // NFKC folds fullwidth/compatibility homoglyphs (e.g. "ｆｕｃｋ" → "fuck");
  // CONFUSABLES folds the common Cyrillic/Greek Latin look-alikes; LEET folds
  // digit/symbol substitutions; then non-alphanumerics collapse (f.u.c.k → fuck).
  const folded = text
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[\u0400-\u04FF\u0370-\u03FF]/g, (c) => CONFUSABLES[c] ?? c)
    .replace(/[013457@$]/g, (c) => LEET[c] ?? c);
  return folded.replace(/[^a-z0-9]/g, '');
}

export function containsBlockedContent(text: string): boolean {
  if (!text) return false;
  if (URL_RE.test(text)) return true;
  const norm = normalizeForFilter(text);
  return BLOCKED_ROOTS.some((root) => norm.includes(root));
}
