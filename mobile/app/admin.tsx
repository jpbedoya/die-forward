// Admin dashboard for Die Forward
// View corpses, deaths, and game state

import { View, Text, ScrollView, Pressable, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useState, useCallback } from 'react';
import { db, Corpse } from '../lib/instant';

// Hook to get all corpses for admin view
function useAllCorpses() {
  const { data, isLoading, error } = db.useQuery({
    corpses: {
      $: {
        limit: 100,
      },
    },
  });

  const corpses = (data?.corpses || []) as unknown as Corpse[];
  
  // Sort by createdAt descending (newest first)
  const sorted = [...corpses].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  
  return { corpses: sorted, isLoading, error };
}

// Hook to get recent deaths
function useRecentDeaths() {
  const { data, isLoading, error } = db.useQuery({
    deaths: {
      $: {
        limit: 50,
      },
    },
  });

  return { deaths: data?.deaths || [], isLoading, error };
}

export default function AdminScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'corpses' | 'deaths'>('corpses');
  const { corpses, isLoading: corpsesLoading } = useAllCorpses();
  const { deaths, isLoading: deathsLoading } = useRecentDeaths();

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    // InstantDB auto-refreshes, just show spinner briefly
    setTimeout(() => setRefreshing(false), 500);
  }, []);

  const formatDate = (ts: number) => {
    if (!ts) return 'Unknown';
    const d = new Date(ts);
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getZoneColor = (zone: string) => {
    if (zone?.includes('Upper')) return 'text-amber';
    if (zone?.includes('Flooded')) return 'text-blue-400';
    if (zone?.includes('Abyss')) return 'text-ethereal';
    return 'text-bone-muted';
  };

  return (
    <SafeAreaView className="flex-1 bg-crypt-bg">
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-crypt-border">
        <Pressable onPress={() => router.back()}>
          <Text className="text-bone-muted font-mono">← Back</Text>
        </Pressable>
        <Text className="text-amber font-mono font-bold tracking-wider">ADMIN</Text>
        <View style={{ width: 50 }} />
      </View>

      {/* Tabs */}
      <View className="flex-row border-b border-crypt-border">
        <Pressable 
          className={`flex-1 py-3 ${activeTab === 'corpses' ? 'border-b-2 border-amber' : ''}`}
          onPress={() => setActiveTab('corpses')}
        >
          <Text className={`text-center font-mono ${activeTab === 'corpses' ? 'text-amber' : 'text-bone-muted'}`}>
            💀 Corpses ({corpses.length})
          </Text>
        </Pressable>
        <Pressable 
          className={`flex-1 py-3 ${activeTab === 'deaths' ? 'border-b-2 border-blood' : ''}`}
          onPress={() => setActiveTab('deaths')}
        >
          <Text className={`text-center font-mono ${activeTab === 'deaths' ? 'text-blood' : 'text-bone-muted'}`}>
            ☠️ Deaths ({deaths.length})
          </Text>
        </Pressable>
      </View>

      <ScrollView 
        className="flex-1 p-4"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#f59e0b" />}
      >
        {activeTab === 'corpses' && (
          <>
            {/* Stats summary */}
            <View className="bg-crypt-surface border border-crypt-border p-3 mb-4">
              <Text className="text-bone-dark text-xs font-mono mb-2">CORPSE STATS</Text>
              <View className="flex-row justify-between">
                <View>
                  <Text className="text-bone-muted text-xs font-mono">Undiscovered</Text>
                  <Text className="text-victory font-mono font-bold">
                    {corpses.filter(c => !c.discovered).length}
                  </Text>
                </View>
                <View>
                  <Text className="text-bone-muted text-xs font-mono">Discovered</Text>
                  <Text className="text-bone font-mono font-bold">
                    {corpses.filter(c => c.discovered).length}
                  </Text>
                </View>
                <View>
                  <Text className="text-bone-muted text-xs font-mono">Tipped</Text>
                  <Text className="text-amber font-mono font-bold">
                    {corpses.filter(c => c.tipped).length}
                  </Text>
                </View>
              </View>
            </View>

            {/* Corpse list */}
            {corpsesLoading ? (
              <Text className="text-bone-muted font-mono text-center">Loading...</Text>
            ) : corpses.length === 0 ? (
              <Text className="text-bone-muted font-mono text-center">No corpses found</Text>
            ) : (
              corpses.map((corpse) => (
                <View 
                  key={corpse.id} 
                  className={`bg-crypt-surface border p-3 mb-2 ${
                    corpse.discovered ? 'border-crypt-border opacity-60' : 'border-ethereal'
                  }`}
                >
                  <View className="flex-row items-center justify-between mb-2">
                    <View className="flex-row items-center gap-2">
                      <Text className="text-xl">💀</Text>
                      <Text className="text-ethereal font-mono font-bold">@{corpse.playerName}</Text>
                    </View>
                    <View className="flex-row gap-2">
                      {!corpse.discovered && (
                        <View className="bg-victory/20 px-2 py-0.5">
                          <Text className="text-victory text-[10px] font-mono">ACTIVE</Text>
                        </View>
                      )}
                      {corpse.discovered && (
                        <View className="bg-bone-dark/20 px-2 py-0.5">
                          <Text className="text-bone-dark text-[10px] font-mono">LOOTED</Text>
                        </View>
                      )}
                      {corpse.tipped && (
                        <View className="bg-amber/20 px-2 py-0.5">
                          <Text className="text-amber text-[10px] font-mono">TIPPED</Text>
                        </View>
                      )}
                    </View>
                  </View>

                  {/* Location */}
                  <View className="flex-row items-center gap-2 mb-2">
                    <Text className={`text-xs font-mono ${getZoneColor(corpse.zone)}`}>
                      {corpse.zone}
                    </Text>
                    <Text className="text-bone-dark text-xs">•</Text>
                    <Text className="text-bone-muted text-xs font-mono">Room {corpse.room}</Text>
                  </View>

                  {/* Final message */}
                  <View className="bg-black/30 p-2 mb-2">
                    <Text className="text-bone text-xs font-mono italic" numberOfLines={2}>
                      "{corpse.finalMessage}"
                    </Text>
                  </View>

                  {/* Loot & details */}
                  <View className="flex-row justify-between items-center">
                    <Text className="text-amber-light text-xs font-mono">
                      {corpse.lootEmoji} {corpse.loot}
                    </Text>
                    <Text className="text-bone-dark text-[10px] font-mono">
                      {formatDate(corpse.createdAt)}
                    </Text>
                  </View>

                  {/* Wallet */}
                  <Text className="text-bone-dark text-[10px] font-mono mt-1">
                    {corpse.walletAddress?.slice(0, 8)}...{corpse.walletAddress?.slice(-4)}
                  </Text>
                </View>
              ))
            )}
          </>
        )}

        {activeTab === 'deaths' && (
          <>
            {deathsLoading ? (
              <Text className="text-bone-muted font-mono text-center">Loading...</Text>
            ) : deaths.length === 0 ? (
              <Text className="text-bone-muted font-mono text-center">No deaths recorded</Text>
            ) : (
              (deaths as any[]).map((death) => (
                <View key={death.id} className="bg-crypt-surface border border-blood/30 p-3 mb-2">
                  <View className="flex-row items-center justify-between mb-2">
                    <Text className="text-blood font-mono font-bold">@{death.playerName}</Text>
                    <Text className="text-bone-dark text-[10px] font-mono">
                      {formatDate(death.createdAt)}
                    </Text>
                  </View>
                  <View className="flex-row items-center gap-2 mb-2">
                    <Text className="text-bone-muted text-xs font-mono">{death.zone}</Text>
                    <Text className="text-bone-dark text-xs">•</Text>
                    <Text className="text-bone-muted text-xs font-mono">Room {death.room}</Text>
                    {death.killedBy && (
                      <>
                        <Text className="text-bone-dark text-xs">•</Text>
                        <Text className="text-blood text-xs font-mono">by {death.killedBy}</Text>
                      </>
                    )}
                  </View>
                  <Text className="text-bone text-xs font-mono italic">"{death.finalMessage}"</Text>
                  {death.stakeAmount > 0 && (
                    <Text className="text-amber text-xs font-mono mt-1">◎ {death.stakeAmount} SOL lost</Text>
                  )}
                </View>
              ))
            )}
          </>
        )}

        {/* Spacer */}
        <View className="h-8" />
      </ScrollView>
    </SafeAreaView>
  );
}
