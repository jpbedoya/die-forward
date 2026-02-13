import { useState } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

const STAKE_OPTIONS = [0.01, 0.05, 0.1, 0.25];

export default function StakeScreen() {
  const [selectedStake, setSelectedStake] = useState(0.05);
  const [customStake, setCustomStake] = useState('');
  const [walletConnected, setWalletConnected] = useState(false);

  const handleConnect = () => {
    // TODO: Integrate Solana Mobile Wallet Adapter
    setWalletConnected(true);
  };

  const handleStake = () => {
    // TODO: Create game session and navigate to play
    router.push('/play');
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
          {!walletConnected ? (
            <Pressable style={styles.connectButton} onPress={handleConnect}>
              <Text style={styles.connectButtonText}>🔗 CONNECT WALLET</Text>
            </Pressable>
          ) : (
            <Pressable style={styles.stakeButton} onPress={handleStake}>
              <Text style={styles.stakeButtonText}>⚔️ STAKE & DESCEND</Text>
            </Pressable>
          )}
        </View>

        {/* Wallet status */}
        {walletConnected && (
          <View style={styles.walletInfo}>
            <Text style={styles.walletConnected}>✓ Wallet Connected</Text>
            <Text style={styles.walletAddress}>8xH4...k9Qz</Text>
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
});
