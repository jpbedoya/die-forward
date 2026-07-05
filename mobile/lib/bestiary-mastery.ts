/**
 * Bestiary Mastery
 *
 * Tracks per-creature encounter / defeat / killed-by counters on the Player
 * record (mobile/lib/instant.ts:Player.creatureMastery) and derives cosmetic
 * unlocks at thresholds.
 *
 * Two scoring axes:
 *   - per-creature: defeat N of a specific creature → unlock a title /
 *     border keyed to that creature ("Ember Husks Slayer", etc.)
 *   - aggregate:    encounter/defeat X% of the bestiary → unlock a
 *     curator-style title ("Apprentice Lorekeeper" through "Master Lorekeeper")
 *
 * Pure module — no I/O, no React, no InstantDB. Composes with
 * applyMilestoneCosmetics() in mobile/lib/instant.ts (which accepts any
 * { type, value } shape) so unlocks land in Player.unlockedTitles /
 * unlockedBorders via the same idempotent path death milestones use.
 */

// ── Persisted state ─────────────────────────────────────────────────────────

export interface CreatureMasteryEntry {
  /** Times the player faced this creature (combat enter). */
  encounters: number;
  /** Times the player killed this creature (combat victory). */
  defeats: number;
  /** Times this creature killed the player (recorded at death). */
  killedByCount: number;
  /** Timestamp of first encounter. Set once, never updated. */
  firstSeenAt: number;
  /** Timestamp of most recent encounter / defeat / killed-by. */
  lastSeenAt: number;
}

export type CreatureMastery = Record<string, CreatureMasteryEntry>;

/** A unique entry by creature name. Empty by default. */
export function emptyMastery(): CreatureMastery {
  return {};
}

// ── Pure record-update helpers ──────────────────────────────────────────────

function upsert(
  mastery: CreatureMastery | undefined,
  creature: string,
  patch: Partial<CreatureMasteryEntry>,
  now: number,
): CreatureMastery {
  const prev = mastery?.[creature];
  return {
    ...(mastery || {}),
    [creature]: {
      encounters: prev?.encounters ?? 0,
      defeats: prev?.defeats ?? 0,
      killedByCount: prev?.killedByCount ?? 0,
      firstSeenAt: prev?.firstSeenAt ?? now,
      lastSeenAt: now,
      ...patch,
    },
  };
}

export function recordEncounter(
  mastery: CreatureMastery | undefined,
  creature: string,
  now: number = Date.now(),
): CreatureMastery {
  const prev = mastery?.[creature];
  return upsert(mastery, creature, { encounters: (prev?.encounters ?? 0) + 1 }, now);
}

export function recordDefeat(
  mastery: CreatureMastery | undefined,
  creature: string,
  now: number = Date.now(),
  increment: number = 1,
): CreatureMastery {
  const prev = mastery?.[creature];
  return upsert(mastery, creature, { defeats: (prev?.defeats ?? 0) + increment }, now);
}

export function recordKilledBy(
  mastery: CreatureMastery | undefined,
  creature: string,
  now: number = Date.now(),
): CreatureMastery {
  const prev = mastery?.[creature];
  return upsert(mastery, creature, { killedByCount: (prev?.killedByCount ?? 0) + 1 }, now);
}

// ── Aggregate read view ─────────────────────────────────────────────────────

export interface MasteryAggregate {
  /** Creatures the player has fought at least once. */
  discoveredCount: number;
  /** Creatures the player has killed at least once. */
  masteredCount: number;
  /** Total creatures in the bestiary universe used for the calc. */
  totalCount: number;
  /** discoveredCount / totalCount; 0 when totalCount === 0. */
  discoveredPercent: number;
  /** masteredCount / totalCount; 0 when totalCount === 0. */
  masteredPercent: number;
}

export function computeAggregate(
  mastery: CreatureMastery | undefined,
  allCreatureNames: string[],
): MasteryAggregate {
  const total = allCreatureNames.length;
  if (total === 0) {
    return { discoveredCount: 0, masteredCount: 0, totalCount: 0, discoveredPercent: 0, masteredPercent: 0 };
  }
  let discovered = 0;
  let mastered = 0;
  for (const name of allCreatureNames) {
    const entry = mastery?.[name];
    if (!entry) continue;
    if (entry.encounters > 0) discovered++;
    if (entry.defeats > 0) mastered++;
  }
  return {
    discoveredCount: discovered,
    masteredCount: mastered,
    totalCount: total,
    discoveredPercent: discovered / total,
    masteredPercent: mastered / total,
  };
}

// ── Reward configuration ────────────────────────────────────────────────────

/** Tier of per-creature unlock. Templates render with `{name}` and `{slug}`. */
interface PerCreatureRule {
  defeats: number;
  type: 'title' | 'border';
  /** Title template — `{name}` is the creature's display name. */
  titleTemplate?: string;
  /** Border template — `{slug}` is the lowercase-kebab creature name. */
  borderTemplate?: string;
}

export const PER_CREATURE_RULES: PerCreatureRule[] = [
  { defeats: 5,  type: 'title',  titleTemplate: '{name} Slayer' },
  { defeats: 25, type: 'border', borderTemplate: '{slug}-themed' },
];

interface AggregateRule {
  /** Threshold in [0, 1]. */
  percent: number;
  scope: 'discovered' | 'mastered';
  type: 'title' | 'border';
  value: string;
  description: string;
}

export const AGGREGATE_RULES: AggregateRule[] = [
  { percent: 0.25, scope: 'discovered', type: 'title',  value: 'Apprentice Lorekeeper', description: 'Encounter 25% of the bestiary' },
  { percent: 0.50, scope: 'discovered', type: 'title',  value: 'Lorekeeper',            description: 'Encounter 50% of the bestiary' },
  { percent: 1.00, scope: 'discovered', type: 'title',  value: 'Master Lorekeeper',     description: 'Encounter every creature' },
  { percent: 1.00, scope: 'mastered',   type: 'border', value: 'bestiary-master',       description: 'Defeat every creature' },
];

// ── Unlock diff (called after each mastery write) ───────────────────────────

export interface MasteryUnlock {
  type: 'title' | 'border';
  value: string;
  description: string;
  /** What triggered it — for UI / logging. */
  trigger:
    | { kind: 'creature'; creature: string; defeats: number }
    | { kind: 'aggregate'; scope: 'discovered' | 'mastered'; percent: number };
}

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

/**
 * Compare prev and next mastery snapshots; return every cosmetic unlock that
 * was crossed in the transition. `allCreatureNames` is the universe for the
 * aggregate calculation — typically Object.keys(BESTIARY).
 */
export function getNewMasteryUnlocks(
  prev: CreatureMastery | undefined,
  next: CreatureMastery,
  allCreatureNames: string[],
): MasteryUnlock[] {
  const unlocks: MasteryUnlock[] = [];

  // Per-creature unlocks — walk every creature touched in either snapshot.
  const touched = new Set<string>([
    ...Object.keys(prev ?? {}),
    ...Object.keys(next),
  ]);
  for (const name of touched) {
    const prevDefeats = prev?.[name]?.defeats ?? 0;
    const nextDefeats = next[name]?.defeats ?? 0;
    if (nextDefeats <= prevDefeats) continue;
    for (const rule of PER_CREATURE_RULES) {
      if (prevDefeats < rule.defeats && nextDefeats >= rule.defeats) {
        if (rule.type === 'title' && rule.titleTemplate) {
          unlocks.push({
            type: 'title',
            value: rule.titleTemplate.replace('{name}', name),
            description: `Defeated ${rule.defeats} of ${name}`,
            trigger: { kind: 'creature', creature: name, defeats: rule.defeats },
          });
        } else if (rule.type === 'border' && rule.borderTemplate) {
          unlocks.push({
            type: 'border',
            value: rule.borderTemplate.replace('{slug}', slugify(name)),
            description: `Defeated ${rule.defeats} of ${name}`,
            trigger: { kind: 'creature', creature: name, defeats: rule.defeats },
          });
        }
      }
    }
  }

  // Aggregate unlocks — compute both snapshots' aggregates, diff against rules.
  const prevAgg = computeAggregate(prev, allCreatureNames);
  const nextAgg = computeAggregate(next, allCreatureNames);
  for (const rule of AGGREGATE_RULES) {
    const prevPct = rule.scope === 'discovered' ? prevAgg.discoveredPercent : prevAgg.masteredPercent;
    const nextPct = rule.scope === 'discovered' ? nextAgg.discoveredPercent : nextAgg.masteredPercent;
    if (prevPct < rule.percent && nextPct >= rule.percent) {
      unlocks.push({
        type: rule.type,
        value: rule.value,
        description: rule.description,
        trigger: { kind: 'aggregate', scope: rule.scope, percent: rule.percent },
      });
    }
  }

  return unlocks;
}
