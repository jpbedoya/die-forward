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

const db = init({
  appId: process.env.NEXT_PUBLIC_INSTANT_APP_ID!,
  adminToken: process.env.INSTANT_ADMIN_KEY!,
});

// Combat damage calculation
function calculateCombat(action: string, enemy: any, hasHerbs: boolean, hasTorch: boolean) {
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
  
  return { playerDamage, enemyDamage, heal, narrative, consumeHerbs, fleeSuccess };
}

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
    
    if (session.status !== 'active') {
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
          loot: inventory[0]?.name || 'Nothing',
          lootEmoji: inventory[0]?.emoji || '💀',
          discovered: false,
          isAgent: true,
          createdAt: Date.now(),
        }),
        tx.sessions[sessionId].update({
          status: 'dead',
          endedAt: Date.now(),
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

    // Handle combat actions
    if (room.type === 'combat' && enemyHealth > 0) {
      const hasHerbs = inventory.some((i: any) => i.name === 'Herbs');
      const hasTorch = inventory.some((i: any) => i.name === 'Torch');
      
      const combat = calculateCombat(action, {
        ...room.enemy,
        tier: room.enemy?.tier || 2,
        intent: enemyIntent,
        wasCharging,
      }, hasHerbs, hasTorch);
      
      enemyHealth = Math.max(0, enemyHealth - combat.playerDamage);
      health = Math.min(session.maxHealth, Math.max(0, health - combat.enemyDamage + combat.heal));
      
      if (combat.consumeHerbs) {
        const herbIndex = inventory.findIndex((i: any) => i.name === 'Herbs');
        if (herbIndex >= 0) inventory.splice(herbIndex, 1);
      }
      
      narrative = combat.narrative;
      damage = combat.enemyDamage;
      enemyDamage = combat.playerDamage;
      resultType = 'combat';
      
      // Check for death
      if (health <= 0) {
        await db.transact([
          tx.sessions[sessionId].update({
            health: 0,
            status: 'dying',
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
      
      // Check for victory in combat
      if (enemyHealth <= 0) {
        wasCharging = false;
        // Move to next room after combat victory
        currentRoom++;
        
        if (currentRoom > session.totalRooms) {
          // Victory!
          await db.transact([
            tx.sessions[sessionId].update({
              status: 'victory',
              endedAt: Date.now(),
            }),
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
            },
          });
        }
      } else {
        // Enemy survives - new intent
        wasCharging = enemyIntent === 'CHARGING';
        const newIntent = getCreatureIntent(room.enemy?.name || 'enemy');
        enemyIntent = newIntent.type;
        stamina = Math.min(3, stamina + 1);
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
        }),
      ]);
      
      // Return combat state or next room
      if (enemyHealth > 0) {
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
            options: [
              { id: 'strike', text: '⚔️ Strike' },
              { id: 'dodge', text: '💨 Dodge' },
              { id: 'brace', text: '🛡️ Brace' },
              ...(inventory.some((i: any) => i.name === 'Herbs') ? [{ id: 'herbs', text: '🌿 Herbs' }] : []),
              { id: 'flee', text: '🏃 Flee' },
            ],
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
            }),
          ]);
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
            narrative: `${room.enemy?.name || 'The creature'} falls. ${nextRoom?.content?.narrative || 'You proceed deeper.'}`,
            options: nextRoom?.type === 'combat' ? [
              { id: 'strike', text: '⚔️ Strike' },
              { id: 'dodge', text: '💨 Dodge' },
              { id: 'brace', text: '🛡️ Brace' },
              ...(inventory.some((i: any) => i.name === 'Herbs') ? [{ id: 'herbs', text: '🌿 Herbs' }] : []),
              { id: 'flee', text: '🏃 Flee' },
            ] : nextRoom?.content?.options?.map((opt: string, i: number) => ({
              id: String(i + 1),
              text: opt,
            })) || [{ id: '1', text: 'Continue' }],
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
        narrative = 'You feel restored. +30 HP';
      } else {
        narrative = room.content?.narrative || 'You proceed deeper.';
      }
      
      currentRoom++;
      resultType = 'advance';
      
      // Check if done
      if (currentRoom > session.totalRooms) {
        await db.transact([
          tx.sessions[sessionId].update({
            status: 'victory',
            health,
            currentRoom,
            endedAt: Date.now(),
          }),
        ]);
        
        return NextResponse.json({
          state: {
            phase: 'victory',
            room: currentRoom - 1,
            totalRooms: session.totalRooms,
            health,
            narrative: 'Light breaks through. You have conquered the crypt.',
          },
          result: { type: 'victory', narrative: 'You emerge victorious!' },
        });
      }
      
      const nextRoom = dungeon[currentRoom - 1];
      
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
        }),
      ]);
      
      return NextResponse.json({
        state: {
          phase: nextRoom.type === 'combat' ? 'combat' : 'explore',
          room: currentRoom,
          totalRooms: session.totalRooms,
          health,
          maxHealth: session.maxHealth,
          stamina,
          inventory: inventory.map((i: any) => i.name),
          narrative: nextRoom.content?.narrative || 'You enter a new chamber.',
          options: nextRoom.type === 'combat' ? [
            { id: 'strike', text: '⚔️ Strike' },
            { id: 'dodge', text: '💨 Dodge' },
            { id: 'brace', text: '🛡️ Brace' },
            ...(inventory.some((i: any) => i.name === 'Herbs') ? [{ id: 'herbs', text: '🌿 Herbs' }] : []),
            { id: 'flee', text: '🏃 Flee' },
          ] : nextRoom.content?.options?.map((opt: string, i: number) => ({
            id: String(i + 1),
            text: opt,
          })) || [{ id: '1', text: 'Continue' }],
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
