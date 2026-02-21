import { useState, useEffect } from 'react';
import { View, Text, Pressable, ScrollView, Alert, Platform } from 'react-native';
import { AsciiLoader } from '../components/AsciiLoader';
import { CryptBackground } from '../components/CryptBackground';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useGame } from '../lib/GameContext';
import { useAudio } from '../lib/audio';
import { useCorpsesForRoom, discoverCorpse, recordTip, useGameSettings, Corpse } from '../lib/instant';
import { ProgressBar } from '../components/ProgressBar';
import { GameMenu, MenuButton } from '../components/GameMenu';
import { MiniPlayer } from '../components/MiniPlayer';
import { AudioToggle } from '../components/AudioToggle';
import { CRTOverlay } from '../components/CRTOverlay';
import { getDepthForRoom, DungeonRoom, getItemDetails, getCreatureInfo, CreatureInfo } from '../lib/content';
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
  const [message, setMessage] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [showCorpse, setShowCorpse] = useState(false);
  const [lootedCorpse, setLootedCorpse] = useState<Corpse | null>(null);
  const [tipping, setTipping] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<{ name: string; emoji: string } | null>(null);
  const [lastFoundItem, setLastFoundItem] = useState<{ name: string; emoji: string } | null>(null);
  const [selectedCreature, setSelectedCreature] = useState<CreatureInfo | null>(null);

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

  // Play ambient when entering
  useEffect(() => {
    playAmbient('ambient-explore');
  }, []);

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
          playSFX('footstep');
          await game.advance();
          break;

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
          const fleeDamage = Math.floor(Math.random() * 15) + 5;
          const newHealth = game.health - fleeDamage;
          
          if (newHealth <= 0) {
            game.setHealth(0);
            playSFX('player-death');
            router.replace({ pathname: '/death', params: { killedBy: room?.content?.enemy } });
            return;
          }
          
          game.setHealth(newHealth);
          setMessage(`Escaped! -${fleeDamage} HP`);
          playSFX('flee-fail');
          
          setTimeout(async () => {
            await game.advance();
            setMessage(null);
          }, 1500);
          break;
        }

        case 'loot': {
          playSFX('corpse-discover');
          
          // Calculate loot chance based on depth
          const lootChance = roomNumber >= 9 
            ? settings.lootChanceDepth9 
            : roomNumber >= 5 
              ? settings.lootChanceDepth5 
              : settings.lootChanceBase;
          
          const foundLoot = Math.random() < lootChance;
          
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
              const lootItems = [
                { name: 'Herbs', emoji: '🌿' },
                { name: 'Bone Charm', emoji: '💀' },
                { name: 'Rusty Blade', emoji: '🗡️' },
              ];
              const loot = lootItems[Math.floor(Math.random() * lootItems.length)];
              
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

        case 'heal':
          playSFX('heal');
          game.setHealth(Math.min(100, game.health + 30));
          game.incrementItemsFound();
          setMessage('Found supplies. +30 HP');
          
          setTimeout(async () => {
            await game.advance();
            setMessage(null);
          }, 1500);
          break;

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
      case 'explore':
        return [
          { id: '1', text: 'Press forward', action: 'explore' },
        ];
      case 'combat':
        return [
          { id: '1', text: '⚔️ Enter combat', action: 'combat' },
          { id: '2', text: '🏃 Try to flee', action: 'flee' },
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
  const containerStyle = Platform.OS === 'web' 
    ? { height: '100dvh', maxHeight: '100dvh', display: 'flex', flexDirection: 'column' as const, overflow: 'hidden' as const }
    : { flex: 1 };

  return (
    <CryptBackground screen="play" style={containerStyle}>
      <SafeAreaView style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: 'transparent' }} edges={['top']}>
        {/* Header */}
        <View className="flex-row items-center justify-between px-3 py-2 border-b border-amber/30" style={{ flexShrink: 0 }}>
          <View className="flex-row items-center gap-2">
            <MenuButton onPress={() => setMenuOpen(true)} />
            <Text className={`text-xs font-mono tracking-wider ${
              depth.tier === 1 ? 'text-amber' : depth.tier === 2 ? 'text-amber-light' : 'text-ethereal'
            }`}>
              ◈ {depth.name}
            </Text>
            {/* empty-handed tag removed */}
          </View>
          <View className="flex-row items-center gap-1">
            <AudioToggle ambientTrack="ambient-explore" inline onSettingsPress={() => setMenuOpen(true)} />
            <ProgressBar current={roomNumber} total={dungeon.length} />
          </View>
        </View>

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
        {room.type === 'combat' && room.content?.enemy && (
          <Pressable
            className="bg-crypt-surface border border-blood/30 p-3 mb-4 active:border-blood active:bg-blood/10"
            onPress={() => {
              const c = getCreatureInfo(room.content!.enemy!);
              if (c) {
                playSFX('ui-click');
                setSelectedCreature(c);
              }
            }}
          >
            <View className="flex-row items-center justify-between">
              <Text className="text-blood-light text-sm font-mono">
                {room.content.enemyEmoji || '👁️'} {room.content.enemy} blocks your path...
              </Text>
              <Text className="text-blood-dark text-xs font-mono ml-2">[tap]</Text>
            </View>
          </Pressable>
        )}

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
          options.map((option) => (
            <Pressable
              key={option.id}
              className={`bg-crypt-surface border-l-2 border-crypt-border-light py-4 px-3 mb-2 active:border-amber active:bg-amber/5 ${processing ? 'opacity-50' : ''}`}
              onPress={() => handleAction(option.action)}
              disabled={processing}
            >
              <Text className="text-bone text-sm font-mono">{option.text}</Text>
            </Pressable>
          ))
        )}
      </ScrollView>

      {/* Footer */}
      <View className="border-t border-crypt-border p-3 bg-crypt-bg" style={{ flexShrink: 0 }}>
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

      {/* Item Detail Modal */}
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
            const heal = Math.floor(Math.random() * 15) + 25;
            game.setHealth(Math.min(100, game.health + heal));
            setMessage(`You apply the herbs. +${heal} HP.`);
            playSFX('heal');
          } else if (name === 'Pale Rations') {
            game.setStamina(Math.min(3, game.stamina + 1));
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
