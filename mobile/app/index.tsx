import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Animated, Dimensions } from 'react-native';
import { Link } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

const ASCII_LOGO = `
  ██████  ██ ███████ 
  ██   ██ ██ ██      
  ██   ██ ██ █████   
  ██   ██ ██ ██      
  ██████  ██ ███████ 
                     
  ███████  ██████  ██████  ██     ██  █████  ██████  ██████  
  ██      ██    ██ ██   ██ ██     ██ ██   ██ ██   ██ ██   ██ 
  █████   ██    ██ ██████  ██  █  ██ ███████ ██████  ██   ██ 
  ██      ██    ██ ██   ██ ██ ███ ██ ██   ██ ██   ██ ██   ██ 
  ██       ██████  ██   ██  ███ ███  ██   ██ ██   ██ ██████  
`;

export default function HomeScreen() {
  const [showSplash, setShowSplash] = useState(true);
  const fadeAnim = useState(new Animated.Value(1))[0];
  const pulseAnim = useState(new Animated.Value(1))[0];

  useEffect(() => {
    // Pulsing effect for "tap to continue"
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.5,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const handleTap = () => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => setShowSplash(false));
  };

  if (showSplash) {
    return (
      <Pressable style={styles.container} onPress={handleTap}>
        <Animated.View style={[styles.splashContent, { opacity: fadeAnim }]}>
          <Text style={styles.logo}>{ASCII_LOGO}</Text>
          <Animated.Text style={[styles.tapText, { opacity: pulseAnim }]}>
            [ TAP TO ENTER ]
          </Animated.Text>
        </Animated.View>
      </Pressable>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerSymbol}>◈</Text>
          <Text style={styles.headerTitle}>DIE FORWARD</Text>
        </View>

        {/* Tagline */}
        <View style={styles.taglineContainer}>
          <Text style={styles.tagline}>Your Death Feeds the Depths</Text>
          <Text style={styles.subtitle}>
            Stake SOL. Descend. Die. Leave your mark.
          </Text>
        </View>

        {/* Main CTA */}
        <View style={styles.ctaContainer}>
          <Link href="/stake" asChild>
            <Pressable style={styles.primaryButton}>
              <Text style={styles.primaryButtonText}>▶ START GAME</Text>
            </Pressable>
          </Link>
          
          <Pressable style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>🎮 FREE PLAY (Demo)</Text>
          </Pressable>
        </View>

        {/* Stats placeholder */}
        <View style={styles.statsContainer}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>◎ 12.5</Text>
            <Text style={styles.statLabel}>SOL in Pool</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>💀 247</Text>
            <Text style={styles.statLabel}>Deaths Today</Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Powered by Solana</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const { width } = Dimensions.get('window');
const isSmallScreen = width < 380;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0d0d0d',
  },
  splashContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    fontFamily: 'monospace',
    fontSize: isSmallScreen ? 4 : 6,
    color: '#f59e0b',
    textAlign: 'center',
    textShadowColor: 'rgba(245, 158, 11, 0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },
  tapText: {
    marginTop: 40,
    fontSize: 14,
    color: '#78716c',
    fontFamily: 'monospace',
    letterSpacing: 2,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 20,
    gap: 8,
  },
  headerSymbol: {
    fontSize: 24,
    color: '#f59e0b',
  },
  headerTitle: {
    fontSize: 20,
    color: '#e7e5e4',
    fontFamily: 'monospace',
    fontWeight: 'bold',
    letterSpacing: 4,
  },
  taglineContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  tagline: {
    fontSize: 22,
    color: '#e7e5e4',
    fontFamily: 'monospace',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 14,
    color: '#78716c',
    textAlign: 'center',
    fontFamily: 'monospace',
  },
  ctaContainer: {
    gap: 12,
  },
  primaryButton: {
    backgroundColor: '#f59e0b',
    paddingVertical: 18,
    paddingHorizontal: 32,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#0d0d0d',
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: 'monospace',
    letterSpacing: 2,
  },
  secondaryButton: {
    borderWidth: 2,
    borderColor: '#44403c',
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#a8a29e',
    fontSize: 16,
    fontFamily: 'monospace',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 30,
  },
  statBox: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    color: '#fbbf24',
    fontFamily: 'monospace',
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 12,
    color: '#57534e',
    fontFamily: 'monospace',
    marginTop: 4,
  },
  footer: {
    alignItems: 'center',
    paddingBottom: 20,
  },
  footerText: {
    fontSize: 12,
    color: '#44403c',
    fontFamily: 'monospace',
  },
});
