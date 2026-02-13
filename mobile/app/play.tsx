import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

type RoomType = 'explore' | 'combat' | 'cache' | 'exit';

interface Room {
  type: RoomType;
  narrative: string;
  options: { id: string; text: string; action: string }[];
  enemy?: string;
}

// Simple demo dungeon
const DEMO_DUNGEON: Room[] = [
  {
    type: 'explore',
    narrative: 'You descend into THE UPPER CRYPT.\n\nTorch light flickers against ancient stone. The air tastes of dust and forgotten prayers. Something scratches in the darkness ahead.',
    options: [
      { id: '1', text: 'Press forward', action: 'next' },
      { id: '2', text: 'Proceed carefully', action: 'next' },
    ],
  },
  {
    type: 'combat',
    narrative: 'A PALE CRAWLER emerges from the shadows.\n\nBone-white limbs scrape against stone. Empty eye sockets lock onto you. It was human once. Now it hungers.',
    options: [
      { id: '1', text: 'Ready your weapon', action: 'combat' },
      { id: '2', text: 'Try to flee', action: 'flee' },
    ],
    enemy: 'Pale Crawler',
  },
  {
    type: 'cache',
    narrative: 'A moment of respite.\n\nSupplies rest on a worn stone shelf - bandages, herbs, a flask of something that might be medicine. The dead no longer need them.',
    options: [
      { id: '1', text: 'Take the supplies (+30 HP)', action: 'heal' },
      { id: '2', text: 'Continue deeper', action: 'next' },
    ],
  },
  {
    type: 'explore',
    narrative: 'The passage narrows.\n\nWater seeps through cracks above. Your torch sputters. The walls press closer, carved with warnings in a language older than memory.',
    options: [
      { id: '1', text: 'Push through', action: 'next' },
      { id: '2', text: 'Search the walls', action: 'next' },
    ],
  },
  {
    type: 'combat',
    narrative: 'THE DROWNED ONE rises from a pool of black water.\n\nWaterlogged robes cling to bloated flesh. It reaches for you with fingers like swollen roots. The smell is overwhelming.',
    options: [
      { id: '1', text: 'Stand and fight', action: 'combat' },
      { id: '2', text: 'Retreat', action: 'flee' },
    ],
    enemy: 'The Drowned One',
  },
  {
    type: 'exit',
    narrative: 'Light breaks through the darkness.\n\nAfter what feels like an eternity, you see it - the exit. Fresh air. The sun. You made it. You actually made it.',
    options: [
      { id: '1', text: 'Ascend to victory', action: 'victory' },
    ],
  },
];

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
  const [currentRoom, setCurrentRoom] = useState(0);
  const [health, setHealth] = useState(100);
  const [stamina, setStamina] = useState(3);
  const [message, setMessage] = useState<string | null>(null);
  const [inventory, setInventory] = useState(['🔦 Torch', '🌿 Herbs']);

  const room = DEMO_DUNGEON[currentRoom];
  const progress = `${currentRoom + 1}/${DEMO_DUNGEON.length}`;

  const handleAction = (action: string) => {
    setMessage(null);

    switch (action) {
      case 'next':
        if (currentRoom < DEMO_DUNGEON.length - 1) {
          setCurrentRoom(currentRoom + 1);
          setStamina(Math.min(3, stamina + 1));
        }
        break;

      case 'combat':
        // Simulate combat - 70% chance to win with damage
        const damage = Math.floor(Math.random() * 25) + 10;
        const newHealth = health - damage;
        
        if (newHealth <= 0) {
          setHealth(0);
          router.replace('/death');
          return;
        }
        
        setHealth(newHealth);
        setMessage(`Victory! But you took ${damage} damage.`);
        
        if (currentRoom < DEMO_DUNGEON.length - 1) {
          setTimeout(() => {
            setCurrentRoom(currentRoom + 1);
            setMessage(null);
          }, 1500);
        }
        break;

      case 'flee':
        const fleeDamage = Math.floor(Math.random() * 15) + 5;
        const fleeHealth = health - fleeDamage;
        
        if (fleeHealth <= 0) {
          setHealth(0);
          router.replace('/death');
          return;
        }
        
        setHealth(fleeHealth);
        setMessage(`Escaped! But took ${fleeDamage} damage while fleeing.`);
        
        if (currentRoom < DEMO_DUNGEON.length - 1) {
          setTimeout(() => {
            setCurrentRoom(currentRoom + 1);
            setMessage(null);
          }, 1500);
        }
        break;

      case 'heal':
        setHealth(Math.min(100, health + 30));
        setMessage('Bandaged wounds. +30 HP');
        
        setTimeout(() => {
          setCurrentRoom(currentRoom + 1);
          setMessage(null);
        }, 1500);
        break;

      case 'victory':
        router.replace('/victory');
        break;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Pressable onPress={() => {/* TODO: Menu */}}>
            <Text style={styles.menuButton}>[≡]</Text>
          </Pressable>
          <Text style={styles.depthName}>◈ UPPER CRYPT</Text>
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

        {/* Divider */}
        <Text style={styles.divider}>────────────────────────</Text>

        {/* Options */}
        <Text style={styles.optionsLabel}>▼ WHAT DO YOU DO?</Text>
        {room.options.map((option, i) => (
          <Pressable
            key={option.id}
            style={styles.optionButton}
            onPress={() => handleAction(option.action)}
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
            <HealthBar current={health} max={100} />
            <Text style={[styles.statValue, health < 30 && styles.statValueDanger]}>
              {health}
            </Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statIcon}>⚡</Text>
            <Text style={styles.staminaText}>
              {'◆'.repeat(stamina)}{'◇'.repeat(3 - stamina)}
            </Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.solIcon}>◎</Text>
            <Text style={styles.solValue}>0.05 SOL</Text>
          </View>
        </View>

        {/* Inventory row */}
        <ScrollView horizontal style={styles.inventoryRow}>
          <Text style={styles.inventoryIcon}>🎒</Text>
          {inventory.map((item, i) => (
            <View key={i} style={styles.inventoryItem}>
              <Text style={styles.inventoryText}>{item}</Text>
            </View>
          ))}
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
});
