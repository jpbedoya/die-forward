// Share card generation for React Native
// Uses react-native-view-shot to capture views as images

import React, { useRef, useCallback } from 'react';
import { View, Text, Platform } from 'react-native';
import ViewShot from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { DieForwardLogoInline } from '../components/DieForwardLogo';

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
    <View className="w-[300px] bg-[#0a0a0a] border-2 border-blood/70">
      {/* Inner content with padding */}
      <View className="m-1 border border-blood/30 p-3">
        {/* Logo */}
        <View className="mb-3">
          <DieForwardLogoInline color="#f59e0b" />
        </View>
        
        {/* Title */}
        <Text className="text-blood text-xl font-mono font-bold text-center tracking-[4px]">YOU DIED</Text>
        <Text className="text-stone-400 text-[10px] font-mono text-center mb-2">in THE SUNKEN CRYPT</Text>
        
        {/* Player name */}
        <Text className="text-amber text-base font-mono font-bold text-center mb-3">@{data.playerName}</Text>
        
        {/* Stats */}
        <View className="mb-2">
          <View className="flex-row justify-between mb-1 px-2">
            <Text className="text-stone-300 text-sm font-mono">Room Reached</Text>
            <Text className="text-stone-300 text-sm font-mono">{data.room} / {data.totalRooms}</Text>
          </View>
          {data.killedBy && (
            <View className="flex-row justify-between px-2">
              <Text className="text-stone-300 text-sm font-mono">Slain By</Text>
              <Text className="text-blood text-sm font-mono font-bold">{data.killedBy}</Text>
            </View>
          )}
        </View>
        
        {/* Epitaph */}
        <View className="mb-3 px-1">
          <Text className="text-stone-500 text-[8px] font-mono text-center mb-1">FINAL WORDS</Text>
          <Text className="text-stone-300 text-xs font-mono italic text-center">"{data.epitaph}"</Text>
        </View>
        
        {/* Stake lost - only show if there was a stake */}
        {data.stakeLost > 0 && (
          <Text className="text-blood text-sm font-mono font-bold text-center mb-3">
            {data.stakeLost} SOL LOST
          </Text>
        )}
        
        {/* URL */}
        <Text className="text-amber text-[10px] font-mono text-center">dieforward.com</Text>
      </View>
    </View>
  );
}

// Victory Card Component
export function VictoryCard({ data }: { data: VictoryCardData }) {
  const isEmptyHanded = data.stakeWon === 0;
  
  return (
    <View className="w-[300px] bg-[#0a0a0a] border-2 border-amber/70">
      {/* Inner content with padding */}
      <View className="m-1 border border-amber/30 p-3">
        {/* Logo */}
        <View className="mb-3">
          <DieForwardLogoInline color="#f59e0b" />
        </View>
        
        {/* Title */}
        <Text className="text-victory text-xl font-mono font-bold text-center tracking-[4px]">ESCAPED</Text>
        <Text className="text-stone-400 text-[10px] font-mono text-center mb-3">THE SUNKEN CRYPT</Text>
        
        {/* Player name */}
        <Text className="text-amber text-base font-mono font-bold text-center mb-4">@{data.playerName}</Text>
        
        {/* Stats */}
        <View className="mb-4">
          <View className="flex-row justify-between mb-1 px-2">
            <Text className="text-stone-300 text-sm font-mono">Rooms Cleared</Text>
            <Text className="text-victory text-sm font-mono font-bold">{data.roomsCleared}</Text>
          </View>
          <View className="flex-row justify-between mb-1 px-2">
            <Text className="text-stone-300 text-sm font-mono">Enemies Slain</Text>
            <Text className="text-blood text-sm font-mono font-bold">{data.enemiesDefeated}</Text>
          </View>
          {/* Only show SOL won if not empty-handed */}
          {!isEmptyHanded && (
            <View className="flex-row justify-between px-2">
              <Text className="text-stone-300 text-sm font-mono">SOL Won</Text>
              <Text className="text-amber text-sm font-mono font-bold">{data.stakeWon.toFixed(3)}</Text>
            </View>
          )}
        </View>
        
        {/* Victory message */}
        <Text className="text-stone-500 text-[10px] font-mono italic text-center mb-3">
          {isEmptyHanded 
            ? 'You conquered the depths.\nNo stake, just glory.'
            : 'You conquered the depths.\nFew can claim the same.'}
        </Text>
        
        {/* URL */}
        <Text className="text-amber text-[10px] font-mono text-center">dieforward.com</Text>
      </View>
    </View>
  );
}

// Hook to capture and share cards
export function useShareCard() {
  const viewShotRef = useRef<ViewShot>(null);

  const captureAndShare = useCallback(async (title: string, message: string) => {
    console.log('[ShareCard] Starting capture...', { hasRef: !!viewShotRef.current });
    
    if (!viewShotRef.current) {
      console.error('[ShareCard] No viewShotRef');
      return false;
    }

    try {
      // Capture the view as an image
      console.log('[ShareCard] Calling capture...');
      const uri = await viewShotRef.current.capture?.();
      console.log('[ShareCard] Capture result:', uri ? 'success' : 'null', uri?.slice(0, 50));
      
      if (!uri) {
        console.error('[ShareCard] Failed to capture view - no URI returned');
        return false;
      }

      // Web: Use Web Share API or download fallback
      if (Platform.OS === 'web') {
        console.log('[ShareCard] Web platform detected');
        
        try {
          // Convert data URI to blob for Web Share API
          const response = await fetch(uri);
          const blob = await response.blob();
          const file = new File([blob], 'die-forward-card.png', { type: 'image/png' });
          console.log('[ShareCard] Created file blob:', blob.size, 'bytes');

          // Try Web Share API first (mobile browsers)
          const canShare = navigator.share && navigator.canShare?.({ files: [file] });
          console.log('[ShareCard] Can use Web Share API:', canShare);
          
          if (canShare) {
            await navigator.share({
              title,
              text: message,
              files: [file],
            });
            console.log('[ShareCard] Web Share completed');
            return true;
          }

          // Fallback: Download the image
          console.log('[ShareCard] Falling back to download');
          const link = document.createElement('a');
          link.href = uri;
          link.download = 'die-forward-card.png';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          console.log('[ShareCard] Download triggered');
          return true;
        } catch (webErr) {
          console.error('[ShareCard] Web share failed:', webErr);
          return false;
        }
      }

      // Native: Use expo-sharing
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        console.log('Sharing not available on this device');
        return false;
      }

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

  return { viewShotRef, captureAndShare };
}

// Wrapper component for capturing
export function ShareCardCapture({ 
  children, 
  viewShotRef 
}: { 
  children: React.ReactNode;
  viewShotRef: React.RefObject<ViewShot | null>;
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
