import { useState } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useGame } from '../lib/GameContext';

const STAKE_OPTIONS = [0.01, 0.05, 0.1, 0.25];

export default function StakeScreen() {
  const game = useGame();
  const [selectedStake, setSelectedStake] = useState(0.05);
  const [customStake, setCustomStake] = useState('');
  const [staking, setStaking] = useState(false);

  const handleConnect = async () => {
    await game.connect();
  };

  const handleStake = async (demoMode = false) => {
    setStaking(true);
    try {
      await game.startGame(selectedStake, demoMode);
      router.push('/play');
    } catch (err) {
      console.error('Failed to start game:', err);
    } finally {
      setStaking(false);
    }
  };

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 4)}...${addr.slice(-4)}`;
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.backButton}>← BACK</Text>
        </Pressable>
        <Text style={styles.headerTitle}>STAKE YOUR SOL</Text>
        <View style={{ width: 60 }} />
      </View>

      <View style={styles.content}>
        {/* Error display */}
        {game.error && (
          <Pressable style={styles.errorBox} onPress={game.clearError}>
            <Text style={styles.errorText}>⚠️ {game.error}</Text>
            <Text style={styles.errorDismiss}>Tap to dismiss</Text>
          </Pressable>
        )}

        {/* Warning */}
        <View style={styles.warningBox}>
          <Text style={styles.warningText}>
            ⚠️ Your stake will be locked in escrow. Die and lose it. 
            Escape and claim victory with bonus rewards.
          </Text>
        </View>

        {/* Stake options */}
        <View style={styles.stakeSection}>
          <Text style={styles.sectionTitle}>SELECT AMOUNT</Text>
          <View style={styles.stakeOptions}>
            {STAKE_OPTIONS.map((amount) => (
              <Pressable
                key={amount}
                style={[
                  styles.stakeOption,
                  selectedStake === amount && styles.stakeOptionSelected,
                ]}
                onPress={() => {
                  setSelectedStake(amount);
                  setCustomStake('');
                }}
              >
                <Text
                  style={[
                    styles.stakeOptionText,
                    selectedStake === amount && styles.stakeOptionTextSelected,
                  ]}
                >
                  ◎ {amount}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Custom input */}
          <View style={styles.customInput}>
            <Text style={styles.customLabel}>OR ENTER CUSTOM:</Text>
            <View style={styles.inputRow}>
              <Text style={styles.inputPrefix}>◎</Text>
              <TextInput
                style={styles.input}
                value={customStake}
                onChangeText={(text) => {
                  setCustomStake(text);
                  const num = parseFloat(text);
                  if (!isNaN(num) && num > 0) {
                    setSelectedStake(num);
                  }
                }}
                placeholder="0.00"
                placeholderTextColor="#57534e"
                keyboardType="decimal-pad"
              />
            </View>
          </View>
        </View>

        {/* Summary */}
        <View style={styles.summaryBox}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Stake Amount</Text>
            <Text style={styles.summaryValue}>◎ {selectedStake}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Victory Bonus (50%)</Text>
            <Text style={styles.summaryValueGreen}>+◎ {(selectedStake * 0.5).toFixed(3)}</Text>
          </View>
          <View style={[styles.summaryRow, styles.summaryTotal]}>
            <Text style={styles.summaryLabelBold}>Potential Reward</Text>
            <Text style={styles.summaryValueBold}>◎ {(selectedStake * 1.5).toFixed(3)}</Text>
          </View>
        </View>

        {/* Action buttons */}
        <View style={styles.actionContainer}>
          {!game.walletConnected ? (
            <>
              <Pressable 
                style={styles.connectButton} 
                onPress={handleConnect}
                disabled={game.loading}
              >
                {game.loading ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.connectButtonText}>🔗 CONNECT WALLET</Text>
                )}
              </Pressable>
              
              <Pressable 
                style={styles.demoButton}
                onPress={() => handleStake(true)}
                disabled={staking}
              >
                <Text style={styles.demoButtonText}>🎮 FREE PLAY (No Stake)</Text>
              </Pressable>
            </>
          ) : (
            <>
              <Pressable 
                style={styles.stakeButton} 
                onPress={() => handleStake(false)}
                disabled={staking || (game.balance !== null && game.balance < selectedStake)}
              >
                {staking ? (
                  <ActivityIndicator color="#0d0d0d" />
                ) : (
                  <Text style={styles.stakeButtonText}>⚔️ STAKE & DESCEND</Text>
                )}
              </Pressable>
              
              {game.balance !== null && game.balance < selectedStake && (
                <Text style={styles.insufficientText}>
                  Insufficient balance ({game.balance.toFixed(3)} SOL)
                </Text>
              )}
            </>
          )}
        </View>

        {/* Wallet status */}
        {game.walletConnected && game.walletAddress && (
          <View style={styles.walletInfo}>
            <Text style={styles.walletConnected}>✓ Connected</Text>
            <Text style={styles.walletAddress}>{formatAddress(game.walletAddress)}</Text>
            {game.balance !== null && (
              <Text style={styles.walletBalance}>◎ {game.balance.toFixed(3)}</Text>
            )}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#292524',
  },
  backButton: {
    color: '#a8a29e',
    fontSize: 14,
    fontFamily: 'monospace',
  },
  headerTitle: {
    color: '#f59e0b',
    fontSize: 16,
    fontFamily: 'monospace',
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  errorBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderWidth: 1,
    borderColor: '#ef4444',
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: '#fca5a5',
    fontSize: 13,
    fontFamily: 'monospace',
  },
  errorDismiss: {
    color: '#78716c',
    fontSize: 11,
    fontFamily: 'monospace',
    marginTop: 4,
  },
  warningBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: '#7f1d1d',
    padding: 16,
    marginBottom: 24,
  },
  warningText: {
    color: '#fca5a5',
    fontSize: 13,
    fontFamily: 'monospace',
    lineHeight: 20,
  },
  stakeSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    color: '#78716c',
    fontSize: 12,
    fontFamily: 'monospace',
    letterSpacing: 2,
    marginBottom: 12,
  },
  stakeOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  stakeOption: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: '#44403c',
    backgroundColor: '#1c1917',
  },
  stakeOptionSelected: {
    borderColor: '#f59e0b',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
  },
  stakeOptionText: {
    color: '#a8a29e',
    fontSize: 16,
    fontFamily: 'monospace',
  },
  stakeOptionTextSelected: {
    color: '#fbbf24',
  },
  customInput: {
    marginTop: 16,
  },
  customLabel: {
    color: '#57534e',
    fontSize: 11,
    fontFamily: 'monospace',
    marginBottom: 8,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#44403c',
    backgroundColor: '#1c1917',
    paddingHorizontal: 12,
  },
  inputPrefix: {
    color: '#f59e0b',
    fontSize: 18,
    fontFamily: 'monospace',
    marginRight: 8,
  },
  input: {
    flex: 1,
    color: '#e7e5e4',
    fontSize: 18,
    fontFamily: 'monospace',
    paddingVertical: 14,
  },
  summaryBox: {
    backgroundColor: '#1c1917',
    borderWidth: 1,
    borderColor: '#292524',
    padding: 16,
    marginBottom: 24,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryTotal: {
    borderTopWidth: 1,
    borderTopColor: '#292524',
    paddingTop: 12,
    marginTop: 4,
    marginBottom: 0,
  },
  summaryLabel: {
    color: '#78716c',
    fontSize: 13,
    fontFamily: 'monospace',
  },
  summaryLabelBold: {
    color: '#a8a29e',
    fontSize: 14,
    fontFamily: 'monospace',
    fontWeight: 'bold',
  },
  summaryValue: {
    color: '#a8a29e',
    fontSize: 13,
    fontFamily: 'monospace',
  },
  summaryValueGreen: {
    color: '#22c55e',
    fontSize: 13,
    fontFamily: 'monospace',
  },
  summaryValueBold: {
    color: '#fbbf24',
    fontSize: 16,
    fontFamily: 'monospace',
    fontWeight: 'bold',
  },
  actionContainer: {
    marginBottom: 16,
    gap: 12,
  },
  connectButton: {
    backgroundColor: '#7c3aed',
    paddingVertical: 18,
    alignItems: 'center',
  },
  connectButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontFamily: 'monospace',
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  demoButton: {
    borderWidth: 1,
    borderColor: '#44403c',
    paddingVertical: 16,
    alignItems: 'center',
  },
  demoButtonText: {
    color: '#a8a29e',
    fontSize: 14,
    fontFamily: 'monospace',
  },
  stakeButton: {
    backgroundColor: '#f59e0b',
    paddingVertical: 18,
    alignItems: 'center',
  },
  stakeButtonText: {
    color: '#0d0d0d',
    fontSize: 16,
    fontFamily: 'monospace',
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  insufficientText: {
    color: '#ef4444',
    fontSize: 12,
    fontFamily: 'monospace',
    textAlign: 'center',
  },
  walletInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  walletConnected: {
    color: '#22c55e',
    fontSize: 12,
    fontFamily: 'monospace',
  },
  walletAddress: {
    color: '#78716c',
    fontSize: 12,
    fontFamily: 'monospace',
  },
  walletBalance: {
    color: '#fbbf24',
    fontSize: 12,
    fontFamily: 'monospace',
    fontWeight: 'bold',
  },
});
