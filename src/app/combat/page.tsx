'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getGameState, saveGameState } from '@/lib/gameState';
import { 
  getStrikeNarration, 
  getDodgeNarration, 
  getBraceNarration, 
  getHerbsNarration, 
  getFleeNarration,
  getEnemyIntent,
  getCreatureInfo,
  getCreatureHealth,
  getCreatureIntent,
  getTierDamageMultiplier,
  getCreatureTier,
  getIntentEffects,
  getItemEffects,
  getRoomDamageMultiplier,
  getTierForRoom,
  getDepthForRoom,
  IntentType,
  IntentEffects,
  ItemEffects,
} from '@/lib/content';
import { useAudio } from '@/lib/audio';

// Demo mode flag
const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

type CombatPhase = 'choose' | 'resolve' | 'enemy-turn' | 'victory' | 'death';

const defaultPlayer = {
  maxHealth: 100,
  maxStamina: 3,
};

const combatOptions = [
  { id: 'strike', text: 'Strike', cost: 1, emoji: '⚔️' },
  { id: 'dodge', text: 'Dodge', cost: 1, emoji: '💨' },
  { id: 'brace', text: 'Brace', cost: 0, emoji: '🛡️' },
  { id: 'herbs', text: 'Herbs', cost: 0, emoji: '🌿' },
  { id: 'flee', text: 'Flee', cost: 1, emoji: '🏃' },
];

// Get dynamic narration based on action and outcome
function getActionNarration(action: string, outcome: 'success' | 'fail' | 'partial'): string {
  switch (action) {
    case 'strike':
      return outcome === 'success' ? getStrikeNarration('success') : 
             outcome === 'partial' ? getStrikeNarration('mutual') : getStrikeNarration('weak');
    case 'dodge':
      return outcome === 'success' ? getDodgeNarration('success') : 
             outcome === 'partial' ? getDodgeNarration('close') : getDodgeNarration('fail');
    case 'brace':
      return outcome === 'success' ? getBraceNarration('success') : 
             outcome === 'partial' ? getBraceNarration('broken') : getBraceNarration('fail');
    case 'herbs':
      return outcome === 'success' ? getHerbsNarration('heal') : getHerbsNarration('interrupted');
    case 'flee':
      return outcome === 'success' ? getFleeNarration('success') : 
             outcome === 'partial' ? getFleeNarration('hurt') : getFleeNarration('fail');
    default:
      return "You act.";
  }
}

// Resolution data structure
interface Resolution {
  narrative: string;
  playerDmg: number;
  enemyDmg: number;
  heal?: number;
  consumeHerbs?: boolean;
  fleeSuccess?: boolean;
}

// Combat context for calculating damage
interface CombatContext {
  enemyName: string;
  roomNumber: number;        // Current room for tier calculation
  intentEffects: IntentEffects;
  itemEffects: ItemEffects;
  wasCharging: boolean;      // Enemy was charging last turn
  playerTriedFlee: boolean;  // Player tried to flee last turn
}

// Generate dynamic resolution based on action with full combat mechanics
function getResolution(action: string, ctx: CombatContext): Resolution {
  // Use ROOM-based tier, not creature-based (depths system)
  const tierMult = getRoomDamageMultiplier(ctx.roomNumber);
  const intentMult = ctx.intentEffects.damageDealtMod;
  const defenseMult = 1 - ctx.itemEffects.defenseBonus;
  const attackMult = 1 + ctx.itemEffects.damageBonus;
  
  // If enemy was charging last turn and player didn't dodge/brace, double damage!
  const chargeMult = ctx.wasCharging && action !== 'dodge' && action !== 'brace' ? 2.0 : 1.0;
  
  // Calculate base enemy damage with all modifiers
  const calcEnemyDamage = (baseDmg: number) => {
    let dmg = baseDmg * tierMult * intentMult * defenseMult * chargeMult;
    return Math.round(dmg);
  };
  
  // Calculate player damage with item bonuses
  const calcPlayerDamage = (baseDmg: number) => {
    let dmg = baseDmg * attackMult;
    // If enemy is defensive, they take less damage
    dmg = dmg * ctx.intentEffects.damageTakenMod;
    return Math.round(dmg);
  };

  switch (action) {
    case 'strike': {
      const baseEnemyHit = 10 + Math.floor(Math.random() * 8); // 10-17 base
      const basePlayerHit = 20 + Math.floor(Math.random() * 10); // 20-29 base
      return {
        narrative: getActionNarration('strike', 'partial'),
        playerDmg: calcEnemyDamage(baseEnemyHit),
        enemyDmg: calcPlayerDamage(basePlayerHit),
      };
    }
    case 'dodge': {
      const dodgeSuccess = Math.random() > 0.3; // 70% success
      // Dodging negates charge damage!
      const baseHit = dodgeSuccess ? 0 : 5 + Math.floor(Math.random() * 5);
      return {
        narrative: getActionNarration('dodge', dodgeSuccess ? 'success' : 'partial'),
        playerDmg: dodgeSuccess ? 0 : calcEnemyDamage(baseHit),
        enemyDmg: 0,
      };
    }
    case 'brace': {
      // Brace heavily reduces damage, and negates charge bonus
      const baseHit = 3 + Math.floor(Math.random() * 5); // 3-7 base
      const bracedDmg = calcEnemyDamage(baseHit) * 0.5; // Brace halves after mods
      return {
        narrative: getActionNarration('brace', 'success'),
        playerDmg: Math.round(bracedDmg),
        enemyDmg: 0,
      };
    }
    case 'herbs': {
      // Herbs now provide full healing with no damage - reward for saving them
      return {
        narrative: getActionNarration('herbs', 'success'),
        playerDmg: 0,
        enemyDmg: 0,
        heal: 30 + Math.floor(Math.random() * 11), // Heal 30-40
        consumeHerbs: true,
      };
    }
    case 'flee': {
      // Base 50% flee chance, modified by intent and items
      const baseFlee = 0.5;
      const fleeChance = Math.min(0.9, Math.max(0.1, 
        baseFlee + ctx.intentEffects.fleeMod + ctx.itemEffects.fleeBonus
      ));
      
      const roll = Math.random();
      if (roll < fleeChance) {
        // Success: escape!
        return {
          narrative: getActionNarration('flee', 'success'),
          playerDmg: 0,
          enemyDmg: 0,
          fleeSuccess: true,
        };
      } else if (roll < fleeChance + 0.3) {
        // Fail with damage
        const baseHit = 5 + Math.floor(Math.random() * 10);
        return {
          narrative: getActionNarration('flee', 'partial'),
          playerDmg: calcEnemyDamage(baseHit),
          enemyDmg: 0,
          fleeSuccess: false,
        };
      } else {
        // Fail but no damage (lucky)
        return {
          narrative: getActionNarration('flee', 'fail'),
          playerDmg: 0,
          enemyDmg: 0,
          fleeSuccess: false,
        };
      }
    }
    default:
      return { narrative: "Nothing happens.", playerDmg: 0, enemyDmg: 0 };
  }
}

function HealthBar({ current, max, color = 'red' }: { current: number; max: number; color?: string }) {
  const pct = current / max;
  const filled = Math.round(pct * 10);
  const empty = 10 - filled;
  const filledColor = color === 'red' ? 'text-[var(--red)]' : 'text-[var(--purple)]';
  const emptyColor = color === 'red' ? 'text-[var(--red-dim)]' : 'text-[var(--purple-dim)]';
  return (
    <span className="font-mono tracking-tighter">
      <span className={filledColor}>{'█'.repeat(filled)}</span>
      <span className={emptyColor}>{'█'.repeat(empty)}</span>
    </span>
  );
}

function StaminaBar({ current, max }: { current: number; max: number }) {
  return (
    <span className="font-mono">
      <span className="text-[var(--blue-bright)]">{'◆'.repeat(current)}</span>
      <span className="text-[var(--blue-dim)]">{'◇'.repeat(max - current)}</span>
    </span>
  );
}

export default function CombatScreen() {
  const router = useRouter();
  const [phase, setPhase] = useState<CombatPhase>('choose');
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [playerHealth, setPlayerHealth] = useState(100);
  const [playerStamina, setPlayerStamina] = useState(3);
  const [playerInventory, setPlayerInventory] = useState<{id: string; name: string; emoji: string}[]>([]);
  const [stakeAmount, setStakeAmount] = useState(0.05);
  const [enemyHealth, setEnemyHealth] = useState(65);
  const [enemyName, setEnemyName] = useState('THE DROWNED');
  const [enemyMaxHealth, setEnemyMaxHealth] = useState(100);
  const [enemyDescription, setEnemyDescription] = useState('');
  const [enemyEmoji, setEnemyEmoji] = useState('👹');
  const [narrative, setNarrative] = useState('');
  const [enemyIntent, setEnemyIntent] = useState({ type: "AGGRESSIVE" as IntentType, description: "Preparing to attack" });
  const [intentEffects, setIntentEffects] = useState<IntentEffects>(getIntentEffects('AGGRESSIVE'));
  const [itemEffects, setItemEffects] = useState<ItemEffects>({ damageBonus: 0, defenseBonus: 0, fleeBonus: 0 });
  const [wasCharging, setWasCharging] = useState(false);
  const [playerTriedFlee, setPlayerTriedFlee] = useState(false);
  const [enemyTier, setEnemyTier] = useState(1);
  const [roomNumber, setRoomNumber] = useState(1);
  const [depthName, setDepthName] = useState('THE UPPER CRYPT');
  const [lastResolution, setLastResolution] = useState<Resolution | null>(null);
  const [loaded, setLoaded] = useState(false);
  
  // Audio
  const { playAmbient, playSFX } = useAudio();
  
  // Play combat ambient on mount
  useEffect(() => {
    playAmbient('ambient-combat');
  }, [playAmbient]);

  // Load game state on mount
  useEffect(() => {
    const state = getGameState();
    setPlayerHealth(state.health);
    setPlayerStamina(state.stamina);
    setPlayerInventory(state.inventory);
    setStakeAmount(state.stakeAmount);
    
    // Set room number and depth info
    const currentRoomNum = state.currentRoom + 1; // 0-indexed to 1-indexed
    setRoomNumber(currentRoomNum);
    const depth = getDepthForRoom(currentRoomNum);
    setDepthName(depth.name);
    setEnemyTier(depth.tier); // Tier based on depth, not creature
    
    // Calculate item effects from inventory
    setItemEffects(getItemEffects(state.inventory));
    
    // Get current room's enemy from dungeon
    if (state.dungeon && state.dungeon[state.currentRoom]) {
      const currentDungeonRoom = state.dungeon[state.currentRoom];
      if (currentDungeonRoom.enemy) {
        const enemyNameRaw = currentDungeonRoom.enemy;
        setEnemyName(enemyNameRaw.toUpperCase());
        
        // Get creature info for stats
        const creatureInfo = getCreatureInfo(enemyNameRaw);
        if (creatureInfo) {
          const health = getCreatureHealth(enemyNameRaw);
          setEnemyHealth(health);
          setEnemyMaxHealth(health);
          setEnemyDescription(creatureInfo.description);
          setEnemyEmoji(creatureInfo.emoji);
          // Note: enemyTier is set based on depth, not creature
          
          // Use creature-specific intent
          const initialIntent = getCreatureIntent(enemyNameRaw);
          setEnemyIntent(initialIntent);
          setIntentEffects(getIntentEffects(initialIntent.type));
        } else {
          // Fallback for unknown creatures
          const initialIntent = getEnemyIntent('AGGRESSIVE');
          setEnemyIntent(initialIntent);
          setIntentEffects(getIntentEffects('AGGRESSIVE'));
        }
        
        // Set narrative from room content
        setNarrative(currentDungeonRoom.narrative || 'A creature blocks your path.');
      }
    } else {
      // Fallback
      setNarrative('A creature rises from the darkness. It blocks your path.');
      const initialIntent = getEnemyIntent('AGGRESSIVE');
      setEnemyIntent(initialIntent);
      setIntentEffects(getIntentEffects('AGGRESSIVE'));
    }
    
    setLoaded(true);
  }, []);

  const handleExecute = () => {
    if (!selectedOption) return;
    
    // Build combat context with all modifiers
    const state = getGameState();
    const currentEnemy = state.dungeon?.[state.currentRoom]?.enemy || 'Unknown';
    const ctx: CombatContext = {
      enemyName: currentEnemy,
      roomNumber: roomNumber,  // For depth-based tier calculation
      intentEffects,
      itemEffects,
      wasCharging,
      playerTriedFlee,
    };
    
    const resolution = getResolution(selectedOption, ctx);
    const option = combatOptions.find(o => o.id === selectedOption);
    
    // Track if player tried to flee (for HUNTING intent)
    setPlayerTriedFlee(selectedOption === 'flee' && !resolution.fleeSuccess);
    
    // Apply effects
    let newPlayerHealth = playerHealth - resolution.playerDmg + (resolution.heal || 0);
    let newEnemyHealth = enemyHealth - resolution.enemyDmg;
    let newStamina = playerStamina - (option?.cost || 0);
    
    // Clamp values
    newPlayerHealth = Math.max(0, Math.min(defaultPlayer.maxHealth, newPlayerHealth));
    newEnemyHealth = Math.max(0, newEnemyHealth);
    newStamina = Math.max(0, newStamina);
    
    // Play SFX FIRST, then update state after short delay for audio sync
    if (selectedOption === 'strike' && resolution.enemyDmg > 0) {
      playSFX('sword-slash');
    } else if (selectedOption === 'dodge') {
      playSFX('footstep'); // Quick movement sound
    } else if (selectedOption === 'herbs') {
      playSFX('heal');
    } else if (selectedOption === 'brace') {
      playSFX('footstep'); // Brace/stance sound
    }
    
    // Delay damage sound and state updates so attack sound plays first
    setTimeout(() => {
      if (resolution.playerDmg > 0) {
        playSFX('damage-taken');
      }
      
      setPlayerHealth(newPlayerHealth);
      setEnemyHealth(newEnemyHealth);
      setPlayerStamina(newStamina);
      setNarrative(resolution.narrative);
      setLastResolution(resolution);
      
      // Remove herbs if used and save immediately
      if (resolution.consumeHerbs) {
        const herbItem = playerInventory.find(i => i.name === 'Herbs');
        if (herbItem) {
          const newInventory = playerInventory.filter(i => i.id !== herbItem.id);
          setPlayerInventory(newInventory);
          // Recalculate item effects after inventory change
          setItemEffects(getItemEffects(newInventory));
          // Save immediately so refresh doesn't restore herbs
          saveGameState({ 
            health: newPlayerHealth, 
            stamina: newStamina,
            inventory: newInventory 
          });
        }
      }
      
      setPhase('resolve');
      setSelectedOption(null);
    }, 250); // 250ms delay lets attack sound play before screen changes
  };

  const handleContinue = () => {
    // Check if flee was successful
    if (lastResolution?.fleeSuccess) {
      // Save state and return to exploration
      saveGameState({ 
        health: playerHealth, 
        stamina: playerStamina,
        inventory: playerInventory 
      });
      playAmbient('ambient-explore');
      router.push('/play');
      return;
    }
    
    if (enemyHealth <= 0) {
      playSFX('enemy-death');
      setPhase('victory');
      setNarrative("The creature collapses. Silence returns to the chamber.\n\nYou catch your breath. The path ahead is clear.");
      return;
    }
    
    if (playerHealth <= 0) {
      // Start death ambient now for seamless transition
      // SFX will play on death page to avoid double-play
      playAmbient('ambient-death');
      setPhase('death');
      setNarrative("The world grows dark. Cold water rises around you.\n\nYour journey ends here.");
      return;
    }
    
    // Track if enemy was charging this turn (for next turn's damage)
    setWasCharging(intentEffects.isCharging);
    
    // Enemy turn - set new intent based on creature type
    const state = getGameState();
    const currentEnemy = state.dungeon?.[state.currentRoom]?.enemy;
    const newIntent = currentEnemy ? getCreatureIntent(currentEnemy) : getEnemyIntent();
    const newIntentEffects = getIntentEffects(newIntent.type);
    setEnemyIntent(newIntent);
    setIntentEffects(newIntentEffects);
    
    // Restore 1 stamina
    setPlayerStamina(Math.min(defaultPlayer.maxStamina, playerStamina + 1));
    
    // Show narrative with intent effect description
    const chargeWarning = newIntentEffects.isCharging ? '\n\n⚠️ IT\'S CHARGING UP!' : '';
    setNarrative(`The ${enemyName} recovers and faces you again.\n\n${newIntentEffects.description}${chargeWarning}`);
    setPhase('choose');
  };

  // Show loading until state is loaded
  if (!loaded) {
    return (
      <div className="min-h-screen bg-[var(--bg-base)] flex items-center justify-center font-mono">
        <div className="text-[var(--amber)] animate-pulse">◈ Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-base)] flex flex-col font-mono">
      
      {/* Enemy Header */}
      <header className="bg-[var(--bg-base)] border-b border-[var(--red-dim)] px-3 py-3 sticky top-0 z-10">
        {/* Depth + Room indicator */}
        <div className="flex items-center gap-2 mb-2 text-[10px]">
          <span className={`px-2 py-0.5 border uppercase tracking-wider ${
            enemyTier === 3 ? 'bg-[var(--purple-dim)]/20 border-[var(--purple-dim)] text-[var(--purple)]' :
            enemyTier === 2 ? 'bg-[var(--amber-dim)]/20 border-[var(--amber-dim)] text-[var(--amber)]' :
            'bg-[var(--text-dim)]/10 border-[var(--border-dim)] text-[var(--text-muted)]'
          }`}>
            ◈ {depthName}
          </span>
          <span className="text-[var(--text-dim)]">Room {roomNumber}</span>
          {DEMO_MODE && (
            <span className="ml-auto px-1.5 py-0.5 bg-[var(--amber-dim)]/30 border border-[var(--amber-dim)] text-[var(--amber)] tracking-wider">
              FREE PLAY
            </span>
          )}
        </div>
        
        {/* Enemy name + emoji + HP */}
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xl drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]">{enemyEmoji}</span>
          <span className="text-[var(--red-bright)] uppercase tracking-wide text-sm font-bold">
            {enemyName}
          </span>
        </div>
        
        {/* Creature description */}
        {enemyDescription && phase === 'choose' && (
          <div className="text-[var(--text-dim)] text-[10px] italic mb-2">
            {enemyDescription}
          </div>
        )}
        
        {/* Health bar with HP counter next to it */}
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <HealthBar current={enemyHealth} max={enemyMaxHealth} />
          </div>
          <span className={`text-xs font-bold whitespace-nowrap ${enemyHealth <= 0 ? 'text-[var(--text-dim)]' : 'text-[var(--red-bright)]'}`}>
            {enemyHealth}/{enemyMaxHealth}
          </span>
        </div>
        
        {/* Intent + Tier - below the bar */}
        {phase === 'choose' && enemyHealth > 0 && (
          <div className="mt-2 text-xs flex items-center gap-2 flex-wrap">
            <span className="text-[var(--text-muted)]">Intent:</span>
            <span className={`px-2 py-0.5 border text-[10px] uppercase tracking-wider ${
              intentEffects.isCharging 
                ? 'bg-[var(--red-dim)]/30 border-[var(--red)] text-[var(--red-bright)] animate-pulse'
                : 'bg-[var(--amber-dim)]/20 border-[var(--amber-dim)] text-[var(--amber-bright)]'
            }`}>
              {enemyIntent.type}
            </span>
            <span className={`px-2 py-0.5 border text-[10px] uppercase tracking-wider ${
              enemyTier === 3 ? 'bg-[var(--purple-dim)]/30 border-[var(--purple)] text-[var(--purple-bright)]' :
              enemyTier === 2 ? 'bg-[var(--amber-dim)]/30 border-[var(--amber)] text-[var(--amber-bright)]' :
              'bg-[var(--text-dim)]/20 border-[var(--text-dim)] text-[var(--text-muted)]'
            }`}>
              TIER {enemyTier}
            </span>
          </div>
        )}
      </header>

      {/* Combat narrative */}
      <main className="flex-1 overflow-y-auto px-3 pt-4 pb-20">
        
        <div className="text-[var(--text-primary)] text-sm leading-relaxed mb-6 whitespace-pre-line">
          {narrative}
        </div>

        {/* Intent callout - only in choose phase */}
        {phase === 'choose' && enemyHealth > 0 && (
          <div className={`p-3 mb-4 border ${
            intentEffects.isCharging 
              ? 'bg-[var(--red-dim)]/20 border-[var(--red)]'
              : wasCharging
              ? 'bg-[var(--red-dim)]/30 border-[var(--red)] animate-pulse'
              : 'bg-[var(--amber-dim)]/20 border-[var(--amber-dim)]'
          }`}>
            <div className={`text-xs uppercase tracking-wider mb-1 ${
              intentEffects.isCharging || wasCharging ? 'text-[var(--red-bright)]' : 'text-[var(--amber-bright)]'
            }`}>
              {wasCharging ? '⚠️ CHARGED ATTACK INCOMING!' : '⚠ Enemy Intent'}
            </div>
            <div className={`text-sm ${
              intentEffects.isCharging || wasCharging ? 'text-[var(--red-bright)]' : 'text-[var(--amber-bright)]'
            }`}>
              {wasCharging ? 'DODGE or BRACE to avoid double damage!' : intentEffects.description}
            </div>
          </div>
        )}

        {/* Combat modifiers display - show which items provide bonuses */}
        {phase === 'choose' && (itemEffects.damageBonus > 0 || itemEffects.defenseBonus > 0 || itemEffects.fleeBonus > 0 || intentEffects.fleeMod !== 0) && (
          <div className="flex gap-2 mb-4 text-[10px] flex-wrap">
            {/* Show each item's combat effect */}
            {playerInventory.map(item => {
              if (item.name === 'Torch') {
                return (
                  <span key={item.id} className="px-2 py-1 bg-[var(--green-dim)]/20 border border-[var(--green-dim)] text-[var(--green-bright)]">
                    🔦 Torch: +25% DMG
                  </span>
                );
              }
              if (item.name === 'Dagger') {
                return (
                  <span key={item.id} className="px-2 py-1 bg-[var(--green-dim)]/20 border border-[var(--green-dim)] text-[var(--green-bright)]">
                    🗡️ Dagger: +35% DMG
                  </span>
                );
              }
              if (item.name === 'Rusty Blade') {
                return (
                  <span key={item.id} className="px-2 py-1 bg-[var(--green-dim)]/20 border border-[var(--green-dim)] text-[var(--green-bright)]">
                    🗡️ Rusty Blade: +20% DMG
                  </span>
                );
              }
              if (item.name === 'Shield' || item.name === 'Tattered Shield') {
                return (
                  <span key={item.id} className="px-2 py-1 bg-[var(--blue-dim)]/20 border border-[var(--blue-dim)] text-[var(--blue-bright)]">
                    🛡️ {item.name}: -25% DMG
                  </span>
                );
              }
              if (item.name === 'Cloak') {
                return (
                  <span key={item.id} className="px-2 py-1 bg-[var(--purple-dim)]/20 border border-[var(--purple-dim)] text-[var(--purple-bright)]">
                    🧥 Cloak: +15% FLEE
                  </span>
                );
              }
              return null;
            })}
            {/* Show flee modifier from enemy intent */}
            {intentEffects.fleeMod !== 0 && (
              <span className={`px-2 py-1 border ${
                intentEffects.fleeMod >= 0 
                  ? 'bg-[var(--purple-dim)]/20 border-[var(--purple-dim)] text-[var(--purple-bright)]'
                  : 'bg-[var(--red-dim)]/20 border-[var(--red-dim)] text-[var(--red-bright)]'
              }`}>
                {intentEffects.fleeMod >= 0 ? '🏃' : '⚠️'} Intent: {intentEffects.fleeMod >= 0 ? '+' : ''}{Math.round(intentEffects.fleeMod * 100)}% FLEE
              </span>
            )}
          </div>
        )}

        {/* Resolution phase */}
        {phase === 'resolve' && lastResolution && (
          <div className="mb-4">
            {/* Damage summary */}
            <div className="flex justify-center gap-8 mb-4">
              {lastResolution.enemyDmg > 0 && (
                <div className="flex items-center gap-2">
                  <pre className="text-[var(--green)] text-xs leading-none">{`  />
 /> 
/>`}</pre>
                  <div>
                    <span className="text-[var(--green-bright)] text-2xl font-bold">{lastResolution.enemyDmg}</span>
                    <span className="text-[var(--green)] text-sm ml-1">dealt</span>
                  </div>
                </div>
              )}
              {lastResolution.playerDmg > 0 && (
                <div className="flex items-center gap-2">
                  <pre className="text-[var(--red)] text-xs leading-none">{`\\|/
-*-
/|\\`}</pre>
                  <div>
                    <span className="text-[var(--red-bright)] text-2xl font-bold">{lastResolution.playerDmg}</span>
                    <span className="text-[var(--red)] text-sm ml-1">taken</span>
                  </div>
                </div>
              )}
              {lastResolution.heal && lastResolution.heal > 0 && (
                <div className="flex items-center gap-2">
                  <pre className="text-[var(--green)] text-xs leading-none">{` _ 
|+|
 ¯`}</pre>
                  <div>
                    <span className="text-[var(--green-bright)] text-2xl font-bold">{lastResolution.heal}</span>
                    <span className="text-[var(--green)] text-sm ml-1">healed</span>
                  </div>
                </div>
              )}
              {lastResolution.enemyDmg === 0 && lastResolution.playerDmg === 0 && !lastResolution.heal && (
                <div className="flex items-center gap-2">
                  <pre className="text-[var(--blue-bright)] text-xs leading-none">{` ~ 
~*~
 ~`}</pre>
                  <div>
                    <span className="text-[var(--blue-bright)] text-xl font-bold">EVADE</span>
                  </div>
                </div>
              )}
            </div>
            
            <button 
              onClick={handleContinue}
              className="w-full py-3 bg-[var(--bg-surface)] border border-[var(--border-default)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all"
            >
              ▶ Continue
            </button>
          </div>
        )}

        {/* Victory phase */}
        {phase === 'victory' && (
          <div className="text-center">
            <div className="text-[var(--green)] text-2xl mb-4">⚔️ VICTORY</div>
            <button 
              onClick={async () => {
                // Advance room on server first (anti-cheat) - skip in demo mode
                const state = getGameState();
                if (!DEMO_MODE && state.sessionToken) {
                  try {
                    const response = await fetch('/api/session/advance', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        sessionToken: state.sessionToken,
                        fromRoom: state.currentRoom + 1, // 1-indexed
                      }),
                    });
                    if (!response.ok) {
                      console.error('Failed to advance room on server');
                    }
                  } catch (err) {
                    console.error('Advance API error:', err);
                  }
                }
                // Save state and return to game
                saveGameState({
                  health: playerHealth,
                  stamina: Math.min(defaultPlayer.maxStamina, playerStamina + 1),
                  currentRoom: state.currentRoom + 1,
                  inventory: playerInventory,
                });
                window.location.href = '/play';
              }}
              className="px-6 py-3 bg-[var(--green)]/20 border border-[var(--green)] text-[var(--green-bright)] hover:bg-[var(--green)]/30 transition-all"
            >
              ▶ Continue to Next Room
            </button>
          </div>
        )}

        {/* Death phase */}
        {phase === 'death' && (
          <div className="text-center">
            <div className="text-[var(--red)] text-2xl mb-4">☠ DEFEATED</div>
            <button 
              onClick={() => window.location.href = '/death'}
              className="px-6 py-3 bg-[var(--red)]/20 border border-[var(--red)] text-[var(--red-bright)] hover:bg-[var(--red)]/30 transition-all"
            >
              ▶ Face Your End
            </button>
          </div>
        )}

        {/* Combat Actions - only in choose phase */}
        {phase === 'choose' && enemyHealth > 0 && (
          <>
            <div className="text-[var(--text-secondary)] text-xs mb-2 uppercase tracking-wider">
              ▼ Choose Your Action
            </div>
            <div className="grid grid-cols-2 gap-2 mb-4">
              {combatOptions.map((option) => {
                const canAfford = option.cost <= playerStamina;
                // Hide herbs if not in inventory
                const hasHerbs = playerInventory.some(i => i.name === 'Herbs');
                if (option.id === 'herbs' && !hasHerbs) {
                  return null;
                }
                return (
                  <button
                    key={option.id}
                    onClick={() => canAfford && setSelectedOption(option.id)}
                    disabled={!canAfford}
                    className={`text-left px-3 py-2.5 text-sm transition-all ${
                      selectedOption === option.id
                        ? 'bg-[var(--amber-dim)]/30 border border-[var(--amber)] text-[var(--amber-bright)]'
                        : canAfford
                        ? 'bg-[var(--bg-surface)] border border-[var(--border-dim)] text-[var(--text-secondary)] active:bg-[var(--bg-elevated)]'
                        : 'bg-[var(--bg-base)] border border-[var(--border-dim)] text-[var(--text-dim)] opacity-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span>{option.emoji} {option.text}</span>
                      {option.cost > 0 && (
                        <span className="text-[var(--blue-bright)] text-xs">⚡{option.cost}</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Confirm button */}
            {selectedOption && (
              <button 
                onClick={handleExecute}
                className="w-full py-3 bg-[var(--red-dim)]/30 border border-[var(--red)] text-[var(--red-bright)] hover:bg-[var(--red-dim)]/50 transition-all"
              >
                ▶ Execute
              </button>
            )}
          </>
        )}

      </main>

      {/* Player stats footer */}
      <footer className="bg-[var(--bg-base)] border-t border-[var(--border-dim)] px-3 py-2 sticky bottom-0">
        <div className="flex items-center justify-between text-xs mb-2">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <span className="text-[var(--red)]">♥</span>
              <HealthBar current={playerHealth} max={defaultPlayer.maxHealth} />
              <span className={`text-[10px] ${playerHealth < 30 ? 'text-[var(--red-bright)] animate-pulse' : 'text-[var(--red-bright)]'}`}>
                {playerHealth}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[var(--blue)]">⚡</span>
              <StaminaBar current={playerStamina} max={defaultPlayer.maxStamina} />
            </div>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[var(--amber)]">◎</span>
            <span className="text-[var(--amber-bright)]">{stakeAmount} SOL</span>
          </div>
        </div>
        
        <div className="flex items-center gap-2 text-xs overflow-x-auto">
          <span className="text-[var(--text-dim)]">🎒</span>
          {playerInventory.map((item) => (
            <span 
              key={item.id} 
              className="text-[var(--text-muted)] bg-[var(--bg-surface)] px-2 py-0.5 whitespace-nowrap"
            >
              {item.emoji} {item.name}
            </span>
          ))}
        </div>
      </footer>

    </div>
  );
}
