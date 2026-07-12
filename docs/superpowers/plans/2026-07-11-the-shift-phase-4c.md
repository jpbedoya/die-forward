# The Shift — Phase 4c: Cartographer Dispatch Pipeline + Push Notifications — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the day's world shift into Cartographer-voice dispatches through one shared `renderDispatch` pipeline feeding the home panel, zone-select, and (greenfield) a once-daily push notification delivered at each user's local morning — with a hard 1/day scarcity cap and a diegetic, fully-optional opt-in.

**Architecture:** A pure `renderDispatch(shift, ctx)` (mobile) converts a 4a `WorldShift` (seeded `DailyShift` + community apex/curse — NON-UGC) into i18n line descriptors + a scarcity level; the home panel and zone-select both render through it (replacing today's ad-hoc inline JSX). Push delivery is a separate server subsystem: new `Player.pushToken`/`timezone`/`notifOptIn`/`lastDispatchDayKey` fields, `expo-notifications` for token+permission, a pure fan-out selector (`src/lib/dispatch-fanout.ts`) and an hourly cron that sends the day's dispatch to users whose local morning is now, at most once per day.

**Tech Stack:** Expo SDK 54 + `expo-notifications`/`expo-device`/`expo-localization` (new native deps → EAS rebuild), React Native, InstantDB, Next.js cron routes + `expo-server-sdk` (web send), jest.

## Global Constraints

- **World shifts at 00:00 UTC globally; the dispatch is *delivered* at each user's local morning** describing the already-live shift (spec §3.1/E.3 resolution). Day bucketing uses `utcDayKey` (`mobile/lib/world-shift.ts`) — identical to 4a.
- **F7 scarcity — 1/day is a CAP, not a floor.** A banner/push fires ONLY on personally-consequential days (your bounty/apex present, your corpse in-zone, doors moved); most days are ambient or silent. **At most one push per user per day.** A dispatch that fires daily becomes wallpaper (Lifeline lesson).
- **2–3 rotating registers** (warning / lament / invitation), deterministic per `dayKey` so the voice has weather without randomness.
- **Nothing is gated on notification permission.** Deniers read the identical home-panel dispatch. The panel is the primary surface; the push is additive. Permission ask is **diegetic** (the Cartographer offers once after the first death) and declinable forever (a settings toggle remains).
- **NO UGC in 4c.** Dispatches use only non-UGC signals: seeded map masks + community apex creature id (a BESTIARY display name) + curse/architect counts. **The rare "The Architect has built your corpse into the walls" personal push is DEFERRED to post-4b** (requires A2 moderation of player names/final words).
- **Bible voice** for every line (second person, present tense, understated dread, "the depths" register, NO exclamation marks, no modern words, ≤ ~140 chars). All player-facing text through `t()` + `mobile/lib/locales/*.json`; **all 7 locale catalogs stay key-identical** (en, es, ja, ko, pt-BR, vi, zh-TW) — non-en may hold the English string as fallback; the i18n parity test enforces this.
- **Determinism:** `renderDispatch`, `selectRegister`, and the fan-out selector are PURE (no `Math.random`, no ambient `Date.now()` — time/rng flow in via args). Register rotation hashes `dayKey`.
- **Extra-caution files:** `instant.ts`, `GameContext.tsx`. Additive changes only.
- **Native reality:** `expo-notifications` is a native module → **a new EAS build across all three profiles is required** before push works on device; the on-device permission + token + delivery **cannot be verified in jest** (only the pure logic is unit-tested; native wiring is thin + manually verified on a build).

---

## File Structure

- **Create `mobile/lib/dispatch.ts`** — pure: `renderDispatch(shift, ctx)`, `selectRegister(dayKey)`, types `Dispatch`/`DispatchLine`/`DispatchContext`/`DispatchLevel`/`DispatchRegister`. No i18n runtime dependency (returns `{key, params}` descriptors).
- **Create `mobile/lib/__tests__/dispatch.test.ts`** — full unit coverage of scarcity + register + line composition.
- **Modify `mobile/lib/locales/*.json` (×7)** — add `dispatch.*` keys.
- **Modify `mobile/app/index.tsx`** — home panel renders through `renderDispatch` (best-effort community fetch for the home zone).
- **Modify `src/app/api/game/shift/route.ts`** — GET accepts a day-only (no `zoneId`) batch read returning all zones' rows.
- **Modify `mobile/lib/world-shift.ts`** — add `fetchCommunityShiftsForDay(dayKey)` (one call → map by zoneId).
- **Modify `mobile/app/zone-select.tsx`** — `ShiftLine` renders through `renderDispatch` with per-zone community (one batch fetch).
- **Modify `mobile/lib/instant.ts`** — add `pushToken?`/`timezone?`/`notifLocale?`/`notifOptIn?`/`notifPrompted?`/`lastDispatchDayKey?` to `Player`; add `saveNotifRegistration`/`setNotifOptIn` writes.
- **Create `mobile/lib/notifications.ts`** — thin wrapper: `requestPushPermission()`, `getExpoPushToken()`, `getDeviceTimezone()`, `getDeviceLocale()`. Native calls isolated here; `getDeviceTimezone` pure-testable.
- **Modify `mobile/app.config.js`** — add `expo-notifications` plugin.
- **Modify `mobile/package.json`** — add `expo-notifications`, `expo-device`, `expo-localization`, `expo-server-sdk` (server) — via `npx expo install`.
- **Modify `mobile/app/death.tsx`** — diegetic first-death opt-in prompt (`prevDeaths === 0`).
- **Modify `mobile/components/AudioSettingsModal.tsx`** (the de-facto settings modal) — add a notifications opt-in/out toggle row.
- **Create `src/lib/dispatch-fanout.ts`** — pure `selectFanoutRecipients(users, opts)` + `renderPushText(row)` (server-side English dispatch string).
- **Create `src/lib/__tests__/dispatch-fanout.test.ts`** — full unit coverage.
- **Create `src/app/api/game/dispatch/route.ts`** — hourly cron: select recipients, send via `expo-server-sdk`, mark `lastDispatchDayKey`.
- **Modify `vercel.json`** — hourly dispatch cron.
- **Docs:** spec §8 done-note, `CLAUDE.md`.

**Deferred (write down, do not silently trim):**
- **Rare personal "Architect built your corpse into the walls" push** → post-4b (A2 moderation of names/final words).
- **Per-locale push text** — 4c sends a concise **English** server-rendered dispatch line (`renderPushText`); localizing the push per `notifLocale` (mirroring the mobile catalog server-side) is a refinement. The in-app panel is fully localized; only the push body is English in 4c.
- **F5 apex-aware modifier pool** (spec §7) — separate follow-up; not part of 4c dispatch/notifications.

---

### Task 1: `dispatch.ts` — renderDispatch + scarcity + registers (pure, mobile, TDD)

**Files:**
- Create: `mobile/lib/dispatch.ts`
- Test: `mobile/lib/__tests__/dispatch.test.ts`
- Modify: `mobile/lib/locales/en.json` (+ mirror keys to the other 6)

**Interfaces:**
- Consumes: `WorldShift`, `CommunityShift` from `./world-shift` (Task uses only the shape — `dayKey`, `closedEdges`, `sealedSideNodes`, `community.apexCreatureId`, `community.curseNodes`).
- Produces:
  ```ts
  export type DispatchRegister = 'warning' | 'lament' | 'invitation';
  export type DispatchLevel = 'banner' | 'ambient' | 'silent';
  export interface DispatchLine { key: string; params?: Record<string, string | number>; }
  export interface DispatchContext { diedInZoneRecently?: boolean; }
  export interface Dispatch { level: DispatchLevel; register: DispatchRegister; lines: DispatchLine[]; }
  export function selectRegister(dayKey: string): DispatchRegister;
  export function renderDispatch(shift: WorldShift, ctx?: DispatchContext): Dispatch;
  ```
  Surfaces map `lines` through `t(line.key, line.params)`. `level` governs prominence (banner = full/prominent, ambient = one subtle line, silent = minimal "always-present" panel line). Push is sent (Task 8) only on `level === 'banner'`.

**Scarcity rule (F7):** `banner` when a personally/globally consequential signal holds (apex present OR `ctx.diedInZoneRecently`); `ambient` on a mild change (doors moved OR cursed nodes); `silent` otherwise. Register is deterministic per `dayKey` (hash → one of 3). Lines: a register intro line + up to 2 signal lines (apex/cursed/doors), capped at 3; a silent day still yields one `dispatch.quiet` line so the panel is always present.

- [ ] **Step 1: Write the failing tests** — create `mobile/lib/__tests__/dispatch.test.ts`:

```ts
import { renderDispatch, selectRegister, type Dispatch } from '../dispatch';
import type { WorldShift, DailyShift, CommunityShift } from '../world-shift';

function daily(over: Partial<DailyShift> = {}): DailyShift {
  return { dayKey: '2026-07-11', zoneId: 'sunken-crypt', modifierPool: [], closedEdges: [], sealedSideNodes: [], ...over };
}
function community(over: Partial<CommunityShift> = {}): CommunityShift {
  return { dayKey: '2026-07-11', zoneId: 'sunken-crypt', apexCreatureId: null, apexKills: 0, curseNodes: [], architectNodeId: null, architectDeaths: 0, ...over };
}
function world(d = daily(), c: CommunityShift | null = null): WorldShift { return { ...d, community: c }; }

describe('selectRegister', () => {
  it('is deterministic per dayKey and one of the three registers', () => {
    const r = selectRegister('2026-07-11');
    expect(['warning', 'lament', 'invitation']).toContain(r);
    expect(selectRegister('2026-07-11')).toBe(r); // stable
  });
  it('rotates across days (not all the same)', () => {
    const days = ['2026-07-11','2026-07-12','2026-07-13','2026-07-14','2026-07-15','2026-07-16'];
    const set = new Set(days.map(selectRegister));
    expect(set.size).toBeGreaterThan(1);
  });
});

describe('renderDispatch — scarcity level', () => {
  it('banner when an apex is present', () => {
    const d = renderDispatch(world(daily(), community({ apexCreatureId: 'Bog Lurker', apexKills: 5 })));
    expect(d.level).toBe('banner');
    expect(d.lines.some(l => l.key === 'dispatch.apex' && l.params?.creature === 'Bog Lurker')).toBe(true);
  });
  it('banner when the player died in-zone recently (personal)', () => {
    const d = renderDispatch(world(daily(), null), { diedInZoneRecently: true });
    expect(d.level).toBe('banner');
  });
  it('ambient when only doors moved', () => {
    const d = renderDispatch(world(daily({ sealedSideNodes: ['n-2'] }), null));
    expect(d.level).toBe('ambient');
    expect(d.lines.some(l => l.key === 'dispatch.doors')).toBe(true);
  });
  it('ambient when only cursed nodes exist', () => {
    const d = renderDispatch(world(daily(), community({ curseNodes: ['n-3'] })));
    expect(d.level).toBe('ambient');
    expect(d.lines.some(l => l.key === 'dispatch.cursed')).toBe(true);
  });
  it('silent on a quiet day, still yields one panel line', () => {
    const d = renderDispatch(world(daily(), null));
    expect(d.level).toBe('silent');
    expect(d.lines.length).toBeGreaterThanOrEqual(1);
    expect(d.lines[d.lines.length - 1].key).toBe('dispatch.quiet');
  });
  it('caps at 3 lines and always leads with a register intro', () => {
    const d = renderDispatch(world(daily({ sealedSideNodes: ['a','b'], closedEdges: [{from:'x',to:'y'}] }), community({ apexCreatureId: 'Bog Lurker', curseNodes: ['n-3'] })));
    expect(d.lines.length).toBeLessThanOrEqual(3);
    expect(d.lines[0].key).toBe(`dispatch.register.${d.register}`);
  });
});
```

- [ ] **Step 2: Run and verify fail**

Run: `cd /Volumes/FP80/code/dieforward/mobile && npx jest dispatch`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `mobile/lib/dispatch.ts`**

```ts
import type { WorldShift } from './world-shift';

export type DispatchRegister = 'warning' | 'lament' | 'invitation';
export type DispatchLevel = 'banner' | 'ambient' | 'silent';
export interface DispatchLine { key: string; params?: Record<string, string | number>; }
export interface DispatchContext { diedInZoneRecently?: boolean; }
export interface Dispatch { level: DispatchLevel; register: DispatchRegister; lines: DispatchLine[]; }

const REGISTERS: DispatchRegister[] = ['warning', 'lament', 'invitation'];

/** Deterministic per-day register — stable within a day, rotates across days. No RNG. */
export function selectRegister(dayKey: string): DispatchRegister {
  let h = 0;
  for (let i = 0; i < dayKey.length; i++) h = (h * 31 + dayKey.charCodeAt(i)) >>> 0;
  return REGISTERS[h % REGISTERS.length];
}

/**
 * Pure. Turns a WorldShift (+ optional personal context) into Cartographer-voice
 * i18n line descriptors and a scarcity level. Surfaces map lines through t().
 * F7: banner only on consequential days; ambient on mild change; silent otherwise
 * (silent still yields one panel line — the home panel is always present).
 */
export function renderDispatch(shift: WorldShift, ctx: DispatchContext = {}): Dispatch {
  const register = selectRegister(shift.dayKey);
  const community = shift.community;
  const apex = community?.apexCreatureId ?? null;
  const cursed = (community?.curseNodes?.length ?? 0) > 0;
  const doorsMoved = shift.closedEdges.length + shift.sealedSideNodes.length > 0;
  const personal = !!ctx.diedInZoneRecently;

  let level: DispatchLevel;
  if (apex || personal) level = 'banner';
  else if (doorsMoved || cursed) level = 'ambient';
  else level = 'silent';

  const lines: DispatchLine[] = [{ key: `dispatch.register.${register}` }];
  if (apex) lines.push({ key: 'dispatch.apex', params: { creature: apex } });
  if (cursed) lines.push({ key: 'dispatch.cursed' });
  if (doorsMoved) lines.push({ key: 'dispatch.doors', params: { n: shift.closedEdges.length + shift.sealedSideNodes.length } });
  if (level === 'silent') lines.push({ key: 'dispatch.quiet' });

  return { level, register, lines: lines.slice(0, 3) };
}
```

- [ ] **Step 4: Add i18n keys** to `mobile/lib/locales/en.json` (bible voice, no exclamation marks):

```json
"dispatch.register.warning": "The depths stir with appetite.",
"dispatch.register.lament": "The depths keep their dead close.",
"dispatch.register.invitation": "The passages have opened for the willing.",
"dispatch.apex": "Something grows fat on wanderers: the {creature}.",
"dispatch.cursed": "There are places below where many ended.",
"dispatch.doors": "The way has changed. {n} passage(s) will not answer today.",
"dispatch.quiet": "The depths are still. For now."
```
Then add the SAME 7 keys to every other locale file in `mobile/lib/locales/` (`es, ja, ko, pt-BR, vi, zh-TW`) — English string as fallback value where no translation exists. Verify all 7 catalogs have identical key sets (key-count/diff).

- [ ] **Step 5: Run tests and verify pass**

Run: `cd /Volumes/FP80/code/dieforward/mobile && npx jest dispatch && npx jest i18n && npx tsc --noEmit`
Expected: dispatch tests PASS, i18n parity PASS, tsc exit 0.

- [ ] **Step 6: Commit**

```bash
git add mobile/lib/dispatch.ts mobile/lib/__tests__/dispatch.test.ts mobile/lib/locales
git commit -m "feat(4c): renderDispatch pipeline + F7 scarcity + rotating registers (pure, i18n)"
```

---

### Task 2: Home panel renders through renderDispatch

**Files:**
- Modify: `mobile/app/index.tsx` (shift block ~256-258, ~445-462; import ~12)

**Interfaces:**
- Consumes: `renderDispatch` (Task 1), `getDailyShift`/`fetchCommunityShift`/`mergeShift`/`utcDayKey` (world-shift), `t()`.

- [ ] **Step 1: Replace the home shift computation + JSX**

Import (`index.tsx:12`): add to the world-shift import → `import { getDailyShift, utcDayKey, fetchCommunityShift, mergeShift, type CommunityShift } from '../lib/world-shift';` and `import { renderDispatch } from '../lib/dispatch';`.

Replace the `shiftModifierPool` memo with a dispatch computation. The home zone stays `'sunken-crypt'` (matches current behavior). Fetch community best-effort (non-blocking, degrades to seeded):

```tsx
const HOME_ZONE = 'sunken-crypt';
const [homeCommunity, setHomeCommunity] = useState<CommunityShift | null>(null);
useEffect(() => {
  if (!settings.dailyShiftEnabled) return;
  let alive = true;
  fetchCommunityShift(HOME_ZONE, dayKey).then((c) => { if (alive) setHomeCommunity(c); }).catch(() => {});
  return () => { alive = false; };
}, [dayKey, settings.dailyShiftEnabled]);

const dispatch = useMemo(() => {
  if (!settings.dailyShiftEnabled) return null;
  const world = mergeShift(getDailyShift(HOME_ZONE, dayKey), homeCommunity);
  return renderDispatch(world);
}, [dayKey, settings.dailyShiftEnabled, homeCommunity]);
```

Replace the shift JSX block (`index.tsx:445-462`) to render `dispatch.lines` via `t()`, with prominence keyed off `dispatch.level`. Keep the existing header and styling idiom; hide the whole block when `!settings.dailyShiftEnabled` OR `dispatch` is null OR (`dispatch.level === 'silent'` AND you choose to hide silent days — recommended: SHOW silent as the minimal single line so the panel is "always present" per spec, but with muted styling):

```tsx
{settings.dailyShiftEnabled && dispatch && (
  <View className="items-center mb-4">
    <Text className="text-amber-dark font-mono text-xs tracking-widest">{t('shift.header')}</Text>
    {dispatch.lines.map((line, i) => (
      <Text key={i}
        className={`font-mono text-xs text-center mt-1 ${dispatch.level === 'banner' ? 'text-bone-dark italic' : 'text-bone-muted'}`}>
        {t(line.key, line.params)}
      </Text>
    ))}
  </View>
)}
```
(Match the real Text/View components + className tokens already in that file; if the file uses a `t()` signature without params, confirm `t(key, params)` is the real signature — it is per `shift.offers` usage. Keep `shift.header` as the block title.)

- [ ] **Step 2: Typecheck + suite**

Run: `cd /Volumes/FP80/code/dieforward/mobile && npx tsc --noEmit && npx jest`
Expected: tsc exit 0; full mobile suite green (no test asserts the old modifier-emoji home line; if one does, update it to the dispatch rendering).

- [ ] **Step 3: Commit**

```bash
git add mobile/app/index.tsx
git commit -m "feat(4c): home panel renders through renderDispatch (community-aware, degrades)"
```

---

### Task 3: Batch community read + zone-select through renderDispatch

**Files:**
- Modify: `src/app/api/game/shift/route.ts` (GET — allow day-only batch)
- Modify: `mobile/lib/world-shift.ts` (add `fetchCommunityShiftsForDay`)
- Modify: `mobile/app/zone-select.tsx` (`ShiftLine` ~114-126; per-zone memo ~389-395)
- Test: `mobile/lib/__tests__/world-shift.test.ts` (fetch map shape — light)

**Interfaces:**
- Produces (web): `GET /api/game/shift?dayKey=<d>` (no `zoneId`) → `{ shifts: WorldShiftRow[] }` (all zones for the day). The existing `zoneId`+`dayKey` single-row form is unchanged.
- Produces (mobile): `fetchCommunityShiftsForDay(dayKey, apiBase?): Promise<Record<string, CommunityShift>>` — one call → map keyed by zoneId; `{}` on any failure (degrade). `ShiftLine` becomes `renderDispatch`-driven per zone.

- [ ] **Step 1: Extend the GET** in `src/app/api/game/shift/route.ts` — when `zoneId` is absent but `dayKey` is present, return all rows for the day:

```ts
if (!zoneId) {
  const result = await db.query({ worldShifts: { $: { where: { dayKey } } } }).catch(() => null);
  const shifts = (result?.worldShifts ?? []) as Record<string, unknown>[];
  return NextResponse.json({ shifts });
}
```
(Place this BEFORE the existing `if (!zoneId || !dayKey) 400` guard's zoneId branch — require `dayKey` still; only `zoneId` becomes optional. Keep the single-row path intact for the `zoneId` present case.)

- [ ] **Step 2: Add `fetchCommunityShiftsForDay`** to `mobile/lib/world-shift.ts` (mirrors `fetchCommunityShift`'s never-throw contract + 3s abort):

```ts
export async function fetchCommunityShiftsForDay(
  dayKey: string,
  apiBase: string = process.env.EXPO_PUBLIC_API_URL || '',
): Promise<Record<string, CommunityShift>> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 3000);
  try {
    const res = await fetch(`${apiBase}/api/game/shift?dayKey=${encodeURIComponent(dayKey)}`, { signal: controller.signal });
    if (!res.ok) return {};
    const json = await res.json();
    const out: Record<string, CommunityShift> = {};
    for (const s of (Array.isArray(json?.shifts) ? json.shifts : [])) {
      if (s?.zoneId && s?.dayKey === dayKey) {
        out[s.zoneId] = {
          dayKey: s.dayKey, zoneId: s.zoneId,
          apexCreatureId: s.apexCreatureId ?? null, apexKills: s.apexKills ?? 0,
          curseNodes: Array.isArray(s.curseNodes) ? s.curseNodes : [],
          architectNodeId: s.architectNodeId ?? null, architectDeaths: s.architectDeaths ?? 0,
        };
      }
    }
    return out;
  } catch {
    return {};
  } finally {
    clearTimeout(timer);
  }
}
```

- [ ] **Step 3: Rework `ShiftLine`** in `zone-select.tsx` to render one dispatch line per zone through `renderDispatch`. Add a single batch fetch in the screen and pass each zone's community into its card. Change `ShiftLine` to accept the zone's `WorldShift`:

```tsx
import { renderDispatch } from '../lib/dispatch';
import { mergeShift, fetchCommunityShiftsForDay, type CommunityShift } from '../lib/world-shift';

function ShiftLine({ shift, community }: { shift: DailyShift; community: CommunityShift | null }) {
  const d = renderDispatch(mergeShift(shift, community));
  // Show the most salient single line for the compact per-zone slot: prefer an
  // apex/cursed/doors signal line over the register intro when present.
  const line = d.lines.find(l => l.key !== `dispatch.register.${d.register}`) ?? d.lines[0];
  return (
    <Text style={{ fontFamily: 'monospace', fontSize: 9, color: palette.bone.dark, marginTop: 6, letterSpacing: 0.3 }}>
      {t(line.key, line.params)}
    </Text>
  );
}
```
In the screen body, fetch once and thread community per zone:
```tsx
const [communityByZone, setCommunityByZone] = useState<Record<string, CommunityShift>>({});
useEffect(() => {
  if (!settings.dailyShiftEnabled) return;
  let alive = true;
  fetchCommunityShiftsForDay(dayKey).then((m) => { if (alive) setCommunityByZone(m); });
  return () => { alive = false; };
}, [dayKey, settings.dailyShiftEnabled]);
```
Update the two `<ShiftLine shift={shift} />` call sites (`GridZoneCard` ~236, `VoidBeyondCard` ~307) to pass `community={communityByZone[zone.id] ?? null}` — thread `communityByZone` into those card components as a prop.

- [ ] **Step 4: Light test** — append to `mobile/lib/__tests__/world-shift.test.ts` a shape test that `fetchCommunityShiftsForDay` returns `{}` when fetch is unavailable (mock global.fetch to reject), mirroring the existing degrade tests. (Network success path is covered by inspection; keep it a null-degrade assertion.)

- [ ] **Step 5: Verify**

Run: `cd /Volumes/FP80/code/dieforward/mobile && npx jest world-shift && npx tsc --noEmit` and `cd /Volumes/FP80/code/dieforward && npx tsc --noEmit`
Expected: PASS, both tsc exit 0.

- [ ] **Step 6: Commit**

```bash
git add src/app/api/game/shift/route.ts mobile/lib/world-shift.ts mobile/app/zone-select.tsx mobile/lib/__tests__/world-shift.test.ts
git commit -m "feat(4c): batch community read + zone-select dispatch lines (per-zone apex/doors)"
```

---

### Task 4: Player notification schema fields + write helpers

**Files:**
- Modify: `mobile/lib/instant.ts` (`Player` interface ~68-100; add helper writes)
- Test: `mobile/lib/__tests__/instant-notif.test.ts` (pure — the opt-in state helper, if extracted pure)

**Interfaces:**
- Produces: `Player` gains OPTIONAL `pushToken?: string; timezone?: string; notifLocale?: string; notifOptIn?: boolean; notifPrompted?: boolean; lastDispatchDayKey?: string;`. Helpers: `saveNotifRegistration(player, { pushToken, timezone, notifLocale })` (sets those + `notifOptIn: true`, `notifPrompted: true`), `setNotifOptIn(player, optIn: boolean)` (toggles `notifOptIn`; on false, keeps token but stops sending), `markNotifPrompted(player)` (sets `notifPrompted: true` without opting in — the "declined" path).

- [ ] **Step 1: Add fields** to the `Player` interface (all optional, additive — no migration needed, InstantDB is schemaless):

```ts
  pushToken?: string;        // Expo push token (present only after opt-in on a native build)
  timezone?: string;         // IANA tz, e.g. "America/New_York" — for local-morning delivery
  notifLocale?: string;      // locale at opt-in time, for future per-locale push
  notifOptIn?: boolean;      // true = wants the daily dispatch push
  notifPrompted?: boolean;   // true once the diegetic ask has fired (ask-once)
  lastDispatchDayKey?: string; // last UTC day a push was sent (server dedupe, ≤1/day)
```

- [ ] **Step 2: Add write helpers** near the other `tx.players[...].update(...)` helpers (match the existing async/transact style, keyed by `player.id`):

```ts
export async function saveNotifRegistration(
  player: Pick<Player, 'id'>,
  reg: { pushToken: string; timezone: string; notifLocale: string },
): Promise<void> {
  await db.transact([tx.players[player.id].update({
    pushToken: reg.pushToken, timezone: reg.timezone, notifLocale: reg.notifLocale,
    notifOptIn: true, notifPrompted: true,
  })]);
}
export async function setNotifOptIn(player: Pick<Player, 'id'>, optIn: boolean): Promise<void> {
  await db.transact([tx.players[player.id].update({ notifOptIn: optIn, notifPrompted: true })]);
}
export async function markNotifPrompted(player: Pick<Player, 'id'>): Promise<void> {
  await db.transact([tx.players[player.id].update({ notifPrompted: true })]);
}
```

- [ ] **Step 3: Verify**

Run: `cd /Volumes/FP80/code/dieforward/mobile && npx tsc --noEmit && npx jest`
Expected: tsc exit 0; suite green (no behavior change — additive fields + helpers).

- [ ] **Step 4: Commit**

```bash
git add mobile/lib/instant.ts
git commit -m "feat(4c): Player notification fields + opt-in write helpers"
```

---

### Task 5: `expo-notifications` install + `notifications.ts` wrapper (NATIVE — EAS rebuild)

**Files:**
- Modify: `mobile/package.json` (deps), `mobile/app.config.js` (plugin)
- Create: `mobile/lib/notifications.ts`
- Test: `mobile/lib/__tests__/notifications.test.ts` (only the pure `getDeviceTimezone` fallback logic)

**Interfaces:**
- Produces: `requestPushPermission(): Promise<boolean>`, `getExpoPushToken(): Promise<string | null>`, `getDeviceTimezone(): string`, `getDeviceLocale(): string`. All native-touching calls isolated here so screens stay testable.

**NATIVE NOTE:** `expo-notifications`/`expo-device` are native modules; after this task the JS compiles and the pure parts test, but **push tokens/permission only work on a fresh EAS build** — record this in the task report; do not claim on-device verification from jest.

- [ ] **Step 1: Install deps**

```bash
cd /Volumes/FP80/code/dieforward/mobile && npx expo install expo-notifications expo-device expo-localization
```
(These pin SDK-54-compatible versions and update `package.json`. `expo-server-sdk` is a WEB/server dep — installed in Task 8 at repo root, not here.)

- [ ] **Step 2: Add the config plugin** to `mobile/app.config.js` `plugins` array (append):

```js
  "expo-notifications",
```
(Default config is sufficient for a token-only daily dispatch; no custom sound/icon needed for 4c.)

- [ ] **Step 3: Implement `mobile/lib/notifications.ts`**

```ts
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { getCalendars, getLocales } from 'expo-localization';

/** IANA timezone, best-effort. Falls back to UTC. Pure enough to smoke-test the fallback. */
export function getDeviceTimezone(): string {
  try {
    const tz = getCalendars()?.[0]?.timeZone;
    if (tz) return tz;
  } catch { /* ignore */ }
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz) return tz;
  } catch { /* ignore */ }
  return 'UTC';
}

export function getDeviceLocale(): string {
  try { return getLocales()?.[0]?.languageTag ?? 'en'; } catch { return 'en'; }
}

/** Requests OS push permission. Returns true only if granted. Never throws. */
export async function requestPushPermission(): Promise<boolean> {
  try {
    if (!Device.isDevice) return false; // no push on simulators
    const { status: existing } = await Notifications.getPermissionsAsync();
    let status = existing;
    if (existing !== 'granted') status = (await Notifications.requestPermissionsAsync()).status;
    return status === 'granted';
  } catch { return false; }
}

/** Fetches the Expo push token. Returns null if unavailable/denied. Never throws. */
export async function getExpoPushToken(): Promise<string | null> {
  try {
    const projectId = 'REPLACE_WITH_EAS_PROJECT_ID'; // read from app.config extra.eas.projectId
    const token = await Notifications.getExpoPushTokenAsync({ projectId });
    return token?.data ?? null;
  } catch { return null; }
}
```
(Wire `projectId` from `app.config.js` `extra.eas.projectId` = `"14637e61-9e4a-4f2f-98fc-fcdd9e7650f8"` — read via `expo-constants` `Constants.expoConfig?.extra?.eas?.projectId` rather than hardcoding; confirm the accessor against the SDK 54 `expo-constants` API.)

- [ ] **Step 4: Pure test** — `mobile/lib/__tests__/notifications.test.ts` asserting `getDeviceTimezone()` returns a non-empty string and falls back to `'UTC'` when the localization/Intl calls throw (mock them). Do NOT test permission/token (native). If `expo-notifications`/`expo-device` can't be imported in the jest node env, add them to the existing `moduleNameMapper` mocks in `mobile/jest.config.js` (mirror how `react-native`/`nativewind` are mocked) so the suite still loads.

- [ ] **Step 5: Verify (JS/type only — native is EAS)**

Run: `cd /Volumes/FP80/code/dieforward/mobile && npx tsc --noEmit && npx jest`
Expected: tsc exit 0; suite green (with the new module mocked). Report explicitly: native push NOT verified in jest — requires EAS build.

- [ ] **Step 6: Commit**

```bash
git add mobile/package.json mobile/package-lock.json mobile/app.config.js mobile/lib/notifications.ts mobile/lib/__tests__/notifications.test.ts mobile/jest.config.js
git commit -m "feat(4c): expo-notifications wrapper + config plugin (native; EAS rebuild required)"
```

---

### Task 6: Diegetic first-death opt-in + settings toggle

**Files:**
- Modify: `mobile/app/death.tsx` (first-death effect ~80-97)
- Modify: `mobile/components/AudioSettingsModal.tsx` (add a notifications toggle row)

**Interfaces:**
- Consumes: `requestPushPermission`/`getExpoPushToken`/`getDeviceTimezone`/`getDeviceLocale` (Task 5), `saveNotifRegistration`/`setNotifOptIn`/`markNotifPrompted` (Task 4), the current `player` (with `totalDeaths`, `notifPrompted`).

- [ ] **Step 1: First-death diegetic prompt** — in the death screen's run-once effect (`death.tsx:80-97`, alongside the milestone latch), when `prevDeaths === 0 && !player.notifPrompted`, present a one-time in-fiction prompt (the Cartographer: *"The passages move. I can send word when they do — if you wish."*) with Accept / Decline. Use the screen's existing modal/overlay idiom (do not build new infra). Add the copy as i18n keys `notif.ask.title`/`notif.ask.body`/`notif.ask.accept`/`notif.ask.decline` in all 7 locales (bible voice, no exclamation). On **Accept**: `const granted = await requestPushPermission();` → if granted, `const token = await getExpoPushToken();` → if token, `await saveNotifRegistration(player, { pushToken: token, timezone: getDeviceTimezone(), notifLocale: getDeviceLocale() })`; if not granted/token, `await markNotifPrompted(player)`. On **Decline**: `await markNotifPrompted(player)` (never ask again). **Nothing about gameplay is gated on the outcome.** Gate the whole prompt behind a run-once ref so it can't double-fire.

- [ ] **Step 2: Settings toggle** — add a "Dispatches" opt-in/out row to `mobile/components/AudioSettingsModal.tsx` (the de-facto settings modal). Bind it to `player.notifOptIn`. On toggle ON: if no `pushToken`, run the same request→token→`saveNotifRegistration` flow; if a token already exists, `setNotifOptIn(player, true)`. On toggle OFF: `setNotifOptIn(player, false)`. Add i18n keys `notif.settings.label`/`notif.settings.hint` (7 locales). Match the modal's existing row styling.

- [ ] **Step 3: Verify**

Run: `cd /Volumes/FP80/code/dieforward/mobile && npx tsc --noEmit && npx jest`
Expected: tsc exit 0; suite green (incl. i18n parity for the new `notif.*` keys). Native permission flow is manually verified on an EAS build — note in report.

- [ ] **Step 4: Commit**

```bash
git add mobile/app/death.tsx mobile/components/AudioSettingsModal.tsx mobile/lib/locales
git commit -m "feat(4c): diegetic first-death opt-in + dispatches settings toggle (nothing gated on permission)"
```

---

### Task 7: Pure fan-out selection + server push text (web, TDD)

**Files:**
- Create: `src/lib/dispatch-fanout.ts`
- Test: `src/lib/__tests__/dispatch-fanout.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export interface FanoutUser { playerId: string; pushToken: string | null; timezone: string | null; notifOptIn: boolean; lastDispatchDayKey: string | null; }
  export interface FanoutRecipient { playerId: string; pushToken: string; localDayKey: string; }
  export interface FanoutOptions {
    nowUtcMs: number;
    targetLocalHour: number;                 // e.g. 8 (08:00 local)
    localTimeOf: (tz: string, utcMs: number) => { hour: number; dayKey: string }; // injected (testable)
  }
  export function selectFanoutRecipients(users: FanoutUser[], opts: FanoutOptions): FanoutRecipient[];
  export interface PushTextInput { apexCreatureId: string | null; curseNodes: string[]; hasMask: boolean; }
  export function renderPushText(input: PushTextInput): string; // concise English dispatch line
  ```
- Selection rule: include a user iff `notifOptIn && pushToken` AND their local hour (via `localTimeOf`) equals `targetLocalHour` AND `lastDispatchDayKey !== localDayKey` (dedupe → ≤1/day). Returns the `localDayKey` to stamp back.

- [ ] **Step 1: Write the failing tests** — `src/lib/__tests__/dispatch-fanout.test.ts`:

```ts
import { selectFanoutRecipients, renderPushText, type FanoutUser } from '@/lib/dispatch-fanout';

const NOW = 1_000_000_000_000;
// fake timezone map: tz -> {hour, dayKey}
const clock = (map: Record<string, { hour: number; dayKey: string }>) =>
  (tz: string) => map[tz] ?? { hour: -1, dayKey: '' };

function user(over: Partial<FanoutUser> = {}): FanoutUser {
  return { playerId: 'p1', pushToken: 'ExpoTok[p1]', timezone: 'America/New_York', notifOptIn: true, lastDispatchDayKey: null, ...over };
}

describe('selectFanoutRecipients', () => {
  const opts = (localTimeOf: any) => ({ nowUtcMs: NOW, targetLocalHour: 8, localTimeOf });
  it('selects an opted-in user whose local hour is the target and not yet sent today', () => {
    const r = selectFanoutRecipients([user()], opts(clock({ 'America/New_York': { hour: 8, dayKey: '2026-07-11' } })));
    expect(r).toEqual([{ playerId: 'p1', pushToken: 'ExpoTok[p1]', localDayKey: '2026-07-11' }]);
  });
  it('excludes users at a non-target local hour', () => {
    const r = selectFanoutRecipients([user()], opts(clock({ 'America/New_York': { hour: 9, dayKey: '2026-07-11' } })));
    expect(r).toEqual([]);
  });
  it('excludes opted-out users and users without a token', () => {
    const tl = clock({ 'America/New_York': { hour: 8, dayKey: '2026-07-11' } });
    expect(selectFanoutRecipients([user({ notifOptIn: false })], opts(tl))).toEqual([]);
    expect(selectFanoutRecipients([user({ pushToken: null })], opts(tl))).toEqual([]);
  });
  it('dedupes: skips a user already sent today (lastDispatchDayKey === localDayKey)', () => {
    const r = selectFanoutRecipients([user({ lastDispatchDayKey: '2026-07-11' })], opts(clock({ 'America/New_York': { hour: 8, dayKey: '2026-07-11' } })));
    expect(r).toEqual([]);
  });
  it('null timezone is treated as no-match (never spammed at a wrong hour)', () => {
    const r = selectFanoutRecipients([user({ timezone: null })], opts(clock({})));
    expect(r).toEqual([]);
  });
});

describe('renderPushText', () => {
  it('leads with the apex when present', () => {
    const s = renderPushText({ apexCreatureId: 'Bog Lurker', curseNodes: ['n-3'], hasMask: true });
    expect(s).toContain('Bog Lurker');
    expect(s.length).toBeLessThanOrEqual(140);
  });
  it('falls back to a mask/quiet line when no apex', () => {
    expect(renderPushText({ apexCreatureId: null, curseNodes: [], hasMask: true }).length).toBeGreaterThan(0);
    expect(renderPushText({ apexCreatureId: null, curseNodes: [], hasMask: false }).length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run and verify fail**

Run: `cd /Volumes/FP80/code/dieforward && npx jest dispatch-fanout`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/lib/dispatch-fanout.ts`**

```ts
export interface FanoutUser {
  playerId: string;
  pushToken: string | null;
  timezone: string | null;
  notifOptIn: boolean;
  lastDispatchDayKey: string | null;
}
export interface FanoutRecipient { playerId: string; pushToken: string; localDayKey: string; }
export interface FanoutOptions {
  nowUtcMs: number;
  targetLocalHour: number;
  localTimeOf: (tz: string, utcMs: number) => { hour: number; dayKey: string };
}

/** Pure. Selects opted-in users whose LOCAL hour equals targetLocalHour and who
 *  have not been sent a dispatch on their local day yet (≤1/day). */
export function selectFanoutRecipients(users: FanoutUser[], opts: FanoutOptions): FanoutRecipient[] {
  const out: FanoutRecipient[] = [];
  for (const u of users) {
    if (!u.notifOptIn || !u.pushToken || !u.timezone) continue;
    const { hour, dayKey } = opts.localTimeOf(u.timezone, opts.nowUtcMs);
    if (hour !== opts.targetLocalHour) continue;
    if (!dayKey) continue;
    if (u.lastDispatchDayKey === dayKey) continue; // already sent today
    out.push({ playerId: u.playerId, pushToken: u.pushToken, localDayKey: dayKey });
  }
  return out;
}

export interface PushTextInput { apexCreatureId: string | null; curseNodes: string[]; hasMask: boolean; }

/** Concise English dispatch line for the push body (≤140 chars). Bible voice.
 *  Per-locale push is deferred (see plan); the in-app panel is fully localized. */
export function renderPushText(input: PushTextInput): string {
  if (input.apexCreatureId) return `The depths stir. Something grows fat on wanderers: the ${input.apexCreatureId}.`;
  if (input.curseNodes.length > 0) return `The depths keep their dead close. There are places below where many ended.`;
  if (input.hasMask) return `The passages are not as you left them.`;
  return `The depths are still. For now.`;
}
```

- [ ] **Step 4: Run tests and verify pass**

Run: `cd /Volumes/FP80/code/dieforward && npx jest dispatch-fanout && npx tsc --noEmit`
Expected: PASS, tsc exit 0.

- [ ] **Step 5: Commit**

```bash
git add src/lib/dispatch-fanout.ts src/lib/__tests__/dispatch-fanout.test.ts
git commit -m "feat(4c): pure fan-out recipient selection + server push text"
```

---

### Task 8: Hourly fan-out cron route + send + docs

**Files:**
- Modify: `package.json` (root — add `expo-server-sdk`)
- Create: `src/app/api/game/dispatch/route.ts`
- Modify: `vercel.json` (hourly cron)
- Modify: `docs/superpowers/specs/2026-07-04-the-shift-design.md` (§8 done-note), `CLAUDE.md`

**Interfaces:**
- Consumes: `selectFanoutRecipients`/`renderPushText` (Task 7), `checkCronAuth`/`utcDayKey` idiom (from `game/shift/route.ts`), `db`/`tx` (`@instantdb/admin`), `expo-server-sdk` `Expo`.

- [ ] **Step 1: Install the server SDK**

```bash
cd /Volumes/FP80/code/dieforward && npm install expo-server-sdk
```

- [ ] **Step 2: Implement `src/app/api/game/dispatch/route.ts`** (hourly cron; reads players, selects local-morning recipients, sends today's dispatch, stamps `lastDispatchDayKey`):

```ts
import { NextRequest, NextResponse } from 'next/server';
import { tx } from '@instantdb/admin';
import { db } from '@/lib/db';
import { Expo } from 'expo-server-sdk';
import { selectFanoutRecipients, renderPushText, type FanoutUser } from '@/lib/dispatch-fanout';

const TARGET_LOCAL_HOUR = 8; // 08:00 local
const HOME_ZONE = 'sunken-crypt'; // push describes the flagship zone's day

let unguardedWarned = false;
function checkCronAuth(request: NextRequest): NextResponse | null {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    if (!unguardedWarned) { console.warn('[Dispatch] CRON_SECRET is not set — endpoint UNGUARDED.'); unguardedWarned = true; }
    return null;
  }
  const authHeader = request.headers.get('authorization');
  if (authHeader === `Bearer ${secret}` || request.headers.get('x-cron-secret') === secret) return null;
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

/** Real timezone→{hour,dayKey}. Uses Intl with the user's IANA tz. */
function localTimeOf(tz: string, utcMs: number): { hour: number; dayKey: string } {
  try {
    const d = new Date(utcMs);
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: tz, hour12: false, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit',
    }).formatToParts(d);
    const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
    const hour = parseInt(get('hour'), 10);
    return { hour: Number.isNaN(hour) ? -1 : hour % 24, dayKey: `${get('year')}-${get('month')}-${get('day')}` };
  } catch {
    return { hour: -1, dayKey: '' };
  }
}

export async function POST(request: NextRequest) {
  const denied = checkCronAuth(request);
  if (denied) return denied;
  try {
    const nowUtcMs = Date.now();

    // today's community row for the flagship zone (best-effort; push degrades to mask/quiet text)
    const utcDay = localTimeOf('UTC', nowUtcMs).dayKey;
    const shiftRes = await db.query({ worldShifts: { $: { where: { dayKey: utcDay, zoneId: HOME_ZONE }, limit: 1 } } }).catch(() => null);
    const row = (shiftRes?.worldShifts?.[0] as Record<string, unknown>) ?? {};
    const apex = (row.apexCreatureId as string) ?? null;
    const cursed = Array.isArray(row.curseNodes) ? (row.curseNodes as string[]) : [];

    // STRICT F7 (user decision, July 2026): send ONLY on consequential days — an
    // apex threat or a mass-death curse. Quiet/mask-only days send NO push (the
    // in-app panel still shows the day's dispatch). Seeded map masks are NOT
    // computed web-side, so they do not trigger a push — a deliberately conservative,
    // high-signal reading that matches "most days silent".
    if (!apex && cursed.length === 0) {
      return NextResponse.json({ success: true, sent: 0, reason: 'quiet day — no push' });
    }
    const pushText = renderPushText({ apexCreatureId: apex, curseNodes: cursed, hasMask: false });

    const playersRes = await db.query({ players: {} }).catch(() => null);
    const players = (playersRes?.players ?? []) as Record<string, unknown>[];
    const users: FanoutUser[] = players.map((p) => ({
      playerId: p.id as string,
      pushToken: (p.pushToken as string) ?? null,
      timezone: (p.timezone as string) ?? null,
      notifOptIn: (p.notifOptIn as boolean) ?? false,
      lastDispatchDayKey: (p.lastDispatchDayKey as string) ?? null,
    }));

    const recipients = selectFanoutRecipients(users, { nowUtcMs, targetLocalHour: TARGET_LOCAL_HOUR, localTimeOf });
    if (recipients.length === 0) return NextResponse.json({ success: true, sent: 0 });

    const expo = new Expo();
    const messages = recipients
      .filter((r) => Expo.isExpoPushToken(r.pushToken))
      .map((r) => ({ to: r.pushToken, sound: 'default' as const, body: pushText }));

    // send in chunks; ignore per-ticket errors (best-effort delivery)
    for (const chunk of expo.chunkPushNotifications(messages)) {
      try { await expo.sendPushNotificationsAsync(chunk); } catch (e) { console.warn('[Dispatch] send chunk failed:', e); }
    }

    // stamp lastDispatchDayKey so each user gets ≤1/day
    await db.transact(recipients.map((r) => tx.players[r.playerId].update({ lastDispatchDayKey: r.localDayKey })));

    return NextResponse.json({ success: true, sent: recipients.length });
  } catch (error) {
    console.error('Failed to fan out dispatch:', error);
    return NextResponse.json({ error: 'Failed to fan out dispatch' }, { status: 500 });
  }
}
```
(Note: 4c sends the same flagship-zone dispatch text to all recipients — a per-user "your zone/your corpse" push is a later refinement; the in-app panel already personalizes. The `hasMask: true` fallback is acceptable because seeded masks exist daily; scarcity of the PUSH is enforced by `lastDispatchDayKey` + the fact that most users only match one local-morning hour per day.)

- [ ] **Step 3: Register the hourly cron** in `vercel.json` (append to `crons`):

```json
    { "path": "/api/game/dispatch", "schedule": "0 * * * *" }
```

- [ ] **Step 4: Verify**

Run: `cd /Volumes/FP80/code/dieforward && npx jest && npx tsc --noEmit`
Expected: full root suite green (incl. `dispatch-fanout`), tsc exit 0. (Route send path is not unit-tested — `expo-server-sdk` network; the selection logic is fully tested in Task 7. Note this.)

- [ ] **Step 5: Docs** — spec §8: add `**(done, phase 4c July 2026)**` — shared `renderDispatch` pipeline feeds home + zone-select (surfaces 1-2) and a once-daily push (surface 3) at local morning; F7 scarcity (banner only on consequential days, ≤1/day, 3 rotating registers); diegetic optional opt-in after first death, nothing gated on permission; `Player.pushToken/timezone/notifOptIn/lastDispatchDayKey`; hourly fan-out cron via `expo-server-sdk`. List DEFERRED: the Architect-corpse personal push (post-4b/A2), per-locale push body (English for now). Note the **EAS rebuild requirement** (native `expo-notifications`). In `CLAUDE.md`, add the dispatch/notifications sentence to the world-shift/community description.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json src/app/api/game/dispatch/route.ts vercel.json docs/superpowers/specs/2026-07-04-the-shift-design.md CLAUDE.md
git commit -m "feat(4c): hourly local-morning dispatch fan-out cron + docs (phase 4c done)"
```

---

## Self-Review

**Spec coverage (§8):**
- One pipeline, three surfaces → `renderDispatch` (Task 1) feeding home (Task 2), zone-select (Task 3), push (Tasks 7-8). ✅
- `renderDispatch(shift)` bible voice ≤140, i18n → Task 1 (+ `renderPushText` English for the push body). ✅
- F7 scarcity (1/day cap, consequential-only, 3 registers) → Task 1 (level/register) + Task 7/8. **User decision (July 2026): NO push on quiet days.** The cron sends ONLY when the flagship zone's day has an apex OR cursed nodes; quiet/mask-only days send zero pushes (early return). The ≤1/day cap is additionally enforced by `lastDispatchDayKey`. Mask-only days are treated as quiet for the PUSH (seeded masks aren't computed web-side) — a conservative, high-signal reading; the in-app panel still shows mask days. ✅
- Local-morning delivery, UTC shift boundary → Task 7 `localTimeOf` + Task 8 real Intl impl. ✅
- Diegetic optional permission, nothing gated → Task 6. ✅
- `Player.pushToken`/`timezone` + hourly fan-out cron (greenfield) → Tasks 4, 8. ✅
- Rare Architect-corpse personal push → explicitly DEFERRED (post-4b/A2). ✅

**Placeholder scan:** No TBD/TODO. Two named verify-against-reality checks remain (they are bounded, not placeholders): Task 2 `t(key, params)` signature + className tokens; Task 5 `expo-constants` `projectId` accessor. Both name the exact thing to confirm.

**Type consistency:** `Dispatch`/`DispatchLine`/`renderDispatch` (Task 1) consumed by Tasks 2-3. `WorldShift`/`mergeShift`/`fetchCommunityShiftsForDay` (Task 3) match world-shift.ts. `Player` notif fields (Task 4) are read by the cron's `FanoutUser` map (Task 8) and written by Task 6's flows — field names (`pushToken`/`timezone`/`notifOptIn`/`lastDispatchDayKey`) are identical across Tasks 4/6/7/8. `FanoutUser`/`FanoutRecipient`/`renderPushText` (Task 7) consumed by Task 8.

**Known ⚠️ for the controller (surface to reviewers):**
1. **Task 2/3 `t()` signature + component idiom** — the implementer must match the real `t(key, params)` usage and the file's existing Text/View/className tokens.
2. **Task 5 native** — `expo-notifications` cannot be jest-verified; only the pure timezone fallback is tested. The whole push path needs an **EAS build + device + Expo push credentials** to verify end-to-end. This is a phase-level external dependency, not a code defect.
3. **Silent-day push** — DECIDED (user, July 2026): NO push on quiet days. The cron early-returns unless the flagship day has an apex or cursed nodes (Task 8 Step 2). Mask-only days do not push.
