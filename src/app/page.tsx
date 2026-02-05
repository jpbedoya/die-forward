'use client';

import { useState } from 'react';

// Menu overlay component
function Menu({ 
  isOpen, 
  onClose,
  walletAddress,
  audioEnabled,
  onToggleAudio,
}: { 
  isOpen: boolean;
  onClose: () => void;
  walletAddress: string;
  audioEnabled: boolean;
  onToggleAudio: () => void;
}) {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80"
        onClick={onClose}
      />
      
      {/* Menu panel */}
      <div className="relative bg-[#111] border border-[#333] w-[90%] max-w-xs p-4">
        <div className="text-amber-500 text-xs mb-4 flex items-center justify-between">
          <span className="tracking-wider">◈ DIE FORWARD</span>
          <button onClick={onClose} className="text-[#555] hover:text-[#888]">
            [X]
          </button>
        </div>
        
        {/* Wallet */}
        <div className="mb-4 text-xs">
          <div className="text-[#555] mb-1">CONNECTED</div>
          <div className="text-[#888] font-mono truncate">
            {walletAddress}
          </div>
        </div>
        
        {/* Audio toggle */}
        <button 
          onClick={onToggleAudio}
          className="w-full text-left px-3 py-2 text-sm bg-[#0a0a0a] border border-[#222] mb-2 flex items-center justify-between"
        >
          <span className="text-[#888]">Audio</span>
          <span className={audioEnabled ? 'text-green-500' : 'text-red-500'}>
            {audioEnabled ? '♪ ON' : '♪ OFF'}
          </span>
        </button>
        
        {/* Abandon run */}
        <button 
          className="w-full text-left px-3 py-2 text-sm bg-[#0a0a0a] border border-red-500/30 text-red-400 hover:bg-red-500/10"
        >
          ☠ Abandon Run
        </button>
      </div>
    </div>
  );
}

// Mockup data
const mockRoom = {
  zone: "THE SUNKEN CRYPT",
  roomNumber: 7,
  totalRooms: 12,
};

const mockNarrative = `You descend into a flooded chamber. Water laps at your knees, cold and dark.

In the corner, a corpse slumps against the moss-covered wall — someone who came before.

They died 2 hours ago.

Something moves in the water behind you.`;

const mockPlayer = {
  health: 73,
  maxHealth: 100,
  stamina: 2,
  maxStamina: 3,
  inventory: [
    { id: '1', name: 'Torch', emoji: '🔦' },
    { id: '2', name: 'Rusty Blade', emoji: '🗡️' },
    { id: '3', name: 'Herbs', emoji: '🌿' },
  ],
  stakeAmount: 0.05,
};

const mockOptions = [
  { id: '1', text: 'Search the corpse' },
  { id: '2', text: 'Ready your blade' },
  { id: '3', text: 'Wade to the exit' },
  { id: '4', text: 'Scan with torch' },
];

const deathsToday = 12;
const corpsePlayer = 'hollowknight';
const corpseMessage = "should have dodged...";

// Simple ASCII health bar
function HealthBar({ current, max }: { current: number; max: number }) {
  const pct = current / max;
  const filled = Math.round(pct * 8);
  const empty = 8 - filled;
  return (
    <span className="font-mono tracking-tighter">
      <span className="text-red-500">{'█'.repeat(filled)}</span>
      <span className="text-red-900">{'█'.repeat(empty)}</span>
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

function ProgressBar({ current, total }: { current: number; total: number }) {
  const filled = Math.round((current / total) * 12);
  const empty = 12 - filled;
  return (
    <span className="font-mono text-xs">
      <span className="text-amber-400">{'▓'.repeat(filled)}</span>
      <span className="text-[#888]">{'░'.repeat(empty)}</span>
    </span>
  );
}

const mockWallet = "8xH4...k9Qz";

export default function GameScreen() {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(true);

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col font-mono">
      
      {/* Menu Overlay */}
      <Menu 
        isOpen={menuOpen}
        onClose={() => setMenuOpen(false)}
        walletAddress={mockWallet}
        audioEnabled={audioEnabled}
        onToggleAudio={() => setAudioEnabled(!audioEnabled)}
      />

      {/* Fixed Header */}
      <header className="bg-[#0a0a0a] border-b border-amber-500/30 px-3 py-2 sticky top-0 z-10">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setMenuOpen(true)}
              className="text-[#555] hover:text-amber-500 transition-colors"
            >
              [≡]
            </button>
            <span className="text-amber-500">◈</span>
            <span className="text-amber-400/80 uppercase tracking-wide">
              {mockRoom.zone}
            </span>
          </div>
          <ProgressBar current={mockRoom.roomNumber} total={mockRoom.totalRooms} />
        </div>
      </header>

      {/* Scrollable Content */}
      <main className="flex-1 overflow-y-auto px-3 py-4">
        
        {/* Narrative */}
        <div className="text-[#c0c0c0] text-sm leading-relaxed mb-4 whitespace-pre-line">
          {mockNarrative}
        </div>

        {/* Corpse Callout */}
        <div className="bg-[#110a14] border border-purple-500/30 p-3 mb-4">
          <div className="flex items-center gap-2 text-sm mb-1">
            <span className="text-purple-400">☠</span>
            <span className="text-purple-300 font-bold">@{corpsePlayer}</span>
            <span className="text-purple-400/50 text-xs">2h ago</span>
          </div>
          <div className="text-[#888] text-sm italic mb-2">
            "{corpseMessage}"
          </div>
          <div className="text-[#555] text-xs">
            ├─ 🗡️ Rusty Sword
            <br />
            └─ ◎ 0.02 SOL
          </div>
        </div>

        {/* Divider */}
        <div className="text-[#333] text-xs mb-4">
          ────────────────────────
        </div>

        {/* Actions */}
        <div className="space-y-2 mb-4">
          <div className="text-[#555] text-xs mb-2">▼ WHAT DO YOU DO?</div>
          {mockOptions.map((option, i) => (
            <button
              key={option.id}
              onClick={() => setSelectedOption(option.id)}
              className={`w-full text-left px-3 py-3 text-sm transition-all active:scale-[0.98] ${
                selectedOption === option.id
                  ? 'bg-amber-500/20 text-amber-100 border-l-2 border-amber-500'
                  : 'bg-[#111] text-[#999] border-l-2 border-[#222] active:bg-[#1a1a1a]'
              }`}
            >
              <span className="text-[#555] mr-2">{i + 1}.</span>
              {option.text}
              {selectedOption === option.id && (
                <span className="text-amber-500 float-right">◄</span>
              )}
            </button>
          ))}
        </div>
      </main>

      {/* Fixed Bottom Stats Bar */}
      <footer className="bg-[#0a0a0a] border-t border-[#222] px-3 py-2 sticky bottom-0">
        {/* Stats Row */}
        <div className="flex items-center justify-between text-xs mb-2">
          <div className="flex items-center gap-3">
            {/* Health */}
            <div className="flex items-center gap-1">
              <span className="text-red-500">♥</span>
              <HealthBar current={mockPlayer.health} max={mockPlayer.maxHealth} />
              <span className="text-red-400/70 text-[10px]">{mockPlayer.health}</span>
            </div>
            {/* Stamina */}
            <div className="flex items-center gap-1">
              <span className="text-blue-400">⚡</span>
              <StaminaBar current={mockPlayer.stamina} max={mockPlayer.maxStamina} />
            </div>
          </div>
          {/* Stake */}
          <div className="flex items-center gap-1">
            <span className="text-amber-500">◎</span>
            <span className="text-amber-400">{mockPlayer.stakeAmount}</span>
          </div>
        </div>
        
        {/* Inventory Row */}
        <div className="flex items-center gap-2 text-xs overflow-x-auto pb-1">
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
        
        {/* Death Counter */}
        <div className="text-center text-[10px] text-[#444] mt-2 pt-2 border-t border-[#1a1a1a]">
          <span className="text-red-500/50">☠</span> {deathsToday} lost today
          <span className="text-[#222] mx-2">│</span>
          <span className="text-[#333]">DIE FORWARD</span>
        </div>
      </footer>
    </div>
  );
}
