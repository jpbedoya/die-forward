'use client';

import { useState } from 'react';
import Link from 'next/link';

const stakeOptions = [
  { amount: 0.01, label: 'Timid', desc: 'Dip your toes' },
  { amount: 0.05, label: 'Bold', desc: 'Standard fare' },
  { amount: 0.1, label: 'Reckless', desc: 'Fortune favors...' },
  { amount: 0.25, label: 'Degenerate', desc: 'All or nothing' },
];

const mockPoolData = {
  totalStaked: 42.5,
  deaths: 1247,
  avgReward: 0.34,
};

export default function StakeScreen() {
  const [selectedStake, setSelectedStake] = useState<number | null>(null);
  const [confirming, setConfirming] = useState(false);

  const handleEnter = () => {
    if (!selectedStake) return;
    setConfirming(true);
    // Simulate transaction
    setTimeout(() => {
      window.location.href = '/';
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-[var(--bg-base)] flex flex-col font-mono">
      
      {/* Header */}
      <header className="border-b border-[var(--border-dim)] px-4 py-3">
        <Link href="/title" className="text-[var(--text-muted)] text-xs hover:text-[var(--text-secondary)]">
          ← Back
        </Link>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-4 py-8">
        
        {/* Zone preview */}
        <div className="text-center mb-8">
          <pre className="text-[var(--amber)] text-[10px] leading-tight mb-2" style={{ fontFamily: 'Courier New, Courier, monospace' }}>
{`    _____
   /     \\
  / ENTER \\
 /   THE   \\
/___________\\`}
          </pre>
          <h1 className="text-[var(--amber-bright)] text-xl tracking-wider mb-1">THE SUNKEN CRYPT</h1>
          <p className="text-[var(--text-muted)] text-xs">5-7 rooms • Water-themed horrors</p>
        </div>

        {/* Pool stats */}
        <div className="flex gap-6 text-xs text-[var(--text-muted)] mb-8">
          <div className="text-center">
            <div className="text-[var(--amber-bright)] text-lg">{mockPoolData.totalStaked}</div>
            <div>SOL in pool</div>
          </div>
          <div className="text-center">
            <div className="text-[var(--red-bright)] text-lg">{mockPoolData.deaths}</div>
            <div>deaths</div>
          </div>
          <div className="text-center">
            <div className="text-[var(--green-bright)] text-lg">{mockPoolData.avgReward}</div>
            <div>avg reward</div>
          </div>
        </div>

        {/* Stake selection */}
        <div className="w-full max-w-xs mb-6">
          <div className="text-[var(--text-muted)] text-xs uppercase tracking-wider mb-3">
            Choose Your Stake
          </div>
          <div className="space-y-2">
            {stakeOptions.map((option) => (
              <button
                key={option.amount}
                onClick={() => setSelectedStake(option.amount)}
                className={`w-full text-left px-4 py-3 transition-all ${
                  selectedStake === option.amount
                    ? 'bg-[var(--amber-dim)]/30 border border-[var(--amber)] text-[var(--amber-bright)]'
                    : 'bg-[var(--bg-surface)] border border-[var(--border-dim)] text-[var(--text-secondary)]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[var(--amber)]">◎</span>
                    <span className="ml-2 font-bold">{option.amount} SOL</span>
                  </div>
                  <span className={selectedStake === option.amount ? 'text-[var(--amber)]' : 'text-[var(--text-muted)]'}>
                    {option.label}
                  </span>
                </div>
                <div className="text-[10px] text-[var(--text-muted)] mt-1">{option.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Enter button */}
        <button
          onClick={handleEnter}
          disabled={!selectedStake || confirming}
          className="w-full max-w-xs px-6 py-4 bg-[var(--amber-dim)]/30 border border-[var(--amber)] text-[var(--amber-bright)] hover:bg-[var(--amber-dim)]/50 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
        >
          {confirming ? (
            <span className="flex items-center justify-center gap-2">
              <span className="animate-pulse">◈</span>
              Confirming transaction...
            </span>
          ) : selectedStake ? (
            <span>▶ Stake {selectedStake} SOL & Enter</span>
          ) : (
            <span>Select a stake amount</span>
          )}
        </button>

        {/* Warning */}
        <p className="text-[var(--text-dim)] text-[10px] text-center mt-4 max-w-xs">
          Your stake will be added to the Memorial Pool if you die. 
          Clear the crypt to claim a share of the pool.
        </p>

      </main>

      {/* Wallet display */}
      <footer className="border-t border-[var(--border-dim)] px-4 py-3 text-center">
        <div className="text-xs text-[var(--text-muted)]">
          Connected: <span className="text-[var(--text-secondary)]">8xH4...k9Qz</span>
          <span className="text-[var(--text-dim)] mx-2">•</span>
          Balance: <span className="text-[var(--amber)]">2.45 SOL</span>
        </div>
      </footer>

    </div>
  );
}
