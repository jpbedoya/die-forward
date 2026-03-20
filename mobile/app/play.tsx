import { useState, useEffect } from 'react';
import { View, Text, Pressable, ScrollView, Alert, Platform, ViewStyle, Image, Modal } from 'react-native';
import { getCreatureAsset, getCreatureAssetByName } from '../lib/creatureAssets';
import { Icons } from '../lib/iconAssets';
import { AsciiLoader } from '../components/AsciiLoader';
import { CryptBackground } from '../components/CryptBackground';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useGame } from '../lib/GameContext';
import { useAudio, getZoneAmbient, useAtmosphericTriggers } from '../lib/audio';
import { useCorpsesForRoom, discoverCorpse, recordTip, useGameSettings, useCurrentPlayer, Corpse } from '../lib/instant';
import { ProgressBar } from '../components/ProgressBar';
import { GameMenu, MenuButton } from '../components/GameMenu';
import { MiniPlayer } from '../components/MiniPlayer';
import { AudioToggle } from '../components/AudioToggle';
import { CRTOverlay } from '../components/CRTOverlay';
import { getDepthForRoom, DungeonRoom, getItemDetails, getCreatureInfo, CreatureInfo, rollRandomItem, getItemEffects } from '../lib/content';
import { getMilestonePerks } from '../lib/milestones';
import { useUnifiedWallet, type Address } from '../lib/wallet/unified';
import { ItemModal, CreatureModal } from '../components/CryptModal';

function HealthBar({ current, max }: { current: number; max: number }) {
  const filled = Math.round((current / max) * 8);
  return (
    <Text className="font-mono tracking-tighter">
      <Text className="text-blood">{'█'.repeat(filled)}</Text>
      <Text className="text-blood-dark">{'█'.repeat(8 - filled)}</Text>
    </Text>
  );
}

export default function PlayScreen() {
  const game = useGame();
  const wallet = useUnifiedWallet();
  const { playSFX, playAmbient } = useAudio();
  const { settings } = useGameSettings();
  const { player } = useCurrentPlayer();

  const [message, setMessage] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [showCorpse, setShowCorpse] = useState(false);
  const [lootedCorpse, setLootedCorpse] = useState<Corpse | null>(null);
  const [tipping, setTipping] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<{ name: string; emoji: string } | null>(null);
  const [lastFoundItem, setLastFoundItem] = useState<{ name: string; emoji: string } | null>(null);
  const [selectedCreature, setSelectedCreature] = useState<CreatureInfo | null>(null);
  const [modifierExpanded, setModifierExpanded] = useState(false);

  // Handle tipping a corpse
  const handleTip = async (corpse: Corpse) => {
    if (!wallet.connected || tipping) return;
    
    const tipAmount = 0.01; // 0.01 SOL tip
    
    setTipping(true);
    try {
      await wallet.sendSOL(corpse.walletAddress as Address, tipAmount);
      await recordTip(corpse.id, tipAmount, wallet.address!);
      playSFX('tip-chime');
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      setMessage(`Tipped @${corpse.playerName} ◎ ${tipAmount} SOL`);
    } catch (e) {
      console.error('Tip failed:', e);
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
      Alert.alert('Tip Failed', 'Could not send tip. Please try again.');
    } finally {
      setTipping(false);
    }
  };

  // Safe access to game state
  const dungeon = game.dungeon || [];
  const currentRoom = game.currentRoom || 0;
  const room = dungeon[currentRoom] as DungeonRoom | undefined;
  const roomNumber = currentRoom + 1;
  const depth = getDepthForRoom(roomNumber);

  // Fetch real corpses from InstantDB
  const { corpses: nearbyCorpses } = useCorpsesForRoom(depth.name, roomNumber);
  const realCorpse = nearbyCorpses?.[0] || null;

  // Play zone-specific ambient when entering
  useEffect(() => {
    playAmbient(getZoneAmbient(game.zoneId, 'explore'));
  }, [game.zoneId]);

  // Atmospheric trigger SFX — random world sounds during exploration
  useAtmosphericTriggers(game.zoneId, true);

  // Redirect if no session (delay to ensure layout is mounted)
  useEffect(() => {
    if (!game.sessionToken && dungeon.length === 0) {
      // Small delay to ensure Root Layout is mounted before navigating
      const timeout = setTimeout(() => {
        router.replace('/stake');
      }, 100);
      return () => clearTimeout(timeout);
    }
  }, [game.sessionToken, dungeon.length]);

  // Get narrative from room content
  const getNarrative = (): string => {
    if (!room) return 'Darkness surrounds you...';
    if (room.content?.narrative) return room.content.narrative;
    // Fallback for old dungeon format
    return (room as any).narrative || 'You proceed deeper into the crypt.';
  };

  const renderNarrative = () => {
    const text = getNarrative();
    return <Text className="text-bone text-base font-mono leading-6 mb-4">{text}</Text>;
  };

  const handleAction = async (action: string) => {
    if (processing) return;
    setProcessing(true);
    setMessage(null);

    try {
      switch (action) {
        case 'explore':
        case 'explore-primary':
          playSFX('footstep');
          await game.advance();
          break;

        case 'explore-secondary': {
          playSFX('footstep');
          const roll = game.rng ? game.rng.random() : Math.random();
          if (roll < 0.55) {
            // Risk paid off — find a random item
            const rngFn = game.rng ? () => game.rng!.random() : () => Math.random();
            // Fix 8: exclude Soulstone until 50-death milestone
            const perks = getMilestonePerks(player?.totalDeaths ?? 0);
            const excludes = perks.soulstoneUnlocked ? [] : ['Soulstone'];
            const itemName = rollRandomItem(rngFn, undefined, excludes);
            const itemDetails = getItemDetails(itemName);
            const newItem = {
              id: Date.now().toString(),
              name: itemName,
              emoji: itemDetails?.emoji || '❓',
            };
            game.addToInventory(newItem);
            game.incrementItemsFound();
            setLastFoundItem({ name: newItem.name, emoji: newItem.emoji });
            setMessage(`Found: ${newItem.emoji} ${newItem.name}`);
          } else if (roll < 0.85) {
            // Fix 5: "nothing" branch — show a contextual message instead of silently advancing
            const nothingMessages = [
              'You find nothing of interest.',
              'The room offers no reward. You press on.',
              'Dust and silence. Nothing here.',
              'Whatever was here is long gone.',
            ];
            const msgIdx = game.rng
              ? Math.floor(game.rng.random() * nothingMessages.length)
              : Math.floor(Math.random() * nothingMessages.length);
            setMessage(nothingMessages[msgIdx]);
          } else {
            // Danger — take 8–15 damage
            const dmg = game.rng
              ? game.rng.range(8, 15)
              : 8 + Math.floor(Math.random() * 8);
            const newHp = game.health - dmg;
            // BUG 1 FIX: set health BEFORE calling checkDeathSave so the guard
            // (prev.health > 0) sees the correct (fatal) value.
            game.setHealth(newHp);
            if (newHp <= 0) {
              const save = game.checkDeathSave();
              if (save.saved) {
                setMessage(save.message || "Death's Mantle shatters — you survive with 1 HP!");
              } else {
                playSFX('player-death');
                router.replace({ pathname: '/death', params: { killedBy: 'The darkness' } });
                return;
              }
            } else {
              setMessage(`You take ${dmg} damage!`);
            }
          }
          break;
        }

        case 'explore-tertiary': {
          if (game.stamina < 1) {
            setMessage('Not enough stamina.');
            break;
          }
          playSFX('footstep');
          game.setStamina(game.stamina - 1);
          // Intel: peek at the next room
          const nextRoomIndex = currentRoom + 1;
          const nextRoom = dungeon[nextRoomIndex] as DungeonRoom | undefined;
          let intelMsg = 'You read the signs ahead. The path continues.';
          if (nextRoom) {
            switch (nextRoom.type) {
              case 'combat':
                intelMsg = `You sense a presence beyond. ${nextRoom.content?.enemy ? `Something called ${nextRoom.content.enemy} waits.` : 'Danger waits.'}`;
                break;
              case 'corpse':
                intelMsg = 'A scent of death lingers ahead. Someone fell here.';
                break;
              case 'cache':
                intelMsg = 'You hear a faint echo ahead. Supplies may remain.';
                break;
              case 'exit':
                intelMsg = 'You feel the air change. The exit draws near.';
                break;
              default:
                intelMsg = 'The path ahead seems passable. Stay alert.';
            }
          }
          setMessage(`[Intel] ${intelMsg}`);
          break;
        }

        case 'combat':
          // Navigate to full combat screen
          router.push({
            pathname: '/combat',
            params: { 
              enemy: room?.content?.enemy || 'The Drowned',
              roomNum: String(roomNumber)
            }
          });
          break;

        case 'flee': {
          playSFX('flee-run');
          const fleeItemEffects = getItemEffects(game.inventory);
          const rawFleeDamage = game.rng ? game.rng.range(5, 19) : Math.floor(Math.random() * 15) + 5;
          // Fix 5 (Revy): fleeBonus items (Bone Hook, Cloak, Pale Coin) reduce flee damage
          const fleeDamage = Math.round(rawFleeDamage * (1 - (fleeItemEffects.fleeBonus ?? 0)));
          const newHealth = game.health - fleeDamage;
          
          // BUG 1 FIX: set health BEFORE checkDeathSave so it sees the fatal value
          game.setHealth(newHealth);

          if (newHealth <= 0) {
            const save = game.checkDeathSave();
            if (save.saved) {
              setMessage(save.message || "Death's Mantle shatters — you survive with 1 HP!");
              playSFX('flee-fail');
              break;
            }
            playSFX('player-death');
            router.replace({ pathname: '/death', params: { killedBy: room?.content?.enemy } });
            return;
          }
          
          setMessage(`Escaped! -${fleeDamage} HP`);
          playSFX('flee-fail');
          break;
        }

        case 'loot': {
          playSFX('corpse-discover');
          
          // Fix 6: apply Death's Echo modifier to corpse chance
          const rawLootChance = roomNumber >= 9
            ? settings.lootChanceDepth9
            : roomNumber >= 5
              ? settings.lootChanceDepth5
              : settings.lootChanceBase;
          // Fix 5 (Revy): also stack item corpseBonus (Eye of the Hollow)
          const lootItemEffects = getItemEffects(game.inventory);
          const lootChance = Math.min(1, game.getModifiedCorpseChance(rawLootChance) + (lootItemEffects.corpseBonus ?? 0));
          
          const foundLoot = game.rng ? game.rng.chance(lootChance) : Math.random() < lootChance;
          
          if (realCorpse) {
            setLootedCorpse(realCorpse);
            setShowCorpse(true);
            
            if (foundLoot && realCorpse.loot !== 'Nothing' && !game.inventory.some(i => i.name === realCorpse.loot)) {
              playSFX('loot-discover');
              game.addToInventory({ 
                id: Date.now().toString(), 
                name: realCorpse.loot, 
                emoji: realCorpse.lootEmoji 
              });
              game.incrementItemsFound();
              setLastFoundItem({ name: realCorpse.loot, emoji: realCorpse.lootEmoji });
              setMessage(`Found: ${realCorpse.lootEmoji} ${realCorpse.loot}`);
            } else {
              setMessage('The corpse has nothing you need.');
            }
            
            if (game.walletAddress) {
              discoverCorpse(realCorpse.id, game.walletAddress).catch(console.error);
            }
          } else {
            if (foundLoot) {
              const rngFn = game.rng ? () => game.rng!.random() : () => Math.random();
              // Fix 8: exclude Soulstone until 50-death milestone
              const lootPerks = getMilestonePerks(player?.totalDeaths ?? 0);
              const lootExcludes = lootPerks.soulstoneUnlocked ? [] : ['Soulstone'];
              const itemName = rollRandomItem(rngFn, undefined, lootExcludes);
              const itemDetails = getItemDetails(itemName);
              const loot = { name: itemName, emoji: itemDetails?.emoji || '❓' };
              
              if (!game.inventory.some(i => i.name === loot.name)) {
                playSFX('loot-discover');
                game.addToInventory({ id: Date.now().toString(), ...loot });
                game.incrementItemsFound();
                setLastFoundItem({ name: loot.name, emoji: loot.emoji });
                setMessage(`Found: ${loot.emoji} ${loot.name}`);
              } else {
                setMessage('Nothing new here.');
              }
            } else {
              setMessage('Nothing useful here.');
            }
          }
          
          // Don't auto-advance - let player read corpse message and choose to continue
          break;
        }
        
        case 'loot-continue': {
          // Player chose to continue after looting
          setShowCorpse(false);
          setLootedCorpse(null);
          setMessage(null);
          await game.advance();
          break;
        }

        case 'heal': {
          playSFX('heal');
          // Fix 2 (Revy): use applyHealing so Blood Pact penalty and HP cap apply
          const healed = game.applyHealing(30);
          game.incrementItemsFound();
          setMessage(`Found supplies. +${healed} HP`);
          break;
        }

        case 'victory':
          playSFX('victory-fanfare');
          router.replace('/victory');
          break;

        case 'continue':
          await game.advance();
          setMessage(null);
          break;
      }
    } finally {
      setProcessing(false);
    }
  };

  // Get options based on room type
  const getOptions = () => {
    if (!room) return [];
    
    switch (room.type) {
      case 'explore': {
        const contentOpts = room.content?.options;
        if (contentOpts && contentOpts.length > 0) {
          const opts = [];
          if (contentOpts[0]) opts.push({ id: '1', text: contentOpts[0], action: 'explore-primary', tag: null as string | null });
          if (contentOpts[1]) opts.push({ id: '2', text: contentOpts[1], action: 'explore-secondary', tag: '[RISK]' as string | null });
          if (contentOpts[2]) {
            opts.push({ id: '3', text: contentOpts[2], action: 'explore-tertiary', tag: '[1⚡]' as string | null });
          } else {
            // Fix 11: always include tertiary (intel scout) even if zone only has 2 authored options
            opts.push({ id: '3', text: 'Observe carefully', action: 'explore-tertiary', tag: '[1⚡]' as string | null });
          }
          return opts;
        }
        return [{ id: '1', text: 'Press forward', action: 'explore-primary', tag: null as string | null }];
      }
      case 'combat':
        return [
          { id: '1', text: 'Enter combat', action: 'combat', icon: 'strike' },
          { id: '2', text: 'Try to flee', action: 'flee', icon: 'flee' },
        ];
      case 'corpse':
        return [
          { id: '1', text: 'Search the body', action: 'loot' },
          { id: '2', text: 'Pay respects and move on', action: 'explore' },
        ];
      case 'cache':
        return [
          { id: '1', text: '🌿 Take supplies (+30 HP)', action: 'heal' },
          { id: '2', text: 'Continue deeper', action: 'explore' },
        ];
      case 'exit':
        return [
          { id: '1', text: '🌟 Ascend to victory!', action: 'victory' },
        ];
      default:
        return [{ id: '1', text: 'Continue', action: 'explore' }];
    }
  };

  // Loading state
  if (!room) {
    return (
      <View className="flex-1 bg-crypt-bg justify-center items-center">
        <AsciiLoader width={16} color="#f59e0b" style={{ fontSize: 16 }} />
        <Text className="text-amber text-sm font-mono mt-4">Loading dungeon...</Text>
      </View>
    );
  }

  const options = getOptions();

  // Use dvh for mobile web, fallback to 100% for native
  const containerStyle = (Platform.OS === 'web'
    ? { height: '100dvh', maxHeight: '100dvh', display: 'flex', flexDirection: 'column' as const, overflow: 'hidden' as const }
    : { flex: 1 }) as ViewStyle;

  return (
    <CryptBackground screen="play" style={containerStyle}>
      <SafeAreaView style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: 'transparent' }} edges={['top', 'bottom']}>
        {/* Header */}
        <View className="flex-row items-center justify-between px-3 py-2 border-b border-amber/30" style={{ flexShrink: 0 }}>
          <View className="flex-row items-center gap-2">
            <MenuButton onPress={() => setMenuOpen(true)} />
          </View>
          <View className="flex-row items-center gap-1">
            <AudioToggle ambientTrack="ambient-explore" inline />
            <ProgressBar current={roomNumber} total={dungeon.length} />
          </View>
        </View>

        {/* Zone name + modifier row */}
        <View className="flex-row items-center justify-between px-4 pt-2 pb-1" style={{ flexShrink: 0 }}>
          <Text className={`text-base font-mono ${
            depth.tier === 1 ? 'text-amber' : depth.tier === 2 ? 'text-amber-light' : 'text-ethereal'
          }`}>
            ◈ {depth.name}
          </Text>
          {game.currentModifier && (
            <Pressable
              onPress={() => setModifierExpanded(v => !v)}
              style={{ backgroundColor: 'rgba(245,158,11,0.12)', borderWidth: 1, borderColor: 'rgba(245,158,11,0.4)', borderRadius: 3, paddingHorizontal: 6, paddingVertical: 2 }}
            >
              <Text style={{ color: '#f59e0b', fontFamily: 'monospace', fontSize: 14 }}>
                {game.currentModifier.emoji} {game.currentModifier.name}
              </Text>
            </Pressable>
          )}
        </View>

        {/* Modifier expanded description */}
        {game.currentModifier && modifierExpanded && (
          <View style={{ backgroundColor: 'rgba(245,158,11,0.08)', borderBottomWidth: 1, borderBottomColor: 'rgba(245,158,11,0.3)', paddingHorizontal: 12, paddingVertical: 6 }}>
            <Text style={{ color: '#d97706', fontFamily: 'monospace', fontSize: 11 }}>
              {game.currentModifier.description}
            </Text>
          </View>
        )}

        {/* Game Menu */}
        <GameMenu isOpen={menuOpen} onClose={() => setMenuOpen(false)} />

        {/* Main content */}
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
        {/* Boss warning for room 12 */}
        {room.boss && (
          <View className="bg-blood/20 border-2 border-blood p-3 mb-4">
            <Text className="text-blood text-center font-mono font-bold">⚠️ BOSS ENCOUNTER ⚠️</Text>
          </View>
        )}

        {/* Narrative */}
        {renderNarrative()}

        {/* Corpse discovery - show fallen player in purple BEFORE looting */}
        {room.type === 'corpse' && realCorpse && !showCorpse && (
          <View className="bg-crypt-surface border-l-2 border-ethereal p-4 mb-4">
            <Text className="text-ethereal text-base font-mono font-bold mb-2">
              💀 @{realCorpse.playerName}
            </Text>
            <View className="bg-black/30 p-3 mb-2">
              <Text className="text-bone-muted text-sm font-mono italic">
                "{realCorpse.finalMessage}"
              </Text>
            </View>
            <Text className="text-bone-dark text-xs font-mono">
              They fell here. Their belongings remain...
            </Text>
          </View>
        )}

        {/* Fallback corpse message when no real corpse data */}
        {room.type === 'corpse' && !realCorpse && !showCorpse && (
          <View className="bg-crypt-surface border-l-2 border-ethereal p-4 mb-4">
            <Text className="text-ethereal text-sm font-mono">
              💀 An unknown wanderer lies here, their story lost to the depths.
            </Text>
          </View>
        )}

        {/* Enemy preview for combat rooms — tap to inspect */}
        {room.type === 'combat' && room.content?.enemy && (() => {
          const c = getCreatureInfo(room.content.enemy);
          const asset = c
            ? (c.artUrl ? getCreatureAsset(c.artUrl) : getCreatureAssetByName(c.name))
            : null;
          return (
            <Pressable
              className="bg-crypt-surface border border-blood/30 p-3 mb-4 active:border-blood active:bg-blood/10"
              onPress={() => {
                if (c) { playSFX('ui-click'); setSelectedCreature(c); }
              }}
            >
              <View className="flex-row items-center gap-3">
                {/* Creature art thumbnail */}
                {asset ? (
                  <Image
                    source={asset}
                    style={{ width: 56, height: 72, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(180,30,30,0.35)' }}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={{ width: 56, height: 72, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(180,30,30,0.35)', alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontSize: 32 }}>{room.content.enemyEmoji || '👁️'}</Text>
                  </View>
                )}
                {/* Text to the right */}
                <View className="flex-1">
                  <Text className="text-blood-light text-sm font-mono font-bold mb-1">{room.content.enemy}</Text>
                  <Text className="text-blood-dark text-xs font-mono">blocks your path...</Text>
                  <Text className="text-bone-muted text-xs font-mono mt-1">[tap to inspect]</Text>
                </View>
              </View>
            </Pressable>
          );
        })()}

        {/* Message */}
        {message && (
          message.startsWith('Found:') && lastFoundItem ? (
            <Pressable
              className="bg-amber/20 border-2 border-amber p-4 mb-4 active:border-amber-bright active:bg-amber/30"
              onPress={() => {
                playSFX('ui-click');
                setSelectedItem(lastFoundItem);
              }}
            >
              <View className="flex-row items-center justify-between">
                <Text className="text-amber-light text-sm font-mono">✦ {message}</Text>
                <Text className="text-amber-dark text-xs font-mono ml-2">[tap]</Text>
              </View>
            </Pressable>
          ) : (
            <View className="bg-amber/20 border-2 border-amber p-4 mb-4">
              <Text className="text-amber-light text-sm font-mono">✦ {message}</Text>
            </View>
          )
        )}

        {/* Corpse card */}
        {showCorpse && lootedCorpse && (
          <View className="bg-crypt-surface border border-ethereal p-4 mb-4">
            <View className="flex-row items-center gap-3 mb-3">
              <Text className="text-3xl">💀</Text>
              <View className="flex-1">
                <Text className="text-ethereal text-base font-mono font-bold">@{lootedCorpse.playerName}</Text>
                <Text className="text-blood text-[10px] font-mono tracking-widest">FALLEN</Text>
              </View>
              {/* Tip button */}
              {game.walletConnected && !lootedCorpse.tipped && (
                <Pressable
                  className={`px-3 py-2 border border-amber ${tipping ? 'opacity-50' : 'active:bg-amber/10'}`}
                  onPress={() => handleTip(lootedCorpse)}
                  disabled={tipping}
                >
                  {tipping ? (
                    <AsciiLoader variant="pulse" color="#f59e0b" style={{ fontSize: 12 }} />
                  ) : (
                    <Text className="text-amber text-xs font-mono">💰 TIP</Text>
                  )}
                </Pressable>
              )}
              {lootedCorpse.tipped && (
                <Text className="text-victory text-xs font-mono">✓ Tipped</Text>
              )}
            </View>
            <View className="bg-black/30 border-l-2 border-ethereal p-3 mb-3">
              <Text className="text-bone text-sm font-mono italic">"{lootedCorpse.finalMessage}"</Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-bone-dark text-xs font-mono">They carried:</Text>
              <Text className="text-amber-light text-xs font-mono">{lootedCorpse.lootEmoji} {lootedCorpse.loot}</Text>
            </View>
          </View>
        )}

        {/* Divider */}
        <Text className="text-crypt-border-light text-xs font-mono text-center mb-4">────────────────────────</Text>

        {/* Options */}
        <Text className="text-bone-dark text-[10px] font-mono tracking-widest mb-3">▼ WHAT DO YOU DO?</Text>
        {showCorpse ? (
          // Show continue button after looting corpse (player controls when to advance)
          <Pressable
            className="flex-row items-center bg-crypt-surface border-l-2 border-amber py-4 px-3"
            onPress={() => handleAction('loot-continue')}
            disabled={processing}
          >
            <Text className="text-bone-dark text-sm font-mono mr-2">▶</Text>
            <Text className="text-bone text-sm font-mono">Continue deeper...</Text>
          </Pressable>
        ) : message ? (
          <Pressable
            className="flex-row items-center bg-crypt-surface border-l-2 border-amber py-4 px-3"
            onPress={() => handleAction('continue')}
            disabled={processing}
          >
            <Text className="text-bone-dark text-sm font-mono mr-2">▶</Text>
            <Text className="text-bone text-sm font-mono">Continue...</Text>
          </Pressable>
        ) : (
          options.map((option) => {
            const tag = (option as any).tag as string | null | undefined;
            const isRisk = tag === '[RISK]';
            const isTertiary = tag === '[1⚡]';
            return (
              <Pressable
                key={option.id}
                className={`bg-crypt-surface border-l-2 py-4 px-3 mb-2 ${isRisk ? 'border-blood/60 active:border-blood active:bg-blood/5' : isTertiary ? 'border-blue-700/60 active:border-blue-500 active:bg-blue-900/10' : 'border-crypt-border-light active:border-amber active:bg-amber/5'} ${processing ? 'opacity-50' : ''}`}
                onPress={() => handleAction(option.action)}
                disabled={processing}
              >
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center flex-1">
                    {(option as any).icon && (
                      <Image
                        source={(Icons as any)[(option as any).icon]}
                        style={{ width: 20, height: 20, marginRight: 8 }}
                        resizeMode="contain"
                      />
                    )}
                    <Text className="text-bone text-sm font-mono flex-1">{option.text}</Text>
                  </View>
                  {tag && (
                    <Text className={`text-xs font-mono ml-2 ${isRisk ? 'text-blood' : isTertiary ? 'text-blue-400' : 'text-amber'}`}>
                      {tag}
                    </Text>
                  )}
                </View>
              </Pressable>
            );
          })
        )}
      </ScrollView>

      {/* Footer */}
      <View className="border-t border-crypt-border p-3 bg-crypt-bg" style={{ flexShrink: 0 }}>
        <View className="flex-row items-center justify-between mb-3">
          <View className="flex-row items-center gap-2">
            <Image source={Icons.heart} style={{ width: 26, height: 26, alignSelf: "center" }} resizeMode="contain" />
            <HealthBar current={game.health} max={100} />
            <Text className={`text-sm font-mono font-bold ${game.health < 30 ? 'text-blood' : 'text-blood-light'}`}>
              {game.health}
            </Text>
          </View>
          <View className="flex-row items-center gap-2">
            <Image source={Icons.stamina} style={{ width: 24, height: 24, alignSelf: "center" }} resizeMode="contain" />
            <Text className="text-blue-400 font-mono">
              {'◆'.repeat(game.stamina)}{'◇'.repeat(Math.max(0, settings.staminaPool - game.stamina))}
            </Text>
          </View>
          <View className="flex-row items-center gap-1">
            <Text className="text-amber">◎</Text>
            <Text className="text-amber font-mono font-bold">
              {game.stakeAmount > 0 ? `${game.stakeAmount} SOL` : 'FREE'}
            </Text>
          </View>
        </View>

        {/* Inventory - clickable items */}
        <View className="flex-row items-center">
          <Text className="text-bone-dark text-xs font-mono mr-2">ITEMS</Text>
          <ScrollView horizontal style={{ flex: 1 }} showsHorizontalScrollIndicator={false}>
            {game.inventory.length > 0 ? (
              game.inventory.map((item) => (
                <Pressable 
                  key={item.id} 
                  className="bg-crypt-surface border border-crypt-border py-1 px-2 mr-2 active:border-amber"
                  onPress={() => {
                    playSFX('ui-click');
                    setSelectedItem(item);
                  }}
                >
                  <View className="flex-row items-center">
                    <Image source={Icons.backpack} style={{ width: 14, height: 14, marginRight: 4 }} resizeMode="contain" />
                    <Text className="text-bone-muted text-xs font-mono">{item.name}</Text>
                  </View>
                </Pressable>
              ))
            ) : (
              <Text className="text-stone-600 text-xs font-mono italic">None</Text>
            )}
          </ScrollView>
        </View>

        <MiniPlayer />
      </View>

      {/* Inventory Full / Swap Modal */}
      <Modal
        visible={!!game.pendingItem}
        transparent
        animationType="fade"
        onRequestClose={() => game.dismissPendingItem()}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', padding: 24 }}>
          <View style={{ width: '100%', maxWidth: 340, backgroundColor: '#0d0d0d', borderWidth: 1, borderColor: '#f59e0b', padding: 0, overflow: 'hidden' }}>
            {/* Header */}
            <View style={{ backgroundColor: '#1a0a00', borderBottomWidth: 1, borderBottomColor: '#f59e0b', padding: 12 }}>
              <Text style={{ color: '#f59e0b', fontFamily: 'monospace', fontSize: 12, textAlign: 'center', letterSpacing: 2 }}>
                ▓ INVENTORY FULL (4/4) ▓
              </Text>
            </View>

            {/* Found item */}
            {game.pendingItem && (
              <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: '#2a2a2a' }}>
                <Text style={{ color: '#9ca3af', fontFamily: 'monospace', fontSize: 10, letterSpacing: 1, marginBottom: 6 }}>FOUND</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <Text style={{ fontSize: 28 }}>{game.pendingItem.emoji}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: '#e5e0d0', fontFamily: 'monospace', fontSize: 14, fontWeight: 'bold' }}>
                      {game.pendingItem.name}
                    </Text>
                    {game.pendingItem.rarity && (
                      <Text style={{ fontFamily: 'monospace', fontSize: 10, letterSpacing: 1, color: game.pendingItem.rarity === 'legendary' ? '#fbbf24' : game.pendingItem.rarity === 'rare' ? '#a78bfa' : game.pendingItem.rarity === 'uncommon' ? '#6ee7b7' : '#9ca3af' }}>
                        {game.pendingItem.rarity.toUpperCase()}
                      </Text>
                    )}
                  </View>
                </View>
                {game.pendingItem.effect && (
                  <Text style={{ color: '#9ca3af', fontFamily: 'monospace', fontSize: 11, fontStyle: 'italic' }}>
                    {game.pendingItem.effect}
                  </Text>
                )}
              </View>
            )}

            {/* Swap options */}
            <View style={{ padding: 12 }}>
              <Text style={{ color: '#6b7280', fontFamily: 'monospace', fontSize: 10, textAlign: 'center', letterSpacing: 2, marginBottom: 8 }}>
                ── SWAP FOR ──
              </Text>
              {game.inventory.map((item, idx) => {
                const details = getItemDetails(item.name);
                return (
                  <Pressable
                    key={item.id}
                    style={({ pressed }) => ({
                      flexDirection: 'row',
                      alignItems: 'center',
                      padding: 10,
                      marginBottom: 4,
                      borderWidth: 1,
                      borderColor: pressed ? '#f59e0b' : '#2a2a2a',
                      backgroundColor: pressed ? 'rgba(245,158,11,0.05)' : 'transparent',
                    })}
                    onPress={() => {
                      playSFX('ui-click');
                      game.swapItem(idx);
                    }}
                  >
                    <Text style={{ fontSize: 18, marginRight: 8 }}>{item.emoji}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: '#e5e0d0', fontFamily: 'monospace', fontSize: 12 }}>{item.name}</Text>
                      {details?.rarity && (
                        <Text style={{ color: '#6b7280', fontFamily: 'monospace', fontSize: 10 }}>
                          {details.rarity}
                        </Text>
                      )}
                    </View>
                    <Text style={{ color: '#6b7280', fontFamily: 'monospace', fontSize: 10 }}>SWAP ▶</Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Dismiss */}
            <Pressable
              style={({ pressed }) => ({
                margin: 12,
                marginTop: 0,
                padding: 12,
                borderWidth: 1,
                borderColor: '#4b5563',
                backgroundColor: pressed ? '#1a1a1a' : 'transparent',
                alignItems: 'center',
              })}
              onPress={() => {
                playSFX('ui-click');
                game.dismissPendingItem();
              }}
            >
              <Text style={{ color: '#9ca3af', fontFamily: 'monospace', fontSize: 12 }}>Leave it</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Item Detail Modal */}
      <ItemModal
        visible={!!selectedItem}
        onClose={() => setSelectedItem(null)}
        item={selectedItem ? {
          ...selectedItem,
          description: getItemDetails(selectedItem.name)?.description,
          effect: getItemDetails(selectedItem.name)?.effect,
          type: getItemDetails(selectedItem.name)?.type,
          artUrl: getItemDetails(selectedItem.name)?.artUrl,
        } : null}
        onUse={() => {
          if (!selectedItem) return;
          const name = selectedItem.name;
          if (name === 'Herbs') {
            const baseHeal = game.rng ? game.rng.range(25, 40) : Math.floor(Math.random() * 15) + 25;
            // Fix 2 (Revy): use applyHealing so Blood Pact penalty and HP cap apply
            const healed = game.applyHealing(baseHeal);
            setMessage(`You apply the herbs. +${healed} HP.`);
            playSFX('heal');
          } else if (name === 'Pale Rations') {
            game.setStamina(Math.min(settings.staminaPool, game.stamina + 1));
            setMessage('You eat quickly. Stamina restored.');
            playSFX('loot-discover');
          } else if (name === 'Bone Dust') {
            setMessage('The dust reveals hidden signs. Your path feels clearer.');
            playSFX('ui-click');
          }
          game.removeFromInventory((selectedItem as any).id);
          setSelectedItem(null);
        }}
      />

      {/* Creature Detail Modal */}
      <CreatureModal
        visible={!!selectedCreature}
        onClose={() => setSelectedCreature(null)}
        creature={selectedCreature}
      />
      </SafeAreaView>
      <CRTOverlay />
    </CryptBackground>
  );
}
