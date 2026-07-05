# The Shift — Phase 1 Implementation Plan (Tags, Synergies, Enemy Rules)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the combat/build-depth layer of The Shift: creature tags, item tags + 8 named synergies, data-driven enemy signature rules, the stamina 3-vs-4 fix, Heartstone's real effect, an i18n string layer for all new strings, and doc updates.

**Architecture:** All content data stays in `mobile/lib/content.ts` (tags, synergies) following its existing `Record<string, T>` pattern; a new pure module `mobile/lib/creature-rules.ts` holds the signature-rule engine as data-driven hooks called from `app/combat.tsx`'s turn processor; combat math changes go only through `mobile/lib/combat-math.ts` (existing pure-function pattern, already unit-tested). A new `mobile/lib/i18n.ts` provides `t(key)` over an English catalog — new/touched strings only, no big-bang migration.

**Tech Stack:** Expo SDK 54 / RN 0.81, TypeScript 5, Jest 29 + jest-expo (already configured: `cd mobile && npm test`), seeded RNG via existing `SeededRng`.

**Spec:** `docs/superpowers/specs/2026-07-04-the-shift-design.md` §5, §6, §10, Appendix C items 1, 2 (partial), 4, 6, 9.

## Global Constraints

- All work under `mobile/`; run tests with `cd mobile && npx jest <file> -v`.
- Determinism: every random draw goes through the run's `SeededRng` — never `Math.random()`.
- Combat math changes ONLY in `lib/combat-math.ts` pure functions (spec §5); combat.tsx wires, never computes.
- New player-facing strings go through `t()` from `lib/i18n.ts` (spec §10); named placeholders only, no string concatenation for word order.
- Canon stamina pool = **4** (spec Appendix C #6).
- Bible voice for all new player-facing copy: second person, present tense, sparse, no exclamation marks (CONTENT_BIBLE.md Tone & Voice).
- Commit after every task; conventional-commit style (`feat:`, `fix:`, `docs:`, `test:`) matching repo history.

---

### Task 1: Fix the stamina 3-vs-4 bug

**Files:**
- Modify: `mobile/lib/GameContext.tsx:180` and `mobile/lib/GameContext.tsx:798`
- Test: `mobile/lib/__tests__/stamina-defaults.test.ts` (create)

**Interfaces:**
- Consumes: `DEFAULT_GAME_SETTINGS.staminaPool` (`lib/instant.ts:671`, value 4)
- Produces: `STARTING_STAMINA` export from `lib/GameContext.tsx` (value = 4) so tests and later phases reference one constant.

- [ ] **Step 1: Write the failing test**

```ts
// mobile/lib/__tests__/stamina-defaults.test.ts
import { STARTING_STAMINA } from '../GameContext';
import { DEFAULT_GAME_SETTINGS } from '../instant';

describe('stamina defaults', () => {
  it('starting stamina matches the settings pool (canon: 4)', () => {
    expect(STARTING_STAMINA).toBe(4);
    expect(STARTING_STAMINA).toBe(DEFAULT_GAME_SETTINGS.staminaPool);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd mobile && npx jest lib/__tests__/stamina-defaults.test.ts -v`
Expected: FAIL — `STARTING_STAMINA` is not exported.

- [ ] **Step 3: Implement**

In `mobile/lib/GameContext.tsx`, near the top with other constants:

```ts
/** Canon starting/regen-cap stamina. Must match DEFAULT_GAME_SETTINGS.staminaPool. */
export const STARTING_STAMINA = 4;
```

Change line 180 `stamina: 3,` → `stamina: STARTING_STAMINA,`
Change line 798 `const startingStamina = modifier.startingStamina ?? 3;` → `const startingStamina = modifier.startingStamina ?? STARTING_STAMINA;`

- [ ] **Step 4: Run the full mobile test suite**

Run: `cd mobile && npx jest -v`
Expected: all pass (existing combat/zone tests must not regress).

- [ ] **Step 5: Commit**

```bash
git add mobile/lib/GameContext.tsx mobile/lib/__tests__/stamina-defaults.test.ts
git commit -m "fix: starting stamina matches staminaPool canon of 4"
```

---

### Task 2: i18n foundation (`t()` + English catalog)

**Files:**
- Create: `mobile/lib/i18n.ts`, `mobile/lib/locales/en.json`
- Test: `mobile/lib/__tests__/i18n.test.ts`

**Interfaces:**
- Produces: `t(key: string, vars?: Record<string, string | number>): string` — used by every later task's player-facing string. Missing key returns the key itself (fail-visible, never throws).

- [ ] **Step 1: Write the failing test**

```ts
// mobile/lib/__tests__/i18n.test.ts
import { t } from '../i18n';

describe('t()', () => {
  it('returns the catalog string for a known key', () => {
    expect(t('combat.synergy.discovered', { name: 'Ossuary Pact' }))
      .toBe('An Ossuary Pact is struck.'.replace('Ossuary Pact', 'Ossuary Pact')); // literal below
  });
  it('substitutes named placeholders', () => {
    expect(t('test.greeting', { name: 'Wanderer' })).toBe('The depths watch, Wanderer.');
  });
  it('returns the key itself when missing (fail-visible)', () => {
    expect(t('nope.missing')).toBe('nope.missing');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd mobile && npx jest lib/__tests__/i18n.test.ts -v` — Expected: FAIL (module not found).

- [ ] **Step 3: Implement**

```ts
// mobile/lib/i18n.ts
import en from './locales/en.json';

type Catalog = Record<string, string>;
const catalogs: Record<string, Catalog> = { en };
let locale = 'en';

export function setLocale(l: string) { if (catalogs[l]) locale = l; }

/** Lookup with {name}-style placeholder substitution. Missing keys return the key (fail-visible). */
export function t(key: string, vars?: Record<string, string | number>): string {
  const template = catalogs[locale][key] ?? catalogs.en[key];
  if (template === undefined) return key;
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (m, name) =>
    vars[name] !== undefined ? String(vars[name]) : m,
  );
}
```

```json
// mobile/lib/locales/en.json
{
  "test.greeting": "The depths watch, {name}.",
  "combat.synergy.discovered": "An {name} is struck."
}
```

(If `jest.config.js` / `tsconfig.json` lack JSON-module support, enable `"resolveJsonModule": true` in `mobile/tsconfig.json` — jest-expo handles JSON imports by default.)

- [ ] **Step 4: Run test to verify it passes** — `cd mobile && npx jest lib/__tests__/i18n.test.ts -v` → PASS.

- [ ] **Step 5: Commit**

```bash
git add mobile/lib/i18n.ts mobile/lib/locales/en.json mobile/lib/__tests__/i18n.test.ts mobile/tsconfig.json
git commit -m "feat: minimal i18n layer (t() + en catalog) per spec §10"
```

---

### Task 3: Creature tags + Void Salt actually fires

**Files:**
- Modify: `mobile/lib/content.ts` (`CreatureInfo` at 166-174, `BESTIARY` entries from 176, `ItemEffects`/`getItemEffects` at 500-545), `mobile/lib/combat-math.ts` (`CombatDamageInput` 19-41, `calculateCombatDamage` 50-67), `mobile/app/combat.tsx` (`calculateDamage` wrapper 204-219)
- Test: extend `mobile/lib/__tests__/combat-math.test.ts`; create `mobile/lib/__tests__/creature-tags.test.ts`

**Interfaces:**
- Produces: `type CreatureTag = 'aquatic' | 'bone' | 'spectral' | 'flesh' | 'construct' | 'sonic'` and `CreatureInfo.tags?: CreatureTag[]` (content.ts); `CombatDamageInput.tagDamageBonus: number` (combat-math.ts) — Task 5's synergies reuse `tagDamageBonus`.
- Consumes: `ItemEffects.voidSaltBonus` (content.ts:505).

- [ ] **Step 1: Write failing tests**

```ts
// mobile/lib/__tests__/creature-tags.test.ts
import { BESTIARY, getItemEffects, getTagDamageBonus } from '../content';

describe('creature tags', () => {
  it('every BESTIARY entry has at least one tag', () => {
    for (const [name, info] of Object.entries(BESTIARY)) {
      expect(info.tags?.length ?? 0).toBeGreaterThan(0);
    }
  });
  it('The Drowned is aquatic', () => {
    expect(BESTIARY['The Drowned'].tags).toContain('aquatic');
  });
  it('Void Salt grants +40% vs aquatic creatures', () => {
    const effects = getItemEffects([{ name: 'Void Salt' }]);
    expect(getTagDamageBonus(effects, ['aquatic'])).toBeCloseTo(0.4);
    expect(getTagDamageBonus(effects, ['bone'])).toBe(0);
  });
});
```

In `combat-math.test.ts` add:

```ts
it('tagDamageBonus multiplies player damage', () => {
  const base = calculateCombatDamage({ ...playerAttackFixture, tagDamageBonus: 0 });
  const boosted = calculateCombatDamage({ ...playerAttackFixture, tagDamageBonus: 0.4 });
  expect(boosted).toBe(Math.round(base * 1.4));
});
```

(Reuse the existing fixture pattern already in `combat-math.test.ts`; if none exists as an object, inline the full `CombatDamageInput` literal with `isPlayerAttacking: true`.)

- [ ] **Step 2: Run to verify failure** — `cd mobile && npx jest creature-tags combat-math -v` → FAIL (no `tags`, no `getTagDamageBonus`, no `tagDamageBonus`).

- [ ] **Step 3: Implement**

`content.ts` — extend the interface and add tags to every `BESTIARY` entry:

```ts
export type CreatureTag = 'aquatic' | 'bone' | 'spectral' | 'flesh' | 'construct' | 'sonic';

export interface CreatureInfo {
  // ...existing fields...
  tags?: CreatureTag[];
}
```

Tagging guide (apply to all ~21 BESTIARY entries; zone JSON creatures get tags in Phase 2's bible revision — BESTIARY only here): water/drowned/tide creatures → `aquatic`; skeletal/bone → `bone`; shades/ghosts/echoes → `spectral`; husks/bloated/flesh → `flesh`; statues/guardians → `construct`; singers/choirs → `sonic`. Multi-tag where obvious (e.g. a drowned skeleton → `['aquatic','bone']`).

Add below `getItemEffects`:

```ts
/** Damage bonus from item effects that key off creature tags (Void Salt, synergies). */
export function getTagDamageBonus(effects: ItemEffects, creatureTags: CreatureTag[] = []): number {
  let bonus = 0;
  if (effects.voidSaltBonus && creatureTags.includes('aquatic')) bonus += 0.4;
  for (const [tag, b] of Object.entries(effects.tagDamageBonuses ?? {})) {
    if (creatureTags.includes(tag as CreatureTag)) bonus += b;
  }
  return bonus;
}
```

and extend `ItemEffects`:

```ts
export interface ItemEffects {
  // ...existing fields...
  tagDamageBonuses?: Partial<Record<CreatureTag, number>>; // filled by synergies (Task 5)
}
```

`combat-math.ts` — add `tagDamageBonus: number` to `CombatDamageInput` (default it in the destructure: `tagDamageBonus = 0`) and change the player branch:

```ts
if (isPlayerAttacking) {
  return Math.round(base * (1 + itemDamageBonus + modifierDamageBonus + tagDamageBonus) * intentDamageTakenMod);
}
```

`app/combat.tsx` — in the `calculateDamage` wrapper (204-219), look up the creature's tags and pass the bonus:

```ts
const creatureTags = BESTIARY[creatureName]?.tags ?? [];
// inside the input object:
tagDamageBonus: isPlayerAttacking ? getTagDamageBonus(itemEffects, creatureTags) : 0,
```

- [ ] **Step 4: Run full suite** — `cd mobile && npx jest -v` → PASS.

- [ ] **Step 5: Commit**

```bash
git add mobile/lib/content.ts mobile/lib/combat-math.ts mobile/app/combat.tsx mobile/lib/__tests__/
git commit -m "feat: creature tags + tag damage pipeline; Void Salt aquatic bonus now fires"
```

---

### Task 4: Item element tags

**Files:**
- Modify: `mobile/lib/content.ts` (`ItemDetails` 550-558; all 26 `ITEM_DETAILS` entries 560-793)
- Test: `mobile/lib/__tests__/item-tags.test.ts`

**Interfaces:**
- Produces: `type ElementTag = 'WATER' | 'BONE' | 'VOID' | 'ASH' | 'FLAME' | 'ECHO' | 'PILGRIM'`; `ItemDetails.elementTags?: ElementTag[]`. Task 5 consumes both.

- [ ] **Step 1: Failing test**

```ts
// mobile/lib/__tests__/item-tags.test.ts
import { ITEM_DETAILS } from '../content';

describe('item element tags', () => {
  it('every non-consumable item has 1-2 element tags', () => {
    for (const [id, d] of Object.entries(ITEM_DETAILS)) {
      if (d.type === 'consumable') continue;
      const n = d.elementTags?.length ?? 0;
      expect(n).toBeGreaterThanOrEqual(1);
      expect(n).toBeLessThanOrEqual(2);
    }
  });
  it('spot checks', () => {
    expect(ITEM_DETAILS['Bone Hook'].elementTags).toContain('BONE');
    expect(ITEM_DETAILS['Voidblade'].elementTags).toContain('VOID');
    expect(ITEM_DETAILS['Ash Veil'].elementTags).toContain('ASH');
  });
});
```

- [ ] **Step 2: Verify failure** — `npx jest item-tags -v` → FAIL.

- [ ] **Step 3: Implement** — add to `ItemDetails`:

```ts
export type ElementTag = 'WATER' | 'BONE' | 'VOID' | 'ASH' | 'FLAME' | 'ECHO' | 'PILGRIM';
export interface ItemDetails {
  // ...existing...
  elementTags?: ElementTag[];
}
```

Tag assignment (all 26, consumables included where thematic):

| Item | Tags | | Item | Tags |
|---|---|---|---|---|
| Herbs | — | | Torch | FLAME |
| Pale Rations | — | | Bone Charm | BONE, ECHO |
| Bone Dust | BONE | | Ancient Scroll | PILGRIM, ECHO |
| Void Salt | VOID, WATER | | Eye of the Hollow | VOID, ECHO |
| Poison Vial | WATER | | Heartstone | ECHO |
| Rusty Blade | PILGRIM | | Pale Coin | PILGRIM |
| Dagger | PILGRIM | | Soulstone | VOID, ECHO |
| Bone Hook | BONE | | Death's Mantle | VOID |
| Shield | PILGRIM | | Voidblade | VOID |
| Tattered Shield | PILGRIM | | Ember Flask | FLAME |
| Cloak | ECHO | | Ash Veil | ASH |
| Frost Shard | WATER | | Thermal Flask | FLAME |
| Clarity Shard | ECHO | | Cleansing Salts | WATER, ASH |

- [ ] **Step 4: Verify pass** — `npx jest item-tags -v` → PASS.
- [ ] **Step 5: Commit** — `git add mobile/lib/content.ts mobile/lib/__tests__/item-tags.test.ts && git commit -m "feat: element tags on all items"`

---

### Task 5: Synergy definitions + resolution

**Files:**
- Modify: `mobile/lib/content.ts` (below `getItemEffects`), `mobile/lib/locales/en.json`
- Test: `mobile/lib/__tests__/synergies.test.ts`

**Interfaces:**
- Consumes: `ElementTag`, `ItemDetails.elementTags` (Task 4); `ItemEffects.tagDamageBonuses` (Task 3).
- Produces:

```ts
export interface Synergy {
  id: string;                     // 'ossuary-pact'
  name: string;                   // i18n key: synergy.<id>.name
  items: [string, string];        // exact ITEM_DETAILS keys
  apply: (effects: ItemEffects) => ItemEffects;
}
export const SYNERGIES: Synergy[];
export function getActiveSynergies(inventory: { name: string }[]): Synergy[];
```

and `getItemEffects` gains a final pass: `for (const s of getActiveSynergies(inventory)) effects = s.apply(effects);`
Also new `ItemEffects` fields consumed by Tasks 6-7: `mantleHealTo?: number`, `voidbladeSelfDamageZero?: boolean`, `burnImmune?: boolean`, `peekFree?: boolean`, `critBonus?: number`, `fleeDamageHalved?: boolean`.

The 8 launch synergies (exact item ids from `ITEM_DETAILS`):

| id | Pair | Effect (via `apply`) |
|---|---|---|
| `ossuary-pact` | Bone Hook + Bone Charm | `tagDamageBonuses.bone += 0.30` |
| `grave-tide` | Void Salt + Frost Shard | `tagDamageBonuses.aquatic += 0.20` (stacks over Void Salt's 0.40) |
| `last-breath-pact` | Death's Mantle + Soulstone | `mantleHealTo = 25` (Mantle revive heals to 25 HP, not 1) |
| `hungering-edge` | Voidblade + Soulstone | `voidbladeSelfDamageZero = true` |
| `ashen-ward` | Ember Flask + Ash Veil | `burnImmune = true` |
| `pilgrims-clarity` | Ancient Scroll + Clarity Shard | `peekFree = true` (tertiary peek costs 0 stamina) |
| `twin-fangs` | Dagger + Poison Vial | `critBonus = 0.10` (crit 15% → 25%) |
| `beggars-grace` | Cloak + Tattered Shield | `fleeBonus += 0.20; fleeDamageHalved = true` |

- [ ] **Step 1: Failing tests**

```ts
// mobile/lib/__tests__/synergies.test.ts
import { getActiveSynergies, getItemEffects, SYNERGIES } from '../content';

const inv = (...names: string[]) => names.map((name) => ({ name }));

describe('synergies', () => {
  it('every synergy references two real item ids', () => {
    const { ITEM_DETAILS } = require('../content');
    for (const s of SYNERGIES) for (const item of s.items) {
      expect(ITEM_DETAILS[item]).toBeDefined();
    }
  });
  it('activates only when both items are carried', () => {
    expect(getActiveSynergies(inv('Bone Hook')).map(s => s.id)).toEqual([]);
    expect(getActiveSynergies(inv('Bone Hook', 'Bone Charm')).map(s => s.id)).toEqual(['ossuary-pact']);
  });
  it('ossuary-pact adds +30% vs bone', () => {
    const e = getItemEffects(inv('Bone Hook', 'Bone Charm'));
    expect(e.tagDamageBonuses?.bone).toBeCloseTo(0.30);
  });
  it('ashen-ward grants burn immunity', () => {
    expect(getItemEffects(inv('Ember Flask', 'Ash Veil')).burnImmune).toBe(true);
  });
  it('last-breath-pact upgrades the mantle heal', () => {
    expect(getItemEffects(inv("Death's Mantle", 'Soulstone')).mantleHealTo).toBe(25);
  });
});
```

- [ ] **Step 2: Verify failure** — `npx jest synergies -v` → FAIL.

- [ ] **Step 3: Implement** in `content.ts` (data + two functions, `apply` mutating a copied effects object), add all 8 rows from the table, and append the synergy pass at the end of `getItemEffects`. Add to `en.json`: one `synergy.<id>.name` + `synergy.<id>.flavor` pair per synergy, bible voice, e.g.

```json
"synergy.ossuary-pact.name": "Ossuary Pact",
"synergy.ossuary-pact.flavor": "The charm hums against the hook. The bones answer.",
"synergy.grave-tide.name": "Grave Tide",
"synergy.grave-tide.flavor": "Salt and frost. The water remembers what it drowned.",
"synergy.last-breath-pact.name": "Last Breath Pact",
"synergy.last-breath-pact.flavor": "The mantle drinks from the stone. Death loosens its grip.",
"synergy.hungering-edge.name": "Hungering Edge",
"synergy.hungering-edge.flavor": "The blade feeds elsewhere now.",
"synergy.ashen-ward.name": "Ashen Ward",
"synergy.ashen-ward.flavor": "Ash coats the ember. Fire forgets your name.",
"synergy.pilgrims-clarity.name": "Pilgrim's Clarity",
"synergy.pilgrims-clarity.flavor": "The scroll reads itself. The way ahead thins.",
"synergy.twin-fangs.name": "Twin Fangs",
"synergy.twin-fangs.flavor": "One cut to open. One to finish.",
"synergy.beggars-grace.name": "Beggar's Grace",
"synergy.beggars-grace.flavor": "Nothing worth taking. Nothing worth chasing."
```

- [ ] **Step 4: Verify pass** — `npx jest synergies -v` → PASS; then full suite.
- [ ] **Step 5: Commit** — `git commit -m "feat: 8 item synergies with tag-driven effects"`

---

### Task 6: Wire synergy effects into combat + run flow

**Files:**
- Modify: `mobile/app/combat.tsx` (crit roll; flee damage; burn tick; mantle path via `deathSaveOutcome` call sites; Voidblade tick via `voidbladeDamage` call sites), `mobile/lib/combat-math.ts` (`deathSaveOutcome` 95-98 → return `healTo`; `voidbladeDamage` 107 → accept effects), `mobile/app/play.tsx:898` area (peek stamina cost)
- Test: extend `mobile/lib/__tests__/combat-math.test.ts`

**Interfaces:**
- Consumes: `ItemEffects.{mantleHealTo, voidbladeSelfDamageZero, burnImmune, peekFree, critBonus, fleeDamageHalved}` (Task 5).
- Produces: `deathSaveOutcome(health, inventory, effects): { saved: boolean; mantleIndex: number; healTo: number }`; `voidbladeDamage(inventory, effects): number`.

- [ ] **Step 1: Failing tests** (in `combat-math.test.ts`)

```ts
it('mantle heals to 25 with last-breath-pact', () => {
  const inv = [{ name: "Death's Mantle" }, { name: 'Soulstone' }];
  const out = deathSaveOutcome(-3, inv, getItemEffects(inv));
  expect(out.saved).toBe(true);
  expect(out.healTo).toBe(25);
});
it('mantle heals to 1 without the pact', () => {
  const inv = [{ name: "Death's Mantle" }];
  expect(deathSaveOutcome(-3, inv, getItemEffects(inv)).healTo).toBe(1);
});
it('voidblade self-damage is 0 with hungering-edge', () => {
  const inv = [{ name: 'Voidblade' }, { name: 'Soulstone' }];
  expect(voidbladeDamage(inv, getItemEffects(inv))).toBe(0);
});
```

- [ ] **Step 2: Verify failure**, **Step 3: Implement** — extend the two combat-math functions per the new signatures; in `combat.tsx`: crit threshold `0.15 + (itemEffects.critBonus ?? 0)`; flee damage `fleeDamageHalved ? Math.ceil(dmg / 2) : dmg`; burn application skipped when `burnImmune`; update both `deathSaveOutcome`/`voidbladeDamage` call sites for new signatures. In `play.tsx`, tertiary peek stamina cost: `itemEffects.peekFree ? 0 : 1`.
- [ ] **Step 4: Full suite passes.**
- [ ] **Step 5: Commit** — `git commit -m "feat: synergy effects live in combat and exploration"`

---

### Task 7: Synergy discovery moment (UI)

**Files:**
- Modify: `mobile/app/play.tsx` (item-pickup path — wherever `game.inventory` gains an item after loot/corpse/cache rolls), `mobile/lib/locales/en.json`
- Test: `mobile/lib/__tests__/synergy-discovery.test.ts` (pure helper)

**Interfaces:**
- Produces: `newlyFormedSynergies(before: {name:string}[], after: {name:string}[]): Synergy[]` in `content.ts`.

- [ ] **Step 1: Failing test**

```ts
import { newlyFormedSynergies } from '../content';
it('detects a synergy formed by the newest pickup', () => {
  const before = [{ name: 'Bone Hook' }];
  const after = [...before, { name: 'Bone Charm' }];
  expect(newlyFormedSynergies(before, after).map(s => s.id)).toEqual(['ossuary-pact']);
  expect(newlyFormedSynergies(after, after)).toEqual([]);
});
```

- [ ] **Step 2-3: Implement** — diff of `getActiveSynergies(after)` minus `getActiveSynergies(before)` by id. In `play.tsx`, after inventory updates, if non-empty: append to the room narrative stream (existing typewriter text path) `t('synergy.' + s.id, ...)` name line + flavor line, amber-styled like item-found text. Add `en.json` key `"synergy.formed": "{name} — {flavor}"`.
- [ ] **Step 4: Suite passes.** Manual check: `cd mobile && npm run start`, empty-handed run, use the risky-explore option until two pact items drop (or temporarily seed inventory in dev), confirm the discovery line renders in the narrative stream.
- [ ] **Step 5: Commit** — `git commit -m "feat: synergy discovery narrative moment on pickup"`

---

### Task 8: Signature-rule engine

**Files:**
- Create: `mobile/lib/creature-rules.ts`
- Test: `mobile/lib/__tests__/creature-rules.test.ts`

**Interfaces:**
- Consumes: `CreatureInfo` (content.ts), `ItemEffects` (for VOID/ASH kill checks), `SeededRng`.
- Produces (consumed by Task 9's data and Task 10's wiring):

```ts
export type SignatureRuleId =
  | 'rupture'      // explodes on death: dmg unless final blow was a dodge-counter
  | 'reform'       // revives once at 50% max HP unless killer inventory has a VOID or ASH item
  | 'multiply'     // +1 pending attacker if fight passes turn N (param.turn)
  | 'blink'        // auto-evades the player's first strike of the fight
  | 'absorb'       // heals param.heal when its attack lands
  | 'drain'        // its hits cost 1 stamina in addition to HP
  | 'chant'        // +param.ramp damage per turn it was not struck
  | 'pounce'       // using an item in combat triggers an immediate free attack
  | 'honor'        // never ERRATIC; winning without fleeing grants bonus mastery
  | 'dormant';     // skips turn 1; flee is blocked from turn 2 on

export interface SignatureRule { id: SignatureRuleId; param?: { turn?: number; heal?: number; ramp?: number } }

export interface CombatRuleState { turn: number; struckLastTurn: boolean; blinkUsed: boolean; reformUsed: boolean; chantStacks: number }

export function initialRuleState(): CombatRuleState;
// Each hook returns a delta the combat screen applies; pure, no side effects.
export function onPlayerStrike(rule: SignatureRule | undefined, s: CombatRuleState): { evaded: boolean; state: CombatRuleState };
export function onEnemyHitLanded(rule: SignatureRule | undefined, s: CombatRuleState, enemyMaxHp: number): { healEnemy: number; staminaDrain: number };
export function onDeathBlow(rule: SignatureRule | undefined, s: CombatRuleState, opts: { lastActionWasDodgeCounter: boolean; playerHasVoidOrAsh: boolean; enemyMaxHp: number }): { ruptureDamage: number; reformToHp: number };
export function onTurnEnd(rule: SignatureRule | undefined, s: CombatRuleState): { addAttacker: boolean; chantBonusDamage: number; state: CombatRuleState };
export function fleeBlocked(rule: SignatureRule | undefined, s: CombatRuleState): boolean;
export function itemUseTriggersAttack(rule: SignatureRule | undefined): boolean;
```

- [ ] **Step 1: Write failing tests** — one describe per rule; representative cases:

```ts
import { initialRuleState, onPlayerStrike, onDeathBlow, onTurnEnd, fleeBlocked } from '../creature-rules';

it('blink evades only the first strike', () => {
  let s = initialRuleState();
  const first = onPlayerStrike({ id: 'blink' }, s);
  expect(first.evaded).toBe(true);
  expect(onPlayerStrike({ id: 'blink' }, first.state).evaded).toBe(false);
});
it('rupture damages unless finished on a dodge-counter', () => {
  const s = initialRuleState();
  expect(onDeathBlow({ id: 'rupture' }, s, { lastActionWasDodgeCounter: false, playerHasVoidOrAsh: false, enemyMaxHp: 60 }).ruptureDamage).toBeGreaterThan(0);
  expect(onDeathBlow({ id: 'rupture' }, s, { lastActionWasDodgeCounter: true, playerHasVoidOrAsh: false, enemyMaxHp: 60 }).ruptureDamage).toBe(0);
});
it('reform revives once at half HP unless VOID/ASH', () => {
  const s = initialRuleState();
  expect(onDeathBlow({ id: 'reform' }, s, { lastActionWasDodgeCounter: false, playerHasVoidOrAsh: false, enemyMaxHp: 60 }).reformToHp).toBe(30);
  expect(onDeathBlow({ id: 'reform' }, s, { lastActionWasDodgeCounter: false, playerHasVoidOrAsh: true, enemyMaxHp: 60 }).reformToHp).toBe(0);
});
it('multiply signals an added attacker after its turn threshold', () => {
  let s = { ...initialRuleState(), turn: 4 };
  expect(onTurnEnd({ id: 'multiply', param: { turn: 4 } }, s).addAttacker).toBe(true);
});
it('dormant blocks flee from turn 2', () => {
  expect(fleeBlocked({ id: 'dormant' }, { ...initialRuleState(), turn: 1 })).toBe(false);
  expect(fleeBlocked({ id: 'dormant' }, { ...initialRuleState(), turn: 2 })).toBe(true);
});
```

- [ ] **Step 2: Verify failure**, **Step 3: Implement** the module (pure functions over the state record; rupture damage = `Math.round(enemyMaxHp * 0.2)`; reform HP = `Math.round(enemyMaxHp * 0.5)` once).
- [ ] **Step 4: `npx jest creature-rules -v` → PASS.**
- [ ] **Step 5: Commit** — `git commit -m "feat: data-driven creature signature-rule engine"`

---

### Task 9: Assign signatures to creatures (data)

**Files:**
- Modify: `mobile/lib/content.ts` (`CreatureInfo` + `BESTIARY` entries), `mobile/lib/locales/en.json` (one telegraph line per rule, bible voice)
- Test: extend `mobile/lib/__tests__/creature-tags.test.ts`

**Interfaces:**
- Produces: `CreatureInfo.signature?: SignatureRule`.

Mapping (spec §6 names → live `BESTIARY` keys; the implementer greps `BESTIARY` for each and uses the actual key; where a spec creature is absent from the global BESTIARY, skip it — zone-local creatures are Phase 2):

| BESTIARY creature (grep to confirm exact key) | Rule |
|---|---|
| Bloated One(s) | `{ id: 'rupture' }` |
| Tideborn | `{ id: 'reform' }` |
| Bone Weaver(s) | `{ id: 'multiply', param: { turn: 4 } }` |
| Flickering Shade(s) | `{ id: 'blink' }` |
| The Hunched | `{ id: 'pounce' }` |
| The Congregation | `{ id: 'absorb', param: { heal: 8 } }` |
| Carrion Knight(s) | `{ id: 'honor' }` |
| Forgotten Guardian(s) | `{ id: 'dormant' }` |
| The Weeping | `{ id: 'drain' }` |
| Throat Singer(s) | `{ id: 'chant', param: { ramp: 3 } }` |
| Hollow Clergy | `{ id: 'chant', param: { ramp: 4 } }` |
| Echo Husk(s) | none this phase (its final-words rule needs the community layer — Phase 4) |

- [ ] **Step 1: Failing test** — `it('at least 8 BESTIARY creatures carry a signature', ...)` counting `Object.values(BESTIARY).filter(c => c.signature).length >= 8`, plus spot checks for two known keys once confirmed.
- [ ] **Step 2-3:** grep, assign, add `en.json` telegraph lines keyed `rule.<id>.telegraph` (e.g. `"rule.rupture.telegraph": "Something moves beneath its skin. It will not die quietly."`) — shown at combat start for creatures with a signature.
- [ ] **Step 4: Suite passes.** **Step 5: Commit** — `git commit -m "feat: signature rules assigned across the bestiary"`

---

### Task 10: Wire the rule engine into combat.tsx

**Files:**
- Modify: `mobile/app/combat.tsx` (`handleAction` 233-465; intent selection call sites 182-185 and 492-504; regen at 508)
- Test: extend `mobile/lib/__tests__/creature-rules.test.ts` with an integration-shaped pure test if any glue logic lands outside combat.tsx; otherwise manual verification

- [ ] **Step 1: Wire hooks** — hold `ruleState` in a `useRef(initialRuleState())`; on strike resolution call `onPlayerStrike` (render "It is elsewhere." on evade via `t('rule.blink.evade')`); on enemy hit apply `onEnemyHitLanded` (heal enemy, drain stamina); on enemy HP ≤ 0 call `onDeathBlow` before victory (apply rupture damage with narrative line, or set enemy HP to `reformToHp` with reform line); each turn end call `onTurnEnd` (chant bonus feeds next enemy damage as `+chantBonusDamage` on the base before `calculateCombatDamage`; `addAttacker` renders a second-attacker line and adds one extra enemy strike that turn); gate flee via `fleeBlocked`; item use checks `itemUseTriggersAttack`. For `honor`: filter `ERRATIC` out of the intent roll for that creature (wrap the `getCreatureIntentSeeded` result: re-roll once if ERRATIC) and pass a `masteryBonus` flag to the existing victory/mastery recording path.
- [ ] **Step 2: Full suite passes** — `cd mobile && npx jest -v`.
- [ ] **Step 3: Manual verification** — `npm run start`, fight a rupture and a dormant creature (dev-force via temporarily pinning the room creature if drops don't cooperate), confirm telegraph line, rule behavior, and that fleeing a Guardian past turn 1 is refused with its line.
- [ ] **Step 4: Commit** — `git commit -m "feat: signature rules live in combat"`

---

### Task 11: Heartstone's real effect

**Files:**
- Modify: `mobile/lib/combat-math.ts`, `mobile/app/combat.tsx`, `mobile/lib/locales/en.json`
- Test: extend `mobile/lib/__tests__/combat-math.test.ts`

**Interfaces:**
- Produces: `heartstoneWarning(healthBefore: number, incomingDamage: number, maxHp: number, inventory: {name:string}[]): boolean` — true when this hit would drop the player below 20% max HP for the first time while carrying Heartstone.

- [ ] **Step 1: Failing test**

```ts
it('heartstone warns when a hit would cross below 20% max HP', () => {
  const inv = [{ name: 'Heartstone' }];
  expect(heartstoneWarning(30, 15, 100, inv)).toBe(true);   // 30 -> 15 crosses 20
  expect(heartstoneWarning(80, 15, 100, inv)).toBe(false);
  expect(heartstoneWarning(30, 15, 100, [])).toBe(false);
});
```

- [ ] **Step 2-3: Implement** + wire in combat.tsx before applying enemy damage: when true, show `t('item.heartstone.warning')` = `"The stone burns warm against your chest."` styled in blood red, one turn of `+0.10` defense that turn (`itemDefenseBonus + 0.10` for that single calculation). Bible: "Warm when death is near."
- [ ] **Step 4: Suite passes.** **Step 5: Commit** — `git commit -m "feat: Heartstone warns near death (bible-canon effect)"`

---

### Task 12: Docs pass (spec's docs-with-the-work rule)

**Files:**
- Modify: `CLAUDE.md` (Testing section — replace "No automated testing configured" with jest reality: `cd mobile && npm test`, tests in `mobile/lib/__tests__/`), `docs/CONTENT_BIBLE.md` (loot tiers table 60/30/8/2 → 55/30/12/3 per Appendix C #7; add a "Synergies" subsection under Items listing the 8 pacts with flavor lines; note signature behaviors now mechanical in the Bestiary intro), `docs/superpowers/specs/2026-07-04-the-shift-design.md` (tick Appendix C items 1, 2-partial, 4, 6, 9, 12-n/a-this-phase with "done in phase 1" notes)
- Test: none (docs)

- [ ] **Step 1: Make the three edits above.** Keep bible tone rules; synergy names/flavors copied from `en.json` (single source: note in bible that `en.json` is canonical for these strings).
- [ ] **Step 2: Commit** — `git commit -m "docs: phase 1 reality — testing setup, loot tiers, synergies in bible"`

---

## Self-Review

- **Spec coverage:** §5 (tags, synergies, stub items → Tasks 3-7, 11; Bone Dust/Pale Coin/Eye map effects explicitly Phase 2), §6 (engine + data + wiring → Tasks 8-10; Echo Husk deferred to Phase 4 with reason), §10 (i18n → Task 2, used by 5,7,9,11), Appendix C #6 (Task 1), #7+docs (Task 12), #9 (combat heal action: covered — `pounce` makes item use a decision; the explicit Herbs-as-action UI already exists as situational item use in combat; no further change this phase).
- **Placeholder scan:** Task 9 requires a grep-to-confirm of exact BESTIARY keys — deliberate: the extraction verified only 'The Drowned' verbatim; the test in Task 9 enforces ≥8 assignments so a failed mapping cannot silently pass.
- **Type consistency:** `tagDamageBonuses` (Task 3 interface) = consumed in Task 5 table; `deathSaveOutcome`/`voidbladeDamage` new signatures defined once in Task 6 and only used there; `SignatureRule`/hook names in Task 8 match Task 10 wiring.
