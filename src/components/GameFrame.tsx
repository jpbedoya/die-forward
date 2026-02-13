'use client';

import { ReactNode } from 'react';

interface GameFrameProps {
  children: ReactNode;
}

export default function GameFrame({ children }: GameFrameProps) {
  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
      {/* Main game container - mobile width */}
      <div className="relative w-full max-w-[430px] min-h-screen bg-[var(--bg-base)] shadow-2xl lg:shadow-[0_0_100px_rgba(245,158,11,0.15)]">
        {/* Subtle border glow on desktop */}
        <div className="hidden lg:block absolute inset-0 border border-[var(--amber)]/20 pointer-events-none" />
        
        {/* Game content */}
        <div className="relative z-10">
          {children}
        </div>
      </div>
    </div>
  );
}
