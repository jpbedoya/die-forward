import { useState, useEffect } from 'react';
import { View, Text, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useGame } from '../lib/GameContext';
import { useAudio } from '../lib/audio';
import {
  getCreatureForRoom,
  getCreatureHealth,
  getCreatureIntent,
  getIntentEffects,
  getItemEffects,
  getRoomDamageMultiplier,
  getDepthForRoom,
  getStrikeNarration,
  getDodgeNarration,
  getBraceNarration,
  getFleeNarration,
  IntentType,
  IntentEffects,
  CreatureInfo,
} from '../lib/content';

type CombatPhase = 'choose' | 'resolve' | 'victory' | 'death';

const COMBAT_OPTIONS = [
  { id: 'strike', text: 'Strike', cost: 1, emoji: '⚔️', desc: 'Attack the enemy' },
  { id: 'dodge', text: 'Dodge', cost: 1, emoji: '💨', desc: 'Evade the attack' },
  { id: 'brace', text: 'Brace', cost: 0, emoji: '🛡️', desc: 'Reduce damage' },
  { id: 'flee', text: 'Flee', cost: 1, emoji: '🏃', desc: 'Try to escape' },
];

function HealthBar({ current, max, color = 'red' }: { current: number; max: number; color?: string }) {
  const pct = Math.max(0, current / max);
  const filled = Math.round(pct * 10);
  const empty = 10 - filled;
  const filledClass = color === 'red' ? 'text-blood' : 'text-ethereal';
  const emptyClass = color === 'red' ? 'text-blood-dark' : 'text-purple-900';
  return (
    <Text className="font-mono tracking-tighter">
      <Text className={filledClass}>{'█'.repeat(filled)}</Text>
      <Text className={emptyClass}>{'█'.repeat(empty)}</Text>
    </Text>
  );
}

export default function CombatScreen() {
  const game = useGame();
  const { playSFX, playAmbient } = useAudio();
  const params = useLocalSearchParams<{ enemy?: string; roomNum?: string }>();
  
  const [phase, setPhase] = useState<CombatPhase>('choose');
  const [creature, setCreature] = useState<CreatureInfo | null>(null);
  const [enemyHealth, setEnemyHealth] = useState(65);
  const [enemyMaxHealth, setEnemyMaxHealth] = useState(65);
  const [enemyIntent, setEnemyIntent] = useState<{ type: IntentType; description: string }>({ 
    type: 'AGGRESSIVE', 
    description: 'Preparing to attack' 
  });
  const [intentEffects, setIntentEffects] = useState<IntentEffects>(getIntentEffects('AGGRESSIVE'));
  const [wasCharging, setWasCharging] = useState(false);
  const [narrative, setNarrative] = useState('');
  const [playerDmgTaken, setPlayerDmgTaken] = useState(0);
  const [enemyDmgTaken, setEnemyDmgTaken] = useState(0);

  const roomNumber = parseInt(params.roomNum || '1', 10);
  const depth = getDepthForRoom(roomNumber);

  // Initialize combat
  useEffect(() => {
    playAmbient('ambient-combat');
    
    // Get creature for this room's tier
    const roomCreature = getCreatureForRoom(roomNumber);
    setCreature(roomCreature);
    
    const hp = getCreatureHealth(roomCreature.name);
    setEnemyHealth(hp);
    setEnemyMaxHealth(hp);
    
    const intent = getCreatureIntent(roomCreature.name);
    setEnemyIntent(intent);
    setIntentEffects(getIntentEffects(intent.type));
    
    playSFX('enemy-growl');
  }, [roomNumber]);

  // Calculate damage
  const calculateDamage = (base: number, isPlayerAttacking: boolean) => {
    const tierMult = getRoomDamageMultiplier(roomNumber);
    const itemEffects = getItemEffects(game.inventory);
    
    if (isPlayerAttacking) {
      return Math.round(base * (1 + itemEffects.damageBonus) * intentEffects.damageTakenMod);
    } else {
      const chargeMult = wasCharging ? 2.0 : 1.0;
      return Math.round(base * tierMult * intentEffects.damageDealtMod * (1 - itemEffects.defenseBonus) * chargeMult);
    }
  };

  // Handle combat action
  const handleAction = (action: string) => {
    const option = COMBAT_OPTIONS.find(o => o.id === action);
    if (!option) return;
    
    // Check stamina
    if (option.cost > game.stamina) {
      playSFX('error-buzz');
      return;
    }
    
    // Spend stamina
    if (option.cost > 0) {
      game.setStamina(game.stamina - option.cost);
    }
    
    let playerDmg = 0;
    let enemyDmg = 0;
    let fleeSuccess = false;
    let actionNarrative = '';
    
    switch (action) {
      case 'strike': {
        playSFX('sword-slash');
        const basePlayerHit = 20 + Math.floor(Math.random() * 10);
        const baseEnemyHit = 10 + Math.floor(Math.random() * 8);
        playerDmg = calculateDamage(baseEnemyHit, false);
        enemyDmg = calculateDamage(basePlayerHit, true);
        actionNarrative = getStrikeNarration('mutual');
        break;
      }
      case 'dodge': {
        playSFX('dodge-whoosh');
        const success = Math.random() > 0.3;
        if (success) {
          playerDmg = 0;
          actionNarrative = getDodgeNarration('success');
        } else {
          playerDmg = calculateDamage(5 + Math.floor(Math.random() * 5), false);
          actionNarrative = getDodgeNarration('close');
        }
        break;
      }
      case 'brace': {
        playSFX('brace-impact');
        const baseDmg = 3 + Math.floor(Math.random() * 5);
        playerDmg = Math.round(calculateDamage(baseDmg, false) * 0.5);
        actionNarrative = getBraceNarration('success');
        break;
      }
      case 'flee': {
        playSFX('flee-run');
        const itemEffects = getItemEffects(game.inventory);
        const fleeChance = Math.min(0.9, Math.max(0.1, 0.5 + intentEffects.fleeMod + itemEffects.fleeBonus));
        fleeSuccess = Math.random() < fleeChance;
        
        if (fleeSuccess) {
          actionNarrative = getFleeNarration('success');
        } else {
          playerDmg = calculateDamage(5 + Math.floor(Math.random() * 10), false);
          actionNarrative = getFleeNarration('hurt');
          playSFX('flee-fail');
        }
        break;
      }
    }
    
    // Apply damage
    const newEnemyHealth = Math.max(0, enemyHealth - enemyDmg);
    const newPlayerHealth = Math.max(0, game.health - playerDmg);
    
    setEnemyHealth(newEnemyHealth);
    setEnemyDmgTaken(enemyDmg);
    game.setHealth(newPlayerHealth);
    setPlayerDmgTaken(playerDmg);
    setNarrative(actionNarrative);
    
    // Check outcomes
    if (fleeSuccess) {
      playSFX('footstep');
      setPhase('resolve');
      setTimeout(() => {
        game.advance();
        router.replace('/play');
      }, 1500);
      return;
    }
    
    if (newPlayerHealth <= 0) {
      playSFX('player-death');
      setPhase('death');
      setTimeout(() => {
        router.replace({ pathname: '/death', params: { killedBy: creature?.name } });
      }, 2000);
      return;
    }
    
    if (newEnemyHealth <= 0) {
      playSFX('enemy-death');
      setPhase('victory');
      setTimeout(() => {
        game.advance();
        router.replace('/play');
      }, 2000);
      return;
    }
    
    // Continue combat - new enemy intent
    setPhase('resolve');
    setWasCharging(intentEffects.isCharging);
    
    setTimeout(() => {
      const newIntent = getCreatureIntent(creature?.name || 'The Drowned');
      setEnemyIntent(newIntent);
      setIntentEffects(getIntentEffects(newIntent.type));
      setPhase('choose');
      game.setStamina(Math.min(3, game.stamina + 1));
    }, 1500);
  };

  if (!creature) {
    return (
      <View className="flex-1 bg-crypt-bg justify-center items-center">
        <ActivityIndicator size="large" color="#f59e0b" />
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-crypt-bg">
      {/* Header */}
      <View className="flex-row items-center justify-between px-3 py-2 border-b border-amber/30">
        <Text className="text-amber text-xs font-mono">◈ {depth.name}</Text>
        <Text className="text-bone-dark text-xs font-mono">COMBAT</Text>
      </View>

      <ScrollView className="flex-1" contentContainerClassName="p-4">
        {/* Enemy Card */}
        <View className="bg-crypt-surface border border-crypt-border p-4 mb-4">
          <View className="flex-row items-center gap-3 mb-3">
            <Text className="text-4xl">{creature.emoji}</Text>
            <View className="flex-1">
              <Text className="text-bone text-lg font-mono font-bold">{creature.name}</Text>
              <Text className="text-bone-dark text-xs font-mono">Tier {creature.tier}</Text>
            </View>
          </View>
          
          {/* Enemy Health */}
          <View className="flex-row items-center gap-2 mb-2">
            <Text className="text-blood text-sm">♥</Text>
            <HealthBar current={enemyHealth} max={enemyMaxHealth} />
            <Text className="text-blood-light text-sm font-mono font-bold">{enemyHealth}/{enemyMaxHealth}</Text>
          </View>
          
          {/* Enemy Intent */}
          <View className={`p-2 border-l-2 ${intentEffects.isCharging ? 'border-amber bg-amber/10' : 'border-ethereal bg-ethereal/10'}`}>
            <Text className={`text-xs font-mono ${intentEffects.isCharging ? 'text-amber' : 'text-ethereal'}`}>
              {intentEffects.description}
            </Text>
          </View>
        </View>

        {/* Combat Narrative */}
        {narrative && (
          <View className="bg-amber/10 border-2 border-amber p-4 mb-4">
            <Text className="text-amber-light text-sm font-mono">{narrative}</Text>
            {playerDmgTaken > 0 && (
              <Text className="text-blood text-xs font-mono mt-2">You took {playerDmgTaken} damage</Text>
            )}
            {enemyDmgTaken > 0 && (
              <Text className="text-victory text-xs font-mono mt-1">Enemy took {enemyDmgTaken} damage</Text>
            )}
          </View>
        )}

        {/* Victory/Death Messages */}
        {phase === 'victory' && (
          <View className="bg-victory/20 border-2 border-victory p-4 mb-4">
            <Text className="text-victory text-lg font-mono font-bold text-center">VICTORY!</Text>
            <Text className="text-victory-light text-sm font-mono text-center mt-2">
              {creature.name} has fallen.
            </Text>
          </View>
        )}
        
        {phase === 'death' && (
          <View className="bg-blood/20 border-2 border-blood p-4 mb-4">
            <Text className="text-blood text-lg font-mono font-bold text-center">DEFEATED</Text>
            <Text className="text-blood-light text-sm font-mono text-center mt-2">
              You have fallen to {creature.name}.
            </Text>
          </View>
        )}

        {/* Combat Options */}
        {phase === 'choose' && (
          <View className="mt-4">
            <Text className="text-bone-dark text-xs font-mono tracking-widest mb-3">▼ CHOOSE ACTION</Text>
            {COMBAT_OPTIONS.map((option) => {
              const canUse = game.stamina >= option.cost;
              return (
                <Pressable
                  key={option.id}
                  className={`flex-row items-center bg-crypt-surface border-l-2 py-4 px-3 mb-2 ${
                    canUse ? 'border-amber active:bg-amber/10' : 'border-crypt-border opacity-50'
                  }`}
                  onPress={() => canUse && handleAction(option.id)}
                  disabled={!canUse}
                >
                  <Text className="text-2xl mr-3">{option.emoji}</Text>
                  <View className="flex-1">
                    <Text className={`font-mono font-bold ${canUse ? 'text-bone' : 'text-bone-dark'}`}>
                      {option.text}
                    </Text>
                    <Text className="text-bone-dark text-xs font-mono">{option.desc}</Text>
                  </View>
                  {option.cost > 0 && (
                    <Text className="text-blue-400 text-xs font-mono">⚡{option.cost}</Text>
                  )}
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Footer - Player Stats */}
      <View className="border-t border-crypt-border p-3 bg-crypt-bg">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-2">
            <Text className="text-blood">♥</Text>
            <HealthBar current={game.health} max={100} />
            <Text className={`text-sm font-mono font-bold ${game.health < 30 ? 'text-blood' : 'text-blood-light'}`}>
              {game.health}
            </Text>
          </View>
          <View className="flex-row items-center gap-2">
            <Text className="text-blue-400">⚡</Text>
            <Text className="text-blue-400 font-mono">
              {'◆'.repeat(game.stamina)}{'◇'.repeat(3 - game.stamina)}
            </Text>
          </View>
          <View className="flex-row items-center gap-1">
            <Text className="text-amber">◎</Text>
            <Text className="text-amber font-mono font-bold">
              {game.stakeAmount > 0 ? `${game.stakeAmount}` : 'FREE'}
            </Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}
