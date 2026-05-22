/**
 * zone-mechanics.ts — per-zone combat status-effect rules.
 *
 * Each zone declares a mechanic in its JSON meta (BURN / CHILL / INFECTION /
 * FLUX). This module is the single, pure, unit-tested source of truth for how
 * those mechanics behave — no React, no I/O. Combat and exploration screens
 * call into it; the run carries ZoneStatusState in GameContext.
 */

import type { SeededRng } from './seeded-random';
import { loadZone } from './zone-loader';

export type ZoneMechanic = 'BURN' | 'CHILL' | 'INFECTION' | 'FLUX' | 'NONE';

/** Per-run status state — persists across rooms (lives in GameState). */
export interface ZoneStatusState {
  burn: number;
  chill: number;
  infection: number;
  clarity: number;
  /** The infection "lose an item at 3 stacks" effect fires only once per run. */
  infectionItemDropped: boolean;
}

// ── Tunables — match each zone's mechanicDescription ──────────────────────────
export const BURN_CAP = 5;
export const BURN_DAMAGE_PER_STACK = 3;
export const CHILL_CAP = 3;
export const INFECTION_CAP = 8;
export const INFECTION_ITEM_THRESHOLD = 3;
export const INFECTION_DAMAGE_THRESHOLD = 5;
export const INFECTION_DAMAGE_PENALTY = 0.3;
export const CLARITY_MAX = 3;
export const FLUX_CHANCE = 0.3;

/** Creatures the Frost Shard cannot freeze (native to the cold). */
const FREEZE_IMMUNE = new Set(['Ice Wraiths', 'Frost Sentinels', 'The Glacial Sovereign']);

/** Fresh status state for the start of a run. */
export function initZoneStatus(): ZoneStatusState {
  return { burn: 0, chill: 0, infection: 0, clarity: CLARITY_MAX, infectionItemDropped: false };
}

/** The mechanic for a zone, read from its JSON meta. NONE if unknown / unset. */
export function getZoneMechanic(zoneId: string): ZoneMechanic {
  try {
    const mech = (loadZone(zoneId).meta.mechanic ?? '').toUpperCase();
    if (mech === 'BURN' || mech === 'CHILL' || mech === 'INFECTION' || mech === 'FLUX') {
      return mech;
    }
  } catch {
    /* unknown zone — fall through to NONE */
  }
  return 'NONE';
}

/**
 * An enemy hit landed on the player — apply this zone's on-hit status.
 *  - braceNegated: the hit was fully absorbed by Brace; no status is applied.
 *  - dampenBurn: the player carries an Ash Veil; incoming burn is capped to 1.
 */
export function applyStatusOnHit(
  mechanic: ZoneMechanic,
  state: ZoneStatusState,
  isBoss: boolean,
  braceNegated: boolean,
  dampenBurn = false,
): ZoneStatusState {
  if (braceNegated) return state;
  const amount = isBoss ? 2 : 1;
  switch (mechanic) {
    case 'BURN':
      return { ...state, burn: Math.min(BURN_CAP, state.burn + (dampenBurn ? 1 : amount)) };
    case 'CHILL':
      return { ...state, chill: Math.min(CHILL_CAP, state.chill + amount) };
    case 'INFECTION':
      return { ...state, infection: Math.min(INFECTION_CAP, state.infection + amount) };
    case 'FLUX':
      return { ...state, clarity: Math.max(0, state.clarity - amount) };
    default:
      return state;
  }
}

/**
 * Start-of-turn resolution — runs at the start of every combat turn and on
 * every room advance. BURN deals damage then decays; CHILL decays; INFECTION
 * accumulates (no tick); FLUX has no tick.
 */
export function resolveTurnStart(
  mechanic: ZoneMechanic,
  state: ZoneStatusState,
): { state: ZoneStatusState; damage: number; narrative: string } {
  if (mechanic === 'BURN' && state.burn > 0) {
    const damage = state.burn * BURN_DAMAGE_PER_STACK;
    const burn = state.burn - 1;
    const narrative = burn === 0
      ? `The burns bite for ${damage} — then the last ember fades.`
      : `The burns bite — ${damage} damage. (${burn} stack${burn === 1 ? '' : 's'} left.)`;
    return { state: { ...state, burn }, damage, narrative };
  }
  if (mechanic === 'CHILL' && state.chill > 0) {
    const chill = state.chill - 1;
    return {
      state: { ...state, chill },
      damage: 0,
      narrative: chill === 0 ? 'The cold finally loosens its grip.' : 'The cold loosens, a little.',
    };
  }
  return { state, damage: 0, narrative: '' };
}

/** CHILL freezes stamina regeneration while any stacks remain. */
export function isStaminaRegenBlocked(mechanic: ZoneMechanic, state: ZoneStatusState): boolean {
  return mechanic === 'CHILL' && state.chill > 0;
}

/** Player damage multiplier — INFECTION saps damage at high stacks. */
export function infectionDamageMultiplier(state: ZoneStatusState): number {
  return state.infection >= INFECTION_DAMAGE_THRESHOLD ? 1 - INFECTION_DAMAGE_PENALTY : 1;
}

/** True once infection has reached the item-loss threshold and has not yet fired. */
export function infectionShouldDropItem(state: ZoneStatusState): boolean {
  return state.infection >= INFECTION_ITEM_THRESHOLD && !state.infectionItemDropped;
}

/** A creature the Frost Shard cannot freeze. */
export function isFreezeImmune(creatureName: string): boolean {
  return FREEZE_IMMUNE.has(creatureName);
}

/** FLUX — whether the enemy's intent silently rerolls this turn. */
export function rollFlux(rng: SeededRng | null): boolean {
  return (rng ? rng.random() : Math.random()) < FLUX_CHANCE;
}

/** FLUX — the player has lost all clarity; fake options should appear. */
export function clarityDepleted(mechanic: ZoneMechanic, state: ZoneStatusState): boolean {
  return mechanic === 'FLUX' && state.clarity <= 0;
}

/** Clear a stacking status to zero — cure items (Ember Flask / Thermal Flask / Cleansing Salts). */
export function clearStatus(
  state: ZoneStatusState,
  which: 'burn' | 'chill' | 'infection',
): ZoneStatusState {
  return { ...state, [which]: 0 };
}

/** Restore one point of clarity (Clarity Shard). */
export function restoreClarity(state: ZoneStatusState): ZoneStatusState {
  return { ...state, clarity: Math.min(CLARITY_MAX, state.clarity + 1) };
}
