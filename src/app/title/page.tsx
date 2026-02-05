'use client';

import { useState, useEffect } from 'react';
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

const ASCII_SKULL = `
      _______________
     /               \\
    |  R.I.P.        |
    |    HERE LIES   |
    |   YOUR STAKE   |
    |_________________|
          |   |
         _|   |_
`;

function DeathFeedItem({ player, zone, room, message, timeAgo }: {
  player: string;
  zone: string;
  room: number;
  message: string;
  timeAgo: string;
}) {
  return (
    <div className="text-xs py-2 border-b border-[#1a1a1a] opacity-60 hover:opacity-100 transition-opacity">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-red-500">☠</span>
        <span className="text-purple-400">@{player}</span>
        <span className="text-[#444]">fell in {zone} (room {room})</span>
        <span className="text-[#333] ml-auto">{timeAgo}</span>
      </div>
      <div className="text-[#555] italic pl-5">"{message}"</div>
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
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col font-mono">
      
      {/* Main content */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-8">
        
        {/* Logo */}
        <pre className="text-amber-500 text-[8px] sm:text-[10px] leading-none mb-4 text-center overflow-x-auto max-w-full">
{ASCII_LOGO}
        </pre>

        {/* Tagline */}
        <p className="text-[#ccc] text-sm mb-8 text-center tracking-wider">
          Death is Treasure.
        </p>

        {/* Connect / Enter button */}
        <div className="mb-8">
          {!walletConnected ? (
            <button
              onClick={handleConnect}
              disabled={connecting}
              className="px-6 py-3 bg-[#111] border border-amber-500/50 text-amber-400 hover:bg-amber-500/10 hover:border-amber-500 transition-all disabled:opacity-50"
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
              className="px-6 py-3 bg-amber-500/20 border border-amber-500 text-amber-300 hover:bg-amber-500/30 transition-all inline-flex items-center gap-2"
            >
              <span>▶</span>
              Enter the Crypt
            </Link>
          )}
        </div>

        {/* Wallet status */}
        {walletConnected && (
          <div className="text-xs text-[#555] mb-8">
            Connected: <span className="text-[#888]">8xH4...k9Qz</span>
          </div>
        )}

        {/* Stats bar */}
        <div className="flex items-center gap-6 text-xs text-[#555] mb-8">
          <div>
            <span className="text-red-500">☠</span> 1,247 deaths today
          </div>
          <div>
            <span className="text-amber-500">◎</span> 42.5 SOL in pools
          </div>
          <div>
            <span className="text-green-500">✓</span> 89 clears
          </div>
        </div>

      </main>

      {/* Death feed */}
      <div className="border-t border-[#1a1a1a] px-4 py-3 max-h-48 overflow-y-auto">
        <div className="text-[#333] text-xs mb-2 uppercase tracking-wider">
          ◈ Live Death Feed
        </div>
        {mockDeathFeed.map((death, i) => (
          <DeathFeedItem key={i} {...death} />
        ))}
      </div>

    </div>
  );
}
