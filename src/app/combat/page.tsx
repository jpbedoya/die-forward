'use client';

import { useState } from 'react';

// Mock data
const mockEnemy = {
  name: "DROWNED ONE",
  health: 65,
  maxHealth: 100,
  intent: "AGGRESSIVE",
  intentDesc: "Lunging forward, claws extended",
};

const mockPlayer = {
  health: 73,
  maxHealth: 100,
  stamina: 2,
  maxStamina: 3,
  inventory: [
    { id: '1', name: 'Rusty Blade', emoji: '🗡️' },
    { id: '2', name: 'Herbs', emoji: '🌿' },
  ],
  stakeAmount: 0.05,
};

const mockNarrative = `The creature rises from the murky water, hollow eyes fixed on you. Water streams from its bloated form as it lurches forward.

It lunges, claws extended, aiming for your throat.`;

const combatOptions = [
  { id: '1', text: 'Strike', desc: 'Trade blows', cost: 1, emoji: '⚔️' },
  { id: '2', text: 'Dodge', desc: 'Evade attack', cost: 1, emoji: '💨' },
  { id: '3', text: 'Brace', desc: 'Reduce damage', cost: 0, emoji: '🛡️' },
  { id: '4', text: 'Herbs', desc: 'Heal, take hit', cost: 0, emoji: '🌿' },
  { id: '5', text: 'Flee', desc: 'Try to escape', cost: 1, emoji: '🏃' },
];

function HealthBar({ current, max, color = 'red' }: { current: number; max: number; color?: string }) {
  const pct = current / max;
  const filled = Math.round(pct * 10);
  const empty = 10 - filled;
  const filledColor = color === 'red' ? 'text-red-500' : 'text-purple-500';
  const emptyColor = color === 'red' ? 'text-red-900' : 'text-purple-900';
  return (
    <span className="font-mono tracking-tighter">
      <span className={filledColor}>{'█'.repeat(filled)}</span>
      <span className={emptyColor}>{'█'.repeat(empty)}</span>
    </span>
  );
}

function StaminaBar({ current, max }: { current: number; max: number }) {
  return (
    <span className="font-mono">
      <span className="text-blue-400">{'◆'.repeat(current)}</span>
      <span className="text-blue-900">{'◇'.repeat(max - current)}</span>
    </span>
  );
}

export default function CombatScreen() {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col font-mono">
      
      {/* Enemy Header */}
      <header className="bg-[#0a0a0a] border-b border-red-500/30 px-3 py-3 sticky top-0 z-10">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-red-500">⚔️</span>
            <span className="text-red-400 uppercase tracking-wide text-sm">
              {mockEnemy.name}
            </span>
          </div>
          <span className="text-red-400 text-xs">
            {mockEnemy.health}/{mockEnemy.maxHealth}
          </span>
        </div>
        <HealthBar current={mockEnemy.health} max={mockEnemy.maxHealth} />
        
        {/* Intent */}
        <div className="mt-2 text-xs">
          <span className="text-[#555]">Intent: </span>
          <span className="text-amber-400">{mockEnemy.intent}</span>
        </div>
      </header>

      {/* Combat narrative */}
      <main className="flex-1 overflow-y-auto px-3 py-4">
        
        <div className="text-[#c0c0c0] text-sm leading-relaxed mb-6 whitespace-pre-line">
          {mockNarrative}
        </div>

        {/* Intent callout */}
        <div className="bg-[#1a1208] border border-amber-500/30 p-3 mb-6">
          <div className="text-amber-400 text-xs uppercase tracking-wider mb-1">
            ⚠ Enemy Intent
          </div>
          <div className="text-amber-200 text-sm">
            {mockEnemy.intentDesc}
          </div>
        </div>

        {/* Combat Actions */}
        <div className="text-[#555] text-xs mb-2 uppercase tracking-wider">
          ▼ Choose Your Action
        </div>
        <div className="grid grid-cols-2 gap-2 mb-4">
          {combatOptions.map((option) => {
            const canAfford = option.cost <= mockPlayer.stamina;
            return (
              <button
                key={option.id}
                onClick={() => canAfford && setSelectedOption(option.id)}
                disabled={!canAfford}
                className={`text-left px-3 py-3 text-sm transition-all ${
                  selectedOption === option.id
                    ? 'bg-amber-500/20 border border-amber-500 text-amber-100'
                    : canAfford
                    ? 'bg-[#111] border border-[#222] text-[#888] active:bg-[#1a1a1a]'
                    : 'bg-[#0a0a0a] border border-[#1a1a1a] text-[#444] opacity-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span>{option.emoji} {option.text}</span>
                  {option.cost > 0 && (
                    <span className="text-blue-400 text-xs">⚡{option.cost}</span>
                  )}
                </div>
                <div className="text-[10px] text-[#555] mt-1">{option.desc}</div>
              </button>
            );
          })}
        </div>

        {/* Confirm button */}
        {selectedOption && (
          <button className="w-full py-3 bg-red-500/20 border border-red-500 text-red-300 hover:bg-red-500/30 transition-all">
            ▶ Execute
          </button>
        )}

      </main>

      {/* Player stats footer */}
      <footer className="bg-[#0a0a0a] border-t border-[#222] px-3 py-2 sticky bottom-0">
        <div className="flex items-center justify-between text-xs mb-2">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <span className="text-red-500">♥</span>
              <HealthBar current={mockPlayer.health} max={mockPlayer.maxHealth} />
              <span className="text-red-400/70 text-[10px]">{mockPlayer.health}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-blue-400">⚡</span>
              <StaminaBar current={mockPlayer.stamina} max={mockPlayer.maxStamina} />
            </div>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-amber-500">◎</span>
            <span className="text-amber-400">{mockPlayer.stakeAmount} SOL</span>
          </div>
        </div>
        
        <div className="flex items-center gap-2 text-xs overflow-x-auto">
          <span className="text-[#444]">🎒</span>
          {mockPlayer.inventory.map((item) => (
            <span 
              key={item.id} 
              className="text-[#666] bg-[#111] px-2 py-0.5 whitespace-nowrap"
            >
              {item.emoji} {item.name}
            </span>
          ))}
        </div>
      </footer>

    </div>
  );
}
