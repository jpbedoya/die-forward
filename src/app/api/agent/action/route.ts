import { NextRequest, NextResponse } from 'next/server';
import { init, tx, id } from '@instantdb/admin';
import { 
  getStrikeNarration,
  getDodgeNarration,
  getBraceNarration,
  getFleeNarration,
  getCreatureIntent,
  getCreatureTier,
  getTierDamageMultiplier,
  getIntentEffects,
} from '@/lib/content';
import { processVictoryPayout, processDirectPayout } from '@/lib/onchain';

const db = init({
  appId: process.env.NEXT_PUBLIC_INSTANT_APP_ID!,
  adminToken: process.env.INSTANT_ADMIN_KEY!,
});

// Enemies that apply BURN stacks on hit (Ashen Crypts)
const BURN_ENEMIES: Record<string, number> = {
  'Ember Husks': 1,
  'Cinder Priests': 1,
  'The Scorched': 2,
  'Flame Weavers': 2,
  'Ashen Congregation': 1,
  'The Pyre Keeper': 2,
};

// Enemies that apply CHILL stacks on hit (Frozen Gallery)
const CHILL_ENEMIES: Record<string, number> = {
  'Ice Wraiths': 1,           // +1 chill on hit, spirits of cold
  'The Preserved': 1,         // +1 chill — thawed corpses, still cold
  'Frost Sentinels': 1,       // +1 chill — immune to freeze
  'The Shattered': 1,         // +1 chill per piece
  'The Glacial Sovereign': 2, // +2 chill — boss
};

// Enemies immune to FREEZE (Frozen Gallery)
const FREEZE_IMMUNE: Set<string> = new Set([
  'Ice Wraiths',           // Spirits of cold — freeze does nothing
  'Frost Sentinels',       // Ice armor, native to cold
  'The Glacial Sovereign', // Boss, immune
]);

// Enemies that drain CLARITY (Void Beyond) — singular and plural forms
const CLARITY_DRAIN_ENEMIES: Record<string, number> = {
  'Probability Shade': 1,
  'Probability Shades': 1,
  'Echo Double': 2,
  'Echo Doubles': 2,
  'Void Architect': 1,
  'Void Architects': 1,
  'The Unanchored': 1,
  'Pale Oracle': 2,
  'The Unwritten': 2,
};

type IntentType = 'AGGRESSIVE' | 'DEFENSIVE' | 'CHARGING' | 'ERRATIC' | 'HUNTING' | 'STALKING' | 'RETREATING';

// Combat damage calculation
function calculateCombat(
  action: string,
  enemy: any,
  hasHerbs: boolean,
  hasTorch: boolean,
  hasEmberFlask: boolean = false,
  hasClarityShard: boolean = false,
  hasFrostShard: boolean = false,
  hasThermalFlask: boolean = false,
) {
  const tier = enemy.tier || 2;
  const tierMult = tier === 3 ? 2.0 : tier === 2 ? 1.5 : 1.0;
  const intentEffects = getIntentEffects(enemy.intent);
  
  const baseDamage = 15 + Math.floor(Math.random() * 15); // 15-30
  const baseEnemyDamage = Math.round((10 + Math.floor(Math.random() * 10)) * tierMult * intentEffects.damageDealtMod);
  
  let playerDamage = 0;
  let enemyDamage = 0;
  let heal = 0;
  let narrative = '';
  let consumeHerbs = false;
  let consumeEmberFlask = false;
  let consumeClarityShard = false;
  let consumeFrostShard = false;
  let consumeThermalFlask = false;
  let fleeSuccess = false;
  
  const attackBonus = hasTorch ? 1.25 : 1.0;
  
  switch (action) {
    case 'strike':
      playerDamage = Math.round(baseDamage * attackBonus);
      enemyDamage = enemy.wasCharging ? baseEnemyDamage * 2 : baseEnemyDamage;
      narrative = getStrikeNarration('mutual');
      break;
      
    case 'dodge':
      playerDamage = 0;
      enemyDamage = enemy.wasCharging ? 0 : Math.round(baseEnemyDamage * 0.3); // Partial if not charging
      narrative = enemy.wasCharging ? getDodgeNarration('success') : getDodgeNarration('close');
      break;
      
    case 'brace':
      playerDamage = 0;
      enemyDamage = enemy.wasCharging ? 0 : Math.round(baseEnemyDamage * 0.5);
      narrative = getBraceNarration('success');
      break;
      
    case 'herbs':
      if (hasHerbs) {
        heal = 25 + Math.floor(Math.random() * 10);
        enemyDamage = baseEnemyDamage;
        consumeHerbs = true;
        narrative = 'The herbs burn going down, but warmth spreads through you as wounds close.';
      } else {
        narrative = 'You have no herbs!';
      }
      break;

    case 'ember_flask':
      if (hasEmberFlask) {
        enemyDamage = baseEnemyDamage; // Enemy still attacks while you use the flask
        consumeEmberFlask = true;
        narrative = 'The flask extinguishes the flames. The burning stops.';
      } else {
        narrative = 'You have no Ember Flask!';
      }
      break;

    case 'clarity_shard':
      if (hasClarityShard) {
        enemyDamage = baseEnemyDamage; // Enemy still attacks while you use the shard
        consumeClarityShard = true;
        narrative = 'The shard focuses your mind. Reality settles, briefly.';
      } else {
        narrative = 'You have no Clarity Shard!';
      }
      break;
      
    case 'frost_shard':
      if (hasFrostShard) {
        enemyDamage = baseEnemyDamage; // Enemy still attacks while you use the shard
        consumeFrostShard = true;
        narrative = 'You hurl the shard. The cold finds a target.';
      } else {
        narrative = 'You have no Frost Shard!';
      }
      break;

    case 'thermal_flask':
      if (hasThermalFlask) {
        enemyDamage = baseEnemyDamage; // Enemy still attacks while you drink
        consumeThermalFlask = true;
        narrative = 'Warmth floods back. The cold retreats.';
      } else {
        narrative = 'You have no Thermal Flask!';
      }
      break;

    case 'flee':
      const fleeChance = 0.4 - (intentEffects.fleeMod || 0);
      fleeSuccess = Math.random() < fleeChance;
      if (!fleeSuccess) {
        enemyDamage = Math.round(baseEnemyDamage * 1.5); // Punished for failed flee
        narrative = getFleeNarration('fail');
      } else {
        narrative = getFleeNarration('success');
      }
      break;
      
    default:
      narrative = 'Invalid action.';
  }
  
  return { playerDamage, enemyDamage, heal, narrative, consumeHerbs, consumeEmberFlask, consumeClarityShard, consumeFrostShard, consumeThermalFlask, fleeSuccess };
}

// ── VICTORY HELPER ────────────────────────────────────────────────────────────
// Shared handler for both combat and exploration victories.
// Set includeHealthAndRoom=true (explore path) to persist health and currentRoom.
async function processVictory(
  sessionId: string,
  session: any,
  health: number,
  currentRoom: number,
  clarityAfter: number,
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
    burnStacks: 0,
    chillStacks: 0,
    enemyFrozen: false,
    clarity: clarityAfter,
    visitedRooms: JSON.stringify(visitedRoomsAfter),
    fluxActive: false,
  };

  if (options.includeHealthAndRoom) {
    dbUpdate.health = health;
    dbUpdate.currentRoom = currentRoom;
  }

  await db.transact([tx.sessions[sessionId].update(dbUpdate)]);

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
// ────────────────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, action, finalMessage } = body;

    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId is required' }, { status: 400 });
    }

    // Get session
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
    const inventory = JSON.parse(session.inventory || '[]');
    let health = session.health;
    let stamina = session.stamina;
    let currentRoom = session.currentRoom;
    let enemyHealth = session.enemyHealth || 0;
    let enemyIntent = session.enemyIntent || 'AGGRESSIVE';
    let wasCharging = session.wasCharging || false;
    
    const room = dungeon[currentRoom - 1];
    let resultType = 'advance';
    let narrative = '';
    let damage = null;
    let enemyDamage = null;

    // Burn state — tracked across all turns
    let burnStacksAfter = session.burnStacks || 0;
    let burnTickNarrative = '';

    // Chill + Freeze state — tracked across all turns (Frozen Gallery)
    let chillStacksAfter = session.chillStacks || 0;
    let enemyFrozenAfter = false; // always resets each turn
    let chillTickNarrative = '';

    // ── VOID BEYOND STATE ────────────────────────────────────────────────────
    const isVoidZone = session.zoneId === 'void-beyond' || session.zone === 'void-beyond';
    let clarityAfter: number = session.clarity ?? 3;
    let visitedRoomsAfter: string[] = JSON.parse(session.visitedRooms || '[]');
    let fluxTriggered = false;
    // ────────────────────────────────────────────────────────────────────────
    
    // Handle death submission
    if (action === 'submit_death') {
      const deathId = id();
      const corpseId = id();
      const message = (finalMessage || 'An agent fell here.').slice(0, 50);
      
      await db.transact([
        tx.deaths[deathId].update({
          walletAddress: session.walletAddress,
          playerName: session.playerName,
          zone: session.zone,
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
          zone: session.zone,
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

    // ── VOID FAKE OPTIONS: no-op but with confusion narrative ────────────────
    if (
      action === 'void_fake_1' ||
      action === 'void_fake_2' ||
      action === 'void_fake_3' ||
      action === 'void_fake_4'
    ) {
      const isCombatPhase = room?.type === 'combat' && enemyHealth > 0;
      const combatOpts = [
        { id: 'strike', text: '⚔️ Strike' },
        { id: 'dodge', text: '💨 Dodge' },
        { id: 'brace', text: '🛡️ Brace' },
        ...(inventory.some((i: any) => i.name === 'Herbs') ? [{ id: 'herbs', text: '🌿 Herbs' }] : []),
        ...(inventory.some((i: any) => i.name === 'Ember Flask') ? [{ id: 'ember_flask', text: '🧪 Ember Flask' }] : []),
        ...(inventory.some((i: any) => i.name === 'Frost Shard') ? [{ id: 'frost_shard', text: '❄️ Frost Shard' }] : []),
        ...(inventory.some((i: any) => i.name === 'Thermal Flask') ? [{ id: 'thermal_flask', text: '🔥 Thermal Flask' }] : []),
        ...(inventory.some((i: any) => i.name === 'Clarity Shard') ? [{ id: 'clarity_shard', text: '💎 Clarity Shard' }] : []),
        { id: 'flee', text: '🏃 Flee' },
      ];
      // Re-inject a fake option since clarity is still 0
      if (isVoidZone && clarityAfter === 0) {
        const fakeOptions = [
          { id: 'void_fake_1', text: 'Step toward the light.' },
          { id: 'void_fake_2', text: 'Accept the offer.' },
          { id: 'void_fake_3', text: 'Follow the sound back.' },
          { id: 'void_fake_4', text: 'Wait for the other one.' },
        ];
        combatOpts.push(fakeOptions[Math.floor(Math.random() * fakeOptions.length)]);
      }
      return NextResponse.json({
        state: {
          phase: isCombatPhase ? 'combat' : 'explore',
          room: currentRoom,
          totalRooms: session.totalRooms,
          health,
          maxHealth: session.maxHealth,
          stamina,
          inventory: inventory.map((i: any) => i.name),
          narrative: 'That was not an option. Or it was. You are no longer sure.',
          options: isCombatPhase
            ? combatOpts
            : room?.content?.options?.map((opt: string, i: number) => ({
                id: String(i + 1),
                text: opt,
              })) || [{ id: '1', text: 'Continue' }],
          enemy: isCombatPhase ? {
            name: room.enemy?.name,
            health: enemyHealth,
            maxHealth: room.enemy?.maxHealth || 100,
            intent: enemyIntent,
            tier: room.enemy?.tier || 2,
            wasCharging,
          } : null,
        },
        result: { type: 'void_confusion', narrative: 'That was not an option. Or it was. You are no longer sure.' },
      });
    }
    // ────────────────────────────────────────────────────────────────────────

    // ── BURN TICK: applied at the start of every player action ──────────────
    // Runs before any action resolves. If burn kills the player, end here.
    const currentBurnStacks = session.burnStacks || 0;
    if (currentBurnStacks > 0) {
      const burnDamage = currentBurnStacks * 3;
      health = Math.max(0, health - burnDamage);
      burnStacksAfter = Math.max(0, currentBurnStacks - 1);

      if (currentBurnStacks === 1) {
        burnTickNarrative = 'The last ember fades.';
      } else {
        burnTickNarrative = `The burns bite. You take ${burnDamage} damage. (${burnStacksAfter} stacks remain.)`;
      }

      if (health <= 0) {
        await db.transact([
          tx.sessions[sessionId].update({
            health: 0,
            status: 'dying',
            burnStacks: 0,
            chillStacks: 0,
            enemyFrozen: false,
            clarity: clarityAfter,
            visitedRooms: JSON.stringify(visitedRoomsAfter),
            fluxActive: false,
          }),
        ]);
        return NextResponse.json({
          state: {
            phase: 'death',
            room: currentRoom,
            totalRooms: session.totalRooms,
            health: 0,
            maxHealth: session.maxHealth,
            stamina,
            inventory: inventory.map((i: any) => i.name),
            narrative: `${burnTickNarrative} The fire inside you claims what's left. The world goes dark.`,
            options: [{ id: 'submit_death', text: 'Leave your final words' }],
          },
          result: {
            type: 'death',
            narrative: 'The burn consumed you.',
          },
        });
      }
    }
    // ────────────────────────────────────────────────────────────────────────

    // ── CHILL TICK: decays by 1 per turn (reduces stamina regen, no direct damage) ──
    const currentChillStacks = session.chillStacks || 0;
    if (currentChillStacks > 0) {
      chillStacksAfter = Math.max(0, currentChillStacks - 1);
      if (currentChillStacks >= 3) {
        chillTickNarrative = 'You are cold to the bone. Stamina will not return until you warm.';
      } else {
        chillTickNarrative = 'The cold has weight. Your muscles forget urgency.';
      }
    }
    // ────────────────────────────────────────────────────────────────────────

    // Handle combat actions
    if (room.type === 'combat' && enemyHealth > 0) {
      // ── FLUX: 30% chance intent shifts before resolution (Void Beyond only) ──
      if (isVoidZone) {
        const FLUX_CHANCE = 0.30;
        if (Math.random() < FLUX_CHANCE) {
          const intents: IntentType[] = ['AGGRESSIVE', 'DEFENSIVE', 'CHARGING', 'ERRATIC', 'HUNTING', 'STALKING', 'RETREATING'];
          const newFluxIntent = intents[Math.floor(Math.random() * intents.length)];
          if (newFluxIntent !== enemyIntent) {
            enemyIntent = newFluxIntent;
            fluxTriggered = true;
          }
        }
      }
      // ────────────────────────────────────────────────────────────────────────

      const hasHerbs = inventory.some((i: any) => i.name === 'Herbs');
      const hasTorch = inventory.some((i: any) => i.name === 'Torch');
      const hasEmberFlask = inventory.some((i: any) => i.name === 'Ember Flask');
      const hasClarityShard = inventory.some((i: any) => i.name === 'Clarity Shard');
      const hasFrostShard = inventory.some((i: any) => i.name === 'Frost Shard');
      const hasThermalFlask = inventory.some((i: any) => i.name === 'Thermal Flask');

      // Check if enemy was frozen last turn — they skip their attack this turn
      const wasFrozen = session.enemyFrozen || false;

      const combat = calculateCombat(action, {
        ...room.enemy,
        tier: room.enemy?.tier || 2,
        intent: enemyIntent,
        wasCharging,
      }, hasHerbs, hasTorch, hasEmberFlask, hasClarityShard, hasFrostShard, hasThermalFlask);

      // If enemy was frozen, override their damage to 0
      let actualEnemyDamage = combat.enemyDamage;
      if (wasFrozen) {
        actualEnemyDamage = 0;
      }

      enemyHealth = Math.max(0, enemyHealth - combat.playerDamage);
      health = Math.min(session.maxHealth, Math.max(0, health - actualEnemyDamage + combat.heal));
      
      if (combat.consumeHerbs) {
        const herbIndex = inventory.findIndex((i: any) => i.name === 'Herbs');
        if (herbIndex >= 0) inventory.splice(herbIndex, 1);
      }

      // Ember Flask: clears all burn stacks
      if (combat.consumeEmberFlask) {
        const flaskIndex = inventory.findIndex((i: any) => i.name === 'Ember Flask');
        if (flaskIndex >= 0) inventory.splice(flaskIndex, 1);
        burnStacksAfter = 0;
      }

      // ── CLARITY SHARD: restores 1 clarity, consumes item ────────────────
      if (combat.consumeClarityShard) {
        const shardIndex = inventory.findIndex((i: any) => i.name === 'Clarity Shard');
        if (shardIndex >= 0) inventory.splice(shardIndex, 1);
        clarityAfter = Math.min(3, clarityAfter + 1);
      }
      // ────────────────────────────────────────────────────────────────────

      // ── FROST SHARD: attempt to FREEZE the enemy next turn ───────────────
      if (combat.consumeFrostShard) {
        const frostShardIdx = inventory.findIndex((i: any) => i.name === 'Frost Shard');
        if (frostShardIdx >= 0) inventory.splice(frostShardIdx, 1);
        const enemyNameForFreeze = room.enemy?.name || '';
        if (FREEZE_IMMUNE.has(enemyNameForFreeze)) {
          combat.narrative += ` The cold finds no purchase. ${enemyNameForFreeze} does not feel it.`;
        } else {
          enemyFrozenAfter = true;
          combat.narrative += ` The shard shatters. ${enemyNameForFreeze} stops mid-motion, sealed in ice.`;
        }
      }
      // ────────────────────────────────────────────────────────────────────

      // ── THERMAL FLASK: clears all chill stacks ───────────────────────────
      if (combat.consumeThermalFlask) {
        const thermalIdx = inventory.findIndex((i: any) => i.name === 'Thermal Flask');
        if (thermalIdx >= 0) inventory.splice(thermalIdx, 1);
        chillStacksAfter = 0;
      }
      // ────────────────────────────────────────────────────────────────────

      // Build combat narrative — prepend flux and tick messages, append freeze skip
      let combatNarrative = combat.narrative;
      if (fluxTriggered) {
        combatNarrative = `The creature's intent shifts. What you read was not what it meant. ${combatNarrative}`;
      }

      const tickPrefix = [chillTickNarrative, burnTickNarrative].filter(Boolean).join(' ');
      narrative = tickPrefix ? `${tickPrefix} ${combatNarrative}` : combatNarrative;

      // If enemy was frozen this turn, narrate the skip
      if (wasFrozen) {
        narrative += ` ${room.enemy?.name || 'The creature'} strains against the ice. It cannot move.`;
      }

      damage = actualEnemyDamage;
      enemyDamage = combat.playerDamage;
      resultType = 'combat';

      // ── CLARITY DRAIN: enemy action in void zone ─────────────────────────
      if (combat.enemyDamage > 0 && isVoidZone && !combat.consumeClarityShard) {
        const enemyName = room.enemy?.name || '';
        const clarityDrain = CLARITY_DRAIN_ENEMIES[enemyName] || 0;
        if (clarityDrain > 0) {
          const prevClarity = clarityAfter;
          clarityAfter = Math.max(0, clarityAfter - clarityDrain);
          if (clarityAfter === 0 && prevClarity > 0) {
            narrative += ` Reality feels thin. You are no longer certain what is real.`;
          } else if (clarityAfter < prevClarity) {
            narrative += ` Something loosens in your mind. (Clarity: ${clarityAfter})`;
          }
        }
      }
      // ────────────────────────────────────────────────────────────────────
      
      // Check for death (combat damage)
      if (health <= 0) {
        await db.transact([
          tx.sessions[sessionId].update({
            health: 0,
            status: 'dying',
            burnStacks: burnStacksAfter,
            chillStacks: 0,
            enemyFrozen: false,
            clarity: clarityAfter,
            visitedRooms: JSON.stringify(visitedRoomsAfter),
            fluxActive: fluxTriggered,
          }),
        ]);
        
        return NextResponse.json({
          state: {
            phase: 'death',
            room: currentRoom,
            totalRooms: session.totalRooms,
            health: 0,
            maxHealth: session.maxHealth,
            stamina,
            inventory: inventory.map((i: any) => i.name),
            narrative: 'The world grows dark. Cold water rises around you. Your journey ends here.',
            options: [{ id: 'submit_death', text: 'Leave your final words' }],
          },
          result: {
            type: 'death',
            narrative: 'You have fallen.',
            damage,
          },
        });
      }
      
      // Apply BURN stacks if enemy dealt damage and player survived
      if (actualEnemyDamage > 0 && !combat.consumeEmberFlask) {
        const enemyName = room.enemy?.name || '';
        const burnAmount = BURN_ENEMIES[enemyName] || 0;
        if (burnAmount > 0) {
          const hasAshVeil = inventory.some((i: any) => i.name === 'Ash Veil');
          const actualBurn = hasAshVeil ? Math.min(burnAmount, 1) : burnAmount;
          const newStacks = Math.min(5, burnStacksAfter + actualBurn);
          const stacksAdded = newStacks - burnStacksAfter;
          if (stacksAdded > 0) {
            burnStacksAfter = newStacks;
            const burnMsg = burnAmount >= 2
              ? `The flames catch. (${burnStacksAfter} stacks.)`
              : `${enemyName} leaves you burning. (${burnStacksAfter} stacks.)`;
            narrative += ' ' + burnMsg;
            if (burnStacksAfter >= 5) {
              narrative += ' You are burning. Every moment costs you.';
            }
          }
        }
      }

      // Apply CHILL stacks if enemy dealt damage and player survived (Frozen Gallery)
      if (actualEnemyDamage > 0 && !combat.consumeThermalFlask) {
        const enemyName = room.enemy?.name || '';
        const chillAmount = CHILL_ENEMIES[enemyName] || 0;
        if (chillAmount > 0) {
          const newChillStacks = Math.min(3, chillStacksAfter + chillAmount);
          const chillAdded = newChillStacks - chillStacksAfter;
          if (chillAdded > 0) {
            chillStacksAfter = newChillStacks;
            const chillMsg = `${enemyName}'s touch leaves cold behind. (${chillStacksAfter} stack${chillStacksAfter !== 1 ? 's' : ''}.)`;
            narrative += ' ' + chillMsg;
            if (chillStacksAfter >= 3) {
              narrative += ' You are cold to the bone. Stamina will not return until you warm.';
            }
          }
        }
      }

      // Check for victory in combat
      if (enemyHealth <= 0) {
        wasCharging = false;
        // Move to next room after combat victory
        currentRoom++;
        
        if (currentRoom > session.totalRooms) {
          // Victory!
          return processVictory(sessionId, session, health, currentRoom, clarityAfter, visitedRoomsAfter);
        }
      } else {
        // Enemy survives - new intent
        wasCharging = enemyIntent === 'CHARGING';
        const newIntent = getCreatureIntent(room.enemy?.name || 'enemy', session.zoneId || 'sunken-crypt');
        enemyIntent = newIntent.type;
        // CHILL reduces stamina regen: at 1+ stacks, stamina does not recover
        const staminaRegen = currentChillStacks === 0 ? 1 : 0;
        stamina = Math.min(3, stamina + staminaRegen);
        if (staminaRegen === 0 && currentChillStacks > 0) {
          narrative += ' The cold slows you. Stamina does not recover.';
        }
      }
      
      // Update session
      await db.transact([
        tx.sessions[sessionId].update({
          health,
          stamina,
          currentRoom,
          enemyHealth,
          enemyIntent,
          wasCharging,
          inventory: JSON.stringify(inventory),
          burnStacks: burnStacksAfter,
          chillStacks: chillStacksAfter,
          enemyFrozen: enemyFrozenAfter,
          clarity: clarityAfter,
          visitedRooms: JSON.stringify(visitedRoomsAfter),
          fluxActive: fluxTriggered,
        }),
      ]);
      
      // Return combat state or next room
      if (enemyHealth > 0) {
        // Build combat options — add clarity shard if in inventory, fake option if clarity 0
        const combatOptions: Array<{ id: string; text: string }> = [
          { id: 'strike', text: '⚔️ Strike' },
          { id: 'dodge', text: '💨 Dodge' },
          { id: 'brace', text: '🛡️ Brace' },
          ...(inventory.some((i: any) => i.name === 'Herbs') ? [{ id: 'herbs', text: '🌿 Herbs' }] : []),
          ...(inventory.some((i: any) => i.name === 'Ember Flask') ? [{ id: 'ember_flask', text: '🧪 Ember Flask' }] : []),
          ...(inventory.some((i: any) => i.name === 'Frost Shard') ? [{ id: 'frost_shard', text: '❄️ Frost Shard' }] : []),
          ...(inventory.some((i: any) => i.name === 'Thermal Flask') ? [{ id: 'thermal_flask', text: '🔥 Thermal Flask' }] : []),
          ...(inventory.some((i: any) => i.name === 'Clarity Shard') ? [{ id: 'clarity_shard', text: '💎 Clarity Shard' }] : []),
          { id: 'flee', text: '🏃 Flee' },
        ];
        // ── CLARITY 0: inject one fake option ───────────────────────────────
        if (isVoidZone && clarityAfter === 0) {
          const fakeOptions = [
            { id: 'void_fake_1', text: 'Step toward the light.' },
            { id: 'void_fake_2', text: 'Accept the offer.' },
            { id: 'void_fake_3', text: 'Follow the sound back.' },
            { id: 'void_fake_4', text: 'Wait for the other one.' },
          ];
          combatOptions.push(fakeOptions[Math.floor(Math.random() * fakeOptions.length)]);
        }
        // ────────────────────────────────────────────────────────────────────

        return NextResponse.json({
          state: {
            phase: 'combat',
            room: currentRoom,
            totalRooms: session.totalRooms,
            health,
            maxHealth: session.maxHealth,
            stamina,
            inventory: inventory.map((i: any) => i.name),
            narrative,
            options: combatOptions,
            enemy: {
              name: room.enemy?.name,
              health: enemyHealth,
              maxHealth: room.enemy?.maxHealth || 100,
              intent: enemyIntent,
              tier: room.enemy?.tier || 2,
              wasCharging,
            },
          },
          result: { type: resultType, narrative, damage, enemyDamage },
        });
      } else {
        // Enemy defeated - advance to next room
        const nextRoom = dungeon[currentRoom - 1];

        // ── ECHO ROOMS: 20% chance in void zone ─────────────────────────────
        let echoNarrativePrefix = '';
        let isEchoRoom = false;
        if (isVoidZone && visitedRoomsAfter.length > 0 && Math.random() < 0.20) {
          isEchoRoom = true;
          echoNarrativePrefix = 'You have been here. Or somewhere like here. The differences are subtle. ';
        }
        // Track this room type in visitedRooms
        if (nextRoom && !visitedRoomsAfter.includes(nextRoom.type)) {
          visitedRoomsAfter = [...visitedRoomsAfter, nextRoom.type];
        }
        // ────────────────────────────────────────────────────────────────────

        // ── CACHE ROOMS restore clarity in void zone ─────────────────────────
        if (nextRoom?.type === 'cache' && isVoidZone) {
          clarityAfter = Math.min(3, clarityAfter + 1);
        }
        // ────────────────────────────────────────────────────────────────────
        
        // Set up enemy if next room is combat
        let nextEnemyHealth = 0;
        let nextEnemyIntent = 'AGGRESSIVE';
        if (nextRoom?.type === 'combat') {
          nextEnemyHealth = 80 + Math.floor(Math.random() * 40);
          nextEnemyIntent = 'AGGRESSIVE';
          
          await db.transact([
            tx.sessions[sessionId].update({
              enemyHealth: nextEnemyHealth,
              enemyIntent: nextEnemyIntent,
              wasCharging: false,
              burnStacks: burnStacksAfter,
              chillStacks: chillStacksAfter,
              enemyFrozen: false, // New enemy, not frozen
              clarity: clarityAfter,
              visitedRooms: JSON.stringify(visitedRoomsAfter),
              fluxActive: false,
            }),
          ]);
        }

        const nextRoomBaseNarrative = nextRoom?.content?.narrative || 'You proceed deeper.';
        const nextRoomNarrative = isEchoRoom
          ? `${echoNarrativePrefix}${nextRoomBaseNarrative}`
          : nextRoomBaseNarrative;

        // Build options for next room (combat or explore), with fake option if clarity 0 and void
        let nextOptions: Array<{ id: string; text: string }>;
        if (nextRoom?.type === 'combat') {
          nextOptions = [
            { id: 'strike', text: '⚔️ Strike' },
            { id: 'dodge', text: '💨 Dodge' },
            { id: 'brace', text: '🛡️ Brace' },
            ...(inventory.some((i: any) => i.name === 'Herbs') ? [{ id: 'herbs', text: '🌿 Herbs' }] : []),
            ...(inventory.some((i: any) => i.name === 'Ember Flask') ? [{ id: 'ember_flask', text: '🧪 Ember Flask' }] : []),
            ...(inventory.some((i: any) => i.name === 'Frost Shard') ? [{ id: 'frost_shard', text: '❄️ Frost Shard' }] : []),
            ...(inventory.some((i: any) => i.name === 'Thermal Flask') ? [{ id: 'thermal_flask', text: '🔥 Thermal Flask' }] : []),
            ...(inventory.some((i: any) => i.name === 'Clarity Shard') ? [{ id: 'clarity_shard', text: '💎 Clarity Shard' }] : []),
            { id: 'flee', text: '🏃 Flee' },
          ];
          if (isVoidZone && clarityAfter === 0) {
            const fakeOptions = [
              { id: 'void_fake_1', text: 'Step toward the light.' },
              { id: 'void_fake_2', text: 'Accept the offer.' },
              { id: 'void_fake_3', text: 'Follow the sound back.' },
              { id: 'void_fake_4', text: 'Wait for the other one.' },
            ];
            nextOptions.push(fakeOptions[Math.floor(Math.random() * fakeOptions.length)]);
          }
        } else {
          nextOptions = nextRoom?.content?.options?.map((opt: string, i: number) => ({
            id: String(i + 1),
            text: opt,
          })) || [{ id: '1', text: 'Continue' }];
        }
        
        return NextResponse.json({
          state: {
            phase: nextRoom?.type === 'combat' ? 'combat' : 'explore',
            room: currentRoom,
            totalRooms: session.totalRooms,
            health,
            maxHealth: session.maxHealth,
            stamina,
            inventory: inventory.map((i: any) => i.name),
            narrative: `${room.enemy?.name || 'The creature'} falls. ${nextRoomNarrative}`,
            options: nextOptions,
            enemy: nextRoom?.type === 'combat' ? {
              name: nextRoom.enemy?.name,
              health: nextEnemyHealth,
              maxHealth: nextEnemyHealth,
              intent: nextEnemyIntent,
              tier: nextRoom.enemy?.tier || 2,
            } : null,
          },
          result: { 
            type: 'enemy_defeated', 
            narrative: `${room.enemy?.name || 'The creature'} collapses. You dealt ${enemyDamage} damage.`,
            damage,
            enemyDamage,
          },
        });
      }
    }

    // Handle exploration actions (advancing rooms)
    if (action === '1' || action === '2' || action === 'forward' || action === 'search' || action === 'take') {
      // Some actions give items
      if (room.type === 'cache' && (action === '1' || action === 'take')) {
        health = Math.min(session.maxHealth, health + 30);
        narrative = burnTickNarrative
          ? `${burnTickNarrative} You feel restored. +30 HP`
          : 'You feel restored. +30 HP';
      } else {
        const roomNarrative = room.content?.narrative || 'You proceed deeper.';
        narrative = burnTickNarrative
          ? `${burnTickNarrative} ${roomNarrative}`
          : roomNarrative;
      }
      
      currentRoom++;
      resultType = 'advance';
      
      // Check if done
      if (currentRoom > session.totalRooms) {
        return processVictory(sessionId, session, health, currentRoom, clarityAfter, visitedRoomsAfter, { includeHealthAndRoom: true });
      }
      
      const nextRoom = dungeon[currentRoom - 1];

      // ── ECHO ROOMS: 20% chance in void zone (exploration advance) ────────
      let echoNarrativePrefix = '';
      let isEchoRoom = false;
      if (isVoidZone && visitedRoomsAfter.length > 0 && Math.random() < 0.20) {
        isEchoRoom = true;
        echoNarrativePrefix = 'You have been here. Or somewhere like here. The differences are subtle. ';
      }
      // Track this room type in visitedRooms
      if (nextRoom && !visitedRoomsAfter.includes(nextRoom.type)) {
        visitedRoomsAfter = [...visitedRoomsAfter, nextRoom.type];
      }
      // ────────────────────────────────────────────────────────────────────

      // ── CACHE ROOMS restore clarity in void zone ─────────────────────────
      if (nextRoom?.type === 'cache' && isVoidZone) {
        clarityAfter = Math.min(3, clarityAfter + 1);
      }
      // ────────────────────────────────────────────────────────────────────
      
      // Set up enemy if combat room
      if (nextRoom.type === 'combat') {
        enemyHealth = 80 + Math.floor(Math.random() * 40);
        enemyIntent = 'AGGRESSIVE';
        wasCharging = false;
      }
      
      await db.transact([
        tx.sessions[sessionId].update({
          health,
          currentRoom,
          enemyHealth,
          enemyIntent,
          wasCharging,
          inventory: JSON.stringify(inventory),
          burnStacks: burnStacksAfter,
          chillStacks: chillStacksAfter,
          enemyFrozen: false, // New enemy if combat, not frozen
          clarity: clarityAfter,
          visitedRooms: JSON.stringify(visitedRoomsAfter),
          fluxActive: false,
        }),
      ]);

      const nextRoomBaseNarrative = nextRoom.content?.narrative || 'You enter a new chamber.';
      const nextRoomNarrative = isEchoRoom
        ? `${echoNarrativePrefix}${nextRoomBaseNarrative}`
        : nextRoomBaseNarrative;

      // Build options for next room, with fake option if clarity 0 and void zone
      let nextOptions: Array<{ id: string; text: string }>;
      if (nextRoom.type === 'combat') {
        nextOptions = [
          { id: 'strike', text: '⚔️ Strike' },
          { id: 'dodge', text: '💨 Dodge' },
          { id: 'brace', text: '🛡️ Brace' },
          ...(inventory.some((i: any) => i.name === 'Herbs') ? [{ id: 'herbs', text: '🌿 Herbs' }] : []),
          ...(inventory.some((i: any) => i.name === 'Ember Flask') ? [{ id: 'ember_flask', text: '🧪 Ember Flask' }] : []),
          ...(inventory.some((i: any) => i.name === 'Frost Shard') ? [{ id: 'frost_shard', text: '❄️ Frost Shard' }] : []),
          ...(inventory.some((i: any) => i.name === 'Thermal Flask') ? [{ id: 'thermal_flask', text: '🔥 Thermal Flask' }] : []),
          ...(inventory.some((i: any) => i.name === 'Clarity Shard') ? [{ id: 'clarity_shard', text: '💎 Clarity Shard' }] : []),
          { id: 'flee', text: '🏃 Flee' },
        ];
        if (isVoidZone && clarityAfter === 0) {
          const fakeOptions = [
            { id: 'void_fake_1', text: 'Step toward the light.' },
            { id: 'void_fake_2', text: 'Accept the offer.' },
            { id: 'void_fake_3', text: 'Follow the sound back.' },
            { id: 'void_fake_4', text: 'Wait for the other one.' },
          ];
          nextOptions.push(fakeOptions[Math.floor(Math.random() * fakeOptions.length)]);
        }
      } else {
        nextOptions = nextRoom.content?.options?.map((opt: string, i: number) => ({
          id: String(i + 1),
          text: opt,
        })) || [{ id: '1', text: 'Continue' }];
      }
      
      return NextResponse.json({
        state: {
          phase: nextRoom.type === 'combat' ? 'combat' : 'explore',
          room: currentRoom,
          totalRooms: session.totalRooms,
          health,
          maxHealth: session.maxHealth,
          stamina,
          inventory: inventory.map((i: any) => i.name),
          narrative: nextRoomNarrative,
          options: nextOptions,
          enemy: nextRoom.type === 'combat' ? {
            name: nextRoom.enemy?.name,
            health: enemyHealth,
            maxHealth: enemyHealth,
            intent: enemyIntent,
            tier: 2,
          } : null,
        },
        result: { type: resultType, narrative },
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error) {
    console.error('Agent action error:', error);
    return NextResponse.json({ error: 'Failed to process action' }, { status: 500 });
  }
}
