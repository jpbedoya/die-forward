import { useState, useEffect } from 'react';
import { View, Text, Pressable, Animated } from 'react-native';
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
  const fadeAnim = useState(new Animated.Value(1))[0];
  const pulseAnim = useState(new Animated.Value(1))[0];

  // ALL HOOKS MUST BE CALLED BEFORE ANY CONDITIONAL RETURNS
  const { totalDeaths, totalStaked, isLoading: statsLoading } = usePoolStats();
  const { deaths: recentDeaths } = useDeathFeed(5);

  useEffect(() => {
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
      <Pressable className="flex-1 bg-crypt-bg" onPress={handleTap}>
        <Animated.View className="flex-1 justify-center items-center" style={{ opacity: fadeAnim }}>
          <Text className="font-mono text-[5px] text-amber text-center">{ASCII_LOGO}</Text>
          <Animated.Text 
            className="mt-10 text-sm text-bone-dark font-mono tracking-widest"
            style={{ opacity: pulseAnim }}
          >
            [ TAP TO ENTER ]
          </Animated.Text>
        </Animated.View>
      </Pressable>
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
