/**
 * Signature-rule engine
 *
 * Pure, data-driven combat modifiers attached to specific creatures
 * (see `SignatureRule` on `CreatureInfo` in `content.ts`, wired by Task 9).
 * Every hook here is a pure function: it takes the current `CombatRuleState`
 * plus whatever combat inputs it needs, and returns a delta describing what
 * the combat screen (Task 10) should apply. Nothing here mutates its inputs,
 * touches React state, or reaches into GameContext/combat.tsx.
 *
 * Rules with no direct hook effect (e.g. `honor`'s "never ERRATIC" mood lock
 * and "bonus mastery on a flee-free win") are intentionally neutral through
 * every hook below — those behaviors are read directly off `CreatureInfo`
 * and the combat outcome by Task 9/10, not by this engine.
 */

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

export interface SignatureRule {
  id: SignatureRuleId;
  param?: { turn?: number; heal?: number; ramp?: number };
}

export interface CombatRuleState {
  turn: number;
  struckLastTurn: boolean;
  blinkUsed: boolean;
  reformUsed: boolean;
  chantStacks: number;
  pounceSpent: boolean;
}

export function initialRuleState(): CombatRuleState {
  return {
    turn: 1,
    struckLastTurn: false,
    blinkUsed: false,
    reformUsed: false,
    chantStacks: 0,
    pounceSpent: false,
  };
}

/** Crit chance added to the player's next Strike after a successful Bait. */
export const BAIT_COUNTER_BONUS = 0.15;

export interface BaitResult {
  forcedIntent: 'AGGRESSIVE';        // enemy commits next turn, intent revealed
  counterBonus: number;              // added to player's crit chance next strike (this fight turn)
  consumedSignature: boolean;        // one-shot signatures (blink/pounce) spent harmlessly
  state: CombatRuleState;
}

/**
 * Bait — provoke the creature's nature. The enemy's NEXT intent is forced to
 * AGGRESSIVE (and revealed via the normal intent display), and the player's
 * next Strike this fight gains `counterBonus` crit.
 *
 * Per-rule extras spend one-shot signatures harmlessly:
 *  - `blink` → the evade is burned (`blinkUsed`), so a later Strike lands clean;
 *  - `pounce` → the pounce is provoked NOW (`pounceSpent`), so a later item use
 *    no longer opens a free attack (see `itemUseTriggersAttack`).
 * `reform` and all death effects are untouched — Bait cannot pre-spend them.
 *
 * Bait is NOT a strike: `struckLastTurn` is left exactly as it was, so chant
 * ramps normally through a bait turn. Pure — never mutates `s`.
 */
export function onBait(rule: SignatureRule | undefined, s: CombatRuleState): BaitResult {
  let state: CombatRuleState = { ...s };
  let consumedSignature = false;

  if (rule?.id === 'blink' && !s.blinkUsed) {
    state = { ...state, blinkUsed: true };
    consumedSignature = true;
  } else if (rule?.id === 'pounce' && !s.pounceSpent) {
    state = { ...state, pounceSpent: true };
    consumedSignature = true;
  }

  return {
    forcedIntent: 'AGGRESSIVE',
    counterBonus: BAIT_COUNTER_BONUS,
    consumedSignature,
    state,
  };
}

/** Called when the player lands (or would land) a strike on the enemy. */
export function onPlayerStrike(
  rule: SignatureRule | undefined,
  s: CombatRuleState
): { evaded: boolean; state: CombatRuleState } {
  if (rule?.id === 'blink' && !s.blinkUsed) {
    return { evaded: true, state: { ...s, blinkUsed: true, struckLastTurn: false } };
  }
  return { evaded: false, state: { ...s, struckLastTurn: true } };
}

/** Called when the enemy's own attack lands on the player. */
export function onEnemyHitLanded(
  rule: SignatureRule | undefined,
  _s: CombatRuleState,
  _enemyMaxHp: number
): { healEnemy: number; staminaDrain: number } {
  const healEnemy = rule?.id === 'absorb' ? rule.param?.heal ?? 0 : 0;
  const staminaDrain = rule?.id === 'drain' ? 1 : 0;
  return { healEnemy, staminaDrain };
}

/** Called on the blow that would kill the enemy. */
export function onDeathBlow(
  rule: SignatureRule | undefined,
  s: CombatRuleState,
  opts: { lastActionWasDodgeCounter: boolean; playerHasVoidOrAsh: boolean; enemyMaxHp: number }
): { ruptureDamage: number; reformToHp: number } {
  let ruptureDamage = 0;
  let reformToHp = 0;

  if (rule?.id === 'rupture' && !opts.lastActionWasDodgeCounter) {
    ruptureDamage = Math.round(opts.enemyMaxHp * 0.2);
  }

  if (rule?.id === 'reform' && !s.reformUsed && !opts.playerHasVoidOrAsh) {
    reformToHp = Math.round(opts.enemyMaxHp * 0.5);
  }

  return { ruptureDamage, reformToHp };
}

/** Called at the end of each combat turn. */
export function onTurnEnd(
  rule: SignatureRule | undefined,
  s: CombatRuleState
): { addAttacker: boolean; chantBonusDamage: number; state: CombatRuleState } {
  const addAttacker = rule?.id === 'multiply' && s.turn >= (rule.param?.turn ?? Infinity);

  let chantBonusDamage = 0;
  let chantStacks = s.chantStacks;
  if (rule?.id === 'chant') {
    chantStacks = s.struckLastTurn ? 0 : s.chantStacks + 1;
    chantBonusDamage = chantStacks * (rule.param?.ramp ?? 0);
  }

  const state: CombatRuleState = {
    ...s,
    turn: s.turn + 1,
    struckLastTurn: false,
    chantStacks,
  };

  return { addAttacker, chantBonusDamage, state };
}

/** Whether the enemy blocks the player's flee attempt this turn. */
export function fleeBlocked(rule: SignatureRule | undefined, s: CombatRuleState): boolean {
  if (rule?.id === 'dormant') {
    return s.turn >= 2;
  }
  return false;
}

/**
 * Whether using an item in combat triggers this enemy's free attack.
 * `pounce` opens on item use — but only until the signature is spent (a Bait
 * provokes it early, setting `pounceSpent`), after which the opening is closed.
 */
export function itemUseTriggersAttack(rule: SignatureRule | undefined, s: CombatRuleState): boolean {
  return rule?.id === 'pounce' && !s.pounceSpent;
}

/**
 * `honor` creatures never roll ERRATIC intent. Wraps an already-rolled intent:
 * if it's `honor` and the roll came up ERRATIC, ask the caller to reroll
 * once (the caller supplies the reroll so this stays RNG-agnostic — combat.tsx
 * passes a closure over its seeded RNG). Any other rule/intent passes through
 * unchanged, and the reroll happens at most once (no retry loop) even if the
 * second roll is also ERRATIC, so combat.tsx's seeded RNG advances by a fixed,
 * deterministic amount.
 */
export function honorFilteredIntent<T extends { type: string }>(
  rule: SignatureRule | undefined,
  intent: T,
  reroll: () => T
): T {
  if (rule?.id === 'honor' && intent.type === 'ERRATIC') {
    return reroll();
  }
  return intent;
}
