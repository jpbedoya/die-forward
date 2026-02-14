import { useState, useEffect } from 'react';
import { View, Text, Pressable, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useGame } from '../lib/GameContext';
import { useAudio } from '../lib/audio';
import { useCorpsesForRoom, discoverCorpse, recordTip, Corpse } from '../lib/instant';
import { ProgressBar } from '../components/ProgressBar';
import { getDepthForRoom, DungeonRoom } from '../lib/content';
import { sendTip } from '../lib/wallet';

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
  const { playSFX, playAmbient } = useAudio();
  const [message, setMessage] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [showCorpse, setShowCorpse] = useState(false);
  const [lootedCorpse, setLootedCorpse] = useState<Corpse | null>(null);
  const [tipping, setTipping] = useState(false);

  // Handle tipping a corpse
  const handleTip = async (corpse: Corpse) => {
    if (!game.walletConnected || tipping) return;
    
    const tipAmount = 0.01; // 0.01 SOL tip
    
    setTipping(true);
    try {
      const { signature } = await sendTip(corpse.walletAddress, tipAmount);
      await recordTip(corpse.id, tipAmount, game.walletAddress!);
      playSFX('tip-chime');
      setMessage(`Tipped @${corpse.playerName} ◎ ${tipAmount} SOL`);
    } catch (e) {
      console.error('Tip failed:', e);
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

  // Redirect if no session
  useEffect(() => {
    if (!game.sessionToken && dungeon.length === 0) {
      router.replace('/stake');
    }
  }, [game.sessionToken, dungeon.length]);

  // Get narrative from room content
  const getNarrative = (): string => {
    if (!room) return 'Darkness surrounds you...';
    if (room.content?.narrative) return room.content.narrative;
    // Fallback for old dungeon format
    return (room as any).narrative || 'You proceed deeper into the crypt.';
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
          
          if (realCorpse) {
            setLootedCorpse(realCorpse);
            setShowCorpse(true);
            
            if (realCorpse.loot !== 'Nothing' && !game.inventory.some(i => i.name === realCorpse.loot)) {
              playSFX('loot-discover');
              game.addToInventory({ 
                id: Date.now().toString(), 
                name: realCorpse.loot, 
                emoji: realCorpse.lootEmoji 
              });
              setMessage(`Found: ${realCorpse.lootEmoji} ${realCorpse.loot}`);
            } else {
              setMessage('The corpse has nothing you need.');
            }
            
            if (game.walletAddress) {
              discoverCorpse(realCorpse.id, game.walletAddress).catch(console.error);
            }
          } else {
            const lootItems = [
              { name: 'Herbs', emoji: '🌿' },
              { name: 'Bone Charm', emoji: '💀' },
              { name: 'Rusty Blade', emoji: '🗡️' },
            ];
            const loot = lootItems[Math.floor(Math.random() * lootItems.length)];
            
            if (!game.inventory.some(i => i.name === loot.name)) {
              playSFX('loot-discover');
              game.addToInventory({ id: Date.now().toString(), ...loot });
              setMessage(`Found: ${loot.emoji} ${loot.name}`);
            } else {
              setMessage('Nothing new here.');
            }
          }
          
          setTimeout(async () => {
            await game.advance();
            setMessage(null);
            setShowCorpse(false);
            setLootedCorpse(null);
          }, 2000);
          break;
        }

        case 'heal':
          playSFX('heal');
          game.setHealth(Math.min(100, game.health + 30));
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
          { id: '1', text: '🔍 Search the body', action: 'loot' },
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
        <ActivityIndicator size="large" color="#f59e0b" />
        <Text className="text-amber text-sm font-mono mt-4">Loading dungeon...</Text>
      </View>
    );
  }

  const options = getOptions();

  return (
    <SafeAreaView className="flex-1 bg-crypt-bg">
      {/* Header */}
      <View className="flex-row items-center justify-between px-3 py-2 border-b border-amber/30">
        <View className="flex-row items-center gap-2">
          <Text className={`text-xs font-mono tracking-wider ${
            depth.tier === 1 ? 'text-amber' : depth.tier === 2 ? 'text-amber-light' : 'text-ethereal'
          }`}>
            ◈ {depth.name}
          </Text>
          {game.stakeAmount === 0 && (
            <View className="bg-amber/20 border border-amber/50 px-2 py-0.5">
              <Text className="text-amber text-[10px] font-mono">FREE</Text>
            </View>
          )}
        </View>
        <ProgressBar current={roomNumber} total={dungeon.length} />
      </View>

      {/* Main content */}
      <ScrollView className="flex-1" contentContainerClassName="p-4">
        {/* Boss warning for room 12 */}
        {room.boss && (
          <View className="bg-blood/20 border-2 border-blood p-3 mb-4">
            <Text className="text-blood text-center font-mono font-bold">⚠️ BOSS ENCOUNTER ⚠️</Text>
          </View>
        )}

        {/* Narrative */}
        <Text className="text-bone text-base font-mono leading-6 mb-4">
          {getNarrative()}
        </Text>

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

        {/* Enemy preview for combat rooms */}
        {room.type === 'combat' && room.content?.enemy && (
          <View className="bg-crypt-surface border border-blood/30 p-3 mb-4">
            <Text className="text-blood-light text-sm font-mono">
              {room.content.enemyEmoji || '👁️'} {room.content.enemy} blocks your path...
            </Text>
          </View>
        )}

        {/* Message */}
        {message && (
          <View className="bg-amber/20 border-2 border-amber p-4 mb-4">
            <Text className="text-amber-light text-sm font-mono">✦ {message}</Text>
          </View>
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
                    <ActivityIndicator size="small" color="#f59e0b" />
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
        {message ? (
          <Pressable
            className="flex-row items-center bg-crypt-surface border-l-2 border-amber py-4 px-3"
            onPress={() => handleAction('continue')}
            disabled={processing}
          >
            <Text className="text-bone-dark text-sm font-mono mr-2">▶</Text>
            <Text className="text-bone text-sm font-mono">Continue...</Text>
          </Pressable>
        ) : (
          options.map((option, i) => (
            <Pressable
              key={option.id}
              className={`flex-row items-center bg-crypt-surface border-l-2 border-crypt-border-light py-4 px-3 mb-2 active:border-amber active:bg-amber/5 ${processing ? 'opacity-50' : ''}`}
              onPress={() => handleAction(option.action)}
              disabled={processing}
            >
              <Text className="text-bone-dark text-sm font-mono mr-2">{i + 1}.</Text>
              <Text className="text-bone text-sm font-mono">{option.text}</Text>
            </Pressable>
          ))
        )}
      </ScrollView>

      {/* Footer */}
      <View className="border-t border-crypt-border p-3 bg-crypt-bg">
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

        {/* Inventory */}
        <ScrollView horizontal className="flex-row">
          <Text className="text-base mr-2">🎒</Text>
          {game.inventory.map((item) => (
            <View key={item.id} className="bg-crypt-surface border border-crypt-border py-1 px-2 mr-2">
              <Text className="text-bone-muted text-xs font-mono">{item.emoji} {item.name}</Text>
            </View>
          ))}
          {game.inventory.length === 0 && (
            <Text className="text-stone-600 text-xs font-mono italic">Empty</Text>
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}
