import { useState, useEffect, useRef } from 'react';
import { View, Text, Pressable, Animated, Dimensions } from 'react-native';
import { Link } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { usePoolStats, useDeathFeed } from '../lib/instant';

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
  
  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.8)).current;
  const logoZoom = useRef(new Animated.Value(1)).current;

  // ALL HOOKS MUST BE CALLED BEFORE ANY CONDITIONAL RETURNS
  const { totalDeaths, totalStaked, isLoading: statsLoading } = usePoolStats();
  const { deaths: recentDeaths } = useDeathFeed(5);
  // Splash intro animation - auto transition after one pulse
  useEffect(() => {
    // Fade in + scale up + one pulse + zoom transition
    Animated.sequence([
      // Fade in logo
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      // Scale up to full size
      Animated.timing(logoScale, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      // One pulse: scale up
      Animated.timing(logoScale, {
        toValue: 1.08,
        duration: 800,
        useNativeDriver: true,
      }),
      // Pulse back down
      Animated.timing(logoScale, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      // Brief pause
      Animated.delay(200),
    ]).start(() => {
      // Auto-transition: zoom out towards player then fade to main screen
      Animated.parallel([
        // Logo zooms towards player
        Animated.timing(logoZoom, {
          toValue: 3,
          duration: 400,
          useNativeDriver: true,
        }),
        // Fade out splash
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start(() => setShowSplash(false));
    });
  }, []);

  if (showSplash) {
    return (
      <View className="flex-1 bg-crypt-bg">
        <View className="flex-1 justify-center items-center">
          {/* Centered logo with pulse + zoom */}
          <Animated.View 
            style={{ 
              opacity: fadeAnim,
              transform: [
                { scale: Animated.multiply(logoScale, logoZoom) }
              ],
            }}
          >
            <Text 
              className="font-mono text-[6px] text-amber text-center leading-[7px]"
              style={{ textShadowColor: '#f59e0b', textShadowRadius: 20 }}
            >
              {ASCII_LOGO}
            </Text>
          </Animated.View>
        </View>
        
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-crypt-bg">
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
