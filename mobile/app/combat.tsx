import { useState, useEffect, useRef } from 'react';
import { View, Text, Pressable, ScrollView, Animated, Platform } from 'react-native';
import { AsciiLoader } from '../components/AsciiLoader';
import { CryptBackground } from '../components/CryptBackground';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useGame } from '../lib/GameContext';
import { ProgressBar } from '../components/ProgressBar';
import { GameMenu, MenuButton } from '../components/GameMenu';
import { MiniPlayer } from '../components/MiniPlayer';
import { AudioToggle } from '../components/AudioToggle';
import { CRTOverlay } from '../components/CRTOverlay';
import { CreatureModal, ItemModal } from '../components/CryptModal';
import { useAudio } from '../lib/audio';
import { useGameSettings, DEFAULT_GAME_SETTINGS } from '../lib/instant';
import {
  getCreatureForRoom,
  getCreatureInfo,
  getCreatureHealth,
  getCreatureIntent,
  getIntentEffects,
  getItemEffects,
  getItemDetails,
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
  const { settings } = useGameSettings();
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
  const [menuOpen, setMenuOpen] = useState(false);
  const [creatureModalOpen, setCreatureModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<{ id: string; name: string; emoji: string } | null>(null);
  
  // Screen shake animation
  const shakeAnim = useRef(new Animated.Value(0)).current;
  
  const triggerShake = (intensity: 'light' | 'medium' | 'heavy' = 'medium') => {
    const magnitude = intensity === 'heavy' ? 15 : intensity === 'medium' ? 8 : 4;
    
    // Haptic feedback
    if (Platform.OS !== 'web') {
      const hapticType = intensity === 'heavy' 
        ? Haptics.ImpactFeedbackStyle.Heavy 
        : intensity === 'medium' 
          ? Haptics.ImpactFeedbackStyle.Medium 
          : Haptics.ImpactFeedbackStyle.Light;
      Haptics.impactAsync(hapticType);
    }
    
    // Screen shake
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: magnitude, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -magnitude, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: magnitude * 0.6, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -magnitude * 0.6, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  };

  const roomNumber = parseInt(params.roomNum || '1', 10);
  const depth = getDepthForRoom(roomNumber);

  // Initialize combat
  useEffect(() => {
    playAmbient('ambient-combat');
    
    // Use the enemy passed from play screen, or fallback to random
    const enemyName = params.enemy;
    let roomCreature: CreatureInfo | null = null;
    
    if (enemyName) {
      // Look up creature by name from BESTIARY
      roomCreature = getCreatureInfo(enemyName);
    }
    
    // Fallback to random creature for this tier if not found
    if (!roomCreature) {
      roomCreature = getCreatureForRoom(roomNumber);
    }
    
    setCreature(roomCreature);
    
    const hp = getCreatureHealth(roomCreature.name);
    setEnemyHealth(hp);
    setEnemyMaxHealth(hp);
    
    const intent = getCreatureIntent(roomCreature.name);
    setEnemyIntent(intent);
    setIntentEffects(getIntentEffects(intent.type));
    
    playSFX('enemy-growl');
  }, [roomNumber, params.enemy]);

  // Calculate damage using admin settings
  const calculateDamage = (base: number, isPlayerAttacking: boolean) => {
    // Use tier multiplier from settings
    const tier = depth.tier;
    const tierMult = tier === 3 ? settings.tier3Multiplier : tier === 2 ? settings.tier2Multiplier : 1.0;
    const itemEffects = getItemEffects(game.inventory);
    
    if (isPlayerAttacking) {
      return Math.round(base * (1 + itemEffects.damageBonus) * intentEffects.damageTakenMod);
    } else {
      const chargeMult = wasCharging ? 2.0 : 1.0;
      return Math.round(base * tierMult * intentEffects.damageDealtMod * (1 - itemEffects.defenseBonus) * chargeMult);
    }
  };
  
  // Get base damage range from settings
  const getBaseDamage = () => {
    const min = settings.baseDamageMin;
    const max = settings.baseDamageMax;
    return min + Math.floor(Math.random() * (max - min + 1));
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
        // Player damage uses settings range, enemy counter-attack is lower
        const basePlayerHit = getBaseDamage();
        const baseEnemyHit = Math.floor(getBaseDamage() * 0.6);
        playerDmg = calculateDamage(baseEnemyHit, false);
        enemyDmg = calculateDamage(basePlayerHit, true);
        
        // Critical hit chance from settings
        const isCritical = Math.random() < settings.criticalChance;
        if (isCritical) {
          enemyDmg = Math.round(enemyDmg * settings.criticalMultiplier);
          actionNarrative = getStrikeNarration('success');
          playSFX('critical-hit');
        } else {
          actionNarrative = getStrikeNarration('mutual');
          playSFX(enemyDmg >= 25 ? 'critical-hit' : 'sword-slash');
        }
        break;
      }
      case 'dodge': {
        playSFX('dodge-whoosh');
        const success = Math.random() < settings.dodgeSuccessRate;
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
        playerDmg = Math.round(calculateDamage(baseDmg, false) * (1 - settings.braceReduction));
        actionNarrative = getBraceNarration('success');
        break;
      }
      case 'flee': {
        playSFX('flee-run');
        const itemEffects = getItemEffects(game.inventory);
        const fleeChance = Math.min(0.9, Math.max(0.1, settings.fleeChanceBase + intentEffects.fleeMod + itemEffects.fleeBonus));
        const cleanRatio = settings.fleeCleanRatio;
        const roll = Math.random();
        
        if (roll < fleeChance * cleanRatio) {
          // Clean escape
          fleeSuccess = true;
          actionNarrative = getFleeNarration('success');
        } else if (roll < fleeChance) {
          // Escaped but took damage
          fleeSuccess = true;
          playerDmg = calculateDamage(5 + Math.floor(Math.random() * 8), false);
          actionNarrative = getFleeNarration('hurt');
          triggerShake('light');
          // Light haptic for getting clipped while fleeing
          if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }
        } else {
          // Failed to escape
          fleeSuccess = false;
          playerDmg = calculateDamage(8 + Math.floor(Math.random() * 12), false);
          actionNarrative = getFleeNarration('fail');
          playSFX('flee-fail');
          triggerShake('medium');
          // Haptic for failed escape
          if (Platform.OS !== 'web') {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          }
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
    
    // Screen shake + haptics on damage
    if (playerDmg > 0) {
      const intensity = playerDmg >= 20 ? 'heavy' : playerDmg >= 10 ? 'medium' : 'light';
      triggerShake(intensity);
      // Haptic feedback for taking damage
      if (Platform.OS !== 'web') {
        const hapticStyle = playerDmg >= 20 
          ? Haptics.ImpactFeedbackStyle.Heavy 
          : playerDmg >= 10 
            ? Haptics.ImpactFeedbackStyle.Medium 
            : Haptics.ImpactFeedbackStyle.Light;
        Haptics.impactAsync(hapticStyle);
      }
    }
    
    // Check outcomes
    // IMPORTANT: death check must come before flee success.
    // Edge case: player can "successfully flee" but still die from flee damage.
    if (newPlayerHealth <= 0) {
      playSFX('player-death');
      triggerShake('heavy');
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
      setPhase('death');
      setTimeout(() => {
        router.replace({ pathname: '/death', params: { killedBy: creature?.name } });
      }, 2000);
      return;
    }

    if (fleeSuccess) {
      playSFX('footstep');
      setPhase('resolve');
      setTimeout(() => {
        game.advance();
        router.replace('/play');
      }, 1500);
      return;
    }
    
    if (newEnemyHealth <= 0) {
      playSFX('enemy-death');
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
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
      game.setStamina(Math.min(3, game.stamina + settings.staminaRegen));
    }, 1500);
  };

  if (!creature) {
    return (
      <View className="flex-1 bg-crypt-bg justify-center items-center">
        <AsciiLoader width={16} color="#f59e0b" style={{ fontSize: 16 }} />
      </View>
    );
  }

  // Use dvh for mobile web, fallback to 100% for native
  const containerStyle = Platform.OS === 'web' 
    ? { height: '100dvh', maxHeight: '100dvh', display: 'flex', flexDirection: 'column' as const, overflow: 'hidden' as const }
    : { flex: 1 };

  return (
    <CryptBackground screen="combat" style={containerStyle}>
      <SafeAreaView style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: 'transparent' }} edges={['top', 'bottom']}>
        <Animated.View 
          style={{ transform: [{ translateX: shakeAnim }], flex: 1, display: 'flex', flexDirection: 'column' }}
        >
          {/* Header */}
          <View className="flex-row items-center justify-between px-3 py-2 border-b border-amber/30" style={{ flexShrink: 0 }}>
            <View className="flex-row items-center gap-2">
              <MenuButton onPress={() => setMenuOpen(true)} />
              <Text className="text-amber text-xs font-mono">◈ {depth.name}</Text>
            </View>
            <View className="flex-row items-center gap-1">
              <AudioToggle ambientTrack="ambient-combat" inline onSettingsPress={() => setMenuOpen(true)} />
              <ProgressBar current={roomNumber} total={13} />
            </View>
          </View>

          {/* Game Menu */}
          <GameMenu isOpen={menuOpen} onClose={() => setMenuOpen(false)} />

          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
        {/* Enemy Card — tap header to inspect creature */}
        <View className="bg-crypt-surface border border-crypt-border p-4 mb-4">
          <Pressable
            className="flex-row items-center gap-3 mb-3 active:opacity-70"
            onPress={() => setCreatureModalOpen(true)}
          >
            <Text className="text-4xl">{creature.emoji}</Text>
            <View className="flex-1">
              <Text className="text-bone text-lg font-mono font-bold">{creature.name}</Text>
              <Text className="text-bone-dark text-xs font-mono">Tier {creature.tier} · tap to inspect</Text>
            </View>
            <Text className="text-bone-dark text-xs font-mono">[?]</Text>
          </Pressable>
          
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
          <View className="bg-amber/10 border-2 border-amber mb-4">
            {/* Narrative text */}
            <View className="p-4 pb-3">
              <Text className="text-amber-light text-sm font-mono">{narrative}</Text>
            </View>
            
            {/* Damage summary - separated, bigger, centered */}
            {(playerDmgTaken > 0 || enemyDmgTaken > 0) && (
              <View className="border-t border-amber/30 py-4">
                {enemyDmgTaken > 0 && (
                  <Text className="text-victory text-lg font-mono font-bold text-center">
                    YOU DEALT {enemyDmgTaken}
                  </Text>
                )}
                {playerDmgTaken > 0 && (
                  <Text className="text-blood text-lg font-mono font-bold text-center mt-1">
                    YOU TOOK {playerDmgTaken}
                  </Text>
                )}
              </View>
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

        {/* Combat Options - 2x2 Grid */}
        {phase === 'choose' && (
          <View className="mt-4">
            <Text className="text-bone-dark text-xs font-mono tracking-widest mb-3">▼ CHOOSE ACTION</Text>
            <View className="flex-row flex-wrap justify-between">
              {COMBAT_OPTIONS.map((option) => {
                const canUse = game.stamina >= option.cost;
                return (
                  <Pressable
                    key={option.id}
                    className={`bg-crypt-surface border py-3 px-3 mb-2 ${
                      canUse ? 'border-amber active:bg-amber/10' : 'border-crypt-border opacity-50'
                    }`}
                    style={{ width: '48%' }}
                    onPress={() => canUse && handleAction(option.id)}
                    disabled={!canUse}
                  >
                    <View className="flex-row items-center justify-between">
                      <View className="flex-row items-center">
                        <Text className="text-xl mr-2">{option.emoji}</Text>
                        <Text className={`font-mono font-bold ${canUse ? 'text-bone' : 'text-bone-dark'}`}>
                          {option.text}
                        </Text>
                      </View>
                      {option.cost > 0 && (
                        <Text className="text-blue-400 text-xs font-mono">⚡{option.cost}</Text>
                      )}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}
      </ScrollView>

          {/* Footer - Player Stats (sticky bottom) */}
          <View className="border-t border-crypt-border p-3 bg-crypt-bg" style={{ flexShrink: 0, flexGrow: 0 }}>
            <View className="flex-row items-center justify-between mb-3">
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
            
            {/* Inventory */}
            <View className="flex-row items-center">
              <Text className="text-bone-dark text-xs font-mono mr-2">ITEMS</Text>
              <ScrollView horizontal style={{ flex: 1 }} showsHorizontalScrollIndicator={false}>
                {game.inventory.length > 0 ? (
                  game.inventory.map((item) => (
                    <Pressable
                      key={item.id}
                      className="bg-crypt-surface border border-crypt-border py-1 px-2 mr-2 active:border-amber"
                      onPress={() => { playSFX('ui-click'); setSelectedItem(item); }}
                    >
                      <Text className="text-bone-muted text-xs font-mono">{item.emoji} {item.name}</Text>
                    </Pressable>
                  ))
                ) : (
                  <Text className="text-stone-600 text-xs font-mono italic">None</Text>
                )}
              </ScrollView>
            </View>

            <MiniPlayer />
          </View>

          <CreatureModal
            visible={creatureModalOpen}
            onClose={() => setCreatureModalOpen(false)}
            creature={creature}
          />

          <ItemModal
            visible={!!selectedItem}
            onClose={() => setSelectedItem(null)}
            item={selectedItem ? {
              ...selectedItem,
              description: getItemDetails(selectedItem.name)?.description,
              effect: getItemDetails(selectedItem.name)?.effect,
              type: getItemDetails(selectedItem.name)?.type,
            } : null}
            onUse={() => {
              if (!selectedItem) return;
              const name = selectedItem.name;
              if (name === 'Herbs') {
                const heal = Math.floor(Math.random() * 15) + 25; // 25-40 HP
                game.setHealth(Math.min(100, game.health + heal));
                setNarrative(`You quickly apply the herbs. Wounds close. +${heal} HP.`);
                playSFX('heal');
              } else if (name === 'Pale Rations') {
                game.setStamina(Math.min(3, game.stamina + 1));
                setNarrative('You eat quickly. Strength returns to your legs.');
                playSFX('loot-discover');
              } else if (name === 'Bone Dust') {
                setNarrative('The dust swirls. Your senses sharpen — you feel the creature\'s next move.');
                playSFX('ui-click');
              }
              game.removeFromInventory(selectedItem.id);
            }}
          />
        </Animated.View>
      </SafeAreaView>
      <CRTOverlay />
    </CryptBackground>
  );
}
