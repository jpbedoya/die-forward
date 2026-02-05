'use client';

import { useState } from 'react';
import Link from 'next/link';

// Mock data
const mockDeathFeed = [
  { player: 'cryptoKnight', zone: 'Sunken Crypt', room: 4, message: "the water... it's rising...", timeAgo: '2m' },
  { player: 'sol_survivor', zone: 'Sunken Crypt', room: 9, message: "so close...", timeAgo: '5m' },
  { player: 'degen_dave', zone: 'Sunken Crypt', room: 2, message: "lmao first room", timeAgo: '8m' },
  { player: 'hollowknight', zone: 'Sunken Crypt', room: 7, message: "should have dodged...", timeAgo: '12m' },
  { player: 'abysswatcher', zone: 'Sunken Crypt', room: 11, message: "ONE MORE HIT", timeAgo: '15m' },
];

const mockLeaderboard = [
  { rank: 1, player: 'cryptKing', clears: 12, earned: 4.2 },
  { rank: 2, player: 'sol_chad', clears: 9, earned: 3.1 },
  { rank: 3, player: 'abysswatcher', clears: 7, earned: 2.8 },
  { rank: 4, player: 'dungeon_lord', clears: 5, earned: 1.9 },
  { rank: 5, player: 'degen_king', clears: 4, earned: 1.2 },
];

const ASCII_LOGO = `
 ██████╗ ██╗███████╗
 ██╔══██╗██║██╔════╝
 ██║  ██║██║█████╗  
 ██║  ██║██║██╔══╝  
 ██████╔╝██║███████╗
 ╚═════╝ ╚═╝╚══════╝
 ███████╗ ██████╗ ██████╗ ██╗    ██╗ █████╗ ██████╗ ██████╗ 
 ██╔════╝██╔═══██╗██╔══██╗██║    ██║██╔══██╗██╔══██╗██╔══██╗
 █████╗  ██║   ██║██████╔╝██║ █╗ ██║███████║██████╔╝██║  ██║
 ██╔══╝  ██║   ██║██╔══██╗██║███╗██║██╔══██║██╔══██╗██║  ██║
 ██║     ╚██████╔╝██║  ██║╚███╔███╔╝██║  ██║██║  ██║██████╔╝
 ╚═╝      ╚═════╝ ╚═╝  ╚═╝ ╚══╝╚══╝ ╚═╝  ╚═╝╚═╝  ╚═╝╚═════╝ `;

function DeathFeedItem({ player, zone, room, message, timeAgo }: {
  player: string;
  zone: string;
  room: number;
  message: string;
  timeAgo: string;
}) {
  return (
    <div className="text-xs py-2 border-b border-[var(--border-dim)] opacity-70 hover:opacity-100 transition-opacity">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-[var(--red)]">☠</span>
        <span className="text-[var(--purple-bright)]">@{player}</span>
        <span className="text-[var(--text-muted)]">room {room}</span>
        <span className="text-[var(--text-dim)] ml-auto">{timeAgo}</span>
      </div>
      <div className="text-[var(--text-muted)] italic pl-5">"{message}"</div>
    </div>
  );
}

function LeaderboardItem({ rank, player, clears, earned }: {
  rank: number;
  player: string;
  clears: number;
  earned: number;
}) {
  const rankColors: Record<number, string> = {
    1: 'text-[var(--amber-bright)]',
    2: 'text-[var(--text-secondary)]',
    3: 'text-[var(--amber-dim)]',
  };
  return (
    <div className="text-xs py-2 border-b border-[var(--border-dim)] flex items-center">
      <span className={`w-6 ${rankColors[rank] || 'text-[var(--text-dim)]'}`}>
        {rank === 1 ? '👑' : `#${rank}`}
      </span>
      <span className="text-[var(--text-secondary)] flex-1">@{player}</span>
      <span className="text-[var(--green)] w-16 text-right">{clears} wins</span>
      <span className="text-[var(--amber)] w-20 text-right">◎ {earned}</span>
    </div>
  );
}

export default function TitleScreen() {
  const [walletConnected, setWalletConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [activeTab, setActiveTab] = useState<'deaths' | 'leaders'>('deaths');

  const handleConnect = () => {
    setConnecting(true);
    setTimeout(() => {
      setConnecting(false);
      setWalletConnected(true);
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-[var(--bg-base)] flex flex-col font-mono">
      
      {/* Main content */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-8">
        
        {/* Logo */}
        <pre className="text-[var(--amber)] text-[8px] sm:text-[10px] leading-none mb-4 text-center overflow-hidden max-w-full">
{ASCII_LOGO}
        </pre>

        {/* Tagline */}
        <p className="text-[var(--text-primary)] text-sm mb-8 text-center tracking-wider">
          Death is Treasure.
        </p>

        {/* Connect / Enter button */}
        <div className="mb-8">
          {!walletConnected ? (
            <button
              onClick={handleConnect}
              disabled={connecting}
              className="px-6 py-3 bg-[var(--bg-surface)] border border-[var(--amber-dim)] text-[var(--amber-bright)] hover:bg-[var(--amber-dim)]/20 hover:border-[var(--amber)] transition-all disabled:opacity-50"
            >
              {connecting ? (
                <span className="flex items-center gap-2">
                  <span className="animate-pulse">◈</span>
                  Connecting...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <span>◎</span>
                  Connect Wallet
                </span>
              )}
            </button>
          ) : (
            <Link
              href="/stake"
              className="px-6 py-3 bg-[var(--amber-dim)]/30 border border-[var(--amber)] text-[var(--amber-bright)] hover:bg-[var(--amber-dim)]/50 transition-all inline-flex items-center gap-2"
            >
              <span>▶</span>
              Enter the Crypt
            </Link>
          )}
        </div>

        {/* Wallet status */}
        {walletConnected && (
          <div className="text-xs text-[var(--text-muted)] mb-8">
            Connected: <span className="text-[var(--text-secondary)]">8xH4...k9Qz</span>
          </div>
        )}

        {/* Stats bar */}
        <div className="flex items-center gap-6 text-xs text-[var(--text-muted)] mb-8">
          <div>
            <span className="text-[var(--red)]">☠</span> 1,247 deaths
          </div>
          <div>
            <span className="text-[var(--amber)]">◎</span> 42.5 SOL
          </div>
          <div>
            <span className="text-[var(--green)]">✓</span> 89 clears
          </div>
        </div>

      </main>

      {/* Tabs */}
      <div className="border-t border-[var(--border-dim)] flex">
        <button
          onClick={() => setActiveTab('deaths')}
          className={`flex-1 px-4 py-2 text-xs uppercase tracking-wider transition-colors ${
            activeTab === 'deaths'
              ? 'text-[var(--amber)] border-b-2 border-[var(--amber)]'
              : 'text-[var(--text-dim)] hover:text-[var(--text-muted)]'
          }`}
        >
          ☠ Deaths
        </button>
        <button
          onClick={() => setActiveTab('leaders')}
          className={`flex-1 px-4 py-2 text-xs uppercase tracking-wider transition-colors ${
            activeTab === 'leaders'
              ? 'text-[var(--amber)] border-b-2 border-[var(--amber)]'
              : 'text-[var(--text-dim)] hover:text-[var(--text-muted)]'
          }`}
        >
          👑 Leaders
        </button>
      </div>

      {/* Tab content */}
      <div className="px-4 py-3 max-h-48 overflow-y-auto">
        {activeTab === 'deaths' ? (
          mockDeathFeed.map((death, i) => (
            <DeathFeedItem key={i} {...death} />
          ))
        ) : (
          mockLeaderboard.map((entry) => (
            <LeaderboardItem key={entry.rank} {...entry} />
          ))
        )}
      </div>

    </div>
  );
}
