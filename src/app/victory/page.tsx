'use client';

import { useState } from 'react';
import Link from 'next/link';

const mockVictoryData = {
  zone: "THE SUNKEN CRYPT",
  roomsCleared: 7,
  enemiesSlain: 5,
  corpsesLooted: 3,
  timeElapsed: "8m 42s",
  stakeAmount: 0.05,
  poolShare: 0.34,
  totalReward: 0.39,
};

export default function VictoryScreen() {
  const [claiming, setClaiming] = useState(false);
  const [claimed, setClaimed] = useState(false);

  const handleClaim = () => {
    setClaiming(true);
    setTimeout(() => {
      setClaiming(false);
      setClaimed(true);
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-[var(--bg-base)] flex flex-col font-mono">
      
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-8">
        
        {/* Victory announcement */}
        <div className="text-center mb-8">
          <pre 
            className="text-[var(--green)] text-[10px] leading-tight mb-4 inline-block"
            style={{ fontFamily: 'Courier New, Courier, monospace' }}
          >
{`     .     .
    _|_____|_
   | ~~~~~~~ |
   |  CLEAR  |
   | ~~~~~~~ |
   |_________|
  /___________\\
      | |
   ___|_|___`}
          </pre>
          <h1 className="text-[var(--green-bright)] text-2xl tracking-widest mb-2">VICTORY</h1>
          <p className="text-[var(--text-secondary)] text-sm">
            You conquered <span className="text-[var(--amber-bright)]">{mockVictoryData.zone}</span>
          </p>
        </div>

        {/* Stats */}
        <div className="w-full max-w-xs mb-8">
          <div className="border border-[var(--border-dim)] bg-[var(--bg-surface)] p-4 text-sm">
            <div className="flex justify-between py-1 border-b border-[var(--border-dim)]">
              <span className="text-[var(--text-muted)]">Rooms Cleared</span>
              <span className="text-[var(--text-primary)]">{mockVictoryData.roomsCleared}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-[var(--border-dim)]">
              <span className="text-[var(--text-muted)]">Enemies Slain</span>
              <span className="text-[var(--red-bright)]">{mockVictoryData.enemiesSlain}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-[var(--border-dim)]">
              <span className="text-[var(--text-muted)]">Corpses Looted</span>
              <span className="text-[var(--purple-bright)]">{mockVictoryData.corpsesLooted}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-[var(--text-muted)]">Time</span>
              <span className="text-[var(--text-primary)]">{mockVictoryData.timeElapsed}</span>
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
              <span className="text-[var(--amber)]">◎ {mockVictoryData.stakeAmount}</span>
            </div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-[var(--text-muted)]">Pool share</span>
              <span className="text-[var(--green)]">+ ◎ {mockVictoryData.poolShare}</span>
            </div>
            <div className="border-t border-[var(--green)]/30 pt-2 mt-2">
              <div className="flex justify-between">
                <span className="text-[var(--text-secondary)] font-bold">Total</span>
                <span className="text-[var(--green-bright)] text-xl font-bold">◎ {mockVictoryData.totalReward}</span>
              </div>
            </div>
          </div>
        </div>

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
              <span>▶ Claim {mockVictoryData.totalReward} SOL</span>
            )}
          </button>
        ) : (
          <div className="w-full max-w-xs">
            <div className="text-center text-[var(--green-bright)] mb-6">
              ✓ Rewards claimed!
            </div>
            <div className="flex flex-col gap-2">
              <Link
                href="/stake"
                className="px-4 py-3 bg-[var(--amber-dim)]/30 border border-[var(--amber)] text-[var(--amber-bright)] hover:bg-[var(--amber-dim)]/50 transition-all text-center"
              >
                ▶ Enter Again
              </Link>
              <Link
                href="/title"
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
