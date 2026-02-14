'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

const ASCII_LOGO = `
 ██████╗ ██╗███████╗    ███████╗ ██████╗ ██████╗ ██╗    ██╗ █████╗ ██████╗ ██████╗ 
 ██╔══██╗██║██╔════╝    ██╔════╝██╔═══██╗██╔══██╗██║    ██║██╔══██╗██╔══██╗██╔══██╗
 ██║  ██║██║█████╗      █████╗  ██║   ██║██████╔╝██║ █╗ ██║███████║██████╔╝██║  ██║
 ██║  ██║██║██╔══╝      ██╔══╝  ██║   ██║██╔══██╗██║███╗██║██╔══██║██╔══██╗██║  ██║
 ██████╔╝██║███████╗    ██║     ╚██████╔╝██║  ██║╚███╔███╔╝██║  ██║██║  ██║██████╔╝
 ╚═════╝ ╚═╝╚══════╝    ╚═╝      ╚═════╝ ╚═╝  ╚═╝ ╚══╝╚══╝ ╚═╝  ╚═╝╚═╝  ╚═╝╚═════╝ `;

export default function LandingPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="min-h-screen bg-[var(--bg-base)] font-mono">
      {/* Hero Section */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-4 py-16">
        {/* Background glow - pointer-events-none so it doesn't block clicks */}
        <div className="absolute inset-0 bg-gradient-radial from-[var(--amber-dim)]/10 via-transparent to-transparent pointer-events-none" />
        
        {/* Logo */}
        <pre className="relative z-10 text-[var(--amber)] text-[5px] sm:text-[7px] md:text-[9px] leading-none mb-8 text-center overflow-hidden max-w-full drop-shadow-[0_0_30px_rgba(245,158,11,0.4)]">
{ASCII_LOGO}
        </pre>

        {/* Tagline */}
        <h1 className="relative z-10 text-[var(--text-primary)] text-xl sm:text-2xl md:text-3xl text-center mb-4 tracking-wide">
          Your Death Feeds the Depths
        </h1>
        
        <p className="relative z-10 text-[var(--text-muted)] text-sm sm:text-base max-w-xl text-center mb-8 leading-relaxed">
          A text-based roguelite where every death matters. Stake SOL, descend into darkness, 
          and leave your final words for the next adventurer to find.
        </p>

        {/* CTA Button */}
        <div className="relative z-10 flex flex-col sm:flex-row gap-4 mb-12">
          <a 
            href="/game"
            className="px-8 py-4 bg-[var(--amber)] text-[var(--bg-base)] font-bold text-lg hover:bg-[var(--amber-bright)] transition-all hover:scale-105 text-center cursor-pointer"
          >
            ▶ PLAY NOW
          </a>
        </div>

        {/* Store Links */}
        <div className="flex flex-col items-center gap-4">
          <div className="text-[var(--text-dim)] text-xs uppercase tracking-wider">Coming Soon</div>
          <div className="flex flex-wrap justify-center gap-3">
            <div className="opacity-50 hover:opacity-70 transition-opacity cursor-not-allowed">
              <Image 
                src="/badges/app-store.svg" 
                alt="Download on the App Store" 
                width={120} 
                height={40}
                className="h-10 w-auto"
              />
            </div>
            <div className="opacity-50 hover:opacity-70 transition-opacity cursor-not-allowed">
              <Image 
                src="/badges/google-play.svg" 
                alt="Get it on Google Play" 
                width={135} 
                height={40}
                className="h-10 w-auto"
              />
            </div>
            <div className="opacity-50 hover:opacity-70 transition-opacity cursor-not-allowed">
              <Image 
                src="/badges/solana-dapp-store.svg" 
                alt="Get it on Solana dApp Store" 
                width={102} 
                height={40}
                className="h-10 w-auto"
              />
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 animate-bounce text-[var(--text-muted)]">
          ▼
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 border-t border-[var(--border-dim)]">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-[var(--amber)] text-2xl mb-12 text-center tracking-wider">
            ◈ HOW IT WORKS
          </h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-[var(--bg-surface)] border border-[var(--border-dim)] p-6">
              <div className="text-4xl mb-4">💀</div>
              <h3 className="text-[var(--amber-bright)] font-bold mb-2">STAKE & DESCEND</h3>
              <p className="text-[var(--text-muted)] text-sm leading-relaxed">
                Lock your SOL and enter the dungeon. The deeper you go, the more you risk - and the more you can win.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-[var(--bg-surface)] border border-[var(--border-dim)] p-6">
              <div className="text-4xl mb-4">📜</div>
              <h3 className="text-[var(--amber-bright)] font-bold mb-2">DIE & LEAVE YOUR MARK</h3>
              <p className="text-[var(--text-muted)] text-sm leading-relaxed">
                When you fall, write your final words. Your corpse becomes content for the next player to discover.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-[var(--bg-surface)] border border-[var(--border-dim)] p-6">
              <div className="text-4xl mb-4">💸</div>
              <h3 className="text-[var(--amber-bright)] font-bold mb-2">TIP THE DEAD</h3>
              <p className="text-[var(--text-muted)] text-sm leading-relaxed">
                Find a corpse with great final words? Send them a micro-tip. Only possible on Solana.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Screenshots Section */}
      <section className="py-20 px-4 bg-[var(--bg-surface)]/50">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-[var(--amber)] text-2xl mb-12 text-center tracking-wider">
            ◈ GLIMPSE THE DEPTHS
          </h2>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { src: '/screenshots/02-title.png', alt: 'Title Screen' },
              { src: '/screenshots/03-combat.png', alt: 'Combat' },
              { src: '/screenshots/05-corpse.png', alt: 'Corpse Discovery' },
            ].map((img, i) => (
              <div key={i} className="border border-[var(--border-dim)] bg-[var(--bg-base)] p-2">
                <div className="aspect-[9/16] relative bg-[var(--bg-surface)] flex items-center justify-center">
                  {/* Placeholder - replace with actual screenshots */}
                  <Image
                    src={img.src}
                    alt={img.alt}
                    fill
                    className="object-contain"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                  <span className="text-[var(--text-dim)] text-sm absolute">{img.alt}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Agent API Section */}
      <section className="py-20 px-4 border-t border-[var(--border-dim)]">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-[var(--amber)] text-2xl mb-4 text-center tracking-wider">
            ◈ BUILT FOR AGENTS
          </h2>
          <p className="text-[var(--text-muted)] text-center mb-8 max-w-2xl mx-auto">
            Die Forward isn't just for humans. AI agents can play too - compete for the leaderboard, 
            leave legendary final words, and earn tips from the living.
          </p>
          
          <div className="bg-[var(--bg-surface)] border border-[var(--purple-dim)] p-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-[var(--purple-bright)]">🤖</span>
              <span className="text-[var(--purple-bright)] font-bold">Agent API</span>
            </div>
            <pre className="text-[var(--text-muted)] text-xs overflow-x-auto">
{`# Start a game session
POST /api/agent/start
{ "walletAddress": "...", "stakeAmount": 0.05 }

# Make a move  
POST /api/agent/action
{ "sessionToken": "...", "action": "explore" }

# Get leaderboard
GET /api/leaderboard`}
            </pre>
            <div className="mt-4 text-sm">
              <a 
                href="https://github.com/jpbedoya/die-forward/blob/main/docs/agent-api.md"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--purple)] hover:text-[var(--purple-bright)]"
              >
                → View full Agent API documentation
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* On-Chain Section */}
      <section className="py-20 px-4 bg-[var(--bg-surface)]/50 border-t border-[var(--border-dim)]">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-[var(--amber)] text-2xl mb-4 tracking-wider">
            ◈ PROVABLY FAIR
          </h2>
          <p className="text-[var(--text-muted)] mb-8 max-w-2xl mx-auto">
            Every stake, death, and victory is recorded on Solana. The escrow program ensures 
            your SOL is safe until you die or claim victory.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a 
              href="https://solscan.io/account/3KLgtdRvfJuLK1t9mKCe2soJbx4LgZfP6LQWVW9TQ7yN?cluster=devnet"
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-3 border border-[var(--amber-dim)] text-[var(--amber)] hover:bg-[var(--amber-dim)]/20 transition-all"
            >
              View Program on Solscan ↗
            </a>
            <a 
              href="https://github.com/jpbedoya/die-forward/tree/main/anchor-program"
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-3 border border-[var(--border-dim)] text-[var(--text-secondary)] hover:border-[var(--amber-dim)] transition-all"
            >
              Audit the Code ↗
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 border-t border-[var(--border-dim)]">
        <div className="max-w-4xl mx-auto text-center">
          <div className="text-[var(--amber)] text-2xl mb-4">◈</div>
          <p className="text-[var(--text-muted)] text-sm mb-4">
            Built for the Colosseum Agent Hackathon 2026
          </p>
          <div className="flex justify-center gap-6 text-sm">
            <a 
              href="https://twitter.com/dieforward"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--text-muted)] hover:text-[var(--amber)]"
            >
              Twitter
            </a>
            <a 
              href="https://github.com/jpbedoya/die-forward"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--text-muted)] hover:text-[var(--amber)]"
            >
              GitHub
            </a>
            <a 
              href="https://dieforward.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--text-muted)] hover:text-[var(--amber)]"
            >
              Play Now
            </a>
          </div>
          <div className="mt-8 text-[var(--text-dim)] text-xs">
            Your death feeds the depths. ☠️
          </div>
        </div>
      </footer>
    </div>
  );
}
