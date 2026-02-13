import { useState } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function DeathScreen() {
  const [finalWords, setFinalWords] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    // TODO: Submit to API
    setSubmitted(true);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Skull */}
        <Text style={styles.skull}>💀</Text>
        
        {/* Title */}
        <Text style={styles.title}>YOU DIED</Text>
        <Text style={styles.subtitle}>Your death feeds the depths.</Text>

        {/* Stats */}
        <View style={styles.statsBox}>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Depth Reached</Text>
            <Text style={styles.statValue}>Upper Crypt (Room 2)</Text>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>SOL Lost</Text>
            <Text style={styles.statValueRed}>◎ 0.05</Text>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Killed By</Text>
            <Text style={styles.statValue}>Pale Crawler</Text>
          </View>
        </View>

        {/* Final Words */}
        {!submitted ? (
          <View style={styles.wordsSection}>
            <Text style={styles.wordsLabel}>LEAVE YOUR FINAL WORDS</Text>
            <Text style={styles.wordsHint}>
              The next adventurer will find your corpse and read these words.
            </Text>
            <TextInput
              style={styles.wordsInput}
              value={finalWords}
              onChangeText={setFinalWords}
              placeholder="What do you want them to know?"
              placeholderTextColor="#57534e"
              multiline
              maxLength={200}
            />
            <Text style={styles.charCount}>{finalWords.length}/200</Text>
            
            <Pressable 
              style={[styles.submitButton, !finalWords && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={!finalWords}
            >
              <Text style={styles.submitButtonText}>⚰️ ETCH INTO STONE</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.confirmedBox}>
            <Text style={styles.confirmedText}>
              ✓ Your final words have been etched into the stone.
            </Text>
            <Text style={styles.confirmedSubtext}>
              Perhaps someone will find meaning in them.
            </Text>
          </View>
        )}

        {/* Actions */}
        <View style={styles.actions}>
          <Pressable 
            style={styles.primaryButton}
            onPress={() => router.replace('/')}
          >
            <Text style={styles.primaryButtonText}>↻ TRY AGAIN</Text>
          </Pressable>
          
          <Pressable 
            style={styles.secondaryButton}
            onPress={() => {/* TODO: Share card */}}
          >
            <Text style={styles.secondaryButtonText}>📤 SHARE DEATH CARD</Text>
          </Pressable>
        </View>
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
  skull: {
    fontSize: 64,
    marginBottom: 16,
  },
  title: {
    fontSize: 32,
    color: '#ef4444',
    fontFamily: 'monospace',
    fontWeight: 'bold',
    letterSpacing: 4,
    marginBottom: 8,
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
  statLabel: {
    color: '#78716c',
    fontSize: 13,
    fontFamily: 'monospace',
  },
  statValue: {
    color: '#a8a29e',
    fontSize: 13,
    fontFamily: 'monospace',
  },
  statValueRed: {
    color: '#ef4444',
    fontSize: 13,
    fontFamily: 'monospace',
    fontWeight: 'bold',
  },
  wordsSection: {
    width: '100%',
    marginBottom: 24,
  },
  wordsLabel: {
    color: '#a855f7',
    fontSize: 12,
    fontFamily: 'monospace',
    letterSpacing: 2,
    marginBottom: 8,
  },
  wordsHint: {
    color: '#57534e',
    fontSize: 12,
    fontFamily: 'monospace',
    marginBottom: 12,
  },
  wordsInput: {
    backgroundColor: '#1c1917',
    borderWidth: 1,
    borderColor: '#44403c',
    color: '#e7e5e4',
    fontSize: 14,
    fontFamily: 'monospace',
    padding: 12,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  charCount: {
    color: '#57534e',
    fontSize: 11,
    fontFamily: 'monospace',
    textAlign: 'right',
    marginTop: 4,
    marginBottom: 12,
  },
  submitButton: {
    backgroundColor: '#7c3aed',
    paddingVertical: 14,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontFamily: 'monospace',
    fontWeight: 'bold',
  },
  confirmedBox: {
    width: '100%',
    backgroundColor: 'rgba(124, 58, 237, 0.1)',
    borderWidth: 1,
    borderColor: '#7c3aed',
    padding: 16,
    marginBottom: 24,
    alignItems: 'center',
  },
  confirmedText: {
    color: '#a855f7',
    fontSize: 14,
    fontFamily: 'monospace',
    marginBottom: 4,
  },
  confirmedSubtext: {
    color: '#78716c',
    fontSize: 12,
    fontFamily: 'monospace',
  },
  actions: {
    width: '100%',
    gap: 12,
  },
  primaryButton: {
    backgroundColor: '#f59e0b',
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#0d0d0d',
    fontSize: 16,
    fontFamily: 'monospace',
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: '#44403c',
    paddingVertical: 14,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#a8a29e',
    fontSize: 14,
    fontFamily: 'monospace',
  },
});
