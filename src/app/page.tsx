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
  { playerName: 'phantom_phil', zone: 'Sunken Crypt', room: 6, finalMessage: "should have dodged", createdAt: Date.now() - 720000 },
  { playerName: 'web3_warrior', zone: 'Sunken Crypt', room: 3, finalMessage: "tell my family i tried", createdAt: Date.now() - 900000 },
];

function timeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

const ASCII_SKULL = `
    ▄▄▄▄▄▄▄
  ▄█░░░░░░░█▄
 ██░░░░░░░░░██
██░░▀███░███▀░██
█░░░░░░░░░░░░░░█
█░░░░░▄▄▄░░░░░░█
 █░░░░▀▀▀░░░░░█
  █░▄░░░░░▄░█
   █░█▀▀▀█░█
    ▀▀▀▀▀▀▀`;

const ASCII_LOGO = `
 ██████╗ ██╗███████╗    ███████╗ ██████╗ ██████╗ ██╗    ██╗ █████╗ ██████╗ ██████╗ 
 ██╔══██╗██║██╔════╝    ██╔════╝██╔═══██╗██╔══██╗██║    ██║██╔══██╗██╔══██╗██╔══██╗
 ██║  ██║██║█████╗      █████╗  ██║   ██║██████╔╝██║ █╗ ██║███████║██████╔╝██║  ██║
 ██║  ██║██║██╔══╝      ██╔══╝  ██║   ██║██╔══██╗██║███╗██║██╔══██║██╔══██╗██║  ██║
 ██████╔╝██║███████╗    ██║     ╚██████╔╝██║  ██║╚███╔███╔╝██║  ██║██║  ██║██████╔╝
 ╚═════╝ ╚═╝╚══════╝    ╚═╝      ╚═════╝ ╚═╝  ╚═╝ ╚══╝╚══╝ ╚═╝  ╚═╝╚═╝  ╚═╝╚═════╝ `;

// Animated death feed item with entrance animation
function DeathFeedItem({ playerName, room, finalMessage, createdAt, isNew }: {
  playerName: string;
  room: number;
  finalMessage: string;
  createdAt: number;
  isNew?: boolean;
}) {
  return (
    <div className={`py-3 border-b border-[var(--border-dim)]/50 transition-all duration-500 ${isNew ? 'animate-pulse bg-[var(--red-dim)]/10' : ''}`}>
      <div className="flex items-start gap-3">
        {/* Skull icon with glow effect */}
        <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center">
          <span className="text-lg text-[var(--red)] drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]">💀</span>
        </div>
        
        <div className="flex-1 min-w-0">
          {/* Player name and location */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[var(--purple-bright)] font-bold text-sm">@{playerName}</span>
            <span className="text-[var(--text-dim)] text-xs">fell in</span>
            <span className="text-[var(--red)] text-xs font-medium">Room {room}</span>
            <span className="text-[var(--text-dim)] text-[10px] ml-auto">{timeAgo(createdAt)}</span>
          </div>
          
          {/* Final message - the star of the show */}
          <div className="mt-1.5 text-sm text-[var(--text-primary)] italic leading-relaxed">
            "{finalMessage}"
          </div>
        </div>
      </div>
    </div>
  );
}

// Pool stats with dramatic styling
function PoolStats({ totalDeaths, totalStaked, isLoading }: {
  totalDeaths: number;
  totalStaked: number;
  isLoading: boolean;
}) {
  return (
    <div className="flex items-center justify-center gap-8 py-4 border-y border-[var(--border-dim)]/50">
      {/* Deaths */}
      <div className="text-center">
        <div className="flex items-center justify-center gap-2">
          <span className="text-[var(--red)] text-xl drop-shadow-[0_0_10px_rgba(239,68,68,0.6)]">☠</span>
          <span className="text-2xl font-bold text-[var(--red-bright)]">
            {isLoading ? '---' : totalDeaths.toLocaleString()}
          </span>
        </div>
        <div className="text-[10px] text-[var(--text-dim)] uppercase tracking-wider mt-1">
          Souls Lost
        </div>
      </div>

      {/* Divider */}
      <div className="h-8 w-px bg-[var(--border-dim)]" />

      {/* Memorial Pool */}
      <div className="text-center">
        <div className="flex items-center justify-center gap-2">
          <span className="text-[var(--amber)] text-xl drop-shadow-[0_0_10px_rgba(245,158,11,0.6)]">◎</span>
          <span className="text-2xl font-bold text-[var(--amber-bright)]">
            {isLoading ? '-.--' : totalStaked.toFixed(2)}
          </span>
        </div>
        <div className="text-[10px] text-[var(--text-dim)] uppercase tracking-wider mt-1">
          SOL in Pool
        </div>
      </div>

      {/* Divider */}
      <div className="h-8 w-px bg-[var(--border-dim)]" />

      {/* Victory bonus */}
      <div className="text-center">
        <div className="flex items-center justify-center gap-2">
          <span className="text-[var(--green)] text-xl drop-shadow-[0_0_10px_rgba(34,197,94,0.6)]">✦</span>
          <span className="text-2xl font-bold text-[var(--green-bright)]">+50%</span>
        </div>
        <div className="text-[10px] text-[var(--text-dim)] uppercase tracking-wider mt-1">
          Win Bonus
        </div>
      </div>
    </div>
  );
}

// How it works section
function HowItWorks() {
  const steps = [
    { emoji: '◎', title: 'STAKE', desc: 'Risk SOL to enter', color: 'amber' },
    { emoji: '⚔', title: 'FIGHT', desc: 'Navigate the crypt', color: 'red' },
    { emoji: '💀', title: 'DIE', desc: 'Leave final words', color: 'purple' },
    { emoji: '👻', title: 'PERSIST', desc: 'Become content', color: 'blue' },
  ];

  return (
    <div className="py-6 px-4">
      <div className="text-center mb-4">
        <h2 className="text-[var(--text-muted)] text-xs uppercase tracking-[0.3em]">How It Works</h2>
      </div>
      
      <div className="flex items-center justify-center gap-2 sm:gap-4">
        {steps.map((step, i) => (
          <div key={step.title} className="flex items-center">
            {/* Step */}
            <div className="text-center px-2 sm:px-3">
              <div className={`text-xl sm:text-2xl mb-1 text-[var(--${step.color})]`}>
                {step.emoji}
              </div>
              <div className="text-[10px] sm:text-xs font-bold text-[var(--text-secondary)] tracking-wider">
                {step.title}
              </div>
              <div className="text-[9px] sm:text-[10px] text-[var(--text-dim)] hidden sm:block">
                {step.desc}
              </div>
            </div>
            
            {/* Arrow (except last) */}
            {i < steps.length - 1 && (
              <div className="text-[var(--text-dim)] text-xs sm:text-sm px-1">→</div>
            )}
          </div>
        ))}
      </div>

      {/* Value prop */}
      <div className="text-center mt-4 px-4">
        <p className="text-[var(--text-muted)] text-xs leading-relaxed max-w-md mx-auto">
          When you die, your <span className="text-[var(--amber)]">stake</span> joins the pool. 
          Your <span className="text-[var(--purple-bright)]">corpse</span> becomes discoverable content. 
          Your <span className="text-[var(--text-primary)]">final words</span> echo through the crypt forever.
        </p>
      </div>
    </div>
  );
}

function shortenAddress(address: string): string {
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

// Nickname storage key
const NICKNAME_KEY = 'die-forward-nickname';

export default function TitleScreen() {
  const { publicKey, connected, connecting, disconnect, wallet } = useWallet();
  const { setVisible } = useWalletModal();
  const { connection } = useConnection();
  const [balance, setBalance] = useState<number | null>(null);
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  const [nickname, setNickname] = useState('');
  const [editingNickname, setEditingNickname] = useState(false);
  
  // Load nickname from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(NICKNAME_KEY);
    if (saved) setNickname(saved);
  }, []);
  
  // Save nickname to localStorage when changed
  const saveNickname = (name: string) => {
    const trimmed = name.slice(0, 16);
    setNickname(trimmed);
    localStorage.setItem(NICKNAME_KEY, trimmed);
    setEditingNickname(false);
  };
  
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

  // Fetch balance when connected
  useEffect(() => {
    if (publicKey && connection) {
      connection.getBalance(publicKey).then((bal) => {
        setBalance(bal / LAMPORTS_PER_SOL);
      }).catch(() => {});
    } else {
      setBalance(null);
    }
  }, [publicKey, connection]);

  // Cache MWA auth token when connected via Mobile Wallet Adapter
  useEffect(() => {
    // MWA auth will be cached on first transaction
  }, [connected, wallet, publicKey]);

  const handleConnect = () => {
    playSFX('ui-click');
    setVisible(true);
  };

  return (
    <div className="min-h-screen bg-[var(--bg-base)] flex flex-col font-mono relative overflow-hidden">
      
      {/* Background gradient effects */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-[var(--amber)]/5 rounded-full blur-[100px]" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-[var(--red)]/5 rounded-full blur-[80px]" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-[var(--purple)]/5 rounded-full blur-[80px]" />
      </div>

      {/* Audio toggle */}
      <button
        onClick={() => {
          playSFX('ui-click');
          toggleAudio();
        }}
        className="absolute top-4 right-4 p-2 text-[var(--text-muted)] hover:text-[var(--amber)] transition-colors z-20"
        title={audioEnabled ? 'Mute audio' : 'Unmute audio'}
      >
        {audioEnabled ? '🔊' : '🔇'}
      </button>
      
      {/* Main content */}
      <main className="flex-1 flex flex-col relative z-10">
        
        {/* Hero section */}
        <div className="flex-1 flex flex-col items-center justify-center px-4 py-6">
          
          {/* Skull decoration */}
          <pre className="text-[var(--text-dim)]/30 text-[6px] leading-[0.7] mb-2 hidden sm:block">
{ASCII_SKULL}
          </pre>

          {/* Logo */}
          <pre className="text-[var(--amber)] text-[6px] sm:text-[8px] md:text-[10px] leading-none mb-3 text-center overflow-hidden max-w-full drop-shadow-[0_0_20px_rgba(245,158,11,0.3)]">
{ASCII_LOGO}
          </pre>

          {/* Tagline with dramatic styling */}
          <div className="text-center mb-6">
            <p className="text-[var(--text-primary)] text-lg sm:text-xl tracking-[0.2em] font-light">
              Death is <span className="text-[var(--amber-bright)] font-bold">Treasure</span>.
            </p>
            <p className="text-[var(--text-dim)] text-xs mt-2 tracking-wider">
              A social roguelite where your failure enriches others
            </p>
          </div>

          {/* Primary CTA */}
          <div className="mb-4">
            {!connected ? (
              <button
                onClick={handleConnect}
                disabled={connecting}
                className="group relative px-8 py-4 bg-gradient-to-b from-[var(--amber-dim)]/40 to-[var(--amber-dim)]/20 border-2 border-[var(--amber)] text-[var(--amber-bright)] hover:from-[var(--amber-dim)]/60 hover:to-[var(--amber-dim)]/40 hover:border-[var(--amber-bright)] transition-all disabled:opacity-50 text-lg tracking-wider shadow-[0_0_30px_rgba(245,158,11,0.2)] hover:shadow-[0_0_40px_rgba(245,158,11,0.3)]"
              >
                {connecting ? (
                  <span className="flex items-center gap-3">
                    <span className="animate-spin">◎</span>
                    Connecting...
                  </span>
                ) : (
                  <span className="flex items-center gap-3">
                    <span className="text-xl">◎</span>
                    <span>Connect Wallet</span>
                  </span>
                )}
              </button>
            ) : (
              <Link
                href="/stake"
                onClick={() => playSFX('ui-click')}
                className="group relative px-8 py-4 bg-gradient-to-b from-[var(--amber)]/40 to-[var(--amber-dim)]/30 border-2 border-[var(--amber-bright)] text-[var(--amber-bright)] hover:from-[var(--amber)]/60 hover:to-[var(--amber)]/40 transition-all text-lg tracking-wider shadow-[0_0_30px_rgba(245,158,11,0.3)] hover:shadow-[0_0_50px_rgba(245,158,11,0.4)] inline-flex items-center gap-3"
              >
                <span className="text-xl group-hover:translate-x-1 transition-transform">▶</span>
                <span>Enter the Crypt</span>
              </Link>
            )}
          </div>

          {/* Wallet status + Nickname */}
          {connected && publicKey && (
            <div className="text-xs text-[var(--text-muted)] mb-4 flex flex-col items-center gap-2">
              {/* Nickname display/edit */}
              <div className="flex items-center gap-2">
                {editingNickname ? (
                  <input
                    type="text"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value.slice(0, 16))}
                    onBlur={() => saveNickname(nickname)}
                    onKeyDown={(e) => e.key === 'Enter' && saveNickname(nickname)}
                    placeholder="Enter nickname..."
                    autoFocus
                    maxLength={16}
                    className="px-2 py-1 bg-[var(--bg-surface)] border border-[var(--amber-dim)] text-[var(--amber-bright)] text-sm w-32 text-center focus:outline-none focus:border-[var(--amber)]"
                  />
                ) : (
                  <button
                    onClick={() => setEditingNickname(true)}
                    className="text-[var(--amber-bright)] hover:text-[var(--amber)] transition-colors flex items-center gap-1"
                  >
                    <span>@{nickname || shortenAddress(publicKey.toBase58())}</span>
                    <span className="text-[var(--text-dim)] text-[10px]">✎</span>
                  </button>
                )}
              </div>
              
              {/* Wallet address + balance */}
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-[var(--green)] rounded-full animate-pulse" />
                <span className="text-[var(--text-secondary)]">{shortenAddress(publicKey.toBase58())}</span>
                {balance !== null && (
                  <span className="text-[var(--amber)]">◎ {balance.toFixed(4)}</span>
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

          {/* How it works toggle */}
          <button
            onClick={() => setShowHowItWorks(!showHowItWorks)}
            className="text-[var(--text-dim)] hover:text-[var(--text-muted)] text-xs transition-colors"
          >
            {showHowItWorks ? '▼ Hide' : '▶ How does it work?'}
          </button>
        </div>

        {/* How it works section (collapsible) */}
        {showHowItWorks && (
          <div className="bg-[var(--bg-surface)]/50 border-y border-[var(--border-dim)]">
            <HowItWorks />
          </div>
        )}

        {/* Pool stats */}
        <PoolStats 
          totalDeaths={totalDeaths}
          totalStaked={totalStaked}
          isLoading={statsLoading}
        />

        {/* Death feed header */}
        <div className="px-4 py-3 border-b border-[var(--border-dim)]/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[var(--red)]">☠</span>
            <span className="text-xs text-[var(--text-muted)] uppercase tracking-[0.2em]">Live Death Feed</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 bg-[var(--red)] rounded-full animate-pulse" />
            <span className="text-[10px] text-[var(--text-dim)]">LIVE</span>
          </div>
        </div>

        {/* Death feed */}
        <div className="flex-1 overflow-y-auto max-h-64 px-4">
          {deathsLoading ? (
            <div className="text-[var(--text-dim)] text-xs py-8 text-center animate-pulse">
              Loading the fallen...
            </div>
          ) : deathFeed.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-[var(--text-dim)] text-2xl mb-2">👻</div>
              <div className="text-[var(--text-dim)] text-xs">No deaths yet.</div>
              <div className="text-[var(--text-muted)] text-xs mt-1">Be the first to fall...</div>
            </div>
          ) : (
            deathFeed.map((death, i: number) => (
              <DeathFeedItem 
                key={(death as Death).id || i} 
                playerName={death.playerName}
                room={death.room}
                finalMessage={death.finalMessage}
                createdAt={death.createdAt}
                isNew={i === 0}
              />
            ))
          )}
        </div>

        {/* Footer */}
        <footer className="px-4 py-3 border-t border-[var(--border-dim)]/50 text-center">
          <div className="text-[10px] text-[var(--text-dim)]">
            Built for <span className="text-[var(--amber-dim)]">Colosseum Hackathon</span> • 
            <span className="text-[var(--text-muted)]"> Solana Devnet</span>
          </div>
        </footer>

      </main>
    </div>
  );
}
