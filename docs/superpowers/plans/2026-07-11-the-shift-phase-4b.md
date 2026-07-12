# The Shift — Phase 4b: UGC Moderation Gate (A2) → Echo Husks + Architect Walls — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the A2 moderation gate (server-authoritative profanity/URL filter + trust-weighting + report-based suppression) and, gated behind it, rebroadcast real fallen players' final words as Echo Husk recitals and Architect-wall inscriptions.

**Architecture:** All UGC moderation runs SERVER-SIDE at aggregation time — the client only ever displays already-cleaned text. A pure `moderation.ts` core (content filter + trust-weighting + report suppression, no external dep) is applied in the nightly `runAggregation` cron, which joins trusted `runReceipts` (now carrying `finalMessage`) to `players` (for account-age/stake trust + nickname) and to a new `reports` namespace (for suppression), writing a small MODERATED `echoPhrases` + `architectEntries` list onto each `worldShifts` row. The mobile client threads those through `CommunityShift` and displays them (Echo Husk recital in combat; Architect-wall inscriptions at the deadliest node), each with a report button that writes an authenticated `reports` row.

**Tech Stack:** Next.js cron/API routes + `@instantdb/admin` (web), Expo/React Native + jest (mobile), the 4a community layer + the security-phase `verifyAuthToken`. No new dependencies (self-contained moderation).

## Global Constraints

- **A2 gate is load-bearing (spec §3.2): no filter, no rebroadcast.** ANY player-authored text surfaced to OTHER players (Echo Husk phrases, Architect-wall names/final words) MUST pass: (1) profanity/URL filtering, (2) trust-weighting (author account age / staked history), (3) a report button + report-count suppression. This is a store-review-level requirement, not polish.
- **Moderation is SERVER-AUTHORITATIVE and fail-closed.** All three checks run in the aggregation cron; the client displays only pre-cleaned text. If author trust cannot be established (e.g. no `players` row / guest), the text is NOT rebroadcast. When in doubt, suppress.
- **Trusted source only.** Rebroadcast text comes from `runReceipts` (server-only-writable), NEVER raw `deaths` (client-forgeable). Task 1 adds `finalMessage` to the receipt so no forgeable row feeds rebroadcast.
- **No UGC translation.** The author's own text is displayed raw (their language); only the surrounding chrome (report button, labels) is i18n-keyed across all 7 locales.
- **Reuse 4a/4c:** the `worldShifts` namespace + `CommunityShift` + the `runAggregation` cron + `game.communityShift` state. Determinism preserved (seeded picks); pure logic unit-tested.
- **Tunables on `gameSettings`** (like 4a): `ugcMinAccountAgeDays` (default 3), `ugcReportThreshold` (default 2), read with `?? default`.
- **Bible voice** for new chrome copy; NO exclamation marks; all via `t()`; 7 locale catalogs stay key-identical.
- **Extra-caution files:** `instant.ts`, `combat.tsx`, `death/route.ts`. Additive changes only.

---

## File Structure

- **Modify `src/lib/coins.ts`** — `RunReceipt` + `buildRunReceipt` gain optional `finalMessage`.
- **Modify `src/app/api/session/death/route.ts`** — pass `finalMessage` into the receipt.
- **Create `src/lib/moderation.ts`** — pure A2 core: `containsBlockedContent`, `isTrustedAuthor`, `selectModeratedUGC`, `suppressKey`, `buildSuppressedSet`.
- **Create `src/lib/__tests__/moderation.test.ts`** — full unit coverage.
- **Modify `instant.perms.ts`** — add deny-by-default-ish `reports` namespace.
- **Create `src/app/api/moderation/report/route.ts`** — authenticated report writer (server looks up the death/corpse; never trusts client for the reported text/author).
- **Modify `src/app/api/game/shift/route.ts`** — `runAggregation` joins receipts→players→reports, runs `selectModeratedUGC`, writes `echoPhrases`/`architectEntries`.
- **Modify `mobile/lib/world-shift.ts`** — `CommunityShift` + both fetch mappings gain `echoPhrases`/`architectEntries`.
- **Modify `mobile/lib/creature-rules.ts`** — add `'repeating'` to `SignatureRuleId`; add pure `pickEchoPhrase`.
- **Modify `mobile/lib/content.ts`** — attach `signature: { id: 'repeating' }` to `'Echo Husks'`.
- **Modify `mobile/app/combat.tsx`** — Echo Husk recites a moderated phrase.
- **Modify `mobile/app/play.tsx`** — Architect-wall inscriptions at the architect node + report button on corpse/architect UGC.
- **Create `mobile/lib/api-moderation.ts`** (or extend `mobile/lib/api.ts`) — `reportUGC(deathId)` client call with the auth header.
- **Modify `mobile/lib/locales/*.json` (×7)** — report/wall chrome keys.
- **Docs:** spec §3.2 (A2) + §6 (Echo Husks) done-notes, `CLAUDE.md`.

**Deferred (write down, do not silently trim):**
- **Echo Husk *Listening* mechanic** (attacking on consecutive turns draws focus) — a pure combat mechanic orthogonal to UGC/A2; separate follow-up. 4b ships *Repeating* (the rebroadcast recital), which is the A2-relevant half.
- **Human moderation dashboard / appeal flow** — 4b is automated filter + community report suppression; an admin review queue is a later addition.
- **Richer profanity model** — 4b ships a self-contained baseline wordlist + normalization + URL detection; a fuller model (or a vetted library) can replace `containsBlockedContent` behind the same signature later.

---

### Task 1: Add `finalMessage` to run receipts (trusted rebroadcast source)

Mirrors 4a's `killedBy`/`nodeId` addition — the receipt is the only server-only-writable, account-identified death record, so rebroadcast text must come from it, not the forgeable `deaths` row.

**Files:**
- Modify: `src/lib/coins.ts` (`RunReceipt` interface + `RunReceiptInput` + `buildRunReceipt`)
- Modify: `src/app/api/session/death/route.ts` (the death-path `buildRunReceipt({...})` call)
- Test: `src/lib/__tests__/coins.test.ts`

**Interfaces:**
- Produces: `RunReceipt` gains `finalMessage: string | null`; `buildRunReceipt` accepts optional `finalMessage?: string | null` (default null). Task 4 reads `receipt.finalMessage`.

- [ ] **Step 1: Write the failing test** — in `src/lib/__tests__/coins.test.ts`, add to the existing `buildRunReceipt` describe (reuse its `base` fixture pattern from the 4a killedBy/nodeId tests):

```ts
describe('buildRunReceipt finalMessage', () => {
  const base = {
    sessionId: 's1', sessionToken: 't1', authId: 'wallet-abc', walletAddress: 'wallet-abc',
    zoneId: 'sunken-crypt', runSeed: 'seed', seedSource: 'legacy', serverDayKey: '2026-07-11',
    dailyShiftEnabled: true, chosenModifierId: null, stakeMode: 'free' as const, coinStake: 0,
    outcome: 'dead' as const, finalDepth: 7, coinDelta: 0, streakAfter: 0, createdAt: 1,
  };
  it('records finalMessage when provided', () => {
    expect(buildRunReceipt({ ...base, finalMessage: 'i should not have come here' }).finalMessage)
      .toBe('i should not have come here');
  });
  it('defaults finalMessage to null when omitted', () => {
    expect(buildRunReceipt(base).finalMessage).toBeNull();
  });
});
```

- [ ] **Step 2: Run it and verify fail**

Run: `cd /Volumes/FP80/code/dieforward && npx jest coins -t finalMessage`
Expected: FAIL (property does not exist / type error).

- [ ] **Step 3: Implement** — in `src/lib/coins.ts`: add `finalMessage: string | null;` to `RunReceipt` (after `nodeId`), `finalMessage?: string | null;` to the input type, and `finalMessage: input.finalMessage ?? null,` to the returned object. In `src/app/api/session/death/route.ts`, add to the death-path `buildRunReceipt({...})` call: `finalMessage: finalMessage.trim() || null,` (`finalMessage` is already destructured + validated ≤50 chars). Leave the victory route's call unchanged (a clear has no death words → null).

- [ ] **Step 4: Run tests and verify pass**

Run: `cd /Volumes/FP80/code/dieforward && npx jest coins && npx tsc --noEmit`
Expected: PASS, tsc exit 0.

- [ ] **Step 5: Commit**

```bash
git add src/lib/coins.ts src/app/api/session/death/route.ts src/lib/__tests__/coins.test.ts
git commit -m "feat(4b): add finalMessage to run receipts (trusted rebroadcast source)"
```

---

### Task 2: Pure A2 moderation core (`moderation.ts`)

**Files:**
- Create: `src/lib/moderation.ts`
- Test: `src/lib/__tests__/moderation.test.ts`

**Interfaces:**
```ts
export interface AuthorTrust {
  createdAt: number;
  authType?: string;           // 'wallet' | 'guest' | 'email'
  totalLost?: number;
  totalEarned?: number;
  totalClears?: number;
}
export interface PhraseCandidate {
  text: string | null;            // finalMessage (raw UGC)
  nickname: string | null;        // author's saved nickname (for Architect attribution)
  walletAddress: string | null;
  author: AuthorTrust | null;     // joined players row; null when unknown (→ untrusted)
}
export interface ArchitectEntry { name: string; words: string; }
export interface ModeratedUGC { echoPhrases: string[]; architectEntries: ArchitectEntry[]; }
export interface ModerationOptions {
  nowMs: number;
  minAccountAgeMs?: number;       // default 3 days
  maxEcho?: number;               // default 5
  maxArchitect?: number;          // default 3
  suppressed?: Set<string>;       // suppressKey(wallet, text) values with reports >= threshold
}

export function normalizeForFilter(text: string): string;
export function containsBlockedContent(text: string): boolean;   // profanity OR URL
export function isTrustedAuthor(a: AuthorTrust | null, opts: { nowMs: number; minAccountAgeMs?: number }): boolean;
export function suppressKey(walletAddress: string | null, text: string): string;
export function buildSuppressedSet(reports: { reportedWallet: string | null; reportedText: string; reporterAuthId: string }[], threshold: number): Set<string>;
export function selectModeratedUGC(candidates: PhraseCandidate[], opts: ModerationOptions): ModeratedUGC;
```

**Rules (all unit-tested):**
- `normalizeForFilter`: lowercase, map common leet (`0→o,1→i,3→e,4→a,5→s,7→t,@→a,$→s`), strip non-alphanumerics to collapse `f.u.c.k`→`fuck`.
- `containsBlockedContent`: true if the normalized text contains any blocked root (a small self-contained list of ~20 unambiguous slurs/profanities as substrings on the collapsed form) OR the RAW text matches a URL/domain/handle regex (`https?://`, `www.`, `\b\w+\.(com|net|org|io|xyz|gg|co)\b`, `@\w{3,}`). Fail-closed: a match blocks.
- `isTrustedAuthor(null)` → **false**. Otherwise true iff (account age `nowMs - createdAt >= minAccountAgeMs`) OR staked history (`(totalLost ?? 0) > 0 || (totalEarned ?? 0) > 0`) OR `authType === 'wallet'`.
- `suppressKey` = `` `${walletAddress ?? '?'}|${text.trim().toLowerCase()}` ``.
- `buildSuppressedSet`: group reports by `suppressKey(reportedWallet, reportedText)`, count **distinct** `reporterAuthId`, include the key iff distinct-count ≥ threshold.
- `selectModeratedUGC`: for each candidate, ELIGIBLE iff `text` non-empty AND `!containsBlockedContent(text)` AND `isTrustedAuthor(author)` AND `!suppressed.has(suppressKey(wallet, text))`. From eligibles: `echoPhrases` = de-duplicated trimmed texts, capped at `maxEcho`; `architectEntries` = `{name: nickname, words: text}` for eligibles WITH a non-empty `nickname`, de-duplicated by name+words, capped at `maxArchitect`. Deterministic ordering (input order; no RNG).

- [ ] **Step 1: Write the failing tests** — create `src/lib/__tests__/moderation.test.ts` (match `world-shift-agg.test.ts` conventions):

```ts
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
```

- [ ] **Step 2: Run and verify fail**

Run: `cd /Volumes/FP80/code/dieforward && npx jest moderation`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/lib/moderation.ts`**

```ts
/**
 * Pure A2 moderation core (Phase 4b). Server-authoritative: run in the
 * aggregation cron so only pre-cleaned text ever reaches the client. Fail-closed
 * — unknown author or any doubt → not rebroadcast. No external dependencies.
 */

const LEET: Record<string, string> = { '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '@': 'a', '$': 's' };

// Small self-contained baseline. Substring match on the collapsed form. Extend behind this same function.
const BLOCKED_ROOTS = [
  'fuck', 'shit', 'cunt', 'bitch', 'asshole', 'bastard', 'dick', 'piss',
  'nigger', 'faggot', 'retard', 'whore', 'slut', 'rape', 'nazi', 'kike', 'spic', 'chink', 'tranny', 'wetback',
];

const URL_RE = /(https?:\/\/|www\.|\b[\w-]+\.(?:com|net|org|io|xyz|gg|co|app|link|me)\b|@\w{3,})/i;

const DAY_MS = 24 * 60 * 60 * 1000;

export function normalizeForFilter(text: string): string {
  const leeted = text.toLowerCase().replace(/[013457@$]/g, (c) => LEET[c] ?? c);
  return leeted.replace(/[^a-z0-9]/g, '');
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
```

- [ ] **Step 4: Run tests and verify pass**

Run: `cd /Volumes/FP80/code/dieforward && npx jest moderation && npx tsc --noEmit`
Expected: all PASS, tsc exit 0.

- [ ] **Step 5: Commit**

```bash
git add src/lib/moderation.ts src/lib/__tests__/moderation.test.ts
git commit -m "feat(4b): pure A2 moderation core — content filter, trust-weighting, report suppression"
```

---

### Task 3: `reports` namespace + authenticated report route

**Files:**
- Modify: `instant.perms.ts` (add `reports`)
- Create: `src/app/api/moderation/report/route.ts`

**Interfaces:**
- Produces: `POST /api/moderation/report` `{ deathId }` (auth via `Authorization: Bearer <token>`). The server verifies the token (`verifyAuthToken`), looks up the corpse/death by `deathId` to get the AUTHORITATIVE `walletAddress` + `finalMessage` (never trusts the client for those), and writes a `reports` row `{ deathId, reporterAuthId, reportedWallet, reportedText, createdAt }`. Task 4 reads `reports` to build the suppressed set.
- Perms: `reports` — `create: "auth.id != null"`, `view: "false"`, `update: "false"`, `delete: "false"` (write-only from clients; server admin reads via bypass).

- [ ] **Step 1: Add perms** — in `instant.perms.ts`, after the `worldShifts` block:

```ts
  // reports: UGC abuse reports (A2). Any authenticated client may create one;
  // nobody may read/edit/delete them from the client (server aggregation reads
  // via the admin bypass). Prevents report tampering + reporter enumeration.
  reports: {
    allow: {
      view: "false",
      create: "auth.id != null",
      update: "false",
      delete: "false",
    },
  },
```

- [ ] **Step 2: Implement the route** — `src/app/api/moderation/report/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server';
import { tx, id } from '@instantdb/admin';
import { db } from '@/lib/db';
import { verifyAuthToken } from '@/lib/auth-server';

export async function POST(request: NextRequest) {
  try {
    const identity = await verifyAuthToken(request); // header path; read before body
    if (!identity) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

    const body = await request.json();
    const deathId = body?.deathId;
    if (!deathId || typeof deathId !== 'string') {
      return NextResponse.json({ error: 'deathId required' }, { status: 400 });
    }

    // Look up the AUTHORITATIVE reported text/author server-side — never trust the client.
    // Try the death row first, then the corpse (players report from corpse surfaces).
    const deathRes = await db.query({ deaths: { $: { where: { id: deathId }, limit: 1 } } }).catch(() => null);
    let row = deathRes?.deaths?.[0] as Record<string, unknown> | undefined;
    if (!row) {
      const corpseRes = await db.query({ corpses: { $: { where: { id: deathId }, limit: 1 } } }).catch(() => null);
      row = corpseRes?.corpses?.[0] as Record<string, unknown> | undefined;
    }
    if (!row) return NextResponse.json({ error: 'Target not found' }, { status: 404 });

    const reportedWallet = (row.walletAddress as string) ?? null;
    const reportedText = ((row.finalMessage as string) ?? '').trim();
    if (!reportedText) return NextResponse.json({ success: true, noop: true }); // nothing to suppress

    // Idempotent-ish: one report row per (reporter, death). Best-effort dedupe by querying is
    // unnecessary — buildSuppressedSet counts DISTINCT reporterAuthId, so duplicates don't inflate.
    await db.transact([
      tx.reports[id()].update({
        deathId,
        reporterAuthId: identity.authId,
        reportedWallet,
        reportedText,
        createdAt: Date.now(),
      }),
    ]);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to record report:', error);
    return NextResponse.json({ error: 'Failed to record report' }, { status: 500 });
  }
}
```

- [ ] **Step 3: Verify**

Run: `cd /Volumes/FP80/code/dieforward && npx tsc --noEmit`
Expected: exit 0. (Route not unit-tested — InstantDB admin; the suppressed-set logic it feeds is tested in Task 2. In the report, trace: token required → 401 without; reportedText/wallet come from the DB row, not the body.)

- [ ] **Step 4: Commit**

```bash
git add instant.perms.ts src/app/api/moderation/report/route.ts
git commit -m "feat(4b): reports namespace + authenticated report route (server-authoritative target lookup)"
```

---

### Task 4: Aggregation computes the moderated UGC channel

**Files:**
- Modify: `src/app/api/game/shift/route.ts` (`runAggregation`)

**Interfaces:**
- Consumes: `selectModeratedUGC`/`buildSuppressedSet`/`AuthorTrust`/`PhraseCandidate` (Task 2); the raw `runReceipts` rows (now carrying `finalMessage`, Task 1); `reports` + `players` reads.
- Produces: each `worldShifts` row gains `echoPhrases: string[]` and `architectEntries: {name,words}[]` (moderated). Written by merging into the existing `buildWorldShiftWrites` plan's `fields` (do NOT change the pure `buildWorldShiftWrites` — merge in the route).

**Design:** keep `aggregateZoneDay`/`ReceiptForAgg` UGC-FREE (invariant). Build UGC separately from the RAW receipt rows + joined `players` + the `reports` suppressed set, per zone, then merge into the write.

- [ ] **Step 1: Implement** — in `runAggregation`, after `rows` (raw receipts) are read and BEFORE/around the per-zone loop:

```ts
// ── A2 moderated UGC channel (Phase 4b) ──────────────────────────────────────
// Rebroadcast text comes ONLY from receipts (trusted) + is moderated server-side.
const ugcMinAccountAgeDays = (settings.ugcMinAccountAgeDays as number) ?? 3;
const ugcReportThreshold = (settings.ugcReportThreshold as number) ?? 2;
const minAccountAgeMs = ugcMinAccountAgeDays * 24 * 60 * 60 * 1000;

// reports → suppressed set
const reportsRes = await db.query({ reports: {} }).catch(() => null);
const reportRows = (reportsRes?.reports ?? []) as Record<string, unknown>[];
const suppressed = buildSuppressedSet(
  reportRows.map((r) => ({
    reportedWallet: (r.reportedWallet as string) ?? null,
    reportedText: (r.reportedText as string) ?? '',
    reporterAuthId: (r.reporterAuthId as string) ?? '',
  })),
  ugcReportThreshold,
);

// players → author trust + nickname, keyed by authId AND walletAddress
const playersRes = await db.query({ players: {} }).catch(() => null);
const playerRows = (playersRes?.players ?? []) as Record<string, unknown>[];
const authorByKey = new Map<string, { trust: AuthorTrust; nickname: string | null }>();
for (const p of playerRows) {
  const entry = {
    trust: {
      createdAt: (p.createdAt as number) ?? 0,
      authType: (p.authType as string) ?? undefined,
      totalLost: (p.totalLost as number) ?? 0,
      totalEarned: (p.totalEarned as number) ?? 0,
      totalClears: (p.totalClears as number) ?? 0,
    } as AuthorTrust,
    nickname: (p.nickname as string) ?? null,
  };
  if (p.authId) authorByKey.set(`auth:${p.authId as string}`, entry);
  if (p.walletAddress) authorByKey.set(`wallet:${p.walletAddress as string}`, entry);
}

// per-zone candidates from RAW receipts (deduped-death text lives on the receipt now)
function candidatesForZone(zoneId: string): PhraseCandidate[] {
  return rows
    .filter((r) => r.zoneId === zoneId && r.outcome === 'dead' && typeof r.finalMessage === 'string' && (r.finalMessage as string).trim())
    .map((r) => {
      const author =
        authorByKey.get(`auth:${(r.authId as string) ?? ''}`) ??
        authorByKey.get(`wallet:${(r.walletAddress as string) ?? ''}`) ?? null;
      return {
        text: (r.finalMessage as string) ?? null,
        nickname: author?.nickname ?? null,
        walletAddress: (r.walletAddress as string) ?? null,
        author: author?.trust ?? null,
      };
    });
}
```
Then in the per-zone loop, compute UGC alongside the aggregate:
```ts
const ugcByZone: Record<string, { echoPhrases: string[]; architectEntries: { name: string; words: string }[] }> = {};
for (const zoneId of ZONE_IDS) {
  // ... existing validCreatures + aggregateZoneDay ...
  ugcByZone[zoneId] = selectModeratedUGC(candidatesForZone(zoneId), {
    nowMs, minAccountAgeMs, suppressed,
  });
}
```
And merge into the writes (replace the existing `writes` map):
```ts
const writes = plans.map((p) => {
  const ugc = ugcByZone[p.fields.zoneId as string] ?? { echoPhrases: [], architectEntries: [] };
  return tx.worldShifts[p.rowId].update({ ...p.fields, echoPhrases: ugc.echoPhrases, architectEntries: ugc.architectEntries });
});
```
Add the imports: `import { selectModeratedUGC, buildSuppressedSet, type AuthorTrust, type PhraseCandidate } from '@/lib/moderation';`.

- [ ] **Step 2: Verify**

Run: `cd /Volumes/FP80/code/dieforward && npx jest && npx tsc --noEmit`
Expected: root suite green (moderation + agg tests intact), tsc exit 0.

- [ ] **Step 3: Manual trace (report):** confirm (a) UGC text comes from `runReceipts.finalMessage` only, never `deaths`; (b) trust join uses `players` by authId/wallet, null author → suppressed; (c) reports → distinct-reporter suppressed set; (d) `aggregateZoneDay`/`ReceiptForAgg` remain UGC-free; (e) worldShifts row now carries `echoPhrases`/`architectEntries`.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/game/shift/route.ts
git commit -m "feat(4b): aggregation computes server-moderated echoPhrases + architectEntries"
```

---

### Task 5: Thread `echoPhrases` / `architectEntries` through the client community layer

**Files:**
- Modify: `mobile/lib/world-shift.ts` (`CommunityShift` + both fetch mappings)
- Test: `mobile/lib/__tests__/world-shift.test.ts` (mapping default shape)

**Interfaces:**
- Produces: `CommunityShift` gains `echoPhrases: string[]` and `architectEntries: { name: string; words: string }[]`. Both `fetchCommunityShift` and `fetchCommunityShiftsForDay` map them (default `[]`). Tasks 6-7 consume them off `game.communityShift` / per-zone community.

- [ ] **Step 1: Add fields** to `CommunityShift`:
```ts
  echoPhrases: string[];
  architectEntries: { name: string; words: string }[];
```

- [ ] **Step 2: Map them** in BOTH `fetchCommunityShift` (single) and `fetchCommunityShiftsForDay` (batch) return objects:
```ts
      echoPhrases: Array.isArray(s.echoPhrases) ? s.echoPhrases : [],
      architectEntries: Array.isArray(s.architectEntries) ? s.architectEntries : [],
```
(The GET passthrough returns the raw worldShifts row, so no server-route change is needed — the new fields flow through automatically.)

- [ ] **Step 3: Update any `CommunityShift` literal in tests** — the 4c/4a mergeShift/community test fixtures construct `CommunityShift` objects; add `echoPhrases: [], architectEntries: []` to each so they still type-check. Add one assertion that `fetchCommunityShiftsForDay`/`fetchCommunityShift` default both to `[]` when absent (mirrors existing degrade tests).

- [ ] **Step 4: Verify**

Run: `cd /Volumes/FP80/code/dieforward/mobile && npx jest world-shift && npx tsc --noEmit`
Expected: PASS, tsc exit 0.

- [ ] **Step 5: Commit**

```bash
git add mobile/lib/world-shift.ts mobile/lib/__tests__/world-shift.test.ts
git commit -m "feat(4b): thread moderated echoPhrases/architectEntries through CommunityShift"
```

---

### Task 6: Echo Husk *Repeating* — recite a moderated phrase

**Files:**
- Modify: `mobile/lib/creature-rules.ts` (add `'repeating'` to `SignatureRuleId`; add pure `pickEchoPhrase`)
- Modify: `mobile/lib/content.ts` (attach `signature: { id: 'repeating' }` to `'Echo Husks'`)
- Modify: `mobile/app/combat.tsx` (display the recital when the enemy is an Echo Husk)
- Test: `mobile/lib/__tests__/creature-rules.test.ts` (add `pickEchoPhrase` cases)

**Interfaces:**
- Produces: `pickEchoPhrase(phrases: string[], seed: number): string | null` — deterministic pick (null when empty). Consumed by combat.tsx.

- [ ] **Step 1: Write the failing test** — append to `mobile/lib/__tests__/creature-rules.test.ts`:
```ts
import { pickEchoPhrase } from '../creature-rules';
describe('pickEchoPhrase', () => {
  it('returns null for an empty list', () => {
    expect(pickEchoPhrase([], 5)).toBeNull();
  });
  it('is deterministic for a given seed', () => {
    const p = ['a', 'b', 'c'];
    expect(pickEchoPhrase(p, 7)).toBe(pickEchoPhrase(p, 7));
    expect(p).toContain(pickEchoPhrase(p, 7));
  });
});
```

- [ ] **Step 2: Run and verify fail**

Run: `cd /Volumes/FP80/code/dieforward/mobile && npx jest creature-rules -t pickEchoPhrase`
Expected: FAIL — not exported.

- [ ] **Step 3: Implement** — in `mobile/lib/creature-rules.ts`: add `'repeating'` to the `SignatureRuleId` union, and:
```ts
/** Deterministic pick from a moderated phrase list (null when empty). Pure — no RNG. */
export function pickEchoPhrase(phrases: string[], seed: number): string | null {
  if (!phrases.length) return null;
  const idx = Math.abs(Math.floor(seed)) % phrases.length;
  return phrases[idx];
}
```
In `mobile/lib/content.ts`, add `signature: { id: 'repeating' },` to the `'Echo Husks'` bestiary entry (alongside its existing fields). In `mobile/app/combat.tsx`, when the resolved `creature?.name === 'Echo Husks'` (or `creature.signature?.id === 'repeating'`) and `game.communityShift?.echoPhrases?.length`, render one recital line (bible voice), e.g. a `t('combat.echo.recite', { words })` where `words = pickEchoPhrase(game.communityShift.echoPhrases, <stable per-encounter seed, e.g. enemyHealth+currentNodeId hash or the run seed>)`. Display only — no combat-math change; must not consume the run RNG stream (use a stable non-RNG seed like a hash of the node id). Add `combat.echo.recite` to all 7 locales: `"It repeats the words of the dead: \"{words}\""`. The `{words}` UGC is shown raw (author's language), the frame is localized.

- [ ] **Step 4: Run tests and verify pass**

Run: `cd /Volumes/FP80/code/dieforward/mobile && npx jest creature-rules && npx jest && npx tsc --noEmit`
Expected: PASS, full mobile suite green, tsc exit 0.

- [ ] **Step 5: Commit**

```bash
git add mobile/lib/creature-rules.ts mobile/lib/content.ts mobile/app/combat.tsx mobile/lib/locales mobile/lib/__tests__/creature-rules.test.ts
git commit -m "feat(4b): Echo Husk Repeating — recites a moderated zone final word"
```

---

### Task 7: Architect-wall inscriptions + report button + i18n

**Files:**
- Modify: `mobile/app/play.tsx` (architect block ~680-682; corpse UGC ~687-701)
- Modify: `mobile/lib/api.ts` (add `reportUGC(deathId)` with the auth header)
- Modify: `mobile/lib/locales/*.json` (×7)

**Interfaces:**
- Consumes: `game.communityShift?.architectEntries` (Task 5), the auth header pattern from `mobile/lib/api.ts` (security phase `authHeaders()`), the report route (Task 3).
- Produces: `reportUGC(deathId: string): Promise<void>` (POST `/api/moderation/report`, best-effort, never throws).

- [ ] **Step 1: Add the client call** — in `mobile/lib/api.ts`, mirroring the existing `authHeaders()`-spread requests:
```ts
export async function reportUGC(deathId: string): Promise<void> {
  try {
    await fetch(`${API_BASE}/api/moderation/report`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ deathId }),
    });
  } catch { /* best-effort */ }
}
```
(Match the file's real `API_BASE`/`authHeaders` names.)

- [ ] **Step 2: Architect-wall inscriptions** — in `play.tsx`, at the `isArchitect` block (~680-682), when `game.communityShift?.architectEntries?.length`, render the moderated entries below the existing `community.architect` line: for each `{name, words}` show `@{name}` + `"{words}"` (raw UGC, reusing the corpse UGC styling right below at ~687-701) with a small report affordance. Cap the rendered list defensively (the server already caps at 3).

- [ ] **Step 3: Report button** — add a compact report control (`t('moderation.report')`) to (a) each Architect-wall entry and (b) the discovered-corpse UGC block (`realCorpse`, ~687-701). On press: `reportUGC(<the entry's deathId>)` then show a brief `t('moderation.reported')` confirmation. **NOTE:** Architect entries currently carry only `{name, words}` — to report them you need the `deathId`. Extend `ArchitectEntry` (Task 2 + Task 5) to ALSO carry `deathId` (add it in `selectModeratedUGC` from the candidate, and thread `deathId` onto `PhraseCandidate` from the receipt's… — receipts lack a deathId). **Resolution:** since receipts have no deathId, architect entries can't be reported by deathId. Instead, the corpse surface (which HAS deathId) is the report entry point; Architect-wall entries get NO report button in 4b (they are already server-moderated + trust-gated + suppressible via the corpse report). Report button ships on the **discovered-corpse UGC surface only** (that's where players see attributed final words and a deathId exists). Document this scoping in the report + docs. Avoid the confusing dead-end — do NOT add a non-functional report button to Architect entries.

- [ ] **Step 4: i18n** — add to all 7 locales: `moderation.report` = "Report", `moderation.reported` = "Reported. The depths will consider it.", `community.architect.wall` = "The walls are thick with the fallen:" (an intro above the entries). Bible voice, no exclamation.

- [ ] **Step 5: Verify**

Run: `cd /Volumes/FP80/code/dieforward/mobile && npx tsc --noEmit && npx jest`
Expected: tsc exit 0; suite green incl. i18n parity.

- [ ] **Step 6: Commit**

```bash
git add mobile/app/play.tsx mobile/lib/api.ts mobile/lib/locales
git commit -m "feat(4b): Architect-wall inscriptions + corpse report button (A2 rebroadcast surfaces)"
```

---

### Task 8: Docs — close the A2 gate

**Files:**
- Modify: `docs/superpowers/specs/2026-07-04-the-shift-design.md` (§3.2 A2, §6 Echo Husks, E.1 A2 checkbox), `CLAUDE.md`

- [ ] **Step 1: Update the spec** — in §3.2, add a `**(done, phase 4b July 2026)**` note: A2 moderation gate shipped — server-authoritative `src/lib/moderation.ts` (self-contained profanity/URL filter + normalization, trust-weighting by account age/staked history/wallet-auth, report-count suppression via the `reports` namespace + authenticated `/api/moderation/report`); rebroadcast text sourced ONLY from `runReceipts.finalMessage` (trusted), moderated in `runAggregation`, written as `echoPhrases`/`architectEntries` on `worldShifts`. Echo Husk *Repeating* recites a moderated phrase; Architect walls inscribe moderated `@nickname: words` at the deadliest node. Flip the `⬜ A2` checkbox in §E.1 to ✅. List DEFERRED: Echo Husk *Listening* combat mechanic; admin moderation dashboard; richer profanity model; Architect-entry report button (report ships on the corpse surface). In §6, note Echo Husks' signature is now `'repeating'` (recital) with *Listening* deferred.
- [ ] **Step 2: Update CLAUDE.md** — extend the community-layer sentence: A2 moderation gate (`src/lib/moderation.ts`, `reports` namespace, `/api/moderation/report`) gates UGC rebroadcast; `worldShifts` now also carries server-moderated `echoPhrases`/`architectEntries` surfaced as Echo Husk recitals + Architect-wall inscriptions.
- [ ] **Step 3: Commit**

```bash
git add docs/superpowers/specs/2026-07-04-the-shift-design.md CLAUDE.md
git commit -m "docs(4b): A2 moderation gate closed; Echo Husks + Architect walls shipped"
```

---

## Self-Review

**Spec coverage (§3.2 A2 / §6 Echo Husks):**
- A2 profanity/URL filter → Task 2 `containsBlockedContent`. ✅
- A2 trust-weighting (account age / staked history) → Task 2 `isTrustedAuthor` (fail-closed on unknown). ✅
- A2 report button + suppression → Task 3 (route + namespace), Task 2 `buildSuppressedSet`, Task 7 (corpse report button). ✅ (Architect-entry button scoped out — no deathId on receipts; corpse surface is the report entry point; documented.)
- No filter, no rebroadcast → all rebroadcast text flows through `selectModeratedUGC` in the server cron (Task 4); client only displays. ✅
- Echo Husks *Repeating* (recite real final words) → Task 6. *Listening* explicitly DEFERRED. ✅
- Architect visitation (fallen names/words at deadliest node) → Task 7, using the 4a `architectNodeId` marker. ✅
- Trusted source (no forgeable deaths) → Task 1 (finalMessage on receipt); aggregation never reads `deaths` for text. ✅

**Placeholder scan:** No TBD/TODO. Named verify-against-reality items (Task 6 combat.tsx accessor + stable non-RNG seed; Task 7 `api.ts` `API_BASE`/`authHeaders` names) are bounded checks, not placeholders.

**Type consistency:** `AuthorTrust`/`PhraseCandidate`/`ModeratedUGC`/`ArchitectEntry`/`selectModeratedUGC`/`buildSuppressedSet` (Task 2) consumed verbatim by Task 4. `RunReceipt.finalMessage` (Task 1) read in Task 4's `candidatesForZone`. `CommunityShift.echoPhrases/architectEntries` (Task 5) consumed by Tasks 6-7. `reports` row fields (`deathId/reporterAuthId/reportedWallet/reportedText/createdAt`, Task 3) read by Task 4's `buildSuppressedSet` map. `pickEchoPhrase` (Task 6) — signature stable.

**Known ⚠️ for the controller (surface to reviewers):**
1. **`architectEntries` shape** — Task 2 defines `{name, words}` (no deathId). Task 7 relies on that (no Architect report button). If a later phase wants Architect-entry reporting, `PhraseCandidate`/receipts need a deathId FK first. Do not silently add a non-functional button.
2. **Moderation completeness** — the baseline wordlist is not exhaustive; A2's intent is met by the THREE layers together (filter + trust + report). The filter is fail-closed on URLs and obfuscation-normalized, but the reviewer should confirm no rebroadcast path bypasses `selectModeratedUGC` (every echo/architect field must originate there).
3. **Trust join for guests** — a guest author (no wallet, fresh) is never trusted → their words never rebroadcast. Intended (fail-closed), but confirm this doesn't silently drop ALL echo content in a guest-heavy dataset (it should still surface wallet/aged authors).
