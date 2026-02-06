'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getGameState, clearGameState } from '@/lib/gameState';

export default function VictoryScreen() {
  const [claiming, setClaiming] = useState(false);
  const [claimed, setClaimed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [victoryData, setVictoryData] = useState({
    zone: "THE SUNKEN CRYPT",
    roomsCleared: 7,
    stakeAmount: 0.05,
    bonus: 0,
    totalReward: 0,
    sessionToken: null as string | null,
    txSignature: null as string | null,
  });

  // Load game state on mount
  useEffect(() => {
    const state = getGameState();
    const bonus = state.stakeAmount * 0.5; // 50% bonus
    
    // If no session token, already claimed or invalid
    if (!state.sessionToken) {
      setClaimed(true);
    }
    
    setVictoryData({
      zone: "THE SUNKEN CRYPT",
      roomsCleared: state.currentRoom + 1,
      stakeAmount: state.stakeAmount,
      bonus,
      totalReward: state.stakeAmount + bonus,
      sessionToken: state.sessionToken,
      txSignature: null,
    });
    setLoaded(true);
  }, []);

  const handleClaim = async () => {
    if (!victoryData.sessionToken) {
      // No session token - already claimed or invalid
      setError('Session expired or already claimed');
      return;
    }

    setClaiming(true);
    setError(null);

    try {
      const response = await fetch('/api/session/victory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionToken: victoryData.sessionToken,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to claim reward');
      }

      // Update with actual reward from API
      setVictoryData(prev => ({
        ...prev,
        totalReward: data.reward || prev.totalReward,
        txSignature: data.txSignature || null,
      }));

      // Clear game state
      clearGameState();
      setClaimed(true);

    } catch (err) {
      console.error('Failed to claim:', err);
      setError(err instanceof Error ? err.message : 'Failed to claim. Please try again.');
      setClaiming(false);
    }
  };

  if (!loaded) {
    return (
      <div className="min-h-screen bg-[var(--bg-base)] flex items-center justify-center font-mono">
        <div className="text-[var(--green)] animate-pulse">✓ Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-base)] flex flex-col font-mono">
      
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-8">
        
        {/* Victory announcement */}
        <div className="text-center mb-8">
          <div className="text-[var(--text-muted)] text-xs tracking-widest mb-2 flex items-center justify-center gap-2">
            <span className="text-[var(--green-dim)]">═══╣</span>
            <span className="text-[var(--green)]">✦</span>
            <span className="text-[var(--green-dim)]">╠═══</span>
          </div>
          <h1 className="text-[var(--green-bright)] text-2xl tracking-widest mb-2">VICTORY</h1>
          <p className="text-[var(--text-secondary)] text-sm">
            You conquered <span className="text-[var(--amber-bright)]">{victoryData.zone}</span>
          </p>
        </div>

        {/* Stats */}
        <div className="w-full max-w-xs mb-8">
          <div className="border border-[var(--border-dim)] bg-[var(--bg-surface)] p-4 text-sm">
            <div className="flex justify-between py-1 border-b border-[var(--border-dim)]">
              <span className="text-[var(--text-muted)]">Rooms Cleared</span>
              <span className="text-[var(--text-primary)]">{victoryData.roomsCleared}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-[var(--text-muted)]">Stake Amount</span>
              <span className="text-[var(--amber)]">◎ {victoryData.stakeAmount}</span>
            </div>
          </div>
        </div>

        {/* Rewards */}
        <div className="w-full max-w-xs mb-8">
          <div className="text-[var(--text-muted)] text-xs uppercase tracking-wider mb-3">
            Your Reward
          </div>
          <div className="border border-[var(--green)]/30 bg-[var(--green)]/10 p-4">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-[var(--text-muted)]">Your stake returned</span>
              <span className="text-[var(--amber)]">◎ {victoryData.stakeAmount}</span>
            </div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-[var(--text-muted)]">Victory bonus (50%)</span>
              <span className="text-[var(--green)]">+ ◎ {victoryData.bonus.toFixed(4)}</span>
            </div>
            <div className="border-t border-[var(--green)]/30 pt-2 mt-2">
              <div className="flex justify-between">
                <span className="text-[var(--text-secondary)] font-bold">Total</span>
                <span className="text-[var(--green-bright)] text-xl font-bold">◎ {victoryData.totalReward.toFixed(4)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="w-full max-w-xs mb-4 text-[var(--red-bright)] text-xs px-4 py-2 border border-[var(--red-dim)] bg-[var(--red-dim)]/20">
            {error}
          </div>
        )}

        {/* Claim / Actions */}
        {!claimed ? (
          <button
            onClick={handleClaim}
            disabled={claiming}
            className="w-full max-w-xs px-6 py-4 bg-[var(--green)]/20 border border-[var(--green)] text-[var(--green-bright)] hover:bg-[var(--green)]/30 transition-all disabled:opacity-50"
          >
            {claiming ? (
              <span className="flex items-center justify-center gap-2">
                <span className="animate-pulse">◎</span>
                Claiming rewards...
              </span>
            ) : (
              <span>▶ Claim {victoryData.totalReward.toFixed(4)} SOL</span>
            )}
          </button>
        ) : (
          <div className="w-full max-w-xs">
            <div className="text-center text-[var(--green-bright)] mb-4">
              ✓ Rewards claimed!
            </div>
            {victoryData.txSignature && (
              <div className="text-center text-[var(--text-dim)] text-[10px] mb-4 break-all">
                tx: {victoryData.txSignature.slice(0, 20)}...
              </div>
            )}
            <div className="flex flex-col gap-2">
              <Link
                href="/stake"
                className="px-4 py-3 bg-[var(--amber-dim)]/30 border border-[var(--amber)] text-[var(--amber-bright)] hover:bg-[var(--amber-dim)]/50 transition-all text-center"
              >
                ▶ Enter Again
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

      {/* Footer */}
      <footer className="text-center text-[10px] text-[var(--text-muted)] py-4">
        The dead salute you, survivor.
      </footer>

    </div>
  );
}
