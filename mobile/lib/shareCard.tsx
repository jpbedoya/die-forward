// Share card generation for React Native
// Uses react-native-view-shot to capture views as images

import React, { useRef, useCallback } from 'react';
import { View, Text, Platform } from 'react-native';
import ViewShot from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';

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
    <View className="w-[300px] h-[420px] bg-[#0a0a0a]">
      {/* ASCII Border Top */}
      <Text className="text-blood font-mono text-[8px] text-center">╔{'═'.repeat(34)}╗</Text>
      
      <View className="flex-row flex-1">
        {/* Left border */}
        <View className="justify-between py-1">
          <Text className="text-blood font-mono text-[8px]">║</Text>
          <Text className="text-blood/50 font-mono text-[6px]">░</Text>
          <Text className="text-blood font-mono text-[8px]">║</Text>
          <Text className="text-blood/50 font-mono text-[6px]">░</Text>
          <Text className="text-blood font-mono text-[8px]">║</Text>
          <Text className="text-blood/50 font-mono text-[6px]">░</Text>
          <Text className="text-blood font-mono text-[8px]">║</Text>
          <Text className="text-blood/50 font-mono text-[6px]">░</Text>
          <Text className="text-blood font-mono text-[8px]">║</Text>
        </View>
        
        <View className="flex-1 px-2 py-2">
        {/* ASCII Logo */}
        <Text className="text-amber font-mono text-[3px] text-center leading-[4px] mb-1">
          {ASCII_LOGO_SMALL}
        </Text>
        <Text className="text-amber font-mono text-[2px] text-center leading-[3px] mb-2">
          {ASCII_FORWARD_SMALL}
        </Text>
        
        {/* Divider */}
        <Text className="text-blood/30 font-mono text-[8px] text-center mb-2">─────────────────────────────</Text>
        
        {/* Title */}
        <Text className="text-blood text-xl font-mono font-bold text-center tracking-[4px]">YOU DIED</Text>
        <Text className="text-stone-400 text-[10px] font-mono text-center mb-2">in THE SUNKEN CRYPT</Text>
        
        {/* Player name */}
        <Text className="text-amber text-base font-mono font-bold text-center mb-2">@{data.playerName}</Text>
        
        {/* Stats - no border */}
        <View className="mb-2">
          <View className="flex-row justify-between mb-1 px-4">
            <Text className="text-stone-300 text-sm font-mono">Room Reached</Text>
            <Text className="text-stone-300 text-sm font-mono">{data.room} / {data.totalRooms}</Text>
          </View>
          {data.killedBy && (
            <View className="flex-row justify-between px-4">
              <Text className="text-stone-300 text-sm font-mono">Slain By</Text>
              <Text className="text-blood text-sm font-mono font-bold">{data.killedBy}</Text>
            </View>
          )}
        </View>
        
        {/* Epitaph */}
        <View className="mb-2 px-2">
          <Text className="text-stone-500 text-[8px] font-mono text-center mb-1">FINAL WORDS</Text>
          <Text className="text-stone-300 text-xs font-mono italic text-center">"{data.epitaph}"</Text>
        </View>
        
        {/* Stake lost */}
        {data.stakeLost > 0 && (
          <Text className="text-blood text-sm font-mono font-bold text-center mb-2">
            ◎ {data.stakeLost} SOL LOST
          </Text>
        )}
        
        {/* Divider */}
        <Text className="text-blood/30 font-mono text-[8px] text-center mb-2">─────────────────────────────</Text>
        
        {/* URL */}
        <Text className="text-stone-500 text-[10px] font-mono text-center">dieforward.com</Text>
        </View>
        
        {/* Right border */}
        <View className="justify-between py-1">
          <Text className="text-blood font-mono text-[8px]">║</Text>
          <Text className="text-blood/50 font-mono text-[6px]">░</Text>
          <Text className="text-blood font-mono text-[8px]">║</Text>
          <Text className="text-blood/50 font-mono text-[6px]">░</Text>
          <Text className="text-blood font-mono text-[8px]">║</Text>
          <Text className="text-blood/50 font-mono text-[6px]">░</Text>
          <Text className="text-blood font-mono text-[8px]">║</Text>
          <Text className="text-blood/50 font-mono text-[6px]">░</Text>
          <Text className="text-blood font-mono text-[8px]">║</Text>
        </View>
      </View>
      
      {/* ASCII Border Bottom */}
      <Text className="text-blood font-mono text-[8px] text-center">╚{'═'.repeat(34)}╝</Text>
    </View>
  );
}

// ASCII Logo for cards
const ASCII_LOGO_SMALL = `██████  ██ ███████
██   ██ ██ ██     
██   ██ ██ █████  
██   ██ ██ ██     
██████  ██ ███████`;

const ASCII_FORWARD_SMALL = `███████  ██████  ██████  ██     ██  █████  ██████  ██████ 
██      ██    ██ ██   ██ ██     ██ ██   ██ ██   ██ ██   ██
█████   ██    ██ ██████  ██  █  ██ ███████ ██████  ██   ██
██      ██    ██ ██   ██ ██ ███ ██ ██   ██ ██   ██ ██   ██
██       ██████  ██   ██  ███ ███  ██   ██ ██   ██ ██████ `;

// Victory Card Component
export function VictoryCard({ data }: { data: VictoryCardData }) {
  return (
    <View className="w-[300px] h-[420px] bg-[#0a0a0a]">
      {/* ASCII Border Top */}
      <Text className="text-amber font-mono text-[8px] text-center">╔{'═'.repeat(34)}╗</Text>
      
      <View className="flex-row flex-1">
        {/* Left border */}
        <View className="justify-between py-1">
          <Text className="text-amber font-mono text-[8px]">║</Text>
          <Text className="text-amber/50 font-mono text-[6px]">░</Text>
          <Text className="text-amber font-mono text-[8px]">║</Text>
          <Text className="text-amber/50 font-mono text-[6px]">░</Text>
          <Text className="text-amber font-mono text-[8px]">║</Text>
          <Text className="text-amber/50 font-mono text-[6px]">░</Text>
          <Text className="text-amber font-mono text-[8px]">║</Text>
          <Text className="text-amber/50 font-mono text-[6px]">░</Text>
          <Text className="text-amber font-mono text-[8px]">║</Text>
        </View>
        
        <View className="flex-1 px-2 py-2">
        {/* ASCII Logo */}
        <Text className="text-amber font-mono text-[3px] text-center leading-[4px] mb-1">
          {ASCII_LOGO_SMALL}
        </Text>
        <Text className="text-amber font-mono text-[2px] text-center leading-[3px] mb-2">
          {ASCII_FORWARD_SMALL}
        </Text>
        
        {/* Divider */}
        <Text className="text-amber/30 font-mono text-[8px] text-center mb-2">─────────────────────────────</Text>
        
        {/* Title */}
        <Text className="text-victory text-xl font-mono font-bold text-center tracking-[4px]">ESCAPED</Text>
        <Text className="text-stone-400 text-[10px] font-mono text-center mb-3">THE SUNKEN CRYPT</Text>
        
        {/* Player name */}
        <Text className="text-amber text-base font-mono font-bold text-center mb-4">@{data.playerName}</Text>
        
        {/* Stats - no border */}
        <View className="mb-3">
          <View className="flex-row justify-between mb-1 px-4">
            <Text className="text-stone-300 text-sm font-mono">Rooms Cleared</Text>
            <Text className="text-victory text-sm font-mono font-bold">{data.roomsCleared}</Text>
          </View>
          <View className="flex-row justify-between mb-1 px-4">
            <Text className="text-stone-300 text-sm font-mono">Enemies Slain</Text>
            <Text className="text-blood text-sm font-mono font-bold">{data.enemiesDefeated}</Text>
          </View>
          <View className="flex-row justify-between px-4">
            <Text className="text-stone-300 text-sm font-mono">SOL Won</Text>
            <Text className="text-amber text-sm font-mono font-bold">◎ {data.stakeWon.toFixed(3)}</Text>
          </View>
        </View>
        
        {/* Victory message */}
        <Text className="text-stone-500 text-[10px] font-mono italic text-center mb-3">
          You conquered the depths.{'\n'}Few can claim the same.
        </Text>
        
        {/* Divider */}
        <Text className="text-amber/30 font-mono text-[8px] text-center mb-2">─────────────────────────────</Text>
        
        {/* URL */}
        <Text className="text-stone-500 text-[10px] font-mono text-center">dieforward.com</Text>
        </View>
        
        {/* Right border */}
        <View className="justify-between py-1">
          <Text className="text-amber font-mono text-[8px]">║</Text>
          <Text className="text-amber/50 font-mono text-[6px]">░</Text>
          <Text className="text-amber font-mono text-[8px]">║</Text>
          <Text className="text-amber/50 font-mono text-[6px]">░</Text>
          <Text className="text-amber font-mono text-[8px]">║</Text>
          <Text className="text-amber/50 font-mono text-[6px]">░</Text>
          <Text className="text-amber font-mono text-[8px]">║</Text>
          <Text className="text-amber/50 font-mono text-[6px]">░</Text>
          <Text className="text-amber font-mono text-[8px]">║</Text>
        </View>
      </View>
      
      {/* ASCII Border Bottom */}
      <Text className="text-amber font-mono text-[8px] text-center">╚{'═'.repeat(34)}╝</Text>
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
      if (!uri) {
        console.error('Failed to capture view');
        return false;
      }

      // Web: Use Web Share API or download fallback
      if (Platform.OS === 'web') {
        // Convert data URI to blob for Web Share API
        const response = await fetch(uri);
        const blob = await response.blob();
        const file = new File([blob], 'die-forward-card.png', { type: 'image/png' });

        // Try Web Share API first (mobile browsers)
        if (navigator.share && navigator.canShare?.({ files: [file] })) {
          await navigator.share({
            title,
            text: message,
            files: [file],
          });
          return true;
        }

        // Fallback: Download the image
        const link = document.createElement('a');
        link.href = uri;
        link.download = 'die-forward-card.png';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        return true;
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
