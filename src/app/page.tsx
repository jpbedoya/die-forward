'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';

const ASCII_LOGO = `
 ██████╗ ██╗███████╗    ███████╗ ██████╗ ██████╗ ██╗    ██╗ █████╗ ██████╗ ██████╗ 
 ██╔══██╗██║██╔════╝    ██╔════╝██╔═══██╗██╔══██╗██║    ██║██╔══██╗██╔══██╗██╔══██╗
 ██║  ██║██║█████╗      █████╗  ██║   ██║██████╔╝██║ █╗ ██║███████║██████╔╝██║  ██║
 ██║  ██║██║██╔══╝      ██╔══╝  ██║   ██║██╔══██╗██║███╗██║██╔══██║██╔══██╗██║  ██║
 ██████╔╝██║███████╗    ██║     ╚██████╔╝██║  ██║╚███╔███╔╝██║  ██║██║  ██║██████╔╝
 ╚═════╝ ╚═╝╚══════╝    ╚═╝      ╚═════╝ ╚═╝  ╚═╝ ╚══╝╚══╝ ╚═╝  ╚═╝╚═╝  ╚═╝╚═════╝ `;

const SCREENSHOTS = [
  { src: '/screenshots/01-splash.png', alt: 'Splash Screen' },
  { src: '/screenshots/02-title.png', alt: 'Title Screen' },
  { src: '/screenshots/03-combat.png', alt: 'Combat' },
  { src: '/screenshots/04-death.png', alt: 'Death Screen' },
  { src: '/screenshots/05-corpse.png', alt: 'Corpse Discovery' },
];

export default function LandingPage() {
  const [mounted, setMounted] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);
  
  // Close lightbox on escape key + arrow navigation
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightboxIndex(null);
      if (e.key === 'ArrowLeft' && lightboxIndex !== null) setLightboxIndex((prev) => (prev! - 1 + SCREENSHOTS.length) % SCREENSHOTS.length);
      if (e.key === 'ArrowRight' && lightboxIndex !== null) setLightboxIndex((prev) => (prev! + 1) % SCREENSHOTS.length);
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [lightboxIndex]);

  // Swipe handlers for lightbox
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (touchStartX.current === null || touchEndX.current === null) return;
    
    const diff = touchStartX.current - touchEndX.current;
    const threshold = 50; // minimum swipe distance
    
    if (Math.abs(diff) > threshold) {
      if (diff > 0) {
        // Swiped left -> next image
        setLightboxIndex((prev) => (prev! + 1) % SCREENSHOTS.length);
      } else {
        // Swiped right -> previous image
        setLightboxIndex((prev) => (prev! - 1 + SCREENSHOTS.length) % SCREENSHOTS.length);
      }
    }
    
    touchStartX.current = null;
    touchEndX.current = null;
  };

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

      {/* The Descent - Vertical Timeline */}
      <section className="py-20 px-4 border-t border-[var(--border-dim)]">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-[var(--amber)] text-2xl mb-16 text-center tracking-wider">
            ◈ THE DESCENT
          </h2>
          
          {/* Vertical timeline */}
          <div className="relative">
            {/* Vertical line - stops before tombstone (calc: 4 steps * spacing, not extending to 5th) */}
            <div className="absolute left-6 sm:left-1/2 top-0 h-[calc(100%-8rem)] w-px bg-gradient-to-b from-[var(--amber)] via-[var(--red)] via-[var(--purple)] via-[var(--green)] to-[var(--text-dim)] sm:-translate-x-px" />
            
            {/* Step 1: Stake */}
            <div className="relative flex items-start gap-6 sm:gap-12 mb-16">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-[var(--bg-base)] border-2 border-[var(--amber)] flex items-center justify-center text-2xl z-10 sm:absolute sm:left-1/2 sm:-translate-x-1/2">
                ◎
              </div>
              <div className="flex-1 sm:w-[calc(50%-4rem)] sm:pr-8 sm:text-right">
                <div className="bg-[var(--bg-surface)] border border-[var(--border-dim)] p-5 relative">
                  <div className="hidden sm:block absolute top-4 -right-2 w-0 h-0 border-t-8 border-b-8 border-l-8 border-transparent border-l-[var(--border-dim)]" />
                  <h3 className="text-[var(--amber-bright)] font-bold text-lg mb-2">STAKE YOUR SOL</h3>
                  <p className="text-[var(--text-muted)] text-sm leading-relaxed">
                    Lock your tokens in the escrow. The deeper you go, the more you risk — and the more you can win.
                  </p>
                  <div className="text-[var(--text-dim)] text-xs mt-3 font-mono">FLOOR 0</div>
                </div>
              </div>
              <div className="hidden sm:block flex-1" />
            </div>

            {/* Step 2: Fight */}
            <div className="relative flex items-start gap-6 sm:gap-12 mb-16">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-[var(--bg-base)] border-2 border-[var(--red)] flex items-center justify-center text-2xl z-10 sm:absolute sm:left-1/2 sm:-translate-x-1/2">
                ⚔️
              </div>
              <div className="hidden sm:block flex-1" />
              <div className="flex-1 sm:w-[calc(50%-4rem)] sm:pl-8">
                <div className="bg-[var(--bg-surface)] border border-[var(--border-dim)] p-5 relative">
                  <div className="hidden sm:block absolute top-4 -left-2 w-0 h-0 border-t-8 border-b-8 border-r-8 border-transparent border-r-[var(--border-dim)]" />
                  <h3 className="text-[var(--red-bright)] font-bold text-lg mb-2">FIGHT OR FLEE</h3>
                  <p className="text-[var(--text-muted)] text-sm leading-relaxed">
                    Battle creatures in the dark. Strike, dodge, brace, or run. Each choice could be your last.
                  </p>
                  <div className="text-[var(--text-dim)] text-xs mt-3 font-mono">FLOORS 1-12</div>
                </div>
              </div>
            </div>

            {/* Step 3: Die */}
            <div className="relative flex items-start gap-6 sm:gap-12 mb-16">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-[var(--bg-base)] border-2 border-[var(--purple)] flex items-center justify-center text-2xl z-10 sm:absolute sm:left-1/2 sm:-translate-x-1/2">
                💀
              </div>
              <div className="flex-1 sm:w-[calc(50%-4rem)] sm:pr-8 sm:text-right">
                <div className="bg-[var(--bg-surface)] border border-[var(--border-dim)] p-5 relative">
                  <div className="hidden sm:block absolute top-4 -right-2 w-0 h-0 border-t-8 border-b-8 border-l-8 border-transparent border-l-[var(--border-dim)]" />
                  <h3 className="text-[var(--purple-bright)] font-bold text-lg mb-2">DIE & LEAVE YOUR MARK</h3>
                  <p className="text-[var(--text-muted)] text-sm leading-relaxed">
                    When you fall, etch your final words into the stone. Your corpse becomes content for others to find.
                  </p>
                  <div className="text-[var(--text-dim)] text-xs mt-3 font-mono">YOUR END</div>
                </div>
              </div>
              <div className="hidden sm:block flex-1" />
            </div>

            {/* Step 4: Tip */}
            <div className="relative flex items-start gap-6 sm:gap-12 mb-16">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-[var(--bg-base)] border-2 border-[var(--green)] flex items-center justify-center text-2xl z-10 sm:absolute sm:left-1/2 sm:-translate-x-1/2">
                💸
              </div>
              <div className="hidden sm:block flex-1" />
              <div className="flex-1 sm:w-[calc(50%-4rem)] sm:pl-8">
                <div className="bg-[var(--bg-surface)] border border-[var(--border-dim)] p-5 relative">
                  <div className="hidden sm:block absolute top-4 -left-2 w-0 h-0 border-t-8 border-b-8 border-r-8 border-transparent border-r-[var(--border-dim)]" />
                  <h3 className="text-[var(--green-bright)] font-bold text-lg mb-2">TIP THE FALLEN</h3>
                  <p className="text-[var(--text-muted)] text-sm leading-relaxed">
                    Discover a corpse with legendary final words? Send them SOL. Death pays dividends.
                  </p>
                  <div className="text-[var(--text-dim)] text-xs mt-3 font-mono">THE CYCLE CONTINUES</div>
                </div>
              </div>
            </div>

            {/* Step 5: Rest in SOL - Tombstone */}
            <div className="relative flex items-start gap-6 sm:gap-12">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-[var(--bg-base)] border-2 border-[var(--text-dim)] flex items-center justify-center text-2xl z-10 sm:absolute sm:left-1/2 sm:-translate-x-1/2">
                🪦
              </div>
              <div className="flex-1 sm:w-[calc(50%-4rem)] sm:pr-8 sm:text-right">
                <div className="bg-[var(--bg-surface)] border border-[var(--border-dim)] p-5 relative">
                  <div className="hidden sm:block absolute top-4 -right-2 w-0 h-0 border-t-8 border-b-8 border-l-8 border-transparent border-l-[var(--border-dim)]" />
                  <h3 className="text-[var(--text-secondary)] font-bold text-lg mb-2">REST IN SOL</h3>
                  <p className="text-[var(--text-muted)] text-sm leading-relaxed">
                    Your journey ends here. But your story lives on in the depths, waiting to be discovered.
                  </p>
                  <div className="text-[var(--text-dim)] text-xs mt-3 font-mono">∞ ETERNAL</div>
                </div>
              </div>
              <div className="hidden sm:block flex-1" />
            </div>
          </div>
        </div>
      </section>

      {/* Screenshots Section - App Store Style */}
      <section className="py-20 bg-[var(--bg-surface)]/50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-[var(--amber)] text-2xl mb-8 text-center tracking-wider px-4">
            ◈ GLIMPSE THE DEPTHS
          </h2>
          
          {/* Horizontal scrolling gallery */}
          <div className="overflow-x-auto scrollbar-hide">
            <div className="flex gap-4 px-4 pb-4" style={{ width: 'max-content' }}>
              {SCREENSHOTS.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setLightboxIndex(i)}
                  className="flex-shrink-0 border border-[var(--border-dim)] bg-[var(--bg-base)] p-1.5 rounded-lg hover:border-[var(--amber-dim)] transition-all hover:scale-[1.02] cursor-pointer group"
                >
                  <div className="w-[140px] sm:w-[160px] aspect-[9/16] relative bg-[var(--bg-surface)] rounded overflow-hidden">
                    <Image
                      src={img.src}
                      alt={img.alt}
                      fill
                      className="object-cover"
                      sizes="160px"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all" />
                  </div>
                  <p className="text-[var(--text-dim)] text-xs mt-1.5 text-center">{img.alt}</p>
                </button>
              ))}
            </div>
          </div>
          
          <p className="text-[var(--text-dim)] text-xs text-center mt-4 px-4">
            Tap to view full size • Scroll for more →
          </p>
        </div>
      </section>

      {/* Lightbox Gallery */}
      {lightboxIndex !== null && (
        <div 
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
          onClick={() => setLightboxIndex(null)}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Close button */}
          <button 
            className="absolute top-4 right-4 text-white/70 hover:text-white text-3xl z-10"
            onClick={() => setLightboxIndex(null)}
          >
            ✕
          </button>
          
          {/* Navigation arrows - hidden on mobile */}
          <button
            className="absolute left-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white text-4xl z-10 p-2 hidden sm:block"
            onClick={(e) => {
              e.stopPropagation();
              setLightboxIndex((prev) => (prev! - 1 + SCREENSHOTS.length) % SCREENSHOTS.length);
            }}
          >
            ‹
          </button>
          <button
            className="absolute right-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white text-4xl z-10 p-2 hidden sm:block"
            onClick={(e) => {
              e.stopPropagation();
              setLightboxIndex((prev) => (prev! + 1) % SCREENSHOTS.length);
            }}
          >
            ›
          </button>
          
          {/* Image - swipeable area */}
          <div 
            className="relative w-full h-full max-w-md max-h-[85vh] mx-4 touch-pan-y"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={SCREENSHOTS[lightboxIndex].src}
              alt={SCREENSHOTS[lightboxIndex].alt}
              fill
              className="object-contain pointer-events-none select-none"
              sizes="(max-width: 768px) 100vw, 500px"
              priority
              draggable={false}
            />
          </div>
          
          {/* Swipe hint on mobile */}
          <p className="absolute bottom-20 left-1/2 -translate-x-1/2 text-white/50 text-xs sm:hidden">
            Swipe to navigate
          </p>
          
          {/* Dots indicator */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
            {SCREENSHOTS.map((_, i) => (
              <button
                key={i}
                onClick={(e) => {
                  e.stopPropagation();
                  setLightboxIndex(i);
                }}
                className={`w-2 h-2 rounded-full transition-all ${
                  i === lightboxIndex ? 'bg-[var(--amber)] w-4' : 'bg-white/40 hover:bg-white/60'
                }`}
              />
            ))}
          </div>
          
          {/* Caption */}
          <p className="absolute bottom-14 left-1/2 -translate-x-1/2 text-white/70 text-sm">
            {['Splash Screen', 'Title Screen', 'Combat', 'Death Screen', 'Corpse Discovery'][lightboxIndex]}
          </p>
        </div>
      )}

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
              href="https://play.dieforward.com"
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
