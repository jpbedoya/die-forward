'use client';

import { ReactNode } from 'react';

const VERTICAL_LOGO = `D
I
E

F
O
R
W
A
R
D`;

interface GameFrameProps {
  children: ReactNode;
}

export default function GameFrame({ children }: GameFrameProps) {
  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
      {/* Left decoration - hidden on mobile */}
      <div className="hidden lg:flex flex-col items-center justify-center h-screen w-48 relative">
        {/* Glow effect */}
        <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-[var(--amber)]/10 to-transparent" />
        {/* Vertical logo */}
        <pre className="text-[var(--amber)]/30 text-2xl font-bold tracking-[0.5em] leading-relaxed select-none">
{VERTICAL_LOGO}
        </pre>
      </div>

      {/* Main game container - mobile width */}
      <div className="relative w-full max-w-[430px] min-h-screen bg-[var(--bg-base)] shadow-2xl lg:shadow-[0_0_100px_rgba(245,158,11,0.15)]">
        {/* Subtle border glow on desktop */}
        <div className="hidden lg:block absolute inset-0 border border-[var(--amber)]/20 pointer-events-none" />
        
        {/* Game content */}
        <div className="relative z-10">
          {children}
        </div>
      </div>

      {/* Right decoration - hidden on mobile */}
      <div className="hidden lg:flex flex-col items-center justify-center h-screen w-48 relative">
        {/* Glow effect */}
        <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-[var(--amber)]/10 to-transparent" />
        {/* Vertical logo */}
        <pre className="text-[var(--amber)]/30 text-2xl font-bold tracking-[0.5em] leading-relaxed select-none">
{VERTICAL_LOGO}
        </pre>
      </div>
    </div>
  );
}
