/**
 * agent-combat.ts — web-only helpers for the agent REST API's combat.
 *
 * The agent API (`/api/agent/*`) resolves combat with the SAME rules as the
 * mobile game by calling the shared, mirrored modules (combat-math.ts,
 * zone-mechanics.ts, modifiers.ts). This file holds the glue the route needs
 * but the shared modules don't: game-settings snapshotting, zone-status
 * (de)serialisation, and combat-option assembly. It is pure and unit-tested —
 * the DB-backed route stays thin.
 */

import type { RunModifier } from './modifiers';
import type { ZoneMechanic, ZoneStatusState } from './zone-mechanics';
import { initZoneStatus, clarityDepleted } from './zone-mechanics';

/** Combat-relevant subset of the admin `gameSettings` entity. */
export interface CombatSettings {
  baseDamageMin: number;
  baseDamageMax: number;
  tier2Multiplier: number;
  tier3Multiplier: number;
  dodgeSuccessRate: number;
  braceReduction: number;
  criticalChance: number;
  criticalMultiplier: number;
  fleeChanceBase: number;
  fleeCleanRatio: number;
  staminaPool: number;
  staminaRegen: number;
  strikeCost: number;
  enemyCounterMultiplier: number;
  chargePunishment: number;
  intentCounterBonus: number;
  braceBaseDamageMin: number;
  braceBaseDamageMax: number;
  erraticDamageMax: number;
}

/** Defaults — kept in sync with mobile's DEFAULT_GAME_SETTINGS. */
export const DEFAULT_COMBAT_SETTINGS: CombatSettings = {
  baseDamageMin: 15,
  baseDamageMax: 25,
  tier2Multiplier: 1.5,
  tier3Multiplier: 2.0,
  dodgeSuccessRate: 0.65,
  braceReduction: 0.5,
  criticalChance: 0.15,
  criticalMultiplier: 1.75,
  fleeChanceBase: 0.5,
  fleeCleanRatio: 0.6,
  staminaPool: 4,
  staminaRegen: 1,
  strikeCost: 2,
  enemyCounterMultiplier: 0.85,
  chargePunishment: 2.0,
  intentCounterBonus: 1.5,
  braceBaseDamageMin: 6,
  braceBaseDamageMax: 12,
  erraticDamageMax: 1.3,
};

/**
 * Merge a raw `gameSettings` record (admin entity, or a session snapshot) over
 * the defaults, keeping only combat keys and ignoring non-numeric values.
 * Used at agent start to snapshot a consistent run, and per-action to read it.
 */
export function pickCombatSettings(raw: Record<string, unknown> | null | undefined): CombatSettings {
  const out: CombatSettings = { ...DEFAULT_COMBAT_SETTINGS };
  if (!raw) return out;
  for (const key of Object.keys(DEFAULT_COMBAT_SETTINGS) as (keyof CombatSettings)[]) {
    const v = raw[key];
    if (typeof v === 'number' && Number.isFinite(v)) out[key] = v;
  }
  return out;
}

/** Parse the combat settings snapshotted onto a session at agent start. */
export function readSessionSettings(session: { gameSettings?: string | null }): CombatSettings {
  if (!session.gameSettings) return { ...DEFAULT_COMBAT_SETTINGS };
  try {
    return pickCombatSettings(JSON.parse(session.gameSettings));
  } catch {
    return { ...DEFAULT_COMBAT_SETTINGS };
  }
}

/** Parse the run modifier snapshotted onto a session, or null if none. */
export function readSessionModifier(session: { runModifier?: string | null }): RunModifier | null {
  if (!session.runModifier) return null;
  try {
    return JSON.parse(session.runModifier) as RunModifier;
  } catch {
    return null;
  }
}

/**
 * Parse the run's zone-status off a session. Prefers the `zoneStatus` JSON
 * field; falls back to the legacy flat fields (burnStacks / chillStacks /
 * clarity) so a session created before this change still resolves cleanly.
 */
export function readSessionZoneStatus(session: {
  zoneStatus?: string | null;
  burnStacks?: number;
  chillStacks?: number;
  clarity?: number;
}): ZoneStatusState {
  if (session.zoneStatus) {
    try {
      const parsed = JSON.parse(session.zoneStatus) as Partial<ZoneStatusState>;
      return {
        burn: parsed.burn ?? 0,
        chill: parsed.chill ?? 0,
        infection: parsed.infection ?? 0,
        clarity: parsed.clarity ?? 3,
        infectionItemDropped: parsed.infectionItemDropped ?? false,
      };
    } catch {
      /* fall through to legacy fields */
    }
  }
  const fresh = initZoneStatus();
  return {
    ...fresh,
    burn: session.burnStacks ?? 0,
    chill: session.chillStacks ?? 0,
    clarity: session.clarity ?? fresh.clarity,
  };
}

/** Compact view of zone-status for the API response. */
export function statusSummary(zoneStatus: ZoneStatusState): {
  burn: number;
  chill: number;
  infection: number;
  clarity: number;
} {
  return {
    burn: zoneStatus.burn,
    chill: zoneStatus.chill,
    infection: zoneStatus.infection,
    clarity: zoneStatus.clarity,
  };
}

/** Stamina cost of a combat action — strike/brace are settings/modifier driven. */
export function actionStaminaCost(
  action: string,
  settings: CombatSettings,
  modifier: RunModifier | null,
): number {
  switch (action) {
    case 'strike':
      return settings.strikeCost;
    case 'brace':
      return modifier?.braceCost ?? 0;
    case 'dodge':
    case 'flee':
      return 1;
    default:
      // Item actions (herbs, flasks, shards) cost no stamina.
      return 0;
  }
}

/** Combat actions the agent action route accepts. */
export const COMBAT_ACTIONS = new Set([
  'strike', 'dodge', 'brace', 'flee',
  'herbs', 'ember_flask', 'frost_shard', 'thermal_flask', 'cleansing_salts', 'clarity_shard',
]);

/** A combat option exposed to the agent. */
export interface CombatOption {
  id: string;
  text: string;
  cost: number;
}

/** Item -> combat-option mapping. The option appears only if the item is held. */
const ITEM_OPTIONS: { name: string; id: string; text: string }[] = [
  { name: 'Herbs', id: 'herbs', text: '🌿 Herbs' },
  { name: 'Ember Flask', id: 'ember_flask', text: '🧪 Ember Flask' },
  { name: 'Frost Shard', id: 'frost_shard', text: '❄️ Frost Shard' },
  { name: 'Thermal Flask', id: 'thermal_flask', text: '🔥 Thermal Flask' },
  { name: 'Cleansing Salts', id: 'cleansing_salts', text: '🧂 Cleansing Salts' },
  { name: 'Clarity Shard', id: 'clarity_shard', text: '💎 Clarity Shard' },
];

const VOID_FAKE_OPTIONS: CombatOption[] = [
  { id: 'void_fake_1', text: 'Step toward the light.', cost: 0 },
  { id: 'void_fake_2', text: 'Accept the offer.', cost: 0 },
  { id: 'void_fake_3', text: 'Follow the sound back.', cost: 0 },
  { id: 'void_fake_4', text: 'Wait for the other one.', cost: 0 },
];

/**
 * Build the combat options for the current turn: the three core actions,
 * any item actions the player can take, then Flee. When the player has lost
 * all clarity in a FLUX zone, one fake option slips into the list.
 */
export function buildCombatOptions(
  inventory: { name: string }[],
  settings: CombatSettings,
  modifier: RunModifier | null,
  mechanic: ZoneMechanic,
  zoneStatus: ZoneStatusState,
): CombatOption[] {
  const options: CombatOption[] = [
    { id: 'strike', text: '⚔️ Strike', cost: settings.strikeCost },
    { id: 'dodge', text: '💨 Dodge', cost: 1 },
    { id: 'brace', text: '🛡️ Brace', cost: modifier?.braceCost ?? 0 },
  ];
  for (const item of ITEM_OPTIONS) {
    if (inventory.some(i => i.name === item.name)) {
      options.push({ id: item.id, text: item.text, cost: 0 });
    }
  }
  options.push({ id: 'flee', text: '🏃 Flee', cost: 1 });

  if (clarityDepleted(mechanic, zoneStatus)) {
    options.push(VOID_FAKE_OPTIONS[Math.floor(Math.random() * VOID_FAKE_OPTIONS.length)]);
  }
  return options;
}
