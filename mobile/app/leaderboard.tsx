import { View, Text, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLeaderboard, usePlayer } from '../lib/instant';
import { useGame } from '../lib/GameContext';

export default function LeaderboardScreen() {
  const game = useGame();
  const { leaderboard, isLoading } = useLeaderboard(25);
  const { player } = usePlayer(game.walletAddress);

  return (
    <SafeAreaView className="flex-1 bg-crypt-bg">
      {/* Header */}
      <View className="flex-row items-center justify-between px-3 py-3 border-b border-amber/30">
        <Pressable onPress={() => router.back()}>
          <Text className="text-bone-muted text-sm font-mono">[← BACK]</Text>
        </Pressable>
        <Text className="text-amber text-xs font-mono tracking-widest">◈ LEADERBOARD</Text>
        <View className="w-16" />
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#f59e0b" />
          <Text className="text-amber text-sm font-mono mt-4">Loading ranks...</Text>
        </View>
      ) : (
        <ScrollView className="flex-1" contentContainerClassName="p-4">
          {/* Current player card */}
          {player && (
            <View className="bg-crypt-surface border-2 border-amber p-4 mb-4">
              <Text className="text-amber text-xs font-mono tracking-widest mb-2">YOUR STATS</Text>
              <View className="flex-row justify-between items-center mb-2">
                <Text className="text-bone text-base font-mono font-bold">@{player.nickname}</Text>
                <Text className="text-bone-dark text-xs font-mono">
                  {player.walletAddress.slice(0, 4)}...{player.walletAddress.slice(-4)}
                </Text>
              </View>
              <View className="flex-row justify-between border-t border-crypt-border pt-2">
                <View>
                  <Text className="text-bone-dark text-xs font-mono">Deepest Room</Text>
                  <Text className="text-amber text-lg font-mono font-bold">{player.highestRoom || 0}</Text>
                </View>
                <View>
                  <Text className="text-bone-dark text-xs font-mono">Clears</Text>
                  <Text className="text-victory text-lg font-mono font-bold">{player.totalClears}</Text>
                </View>
                <View>
                  <Text className="text-bone-dark text-xs font-mono">Deaths</Text>
                  <Text className="text-blood text-lg font-mono font-bold">{player.totalDeaths}</Text>
                </View>
              </View>
            </View>
          )}

          {/* Leaderboard title */}
          <Text className="text-bone-dark text-xs font-mono tracking-widest mb-3">
            ▼ TOP WANDERERS
          </Text>

          {/* Leaderboard entries */}
          {leaderboard.length === 0 ? (
            <View className="bg-crypt-surface border border-crypt-border p-6">
              <Text className="text-bone-dark text-sm font-mono text-center italic">
                No wanderers yet. Be the first to brave the crypt!
              </Text>
            </View>
          ) : (
            leaderboard.map((entry, index) => {
              const isCurrentPlayer = player && entry.walletAddress === player.walletAddress;
              const rank = index + 1;
              const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : '';

              return (
                <View
                  key={entry.id}
                  className={`bg-crypt-surface border mb-2 p-3 ${
                    isCurrentPlayer ? 'border-amber border-2' : 'border-crypt-border'
                  }`}
                >
                  <View className="flex-row items-center gap-3">
                    {/* Rank */}
                    <View className="w-10 items-center">
                      {medal ? (
                        <Text className="text-2xl">{medal}</Text>
                      ) : (
                        <Text className="text-bone-dark text-sm font-mono font-bold">#{rank}</Text>
                      )}
                    </View>

                    {/* Player info */}
                    <View className="flex-1">
                      <View className="flex-row items-center gap-2 mb-1">
                        <Text
                          className={`text-base font-mono font-bold ${
                            isCurrentPlayer ? 'text-amber' : 'text-bone'
                          }`}
                        >
                          @{entry.nickname}
                        </Text>
                        {isCurrentPlayer && (
                          <Text className="text-amber text-[10px] font-mono">(YOU)</Text>
                        )}
                      </View>
                      
                      <View className="flex-row gap-4">
                        <View>
                          <Text className="text-bone-dark text-[10px] font-mono">ROOM</Text>
                          <Text className="text-amber text-sm font-mono font-bold">
                            {entry.highestRoom}
                          </Text>
                        </View>
                        <View>
                          <Text className="text-bone-dark text-[10px] font-mono">CLEARS</Text>
                          <Text className="text-victory text-sm font-mono font-bold">
                            {entry.totalClears}
                          </Text>
                        </View>
                        <View>
                          <Text className="text-bone-dark text-[10px] font-mono">DEATHS</Text>
                          <Text className="text-blood text-sm font-mono font-bold">
                            {entry.totalDeaths}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>
                </View>
              );
            })
          )}

          {/* Footer note */}
          <Text className="text-bone-dark text-xs font-mono text-center mt-6 mb-4 italic">
            The crypt remembers all who enter.
          </Text>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
