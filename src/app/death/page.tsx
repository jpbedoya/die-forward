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
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col font-mono">
      
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-8">
        
        {/* Death announcement */}
        <div className="text-center mb-8">
          <div className="text-red-500 text-4xl mb-2">☠</div>
          <h1 className="text-red-500 text-2xl tracking-widest mb-2">YOU DIED</h1>
          <p className="text-[#666] text-sm">
            Slain by <span className="text-red-400">{mockDeathData.killedBy}</span>
          </p>
          <p className="text-[#444] text-xs mt-1">
            {mockDeathData.zone} — Room {mockDeathData.room}/{mockDeathData.totalRooms}
          </p>
        </div>

        {/* Stats */}
        <div className="w-full max-w-xs mb-8">
          <div className="border border-[#222] bg-[#111] p-4 text-sm">
            <div className="flex justify-between py-1 border-b border-[#1a1a1a]">
              <span className="text-[#555]">Stake Lost</span>
              <span className="text-amber-500">◎ {mockDeathData.stakeLost} SOL</span>
            </div>
            <div className="flex justify-between py-1 border-b border-[#1a1a1a]">
              <span className="text-[#555]">Enemies Slain</span>
              <span className="text-[#888]">{mockDeathData.enemiesKilled}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-[#1a1a1a]">
              <span className="text-[#555]">Corpses Looted</span>
              <span className="text-purple-400">{mockDeathData.corpsesLooted}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-[#555]">Time Survived</span>
              <span className="text-[#888]">{mockDeathData.timeAlive}</span>
            </div>
          </div>
        </div>

        {/* Final message input */}
        {!submitted ? (
          <div className="w-full max-w-xs">
            <label className="block text-[#555] text-xs mb-2 uppercase tracking-wider">
              Your Final Words
            </label>
            <div className="relative">
              <input
                type="text"
                value={finalMessage}
                onChange={(e) => setFinalMessage(e.target.value.slice(0, maxChars))}
                placeholder="Leave a message for those who follow..."
                className="w-full bg-[#111] border border-[#333] px-3 py-3 text-[#ccc] placeholder-[#444] focus:border-amber-500/50 focus:outline-none"
              />
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-[#444]">
                {finalMessage.length}/{maxChars}
              </span>
            </div>
            <button
              onClick={handleSubmit}
              disabled={!finalMessage.trim()}
              className="w-full mt-3 px-4 py-3 bg-[#111] border border-[#333] text-[#888] hover:border-amber-500/50 hover:text-amber-400 transition-all disabled:opacity-30 disabled:hover:border-[#333] disabled:hover:text-[#888]"
            >
              Etch Into Stone
            </button>
          </div>
        ) : (
          <div className="w-full max-w-xs text-center">
            <div className="border border-purple-500/30 bg-[#110a14] p-4 mb-6">
              <div className="text-purple-400 text-xs mb-2 uppercase tracking-wider">
                Your Epitaph
              </div>
              <div className="text-[#ccc] italic">"{finalMessage}"</div>
            </div>
            
            <p className="text-[#555] text-xs mb-6">
              Your corpse now rests in the crypt.<br/>
              Others will find you.
            </p>

            <div className="flex flex-col gap-2">
              <Link
                href="/stake"
                className="px-4 py-3 bg-amber-500/20 border border-amber-500 text-amber-300 hover:bg-amber-500/30 transition-all text-center"
              >
                ▶ Try Again
              </Link>
              <Link
                href="/title"
                className="px-4 py-3 bg-[#111] border border-[#333] text-[#666] hover:text-[#888] transition-all text-center"
              >
                Return to Title
              </Link>
            </div>
          </div>
        )}

      </main>

      {/* Footer hint */}
      <footer className="text-center text-[10px] text-[#333] py-4">
        Your stake has been added to the Memorial Pool
      </footer>

    </div>
  );
}
