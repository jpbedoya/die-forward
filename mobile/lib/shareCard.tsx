// Share card generation for React Native
// Uses html2canvas on web, react-native-view-shot on native
// Uses react-native-share with proper file caching for better compatibility

import React, { useRef, useCallback } from 'react';
import { View, Text, Platform } from 'react-native';
import ViewShot from 'react-native-view-shot';
import { Paths, File as ExpoFile } from 'expo-file-system';
import { DieForwardLogoImage } from '../components/DieForwardLogoImage';

// react-native-share has native code that crashes on web
let Share: typeof import('react-native-share').default | null = null;
if (Platform.OS !== 'web') {
  Share = require('react-native-share').default;
}

// Web-only import
let html2canvas: ((element: HTMLElement, options?: object) => Promise<HTMLCanvasElement>) | null = null;
if (Platform.OS === 'web') {
  // Dynamic import for web only
  import('html2canvas').then((module) => {
    html2canvas = module.default;
  });
}

export interface NowPlaying {
  title: string;
  artist: string;
}

export interface DeathCardData {
  playerName: string;
  room: number;
  totalRooms: number;
  killedBy: string | null;
  epitaph: string;
  stakeLost: number;
  nowPlaying?: NowPlaying;
}

export interface VictoryCardData {
  playerName: string;
  roomsCleared: number;
  stakeWon: number;
  enemiesDefeated: number;
  nowPlaying?: NowPlaying;
}

// Logo component for share cards - uses horizontal PNG logo
function ShareCardLogo() {
  return (
    <View className="items-center">
      <DieForwardLogoImage variant="horizontal" size="small" />
    </View>
  );
}

// Death Card Component
export function DeathCard({ data }: { data: DeathCardData }) {
  return (
    <View className="w-[300px] bg-[#0a0a0a] border-2 border-blood/70">
      {/* Inner content with padding */}
      <View className="m-1 border border-blood/30 p-3">
        {/* Logo */}
        <View className="mb-3">
          <ShareCardLogo />
        </View>
        
        {/* Title */}
        <Text className="text-blood text-xl font-mono font-bold text-center tracking-[4px]">YOU DIED</Text>
        <Text className="text-stone-400 text-[10px] font-mono text-center mb-2">in THE SUNKEN CRYPT</Text>
        
        {/* Player name */}
        <Text className="text-amber text-base font-mono font-bold text-center mb-3">{data.playerName}</Text>
        
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
            Left {data.stakeLost} SOL behind
          </Text>
        )}

        {/* Now Playing */}
        {data.nowPlaying && (
          <View className="border-t border-stone-800 mt-2 pt-2 mb-2 flex-row items-center justify-center gap-1">
            <Text className="text-[11px]">🎧</Text>
            <Text className="text-stone-400 text-[11px] font-mono italic" numberOfLines={1}>
              {data.nowPlaying.title}
            </Text>
            <Text className="text-stone-500 text-[11px] font-mono">·</Text>
            <Text className="text-stone-500 text-[11px] font-mono" numberOfLines={1}>
              {data.nowPlaying.artist}
            </Text>
          </View>
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
          <ShareCardLogo />
        </View>
        
        {/* Title */}
        <Text className="text-victory text-xl font-mono font-bold text-center tracking-[4px]">ESCAPED</Text>
        <Text className="text-stone-400 text-[10px] font-mono text-center mb-3">THE SUNKEN CRYPT</Text>
        
        {/* Player name */}
        <Text className="text-amber text-base font-mono font-bold text-center mb-4">{data.playerName}</Text>
        
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

        {/* Now Playing */}
        {data.nowPlaying && (
          <View className="border-t border-stone-800 mt-2 pt-2 mb-2 flex-row items-center justify-center gap-1">
            <Text className="text-[11px]">🎧</Text>
            <Text className="text-stone-400 text-[11px] font-mono italic" numberOfLines={1}>
              {data.nowPlaying.title}
            </Text>
            <Text className="text-stone-500 text-[11px] font-mono">·</Text>
            <Text className="text-stone-500 text-[11px] font-mono" numberOfLines={1}>
              {data.nowPlaying.artist}
            </Text>
          </View>
        )}

        {/* URL */}
        <Text className="text-amber text-[10px] font-mono text-center">dieforward.com</Text>
      </View>
    </View>
  );
}

// Hook to capture and share cards
export function useShareCard() {
  const viewShotRef = useRef<ViewShot>(null);
  const webRef = useRef<HTMLDivElement>(null);

  const captureAndShare = useCallback(async (title: string, message: string) => {
    console.log('[ShareCard] Starting capture...', { 
      platform: Platform.OS,
      hasViewShotRef: !!viewShotRef.current,
      hasWebRef: !!webRef.current,
    });

    // Web: Use html2canvas
    if (Platform.OS === 'web') {
      console.log('[ShareCard] Web platform - using html2canvas');
      
      if (!webRef.current) {
        console.error('[ShareCard] No webRef for html2canvas');
        return false;
      }

      if (!html2canvas) {
        console.error('[ShareCard] html2canvas not loaded yet');
        return false;
      }

      try {
        const canvas = await html2canvas(webRef.current, {
          backgroundColor: '#0a0a0a',
          scale: 2, // Higher quality
        });
        console.log('[ShareCard] Canvas captured:', canvas.width, 'x', canvas.height);

        // Convert canvas to blob
        const blob = await new Promise<Blob>((resolve, reject) => {
          canvas.toBlob((b) => {
            if (b) resolve(b);
            else reject(new Error('Failed to create blob'));
          }, 'image/png');
        });

        const file = new File([blob], 'die-forward-card.png', { type: 'image/png' });
        console.log('[ShareCard] Created file blob:', blob.size, 'bytes');

        // Try Web Share API first (mobile browsers)
        const canShare = typeof navigator.share === 'function' && navigator.canShare?.({ files: [file] });
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
        const uri = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.href = uri;
        link.download = 'die-forward-card.png';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        console.log('[ShareCard] Download triggered');
        return true;
      } catch (webErr) {
        console.error('[ShareCard] Web capture failed:', webErr);
        return false;
      }
    }

    // Native: Use react-native-view-shot + react-native-share
    // Copy to cache with proper .png extension for better app compatibility (especially Telegram)
    if (!viewShotRef.current) {
      console.error('[ShareCard] No viewShotRef');
      return false;
    }

    try {
      console.log('[ShareCard] Native platform - using view-shot + react-native-share');
      const uri = await viewShotRef.current.capture?.();
      console.log('[ShareCard] Capture result:', uri ? 'success' : 'null');
      
      if (!uri) {
        console.error('[ShareCard] Failed to capture view - no URI returned');
        return false;
      }

      // Copy the image to a proper cache location with .png extension
      // This helps with Telegram and other apps that are picky about file formats
      const filename = `die-forward-card-${Date.now()}.png`;
      const cacheFile = new ExpoFile(Paths.cache, filename);
      const sourceFile = new ExpoFile(uri);
      await sourceFile.copy(cacheFile);
      const cacheUri = cacheFile.uri;
      console.log('[ShareCard] Copied to cache:', cacheUri);

      if (!Share) {
        console.error('[ShareCard] react-native-share not available');
        return false;
      }

      // Share with both image and message (for X/Twitter compatibility)
      // Using 'url' (singular) instead of 'urls' for better compatibility
      await Share.open({
        title,
        message,
        url: cacheUri,
        type: 'image/png',
        failOnCancel: false,
      });

      console.log('[ShareCard] Share completed');
      return true;
    } catch (error) {
      // react-native-share throws on cancel
      if ((error as Error)?.message?.includes('User did not share') ||
          (error as Error)?.message?.includes('cancel')) {
        console.log('[ShareCard] User cancelled share');
        return false;
      }
      console.error('Failed to share card:', error);
      return false;
    }
  }, []);

  return { viewShotRef, webRef, captureAndShare };
}

// Wrapper component for capturing
export function ShareCardCapture({ 
  children, 
  viewShotRef,
  webRef,
}: { 
  children: React.ReactNode;
  viewShotRef: React.RefObject<ViewShot | null>;
  webRef?: React.RefObject<HTMLDivElement | null>;
}) {
  // Web: Use a div for html2canvas
  if (Platform.OS === 'web') {
    return (
      <div ref={webRef as React.RefObject<HTMLDivElement>}>
        {children}
      </div>
    );
  }

  // Native: Use ViewShot
  return (
    <ViewShot 
      ref={viewShotRef} 
      options={{ format: 'png', quality: 1.0 }}
    >
      {children}
    </ViewShot>
  );
}
