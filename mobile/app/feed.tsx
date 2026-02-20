import { View, Text, ScrollView, Pressable, ActivityIndicator, RefreshControl } from 'react-native';
import { CryptBackground } from '../components/CryptBackground';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDeathFeed, usePoolStats, Death } from '../lib/instant';
import { getDepthForRoom } from '../lib/content';
import { useState } from 'react';

// Format timestamp as relative time
function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return `${Math.floor(days / 7)}w ago`;
}

function DeathEntry({ death }: { death: Death }) {
  const depth = getDepthForRoom(death.room);
  const depthColor = depth.tier === 3 ? 'text-ethereal' : depth.tier === 2 ? 'text-amber' : 'text-bone';

  return (
    <View className="bg-crypt-surface border border-crypt-border mb-3 p-3">
      {/* Header */}
      <View className="flex-row items-center justify-between mb-2">
        <View className="flex-row items-center gap-2">
          <Text className="text-2xl">💀</Text>
          <View>
            <Text className="text-bone text-base font-mono font-bold">{death.playerName}</Text>
            <Text className="text-bone-dark text-xs font-mono">
              {death.walletAddress.slice(0, 4)}...{death.walletAddress.slice(-4)}
            </Text>
          </View>
        </View>
        <Text className="text-bone-dark text-xs font-mono">{formatTimeAgo(death.createdAt)}</Text>
      </View>

      {/* Death location */}
      <View className="flex-row items-center gap-2 mb-2">
        <Text className={`text-xs font-mono tracking-widest ${depthColor}`}>
          {depth.name}
        </Text>
        <Text className="text-bone-dark text-xs font-mono">•</Text>
        <Text className="text-bone-dark text-xs font-mono">ROOM {death.room}</Text>
        {death.stakeAmount > 0 && (
          <>
            <Text className="text-bone-dark text-xs font-mono">•</Text>
            <Text className="text-amber text-xs font-mono font-bold">
              ◎ {death.stakeAmount}
            </Text>
          </>
        )}
      </View>

      {/* Final message */}
      <View className="bg-black/30 border-l-2 border-blood p-2">
        <Text className="text-bone text-sm font-mono italic">"{death.finalMessage}"</Text>
      </View>
    </View>
  );
}

export default function FeedScreen() {
  const { deaths, isLoading } = useDeathFeed(30);
  const { totalDeaths, totalStaked, isLoading: statsLoading } = usePoolStats();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    // The hooks will auto-refresh via InstantDB subscriptions
    setTimeout(() => setRefreshing(false), 1000);
  };

  return (
    <CryptBackground screen="feed">
    <SafeAreaView className="flex-1">
      {/* Header */}
      <View className="flex-row items-center justify-between px-3 py-3 border-b border-amber/30">
        <Pressable onPress={() => router.back()}>
          <Text className="text-bone-muted text-sm font-mono">[← BACK]</Text>
        </Pressable>
        <Text className="text-amber text-xs font-mono tracking-widest">◈ DEATH FEED</Text>
        <View className="w-16" />
      </View>

      {isLoading && !refreshing ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#f59e0b" />
          <Text className="text-amber text-sm font-mono mt-4">Loading deaths...</Text>
        </View>
      ) : (
        <ScrollView
          className="flex-1"
          contentContainerClassName="p-4"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#f59e0b"
              colors={['#f59e0b']}
            />
          }
        >
          {/* Pool stats */}
          {!statsLoading && (
            <View className="bg-crypt-surface border-2 border-ethereal p-4 mb-4">
              <Text className="text-ethereal text-xs font-mono tracking-widest mb-3">
                ◈ THE CRYPT REMEMBERS
              </Text>
              <View className="flex-row justify-around">
                <View className="items-center">
                  <Text className="text-bone-dark text-xs font-mono">Total Deaths</Text>
                  <Text className="text-blood text-2xl font-mono font-bold">{totalDeaths}</Text>
                </View>
                <View className="items-center">
                  <Text className="text-bone-dark text-xs font-mono">SOL Lost</Text>
                  <Text className="text-amber text-2xl font-mono font-bold">
                    {totalStaked.toFixed(2)}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Recent deaths */}
          <Text className="text-bone-dark text-xs font-mono tracking-widest mb-3">
            ▼ RECENT FALLEN
          </Text>

          {deaths.length === 0 ? (
            <View className="bg-crypt-surface border border-crypt-border p-6">
              <Text className="text-bone-dark text-sm font-mono text-center italic">
                The crypt is silent... for now.
              </Text>
            </View>
          ) : (
            deaths.map((death) => <DeathEntry key={death.id} death={death} />)
          )}

          {/* Footer */}
          <Text className="text-bone-dark text-xs font-mono text-center mt-6 mb-4 italic">
            Each death becomes content for the living.
          </Text>
        </ScrollView>
      )}
    </SafeAreaView>
    </CryptBackground>
  );
}