// Share card generation for React Native
// Uses react-native-view-shot to capture views as images

import React, { useRef, useCallback } from 'react';
import { View, Text } from 'react-native';
import ViewShot from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';

export interface DeathCardData {
  playerName: string;
  room: number;
  totalRooms: number;
  killedBy: string | null;
  epitaph: string;
  stakeLost: number;
}

export interface VictoryCardData {
  playerName: string;
  roomsCleared: number;
  stakeWon: number;
  enemiesDefeated: number;
}

// Death Card Component
export function DeathCard({ data }: { data: DeathCardData }) {
  return (
    <View className="w-[300px] h-[400px] bg-[#1a0505] border-2 border-blood p-4">
      {/* Inner border */}
      <View className="flex-1 border border-blood-dark p-3">
        {/* Skull */}
        <Text className="text-center text-5xl mb-2">💀</Text>
        
        {/* Title */}
        <Text className="text-blood text-2xl font-mono font-bold text-center">YOU DIED</Text>
        <Text className="text-bone-muted text-xs font-mono text-center mb-4">in THE SUNKEN CRYPT</Text>
        
        {/* Player name */}
        <Text className="text-amber text-lg font-mono font-bold text-center mb-2">@{data.playerName}</Text>
        
        {/* Progress */}
        <Text className="text-bone text-sm font-mono text-center">
          Reached Room {data.room} of {data.totalRooms}
        </Text>
        
        {/* Killed by */}
        {data.killedBy && (
          <Text className="text-blood-dark text-xs font-mono italic text-center mt-1">
            Slain by {data.killedBy}
          </Text>
        )}
        
        {/* Epitaph box */}
        <View className="bg-black/50 border border-crypt-border p-2 mt-4 mb-4">
          <Text className="text-stone-500 text-[10px] font-mono text-center mb-1">FINAL WORDS</Text>
          <Text className="text-bone text-sm font-mono italic text-center">"{data.epitaph}"</Text>
        </View>
        
        {/* Stake lost */}
        <Text className="text-amber text-base font-mono font-bold text-center mb-4">
          ◎ {data.stakeLost} SOL LOST
        </Text>
        
        {/* Divider */}
        <View className="border-t border-crypt-border mb-3" />
        
        {/* Game title */}
        <Text className="text-amber text-xl font-mono font-bold text-center">DIE FORWARD</Text>
        <Text className="text-stone-500 text-[10px] font-mono text-center">dieforward.com</Text>
      </View>
    </View>
  );
}

// Victory Card Component
export function VictoryCard({ data }: { data: VictoryCardData }) {
  return (
    <View className="w-[300px] h-[400px] bg-[#0a1a05] border-2 border-victory p-4">
      {/* Inner border */}
      <View className="flex-1 border border-green-900 p-3">
        {/* Trophy */}
        <Text className="text-center text-5xl mb-2">🏆</Text>
        
        {/* Title */}
        <Text className="text-victory text-2xl font-mono font-bold text-center">ESCAPED</Text>
        <Text className="text-bone-muted text-xs font-mono text-center mb-4">THE SUNKEN CRYPT</Text>
        
        {/* Player name */}
        <Text className="text-amber text-lg font-mono font-bold text-center mb-4">@{data.playerName}</Text>
        
        {/* Stats box */}
        <View className="bg-black/50 border border-victory p-3 mb-4">
          <View className="flex-row justify-between mb-2">
            <Text className="text-bone text-sm font-mono">Rooms Cleared:</Text>
            <Text className="text-victory text-sm font-mono">{data.roomsCleared}</Text>
          </View>
          <View className="flex-row justify-between mb-2">
            <Text className="text-bone text-sm font-mono">Enemies Slain:</Text>
            <Text className="text-blood text-sm font-mono">{data.enemiesDefeated}</Text>
          </View>
          <View className="flex-row justify-between">
            <Text className="text-bone text-sm font-mono">SOL Won:</Text>
            <Text className="text-amber text-sm font-mono font-bold">◎ {data.stakeWon.toFixed(3)}</Text>
          </View>
        </View>
        
        {/* Victory message */}
        <Text className="text-bone-muted text-xs font-mono italic text-center mb-4">
          You conquered the depths.{'\n'}Few can claim the same.
        </Text>
        
        {/* Divider */}
        <View className="border-t border-crypt-border mb-3" />
        
        {/* Game title */}
        <Text className="text-amber text-xl font-mono font-bold text-center">DIE FORWARD</Text>
        <Text className="text-stone-500 text-[10px] font-mono text-center">dieforward.com</Text>
      </View>
    </View>
  );
}

// Hook to capture and share cards
export function useShareCard() {
  const viewShotRef = useRef<ViewShot>(null);

  const captureAndShare = useCallback(async (title: string, message: string) => {
    if (!viewShotRef.current) return false;

    try {
      // Capture the view as an image
      const uri = await viewShotRef.current.capture?.();
      if (!uri) return false;

      // Check if sharing is available
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        console.log('Sharing not available on this device');
        return false;
      }

      // Share the image
      await Sharing.shareAsync(uri, {
        mimeType: 'image/png',
        dialogTitle: title,
        UTI: 'public.png',
      });

      return true;
    } catch (error) {
      console.error('Failed to share card:', error);
      return false;
    }
  }, []);

  const saveToDevice = useCallback(async () => {
    if (!viewShotRef.current) return null;

    try {
      const uri = await viewShotRef.current.capture?.();
      if (!uri) return null;

      // Copy to a permanent location
      const filename = `die-forward-${Date.now()}.png`;
      const destUri = FileSystem.documentDirectory + filename;
      await FileSystem.copyAsync({ from: uri, to: destUri });

      return destUri;
    } catch (error) {
      console.error('Failed to save card:', error);
      return null;
    }
  }, []);

  return { viewShotRef, captureAndShare, saveToDevice };
}

// Wrapper component for capturing
export function ShareCardCapture({ 
  children, 
  viewShotRef 
}: { 
  children: React.ReactNode;
  viewShotRef: React.RefObject<ViewShot>;
}) {
  return (
    <ViewShot 
      ref={viewShotRef} 
      options={{ format: 'png', quality: 1.0 }}
    >
      {children}
    </ViewShot>
  );
}
