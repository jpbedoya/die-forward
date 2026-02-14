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

// Progress bar for loading effect
const PROGRESS_CHARS = ['░', '▒', '▓', '█'];

export default function HomeScreen() {
  const [showSplash, setShowSplash] = useState(true);
  const [isTransitioning, setIsTransitioning] = useState(false);
  
  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.8)).current;
  const logoPulse = useRef(new Animated.Value(1)).current;
  const logoZoom = useRef(new Animated.Value(1)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const titleFade = useRef(new Animated.Value(0)).current;
  const progressWidth = useRef(new Animated.Value(0)).current;
  const [progressText, setProgressText] = useState('');

  // ALL HOOKS MUST BE CALLED BEFORE ANY CONDITIONAL RETURNS
  const { totalDeaths, totalStaked, isLoading: statsLoading } = usePoolStats();
  const { deaths: recentDeaths } = useDeathFeed(5);

  // Splash intro animation
  useEffect(() => {
    // Animate progress bar
    let progress = 0;
    const progressInterval = setInterval(() => {
      progress += Math.random() * 15 + 5;
      if (progress >= 100) {
        progress = 100;
        clearInterval(progressInterval);
      }
      const filled = Math.floor(progress / 10);
      const empty = 10 - filled;
      setProgressText('█'.repeat(filled) + '░'.repeat(empty) + ` ${Math.floor(progress)}%`);
    }, 150);

    // Fade in logo
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      // Scale up logo
      Animated.timing(logoScale, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // Start pulsing
      Animated.loop(
        Animated.sequence([
          Animated.timing(logoPulse, {
            toValue: 1.05,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(logoPulse, {
            toValue: 0.95,
            duration: 1500,
            useNativeDriver: true,
          }),
        ])
      ).start();
      
      // Fade in tap text
      Animated.timing(textOpacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
    });

    return () => clearInterval(progressInterval);
  }, []);

  const handleTap = () => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    
    // Stop pulsing and zoom towards player
    logoPulse.stopAnimation();
    
    Animated.parallel([
      // Logo zooms out (scales up like coming at you)
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
      // Fade in title screen
      Animated.timing(titleFade, {
        toValue: 1,
        duration: 600,
        delay: 200,
        useNativeDriver: true,
      }),
    ]).start(() => setShowSplash(false));
  };

  if (showSplash) {
    return (
      <View className="flex-1 bg-crypt-bg">
        <Pressable 
          className="flex-1 justify-center items-center"
          onPress={handleTap}
        >
          {/* Centered pulsing logo */}
          <Animated.View 
            style={{ 
              opacity: fadeAnim,
              transform: [
                { scale: Animated.multiply(logoScale, Animated.multiply(logoPulse, logoZoom)) }
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
          
          {/* Progress bar */}
          <Animated.View style={{ opacity: fadeAnim }} className="mt-8">
            <Text className="font-mono text-xs text-amber-dark text-center tracking-wider">
              {progressText}
            </Text>
          </Animated.View>
          
          {/* Tap to enter */}
          <Animated.Text 
            className="mt-8 text-sm text-bone-dark font-mono tracking-widest"
            style={{ opacity: textOpacity }}
          >
            [ TAP TO ENTER ]
          </Animated.Text>
        </Pressable>
        
        {/* Title screen fading in behind */}
        <Animated.View 
          className="absolute inset-0" 
          style={{ opacity: titleFade }}
          pointerEvents="none"
        >
          <View className="flex-1 bg-crypt-bg justify-center items-center">
            <Text className="text-2xl text-amber">◈</Text>
            <Text className="text-xl text-bone font-mono font-bold tracking-[4px] mt-2">DIE FORWARD</Text>
          </View>
        </Animated.View>
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-crypt-bg">
      <View className="flex-1 px-5 justify-between">
        {/* Header */}
        <View className="flex-row items-center justify-center pt-5 gap-2">
          <Text className="text-2xl text-amber">◈</Text>
          <Text className="text-xl text-bone font-mono font-bold tracking-[4px]">DIE FORWARD</Text>
        </View>

        {/* Tagline */}
        <View className="items-center py-10">
          <Text className="text-2xl text-bone font-mono text-center mb-3">
            Your Death Feeds the Depths
          </Text>
          <Text className="text-sm text-bone-dark text-center font-mono">
            Stake SOL. Descend. Die. Leave your mark.
          </Text>
        </View>

        {/* Main CTA */}
        <View className="gap-3">
          <Link href="/stake" asChild>
            <Pressable className="bg-amber py-5 px-8 items-center active:bg-amber-dark">
              <Text className="text-crypt-bg text-lg font-bold font-mono tracking-widest">
                ▶ START GAME
              </Text>
            </Pressable>
          </Link>
          
          <Link href="/stake" asChild>
            <Pressable className="border-2 border-crypt-border-light py-4 px-8 items-center active:border-amber">
              <Text className="text-bone-muted text-base font-mono">🎮 FREE PLAY (Demo)</Text>
            </Pressable>
          </Link>

          {/* Secondary navigation */}
          <View className="flex-row gap-2">
            <Link href="/leaderboard" asChild className="flex-1">
              <Pressable className="border border-crypt-border py-3 px-4 items-center active:border-amber">
                <Text className="text-bone-dark text-sm font-mono">🏆 Leaderboard</Text>
              </Pressable>
            </Link>
            
            <Link href="/feed" asChild className="flex-1">
              <Pressable className="border border-crypt-border py-3 px-4 items-center active:border-amber">
                <Text className="text-bone-dark text-sm font-mono">💀 Feed</Text>
              </Pressable>
            </Link>
          </View>
        </View>

        {/* Live Stats */}
        <View className="flex-row justify-around py-8">
          <View className="items-center">
            <Text className="text-xl text-amber-light font-mono font-bold">
              ◎ {statsLoading ? '...' : totalStaked.toFixed(2)}
            </Text>
            <Text className="text-xs text-stone-600 font-mono mt-1">SOL Staked</Text>
          </View>
          <View className="items-center">
            <Text className="text-xl text-amber-light font-mono font-bold">
              💀 {statsLoading ? '...' : totalDeaths}
            </Text>
            <Text className="text-xs text-stone-600 font-mono mt-1">Total Deaths</Text>
          </View>
        </View>

        {/* Recent Deaths Feed */}
        {recentDeaths.length > 0 && (
          <View className="bg-crypt-surface border border-crypt-border p-3 mb-5">
            <Text className="text-[10px] text-bone-dark font-mono tracking-widest mb-2">
              RECENT DEATHS
            </Text>
            {recentDeaths.slice(0, 3).map((death, i) => (
              <View key={death.id || i} className="py-1">
                <Text className="text-xs text-bone-muted font-mono">
                  💀 <Text className="text-ethereal">@{death.playerName}</Text>
                  {' fell in '}{death.zone} (Room {death.room})
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Footer */}
        <View className="items-center pb-5">
          <Text className="text-xs text-crypt-border-light font-mono">Powered by Solana</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}
