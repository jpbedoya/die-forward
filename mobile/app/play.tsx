import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useGame } from '../lib/GameContext';
import { useCorpsesForRoom, discoverCorpse, Corpse } from '../lib/instant';

type RoomType = 'explore' | 'combat' | 'corpse' | 'cache' | 'exit';

interface RoomOption {
  id: string;
  text: string;
  action: string;
}

// Generate options based on room type
function getOptionsForRoom(type: RoomType): RoomOption[] {
  switch (type) {
    case 'explore':
      return [
        { id: '1', text: 'Press forward', action: 'next' },
        { id: '2', text: 'Proceed carefully', action: 'next' },
      ];
    case 'combat':
      return [
        { id: '1', text: 'Ready your weapon', action: 'combat' },
        { id: '2', text: 'Try to flee', action: 'flee' },
      ];
    case 'corpse':
      return [
        { id: '1', text: 'Search the corpse', action: 'loot' },
        { id: '2', text: 'Pay respects and move on', action: 'next' },
      ];
    case 'cache':
      return [
        { id: '1', text: 'Take the supplies (+30 HP)', action: 'heal' },
        { id: '2', text: 'Continue deeper', action: 'next' },
      ];
    case 'exit':
      return [
        { id: '1', text: 'Ascend to victory', action: 'victory' },
      ];
    default:
      return [{ id: '1', text: 'Continue', action: 'next' }];
  }
}

// Get depth name from room number
function getDepthName(roomNum: number): { name: string; tier: number } {
  if (roomNum <= 4) return { name: 'UPPER CRYPT', tier: 1 };
  if (roomNum <= 8) return { name: 'FLOODED HALLS', tier: 2 };
  return { name: 'THE ABYSS', tier: 3 };
}

function HealthBar({ current, max }: { current: number; max: number }) {
  const filled = Math.round((current / max) * 8);
  return (
    <Text style={styles.healthBar}>
      <Text style={styles.healthFilled}>{'█'.repeat(filled)}</Text>
      <Text style={styles.healthEmpty}>{'█'.repeat(8 - filled)}</Text>
    </Text>
  );
}

export default function PlayScreen() {
  const game = useGame();
  const [message, setMessage] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [killedBy, setKilledBy] = useState<string | undefined>();
  const [showCorpse, setShowCorpse] = useState(false);
  const [lootedCorpse, setLootedCorpse] = useState<Corpse | null>(null);

  // Get current room from dungeon
  const room = game.dungeon[game.currentRoom] || null;
  const depth = getDepthName(game.currentRoom + 1);
  const progress = `${game.currentRoom + 1}/${game.dungeon.length}`;
  const options = room ? getOptionsForRoom(room.type as RoomType) : [];

  // Fetch real corpses from InstantDB
  const { corpses: nearbyCorpses } = useCorpsesForRoom(
    depth.name,
    game.currentRoom + 1
  );
  const realCorpse = nearbyCorpses[0]; // Get first undiscovered corpse

  // If no session, redirect to stake
  useEffect(() => {
    if (!game.sessionToken && game.dungeon.length === 0) {
      router.replace('/stake');
    }
  }, [game.sessionToken, game.dungeon.length]);

  const handleAction = async (action: string) => {
    setMessage(null);
    setProcessing(true);

    try {
      switch (action) {
        case 'next':
          const advanced = await game.advance();
          if (advanced) {
            game.setStamina(Math.min(3, game.stamina + 1));
          }
          break;

        case 'combat': {
          // Simulate combat - 70% chance to win with damage
          const damage = Math.floor(Math.random() * 25) + 10;
          const newHealth = game.health - damage;
          
          if (newHealth <= 0) {
            game.setHealth(0);
            setKilledBy(room?.enemy);
            router.replace('/death');
            return;
          }
          
          game.setHealth(newHealth);
          setMessage(`Victory! But you took ${damage} damage.`);
          
          // Advance after short delay
          setTimeout(async () => {
            await game.advance();
            setMessage(null);
          }, 1500);
          break;
        }

        case 'flee': {
          const fleeDamage = Math.floor(Math.random() * 15) + 5;
          const newHealth = game.health - fleeDamage;
          
          if (newHealth <= 0) {
            game.setHealth(0);
            setKilledBy(room?.enemy);
            router.replace('/death');
            return;
          }
          
          game.setHealth(newHealth);
          setMessage(`Escaped! But took ${fleeDamage} damage while fleeing.`);
          
          setTimeout(async () => {
            await game.advance();
            setMessage(null);
          }, 1500);
          break;
        }

        case 'loot': {
          // Use real corpse if available
          if (realCorpse) {
            setLootedCorpse(realCorpse);
            setShowCorpse(true);
            
            // Add loot if player doesn't have it
            if (realCorpse.loot !== 'Nothing' && !game.inventory.some(i => i.name === realCorpse.loot)) {
              game.addToInventory({ 
                id: Date.now().toString(), 
                name: realCorpse.loot, 
                emoji: realCorpse.lootEmoji 
              });
              setMessage(`Found: ${realCorpse.lootEmoji} ${realCorpse.loot}`);
            } else {
              setMessage('The corpse has nothing you need.');
            }
            
            // Mark corpse as discovered
            if (game.walletAddress) {
              discoverCorpse(realCorpse.id, game.walletAddress).catch(console.error);
            }
          } else {
            // Fallback to random loot
            const lootItems = [
              { name: 'Herbs', emoji: '🌿' },
              { name: 'Bone Charm', emoji: '💀' },
              { name: 'Rusty Blade', emoji: '🗡️' },
            ];
            const loot = lootItems[Math.floor(Math.random() * lootItems.length)];
            
            if (!game.inventory.some(i => i.name === loot.name)) {
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
          game.setHealth(Math.min(100, game.health + 30));
          setMessage('Found medical supplies. +30 HP');
          
          setTimeout(async () => {
            await game.advance();
            setMessage(null);
          }, 1500);
          break;

        case 'victory':
          router.replace('/victory');
          break;
      }
    } finally {
      setProcessing(false);
    }
  };

  // Loading state
  if (!room) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#f59e0b" />
        <Text style={styles.loadingText}>Loading dungeon...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Pressable onPress={() => {/* TODO: Menu */}}>
            <Text style={styles.menuButton}>[≡]</Text>
          </Pressable>
          <Text style={[
            styles.depthName,
            depth.tier === 2 && styles.depthTier2,
            depth.tier === 3 && styles.depthTier3,
          ]}>
            ◈ {depth.name}
          </Text>
          {game.stakeAmount === 0 && (
            <View style={styles.freeBadge}>
              <Text style={styles.freeBadgeText}>FREE</Text>
            </View>
          )}
        </View>
        <Text style={styles.progress}>{progress}</Text>
      </View>

      {/* Main content */}
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Narrative */}
        <Text style={styles.narrative}>{room.narrative}</Text>

        {/* Message */}
        {message && (
          <View style={styles.messageBox}>
            <Text style={styles.messageText}>✦ {message}</Text>
          </View>
        )}

        {/* Real corpse discovery prompt */}
        {realCorpse && !showCorpse && room?.type !== 'corpse' && (
          <View style={styles.corpsePrompt}>
            <Text style={styles.corpsePromptIcon}>💀</Text>
            <View style={styles.corpsePromptContent}>
              <Text style={styles.corpsePromptTitle}>A body lies nearby...</Text>
              <Text style={styles.corpsePromptHint}>Someone fell here before you</Text>
            </View>
            <Pressable onPress={() => handleAction('loot')}>
              <Text style={styles.corpsePromptAction}>→ Investigate</Text>
            </Pressable>
          </View>
        )}

        {/* Corpse card - shown after looting */}
        {showCorpse && lootedCorpse && (
          <View style={styles.corpseCard}>
            <View style={styles.corpseHeader}>
              <Text style={styles.corpseIcon}>💀</Text>
              <View>
                <Text style={styles.corpseName}>@{lootedCorpse.playerName}</Text>
                <Text style={styles.corpseStatus}>FALLEN</Text>
              </View>
            </View>
            <View style={styles.corpseMessage}>
              <Text style={styles.corpseQuote}>"{lootedCorpse.finalMessage}"</Text>
            </View>
            <View style={styles.corpseLoot}>
              <Text style={styles.corpseLootLabel}>They carried:</Text>
              <Text style={styles.corpseLootItem}>
                {lootedCorpse.lootEmoji} {lootedCorpse.loot}
              </Text>
            </View>
          </View>
        )}

        {/* Divider */}
        <Text style={styles.divider}>────────────────────────</Text>

        {/* Options */}
        <Text style={styles.optionsLabel}>▼ WHAT DO YOU DO?</Text>
        {options.map((option, i) => (
          <Pressable
            key={option.id}
            style={[styles.optionButton, processing && styles.optionDisabled]}
            onPress={() => handleAction(option.action)}
            disabled={processing}
          >
            <Text style={styles.optionNumber}>{i + 1}.</Text>
            <Text style={styles.optionText}>{option.text}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        {/* Stats row */}
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statIcon}>♥</Text>
            <HealthBar current={game.health} max={100} />
            <Text style={[styles.statValue, game.health < 30 && styles.statValueDanger]}>
              {game.health}
            </Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statIcon}>⚡</Text>
            <Text style={styles.staminaText}>
              {'◆'.repeat(game.stamina)}{'◇'.repeat(3 - game.stamina)}
            </Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.solIcon}>◎</Text>
            <Text style={styles.solValue}>
              {game.stakeAmount > 0 ? `${game.stakeAmount} SOL` : 'FREE'}
            </Text>
          </View>
        </View>

        {/* Inventory row */}
        <ScrollView horizontal style={styles.inventoryRow}>
          <Text style={styles.inventoryIcon}>🎒</Text>
          {game.inventory.map((item) => (
            <View key={item.id} style={styles.inventoryItem}>
              <Text style={styles.inventoryText}>{item.emoji} {item.name}</Text>
            </View>
          ))}
          {game.inventory.length === 0 && (
            <Text style={styles.inventoryEmpty}>Empty</Text>
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0d0d0d',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#f59e0b',
    fontSize: 14,
    fontFamily: 'monospace',
    marginTop: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(245, 158, 11, 0.3)',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  menuButton: {
    color: '#78716c',
    fontSize: 14,
    fontFamily: 'monospace',
  },
  depthName: {
    color: '#f59e0b',
    fontSize: 12,
    fontFamily: 'monospace',
    letterSpacing: 1,
  },
  depthTier2: {
    color: '#fbbf24',
  },
  depthTier3: {
    color: '#a855f7',
  },
  freeBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.5)',
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  freeBadgeText: {
    color: '#f59e0b',
    fontSize: 10,
    fontFamily: 'monospace',
    letterSpacing: 1,
  },
  progress: {
    color: '#78716c',
    fontSize: 12,
    fontFamily: 'monospace',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 20,
  },
  narrative: {
    color: '#e7e5e4',
    fontSize: 15,
    fontFamily: 'monospace',
    lineHeight: 24,
    marginBottom: 16,
  },
  messageBox: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    borderWidth: 2,
    borderColor: '#f59e0b',
    padding: 16,
    marginBottom: 16,
  },
  messageText: {
    color: '#fbbf24',
    fontSize: 15,
    fontFamily: 'monospace',
  },
  divider: {
    color: '#44403c',
    fontSize: 12,
    fontFamily: 'monospace',
    marginBottom: 16,
  },
  optionsLabel: {
    color: '#78716c',
    fontSize: 11,
    fontFamily: 'monospace',
    marginBottom: 12,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1c1917',
    borderLeftWidth: 2,
    borderLeftColor: '#44403c',
    paddingVertical: 14,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  optionDisabled: {
    opacity: 0.5,
  },
  optionNumber: {
    color: '#78716c',
    fontSize: 14,
    fontFamily: 'monospace',
    marginRight: 8,
  },
  optionText: {
    color: '#d6d3d1',
    fontSize: 14,
    fontFamily: 'monospace',
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: '#292524',
    padding: 12,
    backgroundColor: '#0d0d0d',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statIcon: {
    color: '#ef4444',
    fontSize: 16,
  },
  healthBar: {
    fontFamily: 'monospace',
    letterSpacing: -2,
  },
  healthFilled: {
    color: '#ef4444',
  },
  healthEmpty: {
    color: '#7f1d1d',
  },
  statValue: {
    color: '#fca5a5',
    fontSize: 14,
    fontFamily: 'monospace',
    fontWeight: 'bold',
  },
  statValueDanger: {
    color: '#ef4444',
  },
  staminaText: {
    color: '#3b82f6',
    fontSize: 14,
    fontFamily: 'monospace',
  },
  solIcon: {
    color: '#f59e0b',
    fontSize: 16,
  },
  solValue: {
    color: '#fbbf24',
    fontSize: 14,
    fontFamily: 'monospace',
    fontWeight: 'bold',
  },
  inventoryRow: {
    flexDirection: 'row',
  },
  inventoryIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  inventoryItem: {
    backgroundColor: '#1c1917',
    borderWidth: 1,
    borderColor: '#292524',
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginRight: 8,
  },
  inventoryText: {
    color: '#a8a29e',
    fontSize: 12,
    fontFamily: 'monospace',
  },
  inventoryEmpty: {
    color: '#57534e',
    fontSize: 12,
    fontFamily: 'monospace',
    fontStyle: 'italic',
  },
  // Corpse prompt
  corpsePrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(168, 85, 247, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.3)',
    padding: 12,
    marginBottom: 16,
    gap: 12,
  },
  corpsePromptIcon: {
    fontSize: 24,
  },
  corpsePromptContent: {
    flex: 1,
  },
  corpsePromptTitle: {
    color: '#a855f7',
    fontSize: 14,
    fontFamily: 'monospace',
    fontWeight: 'bold',
  },
  corpsePromptHint: {
    color: '#78716c',
    fontSize: 11,
    fontFamily: 'monospace',
  },
  corpsePromptAction: {
    color: '#a855f7',
    fontSize: 14,
    fontFamily: 'monospace',
  },
  // Corpse card
  corpseCard: {
    backgroundColor: '#1c1917',
    borderWidth: 1,
    borderColor: '#a855f7',
    padding: 16,
    marginBottom: 16,
  },
  corpseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  corpseIcon: {
    fontSize: 32,
  },
  corpseName: {
    color: '#a855f7',
    fontSize: 16,
    fontFamily: 'monospace',
    fontWeight: 'bold',
  },
  corpseStatus: {
    color: '#ef4444',
    fontSize: 10,
    fontFamily: 'monospace',
    letterSpacing: 1,
  },
  corpseMessage: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderLeftWidth: 2,
    borderLeftColor: '#a855f7',
    padding: 12,
    marginBottom: 12,
  },
  corpseQuote: {
    color: '#e7e5e4',
    fontSize: 14,
    fontFamily: 'monospace',
    fontStyle: 'italic',
  },
  corpseLoot: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  corpseLootLabel: {
    color: '#78716c',
    fontSize: 12,
    fontFamily: 'monospace',
  },
  corpseLootItem: {
    color: '#fbbf24',
    fontSize: 12,
    fontFamily: 'monospace',
  },
});
