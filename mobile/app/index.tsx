import { useState, useEffect, useRef } from 'react';
import { View, Text, Pressable, Animated } from 'react-native';
import { Link } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { usePoolStats, useDeathFeed } from '../lib/instant';
import { useAudio } from '../lib/audio';

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
  
  // Animations - simpler for smoother performance
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  // ALL HOOKS MUST BE CALLED BEFORE ANY CONDITIONAL RETURNS
  const { totalDeaths, totalStaked, isLoading: statsLoading } = usePoolStats();
  const { deaths: recentDeaths } = useDeathFeed(5);
  const { playAmbient, enabled: audioEnabled, toggle: toggleAudio, unlock: unlockAudio } = useAudio();

  // Play title ambient (queued until user interacts)
  useEffect(() => {
    playAmbient('ambient-title');
  }, []);

  // Splash intro animation - smooth and simple
  useEffect(() => {
    // Phase 1: Fade in
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start(() => {
      // Phase 2: Gentle pulse
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.05,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ]).start(() => {
        // Phase 3: Zoom out + fade
        setTimeout(() => {
          Animated.parallel([
            Animated.timing(scaleAnim, {
              toValue: 2.5,
              duration: 350,
              useNativeDriver: true,
            }),
            Animated.timing(fadeAnim, {
              toValue: 0,
              duration: 350,
              useNativeDriver: true,
            }),
          ]).start(() => setShowSplash(false));
        }, 300);
      });
    });
  }, []);

  if (showSplash) {
    return (
      <Pressable 
        className="flex-1 bg-crypt-bg"
        onPress={unlockAudio} // Tap anywhere to unlock audio
      >
        <View className="flex-1 justify-center items-center">
          {/* Centered logo with pulse + zoom */}
          <Animated.View 
            style={{ 
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            }}
          >
            <Text 
              className="font-mono text-[6px] text-amber text-center leading-[7px]"
              style={{ textShadowColor: '#f59e0b', textShadowRadius: 20 }}
            >
              {ASCII_LOGO}
            </Text>
          </Animated.View>
          
          {/* Subtle hint */}
          <Text className="text-stone-600 text-xs font-mono mt-8">tap to enable sound</Text>
        </View>
      </Pressable>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-crypt-bg">
      {/* Sound Toggle - Top Right */}
      <Pressable 
        className="absolute top-12 right-4 z-10 p-2"
        onPress={async () => {
          unlockAudio(); // Unlock audio on web
          const nowEnabled = await toggleAudio(); // Returns new state
          // If just enabled, play ambient
          if (nowEnabled) {
            playAmbient('ambient-title');
          }
        }}
      >
        <Text className="text-xl">{audioEnabled ? '🔊' : '🔇'}</Text>
      </Pressable>

      <View className="flex-1 px-5 justify-between">
        {/* Header - ASCII Logo */}
        <View className="items-center pt-4">
          <Text 
            className="font-mono text-[6px] text-amber text-center leading-[7px]"
            style={{ textShadowColor: '#f59e0b', textShadowRadius: 12 }}
          >
            {ASCII_LOGO}
          </Text>
        </View>

        {/* Tagline */}
        <View className="items-center py-6">
          <Text className="text-lg text-bone font-mono text-center mb-2">
            Your Death Feeds the Depths
          </Text>
          <Text className="text-xs text-bone-dark text-center font-mono">
            Stake SOL. Descend. Die. Leave your mark.
          </Text>
        </View>

        {/* Main CTA */}
        <View className="gap-3">
          <Link href="/stake" asChild>
            <Pressable className="bg-amber py-5 px-8 items-center active:bg-amber-dark">
              <Text className="text-crypt-bg text-lg font-bold font-mono tracking-widest">
                ▼ ENTER THE CRYPT
              </Text>
            </Pressable>
          </Link>

          {/* Leaderboard */}
          <Link href="/leaderboard" asChild>
            <Pressable className="border border-crypt-border py-3 px-4 items-center active:border-amber">
              <Text className="text-bone-dark text-sm font-mono">🏆 Leaderboard</Text>
            </Pressable>
          </Link>
        </View>

        {/* Total Deaths */}
        <View className="items-center py-4">
          <Text className="text-3xl text-amber-light font-mono font-bold">
            💀 {statsLoading ? '...' : totalDeaths}
          </Text>
          <Text className="text-xs text-stone-600 font-mono mt-1">Total Deaths</Text>
        </View>

        {/* Recent Deaths Feed */}
        <View className="bg-crypt-surface border border-crypt-border p-3 mb-5 flex-1">
          <Text className="text-[10px] text-bone-dark font-mono tracking-widest mb-2">
            DEATHS FEED
          </Text>
          {recentDeaths.length > 0 ? (
            recentDeaths.slice(0, 5).map((death, i) => (
              <View key={death.id || i} className="py-1.5 border-b border-crypt-border last:border-b-0">
                <Text className="text-xs text-bone-muted font-mono">
                  💀 <Text className="text-ethereal">@{death.playerName}</Text>
                  {' fell in '}{death.zone} (Room {death.room})
                </Text>
              </View>
            ))
          ) : (
            <Text className="text-xs text-bone-dark font-mono">No deaths yet... be the first.</Text>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}
