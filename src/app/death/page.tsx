'use client';

import { useState } from 'react';
import Link from 'next/link';

// Mock data for the death screen
const mockDeathData = {
  zone: "THE SUNKEN CRYPT",
  room: 7,
  totalRooms: 12,
  killedBy: "Drowned One",
  stakeLost: 0.05,
  enemiesKilled: 3,
  corpsesLooted: 2,
  timeAlive: "4m 23s",
};

export default function DeathScreen() {
  const [finalMessage, setFinalMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const maxChars = 50;

  const handleSubmit = () => {
    if (finalMessage.trim()) {
      setSubmitted(true);
    }
  };

  return (
    <div className="min-h-screen bg-[--bg-base] flex flex-col font-mono">
      
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-8">
        
        {/* Death announcement */}
        <div className="text-center mb-8">
          <div className="text-[--red] text-4xl mb-2">☠</div>
          <h1 className="text-[--red-bright] text-2xl tracking-widest mb-2">YOU DIED</h1>
          <p className="text-[--text-secondary] text-sm">
            Slain by <span className="text-[--red-bright]">{mockDeathData.killedBy}</span>
          </p>
          <p className="text-[--text-muted] text-xs mt-1">
            {mockDeathData.zone} — Room {mockDeathData.room}/{mockDeathData.totalRooms}
          </p>
        </div>

        {/* Stats */}
        <div className="w-full max-w-xs mb-8">
          <div className="border border-[--border-dim] bg-[--bg-surface] p-4 text-sm">
            <div className="flex justify-between py-1 border-b border-[--border-dim]">
              <span className="text-[--text-muted]">Stake Lost</span>
              <span className="text-[--amber]">◎ {mockDeathData.stakeLost} SOL</span>
            </div>
            <div className="flex justify-between py-1 border-b border-[--border-dim]">
              <span className="text-[--text-muted]">Enemies Slain</span>
              <span className="text-[--text-primary]">{mockDeathData.enemiesKilled}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-[--border-dim]">
              <span className="text-[--text-muted]">Corpses Looted</span>
              <span className="text-[--purple-bright]">{mockDeathData.corpsesLooted}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-[--text-muted]">Time Survived</span>
              <span className="text-[--text-primary]">{mockDeathData.timeAlive}</span>
            </div>
          </div>
        </div>

        {/* Final message input */}
        {!submitted ? (
          <div className="w-full max-w-xs">
            <label className="block text-[--text-muted] text-xs mb-2 uppercase tracking-wider">
              Your Final Words
            </label>
            <div className="relative">
              <input
                type="text"
                value={finalMessage}
                onChange={(e) => setFinalMessage(e.target.value.slice(0, maxChars))}
                placeholder="Leave a message for those who follow..."
                className="w-full bg-[--bg-surface] border border-[--border-default] px-3 py-3 text-[--text-primary] placeholder-[--text-muted] focus:border-[--amber-dim] focus:outline-none"
              />
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-[--text-dim]">
                {finalMessage.length}/{maxChars}
              </span>
            </div>
            <button
              onClick={handleSubmit}
              disabled={!finalMessage.trim()}
              className="w-full mt-3 px-4 py-3 bg-[--bg-surface] border border-[--border-default] text-[--text-secondary] hover:border-[--amber-dim] hover:text-[--amber-bright] transition-all disabled:opacity-30 disabled:hover:border-[--border-default] disabled:hover:text-[--text-secondary]"
            >
              Etch Into Stone
            </button>
          </div>
        ) : (
          <div className="w-full max-w-xs text-center">
            <div className="border border-[--purple-dim] bg-[--purple-dim]/20 p-4 mb-6">
              <div className="text-[--purple-bright] text-xs mb-2 uppercase tracking-wider">
                Your Epitaph
              </div>
              <div className="text-[--text-primary] italic">"{finalMessage}"</div>
            </div>
            
            <p className="text-[--text-muted] text-xs mb-6">
              Your corpse now rests in the crypt.<br/>
              Others will find you.
            </p>

            <div className="flex flex-col gap-2">
              <Link
                href="/stake"
                className="px-4 py-3 bg-[--amber-dim]/30 border border-[--amber] text-[--amber-bright] hover:bg-[--amber-dim]/50 transition-all text-center"
              >
                ▶ Try Again
              </Link>
              <Link
                href="/title"
                className="px-4 py-3 bg-[--bg-surface] border border-[--border-default] text-[--text-muted] hover:text-[--text-secondary] transition-all text-center"
              >
                Return to Title
              </Link>
            </div>
          </div>
        )}

      </main>

      {/* Footer hint */}
      <footer className="text-center text-[10px] text-[--text-muted] py-4">
        Your stake has been added to the Memorial Pool
      </footer>

    </div>
  );
}
