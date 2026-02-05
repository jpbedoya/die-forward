'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useWallet } from '@solana/wallet-adapter-react';
import { getGameState, clearGameState } from '@/lib/gameState';
import { recordDeath } from '@/lib/instant';

function shortenAddress(address: string): string {
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

export default function DeathScreen() {
  const { publicKey } = useWallet();
  const [finalMessage, setFinalMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deathData, setDeathData] = useState({
    zone: "THE SUNKEN CRYPT",
    room: 1,
    totalRooms: 7,
    stakeLost: 0.05,
    inventory: [] as { name: string; emoji: string }[],
  });
  const [loaded, setLoaded] = useState(false);
  const maxChars = 50;

  // Load game state on mount
  useEffect(() => {
    const state = getGameState();
    setDeathData({
      zone: "THE SUNKEN CRYPT",
      room: state.currentRoom + 1, // 0-indexed to 1-indexed
      totalRooms: 7,
      stakeLost: state.stakeAmount,
      inventory: state.inventory,
    });
    setLoaded(true);
  }, []);

  const handleSubmit = async () => {
    if (!finalMessage.trim() || submitting) return;
    
    setSubmitting(true);
    
    try {
      // Generate player name from wallet or random
      const playerName = publicKey 
        ? shortenAddress(publicKey.toBase58())
        : `anon_${Math.random().toString(36).slice(2, 6)}`;

      // Record death to InstantDB
      await recordDeath({
        walletAddress: publicKey?.toBase58() || 'unknown',
        playerName,
        zone: deathData.zone,
        room: deathData.room,
        stakeAmount: deathData.stakeLost,
        finalMessage: finalMessage.trim(),
        inventory: deathData.inventory,
      });

      // Clear game state
      clearGameState();
      
      setSubmitted(true);
    } catch (error) {
      console.error('Failed to record death:', error);
      // Still allow proceeding even if DB fails
      clearGameState();
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  };

  if (!loaded) {
    return (
      <div className="min-h-screen bg-[var(--bg-base)] flex items-center justify-center font-mono">
        <div className="text-[var(--red)] animate-pulse">☠ Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-base)] flex flex-col font-mono">
      
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-8">
        
        {/* Death announcement */}
        <div className="text-center mb-8">
          <pre 
            className="text-[var(--text-muted)] text-[10px] leading-tight mb-4 inline-block text-left"
            style={{ fontFamily: 'Courier New, Courier, monospace' }}
          >
{`  ,-=-.     ______            _
 / + \\    />------>       _|1|_
 | ~~~ |  //    -/-  /    |_ H _|
 |R.I.P| //    / /        |S|
\\vV,,|___|V,//_____/VvV,v,|_|/,,vhjwv/,`}
          </pre>
          <h1 className="text-[var(--red-bright)] text-2xl tracking-widest mb-2">YOU DIED</h1>
          <p className="text-[var(--text-secondary)] text-sm">
            Fallen in <span className="text-[var(--red-bright)]">{deathData.zone}</span>
          </p>
          <p className="text-[var(--text-muted)] text-xs mt-1">
            Room {deathData.room}/{deathData.totalRooms}
          </p>
        </div>

        {/* Stats */}
        <div className="w-full max-w-xs mb-8">
          <div className="border border-[var(--border-dim)] bg-[var(--bg-surface)] p-4 text-sm">
            <div className="flex justify-between py-1 border-b border-[var(--border-dim)]">
              <span className="text-[var(--text-muted)]">Stake Lost</span>
              <span className="text-[var(--amber)]">◎ {deathData.stakeLost} SOL</span>
            </div>
            <div className="flex justify-between py-1 border-b border-[var(--border-dim)]">
              <span className="text-[var(--text-muted)]">Rooms Cleared</span>
              <span className="text-[var(--text-primary)]">{deathData.room - 1}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-[var(--text-muted)]">Items Lost</span>
              <span className="text-[var(--purple-bright)]">{deathData.inventory.length}</span>
            </div>
          </div>
        </div>

        {/* Final message input */}
        {!submitted ? (
          <div className="w-full max-w-xs">
            <label className="block text-[var(--text-muted)] text-xs mb-2 uppercase tracking-wider">
              Your Final Words
            </label>
            <div className="relative">
              <input
                type="text"
                value={finalMessage}
                onChange={(e) => setFinalMessage(e.target.value.slice(0, maxChars))}
                placeholder="Leave a message for those who follow..."
                className="w-full bg-[var(--bg-surface)] border border-[var(--border-default)] px-3 py-3 text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-[var(--amber-dim)] focus:outline-none"
                disabled={submitting}
              />
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-[var(--text-dim)]">
                {finalMessage.length}/{maxChars}
              </span>
            </div>
            <button
              onClick={handleSubmit}
              disabled={!finalMessage.trim() || submitting}
              className="w-full mt-3 px-4 py-3 bg-[var(--bg-surface)] border border-[var(--border-default)] text-[var(--text-secondary)] hover:border-[var(--amber-dim)] hover:text-[var(--amber-bright)] transition-all disabled:opacity-30 disabled:hover:border-[var(--border-default)] disabled:hover:text-[var(--text-secondary)]"
            >
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="animate-pulse">◈</span>
                  Recording...
                </span>
              ) : (
                'Etch Into Stone'
              )}
            </button>
          </div>
        ) : (
          <div className="w-full max-w-xs text-center">
            <div className="border border-[var(--purple-dim)] bg-[var(--purple-dim)]/20 p-4 mb-6">
              <div className="text-[var(--purple-bright)] text-xs mb-2 uppercase tracking-wider">
                Your Epitaph
              </div>
              <div className="text-[var(--text-primary)] italic">"{finalMessage}"</div>
            </div>
            
            <p className="text-[var(--text-muted)] text-xs mb-6">
              Your corpse now rests in the crypt.<br/>
              Others will find you.
            </p>

            <div className="flex flex-col gap-2">
              <Link
                href="/stake"
                className="px-4 py-3 bg-[var(--amber-dim)]/30 border border-[var(--amber)] text-[var(--amber-bright)] hover:bg-[var(--amber-dim)]/50 transition-all text-center"
              >
                ▶ Try Again
              </Link>
              <Link
                href="/"
                className="px-4 py-3 bg-[var(--bg-surface)] border border-[var(--border-default)] text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-all text-center"
              >
                Return to Title
              </Link>
            </div>
          </div>
        )}

      </main>

      {/* Footer hint */}
      <footer className="text-center text-[10px] text-[var(--text-muted)] py-4">
        Your stake has been added to the Memorial Pool
      </footer>

    </div>
  );
}
