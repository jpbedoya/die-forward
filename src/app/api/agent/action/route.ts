import { NextRequest, NextResponse } from 'next/server';
import { init, tx, id } from '@instantdb/admin';
import {
  getStrikeNarration,
  getDodgeNarration,
  getBraceNarration,
  getFleeNarration,
  getCreatureIntent,
  getCreatureTier,
  getIntentEffects,
  getItemEffects,
} from '@/lib/content';
import { calculateCombatDamage, computeHealAmount, deathSaveOutcome } from '@/lib/combat-math';
import {
  getZoneMechanic,
  resolveTurnStart,
  applyStatusOnHit,
  isStaminaRegenBlocked,
  infectionDamageMultiplier,
  infectionShouldDropItem,
  isFreezeImmune,
  rollFlux,
  clearStatus,
  restoreClarity,
  type ZoneStatusState,
  type ZoneMechanic,
} from '@/lib/zone-mechanics';
import type { RunModifier } from '@/lib/modifiers';
import {
  readSessionSettings,
  readSessionModifier,
  readSessionZoneStatus,
  statusSummary,
  actionStaminaCost,
  buildCombatOptions,
  COMBAT_ACTIONS,
  type CombatSettings,
} from '@/lib/agent-combat';
import { processVictoryPayout, processDirectPayout } from '@/lib/onchain';
import { buildRunReceipt } from '@/lib/coins';

const db = init({
  appId: process.env.NEXT_PUBLIC_INSTANT_APP_ID!,
  adminToken: process.env.INSTANT_ADMIN_KEY!,
});

type IntentType = 'AGGRESSIVE' | 'DEFENSIVE' | 'CHARGING' | 'ERRATIC' | 'HUNTING' | 'STALKING' | 'RETREATING';

// The agent flow is a stateless REST handler — Math.random is the RNG source.
// Seeded determinism (as on mobile) is deliberately out of scope here.
const rollRange = (min: number, max: number) => min + Math.floor(Math.random() * (max - min + 1));
const rollChance = (p: number) => Math.random() < p;

/** Compact run-modifier view for the API response. */
function modifierSummary(modifier: RunModifier | null) {
  if (!modifier) return null;
  return {
    id: modifier.id,
    name: modifier.name,
    emoji: modifier.emoji,
    description: modifier.description,
  };
}

/**
 * Build the `enemy` block for a response. `isFresh` is true the first time an
 * enemy is presented — when the Blind Descent modifier hides the first intent.
 */
function buildEnemy(
  enemyName: string,
  enemyHealth: number,
  enemyMaxHealth: number,
  intent: IntentType,
  tier: number,
  wasCharging: boolean,
  modifier: RunModifier | null,
  isFresh: boolean,
) {
  return {
    name: enemyName,
    health: enemyHealth,
    maxHealth: enemyMaxHealth,
    intent: modifier?.hideFirstIntent && isFresh ? 'UNKNOWN' : intent,
    tier,
    wasCharging,
  };
}

// ── VICTORY HELPER ────────────────────────────────────────────────────────────
// Shared handler for both combat and exploration victories.
// Set includeHealthAndRoom=true (explore path) to persist health and currentRoom.
async function processVictory(
  sessionId: string,
  session: any,
  health: number,
  currentRoom: number,
  zoneStatus: ZoneStatusState,
  visitedRoomsAfter: string[],
  options: { includeHealthAndRoom?: boolean } = {}
): Promise<NextResponse> {
  let payoutResult = null;

  if (session.stakeAmount > 0 && session.walletAddress) {
    try {
      if (session.useEscrow && session.escrowSessionId) {
        const sig = await processVictoryPayout(session.walletAddress, session.escrowSessionId);
        payoutResult = sig ? { status: 'paid', tx: sig } : { status: 'escrow_failed' };
      } else {
        const sig = await processDirectPayout(session.walletAddress, session.stakeAmount);
        payoutResult = sig ? { status: 'paid', tx: sig } : { status: 'pool_payout_failed' };
      }
    } catch (e) {
      console.error('Victory payout failed:', e);
      payoutResult = { status: 'failed', error: String(e) };
    }
  }

  const dbUpdate: Record<string, any> = {
    status: 'victory',
    endedAt: Date.now(),
    payoutStatus: payoutResult?.status || 'free_mode',
    payoutTx: payoutResult?.tx || null,
    enemyFrozen: false,
    zoneStatus: JSON.stringify(zoneStatus),
    burnStacks: 0,
    chillStacks: 0,
    clarity: zoneStatus.clarity,
    visitedRooms: JSON.stringify(visitedRoomsAfter),
    fluxActive: false,
  };

  if (options.includeHealthAndRoom) {
    dbUpdate.health = health;
    dbUpdate.currentRoom = currentRoom;
  }

  const runReceiptId = id();
  // No coin/streak grant for agent runs: agent sessions have no Player identity to credit. Receipt only. See phase 3b plan Task 8.
  await db.transact([
    tx.sessions[sessionId].update(dbUpdate),
    tx.runReceipts[runReceiptId].update(
      { ...buildRunReceipt({
        sessionId,
        // Agent sessions have no session token (looked up by id, not token) — reuse
        // the session id so the receipt still has a stable, non-null identifier.
        sessionToken: sessionId,
        authId: null,
        walletAddress: session.walletAddress ?? null,
        zoneId: session.zoneId ?? null,
        runSeed: session.seed ?? null,
        seedSource: session.seedSource ?? null,
        serverDayKey: session.serverDayKey ?? null,
        dailyShiftEnabled: null,
        chosenModifierId: null,
        stakeMode: session.stakeMode ?? 'free',
        coinStake: 0,
        outcome: 'cleared',
        finalDepth: currentRoom - 1,
        coinDelta: 0,
        streakAfter: 0,
        createdAt: Date.now(),
      }) },
    ),
  ]);

  return NextResponse.json({
    state: {
      phase: 'victory',
      room: currentRoom - 1,
      totalRooms: session.totalRooms,
      health,
      narrative: 'Light breaks through. You have conquered the crypt.',
    },
    result: {
      type: 'victory',
      narrative: 'You emerge victorious!',
      payout: payoutResult,
    },
  });
}

// ── NEXT-ROOM HELPER ──────────────────────────────────────────────────────────
// Presents the room the player has just advanced into — after defeating an
// enemy, fleeing, or an exploration advance. Handles void echo rooms, cache
// clarity restore, fresh-enemy setup, persistence, and the response.
interface NextRoomParams {
  sessionId: string;
  session: any;
  dungeon: any[];
  currentRoom: number; // already incremented; guaranteed <= totalRooms
  health: number;
  stamina: number;
  maxHealth: number;
  inventory: { id?: string; name: string; emoji?: string }[];
  zoneStatus: ZoneStatusState;
  modifier: RunModifier | null;
  mechanic: ZoneMechanic;
  zoneId: string;
  visitedRooms: string[];
  prefixNarrative: string;
  resultType: string;
  resultExtra?: Record<string, any>;
}

async function presentNextRoom(p: NextRoomParams): Promise<NextResponse> {
  const nextRoom = p.dungeon[p.currentRoom - 1];
  let zoneStatus = p.zoneStatus;
  let visitedRooms = p.visitedRooms;

  // Void echo rooms — a 20% chance the room feels like one already seen.
  let echoPrefix = '';
  if (p.mechanic === 'FLUX' && visitedRooms.length > 0 && rollChance(0.2)) {
    echoPrefix = 'You have been here. Or somewhere like here. The differences are subtle. ';
  }
  if (nextRoom && !visitedRooms.includes(nextRoom.type)) {
    visitedRooms = [...visitedRooms, nextRoom.type];
  }

  // Cache rooms steady the mind in the Void.
  if (nextRoom?.type === 'cache' && p.mechanic === 'FLUX') {
    zoneStatus = restoreClarity(zoneStatus);
  }

  const isCombat = nextRoom?.type === 'combat';
  let enemyHealth = 0;
  let enemyIntent: IntentType = 'AGGRESSIVE';
  let enemyName = '';
  let enemyTier = 1;
  if (isCombat) {
    enemyName = nextRoom.enemy?.name || 'Unknown Horror';
    enemyHealth = rollRange(80, 119);
    enemyIntent = getCreatureIntent(enemyName, p.zoneId).type;
    enemyTier = getCreatureTier(enemyName, p.zoneId);
  }

  await db.transact([
    tx.sessions[p.sessionId].update({
      health: p.health,
      stamina: p.stamina,
      currentRoom: p.currentRoom,
      enemyHealth,
      enemyIntent,
      wasCharging: false,
      enemyFrozen: false,
      currentEnemy: enemyName || null,
      inventory: JSON.stringify(p.inventory),
      zoneStatus: JSON.stringify(zoneStatus),
      burnStacks: zoneStatus.burn,
      chillStacks: zoneStatus.chill,
      clarity: zoneStatus.clarity,
      visitedRooms: JSON.stringify(visitedRooms),
      fluxActive: false,
    }),
  ]);

  const baseNarrative = nextRoom?.content?.narrative || 'You proceed deeper.';
  const narrative = `${p.prefixNarrative}${p.prefixNarrative ? ' ' : ''}${echoPrefix}${baseNarrative}`.trim();

  const options = isCombat
    ? buildCombatOptions(p.inventory, readSessionSettings(p.session), p.modifier, p.mechanic, zoneStatus)
    : nextRoom?.content?.options?.map((opt: string, i: number) => ({ id: String(i + 1), text: opt }))
      || [{ id: '1', text: 'Continue' }];

  return NextResponse.json({
    state: {
      phase: isCombat ? 'combat' : 'explore',
      room: p.currentRoom,
      totalRooms: p.session.totalRooms,
      health: p.health,
      maxHealth: p.maxHealth,
      stamina: p.stamina,
      inventory: p.inventory.map(i => i.name),
      narrative,
      options,
      status: statusSummary(zoneStatus),
      modifier: modifierSummary(p.modifier),
      enemy: isCombat
        ? buildEnemy(enemyName, enemyHealth, enemyHealth, enemyIntent, enemyTier, false, p.modifier, true)
        : null,
    },
    result: { type: p.resultType, narrative, ...(p.resultExtra || {}) },
  });
}

// AUTH CONTRACT (INTENTIONALLY UNCHANGED — external harness dependency):
// This route is keyed off the raw `sessionId` (a Session row id), NOT the
// unguessable secret session token that /api/session/* uses. A row id is a
// weaker gate (guessable/enumerable relative to a 256-bit token). It is left
// as-is on purpose: this endpoint is driven by an EXTERNAL agent harness this
// repo does not control, so adding a token/auth requirement would break it.
// Residual risk is bounded to GRIEF ONLY: agent runs grant no coins and no
// player stats (see phase 3b Task 8 — receipt-only, authId:null, coinDelta:0),
// so a leaked/guessed sessionId can perturb an agent run but cannot move money
// or corrupt a real player's record. Accepted residual documented in Task 6.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, action, finalMessage } = body;

    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId is required' }, { status: 400 });
    }

    const { sessions } = await db.query({
      sessions: {
        $: { where: { id: sessionId }, limit: 1 },
      },
    });

    if (!sessions || sessions.length === 0) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    const session = sessions[0] as any;

    // Allow 'dying' status for submit_death action
    if (session.status !== 'active' && !(session.status === 'dying' && action === 'submit_death')) {
      return NextResponse.json({ error: 'Session is not active' }, { status: 400 });
    }

    const dungeon = JSON.parse(session.dungeon || '[]');
    const inventory = JSON.parse(session.inventory || '[]') as { id?: string; name: string; emoji?: string }[];
    let health = session.health;
    let stamina = session.stamina;
    let currentRoom = session.currentRoom;
    let enemyHealth = session.enemyHealth || 0;
    let enemyIntent = (session.enemyIntent || 'AGGRESSIVE') as IntentType;
    let wasCharging = session.wasCharging || false;
    const maxHealth = session.maxHealth || 100;

    // ── Shared run state: settings snapshot, run modifier, zone mechanic ──────
    const settings: CombatSettings = readSessionSettings(session);
    const modifier: RunModifier | null = readSessionModifier(session);
    const zoneId: string = session.zoneId || 'sunken-crypt';
    const mechanic: ZoneMechanic = getZoneMechanic(zoneId);
    let zoneStatus: ZoneStatusState = readSessionZoneStatus(session);
    let visitedRooms: string[] = JSON.parse(session.visitedRooms || '[]');

    const room = dungeon[currentRoom - 1];

    // ── DEATH SUBMISSION ─────────────────────────────────────────────────────
    if (action === 'submit_death') {
      const deathId = id();
      const corpseId = id();
      const runReceiptId = id();
      const message = (finalMessage || 'An agent fell here.').slice(0, 50);

      // No coin/streak grant for agent runs: agent sessions have no Player identity to credit. Receipt only. See phase 3b plan Task 8.
      await db.transact([
        tx.deaths[deathId].update({
          walletAddress: session.walletAddress,
          playerName: session.playerName,
          // Corpse discovery queries by zone id — store the id, not the display name
          zone: zoneId,
          room: currentRoom,
          stakeAmount: 0,
          finalMessage: message,
          killedBy: session.currentEnemy || 'Unknown',
          finalRoom: currentRoom,
          inventory: session.inventory,
          isAgent: true,
          agentName: session.agentName,
          createdAt: Date.now(),
        }),
        tx.corpses[corpseId].update({
          deathId,
          zone: zoneId,
          room: currentRoom,
          playerName: session.playerName,
          walletAddress: session.walletAddress,
          finalMessage: message,
          killedBy: session.currentEnemy || 'Unknown',
          loot: inventory[0]?.name || 'Nothing',
          lootEmoji: inventory[0]?.emoji || '💀',
          discovered: false,
          tipped: false,
          tipAmount: 0,
          isAgent: true,
          createdAt: Date.now(),
        }),
        tx.sessions[sessionId].update({
          status: 'dead',
          endedAt: Date.now(),
          finalRoom: currentRoom,
        }),
        tx.runReceipts[runReceiptId].update(
          { ...buildRunReceipt({
            sessionId,
            // Agent sessions have no session token (looked up by id, not token) — reuse
            // the session id so the receipt still has a stable, non-null identifier.
            sessionToken: sessionId,
            authId: null,
            walletAddress: session.walletAddress ?? null,
            zoneId: session.zoneId ?? null,
            runSeed: session.seed ?? null,
            seedSource: session.seedSource ?? null,
            serverDayKey: session.serverDayKey ?? null,
            dailyShiftEnabled: null,
            chosenModifierId: null,
            stakeMode: session.stakeMode ?? 'free',
            coinStake: 0,
            outcome: 'dead',
            finalDepth: currentRoom,
            coinDelta: 0,
            streakAfter: 0,
            createdAt: Date.now(),
          }) },
        ),
      ]);

      return NextResponse.json({
        state: {
          phase: 'dead',
          room: currentRoom,
          totalRooms: session.totalRooms,
          health: 0,
          narrative: `Your corpse now rests in ${session.zone}. Others will find you.`,
        },
        result: {
          type: 'death_recorded',
          narrative: 'Your final words have been etched into stone.',
          deathId,
          corpseId,
        },
      });
    }

    // ── VOID FAKE OPTIONS — no-op turn with a confusion narrative ─────────────
    if (action === 'void_fake_1' || action === 'void_fake_2' || action === 'void_fake_3' || action === 'void_fake_4') {
      const isCombatPhase = room?.type === 'combat' && enemyHealth > 0;
      const enemyName = room?.enemy?.name || 'enemy';
      return NextResponse.json({
        state: {
          phase: isCombatPhase ? 'combat' : 'explore',
          room: currentRoom,
          totalRooms: session.totalRooms,
          health,
          maxHealth,
          stamina,
          inventory: inventory.map(i => i.name),
          narrative: 'That was not an option. Or it was. You are no longer sure.',
          status: statusSummary(zoneStatus),
          modifier: modifierSummary(modifier),
          options: isCombatPhase
            ? buildCombatOptions(inventory, settings, modifier, mechanic, zoneStatus)
            : room?.content?.options?.map((opt: string, i: number) => ({ id: String(i + 1), text: opt }))
              || [{ id: '1', text: 'Continue' }],
          enemy: isCombatPhase
            ? buildEnemy(enemyName, enemyHealth, room.enemy?.maxHealth || 100, enemyIntent,
                getCreatureTier(enemyName, zoneId), wasCharging, modifier, false)
            : null,
        },
        result: { type: 'void_confusion', narrative: 'That was not an option. Or it was. You are no longer sure.' },
      });
    }

    // ── START-OF-TURN ZONE TICK — burn damage, chill decay ───────────────────
    // Computed here; only persisted once the action actually resolves.
    const tick = resolveTurnStart(mechanic, zoneStatus);
    zoneStatus = tick.state;
    const tickDamage = tick.damage;
    const tickNarrative = tick.narrative;

    // ── COMBAT ───────────────────────────────────────────────────────────────
    if (room?.type === 'combat' && enemyHealth > 0) {
      if (!COMBAT_ACTIONS.has(action)) {
        return NextResponse.json({ error: 'Invalid combat action' }, { status: 400 });
      }

      const enemyName: string = room.enemy?.name || 'Unknown Horror';
      const tier = getCreatureTier(enemyName, zoneId);
      const isBoss = tier === 3;
      const wasFrozen: boolean = session.enemyFrozen || false;
      let enemyFrozenAfter = false;

      // Void FLUX — the enemy's intent may silently reroll before resolution.
      let fluxTriggered = false;
      if (mechanic === 'FLUX' && rollFlux(null)) {
        const rerolled = getCreatureIntent(enemyName, zoneId).type;
        if (rerolled !== enemyIntent) {
          enemyIntent = rerolled;
          fluxTriggered = true;
        }
      }

      const intentEffects = getIntentEffects(enemyIntent);
      const itemEffects = getItemEffects(inventory);
      const hasAshVeil = inventory.some(i => i.name === 'Ash Veil');

      // Item actions require the item; reject cleanly without consuming a turn.
      const ITEM_REQUIRED: Record<string, string> = {
        herbs: 'Herbs',
        ember_flask: 'Ember Flask',
        frost_shard: 'Frost Shard',
        thermal_flask: 'Thermal Flask',
        cleansing_salts: 'Cleansing Salts',
        clarity_shard: 'Clarity Shard',
      };
      const requiredItem = ITEM_REQUIRED[action];
      if (requiredItem && !inventory.some(i => i.name === requiredItem)) {
        return NextResponse.json({
          state: {
            phase: 'combat',
            room: currentRoom,
            totalRooms: session.totalRooms,
            health, maxHealth, stamina,
            inventory: inventory.map(i => i.name),
            narrative: `You have no ${requiredItem}.`,
            status: statusSummary(readSessionZoneStatus(session)),
            modifier: modifierSummary(modifier),
            options: buildCombatOptions(inventory, settings, modifier, mechanic, readSessionZoneStatus(session)),
            enemy: buildEnemy(enemyName, enemyHealth, room.enemy?.maxHealth || 100, enemyIntent, tier, wasCharging, modifier, false),
          },
          result: { type: 'invalid', narrative: `You have no ${requiredItem}.` },
        });
      }

      // Per-action stamina gating — reject if the player cannot afford it.
      const cost = actionStaminaCost(action, settings, modifier);
      if (cost > stamina) {
        return NextResponse.json({
          state: {
            phase: 'combat',
            room: currentRoom,
            totalRooms: session.totalRooms,
            health, maxHealth, stamina,
            inventory: inventory.map(i => i.name),
            narrative: `Not enough stamina — ${action} costs ${cost}, you have ${stamina}.`,
            status: statusSummary(readSessionZoneStatus(session)),
            modifier: modifierSummary(modifier),
            options: buildCombatOptions(inventory, settings, modifier, mechanic, readSessionZoneStatus(session)),
            enemy: buildEnemy(enemyName, enemyHealth, room.enemy?.maxHealth || 100, enemyIntent, tier, wasCharging, modifier, false),
          },
          result: { type: 'insufficient_stamina', narrative: 'Not enough stamina.' },
        });
      }
      stamina -= cost;

      // Damage resolver — the SAME math the mobile game uses (combat-math.ts).
      const calcDmg = (base: number, isPlayerAttacking: boolean) =>
        calculateCombatDamage({
          base,
          isPlayerAttacking,
          tier,
          enemyIsErratic: enemyIntent === 'ERRATIC',
          intentDamageDealtMod: intentEffects.damageDealtMod,
          intentDamageTakenMod: intentEffects.damageTakenMod,
          itemDamageBonus: itemEffects.damageBonus,
          itemDefenseBonus: itemEffects.defenseBonus,
          modifierDamageBonus: modifier?.damageBonus ?? 0,
          wasCharging,
          settings,
        });

      let playerDmg = 0;      // damage dealt TO the player this turn
      let enemyDmg = 0;       // damage dealt TO the enemy this turn
      let healBase = 0;       // pre-modifier heal from Herbs
      let fleeSuccess = false;
      let actionNarrative = '';
      const consumed: string[] = [];

      switch (action) {
        case 'strike': {
          const basePlayerHit = rollRange(settings.baseDamageMin, settings.baseDamageMax);
          const baseEnemyHit = Math.floor(rollRange(settings.baseDamageMin, settings.baseDamageMax) * settings.enemyCounterMultiplier);
          playerDmg = calcDmg(baseEnemyHit, false);
          const strikeIntentBonus = (enemyIntent === 'AGGRESSIVE' || enemyIntent === 'HUNTING')
            ? settings.intentCounterBonus : 1.0;
          enemyDmg = Math.round(calcDmg(basePlayerHit, true) * strikeIntentBonus);
          if (rollChance(settings.criticalChance)) {
            enemyDmg = Math.round(enemyDmg * settings.criticalMultiplier);
            actionNarrative = getStrikeNarration('success');
          } else {
            actionNarrative = getStrikeNarration('mutual');
          }
          break;
        }
        case 'dodge': {
          if (rollChance(settings.dodgeSuccessRate)) {
            playerDmg = 0;
            if (wasCharging) {
              enemyDmg = Math.round(rollRange(8, 14) * settings.intentCounterBonus);
            }
            actionNarrative = getDodgeNarration('success');
          } else {
            playerDmg = calcDmg(rollRange(5, 9), false);
            actionNarrative = getDodgeNarration('close');
          }
          break;
        }
        case 'brace': {
          const baseDmg = rollRange(settings.braceBaseDamageMin, settings.braceBaseDamageMax);
          playerDmg = modifier?.braceNegatesAll
            ? 0
            : Math.round(calcDmg(baseDmg, false) * (1 - settings.braceReduction));
          actionNarrative = getBraceNarration('success');
          break;
        }
        case 'flee': {
          const fleeChance = Math.min(0.9, Math.max(0.1,
            settings.fleeChanceBase + intentEffects.fleeMod + itemEffects.fleeBonus));
          const roll = Math.random();
          if (roll < fleeChance * settings.fleeCleanRatio) {
            fleeSuccess = true;
            actionNarrative = getFleeNarration('success');
          } else if (roll < fleeChance) {
            fleeSuccess = true;
            playerDmg = calcDmg(rollRange(5, 12), false);
            actionNarrative = getFleeNarration('hurt');
          } else {
            playerDmg = calcDmg(rollRange(8, 19), false);
            actionNarrative = getFleeNarration('fail');
          }
          break;
        }
        // ── Item actions — the enemy still strikes while the item is used ─────
        case 'herbs': {
          healBase = rollRange(25, 40);
          consumed.push('Herbs');
          playerDmg = calcDmg(rollRange(settings.baseDamageMin, settings.baseDamageMax), false);
          actionNarrative = 'The herbs burn going down, but warmth spreads through you as wounds close.';
          break;
        }
        case 'ember_flask': {
          zoneStatus = clearStatus(zoneStatus, 'burn');
          consumed.push('Ember Flask');
          playerDmg = calcDmg(rollRange(settings.baseDamageMin, settings.baseDamageMax), false);
          actionNarrative = 'The flask drinks the heat. The burning stops.';
          break;
        }
        case 'thermal_flask': {
          zoneStatus = clearStatus(zoneStatus, 'chill');
          consumed.push('Thermal Flask');
          playerDmg = calcDmg(rollRange(settings.baseDamageMin, settings.baseDamageMax), false);
          actionNarrative = 'Warmth floods back. The cold retreats.';
          break;
        }
        case 'cleansing_salts': {
          zoneStatus = clearStatus(zoneStatus, 'infection');
          consumed.push('Cleansing Salts');
          playerDmg = calcDmg(rollRange(settings.baseDamageMin, settings.baseDamageMax), false);
          actionNarrative = 'The salts draw the rot out through the skin. It is not painless.';
          break;
        }
        case 'clarity_shard': {
          zoneStatus = restoreClarity(zoneStatus);
          consumed.push('Clarity Shard');
          playerDmg = calcDmg(rollRange(settings.baseDamageMin, settings.baseDamageMax), false);
          actionNarrative = 'The shard steadies your mind. Reality settles, briefly.';
          break;
        }
        case 'frost_shard': {
          consumed.push('Frost Shard');
          playerDmg = calcDmg(rollRange(settings.baseDamageMin, settings.baseDamageMax), false);
          if (isFreezeImmune(enemyName)) {
            actionNarrative = `The cold finds no purchase — ${enemyName} does not feel it.`;
          } else {
            enemyFrozenAfter = true;
            actionNarrative = `The shard shatters against ${enemyName}. It seizes, locked in ice.`;
          }
          break;
        }
      }

      // Consume any used items.
      for (const itemName of consumed) {
        const idx = inventory.findIndex(i => i.name === itemName);
        if (idx >= 0) inventory.splice(idx, 1);
      }

      // ── Zone status — infection saps damage; a frozen enemy cannot strike ──
      enemyDmg = Math.round(enemyDmg * infectionDamageMultiplier(zoneStatus));
      if (wasFrozen && playerDmg > 0) {
        playerDmg = 0;
        actionNarrative += ` ${enemyName} strains against the ice — it cannot strike.`;
      }
      // An enemy hit that lands applies this zone's on-hit status.
      if (playerDmg > 0) {
        zoneStatus = applyStatusOnHit(mechanic, zoneStatus, isBoss, false, hasAshVeil);
        if (infectionShouldDropItem(zoneStatus) && inventory.length > 0) {
          const victim = inventory.splice(Math.floor(Math.random() * inventory.length), 1)[0];
          zoneStatus = { ...zoneStatus, infectionItemDropped: true };
          actionNarrative += ` The infection spreads — your ${victim.name} rots away.`;
        }
      }

      // ── Apply damage (action + start-of-turn tick) and healing ────────────
      const totalPlayerDmg = playerDmg + tickDamage;
      enemyHealth = Math.max(0, enemyHealth - enemyDmg);
      let healthAfterHeal = health;
      if (healBase > 0) {
        healthAfterHeal = computeHealAmount(healBase, modifier, health).newHealth;
      }
      health = Math.max(0, healthAfterHeal - totalPlayerDmg);

      // Assemble the turn narrative — tick + flux prefixes, then the action.
      let narrative = actionNarrative;
      if (fluxTriggered) {
        narrative = `The creature's intent shifts — what you read was not what it meant. ${narrative}`;
      }
      if (tickNarrative) narrative = `${tickNarrative} ${narrative}`;

      // ── Death check (combat) — Death's Mantle can cancel a lethal blow ────
      if (health <= 0) {
        const save = deathSaveOutcome(health, inventory);
        if (save.saved) {
          inventory.splice(save.mantleIndex, 1);
          health = 1;
          narrative += " Death's Mantle shatters — you survive with 1 HP.";
        } else {
          await db.transact([
            tx.sessions[sessionId].update({
              health: 0,
              stamina,
              status: 'dying',
              enemyHealth,
              enemyFrozen: false,
              currentEnemy: enemyName,
              inventory: JSON.stringify(inventory),
              zoneStatus: JSON.stringify(zoneStatus),
              burnStacks: zoneStatus.burn,
              chillStacks: zoneStatus.chill,
              clarity: zoneStatus.clarity,
              visitedRooms: JSON.stringify(visitedRooms),
              fluxActive: fluxTriggered,
            }),
          ]);
          return NextResponse.json({
            state: {
              phase: 'death',
              room: currentRoom,
              totalRooms: session.totalRooms,
              health: 0,
              maxHealth,
              stamina,
              inventory: inventory.map(i => i.name),
              narrative: `${narrative} The world grows dark. Your journey ends here.`,
              status: statusSummary(zoneStatus),
              modifier: modifierSummary(modifier),
              options: [{ id: 'submit_death', text: 'Leave your final words' }],
            },
            result: { type: 'death', narrative: 'You have fallen.', damage: totalPlayerDmg },
          });
        }
      }

      // ── Flee success — escape this room without defeating the enemy ───────
      if (fleeSuccess) {
        currentRoom++;
        if (currentRoom > session.totalRooms) {
          return processVictory(sessionId, session, health, currentRoom, zoneStatus, visitedRooms);
        }
        return presentNextRoom({
          sessionId, session, dungeon, currentRoom, health, stamina, maxHealth,
          inventory, zoneStatus, modifier, mechanic, zoneId, visitedRooms,
          prefixNarrative: narrative,
          resultType: 'fled',
          resultExtra: { damage: totalPlayerDmg },
        });
      }

      // ── Enemy defeated — advance to the next room (or win) ────────────────
      if (enemyHealth <= 0) {
        currentRoom++;
        if (currentRoom > session.totalRooms) {
          return processVictory(sessionId, session, health, currentRoom, zoneStatus, visitedRooms);
        }
        return presentNextRoom({
          sessionId, session, dungeon, currentRoom, health, stamina, maxHealth,
          inventory, zoneStatus, modifier, mechanic, zoneId, visitedRooms,
          prefixNarrative: `${narrative} ${enemyName} falls.`,
          resultType: 'enemy_defeated',
          resultExtra: { damage: totalPlayerDmg, enemyDamage: enemyDmg },
        });
      }

      // ── Enemy survives — new intent, stamina regen, continue combat ───────
      wasCharging = intentEffects.isCharging;
      const newIntent = getCreatureIntent(enemyName, zoneId);
      enemyIntent = newIntent.type;
      const regenBlocked = isStaminaRegenBlocked(mechanic, zoneStatus);
      const regen = regenBlocked ? 0 : settings.staminaRegen + (modifier?.staminaRegenBonus ?? 0);
      stamina = Math.min(settings.staminaPool, stamina + regen);
      if (regenBlocked) narrative += ' The cold slows you — stamina does not recover.';

      await db.transact([
        tx.sessions[sessionId].update({
          health,
          stamina,
          enemyHealth,
          enemyIntent,
          wasCharging,
          enemyFrozen: enemyFrozenAfter,
          currentEnemy: enemyName,
          inventory: JSON.stringify(inventory),
          zoneStatus: JSON.stringify(zoneStatus),
          burnStacks: zoneStatus.burn,
          chillStacks: zoneStatus.chill,
          clarity: zoneStatus.clarity,
          visitedRooms: JSON.stringify(visitedRooms),
          fluxActive: fluxTriggered,
        }),
      ]);

      return NextResponse.json({
        state: {
          phase: 'combat',
          room: currentRoom,
          totalRooms: session.totalRooms,
          health,
          maxHealth,
          stamina,
          inventory: inventory.map(i => i.name),
          narrative,
          status: statusSummary(zoneStatus),
          modifier: modifierSummary(modifier),
          options: buildCombatOptions(inventory, settings, modifier, mechanic, zoneStatus),
          enemy: buildEnemy(enemyName, enemyHealth, room.enemy?.maxHealth || 100, enemyIntent, tier, wasCharging, modifier, false),
        },
        result: { type: 'combat', narrative, damage: totalPlayerDmg, enemyDamage: enemyDmg },
      });
    }

    // ── EXPLORATION — advancing rooms ─────────────────────────────────────────
    if (action === '1' || action === '2' || action === 'forward' || action === 'search' || action === 'take') {
      // Apply the start-of-turn burn tick.
      health = Math.max(0, health - tickDamage);
      let narrative = tickNarrative;

      // Burn can be lethal between fights.
      if (health <= 0) {
        const save = deathSaveOutcome(health, inventory);
        if (save.saved) {
          inventory.splice(save.mantleIndex, 1);
          health = 1;
          narrative += " Death's Mantle shatters — you survive with 1 HP.";
        } else {
          await db.transact([
            tx.sessions[sessionId].update({
              health: 0,
              status: 'dying',
              enemyFrozen: false,
              inventory: JSON.stringify(inventory),
              zoneStatus: JSON.stringify(zoneStatus),
              burnStacks: zoneStatus.burn,
              chillStacks: zoneStatus.chill,
              clarity: zoneStatus.clarity,
              visitedRooms: JSON.stringify(visitedRooms),
              fluxActive: false,
            }),
          ]);
          return NextResponse.json({
            state: {
              phase: 'death',
              room: currentRoom,
              totalRooms: session.totalRooms,
              health: 0,
              maxHealth,
              stamina,
              inventory: inventory.map(i => i.name),
              narrative: `${narrative} The fire inside you claims what's left. The world goes dark.`,
              status: statusSummary(zoneStatus),
              modifier: modifierSummary(modifier),
              options: [{ id: 'submit_death', text: 'Leave your final words' }],
            },
            result: { type: 'death', narrative: 'The burn consumed you.' },
          });
        }
      }

      // Cache rooms restore health.
      if (room?.type === 'cache' && (action === '1' || action === 'take')) {
        const healed = computeHealAmount(30, modifier, health);
        health = healed.newHealth;
        narrative = `${narrative}${narrative ? ' ' : ''}You feel restored. +${healed.healed} HP.`;
      }

      currentRoom++;
      if (currentRoom > session.totalRooms) {
        return processVictory(sessionId, session, health, currentRoom, zoneStatus, visitedRooms, { includeHealthAndRoom: true });
      }

      return presentNextRoom({
        sessionId, session, dungeon, currentRoom, health, stamina, maxHealth,
        inventory, zoneStatus, modifier, mechanic, zoneId, visitedRooms,
        prefixNarrative: narrative,
        resultType: 'advance',
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error) {
    console.error('Agent action error:', error);
    return NextResponse.json({ error: 'Failed to process action' }, { status: 500 });
  }
}
