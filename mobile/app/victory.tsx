import { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, Linking } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useGame } from '../lib/GameContext';

export default function VictoryScreen() {
  const game = useGame();
  const [claiming, setClaiming] = useState(false);
  const [claimed, setClaimed] = useState(false);
  const [signature, setSignature] = useState<string | null>(null);

  const reward = game.stakeAmount * 1.5;
  const bonus = game.stakeAmount * 0.5;

  const handleClaim = async () => {
    if (game.stakeAmount === 0) {
      // Free play - no claim needed
      setClaimed(true);
      return;
    }

    setClaiming(true);
    try {
      await game.claimVictory();
      setClaimed(true);
      // TODO: Get signature from response
    } catch (err) {
      console.error('Failed to claim:', err);
    } finally {
      setClaiming(false);
    }
  };

  const handleViewOnSolscan = () => {
    if (signature) {
      Linking.openURL(`https://solscan.io/tx/${signature}?cluster=devnet`);
    }
  };

  const handlePlayAgain = () => {
    router.replace('/');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Trophy */}
        <Text style={styles.trophy}>🏆</Text>
        
        {/* Title */}
        <Text style={styles.title}>VICTORY</Text>
        <Text style={styles.subtitle}>You escaped the depths.</Text>

        {/* Stats */}
        <View style={styles.statsBox}>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Rooms Cleared</Text>
            <Text style={styles.statValue}>{game.currentRoom + 1} / {game.dungeon.length}</Text>
          </View>
          
          {game.stakeAmount > 0 ? (
            <>
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Original Stake</Text>
                <Text style={styles.statValue}>◎ {game.stakeAmount}</Text>
              </View>
              <View style={[styles.statRow, styles.statRowHighlight]}>
                <Text style={styles.statLabel}>Victory Bonus (50%)</Text>
                <Text style={styles.statValueGreen}>+◎ {bonus.toFixed(3)}</Text>
              </View>
              <View style={[styles.statRow, styles.statRowTotal]}>
                <Text style={styles.statLabelBold}>TOTAL REWARD</Text>
                <Text style={styles.statValueBold}>◎ {reward.toFixed(3)}</Text>
              </View>
            </>
          ) : (
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Mode</Text>
              <Text style={styles.statValue}>Free Play</Text>
            </View>
          )}
        </View>

        {/* Claim button */}
        {!claimed ? (
          <Pressable 
            style={[styles.claimButton, claiming && styles.buttonDisabled]}
            onPress={handleClaim}
            disabled={claiming}
          >
            {claiming ? (
              <ActivityIndicator color="#0d0d0d" />
            ) : (
              <Text style={styles.claimButtonText}>
                {game.stakeAmount > 0 ? '💰 CLAIM REWARD' : '🎉 CELEBRATE'}
              </Text>
            )}
          </Pressable>
        ) : (
          <View style={styles.claimedBox}>
            <Text style={styles.claimedText}>
              {game.stakeAmount > 0 
                ? '✓ Reward claimed!' 
                : '✓ Victory recorded!'}
            </Text>
          </View>
        )}

        {/* Share */}
        <Pressable style={styles.shareButton}>
          <Text style={styles.shareButtonText}>📤 SHARE VICTORY</Text>
        </Pressable>

        {/* Play again */}
        <Pressable 
          style={styles.playAgainButton}
          onPress={handlePlayAgain}
        >
          <Text style={styles.playAgainText}>↻ PLAY AGAIN</Text>
        </Pressable>

        {/* On-chain verification */}
        {signature && (
          <Pressable style={styles.verifyBox} onPress={handleViewOnSolscan}>
            <Text style={styles.verifyText}>✓ Victory recorded on-chain</Text>
            <Text style={styles.verifyLink}>View on Solscan →</Text>
          </Pressable>
        )}
        
        {game.stakeAmount === 0 && (
          <View style={styles.freePlayNote}>
            <Text style={styles.freePlayText}>
              💡 Stake SOL next time for real rewards!
            </Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0d0d0d',
  },
  content: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trophy: {
    fontSize: 72,
    marginBottom: 16,
  },
  title: {
    fontSize: 36,
    color: '#fbbf24',
    fontFamily: 'monospace',
    fontWeight: 'bold',
    letterSpacing: 4,
    marginBottom: 8,
    textShadowColor: 'rgba(251, 191, 36, 0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },
  subtitle: {
    fontSize: 14,
    color: '#78716c',
    fontFamily: 'monospace',
    marginBottom: 32,
  },
  statsBox: {
    width: '100%',
    backgroundColor: '#1c1917',
    borderWidth: 1,
    borderColor: '#292524',
    padding: 16,
    marginBottom: 24,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  statRowHighlight: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    marginHorizontal: -16,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginBottom: 8,
  },
  statRowTotal: {
    borderTopWidth: 1,
    borderTopColor: '#292524',
    paddingTop: 12,
    marginTop: 4,
    marginBottom: 0,
  },
  statLabel: {
    color: '#78716c',
    fontSize: 13,
    fontFamily: 'monospace',
  },
  statLabelBold: {
    color: '#a8a29e',
    fontSize: 14,
    fontFamily: 'monospace',
    fontWeight: 'bold',
  },
  statValue: {
    color: '#a8a29e',
    fontSize: 13,
    fontFamily: 'monospace',
  },
  statValueGreen: {
    color: '#22c55e',
    fontSize: 13,
    fontFamily: 'monospace',
    fontWeight: 'bold',
  },
  statValueBold: {
    color: '#fbbf24',
    fontSize: 18,
    fontFamily: 'monospace',
    fontWeight: 'bold',
  },
  claimButton: {
    width: '100%',
    backgroundColor: '#22c55e',
    paddingVertical: 18,
    alignItems: 'center',
    marginBottom: 12,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  claimButtonText: {
    color: '#0d0d0d',
    fontSize: 18,
    fontFamily: 'monospace',
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  claimedBox: {
    width: '100%',
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderWidth: 1,
    borderColor: '#22c55e',
    paddingVertical: 18,
    alignItems: 'center',
    marginBottom: 12,
  },
  claimedText: {
    color: '#22c55e',
    fontSize: 16,
    fontFamily: 'monospace',
    fontWeight: 'bold',
  },
  shareButton: {
    width: '100%',
    borderWidth: 2,
    borderColor: '#f59e0b',
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 12,
  },
  shareButtonText: {
    color: '#f59e0b',
    fontSize: 14,
    fontFamily: 'monospace',
    fontWeight: 'bold',
  },
  playAgainButton: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#44403c',
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 24,
  },
  playAgainText: {
    color: '#a8a29e',
    fontSize: 14,
    fontFamily: 'monospace',
  },
  verifyBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  verifyText: {
    color: '#22c55e',
    fontSize: 12,
    fontFamily: 'monospace',
  },
  verifyLink: {
    color: '#3b82f6',
    fontSize: 12,
    fontFamily: 'monospace',
    textDecorationLine: 'underline',
  },
  freePlayNote: {
    marginTop: 8,
  },
  freePlayText: {
    color: '#78716c',
    fontSize: 12,
    fontFamily: 'monospace',
  },
});
