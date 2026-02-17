'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useWallet } from '@solana/wallet-adapter-react';
import { getGameState, clearGameState } from '@/lib/gameState';
import { useAudio } from '@/lib/audio';
import { generateDeathCard, shareCard } from '@/lib/shareCard';
import GameFrame from '@/components/GameFrame';

// Demo mode flag
const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

const ASCII_TOMBSTONE = `
    ▄▄▄▄▄▄▄▄▄▄▄
   █           █
   █   R.I.P   █
   █           █
   █  ░░░░░░░  █
   █  ░░░░░░░  █
   █           █
  ███████████████
 ▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀`;

function shortenAddress(address: string): string {
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

export default function DeathScreen() {
  const { publicKey } = useWallet();
  const [finalMessage, setFinalMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showEtching, setShowEtching] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [deathData, setDeathData] = useState({
    zone: "THE SUNKEN CRYPT",
    room: 1,
    totalRooms: 7,
    stakeLost: 0.05,
    inventory: [] as { name: string; emoji: string }[],
    sessionToken: null as string | null,
    nickname: null as string | null,
    killedBy: null as string | null, // Enemy that killed the player
  });
  const [loaded, setLoaded] = useState(false);
  const maxChars = 50;
  
  // Audio
  const { enabled: audioEnabled, toggle: toggleAudio, playAmbient, playSFX } = useAudio();
  
  // Play death ambient and SFX on mount
  // Ambient will skip if already playing (e.g., started in combat)
  useEffect(() => {
    playAmbient('ambient-death');
    playSFX('player-death');
  }, [playAmbient, playSFX]);

  // Load game state on mount
  useEffect(() => {
    const state = getGameState();
    setDeathData({
      zone: "THE SUNKEN CRYPT",
      room: state.currentRoom + 1, // 0-indexed to 1-indexed
      totalRooms: state.dungeon?.length || 7,
      stakeLost: state.stakeAmount,
      inventory: state.inventory,
      sessionToken: state.sessionToken,
      nickname: state.nickname, // Player's chosen nickname
      killedBy: state.lastEnemy, // Enemy that killed the player
    });
    setLoaded(true);
  }, []);

  const handleSubmit = async () => {
    if (!finalMessage.trim() || submitting) return;
    
    setSubmitting(true);
    setShowEtching(true);
    
    try {
      // Use nickname if set (from gameState or localStorage), otherwise generate from wallet or random
      const savedNickname = localStorage.getItem('die-forward-nickname');
      const playerName = deathData.nickname 
        || savedNickname
        || (publicKey ? shortenAddress(publicKey.toBase58()) : `anon_${Math.random().toString(36).slice(2, 6)}`);

      // Record death via API (validates session token)
      if (deathData.sessionToken) {
        const response = await fetch('/api/session/death', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionToken: deathData.sessionToken,
            room: deathData.room,
            finalMessage: finalMessage.trim(),
            inventory: deathData.inventory,
            playerName,
            killedBy: deathData.killedBy, // Enemy that killed the player
          }),
        });

        if (!response.ok) {
          const data = await response.json();
          console.warn('Failed to record death:', data.error);
        }
      }

      // Dramatic pause for the etching animation
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Clear game state
      clearGameState();
      
      setSubmitted(true);
    } catch (error) {
      console.error('Failed to record death:', error);
      clearGameState();
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  };

  const handleShare = async () => {
    setSharing(true);
    playSFX('share-click');
    try {
      const blob = await generateDeathCard({
        playerName: deathData.nickname || 'Unknown',
        room: deathData.room,
        totalRooms: deathData.totalRooms,
        killedBy: deathData.killedBy,
        epitaph: finalMessage || 'No final words...',
        stakeLost: deathData.stakeLost,
      });
      await shareCard(blob, 'I Died in Die Forward', `Fell in Room ${deathData.room} of THE SUNKEN CRYPT. Can you do better? 💀`);
    } catch (err) {
      console.error('Share failed:', err);
    } finally {
      setSharing(false);
    }
  };

  if (!loaded) {
    return (
      <GameFrame>
      <div className="min-h-screen bg-[var(--bg-base)] flex items-center justify-center font-mono">
        <div className="text-[var(--red)] animate-pulse">☠ Loading...</div>
      </div>
      </GameFrame>
    );
  }

  return (
    <GameFrame>
    <div className="min-h-screen bg-[var(--bg-base)] flex flex-col font-mono relative overflow-hidden">
      
      {/* Background effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-[var(--red)]/5 rounded-full blur-[100px]" />
        <div className="absolute bottom-0 left-1/4 w-[300px] h-[300px] bg-[var(--purple)]/5 rounded-full blur-[80px]" />
      </div>

      <main className="flex-1 flex flex-col items-center justify-center px-4 py-8 relative z-10">
        
        {/* Top controls */}
        <div className="absolute top-4 right-4 flex items-center gap-2">
          {DEMO_MODE && (
            <span className="text-[10px] px-2 py-1 bg-[var(--amber-dim)]/30 border border-[var(--amber-dim)] text-[var(--amber)] tracking-wider">
              FREE PLAY
            </span>
          )}
          <button
            onClick={toggleAudio}
            className="p-2 text-[var(--text-muted)] hover:text-[var(--red)] transition-colors"
            title={audioEnabled ? 'Mute audio' : 'Unmute audio'}
          >
            {audioEnabled ? '🔊' : '🔇'}
          </button>
        </div>

        {/* Death announcement - dramatic reveal */}
        <div className="text-center mb-6">
          {/* Tombstone ASCII art */}
          <pre className="text-[var(--text-dim)]/50 text-[8px] sm:text-[10px] leading-[0.9] mb-4 inline-block">
{ASCII_TOMBSTONE}
          </pre>

          {/* YOU DIED with glow effect */}
          <h1 className="text-[var(--red-bright)] text-3xl sm:text-4xl tracking-[0.3em] font-bold mb-2 drop-shadow-[0_0_30px_rgba(239,68,68,0.5)]">
            YOU DIED
          </h1>
          
          {/* Location */}
          <div className="flex items-center justify-center gap-2 text-sm">
            <span className="text-[var(--text-dim)]">Fallen in</span>
            <span className="text-[var(--red)] font-medium">{deathData.zone}</span>
          </div>
          <p className="text-[var(--text-dim)] text-xs mt-1">
            Room {deathData.room} of {deathData.totalRooms}
          </p>
          {deathData.killedBy && (
            <p className="text-[var(--red-dim)] text-xs mt-2 italic">
              Slain by {deathData.killedBy}
            </p>
          )}
        </div>

        {/* Stats - what was lost */}
        <div className="w-full max-w-xs mb-6">
          <div className="text-center text-[var(--text-dim)] text-[10px] uppercase tracking-[0.2em] mb-2">
            {deathData.stakeLost > 0 ? 'What You Lost' : 'Your Journey'}
          </div>
          <div className="border border-[var(--red-dim)]/50 bg-[var(--bg-surface)]/50 p-4">
            {deathData.stakeLost > 0 && (
              <div className="flex justify-between py-1.5 border-b border-[var(--border-dim)]/50">
                <span className="text-[var(--text-muted)] text-sm">Stake</span>
                <span className="text-[var(--amber)] font-bold">◎ {deathData.stakeLost} SOL</span>
              </div>
            )}
            <div className={`flex justify-between py-1.5 ${deathData.stakeLost > 0 ? '' : 'border-b border-[var(--border-dim)]/50'}`}>
              <span className="text-[var(--text-muted)] text-sm">Items</span>
              <div className="flex items-center gap-1">
                {deathData.inventory.slice(0, 3).map((item, i) => (
                  <span key={i} className="text-sm">{item.emoji}</span>
                ))}
                {deathData.inventory.length > 3 && (
                  <span className="text-[var(--text-dim)] text-xs">+{deathData.inventory.length - 3}</span>
                )}
                {deathData.inventory.length === 0 && (
                  <span className="text-[var(--text-dim)] text-sm">Nothing</span>
                )}
              </div>
            </div>
            {deathData.stakeLost === 0 && (
              <div className="flex justify-between py-1.5">
                <span className="text-[var(--text-muted)] text-sm">Mode</span>
                <span className="text-[var(--text-dim)] text-sm">Free Play</span>
              </div>
            )}
          </div>
        </div>

        {/* Final message input - the important moment */}
        {!submitted ? (
          <div className="w-full max-w-xs">
            {/* Dramatic framing */}
            <div className="text-center mb-4">
              <div className="text-[var(--purple-bright)] text-xs uppercase tracking-[0.2em] mb-1">
                Your Final Words
              </div>
              <p className="text-[var(--text-dim)] text-xs italic">
                What wisdom will you leave for those who follow?
              </p>
            </div>

            {/* Input area with special styling */}
            <div className="relative">
              <div className="absolute inset-0 bg-[var(--purple)]/5 blur-xl rounded-lg" />
              <div className="relative bg-[var(--bg-surface)] border-2 border-[var(--purple-dim)] p-4">
                <textarea
                  value={finalMessage}
                  onChange={(e) => setFinalMessage(e.target.value.slice(0, maxChars))}
                  onFocus={(e) => {
                    // Scroll into view when keyboard opens on mobile
                    setTimeout(() => {
                      e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }, 300);
                  }}
                  placeholder="Leave a message..."
                  rows={2}
                  className="w-full bg-transparent text-[var(--text-primary)] text-base placeholder-[var(--text-dim)] focus:outline-none resize-none leading-relaxed"
                  disabled={submitting}
                  autoFocus
                />
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-[var(--border-dim)]/50">
                  <span className="text-[10px] text-[var(--text-dim)]">
                    These words will echo through the crypt
                  </span>
                  <span className={`text-[10px] ${finalMessage.length > 40 ? 'text-[var(--amber)]' : 'text-[var(--text-dim)]'}`}>
                    {finalMessage.length}/{maxChars}
                  </span>
                </div>
              </div>
            </div>

            {/* Submit button */}
            <button
              onClick={handleSubmit}
              disabled={!finalMessage.trim() || submitting}
              className="w-full mt-4 px-4 py-4 bg-gradient-to-b from-[var(--purple-dim)]/30 to-[var(--purple-dim)]/10 border-2 border-[var(--purple)] text-[var(--purple-bright)] hover:from-[var(--purple-dim)]/50 hover:to-[var(--purple-dim)]/30 transition-all disabled:opacity-30 disabled:cursor-not-allowed text-lg tracking-wider"
            >
              {showEtching ? (
                <span className="flex items-center justify-center gap-3">
                  <span className="animate-pulse">◈</span>
                  <span>Etching into stone...</span>
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <span>✦</span>
                  <span>Etch Into Stone</span>
                </span>
              )}
            </button>
          </div>
        ) : (
          <div className="w-full max-w-xs text-center">
            {/* The epitaph reveal - compact */}
            <div className="relative mb-4">
              <div className="relative bg-[var(--bg-surface)] border border-[var(--purple-dim)] p-4">
                <div className="text-[var(--purple)] text-[10px] uppercase tracking-[0.2em] mb-2">
                  Your Epitaph
                </div>
                <div className="text-[var(--text-primary)] text-base italic leading-relaxed">
                  "{finalMessage}"
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-3">
              <Link
                href="/stake"
                className="px-6 py-4 bg-gradient-to-b from-[var(--amber-dim)]/30 to-[var(--amber-dim)]/10 border-2 border-[var(--amber)] text-[var(--amber-bright)] hover:from-[var(--amber-dim)]/50 hover:to-[var(--amber-dim)]/30 transition-all text-center text-lg tracking-wider flex items-center justify-center gap-2"
              >
                <span>▶</span>
                <span>Descend Again</span>
              </Link>
              <Link
                href="/game"
                className="px-4 py-3 bg-[var(--bg-surface)] border border-[var(--border-dim)] text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:border-[var(--border-default)] transition-all text-center"
              >
                Return to Title
              </Link>
              <button
                onClick={handleShare}
                disabled={sharing}
                className="px-4 py-3 bg-[var(--bg-surface)] border border-[var(--purple-dim)] text-[var(--purple)] hover:bg-[var(--purple-dim)]/20 hover:border-[var(--purple)] transition-all text-center disabled:opacity-50"
              >
                {sharing ? 'Creating...' : '📤 Share Death'}
              </button>
            </div>
          </div>
        )}

      </main>

      {/* Footer */}
      <footer className="text-center py-4 relative z-10">
        {deathData.stakeLost > 0 ? (
          <>
            <div className="text-[var(--amber-dim)] text-xs">
              <span className="text-[var(--amber)]">◎</span> Your stake has been added to the Memorial Pool
            </div>
            <div className="text-[var(--text-dim)] text-[10px] mt-1">
              Winners claim the spoils of the fallen
            </div>
          </>
        ) : (
          <div className="text-[var(--text-dim)] text-xs">
            Stake SOL to leave your mark in the crypt
          </div>
        )}
      </footer>

    </div>
    </GameFrame>
  );
}
