/**
 * Pure A2 moderation core (Phase 4b). Server-authoritative: run in the
 * aggregation cron so only pre-cleaned text ever reaches the client. Fail-closed
 * — unknown author or any doubt → not rebroadcast. No external dependencies.
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

const DAY_MS = 24 * 60 * 60 * 1000;

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

export interface AuthorTrust {
  createdAt: number;
  authType?: string;
  totalLost?: number;
  totalEarned?: number;
  totalClears?: number;
}

export function isTrustedAuthor(a: AuthorTrust | null, opts: { nowMs: number; minAccountAgeMs?: number }): boolean {
  if (!a) return false; // fail-closed: unknown author
  const minAge = opts.minAccountAgeMs ?? 3 * DAY_MS;
  if (typeof a.createdAt === 'number' && opts.nowMs - a.createdAt >= minAge) return true;
  if ((a.totalLost ?? 0) > 0 || (a.totalEarned ?? 0) > 0) return true;
  if (a.authType === 'wallet') return true;
  return false;
}

export function suppressKey(walletAddress: string | null, text: string): string {
  return `${walletAddress ?? '?'}|${(text ?? '').trim().toLowerCase()}`;
}

export function buildSuppressedSet(
  reports: { reportedWallet: string | null; reportedText: string; reporterAuthId: string }[],
  threshold: number,
): Set<string> {
  const byKey = new Map<string, Set<string>>();
  for (const r of reports) {
    const key = suppressKey(r.reportedWallet, r.reportedText);
    let reporters = byKey.get(key);
    if (!reporters) { reporters = new Set(); byKey.set(key, reporters); }
    reporters.add(r.reporterAuthId);
  }
  const out = new Set<string>();
  for (const [key, reporters] of byKey) if (reporters.size >= threshold) out.add(key);
  return out;
}

export interface PhraseCandidate {
  text: string | null;
  nickname: string | null;
  walletAddress: string | null;
  author: AuthorTrust | null;
}
export interface ArchitectEntry { name: string; words: string; }
export interface ModeratedUGC { echoPhrases: string[]; architectEntries: ArchitectEntry[]; }
export interface ModerationOptions {
  nowMs: number;
  minAccountAgeMs?: number;
  maxEcho?: number;
  maxArchitect?: number;
  suppressed?: Set<string>;
}

export function selectModeratedUGC(candidates: PhraseCandidate[], opts: ModerationOptions): ModeratedUGC {
  const maxEcho = opts.maxEcho ?? 5;
  const maxArchitect = opts.maxArchitect ?? 3;
  const suppressed = opts.suppressed ?? new Set<string>();

  const echoSeen = new Set<string>();
  const archSeen = new Set<string>();
  const echoPhrases: string[] = [];
  const architectEntries: ArchitectEntry[] = [];

  for (const c of candidates) {
    const text = (c.text ?? '').trim();
    if (!text) continue;
    if (containsBlockedContent(text)) continue;
    if (!isTrustedAuthor(c.author, opts)) continue;
    if (suppressed.has(suppressKey(c.walletAddress, text))) continue;

    if (echoPhrases.length < maxEcho && !echoSeen.has(text)) {
      echoSeen.add(text);
      echoPhrases.push(text);
    }
    const name = (c.nickname ?? '').trim();
    if (name && architectEntries.length < maxArchitect) {
      const k = `${name}|${text}`;
      if (!archSeen.has(k)) { archSeen.add(k); architectEntries.push({ name, words: text }); }
    }
  }
  return { echoPhrases, architectEntries };
}
