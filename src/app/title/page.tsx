'use client';

import { useState } from 'react';
import Link from 'next/link';

// Mock death feed data
const mockDeathFeed = [
  { player: 'cryptoKnight', zone: 'Sunken Crypt', room: 4, message: "the water... it's rising...", timeAgo: '2m' },
  { player: 'sol_survivor', zone: 'Sunken Crypt', room: 9, message: "so close...", timeAgo: '5m' },
  { player: 'degen_dave', zone: 'Sunken Crypt', room: 2, message: "lmao first room", timeAgo: '8m' },
  { player: 'hollowknight', zone: 'Sunken Crypt', room: 7, message: "should have dodged...", timeAgo: '12m' },
  { player: 'abysswatcher', zone: 'Sunken Crypt', room: 11, message: "ONE MORE HIT", timeAgo: '15m' },
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
    <div className="text-xs py-2 border-b border-[--border-dim] opacity-70 hover:opacity-100 transition-opacity">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-[--red]">☠</span>
        <span className="text-[--purple-bright]">@{player}</span>
        <span className="text-[--text-muted]">fell in {zone} (room {room})</span>
        <span className="text-[--text-dim] ml-auto">{timeAgo}</span>
      </div>
      <div className="text-[--text-muted] italic pl-5">"{message}"</div>
    </div>
  );
}

export default function TitleScreen() {
  const [walletConnected, setWalletConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);

  const handleConnect = () => {
    setConnecting(true);
    // Simulate wallet connection
    setTimeout(() => {
      setConnecting(false);
      setWalletConnected(true);
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-[--bg-base] flex flex-col font-mono">
      
      {/* Main content */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-8">
        
        {/* Logo */}
        <pre className="text-[--amber] text-[8px] sm:text-[10px] leading-none mb-4 text-center overflow-x-auto max-w-full">
{ASCII_LOGO}
        </pre>

        {/* Tagline */}
        <p className="text-[--text-primary] text-sm mb-8 text-center tracking-wider">
          Death is Treasure.
        </p>

        {/* Connect / Enter button */}
        <div className="mb-8">
          {!walletConnected ? (
            <button
              onClick={handleConnect}
              disabled={connecting}
              className="px-6 py-3 bg-[--bg-surface] border border-[--amber-dim] text-[--amber-bright] hover:bg-[--amber-dim]/20 hover:border-[--amber] transition-all disabled:opacity-50"
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
              className="px-6 py-3 bg-[--amber-dim]/30 border border-[--amber] text-[--amber-bright] hover:bg-[--amber-dim]/50 transition-all inline-flex items-center gap-2"
            >
              <span>▶</span>
              Enter the Crypt
            </Link>
          )}
        </div>

        {/* Wallet status */}
        {walletConnected && (
          <div className="text-xs text-[--text-muted] mb-8">
            Connected: <span className="text-[--text-secondary]">8xH4...k9Qz</span>
          </div>
        )}

        {/* Stats bar */}
        <div className="flex items-center gap-6 text-xs text-[--text-muted] mb-8">
          <div>
            <span className="text-[--red]">☠</span> 1,247 deaths today
          </div>
          <div>
            <span className="text-[--amber]">◎</span> 42.5 SOL in pools
          </div>
          <div>
            <span className="text-[--green]">✓</span> 89 clears
          </div>
        </div>

      </main>

      {/* Death feed */}
      <div className="border-t border-[--border-dim] px-4 py-3 max-h-48 overflow-y-auto">
        <div className="text-[--text-dim] text-xs mb-2 uppercase tracking-wider">
          ◈ Live Death Feed
        </div>
        {mockDeathFeed.map((death, i) => (
          <DeathFeedItem key={i} {...death} />
        ))}
      </div>

    </div>
  );
}
