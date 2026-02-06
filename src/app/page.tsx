'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { useConnection } from '@solana/wallet-adapter-react';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { useDeathFeed, usePoolStats, type Death } from '@/lib/instant';
import { useAudio } from '@/lib/audio';

// Fallback mock data when DB is empty
const mockDeathFeed = [
  { playerName: 'cryptoKnight', zone: 'Sunken Crypt', room: 4, finalMessage: "the water... it's rising...", createdAt: Date.now() - 120000 },
  { playerName: 'sol_survivor', zone: 'Sunken Crypt', room: 9, finalMessage: "so close...", createdAt: Date.now() - 300000 },
  { playerName: 'degen_dave', zone: 'Sunken Crypt', room: 2, finalMessage: "lmao first room", createdAt: Date.now() - 480000 },
];

// Leaderboard will be computed from death data

function timeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

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

function DeathFeedItem({ playerName, room, finalMessage, createdAt }: {
  playerName: string;
  room: number;
  finalMessage: string;
  createdAt: number;
}) {
  return (
    <div className="text-xs py-2 border-b border-[var(--border-dim)] opacity-70 hover:opacity-100 transition-opacity">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-[var(--red)]">☠</span>
        <span className="text-[var(--purple-bright)]">@{playerName}</span>
        <span className="text-[var(--text-muted)]">room {room}</span>
        <span className="text-[var(--text-dim)] ml-auto">{timeAgo(createdAt)}</span>
      </div>
      <div className="text-[var(--text-muted)] italic pl-5">"{finalMessage}"</div>
    </div>
  );
}

function LeaderboardItem({ rank, player, deaths, staked }: {
  rank: number;
  player: string;
  deaths: number;
  staked: number;
}) {
  const rankColors: Record<number, string> = {
    1: 'text-[var(--amber-bright)]',
    2: 'text-[var(--text-secondary)]',
    3: 'text-[var(--amber-dim)]',
  };
  return (
    <div className="text-xs py-2 border-b border-[var(--border-dim)] flex items-center">
      <span className={`w-6 ${rankColors[rank] || 'text-[var(--text-dim)]'}`}>
        {rank === 1 ? '💀' : `#${rank}`}
      </span>
      <span className="text-[var(--text-secondary)] flex-1">@{player}</span>
      <span className="text-[var(--red)] w-16 text-right">{deaths} deaths</span>
      <span className="text-[var(--amber)] w-20 text-right">◎ {staked.toFixed(2)}</span>
    </div>
  );
}

function shortenAddress(address: string): string {
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

export default function TitleScreen() {
  const { publicKey, connected, connecting, disconnect, wallet } = useWallet();
  const { setVisible } = useWalletModal();
  const { connection } = useConnection();
  const [balance, setBalance] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'deaths' | 'leaders'>('deaths');
  
  // Audio
  const { enabled: audioEnabled, toggle: toggleAudio, playAmbient, playSFX } = useAudio();
  
  // Play title ambient on mount
  useEffect(() => {
    playAmbient('ambient-title');
  }, [playAmbient]);
  
  // Real-time death feed from InstantDB
  const { deaths: dbDeaths, isLoading: deathsLoading } = useDeathFeed(10);
  const { totalDeaths, totalStaked, isLoading: statsLoading } = usePoolStats();

  // Use real data if available, fall back to mock
  const deathFeed = dbDeaths.length > 0 ? dbDeaths : mockDeathFeed;

  // Compute leaderboard from deaths (most deaths = most experienced!)
  const leaderboard = useMemo(() => {
    const playerStats: Record<string, { deaths: number; totalStaked: number }> = {};
    
    dbDeaths.forEach((death) => {
      const name = death.playerName || 'unknown';
      if (!playerStats[name]) {
        playerStats[name] = { deaths: 0, totalStaked: 0 };
      }
      playerStats[name].deaths++;
      playerStats[name].totalStaked += death.stakeAmount || 0;
    });

    return Object.entries(playerStats)
      .map(([player, stats], i) => ({
        rank: i + 1,
        player,
        deaths: stats.deaths,
        staked: stats.totalStaked,
      }))
      .sort((a, b) => b.deaths - a.deaths)
      .slice(0, 5)
      .map((entry, i) => ({ ...entry, rank: i + 1 }));
  }, [dbDeaths]);

  // Fetch balance when connected
  useEffect(() => {
    if (publicKey && connection) {
      connection.getBalance(publicKey).then((bal) => {
        setBalance(bal / LAMPORTS_PER_SOL);
      }).catch(console.error);
    } else {
      setBalance(null);
    }
  }, [publicKey, connection]);

  // Cache MWA auth token when connected via Mobile Wallet Adapter
  useEffect(() => {
    // MWA auth will be cached on first transaction
    // No action needed here, just keeping the effect for future use
  }, [connected, wallet, publicKey]);

  const handleConnect = () => {
    playSFX('ui-click');
    setVisible(true);
  };

  return (
    <div className="min-h-screen bg-[var(--bg-base)] flex flex-col font-mono relative">
      
      {/* Audio toggle */}
      <button
        onClick={() => {
          playSFX('ui-click');
          toggleAudio();
        }}
        className="absolute top-4 right-4 p-2 text-[var(--text-muted)] hover:text-[var(--amber)] transition-colors z-10"
        title={audioEnabled ? 'Mute audio' : 'Unmute audio'}
      >
        {audioEnabled ? '🔊' : '🔇'}
      </button>
      
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
          {!connected ? (
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
              onClick={() => playSFX('ui-click')}
              className="px-6 py-3 bg-[var(--amber-dim)]/30 border border-[var(--amber)] text-[var(--amber-bright)] hover:bg-[var(--amber-dim)]/50 transition-all inline-flex items-center gap-2"
            >
              <span>▶</span>
              Enter the Crypt
            </Link>
          )}
        </div>

        {/* Wallet status */}
        {connected && publicKey && (
          <div className="text-xs text-[var(--text-muted)] mb-4 flex flex-col items-center gap-2">
            <div>
              Connected: <span className="text-[var(--text-secondary)]">{shortenAddress(publicKey.toBase58())}</span>
              {balance !== null && (
                <span className="text-[var(--amber)] ml-2">◎ {balance.toFixed(4)}</span>
              )}
            </div>
            <button 
              onClick={() => disconnect()}
              className="text-[var(--text-dim)] hover:text-[var(--red)] transition-colors text-[10px]"
            >
              [disconnect]
            </button>
          </div>
        )}

        {/* Stats bar */}
        <div className="flex items-center gap-6 text-xs text-[var(--text-muted)] mb-8">
          <div>
            <span className="text-[var(--red)]">☠</span> {statsLoading ? '...' : totalDeaths.toLocaleString()} deaths
          </div>
          <div>
            <span className="text-[var(--amber)]">◎</span> {statsLoading ? '...' : totalStaked.toFixed(2)} SOL
          </div>
          <div>
            <span className="text-[var(--green)]">✓</span> -- clears
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
          deathsLoading ? (
            <div className="text-[var(--text-dim)] text-xs py-4 text-center animate-pulse">Loading deaths...</div>
          ) : deathFeed.length === 0 ? (
            <div className="text-[var(--text-dim)] text-xs py-4 text-center">No deaths yet. Be the first to fall...</div>
          ) : (
            deathFeed.map((death, i: number) => (
              <DeathFeedItem 
                key={(death as Death).id || i} 
                playerName={death.playerName}
                room={death.room}
                finalMessage={death.finalMessage}
                createdAt={death.createdAt}
              />
            ))
          )
        ) : (
          leaderboard.length === 0 ? (
            <div className="text-[var(--text-dim)] text-xs py-4 text-center">No deaths yet. Leaderboard is empty.</div>
          ) : (
            leaderboard.map((entry) => (
              <LeaderboardItem key={entry.rank} {...entry} />
            ))
          )
        )}
      </div>

    </div>
  );
}
