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

type BehaviorTag = 'AGGRESSIVE' | 'DEFENSIVE' | 'STALKING' | 'ERRATIC' | 'CHARGING' | 'HUNTING' | 'RETREATING';

type CreatureEntry = {
  name: string;
  tier: 1 | 2 | 3;
  hp: [number, number];
  behaviors: BehaviorTag[];
  description: string;
  art: string | null;
  emoji: string;
};

const BESTIARY: CreatureEntry[] = [
  { name: 'The Drowned',       tier: 1, hp: [45, 65],   behaviors: ['AGGRESSIVE', 'ERRATIC', 'DEFENSIVE'],   description: "Waterlogged husks animated by the underworld's hunger.", art: '/creatures/the-drowned.webp',         emoji: '🧟' },
  { name: 'Pale Crawler',      tier: 1, hp: [35, 50],   behaviors: ['STALKING', 'AGGRESSIVE', 'HUNTING'],    description: 'Too many limbs. They cling to walls and ceilings.',        art: '/creatures/pale-crawler.webp',        emoji: '🕷️' },
  { name: 'The Hollow',        tier: 1, hp: [40, 55],   behaviors: ['STALKING', 'ERRATIC', 'CHARGING'],      description: 'No face, no features. Just shadow.',                        art: '/creatures/the-hollow.webp',          emoji: '👤' },
  { name: 'Bloated One',       tier: 1, hp: [55, 75],   behaviors: ['AGGRESSIVE', 'CHARGING', 'ERRATIC'],    description: 'Corpses swollen with dark water.',                           art: '/creatures/the-bloated.webp',         emoji: '🫧' },
  { name: 'Flickering Shade',  tier: 1, hp: [30, 45],   behaviors: ['ERRATIC', 'STALKING', 'RETREATING'],    description: 'Afterimages of the dead.',                                   art: '/creatures/flickering-shade.webp',    emoji: '👻' },
  { name: 'The Hunched',       tier: 1, hp: [50, 70],   behaviors: ['HUNTING', 'AGGRESSIVE', 'STALKING'],    description: 'Bent figures that move on all fours.',                       art: '/creatures/the-hunched.webp',         emoji: '🐺' },
  { name: 'Tideborn',          tier: 1, hp: [60, 80],   behaviors: ['CHARGING', 'AGGRESSIVE', 'DEFENSIVE'],  description: 'Creatures of living water. They rise from puddles, take form, then collapse.', art: '/creatures/tideborn.webp', emoji: '🌊' },
  { name: 'Bone Weavers',      tier: 1, hp: [40, 55],   behaviors: ['AGGRESSIVE', 'CHARGING', 'STALKING'],   description: 'Skeletal hands that emerge from walls and floors. Just hands.', art: '/creatures/bone-weavers.webp',      emoji: '🦴' },
  { name: 'Ash Children',      tier: 1, hp: [25, 40],   behaviors: ['STALKING', 'DEFENSIVE', 'CHARGING'],    description: "Small. Gray. They don't attack — they suffocate.",            art: '/creatures/ash-children.webp',        emoji: '👶' },
  { name: 'Echo Husks',        tier: 1, hp: [35, 50],   behaviors: ['STALKING', 'ERRATIC', 'AGGRESSIVE'],    description: 'They repeat the last words of the dead. Over and over.',     art: '/creatures/echo-husks.webp',         emoji: '🗣️' },
  { name: 'Hollow Clergy',     tier: 2, hp: [70, 90],   behaviors: ['CHARGING', 'DEFENSIVE', 'AGGRESSIVE'],  description: 'Priests of a nameless god.',                                  art: '/creatures/hollow-clergy.webp',       emoji: '🧙' },
  { name: 'The Bound',         tier: 2, hp: [80, 100],  behaviors: ['HUNTING', 'AGGRESSIVE', 'CHARGING'],    description: 'Souls wrapped in chains of regret.',                         art: '/creatures/the-bound.webp',           emoji: '⛓️' },
  { name: 'Forgotten Guardian',tier: 2, hp: [90, 110],  behaviors: ['DEFENSIVE', 'AGGRESSIVE', 'CHARGING'],  description: 'Stone sentinels animated by old magic.',                     art: '/creatures/forgotten-guardian.webp',  emoji: '🗿' },
  { name: 'The Weeping',       tier: 2, hp: [60, 80],   behaviors: ['STALKING', 'ERRATIC', 'CHARGING'],      description: 'Spirits of grief. Their touch brings sorrow so deep it wounds.', art: '/creatures/the-weeping.webp',   emoji: '😢' },
  { name: 'Carrion Knight',    tier: 2, hp: [85, 105],  behaviors: ['AGGRESSIVE', 'DEFENSIVE', 'CHARGING'],  description: 'Warriors who refused to stop fighting.',                     art: '/creatures/carrion-knight.webp',      emoji: '⚔️' },
  { name: 'Pale Oracle',       tier: 2, hp: [55, 70],   behaviors: ['CHARGING', 'RETREATING', 'STALKING'],   description: "Eyeless seers who speak truths you don't want to hear.",    art: '/creatures/pale-oracle.webp',         emoji: '🔮' },
  { name: 'The Congregation',  tier: 2, hp: [100, 130], behaviors: ['AGGRESSIVE', 'CHARGING', 'STALKING'],   description: 'Pilgrims fused at the edges, moving as one.',                art: '/creatures/the-congregation.webp',    emoji: '👥' },
  { name: 'Pale Crawler Swarm',tier: 2, hp: [75, 95],   behaviors: ['AGGRESSIVE', 'HUNTING', 'CHARGING'],    description: "One wouldn't be a threat. But there isn't one.",             art: '/creatures/pale-crawler-swarm.webp',  emoji: '🕷️' },
  { name: 'The Unnamed',       tier: 3, hp: [120, 150], behaviors: ['ERRATIC', 'CHARGING', 'STALKING'],      description: 'You cannot see it clearly. Your mind refuses.',              art: '/creatures/the-unnamed.webp',         emoji: '❓' },
  { name: 'Mother of Tides',   tier: 3, hp: [130, 160], behaviors: ['CHARGING', 'AGGRESSIVE', 'DEFENSIVE'],  description: 'The water itself, given will. Everything that drowns belongs to her.', art: '/creatures/mother-of-tides.webp', emoji: '🌊' },
  { name: 'The Keeper',        tier: 3, hp: [180, 220], behaviors: ['CHARGING', 'AGGRESSIVE', 'DEFENSIVE'],  description: 'Guardian of the exit. None have passed.',                    art: '/creatures/the-keeper.webp',          emoji: '👁️' },
];

const TIER_COLORS: Record<number, { label: string; border: string; text: string; bg: string }> = {
  1: { label: 'TIER I',   border: 'border-[var(--border-default)]', text: 'text-[var(--text-dim)]',  bg: 'bg-[var(--bg-surface)]' },
  2: { label: 'TIER II',  border: 'border-[#c47a3a]',               text: 'text-[#c47a3a]',          bg: 'bg-[#c47a3a]/10' },
  3: { label: 'TIER III', border: 'border-[var(--blood)]',          text: 'text-[var(--blood)]',     bg: 'bg-[var(--blood)]/10' },
};

const BESTIARY_ROW1 = BESTIARY.slice(0, 10);
const BESTIARY_ROW2 = BESTIARY.slice(10);

const SCREENSHOTS = [
  { src: '/screenshots/01-home.png', alt: 'Home Screen' },
  { src: '/screenshots/02-toll.png', alt: 'Toll Gate Stake Screen' },
  { src: '/screenshots/03-combat.png', alt: 'Combat Screen' },
  { src: '/screenshots/04-death.png', alt: 'Death Screen' },
  { src: '/screenshots/05-soundtrack.png', alt: 'Soundtrack Screen' },
  { src: '/screenshots/06-ranks.png', alt: 'Ranks Screen' },
  { src: '/screenshots/07-death-card.png', alt: 'Death Card Share Modal' },
];

function CreatureCard({ creature, onClick }: { creature: CreatureEntry; onClick: () => void }) {
  const tier = TIER_COLORS[creature.tier];
  return (
    <button
      onClick={onClick}
      className="flex-shrink-0 w-[160px] mx-2 bg-[var(--bg-base)] border border-[var(--border-dim)] hover:border-[var(--amber-dim,#7a6a3a)] transition-colors group cursor-pointer text-left"
    >
      {/* Art */}
      <div className="relative w-full overflow-hidden" style={{ aspectRatio: '341/420' }}>
        {creature.art ? (
          <Image
            src={creature.art}
            alt={creature.name}
            fill
            className="object-cover object-top group-hover:scale-105 transition-transform duration-500"
            sizes="160px"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-[var(--bg-surface)]">
            <span className="text-5xl">{creature.emoji}</span>
          </div>
        )}
        {/* Tier badge overlay */}
        <span className={`absolute top-1.5 left-1.5 text-[10px] font-mono px-1.5 py-0.5 border ${tier.border} ${tier.text} ${tier.bg} backdrop-blur-sm`}>
          {tier.label}
        </span>
      </div>

      {/* Info */}
      <div className="p-2.5">
        <p className="text-[var(--amber)] font-mono text-xs font-bold leading-tight mb-1 truncate">{creature.name}</p>
        <p className="text-[#c84040] font-mono text-[10px] mb-1.5">♥ {creature.hp[0]}–{creature.hp[1]}</p>
        <p className="text-[var(--text-dim)] font-mono text-[10px] leading-tight line-clamp-2 italic mb-2">{creature.description}</p>
        <div className="flex flex-wrap gap-1">
          {creature.behaviors.slice(0, 2).map((b) => (
            <span key={b} className="text-[9px] font-mono text-[var(--ethereal,#9d8ec4)] border border-[var(--border-dim)] px-1 py-0.5 leading-none">
              {b}
            </span>
          ))}
        </div>
      </div>
    </button>
  );
}

export default function LandingPage() {
  const [mounted, setMounted] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [selectedCreature, setSelectedCreature] = useState<CreatureEntry | null>(null);
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
    <div className="min-h-screen bg-[var(--bg-base)] font-mono scroll-smooth">
      {/* Hero Section */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-4 py-16 overflow-hidden">
        {/* Hero image background */}
        <Image
          src="/images/hero-home.webp"
          alt="Flooded crypt hallway"
          fill
          priority
          className="object-cover object-center"
        />

        {/* Dark overlays for text readability */}
        <div className="absolute inset-0 bg-black/46 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/36 via-black/20 to-black/60 pointer-events-none" />
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
            href="https://play.dieforward.com"
            className="px-8 py-4 bg-[var(--amber)] text-[var(--bg-base)] font-bold text-lg hover:bg-[var(--amber-bright)] transition-all hover:scale-105 text-center cursor-pointer"
          >
            ▶ PLAY NOW
          </a>
        </div>

        {/* Store Links */}
        <div className="relative z-10 flex flex-col items-center gap-4">
          <div className="text-[var(--text-dim)] text-xs uppercase tracking-wider">Coming Soon</div>
          <div className="flex flex-wrap justify-center gap-3">
            {/* App Store + Google Play — hidden for now, restore when ready
            <div className="relative group cursor-not-allowed">
              <div className="opacity-50 group-hover:opacity-70 transition-opacity">
                <Image 
                  src="/badges/app-store.svg" 
                  alt="Download on the App Store" 
                  width={120} 
                  height={40}
                  className="h-10 w-auto"
                />
              </div>
              <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-[var(--bg-card)] text-[var(--text-dim)] text-xs px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                Coming soon
              </div>
            </div>
            <div className="relative group cursor-not-allowed">
              <div className="opacity-50 group-hover:opacity-70 transition-opacity">
                <Image 
                  src="/badges/google-play.svg" 
                  alt="Get it on Google Play" 
                  width={135} 
                  height={40}
                  className="h-10 w-auto"
                />
              </div>
              <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-[var(--bg-card)] text-[var(--text-dim)] text-xs px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                Coming soon
              </div>
            </div>
            */}
            <div className="opacity-50 cursor-not-allowed" title="Coming soon">
              <Image 
                src="/badges/solana-dapp-store.svg" 
                alt="Get it on Solana dApp Store" 
                width={102} 
                height={40}
                className="h-10 w-auto"
              />
            </div>
            <a
              href="https://github.com/jpbedoya/die-forward/releases/download/v1.4.0/die-forward-v1.4.0.apk"
              target="_blank"
              rel="noopener noreferrer"
            >
              <img
                src="/badges/android-apk-official.png"
                alt="Download APK for Android"
                width="122"
                height="40"
                className="h-10 w-auto rounded-md border border-white/40"
              />
            </a>
          </div>
        </div>

        {/* Scroll indicator */}
        <a
          href="#descent"
          className="absolute bottom-8 animate-bounce text-[var(--text-muted)] hover:text-[var(--amber)] transition-colors cursor-pointer"
          aria-label="Scroll to The Descent section"
        >
          ▼
        </a>
      </section>

      {/* The Descent - Vertical Timeline */}
      <section id="descent" className="py-20 px-4 border-t border-[var(--border-dim)]">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-[var(--amber)] text-2xl mb-16 text-center tracking-wider">
            ◈ THE DESCENT
          </h2>
          
          {/* Vertical timeline */}
          <div className="relative">
            {/* Vertical line - stops before tombstone (calc: 4 steps * spacing, not extending to 5th) */}
            <div className="absolute left-10 sm:left-1/2 top-0 h-[calc(100%-8rem)] w-px bg-gradient-to-b from-[var(--amber)] via-[var(--red)] via-[var(--purple)] via-[var(--green)] to-[var(--text-dim)] sm:-translate-x-px" />
            
            {/* Step 1: Stake */}
            <div className="relative flex items-start gap-6 sm:gap-12 mb-16">
              <div className="flex-shrink-0 w-20 h-20 rounded-full bg-[var(--bg-base)] border-2 border-[var(--amber)] overflow-hidden z-10 sm:absolute sm:left-1/2 sm:-translate-x-1/2">
                <Image src="/images/icons/icon-stake-256.webp" alt="Stake your SOL" width={80} height={80} className="w-full h-full object-cover" />
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
              <div className="flex-shrink-0 w-20 h-20 rounded-full bg-[var(--bg-base)] border-2 border-[var(--red)] overflow-hidden z-10 sm:absolute sm:left-1/2 sm:-translate-x-1/2">
                <Image src="/images/icons/icon-fight-256.webp" alt="Fight or flee" width={80} height={80} className="w-full h-full object-cover" />
              </div>
              <div className="hidden sm:block flex-1" />
              <div className="flex-1 sm:w-[calc(50%-4rem)] sm:pl-8">
                <div className="bg-[var(--bg-surface)] border border-[var(--border-dim)] p-5 relative">
                  <div className="hidden sm:block absolute top-4 -left-2 w-0 h-0 border-t-8 border-b-8 border-r-8 border-transparent border-r-[var(--border-dim)]" />
                  <h3 className="text-[var(--red-bright)] font-bold text-lg mb-2">FIGHT OR FLEE</h3>
                  <p className="text-[var(--text-muted)] text-sm leading-relaxed">
                    Battle creatures in the dark. Read their intent — Strike when they charge, dodge when they lunge. Each choice costs stamina. Make them count.
                  </p>
                  <div className="text-[var(--text-dim)] text-xs mt-3 font-mono">FLOORS 1-12</div>
                </div>
              </div>
            </div>

            {/* Step 3: Die */}
            <div className="relative flex items-start gap-6 sm:gap-12 mb-16">
              <div className="flex-shrink-0 w-20 h-20 rounded-full bg-[var(--bg-base)] border-2 border-[var(--purple)] overflow-hidden z-10 sm:absolute sm:left-1/2 sm:-translate-x-1/2">
                <Image src="/images/icons/icon-die-256.webp" alt="Die and leave your mark" width={80} height={80} className="w-full h-full object-cover" />
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
              <div className="flex-shrink-0 w-20 h-20 rounded-full bg-[var(--bg-base)] border-2 border-[var(--green)] overflow-hidden z-10 sm:absolute sm:left-1/2 sm:-translate-x-1/2">
                <Image src="/images/icons/icon-tip-256.webp" alt="Tip the fallen" width={80} height={80} className="w-full h-full object-cover" />
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
              <div className="flex-shrink-0 w-20 h-20 rounded-full bg-[var(--bg-base)] border-2 border-[var(--text-dim)] overflow-hidden z-10 sm:absolute sm:left-1/2 sm:-translate-x-1/2">
                <Image src="/images/icons/icon-rest-256.webp" alt="Rest in SOL" width={80} height={80} className="w-full h-full object-cover" />
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

      {/* Bestiary Section */}
      <section className="py-20 border-t border-[var(--border-dim)] overflow-hidden">
        <div className="max-w-6xl mx-auto mb-8 px-4">
          <h2 className="text-[var(--amber)] text-2xl mb-2 text-center tracking-wider">
            ◈ WHAT AWAITS YOU
          </h2>
          <p className="text-[var(--text-dim)] text-sm text-center">
            {BESTIARY.length} creatures across 3 tiers · Click to inspect
          </p>
        </div>

        {/* Row 1 — scrolls right */}
        <div className="marquee-row mb-3 relative" style={{ maskImage: 'linear-gradient(to right, transparent, black 8%, black 92%, transparent)' }}>
          <div className="flex animate-marquee" style={{ width: 'max-content' }}>
            {[...BESTIARY_ROW1, ...BESTIARY_ROW1].map((c, i) => (
              <CreatureCard key={`r1-${i}`} creature={c} onClick={() => setSelectedCreature(c)} />
            ))}
          </div>
        </div>

        {/* Row 2 — scrolls left */}
        <div className="marquee-row relative" style={{ maskImage: 'linear-gradient(to right, transparent, black 8%, black 92%, transparent)' }}>
          <div className="flex animate-marquee-reverse" style={{ width: 'max-content' }}>
            {[...BESTIARY_ROW2, ...BESTIARY_ROW2].map((c, i) => (
              <CreatureCard key={`r2-${i}`} creature={c} onClick={() => setSelectedCreature(c)} />
            ))}
          </div>
        </div>
      </section>

      {/* Creature Detail Modal */}
      {selectedCreature && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setSelectedCreature(null)}
        >
          <div
            className="bg-[var(--bg-surface)] border border-[var(--border-default)] max-w-sm w-full max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Art */}
            {selectedCreature.art ? (
              <div className="relative w-full" style={{ aspectRatio: '341/300' }}>
                <Image
                  src={selectedCreature.art}
                  alt={selectedCreature.name}
                  fill
                  className="object-cover object-top"
                  sizes="448px"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[var(--bg-surface)]" />
              </div>
            ) : (
              <div className="w-full flex items-center justify-center py-12 bg-[var(--bg-base)]">
                <span className="text-7xl">{selectedCreature.emoji}</span>
              </div>
            )}

            {/* Info */}
            <div className="p-5">
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-[var(--amber)] font-mono text-xl font-bold">{selectedCreature.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-xs font-mono px-2 py-0.5 border ${TIER_COLORS[selectedCreature.tier].border} ${TIER_COLORS[selectedCreature.tier].text} ${TIER_COLORS[selectedCreature.tier].bg}`}>
                      {TIER_COLORS[selectedCreature.tier].label}
                    </span>
                    <span className="text-[#c84040] text-xs font-mono">♥ {selectedCreature.hp[0]}–{selectedCreature.hp[1]} HP</span>
                  </div>
                </div>
                <button
                  className="text-[var(--text-dim)] hover:text-white font-mono text-lg p-2 -mr-2 -mt-1"
                  onClick={() => setSelectedCreature(null)}
                >
                  [×]
                </button>
              </div>

              {/* Description */}
              <p className="text-[var(--text-base)] font-mono text-sm italic leading-relaxed mb-4">
                &ldquo;{selectedCreature.description}&rdquo;
              </p>

              {/* Behaviors */}
              <div>
                <p className="text-[var(--text-dim)] font-mono text-xs mb-2 tracking-wider">BEHAVIORS</p>
                <div className="flex flex-wrap gap-1.5">
                  {selectedCreature.behaviors.map((b) => (
                    <span key={b} className="text-[var(--ethereal,#9d8ec4)] font-mono text-xs border border-[var(--border-dim)] px-2 py-0.5">
                      {b}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

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
                href="/skill.md"
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
          <div className="flex justify-center gap-6 text-sm">
            <a 
              href="https://x.com/dieforward"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--text-muted)] hover:text-[var(--amber)]"
            >
              X
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
