import {
  normalizeForFilter, containsBlockedContent, isTrustedAuthor,
  suppressKey, buildSuppressedSet, selectModeratedUGC,
  type PhraseCandidate, type AuthorTrust,
} from '@/lib/moderation';

const NOW = 1_000_000_000_000;
const DAY = 24 * 60 * 60 * 1000;
const oldWallet: AuthorTrust = { createdAt: NOW - 10 * DAY, authType: 'wallet' };

describe('containsBlockedContent', () => {
  it('blocks a URL / domain / handle', () => {
    expect(containsBlockedContent('visit evil.xyz now')).toBe(true);
    expect(containsBlockedContent('http://x.co')).toBe(true);
    expect(containsBlockedContent('dm @scammerbot')).toBe(true);
  });
  it('blocks obfuscated profanity via normalization', () => {
    expect(containsBlockedContent('f.u.c.k')).toBe(true);
    expect(containsBlockedContent('sh1t')).toBe(true);
  });
  it('passes clean bible-voice final words', () => {
    expect(containsBlockedContent('the water took me at last')).toBe(false);
  });
});

describe('isTrustedAuthor', () => {
  it('null author is never trusted (fail-closed)', () => {
    expect(isTrustedAuthor(null, { nowMs: NOW })).toBe(false);
  });
  it('trusts an aged account', () => {
    expect(isTrustedAuthor({ createdAt: NOW - 5 * DAY }, { nowMs: NOW, minAccountAgeMs: 3 * DAY })).toBe(true);
  });
  it('trusts a fresh account that has staked', () => {
    expect(isTrustedAuthor({ createdAt: NOW, totalLost: 0.1 }, { nowMs: NOW, minAccountAgeMs: 3 * DAY })).toBe(true);
  });
  it('does not trust a fresh unstaked guest', () => {
    expect(isTrustedAuthor({ createdAt: NOW, authType: 'guest' }, { nowMs: NOW, minAccountAgeMs: 3 * DAY })).toBe(false);
  });
});

describe('buildSuppressedSet', () => {
  it('suppresses text with >= threshold DISTINCT reporters', () => {
    const reports = [
      { reportedWallet: 'w', reportedText: 'bad words', reporterAuthId: 'a' },
      { reportedWallet: 'w', reportedText: 'bad words', reporterAuthId: 'b' },
      { reportedWallet: 'w', reportedText: 'bad words', reporterAuthId: 'a' }, // dup reporter
    ];
    const set = buildSuppressedSet(reports, 2);
    expect(set.has(suppressKey('w', 'bad words'))).toBe(true);
  });
  it('does not suppress below threshold (distinct)', () => {
    const reports = [
      { reportedWallet: 'w', reportedText: 'ok text', reporterAuthId: 'a' },
      { reportedWallet: 'w', reportedText: 'ok text', reporterAuthId: 'a' },
    ];
    expect(buildSuppressedSet(reports, 2).size).toBe(0);
  });
});

describe('selectModeratedUGC', () => {
  const opts = { nowMs: NOW, minAccountAgeMs: 3 * DAY };
  it('keeps clean trusted text and drops blocked/untrusted/suppressed', () => {
    const candidates: PhraseCandidate[] = [
      { text: 'i died as i lived', nickname: 'Saltborn', walletAddress: 'w1', author: oldWallet },
      { text: 'go to evil.xyz', nickname: 'Spammer', walletAddress: 'w2', author: oldWallet },   // blocked
      { text: 'fresh guest words', nickname: 'Guest', walletAddress: 'w3', author: { createdAt: NOW, authType: 'guest' } }, // untrusted
      { text: 'reported words', nickname: 'Griefed', walletAddress: 'w4', author: oldWallet },   // suppressed
    ];
    const suppressed = new Set([suppressKey('w4', 'reported words')]);
    const out = selectModeratedUGC(candidates, { ...opts, suppressed });
    expect(out.echoPhrases).toEqual(['i died as i lived']);
    expect(out.architectEntries).toEqual([{ name: 'Saltborn', words: 'i died as i lived' }]);
  });
  it('dedupes and caps', () => {
    const many: PhraseCandidate[] = Array.from({ length: 8 }, (_, i) => ({
      text: `words ${i % 2}`, nickname: `N${i % 2}`, walletAddress: `w${i}`, author: oldWallet,
    }));
    const out = selectModeratedUGC(many, { ...opts, maxEcho: 5, maxArchitect: 3 });
    expect(out.echoPhrases).toEqual(['words 0', 'words 1']); // de-duped
    expect(out.architectEntries.length).toBeLessThanOrEqual(3);
  });
  it('skips architect entries without a nickname but can still echo', () => {
    const out = selectModeratedUGC(
      [{ text: 'nameless end', nickname: null, walletAddress: 'w', author: oldWallet }], opts);
    expect(out.echoPhrases).toEqual(['nameless end']);
    expect(out.architectEntries).toEqual([]);
  });
});
